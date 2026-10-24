import { describe, it, expect, beforeEach } from "vitest";
import { hashPin, verifyPin, vaultService } from "@/services/vault";
import { storage } from "@/services/storage";

describe("Private Vault PIN hashing, verification & lockout", () => {
  beforeEach(async () => {
    await vaultService.resetVault();
    storage.clearAll();
  });

  it("hashes 4-digit PIN using PBKDF2 with salt and produces hex strings", async () => {
    const meta = await hashPin("1234");
    expect(meta.salt).toBeDefined();
    expect(meta.hash).toBeDefined();
    expect(meta.salt.length).toBe(32); // 16 bytes = 32 hex chars
    expect(meta.hash.length).toBe(64); // 32 bytes = 64 hex chars
  });

  it("rejects non-4-digit PINs", async () => {
    await expect(hashPin("123")).rejects.toThrow("PIN must be exactly 4 digits");
    await expect(hashPin("12345")).rejects.toThrow("PIN must be exactly 4 digits");
    await expect(hashPin("abcd")).rejects.toThrow("PIN must be exactly 4 digits");
  });

  it("deterministic hash with identical salt, unique hash with different salt", async () => {
    const meta1 = await hashPin("4321");
    const meta2 = await hashPin("4321", meta1.salt);
    expect(meta2.hash).toBe(meta1.hash);

    const meta3 = await hashPin("4321"); // New random salt
    expect(meta3.hash).not.toBe(meta1.hash);
  });

  it("verifies correct PIN and rejects incorrect PIN", async () => {
    const meta = await hashPin("7890");
    const isCorrect = await verifyPin("7890", meta);
    const isWrong = await verifyPin("0000", meta);

    expect(isCorrect).toBe(true);
    expect(isWrong).toBe(false);
  });

  it("locks out after 5 consecutive failed attempts for at least 5 minutes", async () => {
    await vaultService.setupPin("1111");
    vaultService.lock();

    // 4 failed attempts should not lock out
    for (let i = 1; i <= 4; i++) {
      const res = await vaultService.unlock("9999");
      expect(res.success).toBe(false);
      expect(res.error).toBe("invalid_pin");
      expect(vaultService.checkLockout().isLocked).toBe(false);
    }

    // 5th failed attempt triggers lockout
    const res5 = await vaultService.unlock("9999");
    expect(res5.success).toBe(false);
    expect(res5.error).toBe("locked");
    expect(res5.remainingSeconds).toBeGreaterThanOrEqual(290);
    expect(res5.remainingSeconds).toBeLessThanOrEqual(300);

    // Any subsequent attempt while locked is rejected immediately
    const resWhileLocked = await vaultService.unlock("1111"); // even with correct PIN
    expect(resWhileLocked.success).toBe(false);
    expect(resWhileLocked.error).toBe("locked");
  });

  it("successful unlock resets failed attempts and unlocks session", async () => {
    await vaultService.setupPin("2222");
    vaultService.lock();

    // 2 failed attempts
    await vaultService.unlock("9999");
    await vaultService.unlock("9999");
    expect(vaultService.getLockoutState().failedAttempts).toBe(2);

    // Correct unlock
    const ok = await vaultService.unlock("2222");
    expect(ok.success).toBe(true);
    expect(vaultService.isUnlocked()).toBe(true);
    expect(vaultService.getLockoutState().failedAttempts).toBe(0);
  });

  it("resetting vault wipes PIN, lockout, and locks session", async () => {
    await vaultService.setupPin("3333");
    expect(vaultService.hasPin()).toBe(true);
    expect(vaultService.isUnlocked()).toBe(true);

    await vaultService.resetVault();
    expect(vaultService.hasPin()).toBe(false);
    expect(vaultService.isUnlocked()).toBe(false);
    expect(vaultService.getLockoutState().failedAttempts).toBe(0);
  });

  it("storage.clearAll wipes everything including vault PIN, documents, and storage", async () => {
    await vaultService.setupPin("4444");
    await vaultService.addDocument(
      "test.pdf",
      "application/pdf",
      1234,
      "data:application/pdf;base64,AAA",
    );
    storage.set("demo_loaded", true);
    storage.set("test_data", "active");

    await storage.clearAll();

    expect(storage.get("demo_loaded", false)).toBe(false);
    expect(storage.get("test_data", null)).toBe(null);
    expect(vaultService.hasPin()).toBe(false);
    expect(vaultService.isUnlocked()).toBe(false);
  });
});
