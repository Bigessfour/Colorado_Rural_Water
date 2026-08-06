import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { SafeMarkdownPipe } from '../../shared/safe-markdown.pipe';

export type HelpGuideId = 'tenant' | 'crwa';

interface GuideMeta {
  id: HelpGuideId;
  title: string;
  blurb: string;
  asset: string;
}

const GUIDES: GuideMeta[] = [
  {
    id: 'tenant',
    title: 'Operator guide',
    blurb:
      'Sign in, upload, sources, dashboard, meters, alerts, reports, and Assistant for your water system.',
    asset: '/guides/tenant-operator.md',
  },
  {
    id: 'crwa',
    title: 'CRWA admin guide',
    blurb: 'Provision municipalities, invite users, membership billing, and multi-system roll-up.',
    asset: '/guides/crwa-admin.md',
  },
];

@Component({
  selector: 'app-help-page',
  imports: [RouterLink, ButtonModule, CardModule, MessageModule, SafeMarkdownPipe],
  templateUrl: './help-page.component.html',
  styleUrl: './help-page.component.scss',
})
export class HelpPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly guides = GUIDES;
  active = signal<GuideMeta | null>(null);
  body = signal('');
  busy = signal(false);
  error = signal('');

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('guideId') as HelpGuideId | null;
      if (!id) {
        this.active.set(null);
        this.body.set('');
        this.error.set('');
        return;
      }
      const meta = GUIDES.find((g) => g.id === id) ?? null;
      this.active.set(meta);
      if (meta) void this.load(meta);
      else this.error.set('That guide was not found.');
    });
  }

  openGuide(id: HelpGuideId): void {
    void this.router.navigate(['/help', id]);
  }

  private async load(meta: GuideMeta): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    this.body.set('');
    try {
      const res = await fetch(meta.asset);
      if (!res.ok) {
        this.error.set(`Could not load guide (${res.status}).`);
        return;
      }
      this.body.set(await res.text());
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Network error');
    } finally {
      this.busy.set(false);
    }
  }
}
