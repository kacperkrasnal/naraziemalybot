import {
  AnyThreadChannel,
  ChannelType,
  ForumChannel,
  Snowflake,
} from "discord.js";
import {
  PendingTagUpdate,
  pendingTagUpdates,
  TagAction,
  ThreadCopy,
  ThreadKind,
} from "../types.js";
import {
  ACTIVE_TAG_ID,
  ADVENTURE_TAG_ID,
  CAMPAIGN_TAG_ID,
  FORUM_CHANNEL_ID,
  INACTIVE_TAG_ID,
  LOOKING_FOR_PLAYERS_TAG_ID,
  ONESHOT_TAG_ID,
  SERVER_CAMPAIGN_TAG_ID,
  TEMPORARY_INACTIVE_TAG_ID,
} from "../ids.js";
import { hasTag } from "../utils.js";
import { TAG_UPDATE_COOLDOWN_MS } from "./config.js";

export function getCopyForKind(
  parent: ForumChannel,
  kind: ThreadKind,
): ThreadCopy {
  switch (kind) {
    case "campaign":
      return {
        label: "kampania",
        emoji: tagEmoji(parent, CAMPAIGN_TAG_ID),
        nowyNowa: "nowa",
        któryKtóra: "która",
        recruitmentNoun: "tej kampanii",
      };

    case "oneshot":
      return {
        label: "oneshot",
        emoji: tagEmoji(parent, ONESHOT_TAG_ID),
        nowyNowa: "nowy",
        któryKtóra: "który",
        recruitmentNoun: "tego oneshota",
      };

    case "adventure":
      return {
        label: "przygoda",
        emoji: tagEmoji(parent, ADVENTURE_TAG_ID),
        nowyNowa: "nowa",
        któryKtóra: "która",
        recruitmentNoun: "tej przygody",
      };

    default:
      return {
        label: "sesja",
        emoji: "",
        nowyNowa: "nowa",
        któryKtóra: "która",
        recruitmentNoun: "tej sesji",
      };
  }
}

export function tagEmoji(parent: ForumChannel, tagId: string): string {
  if (!tagId) return "";

  const tag = parent.availableTags.find((t) => t.id === tagId);
  if (!tag?.emoji) return "";

  const e = tag.emoji;

  if (!e.id && e.name) return `${e.name} `;

  if (e.id) {
    const name = e.name ?? "emoji";
    const animated = (e as any).animated ? "a" : "";
    return `<${animated}:${name}:${e.id}> `;
  }

  return "";
}

export function getTypeLabel(
  parent: ForumChannel,
  flags: { isOneshot: boolean; isCampaign: boolean; isAdventure: boolean },
): { label: string; emoji: string } {
  const { isOneshot, isCampaign, isAdventure } = flags;

  if (isCampaign) {
    return {
      label: "kampania",
      emoji: tagEmoji(parent, CAMPAIGN_TAG_ID),
    };
  }

  if (isOneshot) {
    return {
      label: "oneshot",
      emoji: tagEmoji(parent, ONESHOT_TAG_ID),
    };
  }

  if (isAdventure) {
    return {
      label: "przygoda",
      emoji: tagEmoji(parent, ADVENTURE_TAG_ID),
    };
  }

  return {
    label: "sesja",
    emoji: "",
  };
}

export function getThreadKind(thread: AnyThreadChannel): ThreadKind {
  if (hasTag(thread, CAMPAIGN_TAG_ID) || hasTag(thread, SERVER_CAMPAIGN_TAG_ID))
    return "campaign";
  if (hasTag(thread, ONESHOT_TAG_ID)) return "oneshot";
  if (hasTag(thread, ADVENTURE_TAG_ID)) return "adventure";
  return "session";
}

export function isLookingForPlayers(thread: AnyThreadChannel): boolean {
  return hasTag(thread, LOOKING_FOR_PLAYERS_TAG_ID);
}

export function pickFirstImageUrl(
  attachments: Map<Snowflake, any> | undefined,
): string | null {
  if (!attachments || attachments.size === 0) return null;

  for (const [, att] of attachments) {
    const contentType: string | undefined = att.contentType;
    const url: string | undefined = att.url;

    if (!url) continue;

    if (contentType?.startsWith("image/")) return url;
    if (/\.(png|jpe?g|gif|webp)$/i.test(url)) return url;
  }

  return null;
}

export function tagAdded(
  oldTags: string[],
  newTags: string[],
  tagId: string,
): boolean {
  if (!tagId) return false;
  return !oldTags.includes(tagId) && newTags.includes(tagId);
}

export function sameTags(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const as = new Set(a);
  for (const x of b) if (!as.has(x)) return false;
  return true;
}

export function pickActionKey(flags: {
  lfpAdded: boolean;
  activeAdded: boolean;
  inactiveAdded: boolean;
  tempInactiveAdded: boolean;
}): "lfp" | "active" | "inactive" | "tempInactive" | null {
  if (flags.lfpAdded) return "lfp";
  if (flags.activeAdded) return "active";
  if (flags.inactiveAdded) return "inactive";
  if (flags.tempInactiveAdded) return "tempInactive";
  return null;
}

export function saveLastSent(
  threadId: string,
  key: PendingTagUpdate["lastSentKey"],
  at: number,
) {
  const existing = pendingTagUpdates.get(threadId);
  if (existing) {
    existing.lastSentKey = key;
    existing.lastSentAt = at;
    return;
  }

  pendingTagUpdates.set(threadId, {
    timer: setTimeout(
      () => pendingTagUpdates.delete(threadId),
      TAG_UPDATE_COOLDOWN_MS,
    ),
    baseTags: [],
    latestTags: [],
    lastSentAt: at,
    lastSentKey: key,
  });
}

export function getForumParent(thread: AnyThreadChannel) {
  if (thread.parentId !== FORUM_CHANNEL_ID) return null;

  const parent = thread.parent;
  if (!parent || parent.type !== ChannelType.GuildForum) return null;

  return parent;
}

export function getHighestPriorityAddedAction(
  baseTags: string[],
  currentTags: string[],
): TagAction | null {
  if (tagAdded(baseTags, currentTags, LOOKING_FOR_PLAYERS_TAG_ID)) return "lfp";
  if (tagAdded(baseTags, currentTags, ACTIVE_TAG_ID)) return "active";
  if (tagAdded(baseTags, currentTags, INACTIVE_TAG_ID)) return "inactive";
  if (tagAdded(baseTags, currentTags, TEMPORARY_INACTIVE_TAG_ID))
    return "tempInactive";
  return null;
}
