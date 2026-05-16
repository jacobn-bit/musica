const seedAlbums=[
{id:"seed-1",title:"Abbey Road",artist:"The Beatles",year:1969,genre:"Rock",avg_rating:9.4,ratings_count:18432,tag:"Classic",summary:"Polished, melodic, and endlessly replayable.",spotify_url:"https://open.spotify.com/search/The%20Beatles%20Abbey%20Road",cover_url:""},
{id:"seed-2",title:"To Pimp a Butterfly",artist:"Kendrick Lamar",year:2015,genre:"Hip-Hop",avg_rating:9.3,ratings_count:22102,tag:"Modern classic",summary:"Dense, political, jazz-infused, and emotionally huge.",spotify_url:"https://open.spotify.com/search/Kendrick%20Lamar%20To%20Pimp%20a%20Butterfly",cover_url:""},
{id:"seed-3",title:"OK Computer",artist:"Radiohead",year:1997,genre:"Alternative",avg_rating:9.2,ratings_count:20110,tag:"Essential",summary:"Alienation, technology, beauty, and dread in one perfect arc.",spotify_url:"https://open.spotify.com/search/Radiohead%20OK%20Computer",cover_url:""},
{id:"seed-4",title:"Songs in the Key of Life",artist:"Stevie Wonder",year:1976,genre:"Soul",avg_rating:9.2,ratings_count:11240,tag:"Masterpiece",summary:"Warm, ambitious, human, and full of life.",spotify_url:"https://open.spotify.com/search/Stevie%20Wonder%20Songs%20in%20the%20Key%20of%20Life",cover_url:""},
{id:"seed-5",title:"Illmatic",artist:"Nas",year:1994,genre:"Hip-Hop",avg_rating:9.1,ratings_count:16650,tag:"Essential",summary:"Compact, cinematic, and one of rap's purest statements.",spotify_url:"https://open.spotify.com/search/Nas%20Illmatic",cover_url:""},
{id:"seed-6",title:"Rumours",artist:"Fleetwood Mac",year:1977,genre:"Pop Rock",avg_rating:9.0,ratings_count:15100,tag:"Timeless",summary:"Perfect songwriting wrapped in heartbreak and tension.",spotify_url:"https://open.spotify.com/search/Fleetwood%20Mac%20Rumours",cover_url:""}
];

