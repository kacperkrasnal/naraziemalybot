/* ──────────────────────────────────────────────────────────────
 * Thread domain
 * ────────────────────────────────────────────────────────────── */

export type ThreadKind = "campaign" | "oneshot" | "adventure" | "session";

export interface ThreadCopy {
  label: string;
  emoji: string;
  recruitmentNoun: string;
}

/* ──────────────────────────────────────────────────────────────
 * Tag update / anti-spam domain
 * ────────────────────────────────────────────────────────────── */

export type TagAction = "lfp" | "active" | "inactive" | "tempInactive";

export interface PendingTagUpdate {
  timer: NodeJS.Timeout;
  baseTags: string[];
  latestTags: string[];
  lastSentAt: number;
  lastSentKey?: TagAction;
}

/**
 * In-memory state for debounced / cooldowned tag updates.
 * Key = thread.id
 */
export const pendingTagUpdates = new Map<string, PendingTagUpdate>();
