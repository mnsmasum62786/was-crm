import { inngest, inngestConfigured } from "./client";
import { advanceEnrollment } from "../sequences";

/**
 * Kick off processing for freshly created enrollments. When Inngest is
 * configured we emit durable events; otherwise (dev/mock) we advance inline so
 * the whole system runs without external infrastructure.
 */
export async function kickEnrollments(enrollmentIds: string[]) {
  if (!enrollmentIds.length) return;
  if (inngestConfigured) {
    await inngest.send(
      enrollmentIds.map((enrollmentId) => ({
        name: "sequence/enrollment.started",
        data: { enrollmentId },
      }))
    );
    return;
  }
  // Inline fallback — fire and forget, errors are logged by advanceEnrollment.
  for (const id of enrollmentIds) {
    await advanceEnrollment(id).catch((e) =>
      console.error("[kickEnrollments] advance failed", id, e)
    );
  }
}
