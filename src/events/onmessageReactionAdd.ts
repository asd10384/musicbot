import "dotenv/config";
import { client } from '../index';
import { MessageReaction, PartialMessageReaction, PartialUser, User } from 'discord.js';
import shuffle from '../music/shuffle';
import MDB from "../database/Mongodb";

export default async function onmessageReactionAdd (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
  if (user.bot) return;
  if (!reaction.message.guildId) return;

  let guildDB = await MDB.module.guild.findOne({ id: reaction.message.guildId });
  if (!guildDB) return console.log('reaction 데이터베이스 검색 실패');
  const mc = client.getmc(reaction.message.guild!);

  if (reaction.message.partial) await reaction.message.fetch();
  if (reaction.partial) await reaction.fetch();

  const name = reaction.emoji.name;

  if (reaction.message.channelId === guildDB.channelId) {
    if (name === '⏯️') {
      if (mc.playing) mc.pause();
    }
    if (name === '⏹️') {
      await mc.waitend();
    }
    if (name === '⏭️') {
      if (mc.playing) await mc.skipPlayer(reaction.message);
    }
    if (name === '🔀') {
      if (mc.playing && mc.queuenumber.length > 0) {
        await shuffle(reaction.message);
      }
    }
    reaction.users.remove(user.id);
  }
}