import "dotenv/config";
import { client } from '../index';
import { GuildMember, MessageReaction, PartialMessageReaction, PartialUser, User } from 'discord.js';
import shuffle from '../music/shuffle';
import QDB from "../database/Quickdb";
import { M, PM } from "../aliases/discord.js";

export default async function onmessageReactionAdd (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
  if (user.bot) return;
  if (!reaction.message.guildId) return;

  let guildDB = await QDB.get(reaction.message.guild!);
  const mc = client.getmc(reaction.message.guild!);

  if (reaction.message.partial) await reaction.message.fetch();
  if (reaction.partial) await reaction.fetch();

  const name = reaction.emoji.name;

  if (reaction.message.channelId === guildDB.channelId) {
    if (name === '⏯️') {
      if (mc.playing && await checkchannel(reaction.message, user)) mc.pause();
    }
    if (name === '⏹️') {
      await QDB.setqueue(reaction.message.guildId, []);
      mc.players[0]?.player.stop();
    }
    if (name === '⏭️') {
      if (mc.playing && await checkchannel(reaction.message, user)) await mc.skipPlayer();
    }
    if (name === '🔀') {
      if (mc.playing && await checkchannel(reaction.message, user) && (await QDB.queue(reaction.message.guildId)).length > 0) {
        await shuffle(reaction.message);
      }
    }
    reaction.users.remove(user.id);
  }
}

async function checkchannel(message: M | PM, user: User | PartialUser) {
  const bot = await message.guild?.members.fetchMe({ cache: true });
  const member = message.guild?.members.cache.get(user.id);
  if (member?.voice?.channelId && bot?.voice?.channelId && member?.voice?.channelId === bot?.voice?.channelId) return true;
  message.channel.send({ embeds: [
    client.mkembed({
      title: '음성채널을 찾을수 없습니다.',
      description: '음성채널에 들어가서 사용해주세요.',
      footer: { text: `${member?.nickname || user.username}님에게 보내는 메세지` },
      color: "DarkRed"
    })
  ] }).then(m => client.msgdelete(m, 1));
  return false;
}