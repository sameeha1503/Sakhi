import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { storage } from "../services/storage";

describe("storage error handling", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("handles normal set and get operations", () => {
    const success = storage.set("test_key", { a: 1 });
    expect(success).toBe(true);
    expect(storage.get("test_key", null)).toEqual({ a: 1 });
  });

  it("returns fallback when getItem fails or throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Access denied");
    });
    const result = storage.get("any_key", "fallback_val");
    expect(result).toBe("fallback_val");
  });

  it("notifies listeners with friendly quota message when QuotaExceededError is thrown", () => {
    const quotaError = new DOMException("Quota exceeded", "QuotaExceededError");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw quotaError;
    });

    let receivedMsg = "";
    const unbind = storage.onError((msg) => {
      receivedMsg = msg;
    });

    const success = storage.set("full_key", "data");
    expect(success).toBe(false);
    expect(receivedMsg).toContain("Device storage is full");

    unbind();
  });

  it("notifies listeners with friendly blocked message when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage blocked");
    });

    let receivedMsg = "";
    const unbind = storage.onError((msg) => {
      receivedMsg = msg;
    });

    const success = storage.set("blocked_key", "data");
    expect(success).toBe(false);
    expect(receivedMsg).toContain("Local storage might be blocked");

    unbind();
  });
});
