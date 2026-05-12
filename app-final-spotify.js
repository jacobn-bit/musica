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
const state={view:"rankings",search:"",genre:"All",sort:"score",albums:[],ratingMap:{},theme:localStorage.getItem("musicaTheme")||"dark",deviceId:localStorage.getItem("musicaDeviceId")||crypto.randomUUID()};
const extras={tracks:{},trackRatings:{},songScores:{},ratingDetails:{},trackRatingDetails:{},comments:{},libraries:[],currentAlbumId:null,spotifyTarget:"musica"};
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
function trackKey(track){return String(track.spotify_id||track.id||track.name||"").toLowerCase()}
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
  host.innerHTML=comments.length?comments.map(c=>`<div class="commentItem"><strong>${escapeHtml(c.name||"Listener")}</strong><p>${escapeHtml(c.comment||c.text||"")}</p></div>`).join(""):`<div class="emptyMini">No comments yet.</div>`;
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
async function fetchTracksFromItunes(album){
  const search=await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(`${album.title} ${album.artist}`)}&media=music&entity=album&limit=1`,{cache:"force-cache"});
  if(!search.ok)return [];
  const found=await search.json();
  const collectionId=found.results?.[0]?.collectionId;
  if(!collectionId)return [];
  const lookup=await fetch(`https://itunes.apple.com/lookup?id=${collectionId}&entity=song`,{cache:"force-cache"});
  if(!lookup.ok)return [];
  const data=await lookup.json();
  return (data.results||[]).filter(x=>x.wrapperType==="track").map((x,i)=>({name:x.trackName,track_number:x.trackNumber||i+1,spotify_id:String(x.trackId||x.trackName)}));
}
async function fetchAlbumTracks(album){
  const ref=albumRef(album.id);
  if(extras.tracks[ref])return extras.tracks[ref];
  let tracks=[];
  try{
    const params=new URLSearchParams({title:album.title||"",artist:album.artist||""});
    if(album.spotify_id)params.set("spotify_id",album.spotify_id);
    const res=await fetch(`/.netlify/functions/album-tracks?${params.toString()}&v=1`,{cache:"no-store"});
    if(res.ok){const data=await res.json();tracks=data.tracks||[]}
  }catch(e){}
  if(!tracks.length)tracks=await fetchTracksFromItunes(album).catch(()=>[]);
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
  if(!tracks.length){host.innerHTML='<div class="emptyMini">No track list found for this album yet.</div>';return}
  host.innerHTML=tracks.map((track,i)=>{
    const key=trackKey(track);
    const current=ratings[key]||localTrackRating(albumId,key);
    return `<div class="trackItem"><div class="trackName"><span>${track.track_number||i+1}</span><strong>${escapeHtml(track.name)}</strong><em>${displaySongScore(songScores[key])} - ${displaySongCount(songScores[key])}</em></div><div class="trackActions"><button class="trackRateOpen" onclick="openTrackRating('${escapeJsString(albumId)}','${escapeJsString(key)}','${escapeJsString(track.name)}')">${current?`Rated ${current}`:"Rate"}</button><button class="trackCommentOpen" onclick="openTrackComments('${escapeJsString(albumId)}','${escapeJsString(key)}','${escapeJsString(track.name)}')">Comment</button></div></div>`;
  }).join("");
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
}
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
    if(!error){extras.libraries=data||[];return extras.libraries}
  }
  extras.libraries=localLibraries();
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
  const card='<article class="card libraryAlbumCard" onclick="event.stopPropagation();openLibraryAlbum(\''+encoded+'\')">'+(item.cover_url?'<div class="cover"><img src="'+escapeHtml(item.cover_url)+'" alt="'+escapeHtml(item.title||"Album cover")+'"></div>':'<div class="cover fallbackCover"><strong>'+escapeHtml(String(item.title||"?").slice(0,1))+'</strong></div>')+'<div class="cardBody"><div class="row"><div><div class="title">'+escapeHtml(item.title||"Untitled")+'</div><div class="artist">'+escapeHtml(item.artist||"")+(item.year?' - '+escapeHtml(item.year):'')+'</div></div><div class="score">'+escapeHtml(item.rating||"-")+'</div></div><span class="pill">Library pick</span></div></article>';
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
function libraryBlock(library){
  const items=liveLibraryItems(Array.isArray(library.items)?library.items:[]);
  const isMine=library.device_id===state.deviceId||library.isMine;
  const preview=items.slice(0,2).map(item=>libraryAlbumCard(item,false)).join("");
  const key=escapeJsString(library.id||library.device_id||"");
  const canFollow=!isMine&&library.id&&String(library.id).indexOf("local-library-")!==0;
  return '<div class="libraryCard" onclick="openLibraryDetailsById(\''+key+'\')"><div class="row"><div><h3>'+escapeHtml(library.title||"Library")+'</h3><div class="artist">@'+escapeHtml(library.username||"Listener")+' - '+Number(library.album_count||items.length||0)+' albums</div></div><div class="miniScore">'+Number(library.followers_count||0).toLocaleString()+' followers</div></div><div class="libraryAlbums libraryAlbumsPreview">'+(preview||'<div class="emptyMini">No public albums yet.</div>')+'</div><div class="libraryActions">'+(items.length>2?'<button class="linkBtn libraryOpenBtn" onclick="event.stopPropagation();openLibraryDetailsById(\''+key+'\')">See all albums</button>':'')+(canFollow?'<button class="trackRateOpen" onclick="event.stopPropagation();followLibrary(\''+escapeJsString(library.id)+'\')">Follow</button>':'')+'</div></div>';
}

