import { describe, expect, it } from 'vitest';
import { PRODUCT_TOUR_STEPS, deepenPrompt } from './product-tour.steps';

describe('product tour steps', () => {
  it('has stable anchors and deepen prompts for each step', () => {
    expect(PRODUCT_TOUR_STEPS.length).toBeGreaterThanOrEqual(5);
    for (const step of PRODUCT_TOUR_STEPS) {
      expect(step.anchor.length).toBeGreaterThan(0);
      expect(step.route.startsWith('/')).toBe(true);
      const prompt = deepenPrompt(step);
      expect(prompt).toMatch(/know more|feature/i);
      expect(prompt).toContain(step.featureKey);
      expect(prompt).toMatch(/What can be entered|What does this do|report/i);
    }
  });
});
