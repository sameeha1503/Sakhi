import { describe, it, expect, beforeEach } from "vitest";
import { distanceKm, nearest, getUniqueTowns, locationPrefs, PLACES } from "@/services/places";
import { storage } from "@/services/storage";

describe("Places & Hospital Locator (Phase 4)", () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it("calculates great-circle distance accurately via Haversine formula", () => {
    // Gandhi Hospital Secunderabad (17.4239, 78.5026) to Osmania General Hospital (17.3753, 78.4744)
    // Real distance is ~6.2 km
    const d = distanceKm({ lat: 17.4239, lng: 78.5026 }, { lat: 17.3753, lng: 78.4744 });

    expect(d).toBeGreaterThan(5.5);
    expect(d).toBeLessThan(7.0);

    // Same point distance should be 0
    expect(distanceKm({ lat: 17.4239, lng: 78.5026 }, { lat: 17.4239, lng: 78.5026 })).toBe(0);
  });

  it("sorts facilities by distance from given coordinates", () => {
    // Coordinate near Shamshabad (17.25, 78.40)
    const user = { lat: 17.25, lng: 78.4 };
    const sorted = nearest(user);

    expect(sorted.length).toBe(PLACES.length);

    // PHC Shamshabad should be closest (< 2 km)
    expect(sorted[0]?.name).toBe("PHC Shamshabad");
    expect(sorted[0]?.km).toBeLessThan(3);

    // Distances should be monotonically non-decreasing
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.km!).toBeGreaterThanOrEqual(sorted[i - 1]!.km!);
    }
  });

  it("filters facilities by hospital type and gynaecology flag", () => {
    const user = { lat: 17.4239, lng: 78.5026 }; // Hyderabad / Secunderabad

    // Only hospitals
    const hospitals = nearest(user, { onlyHospitals: true });
    expect(hospitals.every((h) => h.type === "hospital")).toBe(true);
    expect(hospitals.length).toBeGreaterThan(0);

    // Only facilities with women's health doctors (gynaecology)
    const gynFacilities = nearest(user, { onlyGynaecology: true });
    expect(gynFacilities.every((f) => f.hasGynaecology)).toBe(true);

    // Only PHCs
    const phcs = nearest(user, { type: "phc" });
    expect(phcs.every((p) => p.type === "phc")).toBe(true);
    expect(phcs.length).toBeGreaterThan(0);
  });

  it("extracts unique sorted towns from directory for manual location fallback", () => {
    const towns = getUniqueTowns();
    expect(towns.length).toBeGreaterThan(15);

    // Check sorted alphabetically
    for (let i = 1; i < towns.length; i++) {
      expect(towns[i]!.town.localeCompare(towns[i - 1]!.town)).toBeGreaterThanOrEqual(0);
    }

    const hyderabad = towns.find((t) => t.town === "Hyderabad");
    expect(hyderabad).toBeDefined();
    expect(hyderabad?.district).toBe("Hyderabad");
  });

  it("respects location privacy preferences and remember opt-in", () => {
    const sampleLoc = { lat: 17.385, lng: 78.486, label: "Hyderabad" };

    // When remember is false (default), should not save
    expect(locationPrefs.isRememberEnabled()).toBe(false);
    expect(locationPrefs.getSaved()).toBeNull();

    locationPrefs.setSaved(sampleLoc);
    expect(locationPrefs.getSaved()).toBeNull(); // Still null because remember is false

    // Enable remember switch
    locationPrefs.setRememberEnabled(true);
    expect(locationPrefs.isRememberEnabled()).toBe(true);

    locationPrefs.setSaved(sampleLoc);
    expect(locationPrefs.getSaved()).toEqual(sampleLoc);

    // Disabling remember switch immediately wipes saved location
    locationPrefs.setRememberEnabled(false);
    expect(locationPrefs.getSaved()).toBeNull();
  });
});
