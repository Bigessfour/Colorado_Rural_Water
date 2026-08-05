import { describe, expect, it } from 'vitest';
import { assistantWelcome, friendlyMunicipalityName, operatorFirstName } from './persona';

describe('persona helpers', () => {
  it('builds Town/City labels from tenant slugs', () => {
    expect(friendlyMunicipalityName('town-wiley')).toBe('Town of Wiley');
    expect(friendlyMunicipalityName('city-fort-morgan')).toBe('City of Fort Morgan');
    expect(friendlyMunicipalityName('town-wiley', 'Town of Wiley')).toBe('Town of Wiley');
  });

  it('derives first name from email local-part', () => {
    expect(operatorFirstName({ email: 'kelly.review@watersaver.local' })).toBe('Kelly');
    expect(operatorFirstName({ email: 'demo.operator@watersaver.local' })).toBe('Demo');
    expect(operatorFirstName({ fullName: 'Steve McKitrick' })).toBe('Steve');
  });

  it('welcomes without saying tenant', () => {
    const text = assistantWelcome({
      tenantId: 'town-wiley',
      email: 'kelly.review@watersaver.local',
    });
    expect(text).toContain('Hi Kelly');
    expect(text).toContain('Town of Wiley');
    expect(text.toLowerCase()).not.toContain('tenant');
    expect(text).not.toContain('town-wiley');
  });
});
