import "dotenv/config";
import axios from "axios";
import { nowplay } from "./musicClass";
import checkvideo from "./checkvideo";

let key = process.env.YOUTUBE_MUSIC_KEY;

export default async function recommand(vid: string): Promise<[nowplay | undefined, string]> {
  const getplid = await first(vid);
  if (!getplid[0]) return [ undefined, getplid[1] ];
  // console.log(getplid);
  const getvid = await second(vid, getplid[0]);
  if (!getvid[0]) return [ undefined, getvid[1] ];
  // console.log(getvid);
  let checkv = await checkvideo({ url: `https://www.youtube.com/watch?v=${getvid[0]}` });
  if (checkv[0]) {
    let getinfo = checkv[1].videoDetails;
    return [ {
      title: getinfo.title,
      duration: getinfo.lengthSeconds,
      author: getinfo.author!.name,
      url: getinfo.video_url,
      image: (getinfo.thumbnails.length > 0 && getinfo.thumbnails[getinfo.thumbnails.length-1]?.url) ? getinfo.thumbnails[getinfo.thumbnails.length-1].url! : `https://cdn.hydra.bot/hydra-547905866255433758-thumbnail.png`,
      player: `자동재생`
    }, "" ];
  }
  return [ undefined, "추천영상을 찾을수없음3" ];
}

