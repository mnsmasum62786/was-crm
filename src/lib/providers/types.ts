// Channel provider interfaces. Every channel has a real implementation AND a
// Mock that logs to the DB, so the whole system is buildable/testable without
// live API keys. Real providers activate only when their env keys are present.

export type SendResult = {
  ok: boolean;
  providerMessageId?: string;
  status: "sent" | "failed";
  error?: string;
  /** "mock" | "resend" | "whatsapp_cloud" | "sms_bd" */
  provider: string;
};

export interface EmailProvider {
  readonly name: string;
  send(input: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<SendResult>;
}

export interface WhatsAppProvider {
  readonly name: string;
  /** Free-form text send (only valid inside the 24h window). */
  sendText(input: { to: string; body: string }): Promise<SendResult>;
  /** Approved-template send (valid outside the window). */
  sendTemplate(input: {
    to: string;
    templateName: string;
    languageCode?: string;
    variables?: string[];
    body?: string;
  }): Promise<SendResult>;
}

export interface SmsProvider {
  readonly name: string;
  send(input: { to: string; body: string }): Promise<SendResult>;
}