const cfg=window.MUSICA_CONFIG||{};
const configured=cfg.SUPABASE_URL&&!cfg.SUPABASE_URL.includes("PASTE_")&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_ANON_KEY.includes("PASTE_");
const db=configured?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
const state={view:"rankings",search:"",genre:"All",sort:"score",artistLetter:"All",artistGenre:"All",artistSearch:"",albums:[],ratingMap:{},theme:localStorage.getItem("musicaThemePreference")==="light"?"light":"dark",deviceId:localStorage.getItem("musicaDeviceId")||crypto.randomUUID()};
const extras={tracks:{},trackRatings:{},songScores:{},ratingDetails:{},trackRatingDetails:{},comments:{},libraries:[],currentAlbumId:null,spotifyTarget:"musica",previewAudio:null,previewKey:null};
localStorage.setItem("musicaDeviceId",state.deviceId);
if(state.theme==="light")document.body.classList.add("light");
const $=s=>document.querySelector(s),content=$("#content");
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const escapeJsString=value=>String(value??"").replace(/\\/g,"\\\\").replace(/'/g,"\\'");
function spotifyAlbumSummary(a){const year=a.year||String(a.release_date||"").slice(0,4);const trackCount=Number(a.total_tracks||0);const type=(a.album_type||"album").replace(/_/g," ");let parts=[];if(year)parts.push(`released in ${year}`);if(trackCount)parts.push(`${trackCount} track${trackCount===1?"":"s"}`);const detail=parts.length?` This ${type} was ${parts.join(" with ")}.`:"";return `${a.title} by ${a.artist}.${detail}`}
function cleanAlbumSummary(a){const generated=spotifyAlbumSummary(a);let summary=String(a.summary||generated||"Added to Musica.");summary=summary.replace(/\s+was added from Spotify\./i,".");summary=summary.replace(/^Added from Spotify\.?$/i,generated);summary=summary.replace(/\.\s*\./g,".");return summary}
function localAlbums(){return JSON.parse(localStorage.getItem("musicaLocalAlbums")||"[]")}
function saveLocalAlbums(a){localStorage.setItem("musicaLocalAlbums",JSON.stringify(a))}
function localRatings(){return JSON.parse(localStorage.getItem("musicaLocalRatings")||"{}")}
function saveLocalRatings(r){localStorage.setItem("musicaLocalRatings",JSON.stringify(r))}
function coverKey(a){return `${(a.artist||"").toLowerCase().trim()}::${(a.title||"").toLowerCase().trim()}`}
function coverCache(){return JSON.parse(localStorage.getItem("musicaCoverCache")||"{}")}
function saveCoverCache(cache){localStorage.setItem("musicaCoverCache",JSON.stringify(cache))}
function applyCachedCovers(){const cache=coverCache();state.albums.forEach(a=>{const cached=cache[coverKey(a)];if(!a.cover_url&&cached)a.cover_url=cached})}
async function findCoverFromSpotify(a){
  const res=await fetch(`/.netlify/functions/album-search?q=${encodeURIComponent(`${a.title} ${a.artist}`)}&v=final3`,{cache:"no-store"});
  if(!res.ok)return "";
  const data=await res.json();
  const match=(data.albums||[]).find(x=>x.cover_url&&x.title&&x.artist)||{};
  return match.cover_url||"";
}
async function findCoverFromItunes(a){
  const res=await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(`${a.title} ${a.artist}`)}&media=music&entity=album&limit=1`,{cache:"force-cache"});
  if(!res.ok)return "";
  const data=await res.json();
  const art=data.results?.[0]?.artworkUrl100||"";
  return art.replace("100x100bb","600x600bb");
}
async function hydrateMissingCovers(){
  const missing=state.albums.filter(a=>!a.cover_url).slice(0,8);
  if(!missing.length)return;
  const cache=coverCache();
  let changed=false;
  for(const album of missing){
    const key=coverKey(album);
    if(cache[key]){album.cover_url=cache[key];changed=true;continue}
    try{
      const coverUrl=await findCoverFromSpotify(album).catch(()=>"")||await findCoverFromItunes(album).catch(()=>"");
      if(coverUrl){album.cover_url=coverUrl;cache[key]=coverUrl;changed=true}
    }catch(e){}
  }
  if(changed){saveCoverCache(cache);render()}
}
function score(a){return Number(a.avg_rating||0)}
function count(a){return Number(a.ratings_count||0)}
function userScore(a){return state.ratingMap[a.id]||localRatings()[a.id]||null}
function displayScore(a){return score(a)>0?score(a).toFixed(1):"-"}
function coverText(a){return(a.title||"?").split(" ").filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase()}
function fallback(a){return `<div class="fallbackCover"><strong>${escapeHtml(coverText(a))}</strong><span>${escapeHtml(a.title||"Untitled album")}</span></div>`}
function cover(a){
  const url=String(a.cover_url||"").trim();
  if(!url) return `<div class="cover">${fallback(a)}</div>`;
  return `<div class="cover"><img src="${escapeHtml(url)}" onerror="this.hidden=true" alt="${escapeHtml(a.title||"Album cover")}">${fallback(a)}</div>`
}
function listCover(a){
  const url=String(a.cover_url||"").trim();
  if(!url) return `<div class="listCover"><span>${escapeHtml(coverText(a))}</span></div>`;
  return `<div class="listCover"><img src="${escapeHtml(url)}" onerror="this.hidden=true" alt="${escapeHtml(a.title||"Album cover")}"><span>${escapeHtml(coverText(a))}</span></div>`
}

function hiddenSeedAlbums(){return JSON.parse(localStorage.getItem("musicaHiddenSeedAlbums")||"[]")}
function saveHiddenSeedAlbums(ids){localStorage.setItem("musicaHiddenSeedAlbums",JSON.stringify(ids))}
function normalizeAlbumName(value){return String(value||"").toLowerCase().replace(/\([^)]*\)/g,"").replace(/\[[^\]]*\]/g,"").replace(/\b(remaster(ed)?|deluxe|expanded|anniversary|edition|explicit|clean)\b/g,"").replace(/[^a-z0-9]+/g," ").trim()}
function isSameAlbum(a,b){return normalizeAlbumName(a.title)===normalizeAlbumName(b.title)&&normalizeAlbumName(a.artist)===normalizeAlbumName(b.artist)}
function existingAlbumMatch(album){return state.albums.find(a=>isSameAlbum(a,album))}
function canDeleteAlbum(a){return !!a}

function currentUsername(){return localStorage.getItem("musicaUsername")||""}
function ratingName(){const saved=currentUsername().trim();if(saved&&confirm(`Rate as "${saved}"? Press Cancel to choose Anonymous or another username.`))return saved;const name=(prompt("Enter a username for this rating, or leave blank for Anonymous:")||"").trim();if(name){localStorage.setItem("musicaUsername",name);return name}return "Anonymous"}
window.toggleRatingDetails=function(id,button){
  const panel=$("#"+id);
  if(!panel)return;
  const isHidden=panel.classList.toggle("hidden");
  if(button)button.textContent=isHidden?"See ratings":"Hide ratings";
}

function renderRatingDetails(albumId){
  const host=$("#albumRatingDetails");
  if(!host)return;
  const rows=extras.ratingDetails[albumRef(albumId)]||[];
  host.innerHTML=`<div class="emptyMini">${count(state.albums.find(a=>String(a.id)===String(albumId))||{}).toLocaleString()} people rated this album.</div>`;
}
async function loadRatingDetails(albumId){
  const ref=albumRef(albumId);
  if(db&&!String(albumId).startsWith("seed-")){
    const data=[], error=null;
    if(!error){extras.ratingDetails[ref]=data||[];return extras.ratingDetails[ref]}
  }
  const my=userScore({id:albumId});
  extras.ratingDetails[ref]=my?[{username:currentUsername()||"You",rating:my}]:[];
  return extras.ratingDetails[ref];
}
function renderTrackRatingDetails(albumId,trackKeyValue){
  const host=$("#trackRatingDetails");
  if(!host)return;
  const rows=extras.trackRatingDetails[`${albumRef(albumId)}::${trackKeyValue}`]||[];
  const score=(extras.songScores[albumRef(albumId)]||{})[trackKeyValue];host.innerHTML=`<div class="emptyMini">${displaySongCount(score)}</div>`;
}
async function loadTrackRatingDetails(albumId,trackKeyValue){
  const ref=albumRef(albumId);
  const key=`${ref}::${trackKeyValue}`;
  if(db){
    const data=[], error=null;
    if(!error){extras.trackRatingDetails[key]=data||[];return extras.trackRatingDetails[key]}
  }
  const my=localTrackRating(albumId,trackKeyValue);
  extras.trackRatingDetails[key]=my?[{username:currentUsername()||"You",rating:my}]:[];
  return extras.trackRatingDetails[key];
}

function albumRef(albumId){return String(albumId||"")}
function localComments(){return JSON.parse(localStorage.getItem("musicaAlbumComments")||"{}")}
function saveLocalComments(comments){localStorage.setItem("musicaAlbumComments",JSON.stringify(comments))}
function localTrackRatings(){return JSON.parse(localStorage.getItem("musicaTrackRatings")||"{}")}
function localTrackComments(){return JSON.parse(localStorage.getItem("musicaTrackComments")||"{}")}
function saveLocalTrackComments(comments){localStorage.setItem("musicaTrackComments",JSON.stringify(comments))}
function saveLocalTrackRatings(ratings){localStorage.setItem("musicaTrackRatings",JSON.stringify(ratings))}
function previewPayload(track){return encodeURIComponent(JSON.stringify({url:track.preview_url||"",name:track.name||""}))}
function setPreviewingButton(button){
  document.querySelectorAll(".isPreviewing").forEach(x=>{x.classList.remove("isPreviewing");x.removeAttribute("aria-label");if(x.dataset.playLabel)x.textContent=x.dataset.playLabel});
  if(button){button.dataset.playLabel=button.dataset.playLabel||button.textContent;button.classList.add("isPreviewing");button.setAttribute("aria-label","Pause sample");button.textContent=""}
  document.body.classList.toggle("samplePlaying",!!button);
}
function releasePreviewAudio(){
  const audio=extras.previewAudio;
  extras.previewAudio=null;
  if(!audio)return;
  try{audio.pause()}catch(e){}
  try{audio.currentTime=0}catch(e){}
  try{audio.src="";audio.load()}catch(e){}
}
function startPreviewAudio(audio,token){
  const attempt=()=>audio.play();
  attempt().catch(()=>{
    if(extras.previewToken!==token)return;
    setTimeout(()=>{
      if(extras.previewToken!==token)return;
      attempt().catch(()=>{if(extras.previewToken===token)setPreviewingButton(null)});
    },80);
  });
}
window.playTrackPreview=function(payload,button){
  let data={};
  try{data=JSON.parse(decodeURIComponent(payload||"{}"))}catch(e){}
  if(!data.url){alert("Spotify does not provide a 30 second sample for this track.");return}
  if(extras.previewAudio&&extras.previewKey===data.url){
    if(extras.previewAudio.paused){setPreviewingButton(button);startPreviewAudio(extras.previewAudio,extras.previewToken)}else{extras.previewAudio.pause();setPreviewingButton(null)}
    return;
  }
  const token=Date.now()+":"+Math.random();
  extras.previewToken=token;
  setPreviewingButton(null);
  releasePreviewAudio();
  const audio=new Audio();
  audio.preload="auto";
  audio.src=data.url;
  extras.previewAudio=audio;
  extras.previewKey=data.url;
  setPreviewingButton(button);
  audio.addEventListener("ended",()=>{if(extras.previewToken===token)setPreviewingButton(null)},{once:true});
  audio.addEventListener("error",()=>{if(extras.previewToken===token)setPreviewingButton(null)},{once:true});
  startPreviewAudio(audio,token);
}
function stopTrackPreview(){releasePreviewAudio();extras.previewKey=null;extras.previewToken=null;setPreviewingButton(null)}function trackKey(track){return String(track.spotify_id||track.id||track.name||"").toLowerCase()}
function localTrackRating(albumId,key){return localTrackRatings()[`${albumRef(albumId)}::${key}`]||null}
function setLocalTrackRating(albumId,key,value){const ratings=localTrackRatings();ratings[`${albumRef(albumId)}::${key}`]=value;saveLocalTrackRatings(ratings)}
async function loadComments(albumId){
  const ref=albumRef(albumId);
  if(db){
    const {data,error}=await db.from("album_comments").select("name,comment,created_at").eq("album_ref",ref).order("created_at",{ascending:false}).limit(30);
    if(!error){extras.comments[ref]=data||[];return extras.comments[ref]}
  }
  extras.comments[ref]=(localComments()[ref]||[]).slice().reverse();
  return extras.comments[ref];
}
function renderComments(albumId){
  const host=$("#commentsList");
  if(!host)return;
  const comments=extras.comments[albumRef(albumId)]||[];
  host.innerHTML=comments.length?comments.map((c,i)=>{const name=c.name||"Listener";const initial=String(name).trim().slice(0,1).toUpperCase()||"L";return `<article class="linerReaction"><div class="reactionAvatar">${escapeHtml(initial)}</div><div class="reactionBody"><div class="reactionMeta"><strong>${escapeHtml(name)}</strong><span>${i+2}d ago</span></div><p>${escapeHtml(c.comment||c.text||"")}</p><div class="reactionActions"><span>♡ ${Math.max(87,128-i*21)}</span><button>Reply</button></div><small>View ${Math.max(2,4-i)} replies</small></div><button class="reactionMore">•••</button></article>`}).join(""):`<div class="emptyMini albumReactionEmpty">What moment on this album hits hardest?</div>`;
}
window.addAlbumComment=async function(albumId){
  const nameInput=$("#commentName"), textInput=$("#commentText");
  const name=(nameInput?.value||"Listener").trim()||"Listener";
  const comment=(textInput?.value||"").trim();
  if(!comment)return;
  const ref=albumRef(albumId);
  if(db){
    const {error}=await db.from("album_comments").insert({album_ref:ref,device_id:state.deviceId,name,comment});
    if(error){
      const all=localComments();
      all[ref]=all[ref]||[];
      all[ref].push({name,comment,created_at:new Date().toISOString()});
      saveLocalComments(all);
    }
  }else{
    const all=localComments();
    all[ref]=all[ref]||[];
    all[ref].push({name,comment,created_at:new Date().toISOString()});
    saveLocalComments(all);
  }
  textInput.value="";
  await loadComments(albumId);
  renderComments(albumId);
}
function fallbackAlbumTracks(album){
  const title=normalizeAlbumName(album?.title||"");
  const artist=normalizeAlbumName(album?.artist||"");
  const make=names=>names.map((name,i)=>({name,track_number:i+1,spotify_id:`fallback-${artist}-${title}-${i+1}`,preview_url:"",preview_source:"",duration_ms:0}));
  if(artist==="nirvana"&&title.includes("nevermind"))return make([
    "Smells Like Teen Spirit","In Bloom","Come As You Are","Breed","Lithium","Polly","Territorial Pissings","Drain You","Lounge Act","Stay Away","On A Plain","Something In The Way"
  ]);
  if(artist==="the beatles"&&title.includes("abbey road"))return make([
    "Come Together","Something","Maxwell's Silver Hammer","Oh! Darling","Octopus's Garden","I Want You (She's So Heavy)","Here Comes The Sun","Because","You Never Give Me Your Money","Sun King","Mean Mr. Mustard","Polythene Pam","She Came In Through The Bathroom Window","Golden Slumbers","Carry That Weight","The End","Her Majesty"
  ]);
  return [];
}
async function fetchWithTimeout(url,options={},ms=5000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  try{return await fetch(url,{...options,signal:controller.signal})}
  finally{clearTimeout(timer)}
}
async function findItunesTrackPreview(trackName,artistName){
  if(!trackName||!artistName)return null;
  try{
    const url=`https://itunes.apple.com/search?term=${encodeURIComponent(`${trackName} ${artistName}`)}&media=music&entity=song&limit=5`;
    const res=await fetchWithTimeout(url,{cache:"force-cache"},3500);
    if(!res.ok)return null;
    const data=await res.json();
    const wantedTrack=normalizeAlbumName(trackName);
    const wantedArtist=normalizeAlbumName(artistName);
    const match=(data.results||[]).find(item=>{
      const itemTrack=normalizeAlbumName(item.trackName);
      const itemArtist=normalizeAlbumName(item.artistName);
      return item.previewUrl&&itemArtist.includes(wantedArtist.split(" ")[0])&&(itemTrack===wantedTrack||itemTrack.includes(wantedTrack)||wantedTrack.includes(itemTrack));
    })||(data.results||[]).find(item=>item.previewUrl&&normalizeAlbumName(item.artistName).includes(wantedArtist.split(" ")[0]));
    return match?{preview_url:match.previewUrl,preview_source:"itunes",duration_ms:match.trackTimeMillis||0}:null;
  }catch(e){return null}
}
async function enrichFallbackTrackPreviews(album,tracks){
  if(!tracks.length||tracks.some(track=>track.preview_url))return tracks;
  const previews=await Promise.all(tracks.map(track=>findItunesTrackPreview(track.name,album.artist)));
  return tracks.map((track,i)=>previews[i]?{...track,...previews[i]}:track);
}
async function saveResolvedSpotifyId(album){
  if(!album?.id||!album.spotify_id)return;
  const id=String(album.id);
  try{
    if(db&&!id.startsWith("seed-")&&!id.startsWith("local-")){
      await db.from("albums").update({spotify_id:album.spotify_id,spotify_url:album.spotify_url||null,cover_url:album.cover_url||null}).eq("id",album.id);
    }else if(id.startsWith("local-")){
      const albums=localAlbums();
      const index=albums.findIndex(a=>String(a.id)===id);
      if(index>=0){albums[index]={...albums[index],spotify_id:album.spotify_id,spotify_url:album.spotify_url||albums[index].spotify_url,cover_url:album.cover_url||albums[index].cover_url};saveLocalAlbums(albums)}
    }
  }catch(e){}
}
function strictItunesAlbumMatch(item,album){
  const wantedTitle=normalizeAlbumName(album?.title||"");
  const wantedArtist=normalizeAlbumName(album?.artist||"");
  const itemTitle=normalizeAlbumName(item?.collectionName||"");
  const itemArtist=normalizeAlbumName(item?.artistName||"");
  if(!wantedTitle||!wantedArtist||!itemTitle||!itemArtist)return false;
  const artistOk=itemArtist===wantedArtist||itemArtist.includes(wantedArtist)||wantedArtist.includes(itemArtist);
  const titleOk=itemTitle===wantedTitle||itemTitle.includes(wantedTitle)||wantedTitle.includes(itemTitle);
  return artistOk&&titleOk;
}
async function fetchTracksFromItunes(album){
  const search=await fetchWithTimeout(`https://itunes.apple.com/search?term=${encodeURIComponent(`${album.title} ${album.artist}`)}&media=music&entity=album&limit=3`,{cache:"force-cache"},4500);
  if(!search.ok)return [];
  const found=await search.json();
  const cleanTitle=normalizeAlbumName(album.title);
  const cleanArtist=normalizeAlbumName(album.artist);
  const match=(found.results||[]).find(x=>strictItunesAlbumMatch(x,album));
  const collectionId=match?.collectionId;
  if(!collectionId)return [];
  const lookup=await fetchWithTimeout(`https://itunes.apple.com/lookup?id=${collectionId}&entity=song`,{cache:"force-cache"},4500);
  if(!lookup.ok)return [];
  const data=await lookup.json();
  return (data.results||[]).filter(x=>x.wrapperType==="track").map((x,i)=>({name:x.trackName,track_number:x.trackNumber||i+1,spotify_id:String(x.trackId||x.trackName),preview_url:x.previewUrl||"",preview_source:x.previewUrl?"itunes":"",duration_ms:x.trackTimeMillis||0}));
}
function spotifyAlbumCandidateScore(candidate,album){
  const title=normalizeAlbumName(album?.title||"");
  const artist=normalizeAlbumName(album?.artist||"");
  const candidateTitle=normalizeAlbumName(candidate?.title||"");
  const candidateArtist=normalizeAlbumName(candidate?.artist||"");
  if(!title||!artist||!candidateTitle||!candidateArtist)return 0;
  const artistToken=artist.split(" ")[0];
  let score=0;
  if(candidateTitle===title)score+=60;
  else if(candidateTitle.includes(title)||title.includes(candidateTitle))score+=40;
  const titleWords=title.split(" ").filter(Boolean);
  const candidateTitleWords=candidateTitle.split(" ").filter(Boolean);
  score+=titleWords.filter(word=>candidateTitleWords.includes(word)).length*8;
  if(candidateArtist===artist)score+=45;
  else if(candidateArtist.includes(artist)||candidateArtist.includes(artistToken))score+=30;
  return score;
}
async function resolveSpotifyAlbum(album,force=false){
  if(album.spotify_id&&!force)return album;
  try{
    const query=`${album.title||""} ${album.artist||""}`.trim();
    if(!query)return album;
    const res=await fetchWithTimeout(`/.netlify/functions/album-search?q=${encodeURIComponent(query)}&v=resolve1`,{cache:"no-store"},8000);
    if(!res.ok)return album;
    const data=await res.json();
    const match=(data.albums||[]).map(item=>({item,score:spotifyAlbumCandidateScore(item,album)})).filter(x=>x.score>=55).sort((a,b)=>b.score-a.score)[0]?.item;
    if(!match?.spotify_id)return album;
    album.spotify_id=match.spotify_id;
    album.spotify_url=album.spotify_url||match.spotify_url||"";
    album.cover_url=album.cover_url||match.cover_url||"";
    return album;
  }catch(e){return album}
}
async function requestSpotifyTracks(album,cacheVersion="v10"){
  const params=new URLSearchParams({title:album.title||"",artist:album.artist||""});
  if(album.spotify_id)params.set("spotify_id",album.spotify_id);
  if(album.spotify_url)params.set("spotify_url",album.spotify_url);
  const res=await fetchWithTimeout(`/.netlify/functions/album-tracks?${params.toString()}&v=${cacheVersion}`,{cache:"no-store"},10000);
  if(!res.ok)return [];
  const data=await res.json();
  return data.tracks||[];
}
async function fetchAlbumTracks(album){
  const ref=albumRef(album.id);
  if(Array.isArray(extras.tracks[ref])&&extras.tracks[ref].length)return extras.tracks[ref];
  let tracks=[];
  try{tracks=await requestSpotifyTracks(album,"v14")}catch(e){}
  if(!tracks.length){
    const hadSpotifyId=!!album.spotify_id;
    album=await resolveSpotifyAlbum(album,true);
    try{tracks=await requestSpotifyTracks(album,"v15")}catch(e){}
    if(tracks.length&&!hadSpotifyId)saveResolvedSpotifyId(album);
  }
  if(!tracks.length&&(location.protocol==="file:"||location.hostname===""||location.hostname==="localhost"||location.hostname==="127.0.0.1")){
    tracks=await fetchTracksFromItunes(album).catch(()=>[]);
  }
  extras.tracks[ref]=tracks;
  return tracks;
}
async function loadSongScores(albumId){
  const ref=albumRef(albumId);
  if(db){
    const {data,error}=await db.from("song_scores").select("track_key,avg_rating,ratings_count").eq("album_ref",ref);
    if(!error){extras.songScores[ref]=Object.fromEntries((data||[]).map(s=>[s.track_key,s]));return extras.songScores[ref]}
  }
  const local=localTrackRatings();
  const scores={};
  Object.entries(local).forEach(([key,value])=>{
    if(key.startsWith(ref+"::")){
      const trackKeyValue=key.slice(ref.length+2);
      scores[trackKeyValue]={track_key:trackKeyValue,avg_rating:Number(value),ratings_count:1};
    }
  });
  extras.songScores[ref]=scores;
  return scores;
}
function displaySongScore(score){return score&&Number(score.ratings_count)>0?Number(score.avg_rating||0).toFixed(1):"-"}
function displaySongCount(score){if(!score||Number(score.ratings_count)<=0)return "No ratings";const total=Number(score.ratings_count);return total.toLocaleString()+" rating"+(total===1?"":"s")}