async function first(vid: string) {
  return new Promise<[string | undefined, string]>((res, rej) => {
    if (!key) return res([ undefined, "키를 찾을수 없음" ]);
    axios.post(`https://music.youtube.com/youtubei/v1/next?key=${key}&prettyPrint=false`, {
      "enablePersistentPlaylistPanel": true,
      "tunerSettingValue": "AUTOMIX_SETTING_NORMAL",
      // "playlistId": "",
      "videoId": vid,
      "params": "wAEB8gECeAE%3D",
      "isAudioOnly": true,
      "context": {
        "client": {
          "hl": "ko",
          "gl": "KR",
          "remoteHost": "",
          "deviceMake": "",
          "deviceModel": "",
          "visitorData": "CgtBZHhpYktXRHRNSSjtgeWaBg%3D%3D",
          "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36,gzip(gfe)", "clientName": "WEB_REMIX", "clientVersion": "1.20221019.01.00", "osName": "Windows", "osVersion": "10.0", "originalUrl": `https://music.youtube.com/watch?v=${vid}`, "platform": "DESKTOP", "clientFormFactor": "UNKNOWN_FORM_FACTOR", "configInfo": { "appInstallData": "CO2B5ZoGELiLrgUQntCuBRDpjf4SEP24_RIQ4rmuBRDbyq4FEKjUrgUQmcauBRDp1a4FELKI_hIQ1IOuBRDqyq4FENi-rQU%3D" }, "timeZone": "Asia/Seoul", "browserName": "Chrome", "browserVersion": "106.0.0.0", "acceptHeader": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9", "deviceExperimentId": "CgsxYVFIRmhlc3YxURDtgeWaBg%3D%3D", "screenWidthPoints": 979, "screenHeightPoints": 937, "screenPixelDensity": 1, "screenDensityFloat": 1, "utcOffsetMinutes": 540, "userInterfaceTheme": "USER_INTERFACE_THEME_LIGHT", "musicAppInfo": { "pwaInstallabilityStatus": "PWA_INSTALLABILITY_STATUS_UNKNOWN", "webDisplayMode": "WEB_DISPLAY_MODE_BROWSER", "storeDigitalGoodsApiSupportStatus": { "playStoreDigitalGoodsApiSupportStatus": "DIGITAL_GOODS_API_SUPPORT_STATUS_UNSUPPORTED" } } }, "user": { "lockedSafetyMode": false }, "request": { "useSsl": true, "internalExperimentFlags": [], "consistencyTokenJars": [] }, "clickTracking": { "clickTrackingParams": "CBQQ_20iEwj3ism4iv76AhX2sVYBHV1hAAU=" }, "adSignalsInfo": { "params": [{ "key": "dt", "value": "1666793711229" }, { "key": "flash", "value": "0" }, { "key": "frm", "value": "0" }, { "key": "u_tz", "value": "540" }, { "key": "u_his", "value": "7" }, { "key": "u_h", "value": "1080" }, { "key": "u_w", "value": "1920" }, { "key": "u_ah", "value": "1040" }, { "key": "u_aw", "value": "1920" }, { "key": "u_cd", "value": "24" }, { "key": "bc", "value": "31" }, { "key": "bih", "value": "937" }, { "key": "biw", "value": "979" }, { "key": "brdim", "value": "0,0,0,0,1920,0,1920,1040,979,937" }, { "key": "vis", "value": "1" }, { "key": "wgl", "value": "true" }, { "key": "ca_type", "value": "image" }], "bid": "ANyPxKqW4-6eVI5hNN7XIC2Vt8irIph6tHvmnmm95OX00lU2BsYw-Zba8v3YTqipyQt6ARwvzslBRwDlF44QkDadmHNCBATwtg"
        }
      }
    }, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
        "authorization": "SAPISIDHASH 1666792676_c885fd504b008fe6d7d1b75e237846d4ce85f995",
        "origin": "https://music.youtube.com",
        "x-origin": "https://music.youtube.com",
        "referer": `https://music.youtube.com/watch?v=${vid}`,
        "cookie": "VISITOR_INFO1_LIVE=AdxibKWDtMI; _gcl_au=1.1.1598472366.1659453019; _ga=GA1.1.68066160.1661872024; _ga_VCGEPY40VB=GS1.1.1661872024.1.1.1661872471.0.0.0; HSID=A6Dm-88AXa1pqgryx; SSID=Al-m8-_c9HZFRGx3b; APISID=vlUKCK8AcszrwuwT/AiSbHuXou350HEq4A; SAPISID=xy2Enrmj4FnDeWAp/Aq8d2En3lcwIaANw7; __Secure-1PAPISID=xy2Enrmj4FnDeWAp/Aq8d2En3lcwIaANw7; __Secure-3PAPISID=xy2Enrmj4FnDeWAp/Aq8d2En3lcwIaANw7; __Secure-3PSID=PQihx6-pqDbKVUsysGLhvbSe9qGhSe1x1lhY_kt2CFnr7KBj5nnvvkx5d3qQLOlT7j4ZIg.; LOGIN_INFO=AFmmF2swRgIhAPGdZWWzJGPWAY-aquU2-jIGo4U7hL6bnnfA2wbFX9dIAiEA6i35atB8dYYbaTOWADKSH1DjFXse_HSU14TRoFPlG9o:QUQ3MjNmdzdLdWZkMW9EbjJLRzRJajgtUWZybEdWTjBfbHNla29wd04yYTNHcTN4ZE5oYXRsZGM4YmV6TkZOUWdMcFRtU3FnWkJmT0t6WVd1OG54V1VmZ05PYlg5VkxBMmZpeTJhOVBSQm5xN0g0XzdLZkdyblM1WlNqRWZqaXljOUVuaXhCNVF5SEJOUE54d3daS2RuRVg3NUlFOTlHaElB; YSC=tFrha8-2Bqw; __Secure-3PSIDCC=AIKkIs3LupEfmmVIHZ3RtFe9xNS1beOrRkj9ME2UCPFfZnZ_vhnvTZk34Hd0D3Wg1uihl_IXONM; PREF=f6=80&tz=Asia.Seoul&f5=30000&volume=19&autoplay=true"
      },
      responseType: "json"
    }).then(async (res2) => {
      let d1 = res2.data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs;
      if (d1 && d1[0]) {
        let d2 = d1[0].tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents;
        if (d2 && d2[0]) {
          let d3 = d2[0].playlistPanelVideoRenderer?.menu?.menuRenderer?.items;
          if (!d3 && d3[0]) d3 = d2[0].playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.menu?.menuRenderer?.items;
          if (d3 && d3[0]) {
            let d4 = d3[0].menuNavigationItemRenderer?.navigationEndpoint?.watchEndpoint?.playlistId;
            if (d4) return res([ d4, "" ]);
          }
        }
      }
      return res([ undefined, "추천영상을 찾을수없음1" ]);
    }).catch((err) => {
      return res([ undefined, "키를 찾을수없음" ]);
    })
  });
}
async function second(vid: string, plid: string) {
  return new Promise<[string | undefined, string]>((res, rej) => {
    if (!key) return res([ undefined, "키를 찾을수 없음" ]);
    axios.post(`https://music.youtube.com/youtubei/v1/next?key=${key}&prettyPrint=false`, {
      "enablePersistentPlaylistPanel": true,
      "tunerSettingValue": "AUTOMIX_SETTING_NORMAL",
      "playlistId": plid,
      "videoId": vid,
      "params": "wAEB8gECeAE%3D",
      "isAudioOnly": true,
      "context": {
        "client": {
          "hl": "ko",
          "gl": "KR",
          "remoteHost": "",
          "deviceMake": "",
          "deviceModel": "",
          "visitorData": "CgtBZHhpYktXRHRNSSjtgeWaBg%3D%3D",
          "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36,gzip(gfe)", "clientName": "WEB_REMIX", "clientVersion": "1.20221019.01.00", "osName": "Windows", "osVersion": "10.0", "originalUrl": `https://music.youtube.com/watch?v=${vid}`, "platform": "DESKTOP", "clientFormFactor": "UNKNOWN_FORM_FACTOR", "configInfo": { "appInstallData": "CO2B5ZoGELiLrgUQntCuBRDpjf4SEP24_RIQ4rmuBRDbyq4FEKjUrgUQmcauBRDp1a4FELKI_hIQ1IOuBRDqyq4FENi-rQU%3D" }, "timeZone": "Asia/Seoul", "browserName": "Chrome", "browserVersion": "106.0.0.0", "acceptHeader": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9", "deviceExperimentId": "CgsxYVFIRmhlc3YxURDtgeWaBg%3D%3D", "screenWidthPoints": 979, "screenHeightPoints": 937, "screenPixelDensity": 1, "screenDensityFloat": 1, "utcOffsetMinutes": 540, "userInterfaceTheme": "USER_INTERFACE_THEME_LIGHT", "musicAppInfo": { "pwaInstallabilityStatus": "PWA_INSTALLABILITY_STATUS_UNKNOWN", "webDisplayMode": "WEB_DISPLAY_MODE_BROWSER", "storeDigitalGoodsApiSupportStatus": { "playStoreDigitalGoodsApiSupportStatus": "DIGITAL_GOODS_API_SUPPORT_STATUS_UNSUPPORTED" } } }, "user": { "lockedSafetyMode": false }, "request": { "useSsl": true, "internalExperimentFlags": [], "consistencyTokenJars": [] }, "clickTracking": { "clickTrackingParams": "CBQQ_20iEwj3ism4iv76AhX2sVYBHV1hAAU=" }, "adSignalsInfo": { "params": [{ "key": "dt", "value": "1666793711229" }, { "key": "flash", "value": "0" }, { "key": "frm", "value": "0" }, { "key": "u_tz", "value": "540" }, { "key": "u_his", "value": "7" }, { "key": "u_h", "value": "1080" }, { "key": "u_w", "value": "1920" }, { "key": "u_ah", "value": "1040" }, { "key": "u_aw", "value": "1920" }, { "key": "u_cd", "value": "24" }, { "key": "bc", "value": "31" }, { "key": "bih", "value": "937" }, { "key": "biw", "value": "979" }, { "key": "brdim", "value": "0,0,0,0,1920,0,1920,1040,979,937" }, { "key": "vis", "value": "1" }, { "key": "wgl", "value": "true" }, { "key": "ca_type", "value": "image" }], "bid": "ANyPxKqW4-6eVI5hNN7XIC2Vt8irIph6tHvmnmm95OX00lU2BsYw-Zba8v3YTqipyQt6ARwvzslBRwDlF44QkDadmHNCBATwtg"
        }
      }
    }, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
        "authorization": "SAPISIDHASH 1666792676_c885fd504b008fe6d7d1b75e237846d4ce85f995",
        "origin": "https://music.youtube.com",
        "x-origin": "https://music.youtube.com",
        "referer": `https://music.youtube.com/watch?v=${vid}`,
        "cookie": "VISITOR_INFO1_LIVE=AdxibKWDtMI; _gcl_au=1.1.1598472366.1659453019; _ga=GA1.1.68066160.1661872024; _ga_VCGEPY40VB=GS1.1.1661872024.1.1.1661872471.0.0.0; HSID=A6Dm-88AXa1pqgryx; SSID=Al-m8-_c9HZFRGx3b; APISID=vlUKCK8AcszrwuwT/AiSbHuXou350HEq4A; SAPISID=xy2Enrmj4FnDeWAp/Aq8d2En3lcwIaANw7; __Secure-1PAPISID=xy2Enrmj4FnDeWAp/Aq8d2En3lcwIaANw7; __Secure-3PAPISID=xy2Enrmj4FnDeWAp/Aq8d2En3lcwIaANw7; __Secure-3PSID=PQihx6-pqDbKVUsysGLhvbSe9qGhSe1x1lhY_kt2CFnr7KBj5nnvvkx5d3qQLOlT7j4ZIg.; LOGIN_INFO=AFmmF2swRgIhAPGdZWWzJGPWAY-aquU2-jIGo4U7hL6bnnfA2wbFX9dIAiEA6i35atB8dYYbaTOWADKSH1DjFXse_HSU14TRoFPlG9o:QUQ3MjNmdzdLdWZkMW9EbjJLRzRJajgtUWZybEdWTjBfbHNla29wd04yYTNHcTN4ZE5oYXRsZGM4YmV6TkZOUWdMcFRtU3FnWkJmT0t6WVd1OG54V1VmZ05PYlg5VkxBMmZpeTJhOVBSQm5xN0g0XzdLZkdyblM1WlNqRWZqaXljOUVuaXhCNVF5SEJOUE54d3daS2RuRVg3NUlFOTlHaElB; YSC=tFrha8-2Bqw; __Secure-3PSIDCC=AIKkIs3LupEfmmVIHZ3RtFe9xNS1beOrRkj9ME2UCPFfZnZ_vhnvTZk34Hd0D3Wg1uihl_IXONM; PREF=f6=80&tz=Asia.Seoul&f5=30000&volume=19&autoplay=true"
      },
      responseType: "json"
    }).then(async (res2) => {
      let d1 = res2.data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs;
      if (d1 && d1[0]) {
        let d2 = d1[0].tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents;
        let random = Math.floor((Math.random()*4)+1);
        if (d2 && d2.length >= random && d2[random]) {
          let d3 = d2[random].playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.videoId;
          if (d3) return res([ d3, "" ]);
          let d4 = d2[random].playlistPanelVideoRenderer?.videoId;
          if (d4) return res([ d4, "" ]);
        }
      }
      return res([ undefined, "추천영상을 찾을수없음2" ]);
    }).catch((err) => {
      return res([ undefined, "키를 찾을수없음" ]);
    })
  });
}