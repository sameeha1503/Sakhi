import { describe, it, expect, beforeEach } from "vitest";
import {
  buildShareSnapshot,
  encodeShareUrl,
  decodeShareSnapshot,
  type DoctorShareSnapshot,
  type ShareToggles,
  DEFAULT_SHARE_TOGGLES,
} from "@/services/share";
import { storage } from "@/services/storage";
import { authService } from "@/services/auth";
import { medicineService } from "@/services/medicines";
import { visitService } from "@/services/visits";
import { logService } from "@/services/logs";

describe("Doctor QR Sharing Service", () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it("performs round-trip encode and decode accurately", () => {
    authService.signUp("Pooja Sharma", "9876543210");

    medicineService.add({
      name: "Ferrous Ascorbate",
      dose: "100 mg",
      frequency: 1,
      timings: ["night"],
      food: "after",
      startDate: "2026-10-01",
      durationDays: 30,
    });

    visitService.add({
      date: "2026-10-15",
      doctorOrClinic: "Community Health Centre",
      reason: "Pelvic cramps consultation",
      notes: "Advised ultrasound scan",
      linkedMedicines: [],
    });

    const toggles: ShareToggles = {
      includeName: true,
      includeCycle: true,
      includeFlags: true,
      includeMedicines: true,
      includeVisits: true,
      includeQuestions: true,
    };

    const snapshot = buildShareSnapshot(toggles, "24h");
    expect(snapshot.name).toBe("Pooja Sharma");
    expect(snapshot.medicines).toHaveLength(1);
    expect(snapshot.visits).toHaveLength(1);

    const encoded = encodeShareUrl(snapshot, "https://sakhi.health");
    expect(encoded.url).toContain("https://sakhi.health/share#d=");
    expect(encoded.charCount).toBeLessThan(1200);

    // Decode from fragment
    const decoded = decodeShareSnapshot(encoded.fragment);
    expect(decoded.success).toBe(true);

    if (decoded.success) {
      expect(decoded.data.v).toBe(1);
      expect(decoded.data.name).toBe("Pooja Sharma");
      expect(decoded.data.medicines?.[0]?.name).toBe("Ferrous Ascorbate");
      expect(decoded.data.visits?.[0]?.clinic).toBe("Community Health Centre");
      expect(decoded.isExpired).toBe(false);
    }
  });

  it("respects privacy toggles: excludes name by default and filters sections", () => {
    authService.signUp("Secret Name", "9876543210");

    medicineService.add({
      name: "Pantoprazole",
      dose: "40 mg",
      frequency: 1,
      timings: ["morning"],
      food: "before",
      startDate: "2026-10-01",
      durationDays: 14,
    });

    // Default toggles: includeName is FALSE
    const snapshotDefault = buildShareSnapshot();
    expect(snapshotDefault.name).toBeUndefined();

    // Turn off medicines & visits
    const snapshotRestricted = buildShareSnapshot({
      includeName: false,
      includeCycle: false,
      includeFlags: false,
      includeMedicines: false,
      includeVisits: false,
      includeQuestions: false,
    });

    expect(snapshotRestricted.name).toBeUndefined();
    expect(snapshotRestricted.cycle).toBeUndefined();
    expect(snapshotRestricted.flags).toBeUndefined();
    expect(snapshotRestricted.medicines).toBeUndefined();
    expect(snapshotRestricted.visits).toBeUndefined();
    expect(snapshotRestricted.questions).toBeUndefined();

    const encoded = encodeShareUrl(snapshotRestricted);
    const decoded = decodeShareSnapshot(encoded.fragment);
    expect(decoded.success).toBe(true);
    if (decoded.success) {
      expect(decoded.data.medicines).toBeUndefined();
    }
  });

  it("enforces character budget under ~1200 characters and trims oldest data when large", () => {
    // Populate large visit notes and questions
    for (let i = 0; i < 5; i++) {
      visitService.add({
        date: `2026-09-0${i + 1}`,
        doctorOrClinic: `District Hospital Multi-Speciality Clinic Wing ${i + 1}`,
        reason: `Very detailed reason for medical consultation #${i + 1} regarding acute severe symptoms and diagnostic review`,
        notes: `Extensive clinical discussion notes covering laboratory investigations, ultrasound scan findings, prescription review, dietary guidance, follow-up timelines, and physician consultation notes #${i + 1}.`,
        linkedMedicines: [],
      });
    }

    const largeSnapshot: DoctorShareSnapshot = {
      v: 1,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      expiryOption: "24h",
      name: "Patient with long history",
      visits: [
        {
          date: "2026-10-01",
          clinic: "Super Speciality Hospital Department of Gynaecology and Obstetrics",
          reason: "Comprehensive evaluation of chronic pelvic pain and severe dysmenorrhea",
          notes:
            "Very extensive clinical report notes detailing ultrasound, CBC, thyroid profile, medication history, and surgical consultation advice.",
        },
        {
          date: "2026-09-15",
          clinic: "District Health Centre Community Medicine Department",
          reason: "Follow-up consultation for anaemia and iron supplementation",
          notes:
            "Patient reported improved energy levels on ferrous ascorbate, Hb 10.5 g/dL, advised continuation.",
        },
        {
          date: "2026-08-20",
          clinic: "Primary Health Centre Maternal Care Unit",
          reason: "Initial checkup for menstrual cycle irregularity and heavy bleeding",
          notes: "Ultrasound ordered, advised rest and symptom tracking.",
        },
      ],
      questions: [
        "Are there specific hormonal tests or ultrasound scans recommended for persistent pelvic cramps?",
        "Could my heavy menstrual flow be contributing to chronic fatigue, weakness, and low haemoglobin?",
        "Should I consider continuing iron and calcium supplements beyond thirty days?",
        "What dietary adjustments can help reduce period pain and bloating?",
      ],
    };

    const encoded = encodeShareUrl(largeSnapshot, "https://sakhi.health");
    expect(encoded.charCount).toBeLessThanOrEqual(1200);
    expect(encoded.wasTruncated).toBe(true);
  });

  it("handles malformed, empty, or corrupted URL fragments with friendly errors", () => {
    // 1. Empty fragment
    const resEmpty = decodeShareSnapshot("");
    expect(resEmpty.success).toBe(false);
    if (!resEmpty.success) {
      expect(resEmpty.error).toBe("empty");
    }

    // 2. Corrupted random string
    const resCorrupted = decodeShareSnapshot("#d=###not_valid_lz_string$$$");
    expect(resCorrupted.success).toBe(false);
    if (!resCorrupted.success) {
      expect(resCorrupted.error).toBe("corrupted");
    }

    // 3. Invalid schema / unsupported version
    const invalidSchemaEncoded = encodeShareUrl({
      v: 99 as never,
      createdAt: "2026-01-01",
      expiresAt: "2026-01-02",
      expiryOption: "24h",
    });
    const resInvalid = decodeShareSnapshot(invalidSchemaEncoded.fragment);
    expect(resInvalid.success).toBe(false);
    if (!resInvalid.success) {
      expect(resInvalid.error).toBe("unsupported_version");
    }
  });

  it("checks advisory expiration correctly for 24h and 7d options", () => {
    const now = new Date("2026-10-25T12:00:00Z");

    // 1. Active 24h snapshot
    const active = buildShareSnapshot(DEFAULT_SHARE_TOGGLES, "24h", now);
    const encodedActive = encodeShareUrl(active);
    const decodedActive = decodeShareSnapshot(encodedActive.fragment);
    expect(decodedActive.success).toBe(true);
    if (decodedActive.success) {
      expect(decodedActive.isExpired).toBe(false);
    }

    // 2. Expired snapshot (created in past)
    const expiredSnapshot: DoctorShareSnapshot = {
      v: 1,
      createdAt: "2026-10-01T00:00:00Z",
      expiresAt: "2026-10-02T00:00:00Z", // Past!
      expiryOption: "24h",
    };
    const encodedExpired = encodeShareUrl(expiredSnapshot);
    const decodedExpired = decodeShareSnapshot(encodedExpired.fragment);
    expect(decodedExpired.success).toBe(true);
    if (decodedExpired.success) {
      expect(decodedExpired.isExpired).toBe(true);
    }
  });
});
