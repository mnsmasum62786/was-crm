import { describe, it, expect } from "vitest";
import { canSend, isOptOutMessage } from "@/lib/consent-gate";

describe("consent gate", () => {
  it("blocks marketing to an opted-out channel", () => {
    const r = canSend({
      channel: "whatsapp",
      category: "marketing",
      consents: [{ channel: "whatsapp", optedIn: false }],
    });
    expect(r.allowed).toBe(false);
  });

  it("blocks utility to an opted-out channel too", () => {
    const r = canSend({
      channel: "email",
      category: "utility",
      consents: [{ channel: "email", optedIn: false }],
    });
    expect(r.allowed).toBe(false);
  });

  it("always allows transactional even when opted out", () => {
    const r = canSend({
      channel: "email",
      category: "transactional",
      consents: [{ channel: "email", optedIn: false }],
    });
    expect(r.allowed).toBe(true);
  });

  it("allows marketing when no explicit opt-out exists (implied consent)", () => {
    const r = canSend({ channel: "sms", category: "marketing", consents: [] });
    expect(r.allowed).toBe(true);
  });

  it("only blocks the opted-out channel, not others", () => {
    const consents = [{ channel: "whatsapp" as const, optedIn: false }];
    expect(canSend({ channel: "whatsapp", category: "marketing", consents }).allowed).toBe(false);
    expect(canSend({ channel: "email", category: "marketing", consents }).allowed).toBe(true);
  });
});

describe("opt-out detection", () => {
  it("detects STOP/unsubscribe intents", () => {
    expect(isOptOutMessage("STOP")).toBe(true);
    expect(isOptOutMessage("stop")).toBe(true);
    expect(isOptOutMessage("Unsubscribe")).toBe(true);
    expect(isOptOutMessage("remove me please")).toBe(true);
    expect(isOptOutMessage("STOP now")).toBe(true);
  });
  it("ignores normal messages", () => {
    expect(isOptOutMessage("I want to buy")).toBe(false);
    expect(isOptOutMessage("non-stop fan")).toBe(false);
    expect(isOptOutMessage("")).toBe(false);
  });
});
