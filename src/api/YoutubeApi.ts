import { config } from "../config/config";
import { HttpsProxyAgent } from "https-proxy-agent";
import { Logger } from "../utils/Logger";
import { MusicType } from "../@types/Music";
import internal from "node:stream";
import ytdl from "ytdl-core";
import ytsr from "ytsr";
import ytpl from "ytpl";
import { YoutubeMusicApi } from "./YoutubeMusicApi";

export class YoutubeApi {
  public youtubeMusic = new YoutubeMusicApi(this);
  private requestOptions = {
    agent: new HttpsProxyAgent(config.PROXY),
    headers: {
      "cookie": config.YOUTUBE_TOKEN
    }
  }
  public async getVideo(id: string, userId: string): Promise<{ info?: MusicType; err?: string; }> {
    const info = await ytdl.getInfo(id, { lang: "KR", requestOptions: this.requestOptions }).catch((err) => {
      if (config.DEBUG) Logger.error(err);
      return null;
    });
    if (!info?.videoDetails) return { err: "영상을 찾을수 없습니다." };
    // if (info.videoDetails.isLiveContent || info.videoDetails.lengthSeconds === "0") return;
    if (!info.videoDetails.availableCountries.includes("KR")) return { err: "한국에세 재생할수 없습니다." };
    return { info: {
      type: "youtube",
      id: info.videoDetails.videoId,
      realId: info.videoDetails.videoId,
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      duration: Number(info.videoDetails.lengthSeconds),
      image: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length-1].url || "",
      player: userId
    } };
  }
  public async getVideoByStr(str: string, userId: string): Promise<{ video?: MusicType; err?: string; }> {
    const id = await ytsr(str, {
      gl: "KO",
      hl: "KR",
      requestOptions: this.requestOptions,
      limit: 1
    }).then((list) => {
      if (!list.items) return null;
      const filter = list.items.filter(v => v.type === "video");
      if (!filter || filter.length === 0 || filter[0].type !== "video") return null;
      return filter[0].id;
    }).catch((err) => {
      if (config.DEBUG) Logger.error(err);
      return null;
    });
    if (!id) return { err: "노래를 찾을수 없습니다." };
    return await this.getVideo(id, userId);
  }
  public async getPlayList(id: string, userId: string): Promise<{ videos?: MusicType[]; err?: string; }> {
    const list = await ytpl(id, {
      gl: "KO",
      hl: "KR",
      limit: 1000000,
      requestOptions: this.requestOptions
    }).catch((err) => {
      if (config.DEBUG) Logger.error(err);
      return null;
    });
    if (!list || list.items.length === 0) return { err: "플레이리스트를 찾을수 없습니다." };
    return {
      videos: list.items.map((item) => {
        return {
          type: "youtube",
          id: item.id,
          realId: item.id,
          title: item.title,
          author: item.author.name,
          duration: Number(item.durationSec || "-10"),
          image: item.bestThumbnail.url || "",
          player: userId
        }
      })
    };
  }
  public async getThumbnail(id: string, defImage: string): Promise<string> {
    const info = await ytdl.getInfo(id, {
      lang: "KR",
      requestOptions: this.requestOptions
    }).catch((err) => {
      if (config.DEBUG) Logger.error(err);
      return null;
    });
    if (info?.videoDetails.thumbnails && info?.videoDetails.thumbnails.length > 0) {
      const images = info.videoDetails.thumbnails.toSorted((a, b) => a.height-b.height);
      return images[images.length-1].url || defImage;
    }
    return defImage;
  }
  public getSource(video: MusicType, seek?: number): internal.Readable | null {
    let options: ytdl.downloadOptions = {
      filter: video.duration === 0 ? undefined : "audioonly",
      quality: video.duration === 0 ? undefined : "highestaudio",
      highWaterMark: 1 << 25,
      dlChunkSize: 0,
      liveBuffer: video.duration === 0 ? 5000 : undefined,
      requestOptions: this.requestOptions,
      begin: seek ? seek.toString()+'s' : undefined
    };
    let ytsource: internal.Readable | null = null;
    try {
      ytsource = ytdl(video.id, options).once("error", (err) => {
        if (config.DEBUG) Logger.error(err);
        return null;
      });
      if (ytsource === null) {
        options.highWaterMark = 1 << 20;
        ytsource = ytdl(video.id, options).once("error", (err) => {
          if (config.DEBUG) Logger.error(err);
          return null;
        });
      }
    } catch {}
    return ytsource;
  }
}