function genres(){return["All",...new Set(state.albums.map(a=>a.genre).filter(Boolean))]}
function filtered(){let a=state.albums.filter(x=>{let q=state.search.toLowerCase();return(state.genre==="All"||x.genre===state.genre)&&(`${x.title} ${x.artist} ${x.genre||""}`.toLowerCase().includes(q))});if(state.sort==="score")a.sort((x,y)=>score(y)-score(x));if(state.sort==="year")a.sort((x,y)=>(y.year||0)-(x.year||0));if(state.sort==="ratings")a.sort((x,y)=>count(y)-count(x));if(state.sort==="hidden")a.sort((x,y)=>count(x)-count(y));return a}
function card(a){return`<article class="card albumCard" onclick="openAlbum('${escapeJsString(a.id)}')">${cover(a)}<button class="quickLibraryAdd" onclick="event.stopPropagation();addCurrentAlbumToLibrary('${escapeJsString(a.id)}')">+ Add to my library</button><div class="cardBody"><div class="row"><div><div class="title">${escapeHtml(a.title)}</div><div class="artist">${escapeHtml(a.artist)} - ${escapeHtml(a.year||"")}</div></div><div class="score">${displayScore(a)}</div></div><span class="pill">${escapeHtml(a.genre||"Album")}</span></div></article>`}
function row(a,i){return`<div class="listRow" onclick="openAlbum('${escapeJsString(a.id)}')"><div class="rank">#${i+1}</div>${listCover(a)}<div><strong>${escapeHtml(a.title)}</strong><div class="artist">${escapeHtml(a.artist)} - ${escapeHtml(a.genre||"")} - ${count(a).toLocaleString()} ratings</div></div><div class="miniScore">${displayScore(a)}</div></div>`}
function render(){let arr=filtered();let top=state.albums.slice().sort((a,b)=>score(b)-score(a))[0];if(top){$("#heroScore").textContent=displayScore(top);$("#heroTitle").textContent=top.title}$("#genreFilter").innerHTML=genres().map(g=>`<option ${g===state.genre?"selected":""}>${escapeHtml(g)}</option>`).join("");
if(state.view==="rankings")content.innerHTML=`<div class="sectionTitle"><h2>Top Albums</h2><span class="muted">${arr.length} results</span></div><div class="grid">${arr.map(card).join("")}</div>`;
if(state.view==="discover"){let hidden=state.albums.slice().sort((a,b)=>count(a)-count(b)).slice(0,6);let newer=state.albums.slice().sort((a,b)=>(b.year||0)-(a.year||0)).slice(0,6);content.innerHTML=`<div class="sectionTitle"><h2>Hidden Gems</h2></div><div class="list">${hidden.map(row).join("")}</div><div class="sectionTitle"><h2>Newer Albums</h2></div><div class="list">${newer.map(row).join("")}</div>`}
if(state.view==="artists"){let artists=[...new Set(state.albums.map(a=>a.artist))].sort();content.innerHTML=`<div class="sectionTitle"><h2>Artists</h2></div><div class="artistGrid">${artists.map(artistBlock).join("")}</div>`}
if(state.view==="myratings"){let rated=state.albums.filter(a=>userScore(a));content.innerHTML=rated.length?`<div class="sectionTitle"><h2>My Ratings</h2></div><div class="list">${rated.map(row).join("")}</div>`:`<div class="empty">You haven't rated anything yet.</div>`}
if(state.view==="libraries"){const libraries=visibleLibraries();content.innerHTML=`<div class="sectionTitle"><h2>Libraries</h2></div><div class="libraryCreator"><input id="libraryTitle" placeholder="Library name" value="${escapeHtml(currentUsername()?currentUsername()+"'s Library":"My Library")}"><button class="bigBtn" onclick="openLibrarySpotifyAdd()">+ Add album</button></div><div class="libraryGrid">${libraries.map(libraryBlock).join("")||'<div class="empty">No public libraries yet.</div>'}</div>`}}
function artistBlock(name){let d=state.albums.filter(a=>a.artist===name).sort((a,b)=>score(b)-score(a));let avg=(d.reduce((s,a)=>s+score(a),0)/d.length).toFixed(1);return`<div class="artistBlock"><div class="row"><h3 style="margin:0">${escapeHtml(name)}</h3><div class="score">${avg}</div></div><div class="list" style="margin-top:12px">${d.map((a,i)=>row(a,i)).join("")}</div></div>`}
window.openAlbum=function(id){let a=state.albums.find(x=>String(x.id)===String(id));if(!a)return;let my=userScore(a);extras.currentAlbumId=albumRef(a.id);$("#albumModalContent").innerHTML=`<div class="detail">${cover(a)}<div><p class="eyebrow">${escapeHtml(a.genre||"Album")} - ${escapeHtml(a.year||"")}</p><h2 style="font-size:34px;margin:0 0 6px">${escapeHtml(a.title)}</h2><div class="artist" style="font-size:18px">${escapeHtml(a.artist)}</div><div style="margin:18px 0"><div class="scoreBig">${displayScore(a)}</div><div class="muted">Musica Score - ${count(a).toLocaleString()} ratings</div></div><p>${escapeHtml(cleanAlbumSummary(a))}</p><strong>Your rating</strong><div class="ratingBar">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button class="rateBtn ${my==n?"selected":""}" onclick="rateAlbum('${escapeJsString(a.id)}',${n})">${n}</button>`).join("")}</div><div class="ratingDetailsBlock"><button class="linkBtn" onclick="toggleRatingDetails('albumRatingDetails',this)">See ratings</button><div id="albumRatingDetails" class="hidden"><div class="emptyMini">Loading ratings...</div></div></div><div class="albumActions"><button class="btn" onclick="addCurrentAlbumToLibrary('${escapeJsString(a.id)}')">Add to my library</button><a class="btn" target="_blank" href="${escapeHtml(a.spotify_url||`https://open.spotify.com/search/${encodeURIComponent(a.title+" "+a.artist)}`)}">Open in Spotify</a></div></div></div><section class="albumExtras"><div class="extraPanel"><div class="sectionTitle compact"><h3>Song Ratings</h3></div><div id="trackRatingsList" class="trackRatings"><div class="emptyMini">Loading tracks...</div></div></div><div class="extraPanel"><div class="sectionTitle compact"><h3>Comments</h3></div><div class="commentForm"><input id="commentName" maxlength="40" placeholder="Your name"><textarea id="commentText" maxlength="500" placeholder="Leave a comment"></textarea><button class="bigBtn" onclick="addAlbumComment('${escapeJsString(a.id)}')">Post</button></div><div id="commentsList" class="commentsList"><div class="emptyMini">Loading comments...</div></div></div></section>`;$("#albumModal").classList.remove("hidden");loadAlbumExtras(a)}

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
  $("#albumModal").classList.add("hidden");
  await loadData();
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
updateNavUsername();$("#navSetUsername").onclick=setLibraryUsername;$("#menuBtn").onclick=openNav;$("#closeNav").onclick=closeNav;$("#navOverlay").onclick=closeNav;$("#addAlbumBtn").onclick=()=>openSpotifyAdd("musica");$("#navAddAlbum").onclick=()=>{openSpotifyAdd("musica");closeNav()};$("#spotifySearchBtn").onclick=searchSpotify;$("#spotifyQuery").addEventListener("keydown",e=>{if(e.key==="Enter")searchSpotify()});
$("#closeAlbumModal").onclick=()=>$("#albumModal").classList.add("hidden");$("#closeAddModal").onclick=()=>$("#addModal").classList.add("hidden");$("#albumModal").onclick=e=>{if(e.target.id==="albumModal")$("#albumModal").classList.add("hidden")};$("#addModal").onclick=e=>{if(e.target.id==="addModal")$("#addModal").classList.add("hidden")};
function goHome(){state.view="rankings";document.querySelectorAll(".tab,.navItem[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view==="rankings"));render();closeNav();window.scrollTo({top:0,behavior:"smooth"})}
function rememberSiteState(){if(!history.state||!history.state.musica)history.replaceState({musica:"home"},"");history.pushState({musica:"inside"},"")}
rememberSiteState();
window.addEventListener("popstate",()=>{if(!$("#albumModal").classList.contains("hidden")){$("#albumModal").classList.add("hidden");history.pushState({musica:"inside"},"");return}if(!$("#addModal").classList.contains("hidden")){$("#addModal").classList.add("hidden");history.pushState({musica:"inside"},"");return}goHome();history.pushState({musica:"inside"},"")});
document.querySelectorAll(".tab,.navItem[data-view]").forEach(t=>t.onclick=async()=>{state.view=t.dataset.view;if(state.view==="libraries")await loadLibraries();document.querySelectorAll(".tab,.navItem[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view===state.view));render();closeNav()});
$("#searchInput").oninput=e=>{state.search=e.target.value;render()};$("#genreFilter").onchange=e=>{state.genre=e.target.value;render()};$("#sortSelect").onchange=e=>{state.sort=e.target.value;render()};$("#themeToggle").onclick=()=>{document.body.classList.toggle("light");state.theme=document.body.classList.contains("light")?"light":"dark";localStorage.setItem("musicaTheme",state.theme)};
loadData();







