import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { SafeMarkdownPipe } from './safe-markdown.pipe';

describe('SafeMarkdownPipe', () => {
  let pipe: SafeMarkdownPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SafeMarkdownPipe,
        {
          provide: DomSanitizer,
          useValue: {
            bypassSecurityTrustHtml: (value: string) => value,
          },
        },
      ],
    });
    pipe = TestBed.inject(SafeMarkdownPipe);
  });

  it('returns empty safe html for nullish input', () => {
    const out = pipe.transform(null);
    expect(String(out)).toBe('');
  });

  it('escapes raw HTML before applying markdown transforms', () => {
    const out = pipe.transform('<script>alert(1)</script>');
    expect(String(out)).not.toContain('<script>');
    expect(String(out)).toContain('&lt;script&gt;');
  });

  it('renders bold and code spans', () => {
    const out = pipe.transform('**Watch** `meter-1`');
    const html = String(out);
    expect(html).toContain('<strong>Watch</strong>');
    expect(html).toContain('<code>meter-1</code>');
  });

  it('renders list items', () => {
    const out = pipe.transform('- first\n- second');
    const html = String(out);
    expect(html).toContain('<ul class="md-list">');
    expect(html).toContain('<li>first</li>');
    expect(html).toContain('<li>second</li>');
  });
});
