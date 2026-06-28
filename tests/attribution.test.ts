import { describe, it, expect } from "vitest";
import { extractAttribution, attributionToUpdate } from "@/lib/attribution";

describe("attribution capture", () => {
  it("captures flat utm + click ids", () => {
    const a = extractAttribution({
      utm_source: "facebook",
      utm_medium: "cpc",
      utm_campaign: "launchpad",
      fbclid: "abc",
      _fbp: "fb.1.2.3",
      referer: "https://fb.com",
    });
    expect(a.utmSource).toBe("facebook");
    expect(a.utmMedium).toBe("cpc");
    expect(a.utmCampaign).toBe("launchpad");
    expect(a.fbclid).toBe("abc");
    expect(a.fbp).toBe("fb.1.2.3");
    expect(a.referrer).toBe("https://fb.com");
  });

  it("merges a nested attribution object and supports camelCase", () => {
    const a = extractAttribution({
      attribution: { utmSource: "google", utmTerm: "analytics" },
    });
    expect(a.utmSource).toBe("google");
    expect(a.utmTerm).toBe("analytics");
  });

  it("attributionToUpdate omits null keys", () => {
    const upd = attributionToUpdate(extractAttribution({ utm_source: "x" }));
    expect(upd).toEqual({ utmSource: "x" });
  });
});
