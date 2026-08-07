import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HelpPageComponent } from './help-page.component';

describe('HelpPageComponent', () => {
  beforeEach(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () => '# Operator guide\n\n1. Sign in\n',
      })),
    );

    await TestBed.configureTestingModule({
      imports: [HelpPageComponent],
      providers: [provideRouter([{ path: 'help', component: HelpPageComponent }])],
    }).compileComponents();
  });

  it('renders guide hub cards', () => {
    const fixture = TestBed.createComponent(HelpPageComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toMatch(/Help|Operator guide|CRWA admin guide/i);
  });
});
