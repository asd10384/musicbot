import "dotenv/config";
import { Guild } from "discord.js";
import { client } from "../index";
import { QuickDB } from "quick.db";
const qdb = new QuickDB({
  filePath: process.env.DBFILEPATH || "./dbfile.sqlite"
});

export const BOT_NUMBER = (process.env.BOT_NUMBER) ? process.env.BOT_NUMBER : '';

export default {
  get,
  set,
  del,
  all,
  queue,
  addqueue,
  setqueue
}

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

export interface guilddata {
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
interface getguilddata {
  id?: string;
  name?: string;
  prefix?: string;
  role?: string[];
  channelId?: string;
  msgId?: string;
  options?: {
    volume: number;
    player: boolean;
    listlimit: number;
    author: boolean;
    recommend: boolean;
  }
  [key: string]: any;
}

function get(guild: Guild) {
  return new Promise<guilddata>(async (res, rej) => {
    qdb.table("s"+guild.id).all().then(async (guilddata) => {
      let output: {[key: string]: any} = {};
      if (guilddata.length === 0 || guilddata.some((val) => val.id !== "id")) {
        let serverlist: string[] = await qdb.get("ids") || [];
        if (!serverlist.includes(guild.id)) {
          serverlist.push(guild.id);
          await qdb.set("ids", serverlist);
        }
        let data: guilddata = {
          id: guild.id,
          prefix: client.prefix,
          name: "",
          channelId: "",
          msgId: "",
          role: [],
          options: {
            volume: 50,
            player: true,
            listlimit: 300,
            author: true,
            recommend: false
          }
        };
        output = data;
      }
      for (let val of guilddata) {
        output[val.id] = val.value;
      }
      output["name"] = guild.name;
      await set(guild.id, output as any);
      return res(output as any);
    }).catch(rej);
  });
}

function set(guildId: string, getqdb: getguilddata) {
  return new Promise<boolean>(async (res, rej) => {
    try {
      const keys = Object.keys(getqdb);
      for (let key of keys) {
        await qdb.table("s"+guildId).set(key, getqdb[key]);
      }
      return res(true);
    } catch (err) {
      return rej(err);
    }
  });
}

function del(guildId: string) {
  return new Promise<boolean>((res, rej) => {
    qdb.table("s"+guildId).deleteAll().then(async (val) => {
      let serverlist: string[] = await qdb.get("ids") || [];
      await qdb.set("ids", serverlist.filter(id => id !== guildId));
      return res(true);
    }).catch(rej);
  });
}
function all() {
  return new Promise<guilddata[]>(async (res, rej) => {
    try {
      let serverlist: string[] = await qdb.get("ids") || [];
      let output: guilddata[] = [];
      for (let guildId of serverlist) {
        let guilddata = await qdb.table("s"+guildId).all();
        let output2: {[key: string]: any} = {};
        for (let val of guilddata) {
          output2[val.id] = val.value;
        }
        output.push(output2 as any);
      }
      return res(output);
    } catch (err) {
      return rej(err);
    }
  });
}

function queue(guildId: string) {
  return new Promise<nowplay[]>(async (res, rej) => {
    try {
      let data = await qdb.table("s"+guildId).get<nowplay[]>("data") || [];
      return res(data);
    } catch (err) {
      return rej(err);
    }
  });
}

function addqueue(guildId: string, nowplay: nowplay) {
  return new Promise<nowplay[]>(async (res, rej) => {
    try {
      let data = await qdb.table("s"+guildId).get<nowplay[]>("data") || [];
      data.push(nowplay);
      await qdb.table("s"+guildId).set("data", data);
      return res(data);
    } catch (err) {
      return rej(err);
    }
  });
}
function setqueue(guildId: string, nowplaylist: nowplay[]) {
  return new Promise<nowplay[]>(async (res, rej) => {
    try {
      await qdb.table("s"+guildId).set("data", nowplaylist);
      return res(nowplaylist);
    } catch (err) {
      return rej(err);
    }
  });
}