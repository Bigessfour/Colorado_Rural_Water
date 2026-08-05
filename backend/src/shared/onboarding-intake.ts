/**
 * Member onboarding intake (Feature 012 / Epic E2).
 * Stored per tenant at META#onboarding — separate from CRWA admin provision (D3).
 */

export type OnboardingPath = "A" | "B" | "C" | "D";
export type ReadingUnit = "gal" | "cf";
export type ReadSchedule = "manual" | "ami" | "mixed";
export type ExportFormatHint = "csv" | "xlsx" | "both" | "unknown";

export const ONBOARDING_STEPS = [
  "Welcome",
  "System & location",
  "Contacts",
  "System size",
  "Your export / billing reads",
  "Data inventory",
] as const;

export interface OnboardingIntake {
  tenantId: string;
  /** 0-based wizard step index */
  currentStep: number;
  completedAt: string | null;
  systemName: string;
  serviceTerritoryAddress: string;
  mapTown: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  billingClerkName: string;
  billingClerkPhone: string;
  meterCountEstimate: number | null;
  sourceCountEstimate: number | null;
  readSchedule: ReadSchedule;
  preferredUnit: ReadingUnit;
  billingCycleNote: string;
  /** Municipal CIS / meter-read export tool — NOT CRWA membership billing */
  municipalBillingSystem: string;
  exportFormat: ExportFormatHint;
  exportColumnHints: string;
  onboardingPath: OnboardingPath;
  hasHistoricalExport: boolean;
  historyNotes: string;
  updatedAt: string;
}

export interface OnboardingStore {
  getOnboardingIntake(tenantId: string): Promise<OnboardingIntake | null>;
  putOnboardingIntake(intake: OnboardingIntake): Promise<void>;
}

export function emptyOnboardingIntake(tenantId: string): OnboardingIntake {
  const now = new Date().toISOString();
  return {
    tenantId,
    currentStep: 0,
    completedAt: null,
    systemName: "",
    serviceTerritoryAddress: "",
    mapTown: "",
    primaryContactName: "",
    primaryContactEmail: "",
    primaryContactPhone: "",
    billingClerkName: "",
    billingClerkPhone: "",
    meterCountEstimate: null,
    sourceCountEstimate: null,
    readSchedule: "manual",
    preferredUnit: "gal",
    billingCycleNote: "",
    municipalBillingSystem: "",
    exportFormat: "unknown",
    exportColumnHints: "",
    onboardingPath: "A",
    hasHistoricalExport: false,
    historyNotes: "",
    updatedAt: now,
  };
}

export function isOnboardingComplete(intake: OnboardingIntake | null): boolean {
  return Boolean(intake?.completedAt);
}

const PATHS: OnboardingPath[] = ["A", "B", "C", "D"];
const UNITS: ReadingUnit[] = ["gal", "cf"];
const SCHEDULES: ReadSchedule[] = ["manual", "ami", "mixed"];
const EXPORT_FORMATS: ExportFormatHint[] = ["csv", "xlsx", "both", "unknown"];

function trimStr(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, max);
}

function optionalCount(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return null;
  return Math.floor(n);
}

