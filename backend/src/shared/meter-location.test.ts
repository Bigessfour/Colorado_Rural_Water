import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyMeterLocationUpsert,
  applyMeterMetadataPatch,
  mergeAssetField,
  normalizeAddressKey,
  parseMeterMetadataPatch,
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

describe('mergeAssetField', () => {
  it('keeps existing when incoming is empty or undefined', () => {
    assert.equal(mergeAssetField('Badger', undefined), 'Badger');
    assert.equal(mergeAssetField('Badger', null), 'Badger');
    assert.equal(mergeAssetField('Badger', ''), 'Badger');
    assert.equal(mergeAssetField('Badger', '   '), 'Badger');
  });

  it('overwrites when incoming is non-empty', () => {
    assert.equal(mergeAssetField('Badger', 'Sensus'), 'Sensus');
    assert.equal(mergeAssetField(null, 'Sensus'), 'Sensus');
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
    manufacturer: 'Badger',
    model: 'M25',
    serialNumber: 'SN-9',
    meterSize: '5/8',
    installDate: '2019-06-01',
    meterType: 'positive displacement',
    locationDetail: 'pit',
    radioId: 'RADIO-1',
    lastTestedAt: '2024-01-15',
    notes: 'OK',
    updatedAt: '2026-06-15T00:00:00.000Z',
  };

  it('creates a new location when none exists', () => {
    const { location, addressConflict } = applyMeterLocationUpsert(null, {
      tenantId: 'town-wiley',
      meterId: '1042',
      serviceAddress: '112 N Main St, Wiley CO',
      occupantName: 'J Smith',
      manufacturer: 'Badger',
      updatedAt: '2026-06-15T00:00:00.000Z',
    });
    assert.equal(addressConflict, false);
    assert.equal(location.serviceAddress, '112 N Main St, Wiley CO');
    assert.equal(location.occupantName, 'J Smith');
    assert.equal(location.manufacturer, 'Badger');
    assert.equal(location.model, null);
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
    assert.equal(location.manufacturer, 'Badger');
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

  it('does not wipe asset fields when re-ingest omits them', () => {
    const { location } = applyMeterLocationUpsert(base, {
      tenantId: 'town-wiley',
      meterId: '1042',
      serviceAddress: '112 N Main St, Wiley CO',
      occupantName: 'A Rivera',
      manufacturer: null,
      model: '',
      serialNumber: undefined,
      meterSize: '   ',
      installDate: null,
    });
    assert.equal(location.manufacturer, 'Badger');
    assert.equal(location.model, 'M25');
    assert.equal(location.serialNumber, 'SN-9');
    assert.equal(location.meterSize, '5/8');
    assert.equal(location.installDate, '2019-06-01');
    assert.equal(location.meterType, 'positive displacement');
    assert.equal(location.radioId, 'RADIO-1');
    assert.equal(location.notes, 'OK');
  });

  it('updates asset fields when incoming values are non-empty', () => {
    const { location } = applyMeterLocationUpsert(base, {
      tenantId: 'town-wiley',
      meterId: '1042',
      serviceAddress: '112 N Main St, Wiley CO',
      manufacturer: 'Sensus',
      meterSize: '1"',
      installDate: '2020-03-01',
    });
    assert.equal(location.manufacturer, 'Sensus');
    assert.equal(location.meterSize, '1"');
    assert.equal(location.installDate, '2020-03-01');
    assert.equal(location.model, 'M25');
  });
});

describe('parseMeterMetadataPatch + applyMeterMetadataPatch', () => {
  const base: MeterLocation = {
    tenantId: 'town-wiley',
    meterId: '1042',
    serviceAddress: '112 N Main St, Wiley CO',
    occupantName: 'J Smith',
    accountNumber: 'A-2201',
    route: 'R3',
    manufacturer: 'Badger',
    model: 'M25',
    serialNumber: null,
    meterSize: '5/8',
    installDate: '2019-06-01',
    meterType: null,
    locationDetail: null,
    radioId: null,
    lastTestedAt: null,
    notes: 'old',
    updatedAt: '2026-06-15T00:00:00.000Z',
  };

  it('rejects address relocate attempts', () => {
    const parsed = parseMeterMetadataPatch({ serviceAddress: 'Elsewhere' });
    assert.equal(parsed.ok, false);
  });

  it('applies partial PUT shape and allows clearing', () => {
    const parsed = parseMeterMetadataPatch({
      manufacturer: 'Sensus',
      notes: '',
      model: null,
      meterSize: '1"',
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const next = applyMeterMetadataPatch(base, parsed.patch, '2026-08-03T12:00:00.000Z');
    assert.equal(next.manufacturer, 'Sensus');
    assert.equal(next.notes, null);
    assert.equal(next.model, null);
    assert.equal(next.meterSize, '1"');
    assert.equal(next.installDate, '2019-06-01');
    assert.equal(next.serviceAddress, base.serviceAddress);
    assert.equal(next.updatedAt, '2026-08-03T12:00:00.000Z');
  });
});
