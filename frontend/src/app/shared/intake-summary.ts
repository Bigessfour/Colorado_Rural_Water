/**
 * Shared Path A–D labels for intake (mirrors backend onboardingPathLabel).
 */

export type IntakePath = 'A' | 'B' | 'C' | 'D';

export function intakePathLabel(path: IntakePath | string | null | undefined): string {
  switch (path) {
    case 'A':
      return 'Path A — current cycle only (Confidence starts Thin)';
    case 'B':
      return 'Path B — about 1–6 months history (Building)';
    case 'C':
      return 'Path C — 6–18 months / two seasons (approaching Solid)';
    case 'D':
      return 'Path D — multi-year archive (Strong faster)';
    default:
      return '';
  }
}

export interface IntakeSummary {
  complete: boolean;
  currentStep: number;
  stepCount: number;
  onboardingPath: IntakePath;
  pathLabel: string;
  municipalBillingSystem: string;
  exportFormat: string;
  exportColumnHints: string;
  meterCountEstimate: number | null;
}

export function parseIntakeSummary(body: {
  complete?: boolean;
  intake?: {
    currentStep?: number;
    onboardingPath?: string;
    municipalBillingSystem?: string;
    exportFormat?: string;
    exportColumnHints?: string;
    meterCountEstimate?: number | null;
  } | null;
}): IntakeSummary | null {
  const intake = body.intake;
  if (!intake) return null;
  const path = (intake.onboardingPath ?? 'A') as IntakePath;
  return {
    complete: Boolean(body.complete),
    currentStep: Number(intake.currentStep ?? 0),
    stepCount: 6,
    onboardingPath: path,
    pathLabel: intakePathLabel(path),
    municipalBillingSystem: String(intake.municipalBillingSystem ?? '').trim(),
    exportFormat: String(intake.exportFormat ?? '').trim(),
    exportColumnHints: String(intake.exportColumnHints ?? '').trim(),
    meterCountEstimate:
      intake.meterCountEstimate == null ? null : Number(intake.meterCountEstimate),
  };
}
