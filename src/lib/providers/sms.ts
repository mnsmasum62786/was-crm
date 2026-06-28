import type { SmsProvider, SendResult } from "./types";

class MockSmsProvider implements SmsProvider {
  readonly name = "mock";
  async send(input: { to: string; body: string }): Promise<SendResult> {
    console.log(`[MOCK SMS] -> ${input.to} | ${input.body.slice(0, 160)}`);
    return {
      ok: true,
      status: "sent",
      provider: "mock",
      providerMessageId: "mock-sms-" + Math.round(Math.random() * 1e9),
    };
  }
}

/**
 * Generic BD SMS gateway provider. Many BD gateways (e.g. bulksmsbd, sslwireless)
 * expose a simple HTTP GET/POST API; this implementation targets the common
 * bulksmsbd-style endpoint and can be swapped per gateway.
 */
class BdSmsProvider implements SmsProvider {
  readonly name = "sms_bd";
  constructor(
    private apiKey: string,
    private senderId: string
  ) {}
  async send(input: { to: string; body: string }): Promise<SendResult> {
    try {
      const url = new URL("https://bulksmsbd.net/api/smsapi");
      url.searchParams.set("api_key", this.apiKey);
      url.searchParams.set("type", "text");
      url.searchParams.set("number", input.to.replace(/^\+/, ""));
      url.searchParams.set("senderid", this.senderId);
      url.searchParams.set("message", input.body);
      const res = await fetch(url.toString(), { method: "GET" });
      const text = await res.text();
      const ok = res.ok && /1\d{3}|SMS SUBMITTED|success/i.test(text);
      return {
        ok,
        status: ok ? "sent" : "failed",
        provider: "sms_bd",
        error: ok ? undefined : text.slice(0, 200),
      };
    } catch (e) {
      return {
        ok: false,
        status: "failed",
        provider: "sms_bd",
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
}

export function getSmsProvider(): SmsProvider {
  const key = process.env.SMS_API_KEY;
  const sender = process.env.SMS_SENDER_ID;
  if (key && sender) return new BdSmsProvider(key, sender);
  return new MockSmsProvider();
}
