import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob, openHtmlInNewTab } from './download.util';

describe('download.util', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('openHtmlInNewTab opens a blob URL and returns true', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:html-1');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);

    expect(openHtmlInNewTab('<p>hi</p>')).toBe(true);
    expect(open).toHaveBeenCalledWith('blob:html-1', '_blank');
  });

  it('openHtmlInNewTab returns false when the popup is blocked', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:html-2');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(window, 'open').mockReturnValue(null);

    expect(openHtmlInNewTab('<p>blocked</p>')).toBe(false);
    expect(revoke).toHaveBeenCalledWith('blob:html-2');
  });
});
