import "dotenv/config";
import {
  AnyThreadChannel,
  ChannelType,
  type Client,
  type ThreadChannel,
} from "discord.js";
import {
  getHighestPriorityAddedAction,
  getForumParent,
  pickFirstImageUrl,
  sameTags,
  sendTagUpdateAction,
} from "./utils.js";
import { ANNOUNCE_CHANNEL_ID } from "../ids.js";
import { buildAnnouncementMessage, buildThreadEmbed } from "./messages.js";
import { pendingTagUpdates } from "../types.js";
import { TAG_UPDATE_COOLDOWN_MS, TAG_UPDATE_DEBOUNCE_MS } from "./config.js";
import { sleep } from "../utils.js";

/* ──────────────────────────────────────────────────────────────
 * Public registration
 * ────────────────────────────────────────────────────────────── */

export function registerForumHandlers(client: Client) {
  client.on("threadCreate", async (thread) => {
    const parent = getForumParent(thread);
    if (!parent) return;
    await handleThreadCreate(client, thread);
  });

  client.on("threadUpdate", async (oldThread, thread) => {
    const parent = getForumParent(thread);
    if (!parent) return;
    handleThreadTagUpdate(client, oldThread, thread);
  });
}

/* ──────────────────────────────────────────────────────────────
 * Thread create
 * ────────────────────────────────────────────────────────────── */

async function handleThreadCreate(client: Client, thread: AnyThreadChannel) {
  const announceChannel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID);
  if (!announceChannel) {
    console.error(`Channel with ID ${ANNOUNCE_CHANNEL_ID} could not be found`);
    return;
  }

  if (announceChannel.type !== ChannelType.GuildText) return;

  await sleep(3000);

  const initialThreadMessage = (await thread.messages.fetch()).first();
  const initialThreadContent = initialThreadMessage?.content || "";
  const initialThreadAttachments = initialThreadMessage?.attachments;

  const content = `@everyone\n${buildAnnouncementMessage(thread)}`;

  const embed = buildThreadEmbed(
    thread,
    initialThreadContent,
    pickFirstImageUrl(initialThreadAttachments),
  );

  await announceChannel.send({
    content,
    embeds: [embed],
    allowedMentions: {
      parse: ["users", "everyone"],
    },
  });
}

/* ──────────────────────────────────────────────────────────────
 * Thread tag updates (debounce + cooldown)
 * ────────────────────────────────────────────────────────────── */

function handleThreadTagUpdate(
  client: Client,
  oldThread: AnyThreadChannel,
  thread: AnyThreadChannel,
) {
  const oldTags = oldThread.appliedTags ?? [];
  const newTags = thread.appliedTags ?? [];
  if (sameTags(oldTags, newTags)) return;
  const existing = pendingTagUpdates.get(thread.id);
  const baseTags = existing ? existing.baseTags : oldTags;
  const latestTags = newTags;

  if (existing) {
    clearTimeout(existing.timer);
  }

  const timer = setTimeout(async () => {
    const entry = pendingTagUpdates.get(thread.id);
    if (!entry) return;

    pendingTagUpdates.delete(thread.id);

    const announceChannel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID);
    if (!announceChannel || announceChannel.type !== ChannelType.GuildText)
      return;

    const fresh = await client.channels.fetch(thread.id).catch(() => null);
    if (!fresh || !fresh.isThread()) return;

    const currentTags = fresh.appliedTags ?? [];

    if (sameTags(entry.baseTags, currentTags)) return;

    const action = getHighestPriorityAddedAction(entry.baseTags, currentTags);
    if (!action) return;

    const now = Date.now();
    if (
      entry.lastSentKey === action &&
      now - entry.lastSentAt < TAG_UPDATE_COOLDOWN_MS
    ) {
      return;
    }

    const initialThreadMessage = (
      await (fresh as ThreadChannel).messages.fetch()
    ).last();
    const initialThreadContent = initialThreadMessage?.content || "";
    const initialThreadAttachments = initialThreadMessage?.attachments;

    const embed = buildThreadEmbed(
      fresh,
      initialThreadContent,
      pickFirstImageUrl(initialThreadAttachments),
    );

    await sendTagUpdateAction(announceChannel, fresh, embed, action, now);
  }, TAG_UPDATE_DEBOUNCE_MS);

  pendingTagUpdates.set(thread.id, {
    timer,
    baseTags,
    latestTags,
    lastSentAt: existing?.lastSentAt ?? 0,
    lastSentKey: existing?.lastSentKey,
  });
}
