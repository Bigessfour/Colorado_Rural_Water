import { describe, expect, it } from 'vitest';
import { REPORT_CATALOG, categoryLabel } from './report-catalog';

describe('report-catalog', () => {
  it('categoryLabel maps field and operations categories', () => {
    expect(categoryLabel('field')).toBe('Field / work orders');
    expect(categoryLabel('operations')).toBe('Operations');
    expect(categoryLabel('legacy')).toBe('Legacy export');
  });

  it('REPORT_CATALOG lists field, operations, and legacy processes', () => {
    expect(REPORT_CATALOG).toHaveLength(5);
    expect(REPORT_CATALOG.map((r) => r.id)).toEqual([
      'work-order-csv',
      'work-order-xlsx',
      'work-order-html',
      'ops-summary',
      'alerts-csv',
    ]);
  });
});
