import { describe, it, expect } from "vitest";
import { evaluateSequenceExit } from "@/lib/sequence-exit";

describe("sequence exit conditions", () => {
  it("exits on conversion to a targeted tier (no chasing a closed sale)", () => {
    const r = evaluateSequenceExit(
      { converted: ["base", "vip"] },
      { stage: "workshop_attended", paidTiers: ["base"], optedOutChannels: [] }
    );
    expect(r.exit).toBe(true);
    expect(r.reason).toBe("converted:base");
  });

  it("does NOT exit when paid tier is outside the target set", () => {
    const r = evaluateSequenceExit(
      { converted: ["vip"] },
      { stage: "workshop_attended", paidTiers: ["workshop"], optedOutChannels: [] }
    );
    expect(r.exit).toBe(false);
  });

  it("exits on any conversion when converted=true", () => {
    const r = evaluateSequenceExit(
      { converted: true },
      { stage: "lead", paidTiers: ["workshop"], optedOutChannels: [] }
    );
    expect(r.exit).toBe(true);
  });

  it("exits on opt-out", () => {
    const r = evaluateSequenceExit(
      { optedOut: true },
      { stage: "lead", paidTiers: [], optedOutChannels: ["whatsapp"] }
    );
    expect(r.exit).toBe(true);
    expect(r.reason).toBe("opted_out");
  });

  it("exits when stage is in exitStages", () => {
    const r = evaluateSequenceExit(
      { exitStages: ["churned"] },
      { stage: "churned", paidTiers: [], optedOutChannels: [] }
    );
    expect(r.exit).toBe(true);
  });

  it("stays enrolled when no condition matches", () => {
    const r = evaluateSequenceExit(
      { converted: ["base"], optedOut: true },
      { stage: "workshop_attended", paidTiers: [], optedOutChannels: [] }
    );
    expect(r.exit).toBe(false);
  });
});
