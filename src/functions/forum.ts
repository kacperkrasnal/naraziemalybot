import "dotenv/config";
import {
  AnyThreadChannel,
  ChannelType,
  EmbedBuilder,
  type Client,
  type ForumChannel,
  type APIEmoji,
  type Snowflake,
} from "discord.js";
import { getEnv } from "../utils.js";

const FORUM_CHANNEL_ID = getEnv("FORUM_CHANNEL_ID");
const ANNOUNCE_CHANNEL_ID = getEnv("ANNOUNCE_CHANNEL_ID");

// TAG IDs
const ONESHOT_TAG_ID = getEnv("ONESHOT_TAG_ID");
const CAMPAIGN_TAG_ID = getEnv("CAMPAIGN_TAG_ID");
const SERVER_CAMPAIGN_TAG_ID = getEnv("SERVER_CAMPAIGN_TAG_ID");
const ADVENTURE_TAG_ID = getEnv("ADVENTURE_TAG_ID");
const LOOKING_FOR_PLAYERS_TAG_ID = getEnv("LOOKING_FOR_PLAYERS_TAG_ID");

/**
 * Registers forum-related event handlers on the provided Discord client.
 * Listens for newly created threads in a forum channel and posts
 * an announcement message + embed.
 */
export function registerForumHandlers(client: Client) {
  client.on("threadCreate", async (thread) => {
    if (thread.parentId !== FORUM_CHANNEL_ID) return;

    const parent = thread.parent;
    if (!parent || parent.type !== ChannelType.GuildForum) return;

    const announceChannel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID);
    if (!announceChannel) {
      console.error(
        `Channel with ID ${ANNOUNCE_CHANNEL_ID} could not be found`,
      );
      return;
    }

    if (announceChannel.type !== ChannelType.GuildText) return;

    const initialThreadMessage = (await thread.messages.fetch()).first();
    const initialThreadContent = initialThreadMessage?.content || "";
    const initialThreadAttachments = initialThreadMessage?.attachments;

    const content = buildAnnouncementMessage(thread);

    const embed = buildThreadEmbed(
      thread,
      initialThreadContent,
      pickFirstImageUrl(initialThreadAttachments),
    );

    await announceChannel.send({
      content,
      embeds: [embed],
      allowedMentions: {
        parse: ["users"],
      },
    });
  });
}

function hasTag(thread: AnyThreadChannel, tagId: string) {
  return Boolean(tagId) && thread.appliedTags.includes(tagId);
}

function buildAnnouncementMessage(thread: AnyThreadChannel): string {
  const parent = thread.parent as ForumChannel;
  const authorMention = `<@${thread.ownerId}>`;

  const isOneshot = hasTag(thread, ONESHOT_TAG_ID);
  const isCampaign =
    hasTag(thread, CAMPAIGN_TAG_ID) || hasTag(thread, SERVER_CAMPAIGN_TAG_ID);
  const isAdventure = hasTag(thread, ADVENTURE_TAG_ID);
  const lookingForPlayers = hasTag(thread, LOOKING_FOR_PLAYERS_TAG_ID);

  const nowyNowa = isOneshot ? "nowy" : "nowa";
  const któryKtóra = isOneshot ? "który" : "która";
  const recruitmentNoun = isCampaign
    ? "tej kampanii"
    : isOneshot
      ? "tego oneshota"
      : "tej przygody";

  const { label, emoji } = getTypeLabel(parent, {
    isOneshot,
    isCampaign,
    isAdventure,
  });

  const threadLink = `[${thread.name}](${thread.url})`;

  const lines: string[] = [];

  lines.push(
    `Właśnie wleciała ${nowyNowa} **${label}${emoji}**! ${któryKtóra} poprowadzi ${authorMention}.`,
  );

  if (isOneshot) {
    lines.push(``);
  }

  if (lookingForPlayers) {
    lines.push(
      `🎯 W tym momencie również zaczynają się nabory do ${recruitmentNoun} — aby się zgłosić wejdź na **${threadLink}** i napisz *"Zgłaszam się!"*`,
    );
  }

  return lines.join("\n");
}

function getTypeLabel(
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

function tagEmoji(parent: ForumChannel, tagId: string): string {
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

function buildThreadEmbed(
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

function pickFirstImageUrl(
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
