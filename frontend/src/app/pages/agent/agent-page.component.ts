import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';
import {
  assistantWelcome,
  friendlyMunicipalityName,
  operatorFirstName,
} from '../../shared/persona';
import { SafeMarkdownPipe } from '../../shared/safe-markdown.pipe';

interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
  createdAt?: string;
}

/** Compose RAG session key — must match POST /api/rag and GET /api/history. */
const COMPOSE_SESSION_ID = 'assistant';

@Component({
  selector: 'app-agent-page',
  imports: [
    FormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    MessageModule,
    TextareaModule,
    TagModule,
    SafeMarkdownPipe,
  ],
  templateUrl: './agent-page.component.html',
  styleUrl: './agent-page.component.scss',
})
export class AgentPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  /** Compose Assessment path uses tenant headers (no Cognito); AWS path needs JWT. */
  readonly composeDemo = environment.composeDemo;

  messages = signal<ChatMsg[]>([]);
  /** Composer text as a signal so Send enablement tracks every keystroke. */
  draftSig = signal('');
  busy = signal(false);
  error = signal('');
  costNote = signal(
    'Short, practical answers. AI usage is billed to this Water Saver environment — never to your water customers.',
  );
  coaching = signal('');
  needsConfirm = signal(false);

  /** True when the operator can send chat turns (Compose demo or Cognito session). */
  canChat(): boolean {
    return this.composeDemo || this.auth.isLoggedIn();
  }

  get draft(): string {
    return this.draftSig();
  }
  set draft(value: string) {
    this.draftSig.set(value ?? '');
  }

  canSend(): boolean {
    return this.draftSig().trim().length > 0;
  }

  onDraftChange(value: string): void {
    this.draftSig.set(value ?? '');
  }

  onDraftInput(ev: Event): void {
    const el = ev.target as HTMLTextAreaElement | null;
    if (el) this.draftSig.set(el.value ?? '');
  }

  ngOnInit(): void {
    void this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    await this.loadHistory();
    const deepen = this.route.snapshot.queryParamMap.get('deepen') === '1';
    const askFromQuery = this.route.snapshot.queryParamMap.get('ask')?.trim() || '';
    const askFromStore =
      deepen && typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem('ws_assistant_ask')?.trim() || ''
        : '';
    const ask = askFromQuery || askFromStore;
    if (ask && this.canChat()) {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('ws_assistant_ask');
      }
      this.draft = ask;
      // Clear query so refresh does not re-send.
      await this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });
      await this.send();
    }
  }

  private demoEmail(): string {
    const fromAuth = this.auth.email();
    if (fromAuth) return fromAuth;
    const demo = environment.demoUserId || 'compose-demo';
    return demo.includes('@') ? demo : `${demo}@local`;
  }

  private composeHeaders(): Record<string, string> {
    const tenantId = environment.demoTenantId || 'town-wiley';
    const place = friendlyMunicipalityName(tenantId);
    const email = this.demoEmail();
    const first = operatorFirstName({ email });
    return {
      'content-type': 'application/json',
      'X-Tenant-Id': tenantId,
      'X-User-Id': environment.demoUserId || 'compose-demo',
      'X-Municipality': place,
      'X-Operator-Name': first,
      'X-Operator-Email': email,
    };
  }

  private personaPayload(): {
    municipality: string;
    operator_name: string;
    operator_email: string;
  } {
    const tenantId = this.auth.tenantId() || environment.demoTenantId || 'town-wiley';
    const displayName = this.auth.mapCenter()?.town ?? null;
    const email = this.demoEmail();
    return {
      municipality: friendlyMunicipalityName(tenantId, displayName),
      operator_name: this.auth.firstName() || operatorFirstName({ email }),
      operator_email: email,
    };
  }

  /** Drop sterile “tenant slug” intros and near-duplicate assistant bubbles. */
  private sanitizeHistory(msgs: ChatMsg[]): ChatMsg[] {
    const cleaned = msgs.filter((m) => {
      if (m.role !== 'assistant') return true;
      if (/\bin tenant\b/i.test(m.text || '')) return false;
      return true;
    });
    const out: ChatMsg[] = [];
    for (const m of cleaned) {
      const prev = out[out.length - 1];
      if (
        prev &&
        prev.role === 'assistant' &&
        m.role === 'assistant' &&
        this.nearDuplicate(prev.text, m.text)
      ) {
        continue;
      }
      out.push(m);
    }
    return out;
  }

  private nearDuplicate(a: string, b: string): boolean {
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120);
    return norm(a) === norm(b);
  }

  private ensureWelcome(): void {
    if (this.messages().length > 0 || !this.canChat()) return;
    const email =
      this.auth.email() ||
      (environment.demoUserId?.includes('@')
        ? environment.demoUserId
        : environment.demoUserId
          ? `${environment.demoUserId}@local`
          : null);
    const tenantId = this.auth.tenantId() || environment.demoTenantId || 'town-wiley';
    const displayName =
      this.auth.mapCenter()?.town ?? this.auth.placeName() ?? null;
    this.messages.set([
      {
        role: 'assistant',
        text: assistantWelcome({ tenantId, displayName, email }),
      },
    ]);
  }

  clearLocalChat(): void {
    this.messages.set([]);
    this.error.set('');
    this.coaching.set('');
    this.needsConfirm.set(false);
    this.ensureWelcome();
  }

  async loadHistory(): Promise<void> {
    if (environment.composeDemo) {
      try {
        const qs = new URLSearchParams({ session_id: COMPOSE_SESSION_ID });
        const res = await fetch(`${environment.apiBaseUrl}${environment.historyPath}?${qs}`, {
          headers: this.composeHeaders(),
        });
        const body = await res.json();
        if (!res.ok) {
          this.error.set(body.error ?? `Could not load history (${res.status})`);
          this.ensureWelcome();
          return;
        }
        this.messages.set(
          this.sanitizeHistory(
            ((body.messages ?? []) as Array<{ role: string; content?: string; text?: string }>).map(
              (m) => ({
                role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
                text: m.content ?? m.text ?? '',
              }),
            ),
          ),
        );
        this.ensureWelcome();
      } catch (err) {
        this.error.set(err instanceof Error ? err.message : 'Network error');
        this.ensureWelcome();
      }
      return;
    }

    const token = this.auth.getBearerToken();
    if (!token) {
      this.ensureWelcome();
      return;
    }
    try {
      await this.auth.refreshProfile();
      const res = await fetch(`${environment.apiBaseUrl}${environment.historyPath}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Could not load history (${res.status})`);
        this.ensureWelcome();
        return;
      }
      const loaded = this.sanitizeHistory(
        ((body.messages ?? []) as ChatMsg[]).map((m) => ({
          role: m.role,
          text: m.text,
          createdAt: m.createdAt,
        })),
      );
      // Greeting spam from earlier Bedrock dry-runs — keep a short recent thread.
      this.messages.set(this.trimNoisyHistory(loaded));
      this.ensureWelcome();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
      this.ensureWelcome();
    }
  }

  /** Drop long runs of near-identical hello replies; keep the last 8 turns. */
  private trimNoisyHistory(msgs: ChatMsg[]): ChatMsg[] {
    const isHello = (t: string) =>
      /^(hi|hello)\b/i.test(t.trim()) ||
      /\bhow can i (assist|help) you\b/i.test(t) ||
      /\bjust say (a )?(short )?hello\b/i.test(t);
    const filtered = msgs.filter((m, i, arr) => {
      if (!isHello(m.text || '')) return true;
      // Keep at most one greeting-like bubble in a row.
      const prev = arr[i - 1];
      if (prev && isHello(prev.text || '') && prev.role === m.role) return false;
      return true;
    });
    return filtered.slice(-8);
  }

  async send(): Promise<void> {
    const text = this.draftSig().trim();
    if (!text || this.busy()) return;

    if (!environment.composeDemo && !this.auth.getBearerToken()) {
      this.error.set('Sign in to chat with the assistant.');
      return;
    }

    this.busy.set(true);
    this.error.set('');
    this.messages.update((m) => [...m, { role: 'user', text }]);
    this.draftSig.set('');

    try {
      if (environment.composeDemo) {
        const persona = this.personaPayload();
        const res = await fetch(`${environment.apiBaseUrl}${environment.ragPath}`, {
          method: 'POST',
          headers: this.composeHeaders(),
          body: JSON.stringify({
            question: text,
            tenant_id: environment.demoTenantId,
            user_id: environment.demoUserId,
            session_id: COMPOSE_SESSION_ID,
            municipality: persona.municipality,
            operator_name: persona.operator_name,
            operator_email: persona.operator_email,
          }),
        });
        const body = await res.json();
        if (!res.ok) {
          this.error.set(body.error ?? `Assistant failed (${res.status})`);
          return;
        }
        this.messages.update((m) => [
          ...m,
          { role: 'assistant', text: body.answer ?? body.reply ?? '(no answer)' },
        ]);
        return;
      }

      const token = this.auth.getBearerToken();
      if (!token) {
        this.error.set('Sign in to chat with the assistant.');
        this.messages.update((m) => m.slice(0, -1));
        return;
      }
      const res = await fetch(`${environment.apiBaseUrl}${environment.agentPath}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Assistant failed (${res.status})`);
        return;
      }
      const replyText = (body.reply ?? '').trim();
      if (!replyText) {
        this.error.set('The assistant returned an empty answer. Try again in a moment.');
        return;
      }
      this.messages.update((m) => [...m, { role: 'assistant', text: replyText }]);
      if (body.costNote) this.costNote.set(body.costNote);
      if (body.confidenceCoaching) this.coaching.set(body.confidenceCoaching);
      this.needsConfirm.set(Boolean(body.needsConfirm));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.busy.set(false);
    }
  }

  onComposerKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) {
      ev.preventDefault();
      void this.send();
    }
  }

  askOnboarding(): void {
    this.draft = 'Help me get started — what history do I need?';
    void this.send();
  }
}