async function loadTrackRatings(albumId){
  const ref=albumRef(albumId);
  if(db){
    const {data,error}=await db.from("track_ratings").select("track_key,rating").eq("album_ref",ref).eq("device_id",state.deviceId);
    if(!error){extras.trackRatings[ref]=Object.fromEntries((data||[]).map(r=>[r.track_key,r.rating]));return extras.trackRatings[ref]}
  }
  const local=localTrackRatings();
  extras.trackRatings[ref]=Object.fromEntries(Object.entries(local).filter(([k])=>k.startsWith(ref+"::")).map(([k,v])=>[k.slice(ref.length+2),v]));
  return extras.trackRatings[ref];
}
function renderTrackList(albumId){
  const host=$("#trackRatingsList");
  if(!host)return;
  const ref=albumRef(albumId);
  const tracks=extras.tracks[ref]||[];
  const ratings=extras.trackRatings[ref]||{};
  const songScores=extras.songScores[ref]||{};
  const album=state.albums.find(a=>String(a.id)===String(albumId))||{};
  if(!tracks.length){host.innerHTML='<div class="emptyMini">No track list found for this album yet.</div>';return}
  const first=tracks[0];
  const firstKey=trackKey(first);
  const firstScore=displaySongScore(songScores[firstKey]).replace("No rating","")||displayScore(album);
  const firstDuration=first.duration_ms?Math.floor(first.duration_ms/60000)+":"+String(Math.floor((first.duration_ms%60000)/1000)).padStart(2,"0"):"";
  const coverHtml=album.cover_url?'<img src="'+escapeHtml(album.cover_url)+'" alt="">':'<strong>'+escapeHtml(String(album.title||"?").slice(0,1))+'</strong>';
  const expanded=host.dataset.expanded==="true";
  const visibleTracks=expanded?tracks:tracks.slice(0,8);
  const rows=visibleTracks.map((track,i)=>{
    const key=trackKey(track);
    const current=ratings[key]||localTrackRating(albumId,key);
    let score=displaySongScore(songScores[key]);
    if(score==="-"&&current)score=Number(current).toFixed(1);
    if(score==="-")score="";
    const scoreHtml=score?`★ <span class="trackScoreNumber">${escapeHtml(score)}</span>`:"★";
    return `<div class="linerTrackRow"><span class="trackNo">${i+1}</span><button class="trackPulse ${track.preview_url?'':'noPreview'}" title="${track.preview_url?'Play 30 second sample':'No Spotify sample available'}" onclick="playTrackPreview('${previewPayload(track)}',this)">▶</button><strong>${escapeHtml(track.name)} <span class="rowPlayingWaves" aria-hidden="true"><i></i><i></i><i></i><i></i></span></strong><button class="trackRowScore" onclick="openTrackRating('${escapeJsString(albumId)}','${escapeJsString(key)}','${escapeJsString(track.name)}')">${scoreHtml}</button><button class="trackLove">♡</button><button class="trackDots" onclick="openTrackComments('${escapeJsString(albumId)}','${escapeJsString(key)}','${escapeJsString(track.name)}')">•••</button></div>`;
  }).join("");
  host.innerHTML=`<section class="linerFeaturedTrack"><button class="featurePlay ${first.preview_url?'':'noPreview'}" title="${first.preview_url?'Play 30 second sample':'No Spotify sample available'}" onclick="playTrackPreview('${previewPayload(first)}',this)">▶</button><div class="featureTrackCopy"><span>Most loved track</span><h4>${escapeHtml(first.name)} <span class="featuredPlayingWaves" aria-hidden="true"><i></i><i></i><i></i><i></i></span></h4><div class="featureWave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><p>“The production on this is untouchable. Every bar hits.”</p></div><div class="featureTrackScore"><strong>${escapeHtml(firstScore)}</strong><span>2.1K ratings</span></div><div class="featureCover">${coverHtml}</div></section><section class="linerTrackTable"><div class="trackTableHead"><span>#</span><span>Track</span><span>Rating</span></div>${rows}${tracks.length>8?`<button class="viewTracklist" onclick="toggleFullTracklist('${escapeJsString(albumId)}')">${expanded?"Show fewer tracks":"View full tracklist"} <span>${expanded?"⌃":"⌄"}</span></button>`:""}</section>`;
}

window.toggleFullTracklist=function(albumId){
  const host=$("#trackRatingsList");
  if(!host)return;
  host.dataset.expanded=host.dataset.expanded==="true"?"false":"true";
  renderTrackList(albumId);
}

