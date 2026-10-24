// Sample healthcare facilities directory for Telangana, Andhra Pradesh, and nearby states.
// NOTE: This is sample data for demonstration. Replace with real National Health Portal API later.
import { storage } from "./storage";

export type FacilityType = "hospital" | "phc" | "chc";

export type Place = {
  id: string;
  name: string;
  type: FacilityType;
  town: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  phone: string;
  hasGynaecology: boolean;
};

export const PLACES: Place[] = [
  // Telangana - Hyderabad & Ranga Reddy
  {
    id: "ts_1",
    name: "Gandhi Hospital",
    type: "hospital",
    town: "Secunderabad",
    district: "Hyderabad",
    state: "Telangana",
    lat: 17.4239,
    lng: 78.5026,
    phone: "04027505566",
    hasGynaecology: true,
  },
  {
    id: "ts_2",
    name: "Govt Maternity Hospital Koti",
    type: "hospital",
    town: "Hyderabad",
    district: "Hyderabad",
    state: "Telangana",
    lat: 17.3833,
    lng: 78.4867,
    phone: "04024652155",
    hasGynaecology: true,
  },
  {
    id: "ts_3",
    name: "Osmania General Hospital",
    type: "hospital",
    town: "Hyderabad",
    district: "Hyderabad",
    state: "Telangana",
    lat: 17.3753,
    lng: 78.4744,
    phone: "04024600121",
    hasGynaecology: true,
  },
  {
    id: "ts_4",
    name: "PHC Shamshabad",
    type: "phc",
    town: "Shamshabad",
    district: "Ranga Reddy",
    state: "Telangana",
    lat: 17.2543,
    lng: 78.4054,
    phone: "08413220012",
    hasGynaecology: false,
  },
  {
    id: "ts_5",
    name: "CHC Shadnagar",
    type: "chc",
    town: "Shadnagar",
    district: "Ranga Reddy",
    state: "Telangana",
    lat: 17.0722,
    lng: 78.2089,
    phone: "08548252244",
    hasGynaecology: true,
  },
  {
    id: "ts_6",
    name: "PHC Rajendranagar",
    type: "phc",
    town: "Rajendranagar",
    district: "Ranga Reddy",
    state: "Telangana",
    lat: 17.3173,
    lng: 78.4078,
    phone: "04024015022",
    hasGynaecology: false,
  },

  // Telangana - Warangal & Karimnagar
  {
    id: "ts_7",
    name: "MGM Hospital Warangal",
    type: "hospital",
    town: "Warangal",
    district: "Warangal",
    state: "Telangana",
    lat: 17.9784,
    lng: 79.5941,
    phone: "08702441011",
    hasGynaecology: true,
  },
  {
    id: "ts_8",
    name: "Govt Maternity Hospital Hanamkonda",
    type: "hospital",
    town: "Hanamkonda",
    district: "Warangal",
    state: "Telangana",
    lat: 18.0125,
    lng: 79.5636,
    phone: "08702578844",
    hasGynaecology: true,
  },
  {
    id: "ts_9",
    name: "PHC Dharmasagar",
    type: "phc",
    town: "Dharmasagar",
    district: "Warangal",
    state: "Telangana",
    lat: 17.9942,
    lng: 79.4321,
    phone: "08711284100",
    hasGynaecology: false,
  },
  {
    id: "ts_10",
    name: "District Hospital Karimnagar",
    type: "hospital",
    town: "Karimnagar",
    district: "Karimnagar",
    state: "Telangana",
    lat: 18.4386,
    lng: 79.1288,
    phone: "08782243003",
    hasGynaecology: true,
  },
  {
    id: "ts_11",
    name: "CHC Huzurabad",
    type: "chc",
    town: "Huzurabad",
    district: "Karimnagar",
    state: "Telangana",
    lat: 18.1912,
    lng: 79.3905,
    phone: "08727255022",
    hasGynaecology: true,
  },

  // Telangana - Nizamabad, Khammam & Mahbubnagar
  {
    id: "ts_12",
    name: "Govt General Hospital Nizamabad",
    type: "hospital",
    town: "Nizamabad",
    district: "Nizamabad",
    state: "Telangana",
    lat: 18.6725,
    lng: 78.0941,
    phone: "08462232014",
    hasGynaecology: true,
  },
  {
    id: "ts_13",
    name: "PHC Armoor",
    type: "phc",
    town: "Armoor",
    district: "Nizamabad",
    state: "Telangana",
    lat: 18.7914,
    lng: 78.2917,
    phone: "08463222100",
    hasGynaecology: false,
  },
  {
    id: "ts_14",
    name: "District Hospital Khammam",
    type: "hospital",
    town: "Khammam",
    district: "Khammam",
    state: "Telangana",
    lat: 17.2473,
    lng: 80.1514,
    phone: "08742223055",
    hasGynaecology: true,
  },
  {
    id: "ts_15",
    name: "CHC Madhira",
    type: "chc",
    town: "Madhira",
    district: "Khammam",
    state: "Telangana",
    lat: 16.9205,
    lng: 80.3644,
    phone: "08749274220",
    hasGynaecology: false,
  },
  {
    id: "ts_16",
    name: "Govt General Hospital Mahbubnagar",
    type: "hospital",
    town: "Mahbubnagar",
    district: "Mahbubnagar",
    state: "Telangana",
    lat: 16.7488,
    lng: 77.9856,
    phone: "08542242011",
    hasGynaecology: true,
  },
  {
    id: "ts_17",
    name: "PHC Jadcherla",
    type: "phc",
    town: "Jadcherla",
    district: "Mahbubnagar",
    state: "Telangana",
    lat: 16.7712,
    lng: 78.1405,
    phone: "08542256033",
    hasGynaecology: false,
  },

  // Telangana - Siddipet, Nalgonda & Adilabad
  {
    id: "ts_18",
    name: "District Hospital Siddipet",
    type: "hospital",
    town: "Siddipet",
    district: "Siddipet",
    state: "Telangana",
    lat: 18.1018,
    lng: 78.852,
    phone: "08457222044",
    hasGynaecology: true,
  },
  {
    id: "ts_19",
    name: "CHC Gajwel",
    type: "chc",
    town: "Gajwel",
    district: "Siddipet",
    state: "Telangana",
    lat: 17.8521,
    lng: 78.6811,
    phone: "08454234055",
    hasGynaecology: true,
  },
  {
    id: "ts_20",
    name: "Govt General Hospital Nalgonda",
    type: "hospital",
    town: "Nalgonda",
    district: "Nalgonda",
    state: "Telangana",
    lat: 17.0577,
    lng: 79.2684,
    phone: "08682224018",
    hasGynaecology: true,
  },
  {
    id: "ts_21",
    name: "RIMS Adilabad",
    type: "hospital",
    town: "Adilabad",
    district: "Adilabad",
    state: "Telangana",
    lat: 19.6641,
    lng: 78.532,
    phone: "08732226022",
    hasGynaecology: true,
  },

  // Andhra Pradesh - Visakhapatnam & Vijayawada
  {
    id: "ap_1",
    name: "King George Hospital",
    type: "hospital",
    town: "Visakhapatnam",
    district: "Visakhapatnam",
    state: "Andhra Pradesh",
    lat: 17.7042,
    lng: 83.3032,
    phone: "08912564891",
    hasGynaecology: true,
  },
  {
    id: "ap_2",
    name: "Govt Victoria Hospital for Women",
    type: "hospital",
    town: "Visakhapatnam",
    district: "Visakhapatnam",
    state: "Andhra Pradesh",
    lat: 17.6989,
    lng: 83.2985,
    phone: "08912563344",
    hasGynaecology: true,
  },
  {
    id: "ap_3",
    name: "Govt General Hospital Vijayawada",
    type: "hospital",
    town: "Vijayawada",
    district: "NTR / Krishna",
    state: "Andhra Pradesh",
    lat: 16.5165,
    lng: 80.6415,
    phone: "08662577741",
    hasGynaecology: true,
  },
  {
    id: "ap_4",
    name: "PHC Kankipadu",
    type: "phc",
    town: "Kankipadu",
    district: "Krishna",
    state: "Andhra Pradesh",
    lat: 16.4255,
    lng: 80.7712,
    phone: "08662822100",
    hasGynaecology: false,
  },

  // Andhra Pradesh - Guntur, Tirupati & Kurnool
  {
    id: "ap_5",
    name: "Govt General Hospital Guntur",
    type: "hospital",
    town: "Guntur",
    district: "Guntur",
    state: "Andhra Pradesh",
    lat: 16.3067,
    lng: 80.4365,
    phone: "08632234055",
    hasGynaecology: true,
  },
  {
    id: "ap_6",
    name: "CHC Mangalagiri",
    type: "chc",
    town: "Mangalagiri",
    district: "Guntur",
    state: "Andhra Pradesh",
    lat: 16.4328,
    lng: 80.5592,
    phone: "08645232014",
    hasGynaecology: true,
  },
  {
    id: "ap_7",
    name: "SVRR Govt General Hospital",
    type: "hospital",
    town: "Tirupati",
    district: "Tirupati",
    state: "Andhra Pradesh",
    lat: 13.6335,
    lng: 79.4082,
    phone: "08772287777",
    hasGynaecology: true,
  },
  {
    id: "ap_8",
    name: "Govt Maternity Hospital Tirupati",
    type: "hospital",
    town: "Tirupati",
    district: "Tirupati",
    state: "Andhra Pradesh",
    lat: 13.6288,
    lng: 79.4144,
    phone: "08772286622",
    hasGynaecology: true,
  },
  {
    id: "ap_9",
    name: "Govt General Hospital Kurnool",
    type: "hospital",
    town: "Kurnool",
    district: "Kurnool",
    state: "Andhra Pradesh",
    lat: 15.8281,
    lng: 78.0373,
    phone: "08518255400",
    hasGynaecology: true,
  },
  {
    id: "ap_10",
    name: "CHC Nandyal",
    type: "chc",
    town: "Nandyal",
    district: "Nandyal",
    state: "Andhra Pradesh",
    lat: 15.4872,
    lng: 78.4839,
    phone: "08514242100",
    hasGynaecology: true,
  },

  // Other States
  {
    id: "del_1",
    name: "Safdarjung Hospital",
    type: "hospital",
    town: "New Delhi",
    district: "New Delhi",
    state: "Delhi",
    lat: 28.5685,
    lng: 77.2066,
    phone: "01126707444",
    hasGynaecology: true,
  },
  {
    id: "hr_1",
    name: "CHC Sohna",
    type: "chc",
    town: "Sohna",
    district: "Gurugram",
    state: "Haryana",
    lat: 28.2472,
    lng: 77.0657,
    phone: "01242362016",
    hasGynaecology: true,
  },
  {
    id: "up_1",
    name: "District Hospital Varanasi",
    type: "hospital",
    town: "Varanasi",
    district: "Varanasi",
    state: "Uttar Pradesh",
    lat: 25.3176,
    lng: 82.9739,
    phone: "05422501080",
    hasGynaecology: true,
  },
  {
    id: "ka_1",
    name: "Bowring & Lady Curzon Hospital",
    type: "hospital",
    town: "Bengaluru",
    district: "Bengaluru Urban",
    state: "Karnataka",
    lat: 12.9822,
    lng: 77.6033,
    phone: "08025591325",
    hasGynaecology: true,
  },
];

