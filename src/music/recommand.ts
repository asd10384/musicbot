import "dotenv/config";
import axios from "axios";
import { nowplay } from "./musicClass";
import checkvideo from "./checkvideo";

const key = process.env.YOUTUBE_MUSIC_KEY;
const visitorData = process.env.YOUTUBE_MUSIC_VISITORDATA;
const authorization = process.env.YOUTUBE_MUSIC_AUTHORIZATION;

export default async function recommand(recomlist: string[], vid: string): Promise<[string | undefined, nowplay | undefined, string]> {
  if (!key) return [ undefined, undefined, "key를 찾을수 없음" ];
  if (!visitorData) return [ undefined, undefined, "visitorData를 찾을수 없음" ];
  if (!authorization) return [ undefined, undefined, "authorization을 찾을수 없음" ];

  const getplid = await first(vid);
  if (!getplid[0]) return [ undefined, undefined, getplid[2] ];
  // console.log(getplid);
  const getvid = await second(vid, getplid[0], getplid[1], recomlist);
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

async function first(vid: string) {
  return new Promise<[string | undefined, string, string]>((res, rej) => {
    axios.post(`https://music.youtube.com/youtubei/v1/next?key=${key}&prettyPrint=false`, {
      "enablePersistentPlaylistPanel": true,
      "tunerSettingValue": "AUTOMIX_SETTING_NORMAL",
      // "playlistId": "",
      "videoId": vid,
      // "params": "wAEB8gECeAE%3D",
      "isAudioOnly": true,
      "context": {
        "client": {
          "hl": "ko",
          "gl": "KR",
          "remoteHost": "",         
          "deviceMake": "",
          "deviceModel": "",
          "visitorData": `${visitorData}`,
          "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36,gzip(gfe)", "clientName": "WEB_REMIX", "clientVersion": "1.20221019.01.00", "osName": "Windows", "osVersion": "10.0", "originalUrl": `https://music.youtube.com/watch?v=${vid}`, "platform": "DESKTOP", "clientFormFactor": "UNKNOWN_FORM_FACTOR", "configInfo": { "appInstallData": "CO2B5ZoGELiLrgUQntCuBRDpjf4SEP24_RIQ4rmuBRDbyq4FEKjUrgUQmcauBRDp1a4FELKI_hIQ1IOuBRDqyq4FENi-rQU%3D" }, "timeZone": "Asia/Seoul", "browserName": "Chrome", "browserVersion": "106.0.0.0", "acceptHeader": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9", "deviceExperimentId": "CgsxYVFIRmhlc3YxURDtgeWaBg%3D%3D", "screenWidthPoints": 979, "screenHeightPoints": 937, "screenPixelDensity": 1, "screenDensityFloat": 1, "utcOffsetMinutes": 540, "userInterfaceTheme": "USER_INTERFACE_THEME_LIGHT", "musicAppInfo": { "pwaInstallabilityStatus": "PWA_INSTALLABILITY_STATUS_UNKNOWN", "webDisplayMode": "WEB_DISPLAY_MODE_BROWSER", "storeDigitalGoodsApiSupportStatus": { "playStoreDigitalGoodsApiSupportStatus": "DIGITAL_GOODS_API_SUPPORT_STATUS_UNSUPPORTED" } } }, "user": { "lockedSafetyMode": false }, "request": { "useSsl": true, "internalExperimentFlags": [], "consistencyTokenJars": [] }, "clickTracking": { "clickTrackingParams": "CBQQ_20iEwj3ism4iv76AhX2sVYBHV1hAAU=" }, "adSignalsInfo": { "params": [{ "key": "dt", "value": "1666793711229" }, { "key": "flash", "value": "0" }, { "key": "frm", "value": "0" }, { "key": "u_tz", "value": "540" }, { "key": "u_his", "value": "7" }, { "key": "u_h", "value": "1080" }, { "key": "u_w", "value": "1920" }, { "key": "u_ah", "value": "1040" }, { "key": "u_aw", "value": "1920" }, { "key": "u_cd", "value": "24" }, { "key": "bc", "value": "31" }, { "key": "bih", "value": "937" }, { "key": "biw", "value": "979" }, { "key": "brdim", "value": "0,0,0,0,1920,0,1920,1040,979,937" }, { "key": "vis", "value": "1" }, { "key": "wgl", "value": "true" }, { "key": "ca_type", "value": "image" }], "bid": "ANyPxKqW4-6eVI5hNN7XIC2Vt8irIph6tHvmnmm95OX00lU2BsYw-Zba8v3YTqipyQt6ARwvzslBRwDlF44QkDadmHNCBATwtg"
        }
      }
    }, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
        "authorization": `${authorization}`,
        "origin": "https://music.youtube.com",
        "x-origin": "https://music.youtube.com",
        "referer": `https://music.youtube.com/watch?v=${vid}`,
        "cookie": "YSC=9Uf6zEgc2L0; VISITOR_INFO1_LIVE=fMy5s5mGV1E; GPS=1; _gcl_au=1.1.829840149.1666948199; _ga=GA1.1.1822743544.1666948200; HSID=A0wOAgaH_AcK-ElhZ; SSID=AMBxwP9eJ503wkiVm; APISID=cMcEwrWQfNlEQ20a/A-UBgLhK0OpS3mx9O; SAPISID=dUAj8y2f-C7wq5Rl/A8abTohQ_6hp8O_M8; __Secure-1PAPISID=dUAj8y2f-C7wq5Rl/A8abTohQ_6hp8O_M8; __Secure-3PAPISID=dUAj8y2f-C7wq5Rl/A8abTohQ_6hp8O_M8; LOGIN_INFO=AFmmF2swRQIhANdgVtAaOYY9dWmrEVFw9hXJL8CuFqkk_0n6JJM67dmAAiBENvk6o00BliaDG4qxVr4xoQ0ePV1FgKUQPnvDnrbefQ:QUQ3MjNmeUpiM1U5alB2b0FhWW5wazNwalZHejJ4RFBnT1J3SEprSlZ0Yl9xc0ZxeldaeWswMDF4NnRmSEg1Y0diWEFVb2ozWUsxS3RBX3hTRF9Db1otZ3ZpUGdNUjhsZjI0LV9zUE0wMzlnVGNKMUtBQy1oYzBIOV9HSWN3ekVQOW9sMlNpdUF5MkJKVXNpcUJsVW9fclQ4S0QtVURoX013; NID=511=PdKXqYloB5dk_HPpAIggBed4qjk6cgYmpmfWJ59HQqWVo5zuP9G9X3U_kAOz_rPqGokg87MCfrU8TiQZMhrMlNaRmVaFZio0ZOvqnrgMgCR1_V_omb_10JsucbNpu5ZBuUVoBpu5Lx4t4axybApjDuLP-QBE9SSNsT8gPGQp5_U; CONSISTENCY=APAR8nt0lzzgs46rCct-cNzBOeMvlN8KbPUs73v4BfO4pC4oB4EfvFsIBaovxN5DDdUE4mN_GOuKNEs2XgRWUYRCpriWRyV33A6al2l92_x9AqbJxlWzcpo_SQzXErYA7k2dEF8JJY90o0ByRkIETCfqp_Xy5sdrB8F8BBf-iIgPwJGwnv6E-74Bcxgp; SID=QAi_R0DomYQfDuHXf2lEQWtV4na6PDa5vajaL0PdMTumqJkcCBMjiH9YANajiA9SxDCWxQ.; __Secure-1PSID=QAi_R0DomYQfDuHXf2lEQWtV4na6PDa5vajaL0PdMTumqJkc2RRj8Cs9LRgR1R-xSbOUgQ.; __Secure-3PSID=QAi_R0DomYQfDuHXf2lEQWtV4na6PDa5vajaL0PdMTumqJkcMy4OWENphlu2tmfoaZ_fag.; PREF=f6=80&tz=Asia.Seoul; _ga_VCGEPY40VB=GS1.1.1666948199.1.1.1666948539.0.0.0; SIDCC=AIKkIs0aZUecoEwoZTSV3fbHtBxRdNTpyv2iadC7PbSry2KhI1TbH4W1uiAjFiBYhjHz4TrE9g; __Secure-1PSIDCC=AIKkIs0esPtIx6JF0cRz0dMYOSiV-tojvfNBTzlTuLbviQk6dH9-YZ6OKdhE9ehk3-8Z3QU9lQ; __Secure-3PSIDCC=AIKkIs2vnoaDt8v5ogjoGpnbMwTFuU3J4JOcKHDxXh523r2WobuL6vOnvdTb89n7E9yyiXtn"
      },
      responseType: "json"
    }).then(async (res2) => {
      try {
        let d1 = res2.data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents;
        if (d1 && d1[0]) {
          let d2 = d1[0].playlistPanelVideoRenderer?.menu?.menuRenderer?.items;
          if (!d2) d2 = d1[0].playlistPanelVideoWrapperRenderer?.primaryRenderer?.playlistPanelVideoRenderer?.menu?.menuRenderer?.items;
          if (d2 && d2[0]) {
            let d3 = d2[0].menuNavigationItemRenderer?.navigationEndpoint?.watchEndpoint?.playlistId;
            let d4 = d2[0].menuNavigationItemRenderer?.navigationEndpoint?.watchEndpoint?.params;
            if (d3) return res([ d3, d4 ? d4 : "wAEB", "" ]);
          }
        }
        return res([ undefined, "", "추천영상을 찾을수없음1" ]);
      } catch {
        return res([ undefined, "", "추천영상을 찾을수없음15" ]);
      }
    }).catch((err) => {
      // console.log(err);
      return res([ undefined, "", "키를 찾을수없음1" ]);
    });
  });
}
async function second(vid: string, plid: string, params: string, recomlist: string[]) {
  return new Promise<[string | undefined, string]>((res, rej) => {
    if (!key) return res([ undefined, "키를 찾을수 없음" ]);
    axios.post(`https://music.youtube.com/youtubei/v1/next?key=${key}&prettyPrint=false`, {
      "enablePersistentPlaylistPanel": true,
      "tunerSettingValue": "AUTOMIX_SETTING_NORMAL",
      "playlistId": plid,
      "videoId": vid,
      "params": params,
      "isAudioOnly": true,
      "context": {
        "client": {
          "hl": "ko",
          "gl": "KR",
          "remoteHost": "",
          "deviceMake": "",
          "deviceModel": "",
          "visitorData": `${visitorData}`,
          "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36,gzip(gfe)", "clientName": "WEB_REMIX", "clientVersion": "1.20221019.01.00", "osName": "Windows", "osVersion": "10.0", "originalUrl": `https://music.youtube.com/watch?v=${vid}`, "platform": "DESKTOP", "clientFormFactor": "UNKNOWN_FORM_FACTOR", "configInfo": { "appInstallData": "CO2B5ZoGELiLrgUQntCuBRDpjf4SEP24_RIQ4rmuBRDbyq4FEKjUrgUQmcauBRDp1a4FELKI_hIQ1IOuBRDqyq4FENi-rQU%3D" }, "timeZone": "Asia/Seoul", "browserName": "Chrome", "browserVersion": "106.0.0.0", "acceptHeader": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9", "deviceExperimentId": "CgsxYVFIRmhlc3YxURDtgeWaBg%3D%3D", "screenWidthPoints": 979, "screenHeightPoints": 937, "screenPixelDensity": 1, "screenDensityFloat": 1, "utcOffsetMinutes": 540, "userInterfaceTheme": "USER_INTERFACE_THEME_LIGHT", "musicAppInfo": { "pwaInstallabilityStatus": "PWA_INSTALLABILITY_STATUS_UNKNOWN", "webDisplayMode": "WEB_DISPLAY_MODE_BROWSER", "storeDigitalGoodsApiSupportStatus": { "playStoreDigitalGoodsApiSupportStatus": "DIGITAL_GOODS_API_SUPPORT_STATUS_UNSUPPORTED" } } }, "user": { "lockedSafetyMode": false }, "request": { "useSsl": true, "internalExperimentFlags": [], "consistencyTokenJars": [] }, "clickTracking": { "clickTrackingParams": "CBQQ_20iEwj3ism4iv76AhX2sVYBHV1hAAU=" }, "adSignalsInfo": { "params": [{ "key": "dt", "value": "1666793711229" }, { "key": "flash", "value": "0" }, { "key": "frm", "value": "0" }, { "key": "u_tz", "value": "540" }, { "key": "u_his", "value": "7" }, { "key": "u_h", "value": "1080" }, { "key": "u_w", "value": "1920" }, { "key": "u_ah", "value": "1040" }, { "key": "u_aw", "value": "1920" }, { "key": "u_cd", "value": "24" }, { "key": "bc", "value": "31" }, { "key": "bih", "value": "937" }, { "key": "biw", "value": "979" }, { "key": "brdim", "value": "0,0,0,0,1920,0,1920,1040,979,937" }, { "key": "vis", "value": "1" }, { "key": "wgl", "value": "true" }, { "key": "ca_type", "value": "image" }], "bid": "ANyPxKqW4-6eVI5hNN7XIC2Vt8irIph6tHvmnmm95OX00lU2BsYw-Zba8v3YTqipyQt6ARwvzslBRwDlF44QkDadmHNCBATwtg"
        }
      }
    }, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
        "authorization": `${authorization}`,
        "origin": "https://music.youtube.com",
        "x-origin": "https://music.youtube.com",
        "referer": `https://music.youtube.com/watch?v=${vid}`,
        "cookie": "YSC=9Uf6zEgc2L0; VISITOR_INFO1_LIVE=fMy5s5mGV1E; GPS=1; _gcl_au=1.1.829840149.1666948199; _ga=GA1.1.1822743544.1666948200; HSID=A0wOAgaH_AcK-ElhZ; SSID=AMBxwP9eJ503wkiVm; APISID=cMcEwrWQfNlEQ20a/A-UBgLhK0OpS3mx9O; SAPISID=dUAj8y2f-C7wq5Rl/A8abTohQ_6hp8O_M8; __Secure-1PAPISID=dUAj8y2f-C7wq5Rl/A8abTohQ_6hp8O_M8; __Secure-3PAPISID=dUAj8y2f-C7wq5Rl/A8abTohQ_6hp8O_M8; LOGIN_INFO=AFmmF2swRQIhANdgVtAaOYY9dWmrEVFw9hXJL8CuFqkk_0n6JJM67dmAAiBENvk6o00BliaDG4qxVr4xoQ0ePV1FgKUQPnvDnrbefQ:QUQ3MjNmeUpiM1U5alB2b0FhWW5wazNwalZHejJ4RFBnT1J3SEprSlZ0Yl9xc0ZxeldaeWswMDF4NnRmSEg1Y0diWEFVb2ozWUsxS3RBX3hTRF9Db1otZ3ZpUGdNUjhsZjI0LV9zUE0wMzlnVGNKMUtBQy1oYzBIOV9HSWN3ekVQOW9sMlNpdUF5MkJKVXNpcUJsVW9fclQ4S0QtVURoX013; NID=511=PdKXqYloB5dk_HPpAIggBed4qjk6cgYmpmfWJ59HQqWVo5zuP9G9X3U_kAOz_rPqGokg87MCfrU8TiQZMhrMlNaRmVaFZio0ZOvqnrgMgCR1_V_omb_10JsucbNpu5ZBuUVoBpu5Lx4t4axybApjDuLP-QBE9SSNsT8gPGQp5_U; CONSISTENCY=APAR8nt0lzzgs46rCct-cNzBOeMvlN8KbPUs73v4BfO4pC4oB4EfvFsIBaovxN5DDdUE4mN_GOuKNEs2XgRWUYRCpriWRyV33A6al2l92_x9AqbJxlWzcpo_SQzXErYA7k2dEF8JJY90o0ByRkIETCfqp_Xy5sdrB8F8BBf-iIgPwJGwnv6E-74Bcxgp; SID=QAi_R0DomYQfDuHXf2lEQWtV4na6PDa5vajaL0PdMTumqJkcCBMjiH9YANajiA9SxDCWxQ.; __Secure-1PSID=QAi_R0DomYQfDuHXf2lEQWtV4na6PDa5vajaL0PdMTumqJkc2RRj8Cs9LRgR1R-xSbOUgQ.; __Secure-3PSID=QAi_R0DomYQfDuHXf2lEQWtV4na6PDa5vajaL0PdMTumqJkcMy4OWENphlu2tmfoaZ_fag.; PREF=f6=80&tz=Asia.Seoul; _ga_VCGEPY40VB=GS1.1.1666948199.1.1.1666948539.0.0.0; SIDCC=AIKkIs0aZUecoEwoZTSV3fbHtBxRdNTpyv2iadC7PbSry2KhI1TbH4W1uiAjFiBYhjHz4TrE9g; __Secure-1PSIDCC=AIKkIs0esPtIx6JF0cRz0dMYOSiV-tojvfNBTzlTuLbviQk6dH9-YZ6OKdhE9ehk3-8Z3QU9lQ; __Secure-3PSIDCC=AIKkIs2vnoaDt8v5ogjoGpnbMwTFuU3J4JOcKHDxXh523r2WobuL6vOnvdTb89n7E9yyiXtn"
      },
      responseType: "json"
    }).then(async (res2) => {
      try {
        let d1 = res2.data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents;
        let getvid: string | undefined = undefined;
        let alr: number[] = [];
        for (let i=1; i<d1.length; i++) {
          let r = i;
          if (r<=3) r = Math.floor((Math.random()*3)+1);
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
      } catch {
        return res([ undefined, "추천영상을 찾을수없음21" ]);
      }
    }).catch((err) => {
      // console.log(err);
      return res([ undefined, "키를 찾을수없음2" ]);
    })
  });
}