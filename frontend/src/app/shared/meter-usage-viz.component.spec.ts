import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { MeterUsageVizComponent } from './meter-usage-viz.component';

describe('MeterUsageVizComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeterUsageVizComponent],
    }).compileComponents();
  });

  it('computes stats and charts from reading input', () => {
    const fixture = TestBed.createComponent(MeterUsageVizComponent);
    fixture.componentRef.setInput('meterId', '1042');
    fixture.componentRef.setInput('installDate', '2024-01-15');
    fixture.componentRef.setInput('readings', [
      { timestamp: '2026-05-01T00:00:00Z', cumulativeReading: 1000, unit: 'gal' },
      { timestamp: '2026-06-01T00:00:00Z', cumulativeReading: 1100, unit: 'gal' },
      { timestamp: '2026-07-01T00:00:00Z', cumulativeReading: 1200, unit: 'gal' },
    ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.stats().readingCount).toBe(3);
    expect(fixture.componentInstance.sparkline().empty).toBe(false);
    expect(fixture.nativeElement.textContent).toMatch(/Usage|1042/i);
  });
});
