import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  distanceKm,
  normalizePhone,
  classifyFacilityType,
  isGovernmentFacility,
  hasWomenHealthService,
  formatAddress,
  parseOverpassElements,
  findNearby,
  searchLocationNominatim,
  getNearestEmergencyHospital,
  locationPrefs,
  nearest,
  clearPlacesCache,
  type Place,
} from "@/services/places";
import { storage } from "@/services/storage";
import { SAMPLE_FACILITIES } from "@/data/sampleFacilities";

describe("Live Places & Overpass Services", () => {
  beforeEach(async () => {
    await storage.clearAll();
    clearPlacesCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Haversine Distance Calculation", () => {
    it("calculates great-circle distance accurately", () => {
      // Hyderabad (17.385, 78.486) to Secunderabad (17.441, 78.498) ~6.3 km
      const d = distanceKm({ lat: 17.385, lng: 78.486 }, { lat: 17.441, lng: 78.498 });
      expect(d).toBeGreaterThan(5.8);
      expect(d).toBeLessThan(7.0);

      // Distance to identical point is 0
      expect(distanceKm({ lat: 17.385, lng: 78.486 }, { lat: 17.385, lng: 78.486 })).toBe(0);
    });
  });

  describe("Phone Number Normalization", () => {
    it("normalizes phone numbers and handles multiple numbers", () => {
      expect(normalizePhone("040-24652155")).toBe("04024652155");
      expect(normalizePhone("+91 98480 12345 / 040-27505566")).toBe("+919848012345");
      expect(normalizePhone("(0870) 244-1234")).toBe("08702441234");
      expect(normalizePhone("08542 223 321; 08542 223 322")).toBe("08542223321");
    });

    it("returns null for invalid, empty, or too-short numbers", () => {
      expect(normalizePhone(null)).toBeNull();
      expect(normalizePhone(undefined)).toBeNull();
      expect(normalizePhone("")).toBeNull();
      expect(normalizePhone("123")).toBeNull(); // Less than 6 digits
      expect(normalizePhone("N/A")).toBeNull();
    });
  });

  describe("Facility Type Classification", () => {
    it("identifies hospitals from amenity or healthcare tags", () => {
      expect(classifyFacilityType({ amenity: "hospital" })).toBe("hospital");
      expect(classifyFacilityType({ healthcare: "hospital" })).toBe("hospital");
      expect(classifyFacilityType({ amenity: "hospital", name: "District Hospital" })).toBe(
        "hospital",
      );
    });

    it("identifies Primary Health Centres and Arogya Mandirs", () => {
      expect(classifyFacilityType({ name: "PHC Shamshabad", amenity: "clinic" })).toBe("phc");
      expect(classifyFacilityType({ name: "Primary Health Centre Alwal" })).toBe("phc");
      expect(classifyFacilityType({ name: "Ayushman Arogya Mandir Medchal" })).toBe("phc");
      expect(classifyFacilityType({ name: "Sub-Centre Kondapur" })).toBe("phc");
      expect(classifyFacilityType({ healthcare: "primary_health_centre" })).toBe("phc");
    });

    it("identifies Community Health Centres (CHCs)", () => {
      expect(classifyFacilityType({ name: "CHC Shadnagar" })).toBe("chc");
      expect(classifyFacilityType({ name: "Community Health Centre Parkal" })).toBe("chc");
      expect(classifyFacilityType({ healthcare: "community_health_centre" })).toBe("chc");
    });

    it("falls back to clinic for general clinics and dispensaries", () => {
      expect(classifyFacilityType({ amenity: "clinic", name: "Apollo Clinic" })).toBe("clinic");
      expect(classifyFacilityType({ healthcare: "doctor", name: "Family Health Care" })).toBe(
        "clinic",
      );
      expect(classifyFacilityType({})).toBe("clinic");
    });
  });

  describe("Government Facility Detection", () => {
    it("flags government operator types and keywords", () => {
      expect(isGovernmentFacility({ "operator:type": "government" })).toBe(true);
      expect(isGovernmentFacility({ operator: "Ministry of Health" })).toBe(true);
      expect(isGovernmentFacility({ operator: "Telangana Govt" })).toBe(true);
      expect(isGovernmentFacility({ name: "Government General Hospital Guntur" })).toBe(true);
      expect(isGovernmentFacility({ name: "Civil Hospital Nanded" })).toBe(true);
      expect(isGovernmentFacility({ name: "District Headquarters Hospital Karimnagar" })).toBe(
        true,
      );
      expect(isGovernmentFacility({ name: "Area Hospital Bodhan" })).toBe(true);
    });

    it("returns false for private operators", () => {
      expect(isGovernmentFacility({ operator: "Private", name: "Care Hospital" })).toBe(false);
      expect(isGovernmentFacility({ name: "Apollo Health Clinic" })).toBe(false);
    });
  });

  describe("Women's Health Speciality Detection", () => {
    it("detects gynaecology, obstetrics, and maternity tags strictly", () => {
      expect(hasWomenHealthService({ "healthcare:speciality": "gynaecology;obstetrics" })).toBe(
        true,
      );
      expect(hasWomenHealthService({ name: "Govt Maternity Hospital Koti" })).toBe(true);
      expect(hasWomenHealthService({ description: "Obstetrics and Women Clinic" })).toBe(true);
      expect(hasWomenHealthService({ name: "Stree Rog Chikitsa Kendra" })).toBe(true);
      expect(hasWomenHealthService({ name: "Mahila Hospital" })).toBe(true);
    });

    it("returns false when women health is not specified", () => {
      expect(hasWomenHealthService({ name: "Gandhi Hospital", amenity: "hospital" })).toBe(false);
      expect(hasWomenHealthService({ "healthcare:speciality": "pediatrics;orthopedics" })).toBe(
        false,
      );
    });
  });

  describe("Address Formatting", () => {
    it("assembles address from addr:* tags", () => {
      const tags = {
        "addr:street": "Station Road",
        "addr:village": "Shamshabad",
        "addr:district": "Ranga Reddy",
        "addr:postcode": "501218",
      };
      expect(formatAddress(tags)).toBe("Station Road, Shamshabad, Ranga Reddy, 501218");
    });

    it("falls back to operator if addr tags are absent", () => {
      expect(formatAddress({ operator: "District Health Society" })).toBe(
        "District Health Society",
      );
      expect(formatAddress({})).toBeNull();
    });
  });

  describe("Overpass Element Parsing and Radius Expansion", () => {
    const mockFixtureElements = [
      {
        type: "node" as const,
        id: 101,
        lat: 17.4239,
        lon: 78.5026,
        tags: {
          amenity: "hospital",
          name: "Gandhi Hospital",
          phone: "040 2750 5566",
          "operator:type": "government",
          emergency: "yes",
        },
      },
      {
        type: "way" as const,
        id: 202,
        center: { lat: 17.3833, lon: 78.4867 },
        tags: {
          amenity: "hospital",
          name: "Govt Maternity Hospital",
          "healthcare:speciality": "gynaecology;obstetrics",
          phone: "+91-40-24652155",
        },
      },
      {
        type: "node" as const,
        id: 303,
        lat: 17.2543,
        lon: 78.4054,
        tags: {
          amenity: "clinic",
          name: "PHC Shamshabad",
          "addr:village": "Shamshabad",
        },
      },
      {
        // Unnamed health center
        type: "node" as const,
        id: 404,
        lat: 17.3173,
        lon: 78.4078,
        tags: {
          amenity: "clinic",
        },
      },
    ];

    it("parses elements, handles centers for ways, and sorts by distance", () => {
      const user = { lat: 17.43, lng: 78.5 };
      const places = parseOverpassElements(mockFixtureElements, user);

      expect(places.length).toBe(4);
      // Gandhi Hospital should be nearest to (17.4, 78.5)
      expect(places[0]?.name).toBe("Gandhi Hospital");
      expect(places[0]?.type).toBe("hospital");
      expect(places[0]?.emergency).toBe(true);
      expect(places[0]?.phone).toBe("04027505566");

      // Maternity Hospital parsed from way center
      const maternity = places.find((p) => p.name === "Govt Maternity Hospital");
      expect(maternity).toBeDefined();
      expect(maternity?.hasWomenHealth).toBe(true);
      expect(maternity?.lat).toBe(17.3833);

      // Unnamed facility handled gracefully
      const unnamed = places.find((p) => p.id === "node/404");
      expect(unnamed?.name).toBe("Health facility");
    });
  });

  describe("Live Fetching, Mirror Fallback & Sample Fallback", () => {
    it("successfully queries Overpass and caches results", async () => {
      const mockResponse = {
        elements: [
          {
            type: "node",
            id: 1,
            lat: 17.42,
            lon: 78.5,
            tags: { name: "Test Hospital 1", amenity: "hospital" },
          },
          {
            type: "node",
            id: 2,
            lat: 17.43,
            lon: 78.51,
            tags: { name: "Test Hospital 2", amenity: "hospital" },
          },
        ],
      };

      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("overpass-api.de")) {
          return {
            ok: true,
            json: async () => mockResponse,
          } as Response;
        }
        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const res = await findNearby(17.42, 78.5, 10);
      expect(res.places.length).toBe(2);
      expect(res.isFallbackSample).toBe(false);
      expect(res.places[0]?.name).toBe("Test Hospital 1");
    });

    it("falls back to mirror when primary endpoint fails", async () => {
      const mockResponse = {
        elements: [
          {
            type: "node",
            id: 11,
            lat: 17.42,
            lon: 78.5,
            tags: { name: "Mirror Hospital", amenity: "hospital" },
          },
        ],
      };

      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes("overpass-api.de")) {
          throw new Error("Primary Overpass Timeout");
        }
        if (urlStr.includes("kumi.systems")) {
          return {
            ok: true,
            json: async () => mockResponse,
          } as Response;
        }
        return {
          ok: false,
          status: 404,
        } as Response;
      });

      const res = await findNearby(17.42, 78.5, 10);
      expect(res.places.length).toBe(1);
      expect(res.places[0]?.name).toBe("Mirror Hospital");
      expect(res.isFallbackSample).toBe(false);
    });

    it("falls back to sample facilities when all Overpass mirrors fail", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network completely offline"));

      const res = await findNearby(17.4239, 78.5026, 25);
      expect(res.isFallbackSample).toBe(true);
      expect(res.places.length).toBeGreaterThanOrEqual(10);
      expect(res.places[0]?.name).toBe("Gandhi Hospital");
    });
  });

  describe("Nominatim Geocoding Search", () => {
    it("searches places via Nominatim and maps results", async () => {
      const mockNominatim = [
        {
          lat: "17.2543",
          lon: "78.4054",
          display_name: "Shamshabad, Ranga Reddy, Telangana, 501218, India",
          name: "Shamshabad",
        },
      ];

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockNominatim,
      } as Response);

      const results = await searchLocationNominatim("Shamshabad");
      expect(results.length).toBe(1);
      expect(results[0]?.name).toBe("Shamshabad");
      expect(results[0]?.lat).toBeCloseTo(17.2543);
    });

    it("returns empty array on blank query without calling fetch", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const results = await searchLocationNominatim("   ");
      expect(results).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("Emergency Hospital for Urgent Care", () => {
    it("finds the nearest emergency facility or falls back safely", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Offline"));

      const emergency = await getNearestEmergencyHospital({ lat: 17.4239, lng: 78.5026 });
      expect(emergency.place).toBeDefined();
      expect(emergency.place.type).toBe("hospital");
      expect(emergency.isFallbackSample).toBe(true);
    });
  });

  describe("Location Preferences and Privacy", () => {
    it("respects remember switch and does not save location unless opted in", () => {
      const sampleLoc = { lat: 17.385, lng: 78.486, label: "Hyderabad" };

      expect(locationPrefs.isRememberEnabled()).toBe(false);
      expect(locationPrefs.getSaved()).toBeNull();

      locationPrefs.setSaved(sampleLoc);
      expect(locationPrefs.getSaved()).toBeNull(); // Still null

      locationPrefs.setRememberEnabled(true);
      expect(locationPrefs.isRememberEnabled()).toBe(true);

      locationPrefs.setSaved(sampleLoc);
      expect(locationPrefs.getSaved()).toEqual(sampleLoc);

      locationPrefs.setRememberEnabled(false);
      expect(locationPrefs.getSaved()).toBeNull();
    });
  });

  describe("Backwards Compatibility: nearest helper", () => {
    it("filters and sorts sample facilities correctly", () => {
      const user = { lat: 17.25, lng: 78.4 };
      const sorted = nearest(user);

      expect(sorted.length).toBe(SAMPLE_FACILITIES.length);
      expect(sorted[0]?.name).toBe("PHC Shamshabad");

      const gynOnly = nearest(user, { onlyGynaecology: true });
      expect(gynOnly.every((f) => f.hasWomenHealth || f.hasGynaecology)).toBe(true);
    });
  });
});
