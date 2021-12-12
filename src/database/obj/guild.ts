import { config } from "dotenv";
import { Document, model, Schema } from "mongoose";
config();

export interface music {
  playing: boolean;
  nowplaying: nowplay | null;
  queue: nowplay[]
};

export interface nowplay {
  title: string,
  author: string,
  duration: string,
  url: string,
  image: string,
  player: string
};

export interface guild_type extends Document {
  id: string,
  name: string,
  prefix: string,
  role: string[],
  channelId: string,
  msgId: string,
  options: {
    volume: number,
    player: boolean,
    listlimit: number,
    author: boolean
  }
}

const GuildSchema: Schema = new Schema({
  id: { type: String, required: true },
  name: { type: String },
  prefix: { type: String, default: (process.env.PREFIX) ? process.env.PREFIX : 'm;' },
  role: { type: Array },
  channelId: { type: String },
  msgId: { type: String },
  options: {
    volume: { type: Number },
    player: { type: Boolean },
    listlimit: { type: Number },
    author: { type: Boolean }
  }
});

export const guild_model = model<guild_type>(`Guild${(process.env.BOT_NUMBER) ? process.env.BOT_NUMBER : ''}`, GuildSchema);