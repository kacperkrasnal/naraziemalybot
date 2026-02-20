export type ThreadKind = "campaign" | "oneshot" | "adventure" | "session";
export type ThreatStatus = "active" | "inactive" | "temporary_inactive";

export interface ThreadCopy {
  label: string;
  emoji: string;
  nowyNowa: string;
  któryKtóra: string;
  recruitmentNoun: string;
}

export type PendingTagUpdate = {
  timer: NodeJS.Timeout;
  baseTags: string[];
  latestTags: string[];
  lastSentAt: number;
  lastSentKey?: string;
};

export const pendingTagUpdates = new Map<string, PendingTagUpdate>();

export type TagAction = "lfp" | "active" | "inactive" | "tempInactive";
