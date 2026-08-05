import { describe, expect, it } from 'vitest';
import { biasColoradoAddress, municipalityTokens } from './geocode.service';

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

  it('appends tenant town when street has no municipality', () => {
    expect(biasColoradoAddress('112 N Main St', { town: 'Town of Wiley' })).toBe(
      '112 N Main St, Town of Wiley, Colorado, USA',
    );
  });

  it('does not duplicate town when already present', () => {
    expect(biasColoradoAddress('112 N Main St Wiley CO', { town: 'Town of Wiley' })).toBe(
      '112 N Main St Wiley Colorado, USA',
    );
  });

  it('appends ZIP when provided', () => {
    expect(biasColoradoAddress('112 N Main St', { town: 'Wiley, CO', zip: '81092' })).toBe(
      '112 N Main St, Wiley, Colorado 81092, USA',
    );
  });
});

describe('municipalityTokens', () => {
  it('keeps wiley from Town of Wiley', () => {
    expect(municipalityTokens('Town of Wiley')).toContain('wiley');
    expect(municipalityTokens('Town of Wiley')).not.toContain('town');
  });
});
