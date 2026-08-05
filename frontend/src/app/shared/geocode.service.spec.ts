import { describe, expect, it } from 'vitest';
import { biasColoradoAddress } from './geocode.service';

describe('biasColoradoAddress', () => {
  it('appends Colorado USA when missing', () => {
    expect(biasColoradoAddress('112 N Main St Wiley')).toBe('112 N Main St Wiley, Colorado, USA');
  });

  it('expands CO and adds USA', () => {
    expect(biasColoradoAddress('112 N Main St Wiley CO')).toBe('112 N Main St Wiley Colorado, USA');
  });

  it('adds USA when Colorado already present', () => {
    expect(biasColoradoAddress('Wiley, Colorado')).toBe('Wiley, Colorado, USA');
  });
});
