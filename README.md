# install
```PowerShell
npm run ins
```

# start
```PowerShell
mkdir dist
npm run build
node .
```

# .env

## TOKEN
> 디스코드 토큰


## PREFIX
> 메세지로 명령어를 입력할때 접두사


## embedColor
> 임베드 메세지 색깔 설정<br/>
> 색깔 목록은 [이 사이트](https://old.discordjs.dev/#/docs/discord.js/main/typedef/ColorResolvable)의 ColorResolvable 참고


## DEV
> 개발 전용<br/>
> 아래 [DEV_SERVERID](#dev_serverid) 와 연동

## DEBUG
> 정보 메세지, 오류 메세지 등등을 확인할수 있음


## slashCommand
> / 명령어를 수정, 추가, 삭제 했을때 적용을 위한 옵션

## DEV_SERVERID
> 개발 전용<br/>
> 위에 [DEV](#dev_serverid) 와 연동


## DATABASE_URL
> 기본값 : mariaDB


## PROXY
> 필수는 아님<br/>
> 국가 차단 영상을 재생하기 위함


## YOUTUBE_TOKEN
> 필수는 아님<br/>
> 오류를 해결하기 위한 수단<br/>
> [[유튜브]](https://www.youtube.com)의 `관리자 콘솔(F12)`에 요청 URL이 `https://www.youtube.com/` 인 요청헤더의 `Cookie`를 의미함


## YOUTUBE_MUSIC
> 사용하려면 아래 [YOUTUBE_MUSIC_TOKEN](#youtube_music_token) 작성 필수<br/>
> 유튜브 뮤직을 쓰지 않는다면 유튜브로만 해도 충분<br/>
> 유튜브 뮤직을 사용하면 뮤비가 나오지 않아서 좋음

## YOUTUBE_MUSIC_TOKEN
> 위의 [YOUTUBE_MUSIC](#youtube_music) 이 true 일때 작성 필수<br/>
> [[유튜브뮤직]](https://music.youtube.com)의 `관리자 콘솔(F12)`에 요청 URL이 `https://music.youtube.com/` 인 요청헤더의 `Cookie`를 의미함

## SPOTIFY
> 사용하려면 아래 [SPOTIFY_CLIENT_ID](#spotify_client_id) , [SPOTIFY_CLIENT_SECRET](#spotify_client_secret) 작성 필수<br/>
> 스포티파이 노래주소나 재생목록을 사용하기위함

## SPOTIFY_CLIENT_ID
> 위의 [SPOTIFY](#spotify) 가 true 일때 작성 필수<br/>
> `spotify app client id` 를 의미함

## SPOTIFY_CLIENT_SECRET
> 위의 [SPOTIFY](#spotify) 가 true 일때 작성 필수<br/>
> `spotify app client secret` 을 의미함
