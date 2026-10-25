// Doctor QR Sharing Service.
// Compresses chosen medical snapshot into the URL fragment (#d=...) using lz-string,
// generates QR code, enforces character limits (~1200 chars), and decodes read-only on /share.

import LZString from "lz-string";
import QRCode from "qrcode";
import { authService } from "./auth";
import { logService, todayISO } from "./logs";
import { patternFlags, cycleLengths, periodStarts, type FlagId } from "./cycle";
import { medicineService } from "./medicines";
import { visitService } from "./visits";
import { questionService } from "./questions";

export type AdvisoryExpiryOption = "24h" | "7d";

export interface ShareToggles {
  includeName: boolean;
  includeCycle: boolean;
  includeFlags: boolean;
  includeMedicines: boolean;
  includeVisits: boolean;
  includeQuestions: boolean;
}

export interface DoctorShareSnapshot {
  v: 1;
  createdAt: string; // ISO date
  expiresAt: string; // ISO date
  expiryOption: AdvisoryExpiryOption;
  name?: string | undefined;
  cycle?:
    | {
        avgCycleDays: number;
        avgPeriodDays: number;
        lastPeriodStart?: string | undefined;
        daysLogged90d: number;
        bleedingDaysCount: number;
        heavyBleedingDaysCount: number;
        severePainDaysCount: number;
      }
    | undefined;
  flags?: FlagId[] | undefined;
  medicines?:
    | {
        name: string;
        dose: string;
        timings: string[];
        food: string;
      }[]
    | undefined;
  visits?:
    | {
        date: string;
        clinic: string;
        reason: string;
        notes?: string | undefined;
        nextFollowUp?: string | undefined;
      }[]
    | undefined;
  questions?: string[] | undefined;
}

export interface ShareEncodeResult {
  url: string;
  fragment: string;
  charCount: number;
  wasTruncated: boolean;
}

export type ShareDecodeResult =
  | {
      success: true;
      data: DoctorShareSnapshot;
      isExpired: boolean;
      daysRemaining: number;
    }
  | {
      success: false;
      error: "empty" | "invalid_format" | "corrupted" | "unsupported_version";
      message: string;
    };

export const DEFAULT_SHARE_TOGGLES: ShareToggles = {
  includeName: false, // Default false: privacy-first!
  includeCycle: true,
  includeFlags: true,
  includeMedicines: true,
  includeVisits: true,
  includeQuestions: true,
};

const MAX_TARGET_CHARS = 1200;

/**
 * Builds a DoctorShareSnapshot from local storage based on active toggles.
 */
export function buildShareSnapshot(
  toggles: ShareToggles = DEFAULT_SHARE_TOGGLES,
  expiryOption: AdvisoryExpiryOption = "24h",
  now: Date = new Date(),
): DoctorShareSnapshot {
  const expiryMs = expiryOption === "24h" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(now.getTime() + expiryMs).toISOString();
  const createdAt = now.toISOString();
  const today = todayISO();

  const snapshot: DoctorShareSnapshot = {
    v: 1,
    createdAt,
    expiresAt,
    expiryOption,
  };

  const allLogs = logService.all();
  const DAY = 86400000;
  const todayMs = new Date(today + "T00:00:00Z").getTime();
  const logs90 = allLogs.filter((l) => {
    const dMs = new Date(l.date + "T00:00:00Z").getTime();
    const diff = Math.round((todayMs - dMs) / DAY);
    return diff >= 0 && diff < 90;
  });

  // 1. Patient Name (optional toggle)
  if (toggles.includeName) {
    const user = authService.current();
    if (user?.name) {
      snapshot.name = user.name;
    }
  }

  // 2. 90-Day Cycle Summary
  if (toggles.includeCycle) {
    const starts = periodStarts(logs90);
    const lengths = cycleLengths(logs90);
    const avgCycleDays = lengths.length
      ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
      : 28;

    const bleedingDays = logs90.filter((l) => l.flow !== "none");
    const heavyBleedingDays = logs90.filter((l) => l.flow === "heavy" || l.flow === "veryHeavy");
    const severePainDays = logs90.filter((l) => l.painLevel >= 4);

    snapshot.cycle = {
      avgCycleDays,
      avgPeriodDays: starts.length
        ? Math.round(bleedingDays.length / Math.max(1, starts.length))
        : 5,
      lastPeriodStart: starts[0],
      daysLogged90d: logs90.length,
      bleedingDaysCount: bleedingDays.length,
      heavyBleedingDaysCount: heavyBleedingDays.length,
      severePainDaysCount: severePainDays.length,
    };
  }

  // 3. Pattern Flags
  if (toggles.includeFlags) {
    const flags = patternFlags(logs90, today);
    if (flags.length > 0) {
      snapshot.flags = flags;
    }
  }

  // 4. Active Medicines
  if (toggles.includeMedicines) {
    const activeMeds = medicineService.all();
    if (activeMeds.length > 0) {
      snapshot.medicines = activeMeds.map((m) => ({
        name: m.name,
        dose: m.dose,
        timings: m.timings,
        food: m.food,
      }));
    }
  }

  // 5. Recent Visits
  if (toggles.includeVisits) {
    const visits = visitService.all();
    if (visits.length > 0) {
      snapshot.visits = visits.slice(0, 3).map((v) => ({
        date: v.date,
        clinic: v.doctorOrClinic,
        reason: v.reason,
        notes: v.notes ? v.notes.slice(0, 100) : undefined,
        nextFollowUp: v.nextFollowUpDate,
      }));
    }
  }

  // 6. Selected Questions
  if (toggles.includeQuestions) {
    const selected = questionService.getSelectedQuestions(allLogs, today);
    if (selected.length > 0) {
      snapshot.questions = selected.slice(0, 5).map((q) => q.text);
    }
  }

  return snapshot;
}

