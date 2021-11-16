import { config } from "dotenv";
import { Document, model, Schema } from "mongoose";
config();

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
  playing: boolean,
  nowplay: nowplay,
  queue: nowplay[],
  options: {
    volume: number,
    player: boolean,
    listlimit: number
  }
}

const GuildSchema: Schema = new Schema({
  id: { type: String, required: true },
  name: { type: String },
  prefix: { type: String, default: (process.env.PREFIX) ? process.env.PREFIX : 'm;' },
  role: { type: Array },
  channelId: { type: String },
  msgId: { type: String },
  playing: { type: Boolean },
  nowplay: {
    title: { type: String },
    author: { type: String },
    duration: { type: String },
    url: { type: String },
    image: { type: String },
    player: { type: String }
  },
  queue: { type: Array },
  options: {
    volume: { type: Number },
    player: { type: Boolean },
    listlimit: { type: Number }
  }
});

export const guild_model = model<guild_type>('Guild', GuildSchema);