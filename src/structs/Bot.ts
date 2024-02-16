import { join } from "node:path";
import { readdirSync } from "node:fs";
import { ActivityType, ApplicationCommandData, ButtonInteraction, ChannelType, Client, Collection, DefaultRestOptions, Events, GuildMember, Interaction, Message, REST, Routes, VoiceBasedChannel, VoiceState } from "discord.js";
import { Logger } from "../utils/Logger";
import { config } from "../config/config";
import { Command } from "../interfaces/Command";
import { checkPermission } from "../utils/checkPermission";
import { msgDelete } from "../utils/msgDelete";
import { embedCreate } from "../utils/embedCreate";
import { DataBaseClass } from "./Database";
import { MusicClass } from "./Music";
import { Prisma } from "@prisma/client";

export class BotClass {
  public db = new DataBaseClass();
  public music = new MusicClass(this);
  public commandsMap = new Collection<string, Command>();
  private slashCommandsData: ApplicationCommandData[] = [];

  public constructor(public readonly client: Client) {
    // 명령어 불러오기
    const commandFiles = readdirSync(join(__dirname, "..", "commands")).filter(file => file.endsWith(".ts") || file.endsWith(".js"));
    for (const file of commandFiles) {
      const command: Command = new (require(join(__dirname, "..", "commands", `${file}`)).default)();
      this.commandsMap.set(command.name, command);
      if (command.slashRun && command.data) this.slashCommandsData.push(command.data);
    }

    // 오류 처리
    if (!config.DEBUG) this.client.on(Events.Warn, (content) => Logger.warn(content));
    if (!config.DEBUG) this.client.on(Events.Error, (content) => Logger.error(content));

    // 준비 이벤트
    this.client.on(Events.ClientReady, () => {
      Logger.ready(`Bot Ready!: ${this.client.user?.username}`);
      Logger.ready(`prefix: ${config.prefix}`);
      Logger.ready(`debug: ${config.DEBUG}`);

      this.registerSlashCommands();

      this.client.user?.setActivity({
        name: `${config.prefix}help 입력`,
        type: ActivityType.Playing,
      });
      
      // music reset
      for (const guild of Array.from(this.client.guilds.cache.values())) {
        this.music.getId(guild).then(async (val) => {
          if (val.channelId.length === 0) return;
          this.music.setMSG(guild);
        });
      }
    });
    
    // 이벤트 모음
    this.client.on(Events.InteractionCreate, (interaction) => this.onInteractionCreate(interaction));
    this.client.on(Events.MessageCreate, (message) => this.onMessageCreate(message));
    this.client.on(Events.VoiceStateUpdate, (oldState, newState) => this.onVoiceStateUpdate(oldState, newState));

    // 로그인
    this.client.login(config.TOKEN);
  }

  private async registerSlashCommands() {
    if (!config.slashCommand) return;
    const rest = new REST({ version: DefaultRestOptions.version }).setToken(config.TOKEN);
    rest.put(Routes.applicationCommands(this.client.user!.id), { body: [] }).then(() => Logger.ready(`Successfully deleted commands.`));
    if (config.DEV_SERVERID.length > 0) await rest.put(Routes.applicationGuildCommands(this.client.user!.id, config.DEV_SERVERID), { body: [] }).then(() => Logger.ready(`Successfully deleted commands for guild: ${config.DEV_SERVERID}`));
    
    if (config.DEV) await rest.put(Routes.applicationGuildCommands(this.client.user!.id, config.DEV_SERVERID), { body: this.slashCommandsData }).then(() => Logger.ready(`Registered commands for guild: ${config.DEV_SERVERID}`));
    else await rest.put(Routes.applicationCommands(this.client.user!.id), { body: this.slashCommandsData }).then(() => Logger.ready(`Registered commands.`));
    return;
  }

  private async onInteractionCreate(interaction: Interaction) {
    if (interaction.isButton()) {
      const args = interaction.customId.split('-');
      if (!args || args.length === 0) return;
      if (args[0] === "music") return this.musicButtonInteraction(interaction, args[1]);
      const command = this.commandsMap.get(args[0]);
      if (command?.btnRun) return command.btnRun(interaction, args.slice(1));
    }

    if (interaction.isStringSelectMenu()) {
      const commandName = interaction.customId;
      const args = interaction.values;
      const command = this.commandsMap.get(commandName);
      if (command?.menuRun) return command.menuRun(interaction, args);
    }
    if (!interaction.isCommand()) return;

    const command = this.commandsMap.get(interaction.commandName);
    if (!command) return;
    
    if (!await checkPermission(interaction.member as GuildMember)) return interaction.reply({
      embeds: [ embedCreate({
        title: `이 명령어를 사용할\n권한이 없습니다.`,
        color: "DarkRed"
      }) ],
      ephemeral: true
    });
    if (command.slashRun) return command.slashRun(interaction).catch(() => {});
    return;
  }

