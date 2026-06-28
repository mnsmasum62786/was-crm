import { Resend } from "resend";
import type { EmailProvider, SendResult } from "./types";

class MockEmailProvider implements EmailProvider {
  readonly name = "mock";
  async send(input: {
    to: string;
    subject: string;
    html: string;
  }): Promise<SendResult> {
    console.log(
      `[MOCK EMAIL] -> ${input.to} | ${input.subject}\n${input.html.slice(0, 200)}`
    );
    return {
      ok: true,
      status: "sent",
      provider: "mock",
      providerMessageId: "mock-email-" + Math.round(Math.random() * 1e9),
    };
  }
}

class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  private client: Resend;
  private from: string;
  constructor(apiKey: string, from: string) {
    this.client = new Resend(apiKey);
    this.from = from;
  }
  async send(input: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<SendResult> {
    try {
      const { data, error } = await this.client.emails.send({
        from: this.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
      if (error) {
        return { ok: false, status: "failed", provider: "resend", error: error.message };
      }
      return {
        ok: true,
        status: "sent",
        provider: "resend",
        providerMessageId: data?.id,
      };
    } catch (e) {
      return {
        ok: false,
        status: "failed",
        provider: "resend",
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
}

export function getEmailProvider(): EmailProvider {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (key && from) return new ResendEmailProvider(key, from);
  return new MockEmailProvider();
}
