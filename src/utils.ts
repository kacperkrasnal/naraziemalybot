import { AnyThreadChannel } from "discord.js";

export function getEnv(name: string, required: boolean = false): string {
  const value = process.env[name];

  if (!value && required) {
    throw new Error(`Required env variable ${name} not found`);
  }

  if (!value) {
    console.warn(`⚠️ env variable ${name} not found`);
    return "";
  }

  return value;
}

export function hasTag(thread: AnyThreadChannel, tagId: string) {
  return Boolean(tagId) && thread.appliedTags.includes(tagId);
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
