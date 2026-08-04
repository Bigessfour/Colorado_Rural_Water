import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth.service';
import { AgentPageComponent } from './agent-page.component';

describe('AgentPageComponent', () => {
  beforeEach(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [] }), { status: 200 })),
    );

    await TestBed.configureTestingModule({
      imports: [AgentPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: () => true,
            getBearerToken: () => 'jwt',
          },
        },
      ],
    }).compileComponents();
  });

  it('loads history on init and shows assistant chrome', async () => {
    const fixture = TestBed.createComponent(AgentPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fetch).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toMatch(/Assistant|Ask/i);
  });
});
