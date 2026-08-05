import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';

function collectPaths(rs: typeof routes, prefix = ''): string[] {
  const out: string[] = [];
  for (const r of rs) {
    const path = r.path ?? '';
    const full =
      path === ''
        ? prefix || '/'
        : `${prefix}/${path}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    if (r.component) {
      out.push(
        path === 'login' ? '/login' : full === '' ? '/' : full.startsWith('/') ? full : `/${full}`,
      );
    }
    if (r.children) {
      const childPrefix = path === '' ? prefix : `${prefix}/${path}`;
      out.push(...collectPaths(r.children, childPrefix.replace(/\/+/g, '/')));
    }
  }
  return out;
}

describe('app.routes', () => {
  it('registers Kelly / Pilot primary paths', () => {
    const paths = collectPaths(routes);
    const expected = [
      '/login',
      '/dashboard',
      '/upload',
      '/meters',
      '/sources',
      '/alerts',
      '/onboarding',
      '/reports',
      '/settings',
      '/assistant',
      '/account',
      '/admin',
      '/billing',
      '/crwa',
      '/review',
    ];
    for (const p of expected) {
      expect(paths).toContain(p);
    }
  });
});
