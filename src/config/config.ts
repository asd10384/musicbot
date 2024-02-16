import { ColorResolvable } from "discord.js";
import "dotenv/config";

export const config = {
  TOKEN: process.env.TOKEN?.trim() || "",
  prefix: process.env.PREFIX?.trim() || "p",
  permissions: (process.env.permissions?.split(',').map(v => v.trim()) || []) as string[],
  embedColor: (process.env.embedColor?.trim() || "Orange") as ColorResolvable,
  DEV: process.env.DEV?.trim() === "true",
  DEBUG: process.env.DEBUG?.trim() === "true",
  slashCommand: process.env.slashCommand?.trim() === "true",
  DEV_SERVERID: process.env.DEV_SERVERID?.trim() || "",
  PROXY: process.env.PROXY?.trim() || "",
  YOUTUBE_TOKEN: process.env.YOUTUBE_TOKEN?.trim() || "",
  YOUTUBE_MUSIC: process.env.YOUTUBE_MUSIC?.trim() === "true",
  YOUTUBE_MUSIC_TOKEN: process.env.YOUTUBE_MUSIC_TOKEN?.trim() || "",
  SPOTIFY: process.env.SPOTIFY?.trim() === "true",
  SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID?.trim() || "",
  SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET?.trim() || "",
};