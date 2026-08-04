import { describe, expect, it, vi } from 'vitest';
import { downloadBlob, openHtmlInNewTab } from './download.util';

describe('download.util', () => {
  it('downloadBlob creates a temporary anchor', () => {
    const click = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({
      click,
      href: '',
      download: '',
    } as unknown as HTMLAnchorElement);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:1');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    downloadBlob(new Blob(['x']), 'test.csv');
    expect(click).toHaveBeenCalled();
  });

  it('openHtmlInNewTab writes document when window opens', () => {
    const write = vi.fn();
    const close = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { write, close } } as unknown as Window);
    openHtmlInNewTab('<p>hi</p>');
    expect(write).toHaveBeenCalledWith('<p>hi</p>');
    expect(close).toHaveBeenCalled();
  });
});
