import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Minimal safe Markdown for assistant bubbles (bold, italics, code, lists, breaks).
 * Escapes HTML first — not a full CommonMark parser.
 */
@Pipe({ name: 'safeMarkdown', standalone: true })
export class SafeMarkdownPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return this.sanitizer.bypassSecurityTrustHtml('');
    const escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    let html = escaped;
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italics: single * not adjacent to another *
    html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    html = html.replace(/^### (.+)$/gm, '<h4 class="md-h">$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3 class="md-h">$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h3 class="md-h">$1</h3>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(?:<li>.*<\/li>\n?)+/g, (block) => `<ul class="md-list">${block}</ul>`);
    html = html.replace(/\n\n/g, '</p><p class="md-p">');
    html = html.replace(/\n/g, '<br />');
    html = `<p class="md-p">${html}</p>`;
    html = html.replace(/<p class="md-p"><\/p>/g, '');
    html = html.replace(/<p class="md-p">(<h[34])/g, '$1');
    html = html.replace(/(<\/h[34]>)<\/p>/g, '$1');
    html = html.replace(/<p class="md-p">(<ul)/g, '$1');
    html = html.replace(/(<\/ul>)<\/p>/g, '$1');

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
