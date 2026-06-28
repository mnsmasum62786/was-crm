export * from "./types";
export { getEmailProvider } from "./email";
export { getWhatsAppProvider } from "./whatsapp";
export { getSmsProvider } from "./sms";

export function providerStatus() {
  return {
    email: process.env.RESEND_API_KEY ? "resend" : "mock",
    whatsapp:
      process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN
        ? "whatsapp_cloud"
        : "mock",
    sms: process.env.SMS_API_KEY ? "sms_bd" : "mock",
    inngest: process.env.INNGEST_EVENT_KEY ? "live" : "dev",
  };
}