/**
 * Great-circle distance between two coordinates in kilometers using Haversine formula.
 */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371; // Earth radius in km
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLng = (b.lng - a.lng) * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type FacilityFilter = {
  onlyHospitals?: boolean;
  onlyGynaecology?: boolean;
  type?: FacilityType | "all";
};

/**
 * Returns facilities sorted by distance from the specified coordinate.
 */
export function nearest(
  from: { lat: number; lng: number } | null,
  onlyHospitalsOrFilter?: boolean | FacilityFilter,
  onlyGynaecology = false,
): (Place & { km: number | null })[] {
  let onlyHospitals = false;
  let onlyGyn = onlyGynaecology;
  let selectedType: FacilityType | "all" = "all";

  if (typeof onlyHospitalsOrFilter === "boolean") {
    onlyHospitals = onlyHospitalsOrFilter;
  } else if (onlyHospitalsOrFilter) {
    onlyHospitals = !!onlyHospitalsOrFilter.onlyHospitals;
    onlyGyn = !!onlyHospitalsOrFilter.onlyGynaecology;
    selectedType = onlyHospitalsOrFilter.type ?? "all";
  }

  const list = PLACES.filter((p) => {
    if (onlyHospitals && p.type !== "hospital") return false;
    if (selectedType !== "all" && p.type !== selectedType) return false;
    if (onlyGyn && !p.hasGynaecology) return false;
    return true;
  });

  if (!from) {
    return list.map((p) => ({ ...p, km: null }));
  }

  return list
    .map((p) => ({ ...p, km: Number(distanceKm(from, p).toFixed(1)) }))
    .sort((a, b) => a.km - b.km);
}

