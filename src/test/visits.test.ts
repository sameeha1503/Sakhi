import { describe, it, expect, beforeEach } from "vitest";
import { visitService } from "@/services/visits";
import { storage } from "@/services/storage";

describe("Visits service", () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it("adds, retrieves and deletes visits", () => {
    const v = visitService.add({
      date: "2026-03-20",
      doctorOrClinic: "Dr. Lakshmi, PHC Chevella",
      reason: "Irregular cycle checkup",
      notes: "Advised pelvic scan and CBC test",
      linkedMedicines: ["Iron Tablet", "Folic Acid"],
      nextFollowUpDate: "2026-03-28",
    });

    expect(v.id).toBeDefined();
    expect(visitService.all().length).toBe(1);
    expect(visitService.get(v.id)?.doctorOrClinic).toBe("Dr. Lakshmi, PHC Chevella");

    visitService.delete(v.id);
    expect(visitService.all().length).toBe(0);
  });

  it("calculates upcoming follow-ups within 3 days correctly", () => {
    visitService.add({
      date: "2026-03-20",
      doctorOrClinic: "CHC Shamshabad",
      reason: "Follow-up",
      notes: "",
      linkedMedicines: [],
      nextFollowUpDate: "2026-03-26", // 2 days away from 2026-03-24
    });

    visitService.add({
      date: "2026-03-10",
      doctorOrClinic: "District Hospital",
      reason: "Annual check",
      notes: "",
      linkedMedicines: [],
      nextFollowUpDate: "2026-04-10", // 17 days away
    });

    const upcoming = visitService.getUpcomingFollowUps("2026-03-24", 3);
    expect(upcoming.length).toBe(1);
    expect(upcoming[0]?.visit.doctorOrClinic).toBe("CHC Shamshabad");
    expect(upcoming[0]?.daysRemaining).toBe(2);
  });
});
