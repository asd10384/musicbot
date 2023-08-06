import "dotenv/config";
import axios from "axios";
import { getVideo, Video } from "./getVideo";

const KEY = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";
const CONTENTCLIENTVERSION = process.env.YOUTUBE_CONTENTCLIENTVERSION;
const AUTHORIZATION = process.env.YOUTUBE_MUSIC_AUTHORIZATION;
const COOKIE = process.env.YOUTUBE_MUSIC_COOKIE;
const max = Number(process.env.YOUTUBE_MUSIC_MAX || "2") || 2;
const min = 1;

export const getRecommand = async (recomlist: string[], vid: string): Promise<{ videoData?: Video; err?: string; }> => {
  if (!AUTHORIZATION) return { err: "authorization을 찾을수 없음" };

  const { id, err } = await getData(vid, recomlist);
  if (!id || err) return { err: err || "추천영상을 찾을수 없음4" };
  // console.log(id);
  const { videoData, err: err2 } = await getVideo({ id: id });
  if (!videoData || err2) return { err: "추천영상을 찾을수 없음4" };
  return { videoData: videoData };
}

async function getData(vid: string, recomlist: string[]) {
  return new Promise<{ id?: string; err?: string; }>((res) => {
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
              let d4 = d1[r].playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.title?.runs[0]?.text;
              let d5 = d1[r].playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.shortBylineText?.runs[0]?.text;
              if (!d3) d3 = d1[r].playlistPanelVideoRenderer?.videoId;
              if (!d3 || recomlist.includes((!d4 || !d5) ? d3 : delC(d5)+"-"+delC(d4))) continue;
              getvid = d3;
              break;
            }
          }
        }
        if (getvid) return res({ id: getvid });
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

function delC(text: string): string {
  return text.replace(/[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi,"").replace(/ +/g,"").toLowerCase();
}