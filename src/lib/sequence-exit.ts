// Pure evaluation of sequence exit conditions.
//
// Exit conditions are mandatory: a contact who converts to the next tier, opts
// out, or moves to an excluded stage must instantly exit the sequence so they
// are never chased for a sale they already made.

export type ExitConditions = {
  /**
   * Exit when the contact has a paid deal.
   *  - `true`  -> any paid deal triggers exit
   *  - string[] -> exit only when a paid deal in one of these tiers exists
   */
  converted?: boolean | string[];
  /** Exit when the contact has opted out of any (relevant) channel. */
  optedOut?: boolean;
  /** Exit when the contact's stage is one of these. */
  exitStages?: string[];
};

export type ExitContext = {
  stage: string;
  /** Tiers for which the contact has a PAID deal. */
  paidTiers: string[];
  /** Channels the contact has opted out of. */
  optedOutChannels: string[];
};

export type ExitResult = { exit: boolean; reason?: string };

export function evaluateSequenceExit(
  conditions: ExitConditions | null | undefined,
  ctx: ExitContext
): ExitResult {
  if (!conditions) return { exit: false };

  // 1) Conversion.
  if (conditions.converted) {
    if (conditions.converted === true) {
      if (ctx.paidTiers.length > 0) {
        return { exit: true, reason: "converted" };
      }
    } else if (Array.isArray(conditions.converted)) {
      const hit = ctx.paidTiers.find((t) =>
        (conditions.converted as string[]).includes(t)
      );
      if (hit) return { exit: true, reason: `converted:${hit}` };
    }
  }

  // 2) Opt-out.
  if (conditions.optedOut && ctx.optedOutChannels.length > 0) {
    return { exit: true, reason: "opted_out" };
  }

  // 3) Stage change into an excluded stage.
  if (conditions.exitStages && conditions.exitStages.includes(ctx.stage)) {
    return { exit: true, reason: `stage_changed:${ctx.stage}` };
  }

  return { exit: false };
}
