import { config } from "../config/config";
import { GetRecommand_DataType, MusicType } from "../@types/Music";
import { YoutubeApi } from "./YoutubeApi";
import axios from "axios";
import crypto from "node:crypto";
import { Logger } from "../utils/Logger";

export class YoutubeMusicApi {
  private ORIGIN = "https://music.youtube.com";
  private KEY = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";
  private SAPISID = config.YOUTUBE_MUSIC_TOKEN.split("; ")?.filter(v => v.includes("SAPISID="))[0]?.replace("SAPISID=","") || "";
  private DataOptions = {
    "context": {
      "client": {
        "hl": "ko",
        "gl": "KR",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36,gzip(gfe)",
        "clientName": "WEB_REMIX",
        "clientVersion": "0.1",
        "clientFormFactor": "UNKNOWN_FORM_FACTOR",
        "timeZone": "Asia/Seoul",
        "acceptHeader": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "userInterfaceTheme": "USER_INTERFACE_THEME_LIGHT"
      }
    }
  };
  private HeaderOptions = {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
    "origin": `${this.ORIGIN}`,
    "cookie": `${config.YOUTUBE_MUSIC_TOKEN}`,
    "Accept-Encoding": '*'
  }
  public constructor(private readonly youtube: YoutubeApi) {}
  private async AUTHORIZATION(): Promise<string> {
    const intTime = Math.round(new Date().getTime()/1000.0);
    return await crypto.subtle.digest("SHA-1", new TextEncoder().encode(intTime+" "+this.SAPISID+" "+this.ORIGIN)).then((strHash) => {
      return "SAPISIDHASH" + " " + intTime + "_" + Array.from(new Uint8Array(strHash)).map((intByte) => {
        return intByte.toString(16).padStart(2, '0');
      }).join("");
    });
  }
  public async getVideoByStr(str: string, userId: string): Promise<{ info?: MusicType; err?: string }> {
    const data: any = await axios.post(`${this.ORIGIN}/youtubei/v1/search?key=${this.KEY}&prettyPrint=false`, {
      "query": str,
      ...this.DataOptions
    }, {
      headers: {
        "authorization": await this.AUTHORIZATION(),
        "referer": `${this.ORIGIN}/search?q=${encodeURIComponent(str)}`,
        ...this.HeaderOptions
      },
      responseType: "json"
    }).then(res => res.data).catch((err) => {
      if (config.DEBUG) Logger.error(err.response.data.error);
      return null;
    });
    let d1: any[] = data?.contents?.tabbedSearchResultsRenderer?.tabs || [{}];
    let d2: any[] = d1[0]?.tabRenderer?.content?.sectionListRenderer?.contents;
    let d3 = d2?.filter(d => d.musicCardShelfRenderer?.header?.musicCardShelfHeaderBasicRenderer?.title?.runs[0]?.text === "상위 검색결과");
    if (d3 && d3[0]) {
      if (
        d3[0].musicCardShelfRenderer?.subtitle.runs?.length > 1
        && ![ "아티스트", "재생목록", "앨범", "커뮤니티" /* , "동영상" */ ].includes(d3[0].musicCardShelfRenderer?.subtitle.runs[0]?.text)
        && d3[0].musicCardShelfRenderer?.title?.runs?.length >= 1
      ) {
        let d4 = d3[0].musicCardShelfRenderer?.title?.runs[0]?.navigationEndpoint?.watchEndpoint?.videoId;
        if (d4 && d4.length > 1) return await this.youtube.getVideo(d4, userId);
      }
    }
    let e1 = d2?.filter(d => d.musicShelfRenderer?.title?.runs[0]?.text === "노래");
    if (e1 && e1[0]) {
      let e2 = e1[0].musicShelfRenderer?.contents[0]?.musicResponsiveListItemRenderer?.playlistItemData?.videoId;
      if (e2) return await this.youtube.getVideo(e2, userId);
    }
    return { err: "노래를 찾을수 없습니다." };
  }
  public async getPlayList(id: string, userId: string): Promise<{ videos?: MusicType[]; err?: string }> {
    if (!id.startsWith("VL")) id = "VL" + id;
    const data: any = await axios.post(`${this.ORIGIN}/youtubei/v1/browse?key=${this.KEY}&prettyPrint=false`, {
      "browseId": id,
      ...this.DataOptions
    }, {
      headers: {
        "authorization": await this.AUTHORIZATION(),
        "referer": `${this.ORIGIN}/search?q=${id}`,
        ...this.HeaderOptions
      },
      responseType: "json"
    }).then(res => res.data).catch((err) => {
      if (config.DEBUG) Logger.error(err.response.data.error);
      return null;
    });
    let plName: string | undefined = data?.header?.musicDetailHeaderRenderer?.title?.runs[0]?.text;
    if (!plName) return { err: "플레이리스트를 찾을수 없습니다." };
    let d1: any[] = data.contents?.singleColumnBrowseResultsRenderer?.tabs || [{}];
    let d2: any[] = d1[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [{}];
    let d3: any[] = d2[0]?.musicPlaylistShelfRenderer?.contents || [];
    if (!d3 || d3.length === 0) return { err: "플레이리스트를 찾을수 없습니다." };
    let d4: MusicType[] = [];
    for (let d of d3) {
      if (!d.musicResponsiveListItemRenderer?.playlistItemData?.videoId) continue;
      if (d.musicResponsiveListItemRenderer?.flexColumns?.length < 2) continue;
      if (d.musicResponsiveListItemRenderer?.fixedColumns?.length < 1) continue;
      if (d.musicResponsiveListItemRenderer?.flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.length < 1) continue;
      if (d.musicResponsiveListItemRenderer?.flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.length < 1) continue;
      if (d.musicResponsiveListItemRenderer?.fixedColumns[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.length < 1) continue;
      let title: string | undefined = d.musicResponsiveListItemRenderer?.flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs[0]?.text;
      let thumbnaillist: any[] | undefined = d.musicResponsiveListItemRenderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
      let durations: string[] | undefined = d.musicResponsiveListItemRenderer?.fixedColumns[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs[0]?.text?.split(":")?.map((v: any) => v.length !== 0);
      let author: string | undefined = d.musicResponsiveListItemRenderer?.flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs[0]?.text;
      let id: string | undefined = d.musicResponsiveListItemRenderer?.playlistItemData?.videoId;
      if (!id || !title || !durations || !author || !durations) continue;
      d4.push({
        type: "youtube",
        id: id,
        realId: id,
        title: title,
        duration: durations.length === 3
        ? Number(durations[0])*3600+Number(durations[1])*60+Number(durations[2])
        : durations.length === 2
        ? Number(durations[0])*60+Number(durations[1])
        : Number(durations[0] || "-10"),
        author: author,
        image: (thumbnaillist && thumbnaillist?.length > 0 && thumbnaillist[thumbnaillist.length-1]?.url) ? thumbnaillist[thumbnaillist.length-1].url! : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
        player: userId
      });
    }
    if (d4.length > 0) return { videos: d4 };
    return { err: "플레이리스트를 찾을수 없습니다." };
  }
  public async getRecommand(id: string): Promise<{ videos?: MusicType[]; err?: string; }> {
    try {
      let output_list: MusicType[] = [];
      const authorization = await this.AUTHORIZATION();
      const { first_list, data, err } = await this.getRecommand_First(id, authorization);
      if (!first_list || err) return { err: err || "추천영상을 찾을수 없습니다." };
      output_list = first_list;
      if (!data) return { videos: output_list };
      let getData: GetRecommand_DataType | undefined = data;
      for (let i=0; i<4; i++) {
        const { second_list, data: data2, err: err2 } = await this.getRecommand_Second(id, authorization, getData);
        if (!second_list || err2) break;
        output_list = output_list.concat(second_list);
        if (!data2) break;
        getData = {
          ...getData,
          ...data2
        };
      }
      return { videos: output_list };
    } catch (err) {
      if (config.DEBUG) Logger.error(err);
      return { err: "추천 영상을 찾을수 없습니다." };
    }
  }
  private async getRecommand_First(id: string, authorization: string): Promise<{ first_list?: MusicType[]; err?: string; data?: GetRecommand_DataType }> {
    const data: any = await axios.post(`${this.ORIGIN}/youtubei/v1/next?key=${this.KEY}&prettyPrint=false`, {
      "enablePersistentPlaylistPanel": true,
      "tunerSettingValue": "AUTOMIX_SETTING_NORMAL",
      "playlistId": `RDAMVM${id}`,
      "isAudioOnly": true,
      ...this.DataOptions
    }, {
      headers: {
        "authorization": authorization,
        "referer": `${this.ORIGIN}/watch?v=${id}`,
        ...this.HeaderOptions
      },
      responseType: "json"
    }).then(res => res.data).catch((err) => {
      if (config.DEBUG) Logger.error(err.response.data.error);
      return null;
    });
    let queueContextParams: string | undefined = data?.queueContextParams;
    let videoId: string | undefined = undefined;
    let playlistSetVideoId: string | undefined = undefined;
    let playerParams: string | undefined = undefined;
    let params: string | undefined = undefined;
    let index: number | undefined = undefined;
    let continuation: string | undefined = data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.continuations[0]?.nextRadioContinuationData?.continuation || undefined;
    let d1: any[] = data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents || [];
    let list: MusicType[] = [];
    for (let i=1; i<d1.length; i++) {
      let d2 = d1[i];
      if (!d2) continue;
      let d3 = d2.playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.videoId;
      let d4 = d2.playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.title?.runs[0]?.text;
      let d5 = d2.playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.shortBylineText?.runs[0]?.text;
      let d6 = d2.playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.lengthText?.runs[0]?.text;
      let d7 = d2.playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.thumbnail?.thumbnails && d2.playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.thumbnail?.thumbnails[d2.playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.thumbnail?.thumbnails.length-1]?.url || undefined;
      if (!d3) d3 = d2.playlistPanelVideoRenderer?.videoId;
      if (!d4) d4 = d2.playlistPanelVideoRenderer?.title?.runs[0]?.text;
      if (!d5) d5 = d2.playlistPanelVideoRenderer?.shortBylineText?.runs[0]?.text;
      if (!d6) d6 = d2.playlistPanelVideoRenderer?.lengthText?.runs[0]?.text;
      if (!d7) d7 = d2.playlistPanelVideoRenderer?.thumbnail?.thumbnails && d2.playlistPanelVideoRenderer?.thumbnail?.thumbnails[d2.playlistPanelVideoRenderer?.thumbnail?.thumbnails.length-1]?.url || undefined;
      let d6_2 = -1;
      if (d6_2) {
        let d6l = d6.split(":").map((v: string) => Number(v));
        d6_2 = d6l.length == 3 ? d6l[0]*3600+d6l[1]*60+d6l[2] : d6l.length == 2 ? d6l[0]*60+d6l[1] : d6l[0];
      }
      videoId = d3;
      playlistSetVideoId = d2.playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.navigationEndpoint?.watchEndpoint?.playlistSetVideoId;
      playerParams = d2.playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.navigationEndpoint?.watchEndpoint?.playerParams;
      params = d2.playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.navigationEndpoint?.watchEndpoint?.params;
      index = d2.playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.navigationEndpoint?.watchEndpoint?.index;
      if (!playlistSetVideoId) playlistSetVideoId = d2.playlistPanelVideoRenderer?.navigationEndpoint?.watchEndpoint?.playlistSetVideoId;
      if (!playerParams) playerParams = d2.playlistPanelVideoRenderer?.navigationEndpoint?.watchEndpoint?.playerParams;
      if (!params) params = d2.playlistPanelVideoRenderer?.navigationEndpoint?.watchEndpoint?.params;
      if (!index) index = d2.playlistPanelVideoRenderer?.navigationEndpoint?.watchEndpoint?.index;
      if (!videoId) continue;
      list.push({
        type: "youtube",
        id: videoId,
        realId: videoId,
        title: d4,
        author: d5,
        duration: d6_2,
        image: d7 || '',
        player: "자동재생"
      });
    }
    if (!list) return { err: "추천영상을 찾을수 없습니다." };
    if (queueContextParams && continuation && videoId && playlistSetVideoId && playerParams && params && index) return {
      first_list: list,
      data: { 
        queueContextParams,
        continuation,
        videoId,
        playlistSetVideoId,
        playerParams,
        params,
        index
      }
    };
    return { first_list: list };
  }
  private async getRecommand_Second(id: string, authorization: string, getData: GetRecommand_DataType): Promise<{ second_list?: MusicType[]; err?: string; data?: { playlistSetVideoId: string; continuation: string; index: number; } }> {
    const data: any = await axios.post(`${this.ORIGIN}/youtubei/v1/next?key=${this.KEY}&prettyPrint=false`, {
      "enablePersistentPlaylistPanel": true,
      "tunerSettingValue": "AUTOMIX_SETTING_NORMAL",
      "playlistId": `RDAMVM${id}`,
      "isAudioOnly": true,
      "videoId": `${getData.videoId}`,
      "continuation": `${getData.continuation}`,
      "queueContextParams": `${getData.queueContextParams}`,
      "playlistSetVideoId": `${getData.playlistSetVideoId}`,
      "playerParams": `${getData.playerParams}`,
      "params": `${getData.params}`,
      "index": `${getData.index+1}`,
      ...this.DataOptions
    }, {
      headers: {
        "authorization": authorization,
        "referer": `${this.ORIGIN}/watch?v=${id}`,
        ...this.HeaderOptions
      },
      responseType: "json"
    }).then(res => res.data).catch((err) => {
      if (config.DEBUG) Logger.error(err.response.data.error);
      return null;
    });
    let playlistSetVideoId: string | undefined = undefined;
    let continuation: string | undefined = data?.continuationContents?.playlistPanelContinuation?.continuations[0]?.nextRadioContinuationData?.continuation;
    let index: number | undefined = data?.continuationContents?.playlistPanelContinuation?.numItemsToShow;
    let d1: any[] = data?.continuationContents?.playlistPanelContinuation?.contents || [];
    let list: MusicType[] = [];
    for (let i=0; i<d1.length; i++) {
      let d2 = d1[i];
      if (!d2) continue;
      let d3 = d2.playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.videoId;
      let d4 = d2.playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.title?.runs[0]?.text;
      let d5 = d2.playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.shortBylineText?.runs[0]?.text;
      let d6 = d2.playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.lengthText?.runs[0]?.text;
      let d7 = d2.playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.thumbnail?.thumbnails && d2.playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.thumbnail?.thumbnails[d2.playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.thumbnail?.thumbnails.length-1]?.url || undefined;
      if (!d3) d3 = d2.playlistPanelVideoRenderer?.videoId;
      if (!d4) d4 = d2.playlistPanelVideoRenderer?.title?.runs[0]?.text;
      if (!d5) d5 = d2.playlistPanelVideoRenderer?.shortBylineText?.runs[0]?.text;
      if (!d6) d6 = d2.playlistPanelVideoRenderer?.lengthText?.runs[0]?.text;
      if (!d7) d7 = d2.playlistPanelVideoRenderer?.thumbnail?.thumbnails && d2.playlistPanelVideoRenderer?.thumbnail?.thumbnails[d2.playlistPanelVideoRenderer?.thumbnail?.thumbnails.length-1]?.url || undefined;
      let d6_2 = -1;
      if (d6_2) {
        let d6l = d6.split(":").map((v: string) => Number(v));
        d6_2 = d6l.length == 3 ? d6l[0]*3600+d6l[1]*60+d6l[2] : d6l.length == 2 ? d6l[0]*60+d6l[1] : d6l[0];
      }
      playlistSetVideoId = d2.playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.navigationEndpoint?.watchEndpoint?.playlistSetVideoId;
      if (!playlistSetVideoId) playlistSetVideoId = d2.playlistPanelVideoRenderer?.navigationEndpoint?.watchEndpoint?.playlistSetVideoId;
      if (!d3) continue;
      list.push({
        type: "youtube",
        id: d3,
        realId: d3,
        title: d4,
        author: d5,
        duration: d6_2,
        image: d7,
        player: "자동재생"
      });
    }
    if (!list) return { err: "추천영상을 찾을수 없습니다." };
    if (continuation && playlistSetVideoId && index) return {
      second_list: list,
      data: {
        continuation,
        playlistSetVideoId,
        index
      }
    };
    return { second_list: list };
  }
}