/**
 * Returns a list of unique towns/cities available in the directory for manual selection.
 */
export function getUniqueTowns(): {
  town: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
}[] {
  const map = new Map<
    string,
    { town: string; district: string; state: string; lat: number; lng: number }
  >();
  for (const p of PLACES) {
    if (!map.has(p.town)) {
      map.set(p.town, {
        town: p.town,
        district: p.district,
        state: p.state,
        lat: p.lat,
        lng: p.lng,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.town.localeCompare(b.town));
}

/**
 * Safe local storage manager for user location preference.
 * Only remembers location if user explicitly toggled "remember my location".
 */
export const locationPrefs = {
  getSaved(): { lat: number; lng: number; label?: string } | null {
    if (!this.isRememberEnabled()) return null;
    return storage.get<{ lat: number; lng: number; label?: string } | null>("saved_location", null);
  },

  setSaved(loc: { lat: number; lng: number; label?: string } | null) {
    if (this.isRememberEnabled() && loc) {
      storage.set("saved_location", loc);
    }
  },

  isRememberEnabled(): boolean {
    return storage.get<boolean>("remember_location", false);
  },

  setRememberEnabled(enabled: boolean) {
    storage.set("remember_location", enabled);
    if (!enabled) {
      storage.remove("saved_location");
    }
  },
};
