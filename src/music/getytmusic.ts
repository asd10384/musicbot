import "dotenv/config";
import axios from "axios";

const key = process.env.A_YOUTUBE_MUSIC_KEY;
const visitorData = process.env.A_YOUTUBE_MUSIC_VISITORDATA;
const authorization = process.env.A_YOUTUBE_MUSIC_AUTHORIZATION;
const cookie = process.env.A_YOUTUBE_MUSIC_COOKIE;

export const getytmusic = async (query: string) => new Promise<[string | undefined, string]>((res, _rej) => {
  axios.post(`https://music.youtube.com/youtubei/v1/search?key=${key}&prettyPrint=false`, {
    // "params": "EgWKAQIIAWoKEAMQBBAJEAoQBQ%3D%3D",
    "query": query,
    "context": {
      "client": {
        "hl": "ko",
        "gl": "KR",
        "remoteHost": "",
        "deviceMake": "",
        "deviceModel": "",
        "visitorData": `${visitorData}`,
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36,gzip(gfe)","clientName":"WEB_REMIX","clientVersion":"1.20221019.01.00","osName":"Windows","osVersion":"10.0","originalUrl":"https://music.youtube.com/","platform":"DESKTOP","clientFormFactor":"UNKNOWN_FORM_FACTOR","configInfo":{"appInstallData":"CKO-8poGEP24_RIQuIuuBRCy1q4FEOK5rgUQmcauBRCf0K4FEKjUrgUQsoj-EhDUg64FENi-rQU%3D"},"timeZone":"Asia/Seoul","browserName":"Chrome","browserVersion":"106.0.0.0","acceptHeader":"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9","deviceExperimentId":"CgtnZVh6NGQ5Q1JISRCjvvKaBg%3D%3D","screenWidthPoints":979,"screenHeightPoints":937,"screenPixelDensity":1,"screenDensityFloat":1,"utcOffsetMinutes":540,"userInterfaceTheme":"USER_INTERFACE_THEME_LIGHT","musicAppInfo":{"pwaInstallabilityStatus":"PWA_INSTALLABILITY_STATUS_UNKNOWN","webDisplayMode":"WEB_DISPLAY_MODE_BROWSER","storeDigitalGoodsApiSupportStatus":{"playStoreDigitalGoodsApiSupportStatus":"DIGITAL_GOODS_API_SUPPORT_STATUS_UNSUPPORTED"}}},"user":{"lockedSafetyMode":false},"request":{"useSsl":true,"internalExperimentFlags":[],"consistencyTokenJars":[]},"clickTracking":{"clickTrackingParams":"CAgQ_V0YASITCL7bmuTAhPsCFfubVgEdA_UFuw=="},"adSignalsInfo":{"params":[{"key":"dt","value":"1667014436097"},{"key":"flash","value":"0"},{"key":"frm","value":"0"},{"key":"u_tz","value":"540"},{"key":"u_his","value":"25"},{"key":"u_h","value":"1080"},{"key":"u_w","value":"1920"},{"key":"u_ah","value":"1040"},{"key":"u_aw","value":"1920"},{"key":"u_cd","value":"24"},{"key":"bc","value":"31"},{"key":"bih","value":"937"},{"key":"biw","value":"967"},{"key":"brdim","value":"0,0,0,0,1920,0,1920,1040,979,937"},{"key":"vis","value":"1"},{"key":"wgl","value":"true"},{"key":"ca_type","value":"image"}],"bid":"ANyPxKr5SQ7qjHqZRWj2cb8gaw-GtLBeXEoD--e1p7SQA5ffqrRRXCkEfMGI8iB9EIpJeKBgnVfjTwMDwCIWb8b4lZr1ICcm7Q"
      }
    }
  }, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
      "authorization": `${authorization}`,
      "origin": "https://music.youtube.com",
      "x-origin": "https://music.youtube.com",
      "referer": `https://music.youtube.com/search?q=${encodeURIComponent(query)}`,
      "cookie": `${cookie}`,
      'Accept-Encoding': "GZIP,DEFLATE,COMPRESS"
    },
    responseType: "json"
  }).then((res2) => {
    try {
      let d1 = res2.data?.contents?.tabbedSearchResultsRenderer?.tabs;
      let d2: any[] = d1[0]?.tabRenderer?.content?.sectionListRenderer?.contents;
      let d3 = d2.filter(d => d.musicShelfRenderer?.title?.runs[0]?.text === "상위 검색결과");
      let d7_2: string | undefined = undefined;
      if (d3 && d3[0]) {
        let d4 = d3[0].musicShelfRenderer?.contents;
        let d5: any[] = d4[0]?.musicResponsiveListItemRenderer?.flexColumns;
        let d6 = d5.filter(d => d.musicResponsiveListItemFlexColumnRenderer?.text?.runs.length > 1 && ![ "아티스트", "동영상", "재생목록", "엘범" ].includes(d.musicResponsiveListItemFlexColumnRenderer?.text?.runs[0]?.text));
        if (d6 && d6[0]) {
          let d7 = d3[0].musicShelfRenderer?.contents[0]?.musicResponsiveListItemRenderer?.playlistItemData?.videoId;
          if (d7) return res([ d7, "" ]);
        } else {
          d7_2 = d3[0].musicShelfRenderer?.contents[0]?.musicResponsiveListItemRenderer?.playlistItemData?.videoId;
        }
      }
      let e1 = d2.filter(d => d.musicShelfRenderer?.title?.runs[0]?.text === "노래");
      if (e1 && e1[0]) {
        let e2 = e1[0].musicShelfRenderer?.contents[0]?.musicResponsiveListItemRenderer?.playlistItemData?.videoId;
        if (e2) return res([ e2, "" ]);
      }
      if (d7_2) return res([ d7_2, "" ]);
      return res([ undefined, "노래를 찾을수없음1" ]);
    } catch {
      return res([ undefined, "노래를 찾을수없음2" ]);
    }
  }).catch(() => {
    return res([ undefined, "노래를 찾을수없음3" ]);
  });
});