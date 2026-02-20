import {
  AnyThreadChannel,
  ChannelType,
  ForumChannel,
  type Snowflake,
  type TextChannel,
} from "discord.js";

import {
  pendingTagUpdates,
  type TagAction,
  type ThreadCopy,
  type ThreadKind,
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
import {
  buildActiveUpdate,
  buildInactiveUpdate,
  buildLookingForPlayersUpdate,
  buildTemporaryInactiveUpdate,
} from "./messages.js";

/* ──────────────────────────────────────────────────────────────
 * Forum guards
 * ────────────────────────────────────────────────────────────── */

export function getForumParent(thread: AnyThreadChannel) {
  if (thread.parentId !== FORUM_CHANNEL_ID) return null;

  const parent = thread.parent;
  if (!parent || parent.type !== ChannelType.GuildForum) return null;

  return parent;
}

/* ──────────────────────────────────────────────────────────────
 * Thread kind + copy (label/emoji/recruitment)
 * ────────────────────────────────────────────────────────────── */

export function getThreadKind(thread: AnyThreadChannel): ThreadKind {
  if (hasTag(thread, CAMPAIGN_TAG_ID) || hasTag(thread, SERVER_CAMPAIGN_TAG_ID))
    return "campaign";
  if (hasTag(thread, ONESHOT_TAG_ID)) return "oneshot";
  if (hasTag(thread, ADVENTURE_TAG_ID)) return "adventure";
  return "session";
}

export function getCopyForKind(
  parent: ForumChannel,
  kind: ThreadKind,
): ThreadCopy {
  switch (kind) {
    case "campaign":
      return {
        label: "kampania",
        emoji: tagEmoji(parent, CAMPAIGN_TAG_ID),
        recruitmentNoun: "tej kampanii",
      };

    case "oneshot":
      return {
        label: "oneshot",
        emoji: tagEmoji(parent, ONESHOT_TAG_ID),
        recruitmentNoun: "tego oneshota",
      };

    case "adventure":
      return {
        label: "przygoda",
        emoji: tagEmoji(parent, ADVENTURE_TAG_ID),
        recruitmentNoun: "tej przygody",
      };

    default:
      return {
        label: "sesja",
        emoji: "",
        recruitmentNoun: "tej sesji",
      };
  }
}

export function tagEmoji(parent: ForumChannel, tagId: string): string {
  if (!tagId) return "";

  const tag = parent.availableTags.find((t) => t.id === tagId);
  if (!tag?.emoji) return "";

  const e = tag.emoji;

  // unicode emoji
  if (!e.id && e.name) return `${e.name} `;

  // custom emoji
  if (e.id) {
    const name = e.name ?? "emoji";
    const animated = (e as any).animated ? "a" : "";
    return `<${animated}:${name}:${e.id}> `;
  }

  return "";
}

/* ──────────────────────────────────────────────────────────────
 * Attachments / images
 * ────────────────────────────────────────────────────────────── */

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

/* ──────────────────────────────────────────────────────────────
 * Tag diff helpers + prioritization
 * ────────────────────────────────────────────────────────────── */

export function sameTags(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const as = new Set(a);
  for (const x of b) if (!as.has(x)) return false;
  return true;
}

export function tagAdded(
  oldTags: string[],
  newTags: string[],
  tagId: string,
): boolean {
  if (!tagId) return false;
  return !oldTags.includes(tagId) && newTags.includes(tagId);
}

/**
 * Returns the highest priority action based on which tags were ADDED.
 * Priority: lfp > active > inactive > tempInactive
 */
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

/* ──────────────────────────────────────────────────────────────
 * Cooldown bookkeeping (anti-spam)
 * ────────────────────────────────────────────────────────────── */

export function saveLastSent(threadId: string, key: TagAction, at: number) {
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

/* ──────────────────────────────────────────────────────────────
 * Sending helpers
 * ────────────────────────────────────────────────────────────── */

export async function sendTagUpdateAction(
  announceChannel: TextChannel,
  thread: AnyThreadChannel,
  embed: any,
  action: TagAction,
  now: number,
) {
  if (action === "lfp") {
    const content = buildLookingForPlayersUpdate(thread);
    await announceChannel.send({
      content,
      embeds: [embed],
      allowedMentions: { parse: ["everyone"] },
    });
    saveLastSent(thread.id, action, now);
    return;
  }

  if (action === "active") {
    const content = buildActiveUpdate(thread);
    await announceChannel.send({
      content,
      embeds: [embed],
      allowedMentions: { parse: ["users"] },
    });
    saveLastSent(thread.id, action, now);
    return;
  }

  if (action === "inactive") {
    const content = buildInactiveUpdate(thread);
    await announceChannel.send({
      content,
      embeds: [embed],
      allowedMentions: { parse: ["users"] },
    });
    saveLastSent(thread.id, action, now);
    return;
  }

  {
    const content = buildTemporaryInactiveUpdate(thread);
    await announceChannel.send({
      content,
      embeds: [embed],
      allowedMentions: { parse: ["users"] },
    });
    saveLastSent(thread.id, action, now);
  }
}
