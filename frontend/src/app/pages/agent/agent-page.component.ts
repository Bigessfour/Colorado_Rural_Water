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

  async loadHistory(): Promise<void> {
    const token = this.auth.getBearerToken();
    if (!token) return;
    try {
      const res = await fetch(`${environment.apiBaseUrl}/agent`, {
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
    const token = this.auth.getBearerToken();
    if (!token) {
      this.error.set('Sign in to chat with the assistant.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.messages.update((m) => [...m, { role: 'user', text }]);
    this.draft = '';
    try {
      const res = await fetch(`${environment.apiBaseUrl}/agent`, {
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
