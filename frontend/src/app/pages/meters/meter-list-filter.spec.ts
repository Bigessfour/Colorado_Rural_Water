import { describe, expect, it } from 'vitest';
import { filterMeterRows } from './meter-list-filter';

const rows = [
  {
    meterId: 'M-1012',
    serviceAddress: '100 Main St Wiley CO',
    occupantName: 'A Rivera',
    accountNumber: 'A-2201',
    route: 'R3',
    serialNumber: 'SN-9',
    radioId: null,
    manufacturer: 'Sensus',
    model: 'iPERL',
  },
  {
    meterId: 'STEVE-004',
    serviceAddress: '12 Oak Ave',
    occupantName: 'J Smith',
    accountNumber: 'B-100',
    route: 'R1',
    serialNumber: null,
    radioId: 'RAD-1',
    manufacturer: null,
    model: null,
  },
];

describe('filterMeterRows', () => {
  it('returns all rows for blank query', () => {
    expect(filterMeterRows(rows, '  ')).toHaveLength(2);
  });

  it('matches meter id case-insensitively', () => {
    expect(filterMeterRows(rows, 'steve-004').map((r) => r.meterId)).toEqual(['STEVE-004']);
  });

  it('requires every token to match (AND)', () => {
    expect(filterMeterRows(rows, 'main wiley').map((r) => r.meterId)).toEqual(['M-1012']);
    expect(filterMeterRows(rows, 'main denver')).toHaveLength(0);
  });

  it('searches occupant account route serial radio manufacturer', () => {
    expect(filterMeterRows(rows, 'rivera').map((r) => r.meterId)).toEqual(['M-1012']);
    expect(filterMeterRows(rows, 'a-2201').map((r) => r.meterId)).toEqual(['M-1012']);
    expect(filterMeterRows(rows, 'rad-1').map((r) => r.meterId)).toEqual(['STEVE-004']);
    expect(filterMeterRows(rows, 'sensus').map((r) => r.meterId)).toEqual(['M-1012']);
  });
});
