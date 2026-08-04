import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildOperationsSummaryHtml } from './report-summary.js';

describe('report-summary', () => {
  it('builds printable HTML with KPIs and alerts table', () => {
    const html = buildOperationsSummaryHtml({
      tenantId: 'town-wiley',
      displayName: 'Town of Wiley',
      generatedAt: '2026-08-04T12:00:00.000Z',
      confidence: {
        level: 'Building',
        monthsOfHistory: 4,
        coveragePct: 72,
        statisticalMode: 'Watch',
        improveHint: 'Upload 2 more cycles',
        displayScore: 55,
      },
      balance: {
        tenantId: 'town-wiley',
        period: '2026-07',
        periodLabel: 'July 2026',
        status: 'loss',
        producedGal: 100_000,
        billedGal: 85_000,
        unaccountedGal: 15_000,
        unaccountedPct: 15,
        sourceReadingCount: 2,
        meterDeltaCount: 50,
        trend: [],
      },
      openAlertCount: 2,
      actionableCount: 1,
      watchCount: 1,
      topAlerts: [
        {
          meterId: '1042',
          serviceAddress: '123 Main',
          mode: 'Actionable',
          summary: 'Stuck meter',
          confidenceNote: 'Diagnostic flag',
        },
      ],
    });
    assert.match(html, /Town of Wiley/);
    assert.match(html, /Building/);
    assert.match(html, /1042/);
    assert.match(html, /<!DOCTYPE html>/);
  });
});
