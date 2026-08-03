import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyMeterLocationUpsert,
  normalizeAddressKey,
  type MeterLocation,
} from './meter-location.js';

describe('normalizeAddressKey', () => {
  it('ignores case, punctuation, and extra spaces', () => {
    assert.equal(
      normalizeAddressKey('112 N Main St., Wiley CO'),
      normalizeAddressKey('112 n main st  wiley co'),
    );
  });
});

describe('applyMeterLocationUpsert', () => {
  const base: MeterLocation = {
    tenantId: 'town-wiley',
    meterId: '1042',
    serviceAddress: '112 N Main St, Wiley CO',
    occupantName: 'J Smith',
    accountNumber: 'A-2201',
    route: 'R3',
    meterSize: null,
    installDate: null,
    updatedAt: '2026-06-15T00:00:00.000Z',
  };

  it('creates a new location when none exists', () => {
    const { location, addressConflict } = applyMeterLocationUpsert(null, {
      tenantId: 'town-wiley',
      meterId: '1042',
      serviceAddress: '112 N Main St, Wiley CO',
      occupantName: 'J Smith',
      updatedAt: '2026-06-15T00:00:00.000Z',
    });
    assert.equal(addressConflict, false);
    assert.equal(location.serviceAddress, '112 N Main St, Wiley CO');
    assert.equal(location.occupantName, 'J Smith');
  });

  it('updates occupant name without changing address', () => {
    const { location, addressConflict } = applyMeterLocationUpsert(base, {
      tenantId: 'town-wiley',
      meterId: '1042',
      serviceAddress: '112 N Main St, Wiley CO',
      occupantName: 'A Rivera',
      updatedAt: '2026-07-15T00:00:00.000Z',
    });
    assert.equal(addressConflict, false);
    assert.equal(location.serviceAddress, base.serviceAddress);
    assert.equal(location.occupantName, 'A Rivera');
    assert.equal(location.accountNumber, 'A-2201');
  });

  it('flags address conflict, keeps address, still updates occupant', () => {
    const { location, addressConflict } = applyMeterLocationUpsert(base, {
      tenantId: 'town-wiley',
      meterId: '1042',
      serviceAddress: '999 Other Rd, Wiley CO',
      occupantName: 'Someone Else',
    });
    assert.equal(addressConflict, true);
    assert.equal(location.serviceAddress, base.serviceAddress);
    assert.equal(location.occupantName, 'Someone Else');
  });
});
