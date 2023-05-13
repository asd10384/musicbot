import "dotenv/config";
import { Guild, GuildMember } from "discord.js";
import { QuickDB } from "quick.db";
import { client } from "..";
import { nowplay } from "../music/musicClass";

const qdb = new QuickDB({
  filePath: process.env.DB_FILE_PATH || "./dbfile.sqlite"
});

export const BOT_NUMBER = (process.env.BOT_NUMBER) ? process.env.BOT_NUMBER : '';

export interface music {
  playing: boolean;
  nowplaying: nowplay | null;
  queue: nowplay[];
  queuenumber: number[];
};

/** Guild DB */
export interface guildData {
  id: string;
  name: string;
  prefix: string;
  role: string[];
  channelId: string;
  msgId: string;
  queue: nowplay[];
  options: {
    volume: number;
    player: boolean;
    listlimit: number;
    author: boolean;
    recommend: boolean;
  }
}
interface getguildData {
  id?: string;
  name?: string;
  prefix?: string;
  role?: string[];
  channelId?: string;
  msgId?: string;
  queue?: nowplay[];
  options?: {
    volume: number;
    player: boolean;
    listlimit: number;
    author: boolean;
    recommend: boolean;
  }
}

/** User DB */
export interface userData {
  id: string;
  name: string;
  guildList: string[];
}
interface getuserData {
  id?: string;
  name?: string;
  guildList?: string[];
}

/** Guild DB */
const guild_get = (guild: Guild) => new Promise<guildData>(async (res) => {
  let get = await qdb.table("guild").get<guildData>("s"+guild.id);
  if (get) {
    get.name = guild.name;
    return res(get);
  }
  let data: guildData = {
    id: guild.id,
    prefix: client.prefix,
    name: "",
    role: [],
    channelId: "",
    msgId: "",
    queue: [],
    options: {
      volume: 50,
      player: true,
      listlimit: 300,
      author: true,
      recommend: false
    }
  };
  await qdb.table("guild").set("s"+guild.id, data).catch(() => {});
  return res(data);
});

const guild_set = (guild: Guild, getqdb: getguildData) => new Promise<boolean>(async (res) => {
  let get = await guild_get(guild);
  await qdb.table("guild").set("s"+guild.id, {
    ...get,
    ...getqdb
  }).then(() => {
    return res(true);
  }).catch(() => {
    return res(false);
  });
});

const guild_del = (guildId: string) => new Promise<boolean>(async (res) => {
  await qdb.table("guild").delete("s"+guildId).then(() => {
    return res(true);
  }).catch(() => {
    return res(false);
  });
});

const guild_all = () => new Promise<guildData[]>(async (res) => {
  await qdb.table("guild").all().then((data) => {
    return res(data.map(val => val.value));
  }).catch(() => {
    return res([]);
  });
});

const guild_queue = (guildId: string) => new Promise<nowplay[]>(async (res) => {
  let get = await qdb.table("guild").get<guildData>("s"+guildId);
  return res(get?.queue ?? []);
});

const guild_addqueue = (guildId: string, nowplay: nowplay) => new Promise<nowplay[]>(async (res) => {
  let get = await qdb.table("guild").get<guildData>("s"+guildId);
  if (!get) return res([]);
  get.queue.push(nowplay);
  await qdb.table("guild").set("s"+guildId, get).then(() => {
    return res(get!.queue);
  }).catch(() => {
    return res(get!.queue);
  });
});

const guild_setqueue = (guildId: string, nowplaylist: nowplay[]) => new Promise<nowplay[]>(async (res) => {
  let get = await qdb.table("guild").get<guildData>("s"+guildId).catch(() => {
    return null;
  });
  if (!get) return res([]);
  get.queue = nowplaylist;
  await qdb.table("guild").set("s"+guildId, get).then(() => {
    return res(nowplaylist);
  }).catch(() => {
    return res(get!.queue);
  });
});

/** User DB */
const user_get = (guild: Guild, member: GuildMember) => new Promise<userData>(async (res, _rej) => {
  await guild_get(guild).catch(() => {});
  let get = await qdb.table("user").get<userData>("s"+member.id);
  if (get) {
    if (!get.guildList.includes(guild.id)) get.guildList.push(guild.id);
    get.name = member.user.tag;
    return res(get);
  }
  let data: userData = {
    id: member.id,
    name: member.user.tag,
    guildList: []
  };
  await qdb.table("user").set("s"+member.id, data).catch(() => {});
  return res(data);
});

const user_set = (guild: Guild, member: GuildMember, getqdb: getuserData) => new Promise<boolean>(async (res, _rej) => {
  const get = await user_get(guild, member);
  await qdb.table("user").set("s"+member.id, {
    ...get,
    ...getqdb
  }).then(() => {
    return res(true);
  }).catch(() => {
    return res(false);
  });
});

const user_del = (guildId: string, userId: string) => new Promise<boolean>(async (res, _rej) => {
  await qdb.table("user").get<userData>("s"+userId).then(async (data) => {
    if (data?.guildList.includes(guildId)) {
      data.guildList = data.guildList.filter(val => val != guildId);
      await qdb.table("user").set("s"+userId, data).then(() => {
        return res(true);
      }).catch(() => {
        return res(false);
      });
    }
  }).catch(() => {
    return res(false);
  });
});

const user_all = (guildId: string) => new Promise<userData[]>(async (res, _rej) => {
  await qdb.table("user").all().then((data) => {
    return res(data.map(val => val.value).filter((val: userData) => val.guildList.includes(guildId)));
  }).catch(() => {
    return res([]);
  });
});

export const QDB = {
  guild: {
    get: guild_get,
    set: guild_set,
    del: guild_del,
    all: guild_all,
    queue: guild_queue,
    addqueue: guild_addqueue,
    setqueue: guild_setqueue
  },
  user: {
    get: user_get,
    set: user_set,
    del: user_del,
    all: user_all
  }
};