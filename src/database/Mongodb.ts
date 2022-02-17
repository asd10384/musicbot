import "dotenv/config";
import { I, M } from "../aliases/discord.js";
import { connect } from "mongoose";
import { GuildMember, PartialMessage, SelectMenuInteraction, VoiceState } from "discord.js";
import { guild_type, guild_model } from "./obj/guild";
import { user_type, user_model } from "./obj/user";

const mongodb_url = process.env.MONGODB_URL;
connect(mongodb_url!, (err) => {
  if (err) return console.error(err);
  console.log(`mongodb 연결 성공`);
});
const out = {
  module: {
    guild: guild_model,
    user: user_model
  },
  get: {
    guild: guild_get,
    user: user_get
  }
};

export default out;

async function guild_get(msg: M | I | VoiceState | PartialMessage | SelectMenuInteraction) {
  let guildDB: guild_type | null = await guild_model.findOne({ id: msg.guild?.id! });
  if (guildDB) {
    if (guildDB.name === msg.guild!.name) {
      guildDB.name = msg.guild!.name;
      await guildDB.save().catch((err) => {});
    }
    return guildDB;
  } else {
    await guild_model.findOneAndDelete({ id: msg.guild!.id }).catch((err) => {});
    const guildDB: guild_type = new guild_model({});
    guildDB.id = msg.guild!.id;
    guildDB.name = msg.guild!.name;
    await guildDB.save().catch((err) => {});
    return guildDB;
  }
}

async function user_get(member: GuildMember) {
  let userDB: user_type | null = await user_model.findOne({ id: member.user.id });
  if (userDB) {
    let check: boolean = false;
    if (userDB.tag === member.user.tag) {
      check = true;
      userDB.tag = member.user.tag;
    }
    if (userDB.nickname === ((member.nickname) ? member.nickname : member.user.username)) {
      check = true;
      userDB.nickname = (member.nickname) ? member.nickname : member.user.username;
    }
    if (check) await userDB.save().catch((err) => {});
    return userDB;
  } else {
    await user_model.findOneAndDelete({ id: member.user.id }).catch((err) => {});
    const userDB: user_type = new user_model({});
    userDB.id = member.user.id;
    userDB.tag = member.user.tag;
    userDB.nickname = (member.nickname) ? member.nickname : member.user.username;
    await userDB.save().catch((err: any) => {});
    return userDB;
  }
}