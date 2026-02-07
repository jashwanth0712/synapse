import { describe, it, expect } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";

describe("Payment module", () => {
  it("should generate valid Stellar keypairs", () => {
    const kp = Keypair.random();
    expect(kp.publicKey()).toMatch(/^G[A-Z2-7]{55}$/);
    expect(kp.secret()).toMatch(/^S[A-Z2-7]{55}$/);
  });

  it("should reconstruct keypair from secret", () => {
    const kp = Keypair.random();
    const secret = kp.secret();
    const restored = Keypair.fromSecret(secret);
    expect(restored.publicKey()).toBe(kp.publicKey());
  });
});