export function mergeOnboardingIntake(
  existing: OnboardingIntake | null,
  tenantId: string,
  body: Record<string, unknown>,
  markComplete?: boolean,
): { ok: true; intake: OnboardingIntake } | { ok: false; error: string } {
  const base = existing ?? emptyOnboardingIntake(tenantId);
  if (base.tenantId !== tenantId) {
    return { ok: false, error: "tenant mismatch" };
  }

  const stepRaw = body.currentStep;
  let currentStep = base.currentStep;
  if (stepRaw !== undefined && stepRaw !== null && stepRaw !== "") {
    const s = typeof stepRaw === "number" ? stepRaw : Number(stepRaw);
    if (!Number.isFinite(s) || s < 0 || s >= ONBOARDING_STEPS.length) {
      return {
        ok: false,
        error: `currentStep must be 0–${ONBOARDING_STEPS.length - 1}`,
      };
    }
    currentStep = Math.floor(s);
  }

  const pathRaw = body.onboardingPath;
  let onboardingPath = base.onboardingPath;
  if (pathRaw !== undefined && pathRaw !== null && pathRaw !== "") {
    if (
      typeof pathRaw !== "string" ||
      !PATHS.includes(pathRaw as OnboardingPath)
    ) {
      return { ok: false, error: "onboardingPath must be A, B, C, or D" };
    }
    onboardingPath = pathRaw as OnboardingPath;
  }

  const unitRaw = body.preferredUnit;
  let preferredUnit = base.preferredUnit;
  if (unitRaw !== undefined && unitRaw !== null && unitRaw !== "") {
    if (
      typeof unitRaw !== "string" ||
      !UNITS.includes(unitRaw as ReadingUnit)
    ) {
      return { ok: false, error: "preferredUnit must be gal or cf" };
    }
    preferredUnit = unitRaw as ReadingUnit;
  }

  const schedRaw = body.readSchedule;
  let readSchedule = base.readSchedule;
  if (schedRaw !== undefined && schedRaw !== null && schedRaw !== "") {
    if (
      typeof schedRaw !== "string" ||
      !SCHEDULES.includes(schedRaw as ReadSchedule)
    ) {
      return { ok: false, error: "readSchedule must be manual, ami, or mixed" };
    }
    readSchedule = schedRaw as ReadSchedule;
  }

  const fmtRaw = body.exportFormat;
  let exportFormat = base.exportFormat;
  if (fmtRaw !== undefined && fmtRaw !== null && fmtRaw !== "") {
    if (
      typeof fmtRaw !== "string" ||
      !EXPORT_FORMATS.includes(fmtRaw as ExportFormatHint)
    ) {
      return {
        ok: false,
        error: "exportFormat must be csv, xlsx, both, or unknown",
      };
    }
    exportFormat = fmtRaw as ExportFormatHint;
  }

  const now = new Date().toISOString();
  const intake: OnboardingIntake = {
    ...base,
    tenantId,
    currentStep,
    completedAt: markComplete ? now : base.completedAt,
    systemName:
      "systemName" in body ? trimStr(body.systemName, 120) : base.systemName,
    serviceTerritoryAddress:
      "serviceTerritoryAddress" in body
        ? trimStr(body.serviceTerritoryAddress, 200)
        : base.serviceTerritoryAddress,
    mapTown: "mapTown" in body ? trimStr(body.mapTown, 160) : base.mapTown,
    primaryContactName:
      "primaryContactName" in body
        ? trimStr(body.primaryContactName, 80)
        : base.primaryContactName,
    primaryContactEmail:
      "primaryContactEmail" in body
        ? trimStr(body.primaryContactEmail, 128)
        : base.primaryContactEmail,
    primaryContactPhone:
      "primaryContactPhone" in body
        ? trimStr(body.primaryContactPhone, 32)
        : base.primaryContactPhone,
    billingClerkName:
      "billingClerkName" in body
        ? trimStr(body.billingClerkName, 80)
        : base.billingClerkName,
    billingClerkPhone:
      "billingClerkPhone" in body
        ? trimStr(body.billingClerkPhone, 32)
        : base.billingClerkPhone,
    meterCountEstimate:
      "meterCountEstimate" in body
        ? optionalCount(body.meterCountEstimate)
        : base.meterCountEstimate,
    sourceCountEstimate:
      "sourceCountEstimate" in body
        ? optionalCount(body.sourceCountEstimate)
        : base.sourceCountEstimate,
    readSchedule,
    preferredUnit,
    billingCycleNote:
      "billingCycleNote" in body
        ? trimStr(body.billingCycleNote, 200)
        : base.billingCycleNote,
    municipalBillingSystem:
      "municipalBillingSystem" in body
        ? trimStr(body.municipalBillingSystem, 120)
        : base.municipalBillingSystem,
    exportFormat,
    exportColumnHints:
      "exportColumnHints" in body
        ? trimStr(body.exportColumnHints, 500)
        : base.exportColumnHints,
    onboardingPath,
    hasHistoricalExport:
      "hasHistoricalExport" in body
        ? Boolean(body.hasHistoricalExport)
        : base.hasHistoricalExport,
    historyNotes:
      "historyNotes" in body
        ? trimStr(body.historyNotes, 500)
        : base.historyNotes,
    updatedAt: now,
  };

  if (markComplete) {
    if (!intake.systemName.trim()) {
      return { ok: false, error: "systemName is required to complete intake" };
    }
    if (!intake.primaryContactEmail.trim()) {
      return {
        ok: false,
        error: "primaryContactEmail is required to complete intake",
      };
    }
  }

  return { ok: true, intake };
}

export function onboardingPathLabel(path: OnboardingPath): string {
  switch (path) {
    case "A":
      return "Bootstrap — current cycle only (Confidence starts Thin)";
    case "B":
      return "Short history — about 1–6 months (Building)";
    case "C":
      return "Seasonal baseline — 6–18 months (approaching Solid)";
    case "D":
      return "Deep archive — multi-year exports (Strong faster)";
    default:
      return path;
  }
}