  private async onMessageCreate(message: Message) {
    if (message.author.bot || message.channel.type === ChannelType.DM) return;
    if (message.content.startsWith(config.prefix)) {
      const content = message.content.slice(config.prefix.length).trim();
      const args = content.split(/ +/g);
      const commandName = args.shift()?.toLowerCase();
      if (!commandName) return;
      try {
        const command = this.commandsMap.get(commandName) || this.commandsMap.find(cmd => cmd.alias.includes(commandName));
        if (command?.msgRun) return command.msgRun(message, args);
        if (!commandName || commandName == '') return;
        message.channel.send({ embeds: [ embedCreate({
          description: `\` ${commandName} \` 이라는 명령어를 찾을수 없습니다.`,
          footer: { text: `${config.prefix}help를 입력해 명령어를 확인해주세요.` },
          color: "DarkRed"
        }) ] }).then(m => msgDelete(m, 1));
      } catch (err) {
        if (config.DEBUG) Logger.error(err);
        if (!commandName || commandName == '') return;
        message.channel.send({ embeds: [ embedCreate({
          description: `\` ${commandName} \` 이라는 명령어를 찾을수 없습니다.`,
          footer: { text: `${config.prefix}help를 입력해 명령어를 확인해주세요.` },
          color: "DarkRed"
        }) ] }).then(m => msgDelete(m, 1));
      } finally {
        msgDelete(message, 0, true);
      }
    } else {
      const guild = message.guild!;
      const channel = message.channel;
      const member = message.member!;
      const content = message.content;
      try {
        // 채널 확인
        const { channelId } = await this.music.getId(guild);
        if (channel.id !== channelId) return;
        // 메시지 삭제
        msgDelete(message, 0, true);
        let mdb = this.music.getMDB(guild.id);
        // 음성채널 확인
        if (!mdb.subscription?.connection && !member.voice.channel) return channel.send({ embeds: [ embedCreate({
          title: `\` 음성채널 오류 \``,
          description: `음성채널에 들어간 다음 사용해주세요.`,
          color: "DarkRed"
        }) ] }).then(m => msgDelete(m, 1));
        // 검색
        let { info, videos, parmas, err } = await this.music.search(content.replace(/ +/g,' ').trim(), member.user.id);
        // 오류 확인
        if (err || (!info && !videos)) channel.send({ embeds: [ embedCreate({
          title: `\` 재생오류 \``,
          description: err || "영상을 찾을수 없습니다.",
          color: "DarkRed"
        }) ] }).then(m => msgDelete(m, 1));
        // 재생중인 노래 확인
        if (mdb.playing) {
          if (info) this.music.setMDB(guild.id, { queue: parmas?.first ? [ info, ...mdb.queue ] : [ ...mdb.queue, info ] });
          if (videos) this.music.setMDB(guild.id, { queue: parmas?.first ? [ ...videos, ...mdb.queue ] : [ ...mdb.queue, ...videos ] });
          this.music.setMSG(guild);
          return;
        }
        // 리스트인지 확인
        if (videos) {
          info = videos[0];
          this.music.setMDB(guild.id, { queue: parmas?.first ? [ ...videos.slice(1), ...mdb.queue ] : [ ...mdb.queue, ...videos.slice(1) ] });
        }
        // 재생
        this.music.play(guild, info, !mdb.subscription?.connection ? member.voice.channel as VoiceBasedChannel : undefined);
        return;
      } catch (err) {
        if (config.DEBUG) Logger.error(err);
        channel.send({ embeds: [ embedCreate({
          title: `\` 재생오류 \``,
          description: "알수없는 오류가 발생했습니다.",
          color: "DarkRed"
        }) ] }).then(m => msgDelete(m, 1));
      }
    }
  }

  private musicButtonInteraction(interaction: ButtonInteraction, cmd: string) {
    if (cmd === "play_pause") this.music.pause(interaction.guild!);
    if (cmd === "stop") this.music.stop(interaction.guild!);
    if (cmd === "skip") this.music.skip(interaction.guild!);
    if (cmd === "shuffle") this.music.shuffle(interaction.guild!);
    if (cmd === "recommand") {
      this.db.guild.get(interaction.guild!.id).then((gdb) => {
        if (!gdb) return;
        this.db.guild.set(interaction.guild!.id, {
          options: {
            recommand: (gdb.options as Prisma.JsonObject).recommand ? false : true
          }
        }).then((val) => {
          if (!val) return;
          this.music.setMDB(interaction.guild!.id, { options: val.options as Prisma.JsonObject });
          this.music.setMSG(interaction.guild!);
        });
      });
    }
    interaction.deferUpdate({ fetchReply: false }).catch(() => {});
  }

  private onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    if (oldState.member?.user.id === this.client.user!.id && !newState.channel) return this.music.stop(oldState.guild);
    const clientMember = oldState.guild.members.cache.get(this.client.user!.id);
    const memberSize = clientMember?.voice.channel?.members.filter(m => !m.user.bot).size;
    if (memberSize === undefined) return;
    let mdb = this.music.getMDB(oldState.guild.id);
    if (mdb.autoPause && memberSize > 0) return this.music.pause(oldState.guild, false);
    if (memberSize === 0) return this.music.pause(oldState.guild, true);
  }
}