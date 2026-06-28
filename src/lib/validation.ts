import { z } from "zod";
import { SEGMENTS } from "./constants";

const segmentEnum = z.enum(SEGMENTS).optional().nullable();

export const leadIngestSchema = z.object({
  phone: z.string().min(5),
  name: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  fbProfileUrl: z.string().optional().nullable(),
  segment: segmentEnum,
  source: z.string().optional().nullable(),
  batchId: z.string().optional().nullable(),
  // Attribution (flat or nested handled by extractAttribution)
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  utm_content: z.string().optional().nullable(),
  utm_term: z.string().optional().nullable(),
  fbclid: z.string().optional().nullable(),
  fbp: z.string().optional().nullable(),
  fbc: z.string().optional().nullable(),
  referrer: z.string().optional().nullable(),
  idempotencyKey: z.string().optional().nullable(),
}).passthrough();

export const paymentIngestSchema = z.object({
  phone: z.string().min(5),
  name: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  tier: z.enum(["workshop", "base", "vip", "renewal"]),
  amount: z.coerce.number().int().nonnegative(),
  status: z.enum(["pending", "partial", "paid", "failed"]).default("paid"),
  transactionId: z.string().optional().nullable(),
  gateway: z.string().optional().nullable(),
  idempotencyKey: z.string().optional().nullable(),
}).passthrough();

export const manychatIngestSchema = z.object({
  phone: z.string().min(5).optional().nullable(),
  whatsapp_phone: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  segment: segmentEnum,
  source: z.string().optional().nullable(),
  idempotencyKey: z.string().optional().nullable(),
}).passthrough();

export type LeadIngest = z.infer<typeof leadIngestSchema>;
export type PaymentIngest = z.infer<typeof paymentIngestSchema>;
export type ManychatIngest = z.infer<typeof manychatIngestSchema>;
