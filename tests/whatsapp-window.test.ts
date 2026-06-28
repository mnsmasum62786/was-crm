import { describe, it, expect } from "vitest";
import { decideWhatsappSend } from "@/lib/whatsapp-window";

const NOW = new Date("2026-06-28T12:00:00Z");

describe("WhatsApp 24h window", () => {
  it("allows free-form inside the window", () => {
    const d = decideWhatsappSend({
      lastInboundAt: new Date("2026-06-28T01:00:00Z"), // 11h ago
      now: NOW,
      hasApprovedTemplate: false,
    });
    expect(d.allowed).toBe(true);
    expect(d.mode).toBe("freeform");
    expect(d.insideWindow).toBe(true);
  });

  it("blocks free-form outside the window without a template", () => {
    const d = decideWhatsappSend({
      lastInboundAt: new Date("2026-06-26T12:00:00Z"), // 48h ago
      now: NOW,
      hasApprovedTemplate: false,
    });
    expect(d.allowed).toBe(false);
    expect(d.insideWindow).toBe(false);
  });

  it("allows approved template outside the window", () => {
    const d = decideWhatsappSend({
      lastInboundAt: new Date("2026-06-26T12:00:00Z"),
      now: NOW,
      hasApprovedTemplate: true,
    });
    expect(d.allowed).toBe(true);
    expect(d.mode).toBe("template");
  });

  it("treats exactly 24h as still inside the window", () => {
    const d = decideWhatsappSend({
      lastInboundAt: new Date("2026-06-27T12:00:00Z"), // exactly 24h
      now: NOW,
      hasApprovedTemplate: false,
    });
    expect(d.insideWindow).toBe(true);
  });

  it("requires a template when there is no inbound history", () => {
    const d = decideWhatsappSend({
      lastInboundAt: null,
      now: NOW,
      hasApprovedTemplate: false,
    });
    expect(d.allowed).toBe(false);
  });
});