async function loadTrackComments(albumId,trackKeyValue){
  const ref=albumRef(albumId);
  const storageKey=ref+"::"+trackKeyValue;
  if(db){
    const {data,error}=await db.from("track_comments").select("name,comment,created_at").eq("album_ref",ref).eq("track_key",trackKeyValue).order("created_at",{ascending:false}).limit(30);
    if(!error)return data||[];
  }
  return (localTrackComments()[storageKey]||[]).slice().reverse();
}
function renderTrackCommentsList(comments){
  const host=$("#trackCommentsList");
  if(!host)return;
  host.innerHTML=comments.length?comments.map(c=>`<div class="commentItem"><strong>${escapeHtml(c.name||"Listener")}</strong><p>${escapeHtml(c.comment||"")}</p></div>`).join(""):`<div class="emptyMini">No comments for this song yet.</div>`;
}
window.openTrackComments=async function(albumId,trackKeyValue,trackName){
  let popup=$("#trackCommentPopup");
  if(!popup){
    popup=document.createElement("div");
    popup.id="trackCommentPopup";
    popup.className="trackCommentPopup hidden";
    document.body.appendChild(popup);
    popup.addEventListener("click",e=>{if(e.target.id==="trackCommentPopup")closeTrackComments()});
  }
  popup.innerHTML=`<div class="trackCommentPanel"><button class="close" onclick="closeTrackComments()">&times;</button><p class="eyebrow">Song Comments</p><h3>${escapeHtml(trackName)}</h3><div class="commentForm"><input id="trackCommentName" maxlength="40" placeholder="Your name"><textarea id="trackCommentText" maxlength="500" placeholder="Leave a comment about this song"></textarea><button class="bigBtn" onclick="addTrackComment('${escapeJsString(albumId)}','${escapeJsString(trackKeyValue)}','${escapeJsString(trackName)}')">Post</button></div><div id="trackCommentsList" class="commentsList"><div class="emptyMini">Loading comments...</div></div></div>`;
  popup.classList.remove("hidden");
  renderTrackCommentsList(await loadTrackComments(albumId,trackKeyValue));
}
window.closeTrackComments=function(){const popup=$("#trackCommentPopup");if(popup)popup.classList.add("hidden")}
window.addTrackComment=async function(albumId,trackKeyValue,trackName){
  const nameInput=$("#trackCommentName"), textInput=$("#trackCommentText");
  const name=(nameInput?.value||"Listener").trim()||"Listener";
  const comment=(textInput?.value||"").trim();
  if(!comment)return;
  const ref=albumRef(albumId);
  const storageKey=ref+"::"+trackKeyValue;
  if(db){
    const {error}=await db.from("track_comments").insert({album_ref:ref,track_key:trackKeyValue,track_name:trackName,device_id:state.deviceId,name,comment});
    if(error){
      const all=localTrackComments();
      all[storageKey]=all[storageKey]||[];
      all[storageKey].push({name,comment,created_at:new Date().toISOString()});
      saveLocalTrackComments(all);
    }
  }else{
    const all=localTrackComments();
    all[storageKey]=all[storageKey]||[];
    all[storageKey].push({name,comment,created_at:new Date().toISOString()});
    saveLocalTrackComments(all);
  }
  textInput.value="";
  renderTrackCommentsList(await loadTrackComments(albumId,trackKeyValue));
}

