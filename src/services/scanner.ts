import { inferCategory } from "./medicines";

export type ScannedMedicine = {
  name: string;
  dose: string;
  frequency: number;
  timings: ("morning" | "afternoon" | "evening" | "night")[];
  food: "before" | "after" | "with" | "any";
  durationDays: number;
  category: "iron" | "calcium" | "painRelief" | "hormonal" | "antacid" | "antibiotic" | "general";
  needsCheck?: boolean;
  asNeeded?: boolean;
  note?: string | null;
};

export type ScanErrorCode =
  | "offline"
  | "scan_unavailable"
  | "rate_limited"
  | "bad_image"
  | "too_large"
  | "unreadable"
  | "not_prescription"
  | "upstream_error"
  | "timeout"
  | "unknown";

export class ScanError extends Error {
  code: ScanErrorCode;

  constructor(code: ScanErrorCode, message?: string) {
    super(message || code);
    this.name = "ScanError";
    this.code = code;
  }
}

// In-memory cache for the last 5 scanned images
type CacheEntry = {
  hash: string;
  medicines: ScannedMedicine[];
};
const memoryCache: CacheEntry[] = [];

export function getScanCacheForTests(): CacheEntry[] {
  return memoryCache;
}

export function clearScanCacheForTests(): void {
  memoryCache.length = 0;
}

/**
 * Computes a fast string hash of base64 data for client-side caching.
 */
