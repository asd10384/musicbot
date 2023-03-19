import axios from "axios";
import { checkvideo } from "./checkvideo";
import { key, contentClientVersion, Bdata } from "./data";
import { nowplay } from "./musicClass";

const { authorization, cookie } = Bdata;

const isNum = (n: any) => !isNaN(n);

const max = process.env.YOUTUBE_MUSIC_MAX && isNum(process.env.YOUTUBE_MUSIC_MAX) ? Number(process.env.YOUTUBE_MUSIC_MAX) : 2;
const min = 1;

export const recommand = async (recomlist: string[], vid: string): Promise<[ string | undefined, nowplay | undefined, string ] | [ undefined, string ]> => {
  if (!authorization) return [ undefined, "authorization을 찾을수 없음" ];

  const getvid = await getData(vid, recomlist);
  if (!getvid[0]) return [ undefined, undefined, getvid[1] ];
  // console.log(getvid);
  let checkv = await checkvideo({ url: `https://www.youtube.com/watch?v=${getvid[0]}` });
  if (checkv[0]) {
    let getinfo = checkv[1].videoDetails;
    return [ getvid[0], {
      title: getinfo.title,
      duration: getinfo.lengthSeconds,
      author: getinfo.author!.name,
      url: getinfo.video_url,
      image: (getinfo.thumbnails.length > 0 && getinfo.thumbnails[getinfo.thumbnails.length-1]?.url) ? getinfo.thumbnails[getinfo.thumbnails.length-1].url! : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
      player: `자동재생`
    }, "" ];
  }
  return [ undefined, undefined, "추천영상을 찾을수없음3" ];
}

async function getData(vid: string, recomlist: string[]) {
  return new Promise<[string | undefined, string]>((res, _rej) => {
    axios.post(`https://music.youtube.com/youtubei/v1/next?key=${key}&prettyPrint=false`, {
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
          "clientVersion": `${contentClientVersion}`,
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
        "cookie": `${cookie}`,
        "authorization": `${authorization}`,
        'Accept-Encoding': '*'
      },
      responseType: "json"
    }).then(async (res2) => {
      try {
        let d1 = res2.data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents;
        let getvid: string | undefined = undefined;
        let alr: number[] = [];
        for (let i=1; i<d1.length; i++) {
          let r = i;
          if (r<=max) r = Math.floor((Math.random()*(max-min))+min);
          if (alr.includes(r)) {
            continue;
          } else {
            alr.push(r);
            if (d1 && d1[r]) {
              let d3 = d1[r].playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.videoId;
              if (!d3) d3 = d1[r].playlistPanelVideoRenderer?.videoId;
              if (!d3 || recomlist.includes(d3)) continue;
              getvid = d3;
              break;
            }
          }
        }
        if (getvid) return res([ getvid, getvid ? "" : "추천영상을 찾을수없음25" ]);
        return res([ undefined, "추천영상을 찾을수없음2" ]);
      } catch (err) {
        // console.log(err);
        return res([ undefined, "추천영상을 찾을수없음21" ]);
      }
    }).catch(() => {
      // console.log(err);
      return res([ undefined, "키를 찾을수없음2" ]);
    })
  });
}