window.openTrackRating=function(albumId,trackKeyValue,trackName){
  let popup=$("#trackRatingPopup");
  if(!popup){
    popup=document.createElement("div");
    popup.id="trackRatingPopup";
    popup.className="trackRatingPopup hidden";
    document.body.appendChild(popup);
    popup.addEventListener("click",e=>{if(e.target.id==="trackRatingPopup")closeTrackRating()});
  }
  const current=(extras.trackRatings[albumRef(albumId)]||{})[trackKeyValue]||localTrackRating(albumId,trackKeyValue);
  popup.innerHTML=`<div class="trackRatingPanel"><button class="close" onclick="closeTrackRating()">&times;</button><p class="eyebrow">Song Rating</p><h3>${escapeHtml(trackName)}</h3><div class="songRatingBar popupChoices">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button class="songRateBtn ${current==n?"selected":""}" onclick="rateTrack('${escapeJsString(albumId)}','${escapeJsString(trackKeyValue)}','${escapeJsString(trackName)}',${n});closeTrackRating()" aria-label="Rate ${escapeHtml(trackName)} ${n} out of 10"><span class="songRateNumber">${n}</span><span class="songRateCircle"></span></button>`).join("")}</div><div class="ratingDetailsBlock"><button class="linkBtn" onclick="toggleRatingDetails('trackRatingDetails',this)">See ratings</button><div id="trackRatingDetails" class="hidden"><div class="emptyMini">Loading ratings...</div></div></div></div>`;
  loadTrackRatingDetails(albumId,trackKeyValue).then(()=>renderTrackRatingDetails(albumId,trackKeyValue));
  popup.classList.remove("hidden");
}
window.closeTrackRating=function(){const popup=$("#trackRatingPopup");if(popup)popup.classList.add("hidden")}
async function loadAlbumExtras(album){
  extras.currentAlbumId=albumRef(album.id);
  await Promise.all([loadComments(album.id),loadTrackRatings(album.id),loadSongScores(album.id),loadRatingDetails(album.id)]);
  renderComments(album.id);
  renderRatingDetails(album.id);
  const tracks=await fetchAlbumTracks(album);
  if(extras.currentAlbumId!==albumRef(album.id))return;
  renderTrackList(album.id,tracks);
}
window.rateTrack=async function(albumId,trackKeyValue,trackName,value){
  const username=ratingName();
  const ref=albumRef(albumId);
  if(db){
    const {error}=await db.from("track_ratings").upsert({album_ref:ref,track_key:trackKeyValue,track_name:trackName,device_id:state.deviceId,username,rating:value},{onConflict:"album_ref,track_key,device_id"});
    if(error)setLocalTrackRating(albumId,trackKeyValue,value);
  }else setLocalTrackRating(albumId,trackKeyValue,value);
  await Promise.all([loadTrackRatings(albumId),loadSongScores(albumId),loadTrackRatingDetails(albumId,trackKeyValue)]);
  renderTrackList(albumId);
}


function updateNavUsername(){
  const el=$("#navUsername");
  if(el)el.textContent=currentUsername()?"@"+currentUsername():"Not signed in";
  renderNotifications();
}
function followerSeenKey(){return "musicaSeenFollowers::"+state.deviceId}
function myPublishedLibrary(){return extras.libraries.find(l=>l.device_id===state.deviceId)||null}
function unreadFollowerCount(){const library=myPublishedLibrary();if(!library)return 0;return Math.max(0,Number(library.followers_count||0)-Number(localStorage.getItem(followerSeenKey())||0))}
function renderNotifications(){
  const badge=$("#notificationBadge"),panel=$("#notificationPanel");
  const count=unreadFollowerCount();
  if(badge){badge.textContent=count>99?"99+":String(count);badge.classList.toggle("hidden",count===0)}
  if(panel&&!panel.classList.contains('hidden')){panel.innerHTML=count?'<strong>'+count+' new follower'+(count===1?'':'s')+'</strong>':'No new notifications.'}
}
window.markFollowerNotificationsRead=function(){const library=myPublishedLibrary();localStorage.setItem(followerSeenKey(),String(Number(library?.followers_count||0)));renderNotifications()}
async function refreshNotifications(){await loadLibraries();renderNotifications()}
function setLibraryUsername(){
  const name=(prompt("Choose a public username for your library:",currentUsername()||"")||"").trim();
  if(!name)return;
  localStorage.setItem("musicaUsername",name);
  updateNavUsername();
}
function localLibraries(){return JSON.parse(localStorage.getItem("musicaPublicLibraries")||"[]")}
function saveLocalLibraries(libraries){localStorage.setItem("musicaPublicLibraries",JSON.stringify(libraries))}
function myLibraryItems(){return JSON.parse(localStorage.getItem("musicaMyLibraryItems")||"[]")}
function saveMyLibraryItems(items){localStorage.setItem("musicaMyLibraryItems",JSON.stringify(items))}
function albumToLibraryItem(a){return {
  id:String(a.id),
  title:a.title,
  artist:a.artist,
  year:a.year||"",
  genre:a.genre||"Album",
  cover_url:a.cover_url||"",
  spotify_url:a.spotify_url||"",
  summary:a.summary||"",
  rating:userScore(a)?Number(userScore(a)):displayScore(a)
}}
function sortedLibraryItems(items){return items.slice()}
function liveLibraryItem(item){
  const album=state.albums.find(a=>String(a.id)===String(item.id))||existingAlbumMatch(item);
  if(!album)return item;
  return {...item,id:String(album.id),title:album.title,artist:album.artist,year:album.year||item.year||"",genre:album.genre||item.genre||"Album",cover_url:album.cover_url||item.cover_url||"",spotify_url:album.spotify_url||item.spotify_url||"",summary:album.summary||item.summary||"",rating:displayScore(album),ratings_count:count(album)};
}
function liveLibraryItems(items){return sortedLibraryItems(items).map(liveLibraryItem)}
function librarySimilarity(items){
  const publishedMine=extras.libraries.find(l=>l.device_id===state.deviceId)||(currentUsername()?extras.libraries.find(l=>String(l.username||"").toLowerCase()===currentUsername().toLowerCase()):null);
  const mineSource=myLibraryItems().length?myLibraryItems():(publishedMine?.items||[]);
  const mine=liveLibraryItems(mineSource);
  const other=liveLibraryItems(items||[]);
  if(!mine.length||!other.length)return null;
  const mineKeys=new Set(mine.map(a=>coverKey(a)));
  const otherKeys=new Set(other.map(a=>coverKey(a)));
  const shared=[...mineKeys].filter(key=>otherKeys.has(key)).length;
  const total=new Set([...mineKeys,...otherKeys]).size;
  return total?Math.round((shared/total)*100):null;
}
function libraryHasAlbum(album){return myLibraryItems().some(item=>isSameAlbum(item,album)||String(item.id)===String(album.id))}
function currentLibraryCard(){
  const items=liveLibraryItems(myLibraryItems());
  if(!items.length)return null;
  const username=currentUsername()||"Listener";
  const existing=extras.libraries.find(l=>l.device_id===state.deviceId)||{};
  return {
    ...existing,
    id:existing.id||("local-library-"+state.deviceId),
    device_id:state.deviceId,
    username:existing.username||username,
    title:($("#libraryTitle")?.value||existing.title||(username+"'s Library")).trim()||(username+"'s Library"),
    items,
    album_count:items.length,
    followers_count:Number(existing.followers_count||0),
    isMine:true
  };
}
function visibleLibraries(){
  const mine=currentLibraryCard();
  const others=extras.libraries.filter(l=>l.device_id!==state.deviceId);
  return mine?[mine,...others]:extras.libraries;
}
async function syncMyLibrary(){
  const username=currentUsername()||ratingName();
  if(!username)return false;
  const items=liveLibraryItems(myLibraryItems());
  const title=($("#libraryTitle")?.value||(username+"'s Library")).trim()||(username+"'s Library");
  const payload={device_id:state.deviceId,username,title,items,album_count:items.length,updated_at:new Date().toISOString()};
  if(db){
    const {error}=await db.from("user_libraries").upsert(payload,{onConflict:"device_id"});
    if(error){alert(error.message);return false}
  }else{
    const libraries=localLibraries().filter(l=>l.device_id!==state.deviceId);
    libraries.unshift({...payload,id:"local-library-"+state.deviceId,followers_count:0});
    saveLocalLibraries(libraries);
  }
  await loadLibraries();
  return true;
}
async function addAlbumToMyLibrary(album){
  const items=myLibraryItems();
  if(items.some(item=>isSameAlbum(item,album)||String(item.id)===String(album.id))){alert('That album is already in your library.');return false}
  items.push(albumToLibraryItem(album));
  saveMyLibraryItems(items);
  await syncMyLibrary();
  return true;
}
window.addCurrentAlbumToLibrary=async function(albumId){
  const album=state.albums.find(a=>String(a.id)===String(albumId));
  if(!album)return;
  const added=await addAlbumToMyLibrary(album);
  if(added){alert('Added to your public library.');render()}
}
window.removeFromMyLibrary=async function(albumId){
  saveMyLibraryItems(myLibraryItems().filter(item=>String(item.id)!==String(albumId)));
  await syncMyLibrary();
  render();
  const mine=currentLibraryCard();
  if(mine&&!$("#albumModal").classList.contains("hidden"))openLibraryDetails(mine);
}
window.dragLibraryItem=function(event,albumId){
  event.stopPropagation();
  event.dataTransfer.effectAllowed="move";
  event.dataTransfer.setData("text/plain",String(albumId));
  event.currentTarget.classList.add("dragging");
}
window.endLibraryDrag=function(event){event.currentTarget.classList.remove("dragging")}
window.dropLibraryItem=async function(event,targetId){
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove("dragTarget");
  const sourceId=event.dataTransfer.getData("text/plain");
  if(!sourceId||String(sourceId)===String(targetId))return;
  const items=myLibraryItems();
  const from=items.findIndex(item=>String(item.id)===String(sourceId));
  const to=items.findIndex(item=>String(item.id)===String(targetId));
  if(from<0||to<0)return;
  const [moved]=items.splice(from,1);
  items.splice(to,0,moved);
  saveMyLibraryItems(items);
  await syncMyLibrary();
  render();
  const mine=currentLibraryCard();
  if(mine)openLibraryDetails(mine);
}
async function loadLibraries(){
  if(db){
    const {data,error}=await db.from("library_feed").select("*").order("updated_at",{ascending:false}).limit(50);
    if(!error){extras.libraries=data||[];renderNotifications();return extras.libraries}
  }
  extras.libraries=localLibraries();
  renderNotifications();
  return extras.libraries;
}
async function publishMyLibrary(){
  const saved=await syncMyLibrary();
  if(!saved){alert("Add at least one album to your library first.");return}
  render();
}
async function followLibrary(libraryId){
  if(db){
    const {error}=await db.from("library_follows").insert({library_id:libraryId,device_id:state.deviceId});
    if(error&&!String(error.message||"").includes("duplicate")){alert(error.message);return}
  }else{
    const libraries=localLibraries().map(l=>String(l.id)===String(libraryId)?{...l,followers_count:Number(l.followers_count||0)+1}:l);
    saveLocalLibraries(libraries);
  }
  await loadLibraries();
  render();
}
async function removeLibrary(libraryId){
  const library=visibleLibraries().find(l=>String(l.id)===String(libraryId));
  if(!library)return;
  if(!confirm('Remove "'+(library.title||'this library')+'" from public libraries?'))return;
  if(db&&String(libraryId).indexOf("local-library-")!==0){
    const {error}=await db.from("user_libraries").delete().eq("id",libraryId);
    if(error){alert(error.message);return}
  }else{
    saveLocalLibraries(localLibraries().filter(l=>String(l.id)!==String(libraryId)));
  }
  if(library.device_id===state.deviceId||library.isMine){saveMyLibraryItems([])}
  await loadLibraries();
  render();
}
function ensureLibraryAlbum(item){
  let existing=state.albums.find(a=>String(a.id)===String(item.id))||existingAlbumMatch(item);
  if(existing)return existing;
  const album={id:String(item.id),title:item.title,artist:item.artist,year:item.year||"",genre:item.genre||"Album",cover_url:item.cover_url||"",spotify_url:item.spotify_url||"",summary:item.summary||"",avg_rating:Number(item.rating||0),ratings_count:1};
  state.albums.push(album);
  return album;
}
function openLibraryAlbum(encodedItem){
  const item=JSON.parse(decodeURIComponent(encodedItem));
  const album=ensureLibraryAlbum(item);
  openAlbum(album.id);
}
function libraryAlbumCard(item, removable=false, draggable=false){
  const encoded=encodeURIComponent(JSON.stringify(item));
  const scoreText=item.rating&&item.rating!=="-"?'<div class="score">'+escapeHtml(item.rating)+'</div>':'';
  const card='<article class="card libraryAlbumCard" onclick="event.stopPropagation();openLibraryAlbum(\''+encoded+'\')">'+(item.cover_url?'<div class="cover"><img src="'+escapeHtml(item.cover_url)+'" alt="'+escapeHtml(item.title||"Album cover")+'"></div>':'<div class="cover fallbackCover"><strong>'+escapeHtml(String(item.title||"?").slice(0,1))+'</strong></div>')+'<div class="cardBody"><div class="row"><div><div class="title">'+escapeHtml(item.title||"Untitled")+'</div><div class="artist">'+escapeHtml(item.artist||"")+(item.year?' - '+escapeHtml(item.year):'')+'</div></div>'+scoreText+'</div></div></article>';
  if(!removable)return card;
  const dragAttrs=draggable?' draggable="true" ondragstart="dragLibraryItem(event,\''+escapeJsString(item.id)+'\')" ondragend="endLibraryDrag(event)" ondragover="event.preventDefault()" ondragenter="event.currentTarget.classList.add(\'dragTarget\')" ondragleave="event.currentTarget.classList.remove(\'dragTarget\')" ondrop="dropLibraryItem(event,\''+escapeJsString(item.id)+'\')"':'';
  return '<div class="libraryDraftCard"'+dragAttrs+'>'+card+'<button class="draftRemove" onclick="event.stopPropagation();removeFromMyLibrary(\''+escapeJsString(item.id)+'\')">Remove</button></div>';
}
function openLibraryDetails(library){
  if(!library)return;
  const items=liveLibraryItems(Array.isArray(library.items)?library.items:[]);
  const isMine=library.device_id===state.deviceId||library.isMine;
  $("#albumModalContent").innerHTML='<div class="sectionTitle"><div><h2>'+escapeHtml(library.title||"Library")+'</h2><span class="muted">@'+escapeHtml(library.username||"Listener")+' - '+Number(library.album_count||items.length||0)+' albums</span></div></div><div class="grid libraryFullGrid">'+(items.map(item=>libraryAlbumCard(item,isMine,isMine)).join("")||'<div class="empty">No albums yet.</div>')+'</div>';
  $("#albumModal").classList.remove("hidden");
}
function openLibraryDetailsById(key){
  const library=visibleLibraries().find(l=>String(l.id)===String(key)||String(l.device_id)===String(key));
  openLibraryDetails(library);
}
function libraryGenreLabel(genres){
  const primary=String(genres[0]||"").toLowerCase();
  if(!primary||primary==="album")return "Album essentials";
  if(primary.includes("hip"))return "Hip-hop essentials";
  if(primary.includes("soul"))return "Soulful classics";
  if(primary.includes("alternative"))return "Alternative favorites";
  if(primary.includes("pop"))return "Pop favorites";
  if(primary.includes("rock"))return "Classic rock essentials";
  return genres[0]+" essentials";
}
function libraryGenreTags(genres,items){
  const fallback=items.map(item=>item.genre).filter(Boolean);
  return [...new Set([...(genres||[]),...fallback].filter(Boolean).filter(g=>String(g).toLowerCase()!=="album"))].slice(0,3);
}
function libraryTinyAlbum(item){
  const scoreText=item.rating&&item.rating!=="-"?'<span class="mockAlbumScore">★ '+escapeHtml(item.rating)+'</span>':'';
  const img=item.cover_url?'<img src="'+escapeHtml(item.cover_url)+'" alt="'+escapeHtml(item.title||"Album cover")+'">':'<strong>'+escapeHtml(String(item.title||"?").slice(0,1))+'</strong>';
  return '<article class="mockAlbumTile" onclick="event.stopPropagation();openLibraryAlbum(\''+encodeURIComponent(JSON.stringify(item))+'\')"><div class="mockAlbumCover">'+img+'</div><div class="mockAlbumCopy"><strong>'+escapeHtml(item.title||"Untitled")+'</strong><span>'+escapeHtml(item.artist||"")+(item.year?' &middot; '+escapeHtml(item.year):'')+'</span></div>'+scoreText+'</article>';
}
function libraryRowAlbum(item){
  const scoreText=item.rating&&item.rating!=="-"?'<span class="mockAlbumScore">★ '+escapeHtml(item.rating)+'</span>':'';
  const img=item.cover_url?'<img src="'+escapeHtml(item.cover_url)+'" alt="'+escapeHtml(item.title||"Album cover")+'">':'<strong>'+escapeHtml(String(item.title||"?").slice(0,1))+'</strong>';
  return '<article class="mockAlbumRow" onclick="event.stopPropagation();openLibraryAlbum(\''+encodeURIComponent(JSON.stringify(item))+'\')"><div class="mockAlbumCover">'+img+'</div><div><strong>'+escapeHtml(item.title||"Untitled")+'</strong><span>'+escapeHtml(item.artist||"")+(item.year?' &middot; '+escapeHtml(item.year):'')+'</span></div>'+scoreText+'</article>';
}
function libraryMatchLabel(similarity){
  return similarity>=70?"Very close taste":similarity>=30?"Some overlap":similarity>0?"Low overlap":"New territory";
}
function libraryBlock(library){
  const items=liveLibraryItems(Array.isArray(library.items)?library.items:[]);
  const isMine=library.device_id===state.deviceId||library.isMine;
  const key=escapeJsString(library.id||library.device_id||"");
  const canFollow=!isMine&&library.id&&String(library.id).indexOf("local-library-")!==0;
  const canRemove=(isMine||(currentUsername()&&String(library.username||"").toLowerCase()===currentUsername().toLowerCase()))&&library.id;
  const followers=Number(library.followers_count||0);
  const albumCount=Number(library.album_count||items.length||0);
  const genres=[...new Set(items.map(item=>item.genre).filter(Boolean))].slice(0,3);
  const tags=libraryGenreTags(genres,items);
  const avatar=(library.username||library.title||"L").trim().slice(0,1).toUpperCase()||"L";
  const mineItems=liveLibraryItems(myLibraryItems());
  const sharedCount=isMine?albumCount:items.filter(item=>mineItems.some(m=>String(m.id)===String(item.id)||isSameAlbum(m,item))).length;
  const discoveryCount=isMine?0:Math.max(0,albumCount-sharedCount);
  const similarity=isMine?100:librarySimilarity(items);
  const matchLabel=isMine?"Very close taste":libraryMatchLabel(similarity);
  const preview=items.slice(0,2);
  const extraCount=Math.max(0,items.length-preview.length);
  const albumPreview=items.length===1?libraryRowAlbum(items[0]):preview.map(libraryTinyAlbum).join("")+(extraCount?'<div class="mockMoreTile">+'+extraCount+'<br>more</div>':'');
  const discovery=isMine?'':'<div class="libraryDiscovery '+(sharedCount?"hasOverlap":"newTaste")+'"><strong>'+(sharedCount?sharedCount+' shared album'+(sharedCount===1?'':'s'):'Different taste, new discoveries')+'</strong><span>'+(sharedCount?'You already love some of this library.':'You have '+discoveryCount+' new discover'+(discoveryCount===1?'y':'ies')+' from this library.')+'</span></div>';
  return '<div class="libraryCard mockLibraryCard '+(isMine?'mockOwnCommunity':'')+'" onclick="openLibraryDetailsById(\''+key+'\')"><div class="mockLibraryTop"><div class="mockAvatar">'+escapeHtml(avatar)+'</div><div class="mockLibraryTitle"><h3>'+escapeHtml(library.title||"Library")+'</h3><p>@'+escapeHtml(library.username||"Listener")+' &middot; '+albumCount+' albums &middot; '+followers+' follower'+(followers===1?'':'s')+'</p></div><div class="mockMatch"><strong>'+similarity+'% match</strong><span>'+matchLabel+'</span></div>'+(canRemove?'<button class="libraryMenuBtn mockRemove" onclick="event.stopPropagation();removeLibrary(\''+escapeJsString(library.id)+'\')" title="Remove library">...</button>':'')+'</div><div class="mockDescriptor">'+escapeHtml(libraryGenreLabel(genres))+'</div><div class="mockTags">'+(tags.length?tags.map(tag=>'<span>'+escapeHtml(tag)+'</span>').join(""):'<span>Personal</span><span>Essentials</span>')+'</div><div class="mockAlbumPreview '+(items.length===1?'singlePreview':'')+'">'+(albumPreview||'<div class="emptyMini">No public albums yet.</div>')+'</div>'+discovery+'<div class="mockLibraryActions"><button class="libraryExploreBtn" onclick="event.stopPropagation();openLibraryDetailsById(\''+key+'\')">Explore Library</button>'+(canFollow?'<button class="libraryFollowBtn" onclick="event.stopPropagation();followLibrary(\''+escapeJsString(library.id)+'\')">Follow</button>':'<button class="libraryFollowBtn following" onclick="event.stopPropagation();openLibraryDetailsById(\''+key+'\')">✓ Following</button>')+'</div></div>';
}
function ownLibraryHero(library){
  const items=liveLibraryItems(Array.isArray(library.items)?library.items:[]);
  const followers=Number(library.followers_count||0);
  const key=escapeJsString(library.id||library.device_id||"");
  const recent=items.slice(0,3).map(item=>'<div class="ownRecentCover">'+(item.cover_url?'<img src="'+escapeHtml(item.cover_url)+'" alt="'+escapeHtml(item.title||"Album cover")+'">':'<strong>'+escapeHtml(String(item.title||"?").slice(0,1))+'</strong>')+'</div>').join("");
  const avatarCover=items[0]?.cover_url?'<img src="'+escapeHtml(items[0].cover_url)+'" alt="">':'<span>'+escapeHtml(String(library.username||"L").slice(0,1).toUpperCase())+'</span>';
  return '<section class="mockYourLibrary"><div class="ownIdentity"><div class="ownAvatar">'+avatarCover+'</div><div><p>Your Library</p><h3>'+escapeHtml(library.title||"Your Library")+'</h3><span>100% match</span><em>'+items.length+' albums &middot; '+followers+' follower'+(followers===1?'':'s')+'</em><button onclick="openLibraryDetailsById(\''+key+'\')">View your library →</button></div></div><div class="ownRecent"><p>Recently added</p><div>'+recent+'</div></div><div class="ownNumbers"><p>Your taste in numbers</p><div><strong>100%</strong><span>Albums you love</span></div><div><strong>'+items.length+'</strong><span>New discoveries</span></div><div><strong>'+items.length+'</strong><span>Shared albums</span></div></div></section>';
}
function libraryRecommendationPanel(){
  const mine=liveLibraryItems(myLibraryItems());
  const recs=state.albums.filter(album=>!mine.some(item=>isSameAlbum(item,album)||String(item.id)===String(album.id))).slice(0,4);
  if(!recs.length)return "";
  return '<div class="libraryRecoPanel"><h3>Because you loved these albums</h3><div>'+recs.map(album=>'<article onclick="openAlbum(\''+escapeJsString(album.id)+'\')">'+cover(album)+'<strong>'+escapeHtml(album.title)+'</strong><span>'+escapeHtml(album.artist)+' &middot; '+escapeHtml(album.year||"")+'</span><em>★ '+displayScore(album)+'</em></article>').join("")+'</div><button onclick="setView(\'rankings\')">Find more libraries →</button></div>';
}
function librariesView(){
  const username=currentUsername();
  const allLibraries=visibleLibraries();
  const mineCard=currentLibraryCard()||allLibraries.find(l=>(l.device_id===state.deviceId||l.isMine||(username&&String(l.username||"").toLowerCase()===username.toLowerCase())));
  const fallbackMine={id:"local-library-"+state.deviceId,device_id:state.deviceId,isMine:true,username:username||"Listener",title:(username?username:"Your")+"'s Library",items:liveLibraryItems(myLibraryItems()),album_count:myLibraryItems().length,followers_count:0};
  const displayMine=mineCard||fallbackMine;
  const query=String(state.librarySearch||"").toLowerCase().trim();
  const community=allLibraries.filter(l=>!(l.device_id===state.deviceId||l.isMine||(username&&String(l.username||"").toLowerCase()===username.toLowerCase()))).filter(l=>!query||(`${l.title||""} ${l.username||""} ${(Array.isArray(l.items)?l.items:[]).map(i=>`${i.title||""} ${i.artist||""}`).join(" ")}`).toLowerCase().includes(query));
  content.innerHTML=`<div class="mockLibrariesHeader"><div><h2>Libraries <span>✦</span></h2><p>Explore people through the albums they choose.</p></div><div class="mockLibraryTools"><label><span>⌕</span><input value="${escapeHtml(state.librarySearch||"")}" oninput="setLibrarySearch(this.value)" placeholder="Search libraries, people, albums..."></label><button onclick="openLibrarySpotifyAdd()">+ Add album</button></div></div>${ownLibraryHero(displayMine)}<div class="mockCommunityTitle"><div><strong>Community Libraries</strong><button>For you⌄</button></div><button onclick="setLibrarySearch('')">See all</button></div><div class="libraryGrid communityLibraryGrid mockCommunityGrid">${community.map(libraryBlock).join("")||'<div class="empty">No public libraries yet.</div>'}</div>${libraryRecommendationPanel()}`;
}
window.setLibrarySearch=function(value){state.librarySearch=value;librariesView()}
function genres(){return["All",...new Set(state.albums.map(a=>a.genre).filter(Boolean))]}
function filtered(){let a=state.albums.filter(x=>{let q=state.search.toLowerCase();return(state.genre==="All"||x.genre===state.genre)&&(`${x.title} ${x.artist} ${x.genre||""}`.toLowerCase().includes(q))});if(state.sort==="score")a.sort((x,y)=>score(y)-score(x));if(state.sort==="year")a.sort((x,y)=>(y.year||0)-(x.year||0));if(state.sort==="ratings")a.sort((x,y)=>count(y)-count(x));if(state.sort==="hidden")a.sort((x,y)=>count(x)-count(y));return a}
function card(a){return`<article class="card albumCard" onclick="openAlbum('${escapeJsString(a.id)}')">${cover(a)}<button class="quickLibraryAdd" onclick="event.stopPropagation();addCurrentAlbumToLibrary('${escapeJsString(a.id)}')">+ Add to my library</button><div class="cardBody"><div class="row"><div><div class="title">${escapeHtml(a.title)}</div><div class="artist">${escapeHtml(a.artist)} - ${escapeHtml(a.year||"")}</div></div><div class="score">${displayScore(a)}</div></div><span class="pill">${escapeHtml(a.genre||"Album")}</span></div></article>`}
function row(a,i){return`<div class="listRow" onclick="openAlbum('${escapeJsString(a.id)}')"><div class="rank">#${i+1}</div>${listCover(a)}<div><strong>${escapeHtml(a.title)}</strong><div class="artist">${escapeHtml(a.artist)} - ${escapeHtml(a.genre||"")} - ${count(a).toLocaleString()} ratings</div></div><div class="miniScore">${displayScore(a)}</div></div>`}
function render(){let arr=filtered();let top=state.albums.slice().sort((a,b)=>score(b)-score(a))[0];if(top){$("#heroScore").textContent=displayScore(top);$("#heroTitle").textContent=top.title;const heroCard=$("#heroCard");if(heroCard){if(top.cover_url){heroCard.style.setProperty("--hero-cover",`url("${top.cover_url}")`)}else{heroCard.style.removeProperty("--hero-cover")}}}$("#genreFilter").innerHTML=genres().map(g=>`<option ${g===state.genre?"selected":""}>${escapeHtml(g)}</option>`).join("");
if(state.view==="rankings")content.innerHTML=state.sort==="hidden"?`<div class="sectionTitle"><h2>Hidden Gems</h2></div><div class="empty">Coming soon</div>`:`<div class="sectionTitle"><h2>Top Albums</h2><span class="muted">${arr.length} results</span></div><div class="grid">${arr.map(card).join("")}</div>`;
if(state.view==="discover"){content.innerHTML=`<div class="sectionTitle"><h2>Hidden Gems</h2></div><div class="empty">Coming soon</div>`}
if(state.view==="artists"){content.innerHTML=artistPage()}
if(state.view==="myratings"){let rated=state.albums.filter(a=>userScore(a));content.innerHTML=rated.length?`<div class="sectionTitle"><h2>My Ratings</h2></div><div class="list">${rated.map(row).join("")}</div>`:`<div class="empty">You haven't rated anything yet.</div>`}
if(state.view==="libraries"){librariesView()}
}
function artistScoreLabel(albums){const rated=albums.filter(a=>score(a)>0);if(!rated.length)return "";return (rated.reduce((sum,a)=>sum+score(a),0)/rated.length).toFixed(1)}
function artistAlbumRow(a){return`<div class="artistAlbumRow" onclick="openAlbum('${escapeJsString(a.id)}')">${listCover(a)}<div><strong>${escapeHtml(a.title)}</strong>${count(a)>0?`<span>${count(a).toLocaleString()} ratings</span>`:""}</div><div class="artistAlbumScore">${score(a)>0?displayScore(a):""}</div></div>`}
function artistGenres(){const counts={};state.albums.forEach(a=>{if(a.genre)counts[a.genre]=(counts[a.genre]||0)+1});return ["Popular",...Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([genre])=>genre)]}
function artistRank(name){let albums=state.albums.filter(a=>a.artist===name);let rated=albums.filter(a=>score(a)>0||count(a)>0);let totalRatings=rated.reduce((sum,a)=>sum+count(a),0);let avg=rated.length?rated.reduce((sum,a)=>sum+score(a),0)/rated.length:0;let top=rated.length?Math.max(...rated.map(a=>score(a))):0;return {ratedCount:rated.length,totalRatings,avg,top}}
function artistNames(){let names=[...new Set(state.albums.map(a=>a.artist).filter(Boolean))];let q=state.artistSearch.toLowerCase().trim();let filtered=names.filter(name=>{let albums=state.albums.filter(a=>a.artist===name);let letterOk=state.artistLetter==="All"||String(name).trim().toUpperCase().startsWith(state.artistLetter);let genreOk=state.artistGenre==="All"||state.artistGenre==="Popular"||albums.some(a=>a.genre===state.artistGenre);let searchOk=!q||String(name).toLowerCase().includes(q)||albums.some(a=>`${a.title} ${a.genre||""}`.toLowerCase().includes(q));return letterOk&&genreOk&&searchOk});return filtered.sort((a,b)=>{let ra=artistRank(a),rb=artistRank(b);if(state.artistGenre==="All"||state.artistGenre==="Popular"){if(!!rb.ratedCount!==!!ra.ratedCount)return rb.ratedCount?1:-1;if(rb.avg!==ra.avg)return rb.avg-ra.avg;if(rb.top!==ra.top)return rb.top-ra.top;if(rb.totalRatings!==ra.totalRatings)return rb.totalRatings-ra.totalRatings}return a.localeCompare(b)})}
function renderArtistResults(){let artists=artistNames();let grid=$("#artistResults");let count=$("#artistCount");if(count)count.textContent=artists.length+" artist"+(artists.length===1?"":"s");if(grid)grid.innerHTML=artists.map(artistBlock).join("")||'<div class="empty">No artists found.</div>'}
function artistPage(){let letters=["All",..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];let genres=artistGenres();let artists=artistNames();let activeLetter=state.artistLetter==="All"?"A-Z Filter":state.artistLetter;return `<section class="artistDiscovery"><div><p class="eyebrow">Music culture</p><h2>Artists</h2><p>Discover legendary artists, hidden gems, and community favorites.</p></div><div class="artistSearchWrap"><input id="artistSearchInput" value="${escapeHtml(state.artistSearch)}" oninput="setArtistSearch(this.value)" placeholder="Search artists, albums, genres, moods..."><span id="artistCount">${artists.length} artist${artists.length===1?"":"s"}</span></div></section><div class="artistFilterDock"><div class="artistFilterLabel">Genres</div><div class="artistGenreChips">${genres.map(genre=>`<button class="${(state.artistGenre===genre||(genre==="Popular"&&state.artistGenre==="All"))?"active":""}" onclick="setArtistGenre('${escapeJsString(genre)}')">${escapeHtml(genre)}</button>`).join("")}<details class="artistAZMenu"><summary>${activeLetter} <span>v</span></summary><div class="artistAZ">${letters.map(letter=>`<button class="${state.artistLetter===letter?"active":""}" onclick="setArtistLetter('${letter}')">${letter}</button>`).join("")}</div></details></div></div><div id="artistResults" class="artistGrid">${artists.map(artistBlock).join("")||'<div class="empty">No artists found.</div>'}</div>`}window.setArtistLetter=function(letter){state.artistLetter=letter;render()}
window.setArtistGenre=function(genre){state.artistGenre=genre==="Popular"?"All":genre;render()}
window.setArtistSearch=function(value){state.artistSearch=value;renderArtistResults()}
function artistBlock(name){let d=state.albums.filter(a=>a.artist===name).sort((a,b)=>score(b)-score(a));let genres=[...new Set(d.map(a=>a.genre).filter(Boolean))].slice(0,3);let hero=d.find(a=>a.cover_url)||d[0]||{};let totalRatings=d.reduce((sum,a)=>sum+count(a),0);let featured=d.slice(0,4);return`<section class="artistCard"><div class="artistHero" style="--artist-cover:url('${escapeHtml(hero.cover_url||"")}')"><div><h3>${escapeHtml(name)}</h3><p>${genres.length?escapeHtml(genres.join(" - "))+" - ":""}${d.length} album${d.length===1?"":"s"} ranked</p><div class="artistTags">${genres.map(g=>`<span>${escapeHtml(g)}</span>`).join("")}</div></div><div class="artistScore">${artistScoreLabel(d)}${totalRatings?`<span>${totalRatings.toLocaleString()} ratings</span>`:""}</div></div><div class="artistAlbumList">${featured.map(artistAlbumRow).join("")}</div></section>`}

