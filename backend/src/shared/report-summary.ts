/**
 * Printable HTML operations summary (Feature 012).
 * Browser print → PDF; no server-side PDF engine in MVP.
 */

import type { ConfidenceSnapshot } from './alert-engine.js';
import type { WaterBalanceResult } from './water-balance.js';

export interface SummaryAlertRow {
  meterId: string;
  serviceAddress?: string | null;
  mode: string;
  summary: string;
  confidenceNote: string;
}

export interface OperationsSummaryInput {
  tenantId: string;
  displayName: string;
  generatedAt: string;
  confidence: ConfidenceSnapshot;
  balance: WaterBalanceResult;
  openAlertCount: number;
  actionableCount: number;
  watchCount: number;
  topAlerts: SummaryAlertRow[];
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildOperationsSummaryHtml(input: OperationsSummaryInput): string {
  const bal = input.balance;
  const unaccounted =
    bal.status === 'insufficient' || bal.unaccountedPct == null
      ? '— (need In + Out)'
      : `${bal.unaccountedPct.toFixed(1)}% (${bal.unaccountedGal?.toLocaleString() ?? '—'} gal)`;

  const alertRows =
    input.topAlerts.length === 0
      ? '<tr><td colspan="4">No open flagged meters right now.</td></tr>'
      : input.topAlerts
          .map(
            (a) =>
              `<tr><td>${esc(a.meterId)}</td><td>${esc(a.serviceAddress ?? '—')}</td><td>${esc(a.mode)}</td><td>${esc(a.summary)}</td></tr>`,
          )
          .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Water Saver — Operations Summary — ${esc(input.displayName)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 1.5rem; color: #1a1a1a; max-width: 900px; }
    h1 { font-size: 1.35rem; margin-bottom: 0.25rem; }
    .meta { color: #555; font-size: 0.9rem; margin-bottom: 1.25rem; }
    .kpis { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-bottom: 1.25rem; }
    .kpi { border: 1px solid #ccc; border-radius: 6px; padding: 0.75rem; }
    .kpi strong { display: block; font-size: 1.1rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 0.5rem; }
    th, td { border: 1px solid #ddd; padding: 0.4rem 0.5rem; text-align: left; vertical-align: top; }
    th { background: #f5f5f5; }
    .foot { margin-top: 1.5rem; font-size: 0.8rem; color: #666; }
    @media print { body { margin: 0.75rem; } }
  </style>
</head>
<body>
  <h1>Water Saver — Operations Summary</h1>
  <p class="meta">${esc(input.displayName)} · System ${esc(input.tenantId)} · Generated ${esc(input.generatedAt)}</p>
  <div class="kpis">
    <div class="kpi"><span>Data Confidence</span><strong>${esc(input.confidence.level)}</strong><small>${input.confidence.monthsOfHistory} mo history · ${input.confidence.coveragePct}% coverage</small></div>
    <div class="kpi"><span>Open flagged meters</span><strong>${input.openAlertCount}</strong><small>${input.actionableCount} Actionable · ${input.watchCount} Watch</small></div>
    <div class="kpi"><span>Water balance (${esc(bal.periodLabel)})</span><strong>${esc(bal.status)}</strong><small>Unaccounted: ${esc(unaccounted)}</small></div>
    <div class="kpi"><span>In / Out</span><strong>${bal.producedGal?.toLocaleString() ?? '—'} / ${bal.billedGal?.toLocaleString() ?? '—'} gal</strong><small>Production vs customer usage</small></div>
  </div>
  <h2>Top flagged meters</h2>
  <table>
    <thead><tr><th>Meter</th><th>Address</th><th>Mode</th><th>Summary</th></tr></thead>
    <tbody>${alertRows}</tbody>
  </table>
  <p class="foot">Watch flags are informational when history is thin — not dig-now leak confirmation. Export work orders from Reports for field crews (includes map links when coordinates exist).</p>
</body>
</html>`;
}
