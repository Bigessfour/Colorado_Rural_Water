import { describe, expect, it } from 'vitest';
import { COLORADO_MAP_CENTER } from './meter-map.component';

describe('meter-map constants', () => {
  it('COLORADO_MAP_CENTER defaults to statewide view', () => {
    expect(COLORADO_MAP_CENTER.lat).toBe(39.0);
    expect(COLORADO_MAP_CENTER.lng).toBe(-105.5);
    expect(COLORADO_MAP_CENTER.zoom).toBe(7);
  });
});