window.openAlbum=function(id){
  let a=state.albums.find(x=>String(x.id)===String(id));
  if(!a)return;
  extras.currentAlbumId=albumRef(a.id);
  const albumScore=displayScore(a);
  const total=count(a).toLocaleString();
  const albumId=escapeJsString(a.id);
  const initial=escapeHtml((currentUsername()||ratingName()||"J").slice(0,1).toUpperCase());
  const coverUrl=escapeHtml(a.cover_url||"");
  const summary=cleanAlbumSummary(a)||"A landmark record about legacy, memory, struggle, and the weight of feeling. Raw, cinematic, and timeless.";
  const tags=[a.genre||"Album",a.year?String(a.year):"Classic","Community pick"].filter(Boolean).slice(0,4);
  $("#albumModalContent").innerHTML=`<div class="linerAlbumPage"><div class="linerTabs"><button>Overview</button><button class="active">Tracks</button><button>Ratings & Reviews</button><button>Activity</button></div><section class="linerHero" style="--album-cover:url('${coverUrl}')"><div class="linerCover">${cover(a)}</div><div class="linerHeroCopy"><p class="eyebrow">Album · ${escapeHtml(a.year||"")}</p><h2>${escapeHtml(a.title)}</h2><h3>${escapeHtml(a.artist)} <span>●</span></h3><p>${escapeHtml(summary)}</p><div class="linerTags">${tags.map(tag=>`<span>${escapeHtml(tag)}</span>`).join("")}</div><div class="linerStats"><div><strong>${albumScore}</strong><span>Community score</span></div><div><strong>${total}</strong><span>Ratings</span></div><div><strong>${libraryHasAlbum(a)?"#1":"+"}</strong><span>In your library</span></div></div><div class="linerActions"><button onclick="addCurrentAlbumToLibrary('${albumId}')">+ Add to my library</button><a target="_blank" href="${escapeHtml(a.spotify_url||`https://open.spotify.com/search/${encodeURIComponent(a.title+" "+a.artist)}`)}"><span class="spotifyMark" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11"></circle><path d="M7 9.2c3.4-1 7.3-.7 10.2.9"></path><path d="M7.6 12.1c2.8-.8 6-.5 8.2.7"></path><path d="M8.2 14.8c2.1-.5 4.4-.3 6.2.6"></path></svg></span>Open in Spotify</a></div></div></section><section class="linerContentGrid"><div class="linerPanel trackPanel"><div class="linerPanelTitle"><span>★</span><div><h3>Track Highlights</h3><p>Most loved moments from this album.</p></div></div><div class="linerScoreRow"><div class="scoreRing"><strong>${albumScore}</strong><span>avg. rating ★</span></div><div class="ratingBars"><div><span>5 ★</span><b style="--w:72%"></b><em>72%</em></div><div><span>4 ★</span><b style="--w:20%"></b><em>20%</em></div><div><span>3 ★</span><b style="--w:6%"></b><em>6%</em></div><div><span>2 ★</span><b style="--w:1%"></b><em>1%</em></div><div><span>1 ★</span><b style="--w:1%"></b><em>1%</em></div></div></div><div id="trackRatingsList"><div class="emptyMini">Loading tracks...</div></div></div><div class="linerPanel reactionsPanel"><div class="linerPanelTitle"><span>▱</span><div><h3>Listener Reactions</h3><p>What the community is saying.</p></div></div><div class="linerComposer"><div class="voiceAvatar gold">${initial}</div><textarea id="commentText" maxlength="500" placeholder="What moment on this album hits hardest?"></textarea><input id="commentName" type="hidden" value="${escapeHtml(currentUsername()||ratingName()||"Listener")}"><div><span>☺</span><em>0/500</em><button onclick="addAlbumComment('${albumId}')">Post</button></div></div><div class="reactionFilters"><button class="active">• Top</button><button>• Recent</button><button>• Friends</button></div><div id="commentsList" class="commentsList"><div class="emptyMini">Loading reactions...</div></div><button class="allReactions">View all reactions <span>⌄</span></button></div></section><div class="linerPlayer"><div>${cover(a)}<div><strong>${escapeHtml(a.title)}</strong><span>${escapeHtml(a.artist)} · ${escapeHtml(a.title)}</span></div></div><div><button>◀</button><button class="playNow" id="albumPreviewPlay" onclick="playFirstAlbumPreview(this)">▶</button><button>▶</button></div></div></div>`;
  $("#albumModal").classList.remove("hidden");
  loadAlbumExtras(a);
}
window.deleteAlbum=async function(albumId){
  const album=state.albums.find(a=>String(a.id)===String(albumId));
  if(!album)return;
  if(!confirm(`Delete "${album.title}" from Musica?`))return;
  const ref=albumRef(albumId);
  if(String(albumId).startsWith("seed-")){
    const hidden=[...new Set([...hiddenSeedAlbums(),albumId])];
    saveHiddenSeedAlbums(hidden);
  }else if(db){
    await db.from("album_comments").delete().eq("album_ref",ref);
    await db.from("track_ratings").delete().eq("album_ref",ref);
    await db.from("track_comments").delete().eq("album_ref",ref);
    const {error}=await db.from("albums").delete().eq("id",albumId);
    if(error){alert(error.message);return}
  }else{
    saveLocalAlbums(localAlbums().filter(a=>String(a.id)!==String(albumId)));
    const comments=localComments();delete comments[ref];saveLocalComments(comments);
    const ratings=localTrackRatings();
    Object.keys(ratings).forEach(key=>{if(key.startsWith(ref+"::"))delete ratings[key]});
    saveLocalTrackRatings(ratings);
    const trackComments=localTrackComments();
    Object.keys(trackComments).forEach(key=>{if(key.startsWith(ref+"::"))delete trackComments[key]});
    saveLocalTrackComments(trackComments);
  }
  stopTrackPreview();$("#albumModal").classList.add("hidden");
  await loadData();
refreshNotifications();
}

