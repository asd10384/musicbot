import axios from "axios";
import { key, contentClientVersion, Adata } from "./data";

const { authorization, cookie } = Adata;

export const getytmusic = (query: string) => new Promise<[string | undefined, string]>((res) => {
  axios.post(`https://music.youtube.com/youtubei/v1/search?key=${key}&prettyPrint=false`, {
    "query": query,
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
      "authorization": `${authorization}`,
      "origin": "https://music.youtube.com",
      "referer": `https://music.youtube.com/search?q=${encodeURIComponent(query)}`,
      "cookie": `${cookie}`,
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
          if (d4 && d4.length > 1) return res([ d4, "" ]);
        }
      }
      let e1 = d2?.filter(d => d.musicShelfRenderer?.title?.runs[0]?.text === "노래");
      if (e1 && e1[0]) {
        let e2 = e1[0].musicShelfRenderer?.contents[0]?.musicResponsiveListItemRenderer?.playlistItemData?.videoId;
        if (e2) return res([ e2, "" ]);
      }
      return res([ undefined, "노래를 찾을수없음1" ]);
    } catch {
      return res([ undefined, "노래를 찾을수없음2" ]);
    }
  }).catch(() => {
    return res([ undefined, "노래를 찾을수없음3" ]);
  });
});
