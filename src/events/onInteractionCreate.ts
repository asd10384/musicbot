import { QDB } from "../databases/Quickdb";
import { ButtonInteraction, Interaction, User } from "discord.js";
import { client, handler } from "..";
import { checkChannel } from "./onmessageReactionAdd";

export const onInteractionCreate = async (interaction: Interaction) => {
  if (interaction.isStringSelectMenu()) {
    await interaction.deferReply({ ephemeral: true, fetchReply: true }).catch(() => {});
    const commandName = interaction.customId;
    const args = interaction.values;
    const command = handler.commands.get(commandName);
    if (command && command.menuRun) return command.menuRun(interaction, args);
  }
  
  if (interaction.isButton()) {
    const args = interaction.customId.split("-");
    if (!args || args.length === 0) return;
    if (args[0] === "music") {
      return music(interaction, args[1]);
    }
    await interaction.deferReply({ ephemeral: true, fetchReply: true });
    const command = handler.commands.get(args.shift()!);
    if (command && command.buttonRun) return command.buttonRun(interaction, args);
  }

  if (!interaction.isCommand()) return;

  /**
   * 명령어 친사람만 보이게 설정
   * ephemeral: true
   */
  await interaction.deferReply({ ephemeral: true, fetchReply: true });
  handler.runCommand(interaction);
}

async function music(interaction: ButtonInteraction, cmd: string) {
  const mc = client.getmc(interaction.guild!);

  if (cmd === "play_pause") {
    if (mc.playing && await checkChannel(interaction.message, interaction.member!.user as User)) mc.pause();
  }
  if (cmd === "stop") {
    mc.stop({});
  }
  if (cmd === "skip") {
    if (mc.playing && await checkChannel(interaction.message, interaction.member!.user as User)) await mc.skipPlayer();
  }
  if (cmd === "shuffle") {
    if (mc.playing && await checkChannel(interaction.message, interaction.member!.user as User) && mc.queue.length > 0) {
      mc.shuffle();
    }
  }
  if (cmd === "recommand") {
    const gdb = await QDB.guild.get(interaction.guild!);
    QDB.guild.set(interaction.guild!, { options: {
      ...gdb.options,
      recommend: !gdb.options.recommend
    } }).then((val) => {
      if (val) mc.setMsg({});
    });
  }
  interaction.deferUpdate({ fetchReply: false }).catch(() => {});
}