export function computeImageHash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  const step = Math.max(1, Math.floor(str.length / 500));
  for (let i = 0; i < str.length; i += step) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h1 >>> 0).toString(16)}_${(h2 >>> 0).toString(16)}_${str.length}`;
}

async function fileToBase64(file: File | Blob): Promise<string> {
  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const comma = result.indexOf(",");
        resolve(comma !== -1 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }
  if (typeof file.arrayBuffer === "function") {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const len = bytes.length;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return btoa(binary);
  }
  return "";
}

function loadImageElement(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    // Fast path: In jsdom or non-browser environments, skip HTMLImageElement
    if (
      typeof navigator !== "undefined" &&
      navigator.userAgent &&
      navigator.userAgent.includes("jsdom")
    ) {
      reject(new Error("JSDOM image load not supported"));
      return;
    }
    if (
      typeof Image === "undefined" ||
      typeof URL === "undefined" ||
      typeof URL.createObjectURL !== "function"
    ) {
      reject(new Error("Image not supported"));
      return;
    }
    let url = "";
    try {
      url = URL.createObjectURL(file);
    } catch {
      reject(new Error("createObjectURL failed"));
      return;
    }
    const img = new Image();
    const timer = setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore revocation error
      }
      reject(new Error("Image decode timeout"));
    }, 1500);

    img.onload = () => {
      clearTimeout(timer);
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore revocation error
      }
      resolve(img);
    };
    img.onerror = (err) => {
      clearTimeout(timer);
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore revocation error
      }
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Downscales image in browser using canvas with EXIF orientation handling.
 * Longest side at most 1600px, JPEG quality 0.85.
 */
export async function preparePrescriptionImage(
  file: File | Blob,
): Promise<{ base64: string; mediaType: "image/jpeg" }> {
  // If no DOM canvas support (Node / jsdom fallback)
  if (typeof document === "undefined" || typeof document.createElement !== "function") {
    const base64 = await fileToBase64(file);
    return { base64, mediaType: "image/jpeg" };
  }

  let width = 0;
  let height = 0;
  let drawable: ImageBitmap | HTMLImageElement | null = null;

  // Prefer createImageBitmap with EXIF auto-orientation
  if (typeof createImageBitmap === "function") {
    try {
      drawable = await createImageBitmap(file, { imageOrientation: "from-image" });
      width = drawable.width;
      height = drawable.height;
    } catch {
      drawable = null;
    }
  }

  if (!drawable) {
    try {
      const img = await loadImageElement(file);
      width = img.naturalWidth || img.width;
      height = img.naturalHeight || img.height;
      drawable = img;
    } catch {
      // Fallback if image element decode fails
      const base64 = await fileToBase64(file);
      return { base64, mediaType: "image/jpeg" };
    }
  }

  const maxSide = 1600;
  let targetWidth = width || 800;
  let targetHeight = height || 600;

  if (width > maxSide || height > maxSide) {
    if (width > height) {
      targetWidth = maxSide;
      targetHeight = Math.round((height * maxSide) / width);
    } else {
      targetHeight = maxSide;
      targetWidth = Math.round((width * maxSide) / height);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    const base64 = await fileToBase64(file);
    return { base64, mediaType: "image/jpeg" };
  }

  ctx.drawImage(drawable, 0, 0, targetWidth, targetHeight);

  if ("close" in drawable && typeof (drawable as ImageBitmap).close === "function") {
    (drawable as ImageBitmap).close();
  }

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const commaIndex = dataUrl.indexOf(",");
  const base64 = commaIndex !== -1 ? dataUrl.slice(commaIndex + 1) : dataUrl;

  return { base64, mediaType: "image/jpeg" };
}

/**
 * Scans a prescription document or photo using the server-side Vision AI endpoint.
 *
 * @param file The image File or Blob selected or photographed by the user.
 * @returns Promise resolving to an array of extracted medicines.
 */
export async function scanPrescription(file: File | Blob): Promise<ScannedMedicine[]> {
  // Check offline state
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new ScanError("offline", "Scanning needs internet");
  }

  // Downscale and prepare base64
  const { base64, mediaType } = await preparePrescriptionImage(file);

  // Check 5-entry LRU memory cache
  const imageHash = computeImageHash(base64);
  const cached = memoryCache.find((entry) => entry.hash === imageHash);
  if (cached) {
    // Return deep copy from cache
    return JSON.parse(JSON.stringify(cached.medicines));
  }

  // AbortController with 35s timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetch("/api/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: base64,
        mediaType,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new ScanError("rate_limited");
      }
      if (response.status === 413) {
        throw new ScanError("too_large");
      }
      if (response.status === 503) {
        throw new ScanError("scan_unavailable");
      }
      if (response.status === 422) {
        throw new ScanError("unreadable");
      }
      if (response.status === 400) {
        throw new ScanError("bad_image");
      }
      if (response.status === 504) {
        throw new ScanError("timeout");
      }
      throw new ScanError("upstream_error");
    }

    const data = await response.json();

    if (data.error) {
      throw new ScanError(data.error as ScanErrorCode);
    }

    if (data.isPrescription === false) {
      throw new ScanError("not_prescription");
    }

    if (!Array.isArray(data.medicines) || data.medicines.length === 0) {
      throw new ScanError("unreadable");
    }

    type RawMedicineInput = {
      name?: unknown;
      dose?: unknown;
      frequency?: unknown;
      timings?: unknown;
      food?: unknown;
      durationDays?: unknown;
      category?: unknown;
      needsCheck?: unknown;
      asNeeded?: unknown;
      note?: unknown;
    };

    const medicines: ScannedMedicine[] = (data.medicines as RawMedicineInput[]).map((m) => ({
      name: String(m.name || "").trim(),
      dose: m.dose ? String(m.dose).trim() : "",
      frequency:
        typeof m.frequency === "number"
          ? m.frequency
          : Array.isArray(m.timings)
            ? m.timings.length
            : 1,
      timings:
        Array.isArray(m.timings) && m.timings.length > 0
          ? (m.timings as ("morning" | "afternoon" | "evening" | "night")[])
          : ["morning"],
      food:
        typeof m.food === "string" && ["before", "after", "with", "any"].includes(m.food)
          ? (m.food as "before" | "after" | "with" | "any")
          : "any",
      durationDays: typeof m.durationDays === "number" ? m.durationDays : 0,
      category:
        typeof m.category === "string"
          ? (m.category as ScannedMedicine["category"])
          : inferCategory(String(m.name || "")),
      needsCheck: Boolean(m.needsCheck),
      asNeeded: Boolean(m.asNeeded),
      note: typeof m.note === "string" ? m.note : null,
    }));

    // Cache in memory (max 5 items)
    memoryCache.unshift({ hash: imageHash, medicines });
    if (memoryCache.length > 5) {
      memoryCache.pop();
    }

    return medicines;
  } catch (err: unknown) {
    if (err instanceof ScanError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new ScanError("timeout");
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      throw new ScanError("offline");
    }
    throw new ScanError("upstream_error");
  } finally {
    clearTimeout(timeoutId);
  }
}
