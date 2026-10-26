// =============================================================================
// FILE: models/AutomationRule.ts   (NEW FILE)
// Inactive-account automation rules (configured by the Super Admin).
// A rule finds people who match its inactivity criteria and moves them
// through stages:  remind → flag for review → (optional) suspend.
// Accounts are NEVER deleted. Admins are never touched.
// =============================================================================

import { Schema, model, models, type InferSchemaType } from 'mongoose';

const AutomationRuleSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    enabled: { type: Boolean, default: false },
    /** Who it applies to. Admins can never be included. */
    roles: { type: [String], default: ['student'] },
    /** Limit to these programs (empty = everyone in the roles). */
    programIds: { type: [Schema.Types.ObjectId], default: [] },

    // --- criteria (0 = not used) -----------------------------------------
    /** No sign-in for this many days (never signed in counts from account creation). */
    noLoginDays: { type: Number, default: 30, min: 0, max: 730 },
    /** No submission for this many days (only if they had work due in that time). */
    noSubmissionDays: { type: Number, default: 0, min: 0, max: 730 },
    /** Not present/late at any session for this many days (only if sessions happened). */
    noAttendanceDays: { type: Number, default: 0, min: 0, max: 730 },
    /** 'any' = one criterion is enough, 'all' = every used criterion must match. */
    combine: { type: String, enum: ['any', 'all'], default: 'any' },

    // --- exclusions -------------------------------------------------------
    /** Skip accounts younger than this many days. */
    newAccountDays: { type: Number, default: 14, min: 0, max: 365 },

    // --- actions ----------------------------------------------------------
    remind: { type: Boolean, default: true },
    flag: { type: Boolean, default: true },
    /** Days after the reminder before flagging. */
    flagAfterDays: { type: Number, default: 7, min: 0, max: 180 },
    suspend: { type: Boolean, default: false },
    /** Grace days after flagging before suspension. */
    graceDays: { type: Number, default: 14, min: 1, max: 365 },
    notifyMentors: { type: Boolean, default: true },
    /** Safety cap: never suspend more than this in one run. */
    maxSuspendPerRun: { type: Number, default: 25, min: 1, max: 500 },
    frequency: { type: String, enum: ['daily', 'weekly'], default: 'daily' },

    lastRunAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export type AutomationRuleDoc = InferSchemaType<typeof AutomationRuleSchema> & { _id: string };

export default models.AutomationRule || model('AutomationRule', AutomationRuleSchema);