/**
 * Compresses a snapshot into a URL fragment, enforcing the ~1200 char budget
 * by dropping oldest data if necessary.
 */
export function encodeShareUrl(
  snapshot: DoctorShareSnapshot,
  baseUrl: string = "",
): ShareEncodeResult {
  const activeSnapshot = JSON.parse(JSON.stringify(snapshot)) as DoctorShareSnapshot;
  let wasTruncated = false;

  const tryEncode = (s: DoctorShareSnapshot) => {
    const jsonStr = JSON.stringify(s);
    const compressed = LZString.compressToEncodedURIComponent(jsonStr);
    const fragment = `d=${compressed}`;
    const url = `${baseUrl}/share#${fragment}`;
    return { url, fragment, length: url.length };
  };

  let result = tryEncode(activeSnapshot);

  // If over character budget, trim progressively
  if (
    result.length > MAX_TARGET_CHARS &&
    activeSnapshot.visits &&
    activeSnapshot.visits.length > 1
  ) {
    activeSnapshot.visits = activeSnapshot.visits.slice(0, 1);
    wasTruncated = true;
    result = tryEncode(activeSnapshot);
  }

  if (result.length > MAX_TARGET_CHARS && activeSnapshot.visits) {
    activeSnapshot.visits.forEach((v) => {
      delete v.notes;
    });
    wasTruncated = true;
    result = tryEncode(activeSnapshot);
  }

  if (
    result.length > MAX_TARGET_CHARS &&
    activeSnapshot.questions &&
    activeSnapshot.questions.length > 2
  ) {
    activeSnapshot.questions = activeSnapshot.questions.slice(0, 2);
    wasTruncated = true;
    result = tryEncode(activeSnapshot);
  }

  return {
    url: result.url,
    fragment: result.fragment,
    charCount: result.length,
    wasTruncated,
  };
}

/**
 * Decodes and validates a URL fragment (e.g. from window.location.hash).
 */
export function decodeShareSnapshot(fragmentOrHash: string): ShareDecodeResult {
  if (!fragmentOrHash || fragmentOrHash.trim() === "" || fragmentOrHash === "#") {
    return {
      success: false,
      error: "empty",
      message: "No shared record found in this link.",
    };
  }

  // Strip leading '#' if present
  const clean = fragmentOrHash.startsWith("#") ? fragmentOrHash.slice(1) : fragmentOrHash;

  // Extract 'd=' or 'data=' param
  let encoded = "";
  if (clean.startsWith("d=")) {
    encoded = clean.slice(2);
  } else if (clean.startsWith("data=")) {
    encoded = clean.slice(5);
  } else {
    encoded = clean;
  }

  if (!encoded) {
    return {
      success: false,
      error: "invalid_format",
      message: "The share link is formatted incorrectly.",
    };
  }

  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    if (!decompressed) {
      return {
        success: false,
        error: "corrupted",
        message: "The share data could not be read or has been corrupted.",
      };
    }

    const data = JSON.parse(decompressed) as DoctorShareSnapshot;
    if (data.v !== 1 || !data.createdAt || !data.expiresAt) {
      return {
        success: false,
        error: "unsupported_version",
        message: "This share record format is not recognized.",
      };
    }

    const now = Date.now();
    const expiryTime = new Date(data.expiresAt).getTime();
    const isExpired = now > expiryTime;
    const diffMs = expiryTime - now;
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    return {
      success: true,
      data,
      isExpired,
      daysRemaining,
    };
  } catch {
    return {
      success: false,
      error: "corrupted",
      message: "Unable to parse this shared consultation record.",
    };
  }
}

/**
 * Generates a high-quality data URL for a QR code representing the share URL.
 */
export async function generateQrCodeDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 280,
    margin: 2,
    color: {
      dark: "#0B7A75", // Primary Teal branding
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "M",
  });
}