window.rateAlbum=async function(albumId,value){const username=ratingName();let r=localRatings();r[albumId]=value;saveLocalRatings(r);state.ratingMap=r;if(db&&!String(albumId).startsWith("seed-")){let {error}=await db.from("ratings").upsert({album_id:albumId,device_id:state.deviceId,username,rating:value},{onConflict:"album_id,device_id"});if(error){alert(error.message);return}await loadData();openAlbum(albumId)}else{render();openAlbum(albumId)}}
async function loadData(){if(!db){$("#setupWarning").classList.remove("hidden");state.albums=[...seedAlbums.filter(a=>!hiddenSeedAlbums().includes(a.id)),...localAlbums()];state.ratingMap=localRatings();applyCachedCovers();render();hydrateMissingCovers();return}let {data:albums,error}=await db.from("album_scores").select("*").order("avg_rating",{ascending:false});if(error){alert(error.message);state.albums=seedAlbums}else{state.albums=[...seedAlbums,...(albums||[])]}if(!state.albums.length){state.albums=seedAlbums}let {data:ratings,error:ratingsError}=await db.from("ratings").select("album_id,rating").eq("device_id",state.deviceId);state.ratingMap=ratingsError?localRatings():Object.fromEntries((ratings||[]).map(r=>[r.album_id,r.rating]));applyCachedCovers();render();hydrateMissingCovers()}
function openSpotifyAdd(target){
  extras.spotifyTarget=target||"musica";
  const title=$("#addModalTitle");
  const copy=$("#addModalCopy");
  if(title)title.textContent=extras.spotifyTarget==="library"?"Add album to your library":"Add album from Spotify";
  if(copy)copy.textContent=extras.spotifyTarget==="library"?"Search Spotify. If the album is already in Musica, it will be added from the existing main page album. If not, Musica adds it once first.":"Search an album and artist. Choose the correct result and Musica pulls the cover, year, and Spotify link automatically.";
  const status=$("#spotifyStatus");
  const results=$("#spotifyResults");
  if(status)status.textContent="";
  if(results)results.innerHTML="";
  $("#addModal").classList.remove("hidden");
}
window.openLibrarySpotifyAdd=function(){openSpotifyAdd("library")}
async function searchSpotify(){
  const q=$("#spotifyQuery").value.trim();
  if(!q)return;
  $("#spotifyStatus").textContent="Searching Spotify...";
  $("#spotifyResults").innerHTML="";
  try{
    const res=await fetch(`/.netlify/functions/album-search?q=${encodeURIComponent(q)}&v=final2`,{cache:"no-store"});
    const text=await res.text();
    let data;
    try{data=JSON.parse(text)}catch(parseError){throw new Error("Spotify function is not returning JSON yet. Open /.netlify/functions/album-search?q=rubber%20soul to test the function directly.")}
    if(!res.ok)throw new Error(data.error||"Spotify search failed.");
    const albums=data.albums||[];
    $("#spotifyStatus").textContent=albums.length?"Choose an album:":"No results found.";
    $("#spotifyResults").innerHTML=albums.map((a,i)=>`
      <div class="spotifyResult">
        <img src="${escapeHtml(a.cover_url||"")}" onerror="this.style.visibility='hidden'" alt="${escapeHtml(a.title||"Album cover")}">
        <div>
          <strong>${escapeHtml(a.title)}</strong>
          <div class="artist">${escapeHtml(a.artist)} - ${escapeHtml(a.year||"")}</div>
        </div>
        <button class="bigBtn" data-index="${i}">${extras.spotifyTarget==="library"?"Add to library":"Add"}</button>
      </div>
    `).join("");
    document.querySelectorAll("#spotifyResults .bigBtn").forEach(button=>{button.onclick=()=>addSpotifyAlbum(albums[Number(button.dataset.index)])});
  }catch(e){
    $("#spotifyStatus").textContent=e.message;
  }
}
window.addSpotifyAlbum=async function(a){
  let album={title:a.title,artist:a.artist,year:a.year,genre:"",cover_url:a.cover_url,spotify_url:a.spotify_url,summary:spotifyAlbumSummary(a),spotify_id:a.spotify_id||""};
  let duplicate=existingAlbumMatch(album);
  let savedAlbum=duplicate;
  if(!savedAlbum){
    if(db){
      let {data,error}=await db.from("albums").insert(album).select("*").single();
      if(error){alert(error.message);return}
      savedAlbum=data||album;
    }else{
      savedAlbum={...album,id:"local-"+Date.now(),avg_rating:0,ratings_count:0};
      let arr=localAlbums();arr.push(savedAlbum);saveLocalAlbums(arr);
    }
    await loadData();
    savedAlbum=state.albums.find(x=>String(x.spotify_id||"")&&String(x.spotify_id)===String(album.spotify_id||""))||existingAlbumMatch(album)||savedAlbum;
  }
  if(extras.spotifyTarget==="library"){
    const added=await addAlbumToMyLibrary(savedAlbum);
    if(added)$("#spotifyStatus").textContent=duplicate?'Added the existing Musica album to your public library.':'Added to Musica and your public library.';
    render();
    return;
  }
  if(duplicate){$("#spotifyStatus").textContent=`"${duplicate.title}" by ${duplicate.artist} is already in Musica. Use the hover button or album page to add it to your library.`;return}
  $("#spotifyStatus").textContent='Added to Musica. You can keep adding more albums.';
  await loadData();
}
function openNav(){$("#sideNav").classList.add("open");$("#navOverlay").classList.remove("hidden")}function closeNav(){$("#sideNav").classList.remove("open");$("#navOverlay").classList.add("hidden")}
updateNavUsername();$("#notificationBell").onclick=async e=>{e.stopPropagation();const panel=$("#notificationPanel");panel.classList.toggle("hidden");await refreshNotifications();if(panel&&!panel.classList.contains("hidden")&&unreadFollowerCount()>0){const library=myPublishedLibrary();localStorage.setItem(followerSeenKey(),String(Number(library?.followers_count||0)));const badge=$("#notificationBadge");if(badge){badge.textContent="0";badge.classList.add("hidden")}}};$("#notificationPanel").onclick=e=>e.stopPropagation();document.addEventListener("click",()=>$("#notificationPanel")?.classList.add("hidden"));$("#navSetUsername").onclick=setLibraryUsername;$("#menuBtn").onclick=openNav;$("#closeNav").onclick=closeNav;$("#navOverlay").onclick=closeNav;$("#addAlbumBtn").onclick=()=>openSpotifyAdd("musica");$("#navAddAlbum").onclick=()=>{openSpotifyAdd("musica");closeNav()};$("#spotifySearchBtn").onclick=searchSpotify;$("#spotifyQuery").addEventListener("keydown",e=>{if(e.key==="Enter")searchSpotify()});
$("#closeAlbumModal").onclick=()=>stopTrackPreview();$("#albumModal").classList.add("hidden");$("#closeAddModal").onclick=()=>$("#addModal").classList.add("hidden");$("#albumModal").onclick=e=>{if(e.target.id==="albumModal")$("#albumModal").classList.add("hidden")};$("#addModal").onclick=e=>{if(e.target.id==="addModal")$("#addModal").classList.add("hidden")};
function goHome(){state.view="rankings";document.querySelectorAll(".tab,.navItem[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view==="rankings"));render();closeNav();window.scrollTo({top:0,behavior:"smooth"})}
function rememberSiteState(){if(!history.state||!history.state.musica)history.replaceState({musica:"home"},"");history.pushState({musica:"inside"},"")}
rememberSiteState();
window.addEventListener("popstate",()=>{if(!$("#albumModal").classList.contains("hidden")){stopTrackPreview();$("#albumModal").classList.add("hidden");history.pushState({musica:"inside"},"");return}if(!$("#addModal").classList.contains("hidden")){$("#addModal").classList.add("hidden");history.pushState({musica:"inside"},"");return}goHome();history.pushState({musica:"inside"},"")});
document.querySelectorAll(".tab,.navItem[data-view]").forEach(t=>t.onclick=async()=>{state.view=t.dataset.view;if(state.view==="libraries")await loadLibraries();document.querySelectorAll(".tab,.navItem[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view===state.view));render();closeNav()});
$("#searchInput").oninput=e=>{state.search=e.target.value;render()};$("#genreFilter").onchange=e=>{state.genre=e.target.value;render()};$("#sortSelect").onchange=e=>{state.sort=e.target.value;render()};const themeToggle=$("#themeToggle");function syncThemeToggle(){if(themeToggle)themeToggle.setAttribute("aria-label",document.body.classList.contains("light")?"Switch to dark mode":"Switch to light mode")}syncThemeToggle();themeToggle.onclick=()=>{document.body.classList.toggle("light");state.theme=document.body.classList.contains("light")?"light":"dark";localStorage.setItem("musicaThemePreference",state.theme);syncThemeToggle()};
loadData();






































window.playFirstAlbumPreview=function(button){const ref=extras.currentAlbumId;const track=(extras.tracks[ref]||[]).find(t=>t.preview_url);if(!track){alert("Spotify does not provide 30 second samples for this album.");return}playTrackPreview(previewPayload(track),button)};


















