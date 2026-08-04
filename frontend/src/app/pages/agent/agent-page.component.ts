import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../core/auth.service';
import { environment } from '../../../environments/environment';

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
  ],
  templateUrl: './agent-page.component.html',
  styleUrl: './agent-page.component.scss',
})
export class AgentPageComponent implements OnInit {
  readonly auth = inject(AuthService);

  messages = signal<ChatMsg[]>([]);
  draft = '';
  busy = signal(false);
  error = signal('');
  costNote = signal(
    'Cheapest option first: short templates, then Nova Lite when needed. AI tokens bill this environment — not your municipal customers.',
  );
  coaching = signal('');
  needsConfirm = signal(false);

  ngOnInit(): void {
    void this.loadHistory();
  }

  private composeHeaders(): Record<string, string> {
    return {
      'content-type': 'application/json',
      'X-Tenant-Id': environment.demoTenantId || 'town-wiley',
      'X-User-Id': environment.demoUserId || 'compose-demo',
    };
  }

  async loadHistory(): Promise<void> {
    if (environment.composeDemo) {
      try {
        const qs = new URLSearchParams({ session_id: COMPOSE_SESSION_ID });
        const res = await fetch(
          `${environment.apiBaseUrl}${environment.historyPath}?${qs}`,
          { headers: this.composeHeaders() },
        );
        const body = await res.json();
        if (!res.ok) {
          this.error.set(body.error ?? `Could not load history (${res.status})`);
          return;
        }
        this.messages.set(
          ((body.messages ?? []) as Array<{ role: string; content?: string; text?: string }>).map(
            (m) => ({
              role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
              text: m.content ?? m.text ?? '',
            }),
          ),
        );
      } catch (err) {
        this.error.set(err instanceof Error ? err.message : 'Network error');
      }
      return;
    }

    const token = this.auth.getBearerToken();
    if (!token) return;
    try {
      const res = await fetch(`${environment.apiBaseUrl}${environment.historyPath}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) {
        this.error.set(body.error ?? `Could not load history (${res.status})`);
        return;
      }
      this.messages.set(
        ((body.messages ?? []) as ChatMsg[]).map((m) => ({
          role: m.role,
          text: m.text,
          createdAt: m.createdAt,
        })),
      );
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    }
  }

  async send(): Promise<void> {
    const text = this.draft.trim();
    if (!text) return;

    // Auth gate before mutating the transcript (Cognito path).
    if (!environment.composeDemo && !this.auth.getBearerToken()) {
      this.error.set('Sign in to chat with the assistant.');
      return;
    }

    this.busy.set(true);
    this.error.set('');
    this.messages.update((m) => [...m, { role: 'user', text }]);
    this.draft = '';

    try {
      if (environment.composeDemo) {
        // Assessment Compose path: LangChain RAG (Feature 001/007)
        const res = await fetch(`${environment.apiBaseUrl}${environment.ragPath}`, {
          method: 'POST',
          headers: this.composeHeaders(),
          body: JSON.stringify({
            question: text,
            tenant_id: environment.demoTenantId,
            user_id: environment.demoUserId,
            session_id: COMPOSE_SESSION_ID,
          }),
        });
        const body = await res.json();
        if (!res.ok) {
          this.error.set(body.error ?? `RAG failed (${res.status})`);
          return;
        }
        this.messages.update((m) => [
          ...m,
          { role: 'assistant', text: body.answer ?? body.reply ?? '(no answer)' },
        ]);
        this.costNote.set(
          'Compose RAG uses Bedrock when AWS credentials are present; Mem0 when MEM0_API_KEY is set.',
        );
        return;
      }

      const token = this.auth.getBearerToken();
      if (!token) {
        // Should be unreachable after the pre-check; keep as safety net.
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
        this.error.set(body.error ?? `Agent failed (${res.status})`);
        return;
      }
      this.messages.update((m) => [...m, { role: 'assistant', text: body.reply }]);
      if (body.costNote) this.costNote.set(body.costNote);
      if (body.confidenceCoaching) this.coaching.set(body.confidenceCoaching);
      this.needsConfirm.set(Boolean(body.needsConfirm));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.busy.set(false);
    }
  }

  askOnboarding(): void {
    this.draft = 'Help me get started — what history do I need?';
    void this.send();
  }
}
