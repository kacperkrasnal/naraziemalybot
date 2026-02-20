import { AnyThreadChannel, EmbedBuilder, ForumChannel } from "discord.js";
import {
  getCopyForKind,
  getThreadKind,
  isLookingForPlayers,
  tagEmoji,
} from "./utils.js";
import {
  ACTIVE_TAG_ID,
  INACTIVE_TAG_ID,
  LOOKING_FOR_PLAYERS_TAG_ID,
  TEMPORARY_INACTIVE_TAG_ID,
} from "../ids.js";

export function buildThreadEmbed(
  thread: AnyThreadChannel,
  initialThreadContent: string,
  initialImageUrl: string | null,
): EmbedBuilder {
  const description = initialThreadContent.trim() || "*Brak informacji...*";

  const safeDescription =
    description.length > 4096
      ? description.slice(0, 4093) + "..."
      : description;

  const embed = new EmbedBuilder()
    .setTitle(thread.name)
    .setURL(thread.url)
    .setDescription(safeDescription)
    .setTimestamp();

  if (initialImageUrl) {
    embed.setImage(initialImageUrl);
  }

  return embed;
}

export function buildAnnouncementMessage(thread: AnyThreadChannel): string {
  const parent = thread.parent as ForumChannel;
  const threadOwnerMention = `<@${thread.ownerId}>`;

  const kind = getThreadKind(thread);
  const lookingForPlayers = isLookingForPlayers(thread);

  const { label, emoji, nowyNowa, któryKtóra, recruitmentNoun } =
    getCopyForKind(parent, kind);

  const threadLink = `[${thread.name}](${thread.url})`;

  const lines: string[] = [];

  lines.push(
    `Właśnie wleciała ${nowyNowa} **${label}${emoji}**! ${któryKtóra} poprowadzi ${threadOwnerMention}.`,
  );

  if (lookingForPlayers) {
    lines.push(
      `🎯 Właśnie trwają nabory do ${recruitmentNoun} — aby się zgłosić wejdź na **${threadLink}** i napisz *"Zgłaszam się!"*`,
    );
  }

  return lines.join("\n");
}

/**
 * 1. Zmiana na LOOKING_FOR_PLAYERS -> ping @everyone
 */
export function buildLookingForPlayersUpdate(thread: AnyThreadChannel): string {
  const parent = thread.parent as ForumChannel;
  const threadLink = `[${thread.name}](${thread.url})`;
  return [
    "@everyone",
    "Szukasz sesji? Mamy coś dla Ciebie!",
    `🎯 W tym momencie zaczynają się nabory do **${threadLink}** — aby się zgłosić napisz *"Zgłaszam się!"* w wątku. ${tagEmoji(parent, LOOKING_FOR_PLAYERS_TAG_ID)}`,
  ].join("\n");
}

/**
 * 2. ACTIVE
 */
export function buildActiveUpdate(thread: AnyThreadChannel): string {
  const parent = thread.parent as ForumChannel;
  const threadOwnerMention = `<@${thread.ownerId}>`;

  const kind = getThreadKind(thread);
  const { label, emoji } = getCopyForKind(parent, kind);

  const { prowadzon, aktywn } = grammarForKind(kind);

  return `${emoji}${label} **${thread.name}** prowadzon${prowadzon} przez ${threadOwnerMention} właśnie jest aktywn${aktywn}! ${tagEmoji(parent, ACTIVE_TAG_ID)}`;
}

/**
 * 3. INACTIVE
 */
export function buildInactiveUpdate(thread: AnyThreadChannel): string {
  const parent = thread.parent as ForumChannel;
  const threadOwnerMention = `<@${thread.ownerId}>`;

  const kind = getThreadKind(thread);
  const { label, emoji } = getCopyForKind(parent, kind);

  const { prowadzon, zakonczyl } = grammarForKind(kind);

  return `${emoji}${label} **${thread.name}** prowadzon${prowadzon} przez ${threadOwnerMention} właśnie się zakończy${zakonczyl}! ${tagEmoji(parent, INACTIVE_TAG_ID)}`;
}

/**
 * 4. TEMPORARY_INACTIVE
 */
export function buildTemporaryInactiveUpdate(thread: AnyThreadChannel): string {
  const parent = thread.parent as ForumChannel;
  const threadOwnerMention = `<@${thread.ownerId}>`;

  const kind = getThreadKind(thread);
  const { label, emoji } = getCopyForKind(parent, kind);

  const { prowadzon, przestal, aktywn } = grammarForKind(kind);

  return `${emoji}${label} **${thread.name}** prowadzon${prowadzon} przez ${threadOwnerMention} właśnie zosta${przestal} zawieszon${aktywn}! ${tagEmoji(parent, TEMPORARY_INACTIVE_TAG_ID)}`;
}

/**
 * oneshot -> męski, reszta -> żeński (kampania/przygoda/sesja)
 */
function grammarForKind(kind: ReturnType<typeof getThreadKind>): {
  prowadzon: "y" | "a";
  aktywn: "y" | "a";
  zakonczyl: "ł" | "ła";
  przestal: "ł" | "ła";
} {
  const masculine = kind === "oneshot";
  return {
    prowadzon: masculine ? "y" : "a",
    aktywn: masculine ? "y" : "a",
    zakonczyl: masculine ? "ł" : "ła",
    przestal: masculine ? "ł" : "ła",
  };
}
