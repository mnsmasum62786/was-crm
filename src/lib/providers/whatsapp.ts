import type { WhatsAppProvider, SendResult } from "./types";

class MockWhatsAppProvider implements WhatsAppProvider {
  readonly name = "mock";
  async sendText(input: { to: string; body: string }): Promise<SendResult> {
    console.log(`[MOCK WA text] -> ${input.to} | ${input.body.slice(0, 200)}`);
    return mockResult();
  }
  async sendTemplate(input: {
    to: string;
    templateName: string;
  }): Promise<SendResult> {
    console.log(`[MOCK WA template] -> ${input.to} | tpl=${input.templateName}`);
    return mockResult();
  }
}

function mockResult(): SendResult {
  return {
    ok: true,
    status: "sent",
    provider: "mock",
    providerMessageId: "mock-wa-" + Math.round(Math.random() * 1e9),
  };
}

const GRAPH = "https://graph.facebook.com/v21.0";

class CloudWhatsAppProvider implements WhatsAppProvider {
  readonly name = "whatsapp_cloud";
  constructor(
    private phoneNumberId: string,
    private accessToken: string
  ) {}

  private async post(payload: Record<string, unknown>): Promise<SendResult> {
    try {
      const res = await fetch(`${GRAPH}/${this.phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
      });
      const json = (await res.json()) as {
        messages?: { id: string }[];
        error?: { message: string };
      };
      if (!res.ok || json.error) {
        return {
          ok: false,
          status: "failed",
          provider: "whatsapp_cloud",
          error: json.error?.message ?? `HTTP ${res.status}`,
        };
      }
      return {
        ok: true,
        status: "sent",
        provider: "whatsapp_cloud",
        providerMessageId: json.messages?.[0]?.id,
      };
    } catch (e) {
      return {
        ok: false,
        status: "failed",
        provider: "whatsapp_cloud",
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async sendText(input: { to: string; body: string }): Promise<SendResult> {
    return this.post({
      to: input.to.replace(/^\+/, ""),
      type: "text",
      text: { body: input.body, preview_url: true },
    });
  }

  async sendTemplate(input: {
    to: string;
    templateName: string;
    languageCode?: string;
    variables?: string[];
  }): Promise<SendResult> {
    const components =
      input.variables && input.variables.length
        ? [
            {
              type: "body",
              parameters: input.variables.map((v) => ({
                type: "text",
                text: v,
              })),
            },
          ]
        : undefined;
    return this.post({
      to: input.to.replace(/^\+/, ""),
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.languageCode ?? "en" },
        ...(components ? { components } : {}),
      },
    });
  }
}

export function getWhatsAppProvider(): WhatsAppProvider {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (id && token) return new CloudWhatsAppProvider(id, token);
  return new MockWhatsAppProvider();
}
