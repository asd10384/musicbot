import "dotenv/config";
import axios from "axios";
import { nowplay } from "./musicClass";

interface Data { queueContextParams: string; continuation: string; videoId: string; playlistSetVideoId: string; playerParams: string; params: string; index: number; };

const KEY = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";
const CONTENTCLIENTVERSION = process.env.YOUTUBE_CONTENTCLIENTVERSION;
const AUTHORIZATION = process.env.YOUTUBE_MUSIC_AUTHORIZATION;
const COOKIE = process.env.YOUTUBE_MUSIC_COOKIE;

export const getRecommand = async (vid: string): Promise<{ videoList?: nowplay[]; err?: string; }> => {
  if (!AUTHORIZATION) return { err: "authorization을 찾을수 없음" };
  let output_list: nowplay[] = [];
  const { list, data, err } = await getDataFirst(vid);
  if (!list || err) return { err: err || "추천영상을 찾을수 없음4" };
  output_list = list;
  // console.log(id);
  if (!data) return { videoList: output_list };
  let getData: Data | undefined = data;
  for (let i=0; i<4; i++) {
    const { list: list2, playlistSetVideoId, continuation, index, err: err2 } = await getDataSecond(vid, getData);
    if (err2 || !list2 || !playlistSetVideoId || !continuation || !index) break;
    output_list = output_list.concat(list2);
    getData.playlistSetVideoId = playlistSetVideoId;
    getData.continuation = continuation;
    getData.index += index;
    getData.videoId = list2[list2.length-1].id;
  }
  return { videoList: output_list };
}

async function getDataFirst(vid: string) {
  return new Promise<{ data?: Data; list?: nowplay[]; err?: string; }>((res) => {
    axios.post(`https://music.youtube.com/youtubei/v1/next?key=${KEY}&prettyPrint=false`, {
      "enablePersistentPlaylistPanel": true,
      "tunerSettingValue": "AUTOMIX_SETTING_NORMAL",
      "playlistId": `RDAMVM${vid}`,
      "isAudioOnly": true,
      "context": {
        "client": {
          "hl": "ko",
          "gl": "KR",
          "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36,gzip(gfe)",
          "clientName": "WEB_REMIX",
          "clientVersion": `${CONTENTCLIENTVERSION}`,
          "clientFormFactor": "UNKNOWN_FORM_FACTOR",
          "timeZone": "Asia/Seoul",
          "acceptHeader": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "userInterfaceTheme": "USER_INTERFACE_THEME_LIGHT"
        }
      }
    }, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
        "origin": "https://music.youtube.com",
        "referer": `https://music.youtube.com/watch?v=${vid}`,
        "cookie": `${COOKIE}`,
        "authorization": `${AUTHORIZATION}`,
        'Accept-Encoding': '*'
      },
      responseType: "json"
    }).then(async (res2) => {
      try {
        let queueContextParams: string | undefined = res2.data?.queueContextParams;
        let videoId: string | undefined = undefined;
        let playlistSetVideoId: string | undefined = undefined;
        let playerParams: string | undefined = undefined;
        let params: string | undefined = undefined;
        let index: number | undefined = undefined;
        let continuation: string | undefined = res2.data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.continuations[0]?.nextRadioContinuationData?.continuation || undefined;
        let d1 = res2.data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents;
        let list: nowplay[] = [];
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
          list.push({
            id: d3,
            title: d4,
            author: d5,
            duration: d6_2.toString(),
            image: d7,
            player: "자동재생"
          });
        }
        if (list) {
          if (queueContextParams && continuation && videoId && playlistSetVideoId && playerParams && params && index) return res({
            list,
            data: { queueContextParams, continuation, videoId, playlistSetVideoId, playerParams, params, index }
          });
          return res({ list });
        }
        return res({ err: "추천영상을 찾을수 없음2" });
      } catch (err) {
        // console.log(err);
        return res({ err: "추천영상을 찾을수 없음1" });
      }
    }).catch(() => {
      // console.log(err);
      return res({ err: "키를 찾을수 없음1" });
    })
  });
}

async function getDataSecond(vid: string, data: Data) {
  return new Promise<{ list?: nowplay[]; playlistSetVideoId?: string; continuation?: string; index?: number; err?: string; }>((res) => {
    axios.post(`https://music.youtube.com/youtubei/v1/next?key=${KEY}&prettyPrint=false`, {
      "enablePersistentPlaylistPanel": true,
      "tunerSettingValue": "AUTOMIX_SETTING_NORMAL",
      "playlistId": `RDAMVM${vid}`,
      "isAudioOnly": true,
      "videoId": `${data.videoId}`,
      "continuation": `${data.continuation}`,
      "queueContextParams": `${data.queueContextParams}`,
      "playlistSetVideoId": `${data.playlistSetVideoId}`,
      "playerParams": `${data.playerParams}`,
      "params": `${data.params}`,
      "index": `${data.index+1}`,
      "context": {
        "client": {
          "hl": "ko",
          "gl": "KR",
          "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36,gzip(gfe)",
          "clientName": "WEB_REMIX",
          "clientVersion": `${CONTENTCLIENTVERSION}`,
          "clientFormFactor": "UNKNOWN_FORM_FACTOR",
          "timeZone": "Asia/Seoul",
          "acceptHeader": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "userInterfaceTheme": "USER_INTERFACE_THEME_LIGHT"
        }
      }
    }, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
        "origin": "https://music.youtube.com",
        "referer": `https://music.youtube.com/watch?v=${data.videoId}&list=RDAMVM${vid}`,
        "cookie": `${COOKIE}`,
        "authorization": `${AUTHORIZATION}`,
        'Accept-Encoding': '*'
      },
      responseType: "json"
    }).then(async (res2) => {
      try {
        let playlistSetVideoId: string | undefined = undefined;
        let continuation: string | undefined = res2.data?.continuationContents?.playlistPanelContinuation?.continuations[0]?.nextRadioContinuationData?.continuation;
        let index: number | undefined = res2.data?.continuationContents?.playlistPanelContinuation?.numItemsToShow;
        let d1 = res2.data?.continuationContents?.playlistPanelContinuation?.contents;
        let list: nowplay[] = [];
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
          list.push({
            id: d3,
            title: d4,
            author: d5,
            duration: d6_2.toString(),
            image: d7,
            player: "자동재생"
          });
        }
        if (list) return res({ list, playlistSetVideoId, continuation, index });
        return res({ err: "추천영상을 찾을수 없음2" });
      } catch (err) {
        // console.log(err);
        return res({ err: "추천영상을 찾을수 없음1" });
      }
    }).catch(() => {
      // console.log(err);
      return res({ err: "키를 찾을수 없음1" });
    })
  });
}
