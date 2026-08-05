export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Open HTML in a new tab via blob URL (more reliable than blank + document.write).
 * Returns false when the browser blocks the popup.
 */
export function openHtmlInNewTab(html: string): boolean {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  // Do not pass noopener here — modern browsers then return null from window.open
  // even when the tab opens, which would falsely look like a blocked popup.
  const w = window.open(url, '_blank');
  if (!w) {
    URL.revokeObjectURL(url);
    return false;
  }
  try {
    w.opener = null;
  } catch {
    /* ignore cross-origin opener clear failures */
  }
  // Keep the blob alive long enough for the tab to load.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
