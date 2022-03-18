import "dotenv/config";
import { Document, model, Schema } from "mongoose";

export interface music {
  playing: boolean;
  nowplaying: nowplay | null;
  queue: nowplay[];
  queuenumber: number[];
};

export interface nowplay {
  title: string;
  author: string;
  duration: string;
  url: string;
  image: string;
  player: string;
};

export interface guild_type extends Document {
  id: string;
  name: string;
  prefix: string;
  role: string[];
  channelId: string;
  msgId: string;
  options: {
    volume: number;
    player: boolean;
    listlimit: number;
    author: boolean;
    recommend: boolean;
  }
}

const GuildSchema: Schema = new Schema({
  id: { type: String, required: true },
  name: { type: String, default: "" },
  prefix: { type: String, default: (process.env.PREFIX) ? process.env.PREFIX : 'm;' },
  role: { type: Array, default: [] },
  channelId: { type: String, default: "" },
  msgId: { type: String, default: "" },
  options: {
    volume: { type: Number, default: 50 },
    player: { type: Boolean, default: true },
    listlimit: { type: Number, default: 300 },
    author: { type: Boolean, default: false },
    recommend: { type: Boolean, default: false }
  }
});

export const guild_model = model<guild_type>(`Guild${(process.env.BOT_NUMBER) ? process.env.BOT_NUMBER : ''}`, GuildSchema);