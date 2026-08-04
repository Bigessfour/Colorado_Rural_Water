import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  emptyOnboardingIntake,
  isOnboardingComplete,
  mergeOnboardingIntake,
  onboardingPathLabel,
} from './onboarding-intake.js';

describe('onboarding-intake', () => {
  it('empty intake is not complete', () => {
    const intake = emptyOnboardingIntake('town-wiley');
    assert.equal(isOnboardingComplete(intake), false);
  });

  it('merge persists fields and can mark complete', () => {
    const merged = mergeOnboardingIntake(
      null,
      'town-wiley',
      {
        systemName: 'Town of Wiley',
        primaryContactEmail: 'clerk@wiley.example',
        onboardingPath: 'B',
        preferredUnit: 'gal',
        currentStep: 5,
      },
      true,
    );
    assert.equal(merged.ok, true);
    if (!merged.ok) return;
    assert.equal(merged.intake.systemName, 'Town of Wiley');
    assert.equal(merged.intake.onboardingPath, 'B');
    assert.ok(merged.intake.completedAt);
    assert.equal(isOnboardingComplete(merged.intake), true);
  });

  it('complete requires systemName and primaryContactEmail', () => {
    const bad = mergeOnboardingIntake(null, 'town-wiley', { systemName: 'X' }, true);
    assert.equal(bad.ok, false);
  });

  it('path labels are plain language', () => {
    assert.match(onboardingPathLabel('A'), /Thin/);
    assert.match(onboardingPathLabel('D'), /Strong/);
  });
});
