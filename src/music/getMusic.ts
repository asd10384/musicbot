import "dotenv/config";
import axios from "axios";
import crypto from "crypto";

const ORIGIN = "https://music.youtube.com";
const KEY = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";
const COOKIE = process.env.YOUTUBE_MUSIC_COOKIE;
const SAPISID = COOKIE?.split("; ")?.filter(v => v.includes("SAPISID="))[0]?.replace("SAPISID=","") || "";

export const getMusic = (query: string) => new Promise<{ id?: string; err?: string; }>(async (res) => {
  const intTime = Math.round(new Date().getTime()/1000.0);
  const AUTHORIZATION = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(intTime+" "+SAPISID+" "+ORIGIN)).then((strHash) => {
    return "SAPISIDHASH" + " " + intTime + "_" + Array.from(new Uint8Array(strHash)).map((intByte) => {
      return intByte.toString(16).padStart(2, '0');
    }).join("");
  });
  axios.post(`https://music.youtube.com/youtubei/v1/search?key=${KEY}&prettyPrint=false`, {
    "query": query,
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
  }, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
      "authorization": `${AUTHORIZATION}`,
      "origin": `${ORIGIN}`,
      "referer": `https://music.youtube.com/search?q=${encodeURIComponent(query)}`,
      "cookie": `${COOKIE}`,
      'Accept-Encoding': '*'
    },
    responseType: "json"
  }).then((res2) => {
    try {
      let d1 = res2.data?.contents?.tabbedSearchResultsRenderer?.tabs;
      let d2: any[] = d1[0]?.tabRenderer?.content?.sectionListRenderer?.contents;
      let d3 = d2?.filter(d => d.musicCardShelfRenderer?.header?.musicCardShelfHeaderBasicRenderer?.title?.runs[0]?.text === "상위 검색결과");
      if (d3 && d3[0]) {
        if (
          d3[0].musicCardShelfRenderer?.subtitle.runs?.length > 1
          && ![ "아티스트", "재생목록", "앨범", "커뮤니티" /* , "동영상" */ ].includes(d3[0].musicCardShelfRenderer?.subtitle.runs[0]?.text)
          && d3[0].musicCardShelfRenderer?.title?.runs?.length >= 1
        ) {
          let d4 = d3[0].musicCardShelfRenderer?.title?.runs[0]?.navigationEndpoint?.watchEndpoint?.videoId;
          if (d4 && d4.length > 1) return res({ id: d4 });
        }
      }
      let e1 = d2?.filter(d => d.musicShelfRenderer?.title?.runs[0]?.text === "노래");
      if (e1 && e1[0]) {
        let e2 = e1[0].musicShelfRenderer?.contents[0]?.musicResponsiveListItemRenderer?.playlistItemData?.videoId;
        if (e2) return res({ id: e2 });
      }
      return res({ err: "노래를 찾을수 없음1" });
    } catch {
      return res({ err: "노래를 찾을수 없음2" });
    }
  }).catch(() => {
    return res({ err: "노래를 찾을수 없음3" });
  });
});
