const seedAlbums=[
{id:"seed-1",title:"Abbey Road",artist:"The Beatles",year:1969,genre:"Rock",avg_rating:9.4,ratings_count:18432,tag:"Classic",summary:"Polished, melodic, and endlessly replayable.",spotify_url:"https://open.spotify.com/search/The%20Beatles%20Abbey%20Road",cover_url:"https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/48/53/43/485343e3-dd6a-0034-faec-f4b6403f8108/13UMGIM63890.rgb.jpg/600x600bb.jpg"},
{id:"seed-2",title:"To Pimp a Butterfly",artist:"Kendrick Lamar",year:2015,genre:"Hip-Hop",avg_rating:9.3,ratings_count:22102,tag:"Modern classic",summary:"Dense, political, jazz-infused, and emotionally huge.",spotify_url:"https://open.spotify.com/search/Kendrick%20Lamar%20To%20Pimp%20a%20Butterfly",cover_url:"https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/b5/a6/91/b5a69171-5232-3d5b-9c15-8963802f83dd/15UMGIM15814.rgb.jpg/600x600bb.jpg"},
{id:"seed-3",title:"OK Computer",artist:"Radiohead",year:1997,genre:"Alternative",avg_rating:9.2,ratings_count:20110,tag:"Essential",summary:"Alienation, technology, beauty, and dread in one perfect arc.",spotify_url:"https://open.spotify.com/search/Radiohead%20OK%20Computer",cover_url:"https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/07/60/ba/0760ba0f-148c-b18f-d0ff-169ee96f3af5/634904078164.png/600x600bb.jpg"},
{id:"seed-4",title:"Songs in the Key of Life",artist:"Stevie Wonder",year:1976,genre:"Soul",avg_rating:9.2,ratings_count:11240,tag:"Masterpiece",summary:"Warm, ambitious, human, and full of life.",spotify_url:"https://open.spotify.com/search/Stevie%20Wonder%20Songs%20in%20the%20Key%20of%20Life",cover_url:"https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/eb/1f/12/eb1f12ec-474c-63aa-43af-09282f423b9d/00602537004737.rgb.jpg/600x600bb.jpg"},
{id:"seed-5",title:"Illmatic",artist:"Nas",year:1994,genre:"Hip-Hop",avg_rating:9.1,ratings_count:16650,tag:"Essential",summary:"Compact, cinematic, and one of rap's purest statements.",spotify_url:"https://open.spotify.com/search/Nas%20Illmatic",cover_url:"https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/b9/eb/cc/b9ebccbc-5ba4-2cdb-5332-b065739abd9a/886444567619.jpg/600x600bb.jpg"},
{id:"seed-6",title:"Rumours",artist:"Fleetwood Mac",year:1977,genre:"Pop Rock",avg_rating:9.0,ratings_count:15100,tag:"Timeless",summary:"Perfect songwriting wrapped in heartbreak and tension.",spotify_url:"https://open.spotify.com/search/Fleetwood%20Mac%20Rumours",cover_url:"https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/4d/13/ba/4d13bac3-d3d5-7581-2c74-034219eadf2b/081227970949.jpg/600x600bb.jpg"}
];

const cfg=window.MUSICA_CONFIG||{};
const SUPABASE_URL=cfg.SUPABASE_URL||cfg.VITE_SUPABASE_URL||window.VITE_SUPABASE_URL||"";
const SUPABASE_ANON_KEY=cfg.SUPABASE_ANON_KEY||cfg.VITE_SUPABASE_ANON_KEY||window.VITE_SUPABASE_ANON_KEY||"";
function firstConfigValue(keys){
  for(const key of keys){
    const value=cfg[key]??window[key];
    if(String(value||"").trim())return String(value).trim();
  }
  return "";
}
function normalizeAdminPinValue(value){return String(value??"").replace(/[\u200B-\u200D\uFEFF]/g,"").trim().replace(/^['"]|['"]$/g,"").trim()}
const ADMIN_PIN_CONFIG=cfg.VITE_ADMIN_PIN||cfg.ADMIN_PIN||cfg.MUSICA_ADMIN_PIN||cfg.NEXT_PUBLIC_ADMIN_PIN||window.VITE_ADMIN_PIN||window.ADMIN_PIN||window.MUSICA_ADMIN_PIN||window.NEXT_PUBLIC_ADMIN_PIN||"";
const ADMIN_PIN_STORAGE_KEYS=["muzeAdminExpectedPin","muzeAdminPin","musicaAdminPinExpected"];
const ADMIN_PIN_HASHES=["71bdc015e35ca2f9fbb2cfd5c82374fba64813d4a7a1baae09e29f27f46891c5"];
function validSupabaseConfig(){
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(String(SUPABASE_URL||"").trim())
    && String(SUPABASE_ANON_KEY||"").split(".").length===3
    && !String(SUPABASE_URL).includes("PASTE_")
    && !String(SUPABASE_ANON_KEY).includes("PASTE_");
}
const configured=validSupabaseConfig();
const db=configured&&window.supabase&&typeof window.supabase.createClient==="function"?window.supabase.createClient(SUPABASE_URL.trim(),SUPABASE_ANON_KEY.trim()):null;
const MUSICA_CLIENT_DATA_VERSION="canonical-release-years-2026-08-13-1";
function isLocalRuntime(){
  const host=String(location.hostname||"");
  return location.protocol==="file:"||["localhost","127.0.0.1",""].includes(host)||/^192\.168\./.test(host)||/^10\./.test(host)||/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)||host.endsWith(".local");
}
function resetStaleClientData(){
  try{
    const previous=localStorage.getItem("musicaClientDataVersion");
    if(previous!==MUSICA_CLIENT_DATA_VERSION){
      ["musicaLocalAlbums","musicaLocalRatings"].forEach(key=>localStorage.removeItem(key));
      localStorage.setItem("musicaClientDataVersion",MUSICA_CLIENT_DATA_VERSION);
    }
    if("serviceWorker" in navigator){navigator.serviceWorker.getRegistrations().then(registrations=>registrations.forEach(reg=>reg.unregister())).catch(()=>{})}
    if(window.caches){caches.keys().then(keys=>keys.forEach(key=>caches.delete(key))).catch(()=>{})}
  }catch(error){}
}
resetStaleClientData();
function mergeLocalOverviewRows(serverRows={},localRows={}){
  const merged={...(serverRows||{})};
  Object.entries(localRows||{}).forEach(([key,row])=>{
    if(!row||typeof row!=="object")return;
    if(!merged[key]||row.__localOnly||row.localOnly||row.manual_override)merged[key]={...(merged[key]||{}),...row};
  });
  return merged;
}
function clearLocalOverviewOverride(key){
  try{
    const local=JSON.parse(localStorage.getItem("musicaCustomOverviews")||"{}");
    if(local&&Object.prototype.hasOwnProperty.call(local,key)){
      delete local[key];
      localStorage.setItem("musicaCustomOverviews",JSON.stringify(local));
    }
  }catch(error){}
}
const state={view:"rankings",search:"",genre:"All",sort:"score",artistLetter:"All",artistGenre:"All",artistSearch:"",artistProfile:null,artistProfileAlbums:[],artistProfilePortraits:[],artistProfileLoading:false,artistProfileError:"",artistEditing:false,artistBioDraftSources:[],artistBioDraftModel:"",artistBioDraftedAt:"",chatThread:"",albums:[],ratingMap:{},dataReady:false,theme:localStorage.getItem("musicaThemePreference")==="light"?"light":"dark",deviceId:localStorage.getItem("musicaDeviceId")||crypto.randomUUID(),authSession:null,authMode:"login",pendingAuthAction:null,userProfile:null,avatarMode:"upload",avatarConfig:null,avatarPhotoFile:null,selectedAvatarIcon:null,avatarPromptedForUser:null,avatarEditControlsOpen:false};
const extras={tracks:{},trackRatings:{},songScores:{},ratingDetails:{},trackRatingDetails:{},comments:{},commentReplies:{},libraries:[],libraryFollows:[],profileDirectory:[],chatMessages:[],chatAdHocThreads:{},userPresence:{},notifications:[],chatSchemaReady:false,selfStats:null,overviews:{},overviewRequests:{},albumInfo:{},albumInfoRequests:{},currentAlbumId:null,spotifyTarget:"musica",previewAudio:null,previewKey:null};
let deepLinkHandled=false;
let homeSearchRenderTimer=0;
const DEFAULT_AVATAR_URL="assets/avatar-icons/default-avatar.png";
const MUZE_AVATAR_ICONS=Array.from({length:22},(_,i)=>i+12).filter(n=>![14,27].includes(n)).map(n=>`assets/avatar-icons/avatar-icon-${String(n).padStart(2,"0")}.png`);
const PROFILE_AVATAR_OVERRIDES={
  mojokoso:"assets/profile-icons/mojokoso-avatar.jpg?v=face-crop-20260607",
  val:"assets/profile-icons/val-avatar.png?v=inner-crop-20260607",
  valentina:"assets/profile-icons/val-avatar.png?v=inner-crop-20260607"
};
function publicAvatarFallbackUrl(url=""){
  const clean=String(url||"").trim();
  if(!clean||clean.includes("/public/"))return "";
  if(clean.startsWith("assets/profile-icons/"))return "public/"+clean;
  if(clean.startsWith("/assets/profile-icons/"))return "/public"+clean;
  if(clean.startsWith("assets/profile-photos/"))return "public/"+clean;
  if(clean.startsWith("/assets/profile-photos/"))return "/public"+clean;
  return "";
}
function avatarImgMarkup(url,label){
  const fallback=publicAvatarFallbackUrl(url);
  const onerror=fallback
    ? `this.onerror=function(){this.remove()};this.src='${escapeJsString(fallback)}'`
    : "this.remove()";
  return '<img src="'+escapeHtml(url)+'" data-fallback-src="'+escapeHtml(fallback)+'" onerror="'+escapeHtml(onerror)+'" alt="'+escapeHtml(label)+' avatar">';
}
function profileAvatarOverride(profile={}){
  const username=String(profile.username||profile.name||"").trim().toLowerCase();
  return PROFILE_AVATAR_OVERRIDES[username]||"";
}
localStorage.setItem("musicaDeviceId",state.deviceId);
if(state.theme==="light")document.body.classList.add("light");
const $=s=>document.querySelector(s),content=$("#content");
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
function formatParagraphText(value){
  return escapeHtml(value)
    .replace(/\r\n?/g,"\n")
    .replace(/\n{3,}/g,"\n\n")
    .replace(/\*\*([^*\n][\s\S]*?[^*\n])\*\*/g,"<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\n][^*\n]*?[^*\n])\*(?=[\s).,!?:;]|$)/g,"$1<em>$2</em>")
    .replace(/(^|[\s(])_([^_\n][^_\n]*?[^_\n])_(?=[\s).,!?:;]|$)/g,"$1<em>$2</em>")
    .replace(/\n\n/g,"<br><br>")
    .replace(/\n/g,"<br>");
}
function paragraphChunks(value){
  return String(value||"").replace(/\r\n?/g,"\n").split(/\n\s*\n/).map(part=>part.trim()).filter(Boolean);
}
function firstParagraphText(value){
  return paragraphChunks(value)[0]||String(value||"").trim();
}
function artistBiographyMarkup(value){
  const paragraphs=paragraphChunks(value);
  if(!paragraphs.length)return "";
  const fullMarkup=paragraphs.map(part=>`<p>${formatParagraphText(part)}</p>`).join("");
  if(window.matchMedia?.("(max-width: 560px)").matches)return `<div class="muzeArtistHeroBio muzeArtistHeroBioMobile">${fullMarkup}</div>`;
  const previewCount=3;
  const remaining=paragraphs.slice(previewCount).map(part=>`<p>${formatParagraphText(part)}</p>`).join("");
  const visible=paragraphs.slice(0,previewCount).map((part,index)=>{
    const toggle=remaining&&index===Math.min(paragraphs.length,previewCount)-1?' <button type="button" class="muzeArtistBioToggle" aria-expanded="false" onclick="toggleArtistBiography(this)">See more <span aria-hidden="true">&rarr;</span></button>':"";
    return `<p>${formatParagraphText(part)}${toggle}</p>`;
  }).join("");
  if(!remaining)return `<div class="muzeArtistHeroBio">${visible}</div>`;
  return `<div class="muzeArtistHeroBio"><div class="muzeArtistBioPreview">${visible}</div><div class="muzeArtistBioRemainder" hidden>${remaining}</div></div>`;
}
function syncMobileArtistBiography(){
  const biography=document.querySelector(".muzeArtistHeroBioMobile");
  if(!biography||!window.matchMedia("(max-width: 560px)").matches)return;
  const fullHtml=biography._fullBiographyHtml||biography.innerHTML;
  const fullText=biography._fullBiographyText||biography.textContent.replace(/\s+/g," ").trim();
  biography._fullBiographyHtml=fullHtml;
  biography._fullBiographyText=fullText;
  const toggle='<button type="button" class="muzeArtistBioToggle" aria-expanded="false" onclick="toggleArtistBiography(this)">See more <span aria-hidden="true">&rarr;</span></button>';
  biography.classList.remove("is-expanded");
  biography.innerHTML=`<p>${escapeHtml(fullText)} ${toggle}</p>`;
  const lineHeight=parseFloat(getComputedStyle(biography).lineHeight)||23;
  const maxHeight=lineHeight*8+.5;
  if(biography.scrollHeight<=maxHeight){
    biography.innerHTML=fullHtml;
    return;
  }
  let low=0,high=fullText.length;
  while(low<high){
    const mid=Math.ceil((low+high)/2);
    biography.innerHTML=`<p>${escapeHtml(fullText.slice(0,mid).trimEnd())}&hellip; ${toggle}</p>`;
    if(biography.scrollHeight<=maxHeight)low=mid;else high=mid-1;
  }
  let end=low;
  const wordBreak=fullText.lastIndexOf(" ",end);
  if(wordBreak>Math.max(0,end-24))end=wordBreak;
  biography.innerHTML=`<p>${escapeHtml(fullText.slice(0,end).trimEnd())}&hellip; ${toggle}</p>`;
}
window.toggleArtistBiography=function(button){
  const biography=button?.closest(".muzeArtistHeroBio");
  if(biography?.classList.contains("muzeArtistHeroBioMobile")){
    const expanded=button.getAttribute("aria-expanded")==="true";
    if(expanded){
      syncMobileArtistBiography();
    }else{
      biography.classList.add("is-expanded");
      biography.innerHTML=biography._fullBiographyHtml;
      const destination=biography.lastElementChild||biography;
      destination.insertAdjacentHTML("beforeend",' <button type="button" class="muzeArtistBioToggle" aria-expanded="true" onclick="toggleArtistBiography(this)">Show less <span aria-hidden="true">&uarr;</span></button>');
    }
    return;
  }
  const preview=biography?.querySelector(".muzeArtistBioPreview");
  const remainder=biography?.querySelector(".muzeArtistBioRemainder");
  if(!remainder)return;
  const expanded=button.getAttribute("aria-expanded")==="true";
  remainder.hidden=expanded;
  button.setAttribute("aria-expanded",String(!expanded));
  const destination=expanded?preview?.lastElementChild:remainder.lastElementChild;
  if(destination){destination.append(document.createTextNode(" "),button)}
  button.innerHTML=expanded?'See more <span aria-hidden="true">&rarr;</span>':'Show less <span aria-hidden="true">&uarr;</span>';
};
function compactPreviewText(value){
  const chunks=paragraphChunks(value);
  if(chunks.length>1)return chunks[0];
  const text=String(value||"").trim();
  const sentence=text.match(/^.{80,}?[.!?](?=\s|$)/);
  return sentence?sentence[0]:text.slice(0,220).trim();
}
function hasExpandableText(value){
  const text=String(value||"").trim();
  if(paragraphChunks(text).length>1)return true;
  return text.length>240;
}
const escapeJsString=value=>String(value??"").replace(/\\/g,"\\\\").replace(/'/g,"\\'");
function loggedInUser(){return state.authSession?.user||null}
function authDisplayName(){return currentUsername()||loggedInUser()?.email||""}
function setAuthStatus(message="",tone=""){
  const status=$("#authStatus");
  if(!status)return;
  status.textContent=message;
  status.dataset.tone=tone;
}
function authDebug(label,details){console.debug("[Muze auth]",label,details)}
function supabaseUrlHost(){try{return SUPABASE_URL?new URL(SUPABASE_URL).host:null}catch(error){return "invalid-url"}}
function authErrorMessage(error){
  const message=String(error?.message||error||"Authentication failed. Please try again.");
  if(/bucket|storage/i.test(message))return "Avatar photo storage is not configured yet. Create the avatars bucket in Supabase Storage, or use the custom avatar creator for now.";
  if(/user_profiles|schema cache|column|relation/i.test(message))return "Profile storage is not ready yet. Run the user_profiles SQL in Supabase, then refresh Muze.";
  if(/invalid api key|api key/i.test(message))return "Supabase rejected the public anon key. Replace config.js or Netlify VITE_SUPABASE_ANON_KEY with the anon key from your Supabase project settings.";
  if(/rate limit|too many|over email send rate limit/i.test(message))return "Supabase is rate limiting confirmation emails. Wait a few minutes, then try again.";
  if(/invalid login credentials/i.test(message))return "Email or password is incorrect.";
  if(/user already registered|already registered|already exists/i.test(message))return "That email already has a Muze account. Try logging in instead.";
  if(/password/i.test(message)&&/(weak|short|least|characters|min)/i.test(message))return message;
  if(/email/i.test(message)&&/invalid/i.test(message))return "Enter a valid email address.";
  return message;
}
function defaultAvatarConfig(){
  return {
    avatarType:"androgynous",preset:"editorial",faceShape:"oval",jawWidth:0,cheekFullness:0,chinShape:"soft",headScale:0,age:24,
    skinColor:"#c98f63",freckles:"none",blush:22,beautyMark:"none",skinSoftness:68,
    hairStyle:"waves",hairColor:"#2b1710",hairVolume:2,hairHighlight:"#8a5a2d",
    eyes:"calm",eyeColor:"#211512",eyeSize:0,eyeSpacing:0,eyelids:"soft",lashes:"none",
    brows:"soft",browThickness:0,browAngle:0,
    nose:"line",noseWidth:0,noseBridge:0,
    mouth:"smile",lipFullness:0,mouthWidth:0,smileIntensity:55,
    ears:"standard",facialHair:"none",beardDensity:55,beardColor:"#2b1710",accessory:"none"
  };
}
let avatarSvgInstance=0;
function uniqueAvatarSvgIds(svg){
  const suffix=`muzeAvatar${++avatarSvgInstance}`;
  ["bg3d","skin3d","cheekLight","cheekWarm","chinShade","noseBulb","noseShade","hairSurface","hairRaised","headCast","hairDrop","tinyCast"].forEach(id=>{
    const unique=`${id}-${suffix}`;
    svg=svg.replaceAll(`id="${id}"`,`id="${unique}"`).replaceAll(`url(#${id})`,`url(#${unique})`);
  });
  return svg;
}
function cleanAvatarSvgOverlays(svg){
  return svg
    .replace(/<ellipse cx="(?:65|67)"[^>]*fill="url\(#noseShade\)"\/>/g,"")
    .replace(/<path d="M[^"]+" stroke="#fff6ed"[^>]*\/>/g,"")
    .replace(/<path d="M(?:47|52) 84 C55 95 73 95 81 84"[^>]*\/>/g,"")
    .replace(/<path d="M55 83 C61 88 67 88 73 83"[^>]*\/>/g,"")
    .replaceAll('stop-opacity=".30"/><stop offset=".46"','stop-opacity=".10"/><stop offset=".46"')
    .replaceAll('stop-opacity=".32"/><stop offset=".6"','stop-opacity=".14"/><stop offset=".6"')
    .replaceAll('stop-opacity=".34"/><stop offset=".24"','stop-opacity=".14"/><stop offset=".24"')
    .replaceAll('stop-opacity=".38"/><stop offset=".35"','stop-opacity=".16"/><stop offset=".35"')
    .replaceAll('opacity=".13" fill="none" stroke-linecap="round"','opacity=".04" fill="none" stroke-linecap="round"')
    .replaceAll('opacity=".7"/><path d="M44 36','opacity=".18"/><path d="M44 36')
    .replaceAll('stroke-width="6" opacity=".10"','stroke-width="6" opacity="0"')
    .replaceAll('stroke-width="5" opacity=".09"','stroke-width="5" opacity="0"')
    .replaceAll('fill="#fff" opacity=".12"','fill="#fff" opacity=".04"')
    .replaceAll('opacity=".32" fill="none"/></g>`','opacity=".12" fill="none"/></g>`');
}
function activeAvatarConfig(){
  return state.avatarConfig||state.userProfile?.avatar_config||defaultAvatarConfig();
}
function selectedAvatarIcon(){
  const saved=String(state.userProfile?.avatar_url||"");
  if(state.selectedAvatarIcon)return state.selectedAvatarIcon;
  if(MUZE_AVATAR_ICONS.includes(saved))return saved;
  return MUZE_AVATAR_ICONS[0];
}
function avatarIconMarkup(url=selectedAvatarIcon(),alt="Selected Muze profile icon"){
  return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}">`;
}
function selectAvatarIcon(url){
  state.selectedAvatarIcon=url;
  state.avatarPhotoFile=null;
  setAvatarMode("create");
  renderAvatarIconGrid();
  syncAvatarControls();
}
function renderAvatarIconGrid(){
  const grid=$("#avatarIconGrid");
  if(!grid)return;
  const selected=selectedAvatarIcon();
  grid.innerHTML=MUZE_AVATAR_ICONS.map((url,index)=>`
    <button class="avatarIconChoice ${url===selected?"active":""}" type="button" data-avatar-icon="${escapeHtml(url)}" aria-label="Choose profile icon ${index+1}">
      <img src="${escapeHtml(url)}" alt="">
    </button>
  `).join("");
  grid.querySelectorAll("[data-avatar-icon]").forEach(button=>{
    button.onclick=()=>selectAvatarIcon(button.dataset.avatarIcon||MUZE_AVATAR_ICONS[0]);
  });
}
function avatarSvg(config=defaultAvatarConfig()){
  const c={...defaultAvatarConfig(),...(config||{})};
  const rawSkin=String(c.skinColor||"#c98f63").trim().toLowerCase();
  const visibleSkin=/^#?(000|000000|111|111111)$/.test(rawSkin)?"#342821":c.skinColor;
  const safeSkin=escapeHtml(visibleSkin);
  const safeHair=escapeHtml(c.hairColor);
  const safeEye=escapeHtml(c.eyeColor||"#211512");
  const safeBeard=escapeHtml(c.beardColor||c.hairColor);
  const safeHighlight=escapeHtml(c.hairHighlight||"#8a5a2d");
  const jaw=Number(c.jawWidth||0);
  const cheek=Number(c.cheekFullness||0);
  const head=Number(c.headScale||0);
  const eyeScale=1+Number(c.eyeSize||0)/28;
  const eyeSpace=Number(c.eyeSpacing||0);
  const noseW=Number(c.noseWidth||0);
  const bridge=Number(c.noseBridge||0);
  const mouthW=Number(c.mouthWidth||0);
  const lip=Number(c.lipFullness||0);
  const smile=Number(c.smileIntensity||55);
  const browWidth=2.65+Number(c.browThickness||0)*.13;
  const browAngle=Number(c.browAngle||0)*.22;
  const volume=Number(c.hairVolume||0);
  const age=Number(c.age||24);
  const skinSoft=Number(c.skinSoftness||68)/100;
  const facePath={
    oval:`M64 ${25-head*.18} C${42-jaw*.15} ${25-head*.14} ${29-jaw*.28} 43 ${29-jaw*.12} 68 C${29-jaw*.08} ${98+cheek*.12} ${44-jaw*.38} 114 ${64} ${114+head*.18} C${84+jaw*.38} 114 ${99+jaw*.08} ${98+cheek*.12} ${99+jaw*.12} 68 C${99+jaw*.28} 43 ${86+jaw*.15} ${25-head*.14} 64 ${25-head*.18}Z`,
    round:`M64 ${27-head*.16} C${40-jaw*.18} 27 ${27-jaw*.24} 46 ${27-jaw*.12} 69 C${27-jaw*.08} ${95+cheek*.2} ${43-jaw*.28} 112 64 ${112+head*.12} C${85+jaw*.28} 112 ${101+jaw*.08} ${95+cheek*.2} ${101+jaw*.12} 69 C${101+jaw*.24} 46 ${88+jaw*.18} 27 64 ${27-head*.16}Z`,
    heart:`M64 ${25-head*.16} C42 24 28 42 29 66 C30 91 ${48-jaw*.18} 107 64 ${116+head*.1} C${80+jaw*.18} 107 98 91 99 66 C100 42 86 24 64 ${25-head*.16}Z`,
    diamond:`M64 ${23-head*.16} C44 26 31 43 30 67 C31 90 48 106 64 ${116+head*.12} C80 106 97 90 98 67 C97 43 84 26 64 ${23-head*.16}Z`,
    long:`M64 ${20-head*.18} C43 20 31 40 31 67 C31 101 46 119 64 ${120+head*.1} C82 119 97 101 97 67 C97 40 85 20 64 ${20-head*.18}Z`,
    "soft-square":`M64 ${27-head*.16} C${44-jaw*.1} 27 ${31-jaw*.22} 40 ${30-jaw*.18} 62 C${29-jaw*.16} 84 ${34-jaw*.42} 107 ${52-jaw*.25} 113 C60 ${116+head*.12} 70 ${116+head*.12} ${78+jaw*.25} 113 C${96+jaw*.42} 107 ${101+jaw*.16} 84 ${98+jaw*.18} 62 C${96+jaw*.22} 40 ${84+jaw*.1} 27 64 ${27-head*.16}Z`
  }[c.faceShape]||"M64 25 C42 25 29 43 29 68 C29 98 44 114 64 114 C84 114 99 98 99 68 C99 43 86 25 64 25Z";
  const eyeY=c.eyes==="focused"?61:c.eyes==="sleepy"?62:60;
  const leftEye=49-eyeSpace*.32, rightEye=79+eyeSpace*.32;
  const eyeRx=(c.eyes==="wide"?6.9:6.1)*eyeScale, eyeRy=(c.eyes==="sleepy"?3.45:4.25)*eyeScale;
  const eyelid=c.eyelids==="hooded"?`<path d="M${leftEye-7} ${eyeY-3} Q${leftEye} ${eyeY-7} ${leftEye+7} ${eyeY-3}" stroke="#2a1712" stroke-width="1.45" opacity=".28" fill="none"/><path d="M${rightEye-7} ${eyeY-3} Q${rightEye} ${eyeY-7} ${rightEye+7} ${eyeY-3}" stroke="#2a1712" stroke-width="1.45" opacity=".28" fill="none"/>`:c.eyelids==="sharp"?`<path d="M${leftEye-7} ${eyeY-4} L${leftEye+7} ${eyeY-3}" stroke="#2a1712" stroke-width="1.35" opacity=".28"/><path d="M${rightEye-7} ${eyeY-3} L${rightEye+7} ${eyeY-4}" stroke="#2a1712" stroke-width="1.35" opacity=".28"/>`:c.eyelids==="open"?`<path d="M${leftEye-7} ${eyeY-5} Q${leftEye} ${eyeY-8} ${leftEye+7} ${eyeY-5}" stroke="#2a1712" stroke-width=".95" opacity=".20" fill="none"/><path d="M${rightEye-7} ${eyeY-5} Q${rightEye} ${eyeY-8} ${rightEye+7} ${eyeY-5}" stroke="#2a1712" stroke-width=".95" opacity=".20" fill="none"/>`:"";
  const lashes=c.lashes==="defined"?`<path d="M${leftEye-7} ${eyeY-4} l-2 -2 M${leftEye+7} ${eyeY-4} l2 -2 M${rightEye-7} ${eyeY-4} l-2 -2 M${rightEye+7} ${eyeY-4} l2 -2" stroke="${safeHair}" stroke-width=".85" opacity=".38"/>`:c.lashes==="subtle"?`<path d="M${leftEye-7} ${eyeY-4} l-1.6 -1.6 M${rightEye+7} ${eyeY-4} l1.6 -1.6" stroke="${safeHair}" stroke-width=".75" opacity=".30"/>`:"";
  const eyeShape=`<g filter="url(#tinyCast)"><ellipse cx="${leftEye}" cy="${eyeY}" rx="${eyeRx}" ry="${eyeRy}" fill="#f4eadf"/><ellipse cx="${rightEye}" cy="${eyeY}" rx="${eyeRx}" ry="${eyeRy}" fill="#f4eadf"/><circle cx="${leftEye}" cy="${eyeY+.25}" r="${2.85*eyeScale}" fill="${safeEye}"/><circle cx="${rightEye}" cy="${eyeY+.25}" r="${2.85*eyeScale}" fill="${safeEye}"/><circle cx="${leftEye-1}" cy="${eyeY-1}" r=".82" fill="#fff" opacity=".82"/><circle cx="${rightEye-1}" cy="${eyeY-1}" r=".82" fill="#fff" opacity=".82"/>${eyelid}${lashes}</g>`;
  const brow={soft:['M41 51 C46 48 52 47 57 49','M71 49 C76 47 82 48 87 51'],bold:['M40 49 C46 46 53 45 58 47','M70 47 C76 45 83 46 88 49'],arched:['M40 52 C47 44 53 44 59 50','M69 50 C75 44 82 44 88 52'],straight:['M40 49 C46 49 52 49 58 49','M70 49 C76 49 82 49 88 49'],feathered:['M40 51 C46 47 52 47 58 50','M70 50 C76 47 82 47 88 51']}[c.brows]||['M41 51 C46 48 52 47 57 49','M71 49 C76 47 82 48 87 51'];
  const noseRx=7+noseW*.45;
  const noseY=77-bridge*.35;
  const nose={line:`<g><path d="M65 ${63-bridge*.35} C61 70 61 78 67 80" stroke="#7b4b33" stroke-width="${2.2+noseW*.04}" fill="none" stroke-linecap="round"/><ellipse cx="67" cy="80" rx="${noseRx}" ry="3.1" fill="url(#noseShade)"/><circle cx="${61-noseW*.18}" cy="80" r="1.4" fill="#4e251c" opacity=".25"/><circle cx="${70+noseW*.18}" cy="80" r="1.4" fill="#4e251c" opacity=".25"/></g>`,soft:`<g><path d="M64 ${62-bridge*.35} C58 72 60 79 68 81" stroke="#7b4b33" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="65" cy="80.5" rx="${noseRx+.7}" ry="3.3" fill="url(#noseShade)"/></g>`,round:`<g><ellipse cx="64" cy="${noseY}" rx="${noseRx+.8}" ry="8.8" fill="url(#noseBulb)"/><ellipse cx="64" cy="82" rx="${noseRx}" ry="3.1" fill="#6d3427" opacity=".15"/></g>`,wide:`<g><ellipse cx="64" cy="${noseY+1}" rx="${noseRx+3.5}" ry="7.2" fill="url(#noseBulb)"/><ellipse cx="64" cy="82" rx="${noseRx+3}" ry="3.2" fill="#6d3427" opacity=".16"/></g>`,button:`<g><ellipse cx="64" cy="${noseY+2}" rx="${noseRx}" ry="6.5" fill="url(#noseBulb)"/><circle cx="61" cy="82" r="1.2" fill="#4e251c" opacity=".26"/><circle cx="68" cy="82" r="1.2" fill="#4e251c" opacity=".26"/></g>`}[c.nose];
  const mw=mouthW*.45, lipStroke=3.1+lip*.12, smileLift=(smile-50)*.06;
  const mouth={smile:`<g><path d="M${54-mw*.7} ${90-smileLift*.45} C59 ${94+smileLift*.45} 69 ${94+smileLift*.45} ${74+mw*.7} ${90-smileLift*.45}" stroke="#6b3029" stroke-width="${Math.max(2.1,lipStroke*.72)}" fill="none" stroke-linecap="round"/></g>`,neutral:`<g><path d="M${56-mw*.65} 91 C61 90.5 67 90.5 ${72+mw*.65} 91" stroke="#6b3029" stroke-width="${Math.max(2,lipStroke*.68)}" fill="none" stroke-linecap="round"/></g>`,wide:`<g><path d="M${52-mw*.7} 89 C58 ${97+smileLift*.55} 70 ${97+smileLift*.55} ${76+mw*.7} 89" fill="#5a201e" opacity=".86"/></g>`,serious:`<g><path d="M${56-mw*.65} 92 C61 90.8 67 90.8 ${72+mw*.65} 92" stroke="#542722" stroke-width="${Math.max(2,lipStroke*.68)}" fill="none" stroke-linecap="round"/></g>`,smirk:`<g><path d="M${54-mw*.65} 91 C60 93 69 91 ${75+mw*.65} 88" stroke="#6b3029" stroke-width="${Math.max(2.1,lipStroke*.68)}" fill="none" stroke-linecap="round"/></g>`}[c.mouth];
  const hairLayer='fill="url(#hairSurface)" filter="url(#hairDrop)"';
  const hairHighlight='stroke="#fff" stroke-width="5" opacity=".13" fill="none" stroke-linecap="round"';
  const hair={
    waves:`<g><path d="M24 ${61+volume*.15} C23 ${34-volume*.24} 42 ${16-volume*.2} 64 ${16-volume*.18} C90 ${16-volume*.2} 105 ${35-volume*.22} 103 ${62+volume*.14} C91 49 78 43 64 44 C48 45 36 50 24 ${61+volume*.15}Z" ${hairLayer}/><path d="M32 48 C40 28 55 23 68 27 C80 31 87 26 93 35 C82 29 74 40 62 39 C49 37 41 39 32 48Z" fill="url(#hairRaised)"/><path d="M42 27 C51 38 70 40 83 25" ${hairHighlight}/></g>`,
    short:`<g><path d="M29 56 C31 ${33-volume*.18} 46 ${20-volume*.12} 65 ${20-volume*.12} C86 ${20-volume*.12} 99 ${34-volume*.18} 100 56 C81 46 49 46 29 56Z" ${hairLayer}/><path d="M37 39 C50 27 75 27 91 41 C75 36 53 36 37 39Z" fill="url(#hairRaised)"/><path d="M44 31 C58 27 77 28 90 38" ${hairHighlight}/></g>`,
    medium:`<g><path d="M23 ${63+volume*.14} C22 ${32-volume*.2} 43 ${14-volume*.2} 64 ${15-volume*.16} C91 ${15-volume*.18} 106 ${34-volume*.18} 104 ${66+volume*.14} C91 50 78 43 64 44 C48 45 36 50 23 ${63+volume*.14}Z" ${hairLayer}/><path d="M28 66 C25 82 31 96 42 102 C38 81 42 61 51 45" fill="url(#hairSurface)" opacity=".88"/><path d="M100 66 C103 84 96 98 85 103 C91 81 86 61 77 45" fill="url(#hairSurface)" opacity=".88"/></g>`,
    long:`<g><path d="M22 ${64+volume*.14} C20 ${31-volume*.2} 42 ${13-volume*.2} 64 ${14-volume*.16} C92 ${14-volume*.18} 108 ${34-volume*.18} 106 ${68+volume*.14} C94 52 80 43 64 44 C47 45 34 52 22 ${64+volume*.14}Z" ${hairLayer}/><path d="M24 60 C16 89 26 115 44 120 C39 90 43 59 54 41" fill="url(#hairSurface)"/><path d="M104 60 C113 90 102 115 84 120 C90 90 85 59 74 41" fill="url(#hairSurface)"/><path d="M45 24 C55 39 72 40 86 26" ${hairHighlight}/></g>`,
    straight:`<g><path d="M26 60 C24 34 43 17 64 17 C88 17 104 35 102 61 C84 45 45 45 26 60Z" ${hairLayer}/><path d="M30 60 C27 83 31 99 44 106 C41 82 45 58 55 40" fill="url(#hairSurface)" opacity=".85"/><path d="M98 60 C101 83 96 100 84 106 C87 82 83 58 73 40" fill="url(#hairSurface)" opacity=".85"/></g>`,
    curly:`<g><path d="M25 ${59+volume*.12} C20 ${34-volume*.24} 40 ${15-volume*.2} 64 ${15-volume*.18} C91 ${15-volume*.2} 108 ${37-volume*.22} 101 ${61+volume*.12} C91 48 80 40 65 41 C49 39 37 47 25 ${59+volume*.12}Z" ${hairLayer}/><g fill="url(#hairRaised)" filter="url(#hairDrop)"><circle cx="36" cy="33" r="${10+volume*.12}"/><circle cx="49" cy="24" r="${9+volume*.12}"/><circle cx="64" cy="22" r="${10+volume*.12}"/><circle cx="80" cy="25" r="${9+volume*.12}"/><circle cx="92" cy="36" r="${10+volume*.12}"/><circle cx="30" cy="46" r="${9+volume*.1}"/><circle cx="99" cy="49" r="${8+volume*.1}"/></g><circle cx="50" cy="23" r="3.1" fill="#fff" opacity=".12"/></g>`,
    fade:`<g><path d="M31 52 C34 31 47 21 64 21 C82 21 95 32 97 52 C80 42 49 42 31 52Z" fill="url(#hairSurface)" opacity=".92"/><path d="M31 54 C43 48 84 48 97 54" stroke="${safeHighlight}" stroke-width="2" opacity=".32" fill="none"/></g>`,
    buzz:`<path d="M31 51 C34 31 47 21 64 21 C82 21 95 32 97 51 C79 41 50 41 31 51Z" fill="url(#hairSurface)" opacity=".88"/>`,
    bald:''
  }[c.hairStyle]||'';
  const density=Math.max(.18,Number(c.beardDensity||55)/100);
  const beard=c.facialHair==="beard"?`<path d="M40 83 C43 110 85 110 88 83 C78 100 51 100 40 83Z" fill="${safeBeard}" opacity="${.45+density*.38}" filter="url(#tinyCast)"/>`:c.facialHair==="stubble"?`<path d="M47 84 C55 95 73 95 81 84" stroke="${safeBeard}" stroke-width="8" opacity="${.12+density*.24}" fill="none" stroke-linecap="round"/>`:c.facialHair==="mustache"?`<path d="M52 82 C58 78 62 79 64 83 C66 79 70 78 76 82" stroke="${safeBeard}" stroke-width="${4+density*2}" opacity=".78" fill="none" stroke-linecap="round"/>`:c.facialHair==="goatee"?`<path d="M55 83 C61 88 67 88 73 83" stroke="${safeBeard}" stroke-width="4" opacity=".72" fill="none" stroke-linecap="round"/><path d="M59 98 C62 104 66 104 69 98" stroke="${safeBeard}" stroke-width="5" opacity=".68" fill="none" stroke-linecap="round"/>`:'';
  const accessory=c.accessory==="glasses"?'<g filter="url(#tinyCast)"><circle cx="49" cy="60" r="9" fill="rgba(255,255,255,.06)" stroke="#f1d46b" stroke-width="2.1"/><circle cx="79" cy="60" r="9" fill="rgba(255,255,255,.06)" stroke="#f1d46b" stroke-width="2.1"/><path d="M58 60 H70" stroke="#f1d46b" stroke-width="2.1"/><path d="M43 57 L31 54" stroke="#f1d46b" stroke-width="1.7"/><path d="M85 57 L97 54" stroke="#f1d46b" stroke-width="1.7"/></g>':c.accessory==="round-glasses"?'<g filter="url(#tinyCast)"><circle cx="49" cy="60" r="10" fill="rgba(255,255,255,.05)" stroke="#f1d46b" stroke-width="2"/><circle cx="79" cy="60" r="10" fill="rgba(255,255,255,.05)" stroke="#f1d46b" stroke-width="2"/><path d="M59 60 H69" stroke="#f1d46b" stroke-width="2"/></g>':c.accessory==="earring"?'<g filter="url(#tinyCast)"><circle cx="95" cy="74" r="3.5" fill="#f2c94c"/><circle cx="94" cy="73" r="1" fill="#fff" opacity=".72"/></g>':c.accessory==="piercing"?'<circle cx="70" cy="82" r="1.8" fill="#f2c94c" filter="url(#tinyCast)"/>':c.accessory==="headphones"?'<g filter="url(#tinyCast)"><path d="M31 59 C31 31 97 31 97 59" stroke="#f2c94c" stroke-width="5" fill="none"/><rect x="24" y="58" width="9" height="22" rx="5" fill="#111"/><rect x="95" y="58" width="9" height="22" rx="5" fill="#111"/></g>':c.accessory==="beanie"?'<path d="M30 45 C35 20 91 20 98 45 C80 38 48 38 30 45Z" fill="url(#hairSurface)" filter="url(#hairDrop)"/><path d="M29 46 C44 39 82 39 99 46" stroke="#f2c94c" stroke-width="6" opacity=".85"/>':'';
  const earSize=c.ears==="small"?5:c.ears==="visible"?9:c.ears==="round"?8:7;
  const ears=c.ears==="standard"?"":`<g filter="url(#tinyCast)"><ellipse cx="29" cy="70" rx="${earSize*.7}" ry="${earSize}" fill="url(#skin3d)"/><ellipse cx="99" cy="70" rx="${earSize*.7}" ry="${earSize}" fill="url(#skin3d)"/></g>`;
  const freckleCount={none:0,light:4,medium:8,heavy:14}[c.freckles]||0;
  const freckles=Array.from({length:freckleCount}).map((_,i)=>`<circle cx="${43+(i*7)%42}" cy="${69+(i%3)*5}" r="${i%2?1:.8}" fill="#6b3527" opacity=".28"/>`).join("");
  const mark={left:'<circle cx="48" cy="83" r="1.5" fill="#3c1a15" opacity=".62"/>',right:'<circle cx="81" cy="82" r="1.5" fill="#3c1a15" opacity=".62"/>',chin:'<circle cx="66" cy="101" r="1.4" fill="#3c1a15" opacity=".55"/>'}[c.beautyMark]||"";
  const ageLines=age>55?'<path d="M46 52 C52 50 56 51 60 53 M70 53 C74 51 79 50 84 52" stroke="#5b2d23" stroke-width="1" opacity=".22" fill="none"/><path d="M54 78 C60 80 68 80 74 78" stroke="#5b2d23" stroke-width="1" opacity=".16" fill="none"/>':"";
  const svg=`<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Muze avatar"><defs><radialGradient id="bg3d" cx="35%" cy="18%" r="88%"><stop offset="0" stop-color="#f2c94c" stop-opacity=".30"/><stop offset=".46" stop-color="#171821"/><stop offset="1" stop-color="#05060a"/></radialGradient><radialGradient id="skin3d" cx="36%" cy="24%" r="78%"><stop offset="0" stop-color="#fff0df" stop-opacity="${.45+skinSoft*.38}"/><stop offset=".30" stop-color="${safeSkin}"/><stop offset=".76" stop-color="${safeSkin}"/><stop offset="1" stop-color="#5c2c22" stop-opacity=".62"/></radialGradient><radialGradient id="cheekLight" cx="40%" cy="36%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".6" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><radialGradient id="cheekWarm" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#e96f74" stop-opacity="${Number(c.blush||0)/260}"/><stop offset="1" stop-color="#e96f74" stop-opacity="0"/></radialGradient><radialGradient id="chinShade" cx="50%" cy="20%" r="78%"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#4c2119" stop-opacity=".32"/></radialGradient><radialGradient id="noseBulb" cx="38%" cy="24%" r="70%"><stop offset="0" stop-color="#fff0df" stop-opacity=".42"/><stop offset=".42" stop-color="${safeSkin}"/><stop offset="1" stop-color="#7b392c" stop-opacity=".48"/></radialGradient><radialGradient id="noseShade" cx="35%" cy="20%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset=".55" stop-color="${safeSkin}" stop-opacity=".75"/><stop offset="1" stop-color="#5c2e22" stop-opacity=".28"/></radialGradient><linearGradient id="hairSurface" x1="27" y1="14" x2="101" y2="64"><stop offset="0" stop-color="${safeHighlight}" stop-opacity=".34"/><stop offset=".24" stop-color="${safeHair}"/><stop offset=".72" stop-color="${safeHair}"/><stop offset="1" stop-color="#060302"/></linearGradient><radialGradient id="hairRaised" cx="36%" cy="20%" r="80%"><stop offset="0" stop-color="${safeHighlight}" stop-opacity=".38"/><stop offset=".35" stop-color="${safeHair}"/><stop offset="1" stop-color="#050302"/></radialGradient><filter id="headCast" x="-35%" y="-30%" width="170%" height="170%"><feDropShadow dx="0" dy="10" stdDeviation="7" flood-color="#000" flood-opacity=".34"/></filter><filter id="hairDrop" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="5" stdDeviation="3.2" flood-color="#000" flood-opacity=".34"/></filter><filter id="tinyCast" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="1.8" stdDeviation="1.2" flood-color="#000" flood-opacity=".22"/></filter></defs><rect width="128" height="128" rx="64" fill="url(#bg3d)"/><ellipse cx="64" cy="114" rx="36" ry="7" fill="#000" opacity=".24"/>${ears}<g filter="url(#headCast)"><path d="${facePath}" fill="url(#skin3d)"/></g><path d="${facePath}" fill="url(#chinShade)" opacity=".72"/><ellipse cx="${48-cheek*.12}" cy="73" rx="${13+cheek*.22}" ry="${8+cheek*.12}" fill="url(#cheekWarm)"/><ellipse cx="${80+cheek*.12}" cy="73" rx="${13+cheek*.22}" ry="${8+cheek*.12}" fill="url(#cheekWarm)"/><ellipse cx="50" cy="55" rx="20" ry="28" fill="url(#cheekLight)" opacity=".7"/><path d="M44 36 C53 29 75 29 86 38" stroke="#fff" stroke-width="6" opacity=".10" fill="none" stroke-linecap="round"/>${hair}<path d="${brow[0]}" stroke="${safeHair}" stroke-width="${browWidth}" fill="none" stroke-linecap="round" filter="url(#tinyCast)"/><path d="${brow[1]}" stroke="${safeHair}" stroke-width="${browWidth}" fill="none" stroke-linecap="round" filter="url(#tinyCast)"/>${eyeShape}${nose}${beard}${mouth}${freckles}${mark}${ageLines}${accessory}<path d="M39 45 C44 33 54 28 66 27" stroke="#fff" stroke-width="5" opacity=".09" fill="none" stroke-linecap="round"/></svg>`;
  return uniqueAvatarSvgIds(cleanAvatarSvgOverlays(svg));
}
function currentAvatarMarkup(extraClass=""){
  const profile=state.userProfile||{};
  const label=escapeHtml(authDisplayName()||"Muze profile");
  if(profile.avatar_url&&(!String(profile.avatar_url).includes("assets/avatar-icons/avatar-icon-")||MUZE_AVATAR_ICONS.includes(profile.avatar_url))){const isIcon=MUZE_AVATAR_ICONS.includes(profile.avatar_url)||String(profile.avatar_url).includes("assets/avatar-icons/avatar-icon-");const classes=[extraClass,isIcon?"":"uploadedAvatarPhoto"].filter(Boolean).join(" ");return `<img class="${escapeHtml(classes)}" src="${escapeHtml(profile.avatar_url)}" alt="${label}">`;}
  if(profile.avatar_config)return avatarSvg(profile.avatar_config);
  if(profile.avatar_svg&&String(profile.avatar_svg).trim().startsWith("<svg"))return profile.avatar_svg;
  return `<img class="${extraClass}" src="${escapeHtml(DEFAULT_AVATAR_URL)}" alt="${label}">`;
}
function renderAvatarTargets(){
  const hasAvatar=Boolean(state.userProfile?.avatar_url||state.userProfile?.avatar_svg||state.userProfile?.avatar_config);
  const targets=[$("#profileAvatarPreview"),$("#avatarPreview"),$("#avatarCreatorPreview")];
  targets.forEach(target=>{if(target)target.innerHTML=currentAvatarMarkup()});
  const navIcon=$("#sideNav .navUserIcon");
  if(navIcon){navIcon.classList.toggle("hasAvatar",hasAvatar);navIcon.innerHTML=hasAvatar?currentAvatarMarkup():""}
  const authIcon=$("#authButton .authButtonIcon");
  if(authIcon){authIcon.classList.toggle("hasAvatar",hasAvatar);authIcon.innerHTML=hasAvatar?currentAvatarMarkup():""}
  syncAccountProfileCopy();
}
function refreshSavedAvatarDisplay(){
  renderAvatarTargets();
  requestAnimationFrame(()=>renderAvatarTargets());
}
function avatarHasValue(profile=state.userProfile){return Boolean(profile?.avatar_url||profile?.avatar_svg||profile?.avatar_config)}
function savedProfileUsername(){return (state.userProfile?.username||"").trim()}
function profileMemberSinceText(){
  const raw=state.userProfile?.created_at;
  if(!raw)return "";
  const date=new Date(raw);
  if(Number.isNaN(date.getTime()))return "";
  return `Member since ${date.toLocaleDateString(undefined,{month:"short",year:"numeric"})}`;
}
function profileStatsMarkup(stats){
  const items=[
    ["albumsAdded","Albums added",stats?.albumsAdded],
    ["albumsRated","Albums rated",stats?.albumsRated],
    ["songsRated","Songs rated",stats?.songsRated],
    ["songsShared","Songs shared",stats?.songsShared],
    ["commentsLeft","Comments left",stats?.commentsLeft]
  ];
  return items.map(([key,label,value])=>{
    const count=Number(value||0);
    return `<button type="button" class="profileStatCard" onclick="openProfileActivity('${key}')"><strong>${count?count:"-"}</strong><small>${escapeHtml(label)}</small></button>`;
  }).join("");
}
function usernameAliasKey(){return "muzeUsernameAliases::"+state.deviceId}
function usernameAliases(){
  try{
    return [...new Set((JSON.parse(localStorage.getItem(usernameAliasKey())||"[]")||[]).map(name=>String(name||"").trim()).filter(Boolean))];
  }catch(error){
    return [];
  }
}
function saveUsernameAliases(names){
  const clean=[...new Set((names||[]).map(name=>String(name||"").trim()).filter(Boolean))].slice(-8);
  localStorage.setItem(usernameAliasKey(),JSON.stringify(clean));
  return clean;
}
function rememberUsernameAlias(name){
  const clean=String(name||"").trim();
  if(!clean)return usernameAliases();
  return saveUsernameAliases([...usernameAliases(),clean]);
}
function renderAccountProfileStats(){
  const markup=profileStatsMarkup(extras.selfStats||fallbackSelfStats());
  ["#profileStatsGrid","#avatarEditorStatsGrid"].forEach(selector=>{
    const grid=$(selector);
    if(grid)grid.innerHTML=markup;
  });
}
function profileActivityTitle(kind){
  return ({albumsAdded:"Albums added",albumsRated:"Albums rated",songsRated:"Songs rated",songsShared:"Songs shared",commentsLeft:"Comments left"})[kind]||"Profile activity";
}
function profileActivityDate(value){
  const date=value?new Date(value):null;
  return date&&!Number.isNaN(date.getTime())?date.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}):"";
}
function profileActivityAlbum(ref){
  const id=String(ref||"");
  return state.albums.find(album=>String(album.id)===id)||{};
}
function profileActivityRowsHtml(kind,rows=[]){
  if(!rows.length)return `<div class="profileActivityEmpty">Nothing to show yet.</div>`;
  return rows.slice(0,60).map(row=>{
    const title=escapeHtml(row.title||"Untitled");
    const meta=escapeHtml([row.meta,row.date].filter(Boolean).join(" - "));
    const value=row.value?`<strong>${escapeHtml(row.value)}</strong>`:"";
    const action=row.albumId?` onclick="openAlbum('${escapeJsString(row.albumId)}')"`:"";
    const coverUrl=String(row.cover_url||"").trim();
    const cover=coverUrl?`<span class="profileActivityCover"><img src="${escapeHtml(coverUrl)}" alt="${title} cover" onerror="this.parentElement.classList.add('fallback');this.remove()"></span>`:`<span class="profileActivityCover fallback">${escapeHtml(coverText({title:row.title||"Album"}))}</span>`;
    return `<button type="button" class="profileActivityRow"${action}>${cover}<span class="profileActivityCopy"><b>${title}</b>${meta?`<small>${meta}</small>`:""}</span>${value}</button>`;
  }).join("");
}
async function loadProfileActivity(kind){
  const identity=profileStatsIdentity();
  const user=loggedInUser();
  if(kind==="albumsAdded"){
    return myLibraryItems().map(item=>({title:item.title||"Album",meta:item.artist||"",albumId:item.id,value:item.rating&&item.rating!=="-"?String(item.rating):"",cover_url:item.cover_url||profileActivityAlbum(item.id).cover_url||""}));
  }
  if(kind==="albumsRated"){
    const localRows=Object.entries(state.ratingMap||{}).map(([albumId])=>{const album=profileActivityAlbum(albumId);return {title:album.title||albumId,meta:album.artist||"",albumId,value:album.id?displayScore(album):"",cover_url:album.cover_url||""}});
    if(!db||!user)return localRows;
    const rows=await fetchStatRows("ratings","id,album_id,rating,created_at,device_id,username,user_id",identity,{usernameColumn:"username"});
    return rows.map(row=>{const album=profileActivityAlbum(row.album_id);return {title:album.title||row.album_id||"Album",meta:album.artist||"",albumId:row.album_id,value:album.id?displayScore(album):"",date:profileActivityDate(row.created_at),cover_url:album.cover_url||""}}).concat(localRows);
  }
  if(kind==="songsRated"){
    const localRows=Object.keys(localTrackRatings()||{}).map(storageKey=>{const [ref,track]=storageKey.split("::");const album=profileActivityAlbum(ref);return {title:track||"Song",meta:[album.title,album.artist].filter(Boolean).join(" - "),albumId:ref,value:"",cover_url:album.cover_url||""}});
    const serverActivity=await loadProfileActivityFromFunction("songsRated").catch(error=>{
      console.warn("Unable to load song rating activity",error.message||error);
      return null;
    });
    if(serverActivity?.length){
      const rows=serverActivity.map(row=>{const album=profileActivityAlbum(row.album_ref);return {title:row.track_name||row.track_key||"Song",meta:[album.title,album.artist].filter(Boolean).join(" - "),albumId:row.album_ref,value:"",date:profileActivityDate(row.created_at),cover_url:album.cover_url||""}});
      return rows.concat(localRows);
    }
    if(!db||!user)return localRows;
    const rows=await fetchStatRows("track_ratings","id,album_ref,track_key,track_name,rating,created_at,device_id,username,user_id",identity,{usernameColumn:"username"});
    return rows.map(row=>{const album=profileActivityAlbum(row.album_ref);return {title:row.track_name||row.track_key||"Song",meta:[album.title,album.artist].filter(Boolean).join(" - "),albumId:row.album_ref,value:"",date:profileActivityDate(row.created_at),cover_url:album.cover_url||""}}).concat(localRows);
  }
  if(kind==="commentsLeft"){
    const localAlbumRows=Object.entries(localComments()||{}).flatMap(([ref,comments])=>(comments||[]).map(comment=>{const album=profileActivityAlbum(ref);return {title:album.title||"Album comment",meta:String(comment.comment||"").slice(0,90),albumId:ref,date:profileActivityDate(comment.created_at),cover_url:album.cover_url||""}}));
    const localSongRows=Object.entries(localTrackComments()||{}).flatMap(([storageKey,comments])=>{const [ref,track]=storageKey.split("::");const album=profileActivityAlbum(ref);return (comments||[]).map(comment=>({title:track||"Song comment",meta:String(comment.comment||"").slice(0,90),albumId:ref,date:profileActivityDate(comment.created_at),cover_url:album.cover_url||""}))});
    if(!db||!user)return [...localAlbumRows,...localSongRows];
    const [albumRows,trackRows,replyRows]=await Promise.all([
      fetchStatRows("album_comments","id,album_ref,comment,created_at,device_id,name,user_id",identity,{usernameColumn:"name"}),
      fetchStatRows("track_comments","id,album_ref,track_key,track_name,comment,created_at,device_id,name,user_id",identity,{usernameColumn:"name"}),
      fetchStatRows("album_comment_replies","id,album_ref,reply,created_at,device_id,name,user_id",identity,{usernameColumn:"name"})
    ]);
    return [
      ...albumRows.map(row=>{const album=profileActivityAlbum(row.album_ref);return {title:album.title||"Album comment",meta:String(row.comment||"").slice(0,90),albumId:row.album_ref,date:profileActivityDate(row.created_at),cover_url:album.cover_url||""}}),
      ...trackRows.map(row=>{const album=profileActivityAlbum(row.album_ref);return {title:row.track_name||row.track_key||"Song comment",meta:[album.title,String(row.comment||"").slice(0,70)].filter(Boolean).join(" - "),albumId:row.album_ref,date:profileActivityDate(row.created_at),cover_url:album.cover_url||""}}),
      ...replyRows.map(row=>{const album=profileActivityAlbum(row.album_ref);return {title:album.title||"Reply",meta:String(row.reply||"").slice(0,90),albumId:row.album_ref,date:profileActivityDate(row.created_at),cover_url:album.cover_url||""}}),
      ...localAlbumRows,
      ...localSongRows
    ];
  }
  if(kind==="songsShared"){
    const localRows=Object.values(chatLocalMessages()||{}).flat().filter(message=>message?.side==="me"&&["album","library","rating","review","track"].includes(message?.type)).map(message=>({title:message.album?.title||message.library?.title||message.body||"Shared item",meta:message.type||"share",albumId:message.album?.id||"",date:message.time||"",cover_url:message.album?.cover_url||""}));
    const remoteRows=(extras.chatMessages||[]).filter(message=>String(message.sender_id||"")===String(user?.id||"")&&String(message.message_type||"text")!=="text").map(message=>({title:String(message.body||"Shared item").slice(0,96),meta:message.message_type||"share",date:profileActivityDate(message.created_at)}));
    return [...remoteRows,...localRows];
  }
  return [];
}
window.openProfileActivity=async function(kind){
  const panel=$("#profileActivityPanel");
  if(!panel)return;
  panel.classList.remove("hidden");
  panel.innerHTML=`<div class="profileActivityHead"><strong>${escapeHtml(profileActivityTitle(kind))}</strong><button type="button" onclick="closeProfileActivity()">Close</button></div><div class="profileActivityEmpty">Loading...</div>`;
  try{
    const rows=await loadProfileActivity(kind);
    panel.innerHTML=`<div class="profileActivityHead"><strong>${escapeHtml(profileActivityTitle(kind))}</strong><button type="button" onclick="closeProfileActivity()">Close</button></div><div class="profileActivityList">${profileActivityRowsHtml(kind,rows)}</div>`;
  }catch(error){
    console.warn("Unable to load profile activity",error.message||error);
    panel.innerHTML=`<div class="profileActivityHead"><strong>${escapeHtml(profileActivityTitle(kind))}</strong><button type="button" onclick="closeProfileActivity()">Close</button></div><div class="profileActivityEmpty">Could not load this activity yet.</div>`;
  }
}
window.closeProfileActivity=function(){
  $("#profileActivityPanel")?.classList.add("hidden");
}
function syncAccountProfileCopy(){
  const hasAvatar=avatarHasValue();
  const username=savedProfileUsername();
  const memberSince=profileMemberSinceText();
  const title=$(".accountAvatarTitle");
  const subtitle=$(".accountAvatarSubtitle");
  const button=$("#editAvatarButton");
  const usernameDisplay=$("#profileUsernameDisplay");
  const memberDisplay=$("#profileMemberSinceDisplay");
  if(title)title.textContent=hasAvatar?"Your Muze Profile":"Create your Muze Avatar";
  if(subtitle)subtitle.textContent=hasAvatar?"":"Upload a photo or design a custom face for your profile.";
  if(button)button.textContent=hasAvatar?"Edit Profile":"Edit Profile Avatar";
  if(usernameDisplay){
    usernameDisplay.textContent=username||"";
    usernameDisplay.classList.toggle("hidden",!username);
  }
  if(memberDisplay){
    memberDisplay.textContent=memberSince;
    memberDisplay.classList.toggle("hidden",!username||!memberSince);
  }
  renderAccountProfileStats();
  syncProfileUsernameUi();
  syncAvatarEditorCopy();
}
function syncAvatarEditorCopy(){
  const hasAvatar=avatarHasValue();
  const title=$("#avatarEditorTitle");
  const subtitle=$("#avatarEditorSubtitle");
  if(title)title.textContent=hasAvatar?"Your Muze Profile":"Edit profile Avatar";
  if(subtitle){
    subtitle.textContent=hasAvatar?"":"Choose or create your avatar.";
    subtitle.classList.toggle("hidden",hasAvatar);
  }
}
function syncProfileUsernameUi(){
  const username=savedProfileUsername();
  const memberSince=profileMemberSinceText();
  const editor=$("#profileUsernameEditor");
  const display=$("#avatarEditorUsernameDisplay");
  const name=$("#avatarEditorUsernameText");
  const member=$("#avatarEditorMemberSince");
  const input=$("#profileUsernameInput");
  if(editor)editor.classList.remove("hidden");
  if(display)display.classList.toggle("hidden",!username);
  if(name)name.textContent=username;
  if(member){
    member.textContent=memberSince;
    member.classList.toggle("hidden",!memberSince);
  }
  if(input)input.value=username||currentUsername()||"";
  const saveButton=$("#saveUsernameButton");
  if(saveButton)saveButton.textContent=username?"Update Username":"Save Username";
}
function syncAvatarEditorControlsVisibility(){
  const hasSavedAvatar=avatarHasValue();
  const collapsed=hasSavedAvatar&&!state.avatarEditControlsOpen;
  $("#avatarSetup")?.classList.toggle("avatarControlsCollapsed",collapsed);
  const reveal=$("#avatarEditReveal");
  if(reveal){
    reveal.classList.toggle("canEditAvatar",hasSavedAvatar);
    reveal.setAttribute("aria-expanded",String(!collapsed));
  }
}
function openAvatarEditControls(){
  if(!avatarHasValue())return;
  state.avatarEditControlsOpen=true;
  syncAvatarEditorControlsVisibility();
  setAvatarMode(state.avatarMode||"create");
  syncAvatarControls();
}
function profileUsernameValue(){
  return ($("#profileUsernameInput")?.value||"").trim().replace(/^@+/,"").slice(0,32);
}
function profileSaveFields(extra={}){
  const username=profileUsernameValue();
  if(username)localStorage.setItem("musicaUsername",username);
  return username?{...extra,username}:{...extra};
}
function setUsernameSaveBusy(isBusy,label="Save Username"){
  const button=$("#saveUsernameButton");
  if(!button)return;
  button.disabled=!!isBusy;
  button.textContent=isBusy?label:(savedProfileUsername()?"Update Username":"Save Username");
}
async function saveProfileUsername(){
  const username=profileUsernameValue();
  if(!username){setAuthStatus("Enter a username before saving.","error");return null}
  const oldUsername=(savedProfileUsername()||currentUsername()||"").trim();
  const saved=await saveUserProfile({username});
  if(saved){
    rememberUsernameAlias(oldUsername);
    rememberUsernameAlias(saved.username||username);
    await propagateUsernameChange(oldUsername,saved.username||username);
    localStorage.setItem("musicaUsername",saved.username||username);
    setAuthStatus("Username updated everywhere.","success");
    syncProfileUsernameUi();
    syncAccountProfileCopy();
    refreshSavedAvatarDisplay();
    await syncMyLibrary().catch(error=>console.warn("Unable to sync library after username change",error));
    await loadLibraries().catch(error=>console.warn("Unable to refresh libraries after username change",error));
    render();
    await loadChatSelfStats().then(renderAccountProfileStats).catch(error=>console.warn("Unable to refresh profile stats after username change",error));
  }
  return saved;
}
let saveUsernamePointerAt=0;
let saveUsernameInFlight=false;
async function handleSaveUsernameAction(event){
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const now=Date.now();
  if(event?.type==="click"&&now-saveUsernamePointerAt<500)return;
  if(event?.type==="pointerup"||event?.type==="touchend")saveUsernamePointerAt=now;
  if(saveUsernameInFlight)return;
  saveUsernameInFlight=true;
  setUsernameSaveBusy(true,"Saving...");
  setAuthStatus("Saving username...","");
  try{
    const saved=await saveProfileUsername();
    if(saved){syncAuthUi();updateNavUsername()}
    else console.error("[Muze profile] Username save did not return a saved profile.");
  }catch(error){
    console.error("[Muze profile] Username save failed",error);
    setAuthStatus("Username save failed, please try again","error");
  }finally{
    saveUsernameInFlight=false;
    setUsernameSaveBusy(false);
  }
}
function localUserProfileKey(){return "muzeLocalUserProfile::"+state.deviceId}
function loadLocalUserProfile(){try{return JSON.parse(localStorage.getItem(localUserProfileKey())||"null")}catch(error){console.error("[Muze avatar] Could not read local profile",error);return null}}
function saveLocalUserProfile(fields){
  const existing=loadLocalUserProfile()||{};
  const profile={...existing,user_id:state.deviceId,email:"local@muze.dev",...fields,updated_at:new Date().toISOString(),created_at:existing.created_at||new Date().toISOString()};
  try{localStorage.setItem(localUserProfileKey(),JSON.stringify(profile))}catch(error){console.error("[Muze avatar] Could not save local profile",error);setAuthStatus("Upload failed, please try again","error");return null}
  state.userProfile=profile;
  if(Object.prototype.hasOwnProperty.call(fields,"avatar_url")){
    const savedAvatarUrl=String(profile.avatar_url||"");
    state.selectedAvatarIcon=MUZE_AVATAR_ICONS.includes(savedAvatarUrl)?savedAvatarUrl:null;
  }
  renderAvatarTargets();
  syncAvatarControls();
  updateNavUsername();
  return profile;
}
function readFileAsDataUrl(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||""));
    reader.onerror=()=>reject(reader.error||new Error("Could not read selected avatar file."));
    reader.readAsDataURL(file);
  });
}
function withAvatarTimeout(promise,label="avatar request",timeoutMs=30000){
  let timer;
  const timeout=new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(new Error(`Timed out while ${label}. Please try again.`)),timeoutMs);
  });
  return Promise.race([promise,timeout]).finally(()=>clearTimeout(timer));
}
function setAvatarSaveBusy(isBusy,label="Save Avatar"){
  const button=$("#saveAvatarButton");
  if(!button)return;
  button.disabled=!!isBusy;
  button.textContent=isBusy?label:"Save Avatar";
}
function selectedAvatarFile(){return state.avatarPhotoFile instanceof File?state.avatarPhotoFile:null}
async function ensureAvatarBucket(){
  if(!db?.storage)return false;
  try{
    const current=await db.storage.getBucket("avatars");
    if(!current.error)return true;
    const message=String(current.error.message||current.error||"");
    if(!/not found|does not exist|404/i.test(message)){
      console.warn("[Muze avatar] Could not verify avatars bucket; upload will still be attempted.",current.error);
      return true;
    }
  }catch(error){
    console.warn("[Muze avatar] Could not check avatars bucket; upload will still be attempted.",error);
    return true;
  }
  try{
    const created=await db.storage.createBucket("avatars",{public:true});
    if(created.error){console.error("[Muze avatar] Failed to create avatars bucket",created.error);return false}
    return true;
  }catch(error){
    console.error("[Muze avatar] Failed to create avatars bucket",error);
    return false;
  }
}
async function uploadAvatarPhoto(file,user){
  if(!file){throw new Error("No avatar photo selected.")}
  if(!db?.storage||!user){
    const dataUrl=await readFileAsDataUrl(file);
    return {url:dataUrl,type:"local-photo"};
  }
  await withAvatarTimeout(ensureAvatarBucket(),"checking avatars bucket",12000);
  const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
  const path=`${user.id}/avatar-${Date.now()}.${ext}`;
  const upload=await withAvatarTimeout(db.storage.from("avatars").upload(path,file,{cacheControl:"3600",upsert:true,contentType:file.type||undefined}),"uploading avatar photo",30000);
  if(upload.error){
    console.error("[Muze avatar] Avatar upload failed",{path,fileName:file.name,fileType:file.type,fileSize:file.size,error:upload.error});
    throw upload.error;
  }
  const publicUrl=db.storage.from("avatars").getPublicUrl(path).data?.publicUrl||"";
  if(!publicUrl){
    const error=new Error("Avatar upload succeeded but no public URL was returned.");
    console.error("[Muze avatar] Missing avatar public URL",{path,upload});
    throw error;
  }
  return {url:publicUrl,type:"photo"};
}
function handleAvatarPhotoSelected(event){
  const file=event?.target?.files?.[0]||null;
  state.avatarPhotoFile=file;
  state.selectedAvatarIcon=null;
  state.avatarMode="upload";
  console.debug("[Muze avatar] Selected avatar file",file?{name:file.name,type:file.type,size:file.size}:null);
  syncAvatarControls();
}
let avatarSaveInFlight=false;
let avatarSavePointerAt=0;
async function handleSaveAvatarAction(event){
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const now=Date.now();
  if(event?.type==="click"&&now-avatarSavePointerAt<500)return;
  if(event?.type==="pointerup"||event?.type==="touchend")avatarSavePointerAt=now;
  if(avatarSaveInFlight)return;
  avatarSaveInFlight=true;
  try{await saveAvatarSetup()}catch(error){console.error("[Muze avatar] Save Avatar action failed",error);setAuthStatus("Upload failed, please try again","error")}finally{avatarSaveInFlight=false;setAvatarSaveBusy(false)}
}
async function loadUserProfile(){
  const user=loggedInUser();
  state.userProfile=null;
  if(!user||!db){state.userProfile=loadLocalUserProfile();const savedAvatarUrl=String(state.userProfile?.avatar_url||"");state.selectedAvatarIcon=MUZE_AVATAR_ICONS.includes(savedAvatarUrl)?savedAvatarUrl:null;renderAvatarTargets();syncAvatarControls();return state.userProfile}
  const {data,error}=await db.from("user_profiles").select("user_id,email,username,avatar_url,avatar_config,avatar_svg,avatar_type,skipped_avatar_setup,created_at").eq("user_id",user.id).maybeSingle();
  if(error){
    authDebug("profile load error",{message:error.message});
    renderAvatarTargets();
    return null;
  }
  if(data){
    state.userProfile=data;
    const savedAvatarUrl=String(data.avatar_url||"");
    state.selectedAvatarIcon=MUZE_AVATAR_ICONS.includes(savedAvatarUrl)?savedAvatarUrl:null;
    if(data.username)localStorage.setItem("musicaUsername",data.username);
    await linkCurrentUserLibraryProfile(data.username);
  }else{
    const username=(currentUsername()||authMetadataName(user)||authEmailPrefix(user)||"").trim().replace(/^@+/,"").slice(0,32);
    if(username){
      const created=await saveUserProfile({username});
      if(created)return created;
    }
  }
  renderAvatarTargets();
  syncAvatarControls();
  return data;
}
async function linkCurrentUserLibraryProfile(usernameValue=profileLibraryUsername()){
  const user=loggedInUser();
  const username=String(usernameValue||"").trim();
  if(!db||!user||!username)return;
  try{
    const {error}=await db.from("user_libraries").update({user_id:user.id,updated_at:new Date().toISOString()}).ilike("username",username).is("user_id",null);
    if(error&&!/user_id|schema cache|column/i.test(error.message||""))console.warn("Unable to link public library to account",error.message||error);
  }catch(error){
    console.warn("Unable to link public library to account",error?.message||error);
  }
}
async function saveUserProfile(fields){
  const user=loggedInUser();
  if(!user||!db){
    if(isLocalRuntime())return saveLocalUserProfile(fields);
    setAuthStatus("Log in before saving your avatar.","error");
    console.error("[Muze avatar] Cannot save profile without an authenticated Supabase session.");
    return null;
  }
  const existingUsername=savedProfileUsername()||currentUsername();
  const row={user_id:user.id,email:user.email||"",...(existingUsername?{username:existingUsername}:{}),...fields,updated_at:new Date().toISOString()};
  const {data,error}=await withAvatarTimeout(db.from("user_profiles").upsert(row,{onConflict:"user_id"}).select().single(),"saving avatar profile",20000);
  if(error){console.error("[Muze avatar] Profile save failed",{fields,error});setAuthStatus(authErrorMessage(error),"error");return null}
  state.userProfile=data;
  await linkCurrentUserLibraryProfile(data.username||fields.username);
  if(Object.prototype.hasOwnProperty.call(fields,"avatar_url")){
    const savedAvatarUrl=String(data.avatar_url||"");
    state.selectedAvatarIcon=MUZE_AVATAR_ICONS.includes(savedAvatarUrl)?savedAvatarUrl:null;
  }
  refreshProfileAvatarLinks();
  renderAvatarTargets();
  syncAvatarControls();
  updateNavUsername();
  return data;
}
function showAvatarSetup(force=false){
  const hasSavedAvatar=avatarHasValue();
  const modal=$("#authModal");
  if(modal){modal.classList.remove("libraryAccessModal","libraryAuthFlow","hidden");modal.setAttribute("aria-hidden","false")}
  $("#authModal .authPanel")?.classList.remove("libraryAccessPanel");
  $("#authModal .authPanel")?.classList.add("accountProfileMode");
  $("#authModal .authPanel")?.classList.toggle("avatarEditorMode",!!force);
  $("#libraryAccessCard")?.classList.add("hidden");
  $("#authLoggedOut")?.classList.add("hidden");
  $("#authLoggedIn")?.classList.toggle("hidden",!loggedInUser()||!!force);
  $("#authLogout")?.classList.toggle("hidden",!loggedInUser()||!!force);
  $("#avatarSetup")?.classList.remove("hidden");
  const title=$("#authTitle"),prompt=$("#authPrompt");
  if(title)title.textContent=force?"Edit your Muze avatar":"Create your Muze avatar";
  if(prompt)prompt.textContent="Make your profile feel like yours.";
  const savedAvatarUrl=String(state.userProfile?.avatar_url||"");
  const savedAvatarIsIcon=MUZE_AVATAR_ICONS.includes(savedAvatarUrl);
  state.avatarConfig={...defaultAvatarConfig(),...(state.userProfile?.avatar_config||{})};
  state.avatarPhotoFile=null;
  state.selectedAvatarIcon=savedAvatarIsIcon?savedAvatarUrl:null;
  state.avatarEditControlsOpen=!hasSavedAvatar;
  syncProfileUsernameUi();
  renderAccountProfileStats();
  loadChatSelfStats().then(renderAccountProfileStats).catch(error=>console.warn("Unable to refresh profile stats",error));
  setAvatarMode(force&&savedAvatarIsIcon?"create":"upload");
  renderAvatarTargets();
  syncAvatarControls();
  syncAvatarEditorControlsVisibility();
}
function hideAvatarSetup(){
  $("#authModal .authPanel")?.classList.remove("avatarEditorMode");
  $("#avatarSetup")?.classList.add("hidden");
  $("#avatarSetup")?.classList.remove("avatarControlsCollapsed");
  state.avatarEditControlsOpen=false;
  $("#authLoggedIn")?.classList.toggle("hidden",!loggedInUser());
  $("#authLogout")?.classList.toggle("hidden",!loggedInUser());
}
function maybePromptAvatarSetup(){
  const user=loggedInUser();
  if(!user||avatarHasValue()||state.userProfile?.skipped_avatar_setup)return;
  if(state.avatarPromptedForUser===user.id)return;
  state.avatarPromptedForUser=user.id;
  showAvatarSetup(false);
}
function setAvatarMode(mode){
  state.avatarMode=mode==="create"?"create":"upload";
  $("#avatarUploadTab")?.classList.toggle("active",state.avatarMode==="upload");
  $("#avatarCreateTab")?.classList.toggle("active",state.avatarMode==="create");
  $("#avatarUploadPanel")?.classList.toggle("hidden",state.avatarMode!=="upload");
  $("#avatarCreatorPreviewCard")?.classList.toggle("hidden",state.avatarMode!=="create");
  $("#avatarCreatePanel")?.classList.toggle("hidden",state.avatarMode!=="create");
  $("#avatarStyleSection")?.classList.add("hidden");
  $("#avatarColorSection")?.classList.add("hidden");
  $("#avatarPreviewSection")?.classList.add("hidden");
  if(state.avatarMode==="create")renderAvatarIconGrid();
  renderAvatarTargets();
  syncAvatarControls();
  syncAvatarEditorControlsVisibility();
}
function setAvatarCategory(category="face"){
  const active=category||"face";
  const toggle=$("#avatarCategoryToggle");
  const menu=$("#avatarCategoryMenu");
  document.querySelectorAll("#avatarCreatePanel [data-avatar-section]").forEach(section=>section.classList.toggle("active",section.dataset.avatarSection===active));
  document.querySelectorAll("#avatarCategoryMenu [data-avatar-category]").forEach(button=>{
    const selected=button.dataset.avatarCategory===active;
    button.classList.toggle("active",selected);
    if(selected&&toggle)toggle.textContent=button.textContent||"Face";
  });
  if(toggle)toggle.setAttribute("aria-expanded","false");
  menu?.classList.add("hidden");
}
function toggleAvatarCategoryMenu(){
  const menu=$("#avatarCategoryMenu");
  const toggle=$("#avatarCategoryToggle");
  if(!menu||!toggle)return;
  const expanded=menu.classList.toggle("hidden")===false;
  toggle.setAttribute("aria-expanded",String(expanded));
}
function syncAvatarControls(){
  const c=activeAvatarConfig();
  avatarControlFields().forEach(([id,key])=>{const el=$("#"+id);if(el&&c[key]!==undefined)el.value=c[key]});
  const photoMarkup=state.avatarPhotoFile?`<img class="uploadedAvatarPhoto" src="${escapeHtml(URL.createObjectURL(state.avatarPhotoFile))}" alt="Selected avatar photo">`:"";
  const createMarkup=avatarIconMarkup();
  const fallbackMarkup=photoMarkup||currentAvatarMarkup()||createMarkup;
  [$("#avatarPreview"),$("#avatarCreatorPreview"),$("#avatarEditorHeroPreview"),$("#avatarEditorPreviewLarge"),$("#avatarEditorPreviewMedium"),$("#avatarEditorPreviewSmall")].forEach(preview=>{if(preview)preview.innerHTML=state.avatarMode==="create"?createMarkup:fallbackMarkup});
  renderAvatarStyleChoices();
  syncAvatarEditorSelections();
}
function avatarControlFields(){
  return [["avatarType","avatarType"],["avatarPreset","preset"],["avatarFaceShape","faceShape"],["avatarJawWidth","jawWidth"],["avatarCheekFullness","cheekFullness"],["avatarChinShape","chinShape"],["avatarHeadScale","headScale"],["avatarAge","age"],["avatarSkinColor","skinColor"],["avatarFreckles","freckles"],["avatarBlush","blush"],["avatarBeautyMark","beautyMark"],["avatarSkinSoftness","skinSoftness"],["avatarHairStyle","hairStyle"],["avatarHairColor","hairColor"],["avatarHairVolume","hairVolume"],["avatarHairHighlight","hairHighlight"],["avatarEyes","eyes"],["avatarEyeColor","eyeColor"],["avatarEyeSize","eyeSize"],["avatarEyeSpacing","eyeSpacing"],["avatarEyelids","eyelids"],["avatarLashes","lashes"],["avatarBrows","brows"],["avatarBrowThickness","browThickness"],["avatarBrowAngle","browAngle"],["avatarNose","nose"],["avatarNoseWidth","noseWidth"],["avatarNoseBridge","noseBridge"],["avatarMouth","mouth"],["avatarLipFullness","lipFullness"],["avatarMouthWidth","mouthWidth"],["avatarSmileIntensity","smileIntensity"],["avatarEars","ears"],["avatarFacialHair","facialHair"],["avatarBeardDensity","beardDensity"],["avatarBeardColor","beardColor"],["avatarAccessory","accessory"]];
}
function readAvatarControls(){
  const config={...defaultAvatarConfig()};
  avatarControlFields().forEach(([id,key])=>{const el=$("#"+id);if(!el)return;config[key]=el.type==="range"?Number(el.value):el.value});
  return config;
}
function avatarTypeConfig(type){
  const presets={
    masculine:{avatarType:"masculine",faceShape:"soft-square",jawWidth:5,cheekFullness:-1,chinShape:"square",headScale:0,hairStyle:"short",hairVolume:0,eyes:"focused",eyeSize:-3,eyelids:"hooded",lashes:"none",brows:"bold",browThickness:2,browAngle:-1,nose:"line",noseWidth:1,mouth:"smile",lipFullness:-2,mouthWidth:0,facialHair:"none",beardDensity:34,accessory:"none"},
    feminine:{avatarType:"feminine",faceShape:"heart",jawWidth:-3,cheekFullness:5,chinShape:"soft",headScale:0,hairStyle:"long",hairVolume:3,eyes:"bright",eyeSize:-1,eyelids:"open",lashes:"subtle",brows:"arched",browThickness:-2,browAngle:2,nose:"soft",noseWidth:-2,mouth:"smile",lipFullness:2,mouthWidth:-1,facialHair:"none",beardDensity:0,accessory:"none"},
    androgynous:{avatarType:"androgynous",faceShape:"oval",jawWidth:0,cheekFullness:1,chinShape:"soft",headScale:0,hairStyle:"waves",hairVolume:1,eyes:"calm",eyeSize:-2,eyelids:"soft",lashes:"none",brows:"soft",browThickness:-1,browAngle:0,nose:"line",noseWidth:0,mouth:"smile",lipFullness:-1,mouthWidth:-1,facialHair:"none",beardDensity:28,accessory:"none"}
  };
  return presets[type]||presets.androgynous;
}
function applyAvatarType(type){
  const current=readAvatarControls();
  const select=$("#avatarType");
  if(select)select.value=type;
  applyAvatarConfig({...current,...avatarTypeConfig(type),skinColor:current.skinColor,hairColor:current.hairColor,hairHighlight:current.hairHighlight,eyeColor:current.eyeColor,beardColor:current.beardColor});
}
function randomChoice(values){return values[Math.floor(Math.random()*values.length)]}
function avatarStyleConfig(style){
  const base=defaultAvatarConfig();
  const styles={
    editorial:{preset:"editorial",faceShape:"oval",hairStyle:"waves",hairColor:"#2b1710",hairHighlight:"#8a5a2d",eyes:"calm",eyeSize:-2,mouth:"smile",mouthWidth:-1,lipFullness:-1,skinColor:"#c98f63",accessory:"none"},
    soft:{preset:"soft",faceShape:"round",hairStyle:"straight",hairColor:"#1d120d",hairHighlight:"#5d3a24",eyes:"bright",eyeSize:-1,mouth:"smile",mouthWidth:-1,skinColor:"#d9a074",accessory:"none"},
    mono:{preset:"cool",faceShape:"oval",hairStyle:"short",hairColor:"#303030",hairHighlight:"#777777",eyes:"focused",eyeColor:"#222222",mouth:"neutral",skinColor:"#b9b9b9",accessory:"none"},
    classic:{preset:"warm",faceShape:"soft-square",hairStyle:"short",hairColor:"#5a2f16",hairHighlight:"#9a6538",eyes:"calm",eyeSize:-2,mouth:"smile",mouthWidth:-1,skinColor:"#c98f63",accessory:"none"},
    pixel:{preset:"bold",faceShape:"soft-square",hairStyle:"buzz",hairColor:"#2b1710",hairHighlight:"#4b2b18",eyes:"focused",eyeSize:-2,mouth:"neutral",skinColor:"#c98f63",accessory:"headphones"}
  };
  return {...base,...(styles[style]||styles.editorial),style};
}
function applyAvatarStyle(style){
  const current=activeAvatarConfig();
  const next={...avatarStyleConfig(style),skinColor:current.skinColor||avatarStyleConfig(style).skinColor};
  applyAvatarConfig(next);
}
function applyAvatarSkin(skinColor){
  state.avatarConfig={...defaultAvatarConfig(),...activeAvatarConfig(),skinColor};
  state.avatarPhotoFile=null;
  setAvatarMode("create");
  syncAvatarControls();
}
function renderAvatarStyleChoices(){
  document.querySelectorAll(".avatarStyleChoice").forEach(button=>{
    const style=button.dataset.avatarStyle||"editorial";
    button.innerHTML=avatarSvg({...avatarStyleConfig(style),skinColor:activeAvatarConfig().skinColor||avatarStyleConfig(style).skinColor});
  });
}
function syncAvatarEditorSelections(){
  const c=activeAvatarConfig();
  document.querySelectorAll("[data-avatar-type]").forEach(button=>button.classList.toggle("active",(button.dataset.avatarType||"androgynous")===(c.avatarType||"androgynous")));
  document.querySelectorAll(".avatarStyleChoice").forEach(button=>button.classList.toggle("active",(button.dataset.avatarStyle||"editorial")===(c.style||c.preset||"editorial")));
  document.querySelectorAll(".avatarColorChoice").forEach(button=>button.classList.toggle("active",String(button.dataset.avatarSkin||"").toLowerCase()===String(c.skinColor||"").toLowerCase()));
}
function randomAvatarConfig(){
  const skins=["#f1c7a4","#d9a074","#c98f63","#9f6648","#744431","#4f2f26"];
  const hairs=["#1d120d","#2b1710","#5a351f","#8a5a2d","#d2a35f","#111111","#6b6d78"];
  return {...defaultAvatarConfig(),preset:randomChoice(["editorial","warm","bold","soft","cool"]),faceShape:randomChoice(["oval","round","heart","diamond","long","soft-square"]),jawWidth:Math.round(Math.random()*20-10),cheekFullness:Math.round(Math.random()*22-8),chinShape:randomChoice(["soft","round","pointed","square"]),headScale:Math.round(Math.random()*14-7),age:Math.round(Math.random()*55+18),skinColor:randomChoice(skins),freckles:randomChoice(["none","light","medium"]),blush:Math.round(Math.random()*65),beautyMark:randomChoice(["none","none","left","right","chin"]),skinSoftness:Math.round(Math.random()*45+45),hairStyle:randomChoice(["waves","short","medium","long","straight","curly","fade","buzz","bald"]),hairColor:randomChoice(hairs),hairVolume:Math.round(Math.random()*18-6),hairHighlight:randomChoice(["#8a5a2d","#c7904d","#e5c078","#5d6470"]),eyes:randomChoice(["calm","bright","focused","sleepy","wide"]),eyeColor:randomChoice(["#211512","#5f3b22","#38506b","#3f6b4b","#151515"]),eyeSize:Math.round(Math.random()*12-5),eyeSpacing:Math.round(Math.random()*12-5),eyelids:randomChoice(["soft","open","hooded","sharp"]),lashes:randomChoice(["none","subtle","defined"]),brows:randomChoice(["soft","bold","arched","straight","feathered"]),browThickness:Math.round(Math.random()*10-3),browAngle:Math.round(Math.random()*14-7),nose:randomChoice(["line","soft","round","wide","button"]),noseWidth:Math.round(Math.random()*12-5),noseBridge:Math.round(Math.random()*12-5),mouth:randomChoice(["smile","neutral","wide","serious","smirk"]),lipFullness:Math.round(Math.random()*12-3),mouthWidth:Math.round(Math.random()*16-7),smileIntensity:Math.round(Math.random()*80+10),ears:randomChoice(["standard","small","visible","round"]),facialHair:randomChoice(["none","none","stubble","mustache","goatee","beard"]),beardDensity:Math.round(Math.random()*80+10),beardColor:randomChoice(hairs),accessory:randomChoice(["none","none","glasses","round-glasses","earring","piercing","headphones","beanie"])};
}
function applyAvatarConfig(config){
  state.avatarConfig={...defaultAvatarConfig(),...(config||{})};
  state.avatarPhotoFile=null;
  setAvatarMode("create");
  syncAvatarControls();
}
function isImageUrl(url){
  return /^data:image\//i.test(String(url||""))||/\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(String(url||""));
}
async function saveAvatarSetup(){
  const user=loggedInUser()||(!db&&isLocalRuntime()?{id:state.deviceId,email:"local@muze.dev"}:null);
  if(!user&&!isLocalRuntime()){setAuthStatus("Log in before saving your avatar.","error");console.error("[Muze avatar] Save Avatar clicked without an authenticated user.");return}
  setAvatarSaveBusy(true,"Uploading...");
  setAuthStatus("Uploading...","");
  try{
    if(state.avatarMode==="create"){
      const icon=selectedAvatarIcon();
      const saved=await saveUserProfile(profileSaveFields({avatar_url:icon,avatar_config:null,avatar_svg:null,avatar_type:"icon",skipped_avatar_setup:false}));
      if(saved){setAuthStatus("Avatar saved","success");hideAvatarSetup();syncAuthUi();refreshSavedAvatarDisplay()}
      return;
    }
    if(state.avatarMode==="upload"&&!selectedAvatarFile()){
      setAuthStatus("Choose a profile photo or switch to Choose icon.","error");
      console.error("[Muze avatar] Save Avatar clicked with no selected file.");
      return;
    }
    if(state.avatarMode==="upload"&&selectedAvatarFile()){
      const file=selectedAvatarFile();
      console.debug("[Muze avatar] Uploading avatar file",{name:file.name,type:file.type,size:file.size});
      const previousProfile=state.userProfile;
      const uploaded=await uploadAvatarPhoto(file,user);
      const optimisticProfile={...(state.userProfile||{}),avatar_url:uploaded.url,avatar_config:null,avatar_svg:null,avatar_type:uploaded.type,skipped_avatar_setup:false};
      state.userProfile=optimisticProfile;
      refreshSavedAvatarDisplay();
      const saved=await saveUserProfile(profileSaveFields({avatar_url:uploaded.url,avatar_config:null,avatar_svg:null,avatar_type:uploaded.type,skipped_avatar_setup:false}));
      if(saved){state.avatarPhotoFile=null;setAuthStatus("Avatar saved","success");hideAvatarSetup();syncAuthUi();refreshSavedAvatarDisplay()}
      else{state.userProfile=previousProfile;refreshSavedAvatarDisplay();console.error("[Muze avatar] Avatar URL was uploaded but not saved to the user profile.");setAuthStatus("Upload failed, please try again","error")}
      return;
    }
    const config={...readAvatarControls(),provider:"muze-native",savedAt:new Date().toISOString()};
    const saved=await saveUserProfile(profileSaveFields({avatar_url:null,avatar_config:config,avatar_svg:null,avatar_type:"custom",skipped_avatar_setup:false}));
    if(saved){setAuthStatus("Avatar saved","success");hideAvatarSetup();syncAuthUi();refreshSavedAvatarDisplay()}
  }catch(error){
    console.error("[Muze avatar] Upload failed",error);
    setAuthStatus("Upload failed, please try again","error");
  }finally{
    setAvatarSaveBusy(false);
  }
}async function skipAvatarSetup(){
  const saved=await saveUserProfile({skipped_avatar_setup:true});
  if(saved){setAuthStatus("You can add an avatar anytime from your account.","success");hideAvatarSetup();syncAuthUi()}
}
function setAuthMode(mode){
  state.authMode=mode==="signup"?"signup":"login";
  $("#authLoginMode")?.classList.toggle("active",state.authMode==="login");
  $("#authSignupMode")?.classList.toggle("active",state.authMode==="signup");
  const title=$("#authTitle"), submit=$("#authSubmit"), password=$("#authPassword");
  if(title)title.textContent=state.authMode==="signup"?"Create your Muze account":"Log in to your Muze account";
  if(submit)submit.textContent=state.authMode==="signup"?"Create Account":"Log In";
  if(password)password.autocomplete=state.authMode==="signup"?"new-password":"current-password";
  setAuthStatus();
}
function setAuthEmailStep(enabled=true){
  $("#authModal .authPanel")?.classList.toggle("authEmailStep",enabled);
  const prompt=$("#authPrompt");
  if(prompt)prompt.textContent=enabled
    ?(state.authMode==="signup"?"Create a Muze account with your email.":"Enter your email to log in.")
    :(state.authMode==="signup"?"Choose a password to create your account.":"Enter your password to log in.");
}
function continueAuthEmail(){
  const email=($("#authEmail")?.value||"").trim();
  if(!email){setAuthStatus("Enter your email to continue.","error");$("#authEmail")?.focus();return}
  setAuthEmailStep(false);
  setAuthStatus();
  requestAnimationFrame(()=>$("#authPassword")?.focus());
}
function showAuthEmailForm(mode="login"){
  $("#signupOnboarding")?.classList.add("hidden");
  $(".authModes")?.classList.remove("hidden");
  $("#authForm")?.classList.remove("hidden");
  $("#authLoggedOut")?.classList.remove("hidden");
  setAuthMode(mode);
  setAuthEmailStep(true);
  requestAnimationFrame(()=>$("#authEmail")?.focus());
}
function showSignupOnboarding(){
  showAuthEmailForm("signup");
}
async function startOAuthSignup(provider){
  const providerName={google:"Google",facebook:"Facebook",spotify:"Spotify"}[provider]||provider;
  if(!db){
    setAuthStatus("Supabase is not connected. Check config.js locally and Netlify environment/config values in production.","error");
    return;
  }
  const redirectTo=window.location.origin;
  setAuthStatus(`Opening ${providerName} login...`,"");
  authDebug("oauth redirect",{provider,redirectTo,hostname:window.location.hostname});
  const {error}=await db.auth.signInWithOAuth({provider,options:{redirectTo}});
  if(error){
    const message=authErrorMessage(error);
    const providerDisabled=/unsupported provider|provider is not enabled|not enabled|not configured/i.test(message);
    setAuthStatus(providerDisabled?"This login option is not enabled yet.":message,"error");
  }
}
function syncAuthUi(){
  const user=loggedInUser();
  const button=$("#authButton");
  const buttonLabel=button?.querySelector(".authButtonLabel");
  if(buttonLabel)buttonLabel.textContent=user?(currentUsername()?currentUsername():"Account"):"Login / Sign Up";
  const title=$("#authTitle");
  const prompt=$("#authPrompt");
  const eyebrow=$("#authModal .authEditorialLeft .eyebrow");
  if(eyebrow)eyebrow.textContent="Muze account";
  if(user&&title)title.textContent="Your Muze account";
  if(user&&prompt)prompt.textContent="Manage your Muze session and personalize your experience.";
  $("#authModal .authPanel")?.classList.toggle("accountProfileMode",!!user);
  const avatarSetupOpen=!$("#avatarSetup")?.classList.contains("hidden");
  $("#authLoggedOut")?.classList.toggle("hidden",!!user);
  $("#authLoggedIn")?.classList.toggle("hidden",!user||avatarSetupOpen);
  $("#authLogout")?.classList.toggle("hidden",!user||avatarSetupOpen);
  const email=$("#authUserEmail");
  if(email)email.textContent=user?.email||"your account";
  syncProfileUsernameUi();
  renderAvatarTargets();
  updateNavUsername();
}
function openAuthModal(message="Log in to join the conversation."){
  const modal=$("#authModal");
  const prompt=$("#authPrompt");
  modal?.classList.remove("libraryAccessModal");
  modal?.classList.remove("libraryAuthFlow");
  $("#authModal .authPanel")?.classList.remove("libraryAccessPanel");
  $("#authModal .authPanel")?.classList.remove("avatarEditorMode");
  $("#authModal .authPanel")?.classList.toggle("accountProfileMode",!!loggedInUser());
  $("#libraryAccessCard")?.classList.add("hidden");
  $("#avatarSetup")?.classList.add("hidden");
  $("#authLoggedOut")?.classList.toggle("hidden",!!loggedInUser());
  $("#authLoggedIn")?.classList.toggle("hidden",!loggedInUser());
  $("#authLogout")?.classList.toggle("hidden",!loggedInUser());
  if(prompt)prompt.textContent=message;
  if(modal){modal.classList.remove("hidden");modal.setAttribute("aria-hidden","false")}
  if(!loggedInUser())showAuthEmailForm("login");
  syncAuthUi();
  if(loggedInUser())loadChatSelfStats().then(renderAccountProfileStats).catch(error=>console.warn("Unable to refresh profile stats",error));
}
function closeAuthModal(){
  const modal=$("#authModal");
  if(modal){modal.classList.add("hidden");modal.setAttribute("aria-hidden","true")}
  modal?.classList.remove("libraryAccessModal");
  modal?.classList.remove("libraryAuthFlow");
  $("#authModal .authPanel")?.classList.remove("libraryAccessPanel");
  $("#authModal .authPanel")?.classList.remove("avatarEditorMode");
  $("#authModal .authPanel")?.classList.remove("accountProfileMode");
  $("#libraryAccessCard")?.classList.add("hidden");
  $("#signupOnboarding")?.classList.add("hidden");
  $("#avatarSetup")?.classList.add("hidden");
  setAuthStatus();
}
function resumePendingAuthAction(){
  const pending=state.pendingAuthAction;
  state.pendingAuthAction=null;
  if(pending)requestAnimationFrame(()=>pending());
}
function requireAuth(action,resume){
  if(loggedInUser())return true;
  const messages={
    rate:"Rate albums, track your taste, and help shape the Muze community.",
    review:"Share reviews, reactions, and the music moments that stayed with you.",
    chat:"Join the conversation around the albums and tracks you love.",
    save:"Save albums, build collections, and keep your music world in one place.",
    like:"Like music moments, reviews, and community reactions.",
    follow:"Follow libraries and keep up with other listeners.",
    profile:"Create your profile and make your Muze identity your own."
  };
  openAccessAuthPrompt({
    title:"Login to continue",
    text:messages[action]||"Log in to join the conversation.",
    resume
  });
  return false;
}
function openAccessAuthPrompt({title="Login to continue",text="Log in to join the conversation.",resume=null}={}){
  state.pendingAuthAction=typeof resume==="function"?resume:null;
  const modal=$("#authModal");
  if(modal){modal.classList.add("libraryAccessModal","libraryAuthFlow");modal.classList.remove("hidden");modal.setAttribute("aria-hidden","false")}
  $("#authModal .authPanel")?.classList.add("libraryAccessPanel");
  const authTitle=$("#authTitle");
  const prompt=$("#authPrompt");
  if(authTitle)authTitle.textContent=title;
  if(prompt)prompt.textContent="";
  const card=$("#libraryAccessCard");
  if(card){
    card.classList.remove("hidden");
    const cardTitle=card.querySelector("h3");
    const cardText=card.querySelector("p");
    if(cardTitle)cardTitle.textContent=title;
    if(cardText)cardText.textContent=text;
  }
  $("#authLoggedOut")?.classList.add("hidden");
  $("#authLoggedIn")?.classList.add("hidden");
  $("#authLogout")?.classList.add("hidden");
  $("#authModal .authPanel")?.classList.remove("accountProfileMode");
  setAuthStatus();
}
function openLibrariesAuthPrompt(){
  openAccessAuthPrompt({
    title:"Login to access your library",
    text:"Log in to save albums, build collections, and keep your music world in one place.",
    resume:()=>navigateToView("libraries")
  });
}
function showLibraryAccessAuthForm(mode){
  $("#authModal")?.classList.remove("libraryAccessModal");
  $("#authModal .authPanel")?.classList.remove("libraryAccessPanel");
  $("#libraryAccessCard")?.classList.add("hidden");
  $("#authLoggedOut")?.classList.remove("hidden");
  const title=$("#authTitle");
  const prompt=$("#authPrompt");
  if(mode==="signup"){
    showSignupOnboarding();
    return;
  }
  showAuthEmailForm("login");
  if(title)title.textContent="Log in to Muze";
  if(prompt)prompt.textContent="Log in to access your library.";
}
async function submitAuth(event){
  event?.preventDefault();
  if($("#authModal .authPanel")?.classList.contains("authEmailStep")){continueAuthEmail();return}
  authDebug("submit start",{mode:state.authMode,configured,urlHost:supabaseUrlHost(),hasAnonKey:Boolean(SUPABASE_ANON_KEY),anonKeyParts:String(SUPABASE_ANON_KEY||"").split(".").length});
  if(!db){
    setAuthStatus("Supabase is not connected. Check config.js locally and Netlify environment/config values in production.","error");
    authDebug("missing config",{SUPABASE_URL,hasAnonKey:Boolean(SUPABASE_ANON_KEY)});
    return
  }
  const email=($("#authEmail")?.value||"").trim();
  const password=$("#authPassword")?.value||"";
  if(!email||!password){setAuthStatus("Enter your email and password.","error");return}
  if(password.length<6){setAuthStatus("Password must be at least 6 characters.","error");return}
  const submit=$("#authSubmit");
  setAuthStatus(state.authMode==="signup"?"Creating your account...":"Logging in...","");
  if(submit)submit.disabled=true;
  try{
    const redirectTo=new URL("index.html",location.origin+location.pathname.replace(/[^/]*$/,"")).href;
    const result=state.authMode==="signup"
      ?await db.auth.signUp({email,password,options:{emailRedirectTo:redirectTo}})
      :await db.auth.signInWithPassword({email,password});
    authDebug("submit result",{
      mode:state.authMode,
      redirectTo:state.authMode==="signup"?redirectTo:null,
      error:result.error?{message:result.error.message,status:result.error.status,name:result.error.name,code:result.error.code}:null,
      hasUser:Boolean(result.data?.user),
      hasSession:Boolean(result.data?.session),
      userEmail:result.data?.user?.email||null,
      identitiesCount:Array.isArray(result.data?.user?.identities)?result.data.user.identities.length:null
    });
    if(result.error){setAuthStatus(authErrorMessage(result.error),"error");return}
    if(state.authMode==="signup"&&!result.data?.session){
      const identities=result.data?.user?.identities;
      if(Array.isArray(identities)&&identities.length===0){
        setAuthMode("login");
        setAuthStatus("That email may already be registered. Try logging in, or check your inbox and spam/junk folder for a confirmation email.","error");
        return;
      }
      setAuthMode("login");
      setAuthStatus("Account created. Check your email to confirm your account, and check spam/junk too.","success");
      return;
    }
    state.authSession=result.data.session||state.authSession;
    await loadUserProfile();
    syncAuthUi();
    if(state.authMode==="signup"&&!avatarHasValue()){
      showAvatarSetup(false);
    }else{
      closeAuthModal();
    }
    resumePendingAuthAction();
  }catch(error){
    authDebug("submit exception",{message:error.message,stack:error.stack});
    setAuthStatus(error.message||"Could not reach Supabase Auth. Check your internet connection and Supabase project settings.","error");
  }finally{
    if(submit)submit.disabled=false;
  }
}
async function logoutAuth(){
  if(!db){setAuthStatus("Supabase is not configured, so logout could not complete.","error");return}
  await updateOwnPresence(false);
  if(presenceTimer){clearInterval(presenceTimer);presenceTimer=null}
  const {error}=await db.auth.signOut();
  if(error){setAuthStatus(error.message,"error");return}
  state.authSession=null;
  state.userProfile=null;
  state.avatarPromptedForUser=null;
  syncAuthUi();
  setAuthStatus("Logged out.","success");
  closeAuthModal();
}
async function initAuth(){
  authDebug("init",{configured,urlHost:supabaseUrlHost(),hasAnonKey:Boolean(SUPABASE_ANON_KEY)});
  if(!db){syncAuthUi();return}
  const {data,error}=await db.auth.getSession();
  if(error)authDebug("get session error",{message:error.message,status:error.status,name:error.name});
  state.authSession=data?.session||null;
  await loadUserProfile();
  startPresenceHeartbeat();
  syncAuthUi();
  if(state.view==="libraries"||state.view==="chat"){await Promise.all([loadLibraries(),loadChatMessages(),loadUserPresence()]);render()}
  db.auth.onAuthStateChange(async (event,session)=>{
    authDebug("state change",{event,hasSession:Boolean(session),email:session?.user?.email||null});
    const wasLoggedOut=!loggedInUser();
    state.authSession=session||null;
    await loadUserProfile();
    if(session)startPresenceHeartbeat();else stopPresenceHeartbeat();
    syncAuthUi();
    if(state.view==="libraries"||state.view==="chat"){await Promise.all([loadLibraries(),loadChatMessages(),loadUserPresence()]);render()}
    if(wasLoggedOut&&session)resumePendingAuthAction();
  });
}
window.requireAuth=requireAuth;
window.gateLikeAction=function(){requireAuth("like",()=>window.gateLikeAction())}
function spotifyAlbumSummary(a){const year=a.year||String(a.release_date||"").slice(0,4);const trackCount=Number(a.total_tracks||0);const type=(a.album_type||"album").replace(/_/g," ");let parts=[];if(year)parts.push(`released in ${year}`);if(trackCount)parts.push(`${trackCount} track${trackCount===1?"":"s"}`);const detail=parts.length?` This ${type} was ${parts.join(" with ")}.`:"";return `${a.title} by ${a.artist}.${detail}`}
function cleanAlbumSummary(a){const generated=spotifyAlbumSummary(a);let summary=String(a.summary||generated||"Added to Muze.");summary=summary.replace(/\s+was added from Spotify\./i,".");summary=summary.replace(/^Added from Spotify\.?$/i,generated);summary=summary.replace(/\.\s*\./g,".");return summary}
const genreRules=[
  {label:"Greatest hits",tests:["greatest hits","best of","very best of"]},
  {label:"Classical",tests:["classical","classical piano","classical performance","classical era","romantic era","baroque","orchestral","symphony","concerto","sonata","opera","chamber music","rachmaninov","rachmaninoff","sergei rachmaninoff","sergei rachmaninov","mozart","beethoven","bach","chopin","tchaikovsky","debussy","mahler","brahms","vivaldi","stravinsky","prokofiev","shostakovich","handel","haydn","liszt","schubert","schumann"]},
  {label:"Progressive Metal",tests:["progressive metal","prog metal","tool lateralus"]},
  {label:"Rap Metal",tests:["rap metal","rap rock","funk metal","rage against the machine"]},
  {label:"Progressive Rock",tests:["progressive rock","prog rock","art rock","pink floyd"]},
  {label:"Alternative Rock",tests:["alternative rock","grunge","indie rock","modern rock","permanent wave","post-grunge","smashing pumpkins","foo fighters","weezer","john frusciante","red hot chili peppers","nirvana nevermind"]},
  {label:"Folk Rock",tests:["folk rock","roots rock","singer songwriter","singer-songwriter","bob dylan highway 61"]},
  {label:"Pop Rock",tests:["pop rock","beach boys pet sounds","fleetwood mac rumours"]},
  {label:"Gothic Metal",tests:["gothic metal","goth metal","type o negative"]},
  {label:"Pop Punk",tests:["pop punk","blink 182"]},
  {label:"Punk Rock",tests:["punk rock","skate punk","the offspring","offspring","green day"]},
  {label:"Psychedelic Rock",tests:["psychedelic rock","the doors"]},
  {label:"Hip-Hop",tests:["hip hop","hip-hop","rap","pop rap","trap","drill","east coast hip hop","west coast rap","gangster rap","hardcore hip hop","kendrick lamar","nas illmatic","notorious b i g","2pac","tupac","eminem","fugees"]},
  {label:"R&B",tests:["r&b","r and b","rnb","rhythm and blues","quiet storm"]},
  {label:"Indie Pop",tests:["indie pop","bedroom pop","chamber pop"]},
  {label:"Electronic",tests:["electronic","electronica","edm","house","techno","ambient","synthpop"]},
  {label:"Alternative",tests:["alternative","indie","shoegaze","post-rock","radiohead"]},
  {label:"Metal",tests:["metal","alternative metal","thrash","doom","black metal","death metal","nu metal","metallica"]},
  {label:"Punk",tests:["punk","hardcore","emo"]},
  {label:"Soul",tests:["soul","funk","motown","neo soul","stevie wonder"]},
  {label:"Folk",tests:["folk","singer-songwriter"]},
  {label:"Jazz",tests:["jazz","bebop","fusion"]},
  {label:"Reggae",tests:["reggae","ska","dub"]},
  {label:"Country",tests:["country","americana","bluegrass"]},
  {label:"Rock",tests:["rock","album rock","classic rock","blues rock","hard rock","glam rock","beatles","queen","kiss","david bowie","george harrison","paul mccartney","jimi hendrix","rolling stones","led zeppelin"]},
  {label:"Pop",tests:["pop","dance pop","art pop","new wave","taylor swift","harry styles","michael jackson thriller"]}
];
const albumGenreOverrides={
  "the beatles::abbey road":"Rock",
  "the beatles::revolver":"Rock",
  "the beatles::rubber soul":"Rock",
  "the beatles::sgt pepper s lonely hearts club band":"Rock",
  "the beatles::the beatles":"Rock",
  "the beatles::the white album":"Rock",
  "the beatles::white album":"Rock",
  "michael jackson::thriller":"Pop",
  "bob dylan::highway 61 revisited":"Folk Rock",
  "nirvana::nevermind":"Alternative Rock",
  "tool::lateralus":"Progressive Metal",
  "jimi hendrix::experience hendrix":"Rock",
  "the jimi hendrix experience::experience hendrix":"Rock",
  "the notorious b i g::ready to die":"Hip-Hop",
  "notorious b i g::ready to die":"Hip-Hop",
  "the beach boys::pet sounds":"Pop Rock",
  "beach boys::pet sounds":"Pop Rock",
  "fugees::the score":"Hip-Hop",
  "pink floyd::the dark side of the moon":"Progressive Rock",
  "pink floyd::wish you were here":"Progressive Rock",
  "pink floyd::animals":"Progressive Rock",
  "pink floyd::the wall":"Progressive Rock",
  "queen::a night at the opera":"Rock",
  "david bowie::the rise and fall of ziggy stardust and the spiders from mars":"Rock",
  "the smashing pumpkins::mellon collie and the infinite sadness":"Alternative Rock",
  "the smashing pumpkins::siamese dream":"Alternative Rock",
  "2pac::all eyez on me":"Hip-Hop",
  "2pac::me against the world":"Hip-Hop",
  "deftones::white pony":"Alternative Metal",
  "the offspring::smash":"Punk Rock",
  "angus and julia stone::down the way":"Folk",
  "angus & julia stone::down the way":"Folk"
};
const artistGenreOverrides={
  "the beatles":"Rock",
  "beatles":"Rock",
  "smashing pumpkins":"Alternative Rock",
  "the smashing pumpkins":"Alternative Rock",
  "2pac":"Hip-Hop",
  "tupac":"Hip-Hop",
  "tupac shakur":"Hip-Hop",
  "queen":"Rock",
  "taylor swift":"Pop",
  "deftones":"Alternative Metal",
  "kiss":"Rock",
  "george harrison":"Rock",
  "harry styles":"Pop",
  "paul mccartney":"Rock",
  "wings":"Rock",
  "paul mccartney and wings":"Rock",
  "david bowie":"Rock",
  "the offspring":"Punk Rock",
  "offspring":"Punk Rock",
  "weezer":"Alternative Rock",
  "foo fighters":"Rock",
  "cat stevens":"Folk Rock",
  "yusuf":"Folk Rock",
  "yusuf cat stevens":"Folk Rock",
  "silverchair":"Alternative Rock",
  "john frusciante":"Alternative Rock",
  "ben harper":"Folk Rock",
  "ben harper and the innocent criminals":"Folk Rock",
  "type o negative":"Gothic Metal",
  "blink 182":"Pop Punk",
  "green day":"Punk Rock",
  "the doors":"Psychedelic Rock",
  "doors":"Psychedelic Rock",
  "jimi hendrix":"Rock",
  "the jimi hendrix experience":"Rock",
  "bob dylan":"Folk Rock",
  "the beach boys":"Pop Rock",
  "beach boys":"Pop Rock",
  "notorious b i g":"Hip-Hop",
  "the notorious b i g":"Hip-Hop",
  "eminem":"Hip-Hop",
  "fugees":"Hip-Hop",
  "red hot chili peppers":"Alternative Rock",
  "tool":"Progressive Metal",
  "pink floyd":"Progressive Rock",
  "metallica":"Metal",
  "michael jackson":"Pop",
  "britney spears":"Pop",
  "katy perry":"Pop",
  "backstreet boys":"Pop",
  "the backstreet boys":"Pop",
  "love":"Psychedelic Rock",
  "live":"Alternative Rock",
  "eric clapton":"Rock",
  "counting crows":"Alternative Rock",
  "the velvet underground":"Alternative Rock",
  "velvet underground":"Alternative Rock",
  "the who":"Rock",
  "who":"Rock",
  "pendulum":"Electronic",
  "scorpions":"Rock",
  "neil young":"Folk Rock",
  "the war on drugs":"Alternative Rock",
  "war on drugs":"Alternative Rock",
  "nirvana":"Alternative Rock",
  "kendrick lamar":"Hip-Hop",
  "nas":"Hip-Hop",
  "stevie wonder":"Soul",
  "sergei rachmaninoff":"Classical",
  "sergei rachmaninov":"Classical",
  "rachmaninoff":"Classical",
  "rachmaninov":"Classical",
  "ludwig van beethoven":"Classical",
  "wolfgang amadeus mozart":"Classical",
  "johann sebastian bach":"Classical",
  "frederic chopin":"Classical",
  "pyotr ilyich tchaikovsky":"Classical",
  "claude debussy":"Classical",
  "gustav mahler":"Classical",
  "johannes brahms":"Classical",
  "antonio vivaldi":"Classical",
  "igor stravinsky":"Classical",
  "sergei prokofiev":"Classical",
  "dmitri shostakovich":"Classical"
};
const metadataArtistGenreFallbacks={
  "abba":"Pop","adele":"Pop","amy winehouse":"Soul","ariana grande":"Pop","avril lavigne":"Pop Rock","beyonce":"R&B","billie eilish":"Pop","bruno mars":"Pop","celine dion":"Pop","charli xcx":"Pop","dua lipa":"Pop","ed sheeran":"Pop","elton john":"Pop Rock","george michael":"Pop","justin bieber":"Pop","justin timberlake":"Pop","lady gaga":"Pop","lana del rey":"Alternative Pop","lorde":"Alternative Pop","madonna":"Pop","miley cyrus":"Pop","olivia rodrigo":"Pop Rock","prince":"Pop","rihanna":"Pop","sabrina carpenter":"Pop","sam smith":"Pop","selena gomez":"Pop","shakira":"International","spice girls":"Pop","the weeknd":"R&B","whitney houston":"Pop",
  "arctic monkeys":"Alternative Rock","blur":"Alternative Rock","coldplay":"Alternative Rock","fall out boy":"Pop Punk","fontaines d c":"Alternative Rock","gorillaz":"Alternative","joy division":"Post-Punk","linkin park":"Alternative Metal","my chemical romance":"Emo","oasis":"Alternative Rock","paramore":"Pop Punk","pearl jam":"Alternative Rock","pixies":"Alternative Rock","r e m":"Alternative Rock","soundgarden":"Alternative Rock","the cure":"Alternative Rock","the killers":"Alternative Rock","the smiths":"Alternative Rock","the strokes":"Alternative Rock","u2":"Rock",
  "ac dc":"Rock","aerosmith":"Rock","black sabbath":"Metal","bon jovi":"Rock","deep purple":"Rock","def leppard":"Rock","eagles":"Rock","guns n roses":"Rock","iron maiden":"Metal","judas priest":"Metal","led zeppelin":"Rock","motley crue":"Rock","ozzy osbourne":"Metal","rage against the machine":"Rap Metal","slipknot":"Metal","system of a down":"Alternative Metal","van halen":"Rock",
  "a tribe called quest":"Hip-Hop","beastie boys":"Hip-Hop","cardi b":"Hip-Hop","dr dre":"Hip-Hop","drake":"Hip-Hop","future":"Hip-Hop","jay z":"Hip-Hop","j cole":"Hip-Hop","kanye west":"Hip-Hop","lauryn hill":"Hip-Hop","lil wayne":"Hip-Hop","missy elliott":"Hip-Hop","nicki minaj":"Hip-Hop","outkast":"Hip-Hop","snoop dogg":"Hip-Hop","travis scott":"Hip-Hop","tyler the creator":"Hip-Hop","wu tang clan":"Hip-Hop",
  "al green":"Soul","aretha franklin":"Soul","billy joel":"Pop Rock","carole king":"Folk Rock","curtis mayfield":"Soul","diana ross":"Soul","donny hathaway":"Soul","etta james":"Soul","marvin gaye":"Soul","nina simone":"Jazz","otis redding":"Soul","ray charles":"Soul","sade":"R&B","sam cooke":"Soul",
  "bill evans":"Jazz","charles mingus":"Jazz","chet baker":"Jazz","dave brubeck":"Jazz","duke ellington":"Jazz","herbie hancock":"Jazz","john coltrane":"Jazz","miles davis":"Jazz","thelonious monk":"Jazz",
  "aphex twin":"Electronic","bjork":"Electronic","boards of canada":"Electronic","daft punk":"Electronic","depeche mode":"Electronic","kraftwerk":"Electronic","massive attack":"Electronic","moby":"Electronic","new order":"Electronic","the chemical brothers":"Electronic",
  "bob marley":"Reggae","buena vista social club":"International","caetano veloso":"International","fela kuti":"International","joao gilberto":"International","manu chao":"International","os mutantes":"International","rosalia":"International","serge gainsbourg":"International","sigur ros":"International","stereolab":"Alternative","yoav":"International"
};
const metadataGenreFallbackRules=[
  {label:"Greatest hits",tests:["greatest hits","best of","very best of"]},
  {label:"Soundtracks",tests:["soundtrack","original motion picture","motion picture soundtrack","original score","film score","music from the motion picture","music from and inspired by","cast recording","broadway cast","original broadway"]},
  {label:"Classical",tests:["classical","symphony","concerto","sonata","opera","piano works","piano concerto","violin concerto","cello concerto","requiem","bach","beethoven","mozart","chopin","rachmaninoff","rachmaninov","tchaikovsky","debussy","mahler","brahms","vivaldi","stravinsky","prokofiev","shostakovich","handel","haydn","liszt","schubert","schumann"]},
  {label:"Hip-Hop",tests:["hip hop","hip-hop","rap","trap","drill","g funk","gangsta","gangster","mixtape","illmatic","ready to die","good kid","college dropout","late registration","graduation"]},
  {label:"R&B",tests:["r and b","r&b","rnb","rhythm and blues","quiet storm","neo soul","contemporary r b"]},
  {label:"Soul",tests:["soul","funk","motown","stax","doo wop"]},
  {label:"Jazz",tests:["jazz","bebop","hard bop","cool jazz","modal jazz","fusion","blue note"]},
  {label:"Reggae",tests:["reggae","dub","ska","dancehall","rastafari"]},
  {label:"Country",tests:["country","americana","bluegrass","honky tonk","nashville"]},
  {label:"Rap Metal",tests:["rap metal","rap rock","funk metal","rage against the machine"]},
  {label:"Metal",tests:["metal","thrash","doom","black metal","death metal","heavy metal","nu metal","sludge"]},
  {label:"Punk Rock",tests:["punk rock","skate punk","hardcore punk"]},
  {label:"Pop Punk",tests:["pop punk","emo pop"]},
  {label:"Alternative Rock",tests:["alternative rock","alt rock","grunge","indie rock","post grunge","shoegaze","britpop","post punk","garage rock revival"]},
  {label:"Progressive Rock",tests:["progressive rock","prog rock","art rock"]},
  {label:"Psychedelic Rock",tests:["psychedelic rock","acid rock"]},
  {label:"Folk Rock",tests:["folk rock","singer songwriter","singer-songwriter","roots rock"]},
  {label:"Pop Rock",tests:["pop rock","soft rock","power pop"]},
  {label:"Rock",tests:["rock","classic rock","album rock","hard rock","blues rock","glam rock","southern rock"]},
  {label:"Electronic",tests:["electronic","electronica","edm","house","techno","ambient","synthpop","trip hop","downtempo","idm","drum and bass","dance"]},
  {label:"International",tests:["world","latin","afrobeat","afropop","afro pop","k pop","k-pop","j pop","j-pop","city pop","french pop","chanson","bossa nova","samba","flamenco","fado","arabic","hebrew","hindi","bollywood","qawwali","mandopop","cantopop","c pop","korean","japanese","spanish","portuguese","italian","german","turkish","greek","persian","african","caribbean"]},
  {label:"Indie Pop",tests:["indie pop","bedroom pop","chamber pop","dream pop"]},
  {label:"Alternative Pop",tests:["alternative pop","alt pop","baroque pop","art pop"]},
  {label:"Pop",tests:["pop","dance pop","teen pop","electropop","bubblegum","adult contemporary","boy band","girl group","radio mix","melody radio mix"]}
];
function metadataGenreFallback(album){
  const artist=normalizeArtistKey(album?.artist);
  const artistLabel=partialOverrideLookup(metadataArtistGenreFallbacks,artist);
  if(artistLabel)return artistLabel;
  const text=genreKey([album?.title,album?.artist,album?.genre,album?.tag,album?.summary,album?.cached_genre,album?.stored_genre,album?.genre_label,album?.genre_name,album?.category,album?.primary_genre,album?.spotify_genre,Array.isArray(album?.genres)?album.genres.join(" "):"",Array.isArray(album?.artist_genres)?album.artist_genres.join(" "):""].filter(Boolean).join(" "));
  for(const rule of metadataGenreFallbackRules){if(rule.tests.some(test=>text.includes(test)))return rule.label}
  return "";
}
function genreKey(value){return String(value||"").toLowerCase().replace(/&/g,"and").replace(/\([^)]*\)/g," ").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim()}
function normalizeMatchKey(value){
  return genreKey(value)
    .replace(/\b(remaster(?:ed)?|live|deluxe|expanded|anniversary|edition|version|mono|stereo|bonus|explicit|clean|original|soundtrack|compilation|greatest hits|best of|collection)\b/g," ")
    .replace(/\b(the)\b/g," ")
    .replace(/\s+/g," ")
    .trim();
}
function normalizeArtistKey(value){return normalizeMatchKey(value).replace(/\b(feat|featuring|with|and)\b/g," ").replace(/\s+/g," ").trim()}
function partialOverrideLookup(map,value){
  const normalized=normalizeArtistKey(value);
  if(!normalized)return "";
  if(map[normalized])return map[normalized];
  const padded=` ${normalized} `;
  const entries=Object.entries(map).map(([key,label])=>[normalizeArtistKey(key),label]).sort((a,b)=>b[0].length-a[0].length);
  const exact=entries.find(([key])=>key&&normalized===key);
  if(exact)return exact[1];
  const partial=entries.find(([key])=>key&&key.length>2&&(padded.includes(` ${key} `)||` ${key} `.includes(padded)));
  return partial?partial[1]:"";
}
function validGenreCandidate(value){
  const cleaned=genreKey(value);
  return cleaned&&cleaned!=="album"&&cleaned!=="classic"&&cleaned!=="essential"&&cleaned!=="masterpiece"&&cleaned!=="timeless"&&cleaned!=="modern classic";
}
function genreCandidateGroup(values){
  return values.filter(validGenreCandidate);
}
function albumArtistGenreCandidates(album){
  return Array.isArray(album?.artist_genres)?genreCandidateGroup(album.artist_genres):[];
}
function albumStoredGenreCandidates(album){
  const candidates=[album?.cached_genre,album?.stored_genre,album?.genre_label,album?.genre_name,album?.category,album?.primary_genre,album?.spotify_genre,album?.tag];
  if(Array.isArray(album?.genres))candidates.push(...album.genres);
  return genreCandidateGroup(candidates);
}
function albumGenreCandidates(album){
  return genreCandidateGroup([album?.genre,...albumArtistGenreCandidates(album),...albumStoredGenreCandidates(album),`${album?.artist||""} ${album?.title||""}`,album?.artist]);
}
function normalizeGenreLabel(value){
  const text=genreKey(value);
  if(!text)return "";
  for(const rule of genreRules){if(rule.tests.some(test=>text.includes(test)))return rule.label}
  return "";
}
function albumIsGreatestHits(album){
  const title=genreKey(album?.title||album?.name||album?.album_title||"");
  return /\b(greatest hits|best of|very best of)\b/.test(title);
}
function albumGenreLabel(album){
  const manual=String(albumOverviewRowReadOnly(album)?.manual_genre||"").trim();
  if(manual&&genreKey(manual)!=="album")return manual;
  if(albumIsGreatestHits(album))return "Greatest hits";
  const artist=normalizeArtistKey(album?.artist);
  const title=normalizeMatchKey(album?.title);
  if(artist==="rage against machine")return "Rap Metal";
  const direct=validGenreCandidate(album?.genre)?normalizeGenreLabel(album.genre)||String(album.genre).trim():"";
  if(direct)return direct;
  for(const candidate of albumArtistGenreCandidates(album)){const label=normalizeGenreLabel(candidate);if(label)return label}
  for(const candidate of albumStoredGenreCandidates(album)){const label=normalizeGenreLabel(candidate);if(label)return label}
  const exact=albumGenreOverrides[`${artist}::${title}`]||partialOverrideLookup(albumGenreOverrides,`${artist}::${title}`);
  if(exact)return exact;
  const artistLabel=partialOverrideLookup(artistGenreOverrides,artist);
  if(artistLabel)return artistLabel;
  for(const candidate of [`${artist} ${title}`,artist]){const label=normalizeGenreLabel(candidate);if(label)return label}
  return metadataGenreFallback(album)||"Album";
}
function genreSearchText(album){return [albumGenreLabel(album),...albumGenreCandidates(album)].join(" ")}
function beautifulAlbumDescription(a){
  const title=String(a.title||"This album").trim();
  const artist=String(a.artist||"the artist").trim();
  const year=a.year||String(a.release_date||"").slice(0,4);
  const genre=String(albumGenreLabel(a)||a.tag||"").trim();
  const rating=Number(score(a)||a.avg_rating||0);
  const saved=String(a.summary||"").trim();
  const factual=spotifyAlbumSummary(a);
  const key=`${artist} ${title}`.toLowerCase().replace(/\s+/g," ");
  const known=[
    [/offspring.*smash/,`${title} captures The Offspring at their most explosive: fast, bratty, melodic punk built for volume, release, and instant choruses. It is scrappy in the best way, turning frustration and suburban pressure into songs that feel sharp, loud, and strangely communal.`],
    [/nirvana.*nevermind/,`${title} is the moment underground noise became a worldwide language. Its power is in the contrast: huge hooks, damaged edges, and a restless emotional charge that still makes the record feel dangerous and immediate.`],
    [/beatles.*abbey road/,`${title} feels like a final golden hour for The Beatles, full of elegant songwriting, studio warmth, and a second side that moves like one long farewell. It is polished without losing its soul, familiar without ever feeling small.`],
    [/radiohead.*ok computer/,`${title} turns modern anxiety into something strangely beautiful. Radiohead stretch guitars, electronics, dread, and melody into a record that feels both futuristic and deeply human.`],
    [/nas.*illmatic/,`${title} is compact, cinematic, and almost impossibly focused. Nas turns Queensbridge into a living landscape, with every verse carrying detail, pressure, memory, and street-corner poetry.`],
    [/kendrick lamar.*to pimp a butterfly/,`${title} is sprawling, fearless, and alive with jazz, funk, politics, grief, pride, and contradiction. Kendrick Lamar builds it like a conversation with history, community, and himself.`],
    [/fleetwood mac.*rumours/,`${title} makes heartbreak sound effortless. Fleetwood Mac turn private tension into immaculate pop songs, where every harmony feels beautiful and every lyric carries a bruise.`],
    [/pink floyd.*wish you were here/,`${title} is spacious, mournful, and glowing with absence. Pink Floyd use long instrumental passages and aching melodies to turn loss, distance, and disillusion into something almost weightless.`],
    [/pixies.*doolittle/,`${title} is wired, strange, and endlessly influential. Pixies make quiet-loud dynamics feel like a nervous system, mixing surreal imagery with hooks that arrive sideways and stay lodged in your head.`],
    [/radiohead.*in rainbows/,`${title} is one of Radiohead's warmest and most fluid records, full of pulse, intimacy, and uneasy beauty. It feels less like a statement and more like a room you step into.`]
  ];
  const exact=known.find(([pattern])=>pattern.test(key));
  const hasRealSummary=saved&&saved!==factual&&!/was added from spotify/i.test(saved)&&!/This album was released/i.test(saved)&&!/^.+ by .+\. This album/i.test(saved);
  let opening=exact?exact[1]:(hasRealSummary?saved:`${title} needs a researched Muze overview before editorial copy is shown.`);
  const lowerGenre=genre.toLowerCase();
  const genreLines={
    "punk":"The record thrives on speed, impact, and directness, with songs that hit quickly and leave a charge behind.",
    "rock":"Research is needed before Muze writes a sound summary for this album.",
    "classic rock":"It carries the warmth and craft of classic rock without feeling frozen in the past, balancing familiarity with real character.",
    "alternative":"Its best moments live in the tension between melody and unease, turning left-field instincts into something surprisingly inviting.",
    "hip-hop":"The album is driven by voice, rhythm, and point of view, where personality matters as much as production.",
    "rap":"The album is driven by voice, rhythm, and point of view, where personality matters as much as production.",
    "soul":"Its strength comes from feel: groove, warmth, emotion, and performances that make the songs breathe.",
    "pop rock":"It leans on melody and polish, but the emotional pull comes from the friction underneath the hooks.",
    "metal":"The album is built on weight and intensity, using heaviness as a way to create atmosphere rather than just volume.",
    "indie":"It has the intimacy of a personal collection: smaller details, odd corners, and songs that grow sharper with repeat listens.",
    "jazz":"It moves with conversation and instinct, rewarding listeners who follow the shifts in tone, space, and performance.",
    "electronic":"It treats texture and rhythm like emotional language, building atmosphere through movement, repetition, and sound design."
  };
  const genreLine=genreLines[lowerGenre]||genreLines[Object.keys(genreLines).find(g=>lowerGenre.includes(g))]||"Research is needed before Muze writes a sound summary for this album.";
  const era=Number(year)||0;
  const eraLine=era>=2020?`As a newer release, ${title} still feels open-ended, with its reputation being shaped in real time by listeners.`:era>=2000?`Research is needed before Muze writes an impact summary for this album.`:era>=1990?`Coming out of the ${Math.floor(era/10)*10}s, it has the kind of immediacy that still cuts through decades later.`:era?`Heard now, its ${year} setting gives the record a sense of history without making it feel distant.`:`Heard now, it feels less tied to a date than to a particular state of mind.`;
  const scoreLine=rating>=9?`The ${rating.toFixed(1)} community score suggests listeners are treating it as essential, not just enjoyable.`:rating>=7?`Its ${rating.toFixed(1)} community score points to a record with real supporters and enough character to keep the conversation moving.`:rating>0?`Its ${rating.toFixed(1)} community score leaves room for debate, which can make the album more interesting than a simple consensus pick.`:`Research is needed before Muze writes a legacy summary for this album.`;
  return `${opening} ${genreLine} ${eraLine} ${scoreLine}`;
}
const customAlbumOverviews={
  "thriller": "Thriller is more than just a blockbuster album, it?s the moment pop music became cinematic. Building on the sleek disco-funk foundations of Off the Wall, Michael Jackson and producer Quincy Jones crafted a record that fused pop, funk, rock, soul, and spectacle into something universal. From the razor-sharp groove of ?Billie Jean? to the explosive crossover energy of ?Beat It? and the theatrical horror of ?Thriller,? every track feels engineered for maximum impact. At the height of his powers, Jackson balanced charisma, vulnerability, paranoia, and ambition with unmatched precision, creating an album that didn?t just dominate the charts, it reshaped the possibilities of mainstream music. Decades later, Thriller remains less like an album and more like a cultural event permanently frozen in time.",
  "revolver": "Revolver captures The Beatles at the moment they stopped treating the studio as a place to record songs and started using it as an instrument itself. Layered with tape loops, backward guitars, distorted textures, and psychedelic experimentation, the album pushed rock music into entirely new territory. Tracks like ?Tomorrow Never Knows? feel less like traditional pop songs and more like immersive soundscapes, while ?Eleanor Rigby? introduced a striking emotional maturity rarely heard in mainstream music at the time. Influenced by LSD, avant-garde composition, and Eastern spirituality, the band expanded far beyond their early pop roots, blending innovation with unforgettable songwriting. From the biting groove of ?Taxman? to the dreamlike haze of ?I?m Only Sleeping,? every track feels like a band redefining what modern music could become. By the time Revolver was released, the Beatles had already outgrown the limits of live performance, and stepped into a completely different artistic world.",
  "blood on the tracks": "This is Bob Dylan at his most vulnerable, turning heartbreak and emotional collapse into something timeless. Written during the breakdown of his marriage, the album blends intimate storytelling with raw, restless emotion, capturing love, regret, anger, and memory with extraordinary precision. From the winding reflections of ?Tangled Up in Blue? to the bitterness of ?Idiot Wind? and the aching tenderness of ?You?re a Big Girl Now,? Dylan moves through personal devastation with lyrical detail that feels both deeply specific and universally human. The contrast between the quieter New York recordings and the more urgent Minneapolis sessions gives the album a unique emotional tension, shifting between reflection, fury, and resignation. Sparse yet emotionally overwhelming, Blood on the Tracks remains one of Dylan?s most powerful achievements: a breakup album transformed into poetic folklore.",
  "nevermind": "Nevermind didn?t just make Nirvana famous, it completely changed the direction of mainstream rock. Emerging from Seattle?s underground grunge scene, the album exploded into popular culture with ?Smells Like Teen Spirit,? replacing the excess of hair metal with something rawer, darker, and more emotionally honest. Driven by Kurt Cobain?s jagged songwriting, tortured vocals, and unforgettable quiet-to-loud dynamics, Nevermind balances chaos with melody in a way that felt revolutionary. Tracks like ?Lithium,? ?Breed,? and ?Come as You Are? capture alienation, anger, vulnerability, and rebellion all at once, while the crushing rhythm section of Dave Grohl and Krist Novoselic gives the album its relentless force. Beneath the distortion and aggression lies a deep pop sensibility, turning deeply personal turmoil into songs that resonated with an entire generation. Decades later, Nevermind still feels less like a breakthrough album and more like a cultural detonation.",
  "abbey road": "Abbey Road captures The Beatles at the end of their journey, fractured personally, yet still capable of creating music with extraordinary unity and elegance. Recorded as the band was nearing breakup, the album channels tension, nostalgia, experimentation, and warmth into one of the most refined records of the rock era. From the crushing intensity of ?I Want You (She?s So Heavy)? to the radiant optimism of ?Here Comes the Sun,? Abbey Road moves effortlessly between styles while maintaining a seamless sense of flow. George Harrison delivers some of his finest songwriting with ?Something? and ?Here Comes the Sun,? while John Lennon and Paul McCartney balance vulnerability, theatricality, bitterness, and beauty across the album?s iconic second-half medley. Polished yet deeply human, Abbey Road feels like a final moment of creative harmony from a band already drifting apart, a farewell that somehow sounds timeless, comforting, and endlessly alive.",
  "pet sounds": "Pet Sounds transformed what a pop album could be. Created largely by Brian Wilson as an intensely personal studio project, the record replaced the carefree surf-pop image of The Beach Boys with something far more emotional, ambitious, and orchestral. Inspired by the sophistication of Rubber Soul, Wilson responded with an album that would, in turn, inspire Sgt. Pepper?s Lonely Hearts Club Band. Blending lush harmonies with unconventional instruments, layered arrangements, and deeply introspective songwriting, Pet Sounds captures the fragile transition from youthful innocence to adult uncertainty. Songs like ?Wouldn?t It Be Nice,? ?God Only Knows,? and ?I Just Wasn?t Made for These Times? ache with longing, vulnerability, and emotional isolation, while still sounding warm and impossibly beautiful. Every detail, from bicycle bells and barking dogs to harpsichords, strings, and horns, feels carefully placed to create a dreamlike emotional world. More than just a collection of songs, Pet Sounds became a blueprint for the modern album: intimate, cohesive, cinematic, and profoundly human.",
  "illmatic": "Illmatic is one of hip-hop?s most vivid portraits of urban life, a debut that turned Nas into a legend before he was even old enough to legally drink. Across just under 40 minutes, Nas paints cinematic scenes of New York street life with extraordinary precision, moving through themes of survival, paranoia, ambition, crime, and escape with the eye of a poet and the realism of someone who lived it. Built on atmospheric production from some of the greatest producers in East Coast hip-hop, Illmatic feels immersive from the opening subway sounds to the final track. Songs like ?N.Y. State of Mind,? ?Memory Lane,? and ?The World Is Yours? combine razor-sharp storytelling with dense internal rhyme schemes that reshaped lyrical standards in rap music. What made the album revolutionary wasn?t loudness or commercial ambition, it was clarity, detail, and authenticity. Nas delivered street rap with literary depth, creating a record that became a cornerstone of hip-hop culture and a blueprint for generations of MCs that followed.",
  "ok computer": "OK Computer marked the moment Radiohead transcended alternative rock and created something far stranger, colder, and more emotionally disorienting. Expanding beyond traditional guitar music, the band stretched their sound into atmospheric textures, unsettling electronics, orchestral noise, and fragmented songwriting that captured the anxiety of the modern world. Tracks like ?Karma Police,? ?Paranoid Android,? and ?No Surprises? balance beauty with unease, combining haunting melodies with themes of alienation, technological paranoia, emotional numbness, and societal collapse. The album constantly shifts between intimacy and chaos, using distorted guitars, eerie strings, and abstract production to create a feeling of quiet psychological pressure. Rather than chasing conventional rock grandeur, OK Computer embraced experimentation and uncertainty, redefining what a mainstream rock album could sound like in the late 1990s. Decades later, it still feels uncannily ahead of its time, a melancholic, futuristic masterpiece that only grows more relevant with age.",
  "blonde on blonde": "Blonde on Blonde is Bob Dylan at his most expansive, surreal, and musically fearless. Blending folk, blues, rock, and country into a sprawling double album, Dylan created what he famously described as his ?thin, wild mercury sound?, a restless mix of poetic chaos, emotional clarity, and electric intensity. Recorded in Nashville with seasoned session musicians, the album balances loose, almost drunken spontaneity with remarkable musical precision. Songs like ?Rainy Day Women #12 & 35? and ?Stuck Inside of Mobile with the Memphis Blues Again? overflow with vivid imagery, cryptic humor, and stream-of-consciousness storytelling, while tracks such as ?I Want You? and ?Sad Eyed Lady of the Lowlands? reveal a more romantic and vulnerable side of Dylan?s songwriting. At once playful, mysterious, and emotionally rich, Blonde on Blonde pushed rock music into more literary and experimental territory without losing its raw musical energy. It remains one of Dylan?s defining achievements, a dreamlike collision of poetry, passion, and sound.",
  "the chronic": "The Chronic redefined West Coast hip-hop by transforming the raw aggression of gangsta rap into something smoother, heavier, and unmistakably cinematic. Drawing deeply from the funk legacy of George Clinton and P-Funk, Dr. Dre built a new sound -G-Funk- driven by deep basslines, hypnotic synths, slow grooves, and razor-sharp production. The album also introduced the world to Snoop Dogg, whose relaxed flow and effortless charisma became central to the record?s identity. Tracks like ?Nuthin? but a ?G? Thang? and ?Let Me Ride? combined street realism with laid-back swagger, creating music that felt both dangerous and irresistibly smooth. More than just a hit record, The Chronic reshaped the sound of 1990s hip-hop, turning funk into the backbone of modern rap production and cementing Dr. Dre as one of the genre?s most influential architects.",
  "off the wall": "Off the Wall was the moment Michael Jackson fully emerged as a solo superstar, stepping beyond the legacy of the The Jackson 5 and into a sound that felt entirely his own. Blending disco, funk, pop, and soul with extraordinary precision, the album captures Jackson balancing emotional vulnerability with pure dance-floor electricity. Tracks like ?Don?t Stop ?Til You Get Enough,? ?Rock With You,? and ?Burn This Disco Out? radiate joy, rhythm, and effortless charisma, helping define the sound of late-70s pop music. At the same time, the album?s ballads reveal a more intimate side of Jackson, particularly on ?She?s Out of My Life,? where his emotional performance famously breaks into tears. Produced with Quincy Jones, Off the Wall laid the foundation for the global phenomenon that would follow with Thriller, combining flawless grooves with a level of emotion and crossover appeal few pop records had ever achieved.",
  "rubber soul": "Rubber Soul (1965) marked the moment The Beatles evolved from a world-conquering pop group into something more introspective, experimental, and artistically ambitious. Influenced heavily by the lyrical depth of Bob Dylan, the album introduced more mature songwriting, emotional nuance, and new sonic textures that expanded the boundaries of rock music. From the playful groove of ?Drive My Car? to the melancholy reflection of ?I?m Looking Through You? and ?You Won?t See Me,? Rubber Soul feels more personal and cohesive than anything the band had made before. ?Norwegian Wood? became especially groundbreaking, with George Harrison introducing the sitar into mainstream rock, giving the album an atmosphere that hinted at the psychedelic experimentation still to come. Warm, melodic, and quietly revolutionary, Rubber Soul captures the Beatles at the start of a remarkable creative transformation, one that would completely reshape popular music over the next few years.",
  "the beatles": "The Beatles (The White Album) (1968) captures The Beatles at their most unpredictable, fragmented, and creatively fearless. Written largely during the band?s retreat in India with Maharishi Mahesh Yogi, the album became an explosion of individual ideas, personalities, and musical styles, sprawling across folk, hard rock, psychedelia, blues, avant-garde experimentation, country, and pop. Rather than chasing a single cohesive sound, each member pushed deeper into their own artistic identity. John Lennon balanced tenderness and chaos on tracks like ?Julia? and ?Happiness Is a Warm Gun,? while Paul McCartney moved effortlessly between playful melodies and sharp satire with songs like ?Martha My Dear? and ?Back in the U.S.S.R.? George Harrison delivered some of the album?s emotional high points, including ?While My Guitar Gently Weeps,? featuring a legendary guest solo from Eric Clapton. Restless, messy, adventurous, and endlessly inventive, The White Album feels less like a single statement and more like an entire universe of ideas unfolding at once, a portrait of a band testing the absolute limits of what popular music could contain.",
  "sgt peppers": "Sgt. Pepper's Lonely Hearts Club Band, released in 1967, marked the moment The Beatles fully abandoned the limits of live performance and reinvented themselves as studio artists. Freed from touring and the pressures of Beatlemania, the band used the album?s fictional alter-ego concept as a gateway into psychedelic experimentation, orchestral ambition, and boundless creative freedom. From the dreamlike surrealism of ?Lucy in the Sky With Diamonds? to the communal warmth of ?With a Little Help From My Friends? and the monumental finale ?A Day in the Life,? the album constantly shifts between fantasy, nostalgia, melancholy, and wonder. Songs like ?Being for the Benefit of Mr. Kite!? and ?Fixing a Hole? blend Victorian imagery, avant-garde production, Indian influences, classical instrumentation, and psychedelic rock into something entirely new for popular music. More than just a landmark album, Sgt. Pepper?s Lonely Hearts Club Band redefined what an album could be ? immersive, conceptual, and artistically limitless. Its influence reshaped rock music for the rest of the decade and beyond.",
  "master of puppets": "Master of Puppets, released in 1986, cemented Metallica as one of the most powerful and uncompromising forces in heavy music. Blending blistering speed, intricate musicianship, and dark psychological themes, the album pushed thrash metal far beyond aggression alone and into something more ambitious, cinematic, and emotionally intense. Centered around themes of control, addiction, and manipulation, songs like ?Master of Puppets,? ?Battery,? and ?Welcome Home (Sanitarium)? combine crushing riffs with relentless momentum and razor-sharp precision. Even the album?s quieter moments feel tense and unstable, only making the heavier sections hit with greater force. The record also marked the final appearance of bassist Cliff Burton, whose melodic influence and musical depth helped shape the album?s expansive sound. Both technically masterful and emotionally ferocious, Master of Puppets became a defining blueprint for modern metal and remains one of the genre?s most influential albums ever recorded.",
  "the doors": "The Doors, released in 1967, introduced The Doors as one of the most mysterious and provocative bands of the psychedelic era. Blending hypnotic organ melodies, dark poetry, blues-rock energy, and theatrical intensity, the album created a sound that felt both dangerous and seductive. Driven by the magnetic presence of Jim Morrison, songs like ?Break on Through (To the Other Side),? ?Crystal Ship,? and ?Light My Fire? balanced pop accessibility with surreal imagery and emotional volatility. Beneath the psychedelic atmosphere, the band?s tight musicianship ? especially the swirling keyboards of Ray Manzarek ? gave the album its distinctive tension and momentum. The record?s centrepiece, ?The End,? pushed rock music into darker and more experimental territory, turning a live improvisational piece into a haunting psychological epic. With its mix of sensuality, rebellion, and poetic ambition, The Doors became one of the defining debuts of the 1960s and helped redefine the possibilities of rock music.",
  "sgt peppers lonely hearts club band": "Sgt. Pepper's Lonely Hearts Club Band, released in 1967, marked the moment The Beatles fully abandoned the limits of live performance and reinvented themselves as studio artists. Freed from touring and the pressures of Beatlemania, the band used the album?s fictional alter-ego concept as a gateway into psychedelic experimentation, orchestral ambition, and boundless creative freedom. From the dreamlike surrealism of ?Lucy in the Sky With Diamonds? to the communal warmth of ?With a Little Help From My Friends? and the monumental finale ?A Day in the Life,? the album constantly shifts between fantasy, nostalgia, melancholy, and wonder. Songs like ?Being for the Benefit of Mr. Kite!? and ?Fixing a Hole? blend Victorian imagery, avant-garde production, Indian influences, classical instrumentation, and psychedelic rock into something entirely new for popular music. More than just a landmark album, Sgt. Pepper?s Lonely Hearts Club Band redefined what an album could be ? immersive, conceptual, and artistically limitless. Its influence reshaped rock music for the rest of the decade and beyond.",
  "sgt pepper s lonely hearts club band": "Sgt. Pepper's Lonely Hearts Club Band, released in 1967, marked the moment The Beatles fully abandoned the limits of live performance and reinvented themselves as studio artists. Freed from touring and the pressures of Beatlemania, the band used the album?s fictional alter-ego concept as a gateway into psychedelic experimentation, orchestral ambition, and boundless creative freedom. From the dreamlike surrealism of ?Lucy in the Sky With Diamonds? to the communal warmth of ?With a Little Help From My Friends? and the monumental finale ?A Day in the Life,? the album constantly shifts between fantasy, nostalgia, melancholy, and wonder. Songs like ?Being for the Benefit of Mr. Kite!? and ?Fixing a Hole? blend Victorian imagery, avant-garde production, Indian influences, classical instrumentation, and psychedelic rock into something entirely new for popular music. More than just a landmark album, Sgt. Pepper?s Lonely Hearts Club Band redefined what an album could be ? immersive, conceptual, and artistically limitless. Its influence reshaped rock music for the rest of the decade and beyond.",
  "the white album": "The Beatles (The White Album) (1968) captures The Beatles at their most unpredictable, fragmented, and creatively fearless. Written largely during the band?s retreat in India with Maharishi Mahesh Yogi, the album became an explosion of individual ideas, personalities, and musical styles, sprawling across folk, hard rock, psychedelia, blues, avant-garde experimentation, country, and pop. Rather than chasing a single cohesive sound, each member pushed deeper into their own artistic identity. John Lennon balanced tenderness and chaos on tracks like ?Julia? and ?Happiness Is a Warm Gun,? while Paul McCartney moved effortlessly between playful melodies and sharp satire with songs like ?Martha My Dear? and ?Back in the U.S.S.R.? George Harrison delivered some of the album?s emotional high points, including ?While My Guitar Gently Weeps,? featuring a legendary guest solo from Eric Clapton. Restless, messy, adventurous, and endlessly inventive, The White Album feels less like a single statement and more like an entire universe of ideas unfolding at once, a portrait of a band testing the absolute limits of what popular music could contain."
};
function normalizeOverviewTitle(value){return String(value||"").toLowerCase().replace(/&/g,"and").replace(/\([^)]*\)/g," ").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim()}
function overviewKey(a){
  const titleKey=normalizeOverviewTitle(a?.title);
  const artistKey=normalizeOverviewTitle(a?.artist||a?.artist_name);
  if(titleKey&&artistKey)return `${artistKey} ${titleKey}`;
  if(titleKey)return titleKey;
  return normalizeOverviewTitle(`${a?.artist||""} ${a?.title||""}`)||normalizeOverviewTitle(a?.artist)||String(a?.id||"").trim();
}
function overviewKeyCandidates(a){
  const title=String(a?.title||a?.name||a?.album_title||"").trim();
  const artist=String(a?.artist||a?.artist_name||"").trim();
  const id=String(a?.id||"").trim();
  return [...new Set([
    overviewKey(a),
    normalizeOverviewTitle(`${artist} ${title}`),
    normalizeOverviewTitle(`${title} ${artist}`),
    albumRef(id),
    id,
    normalizeOverviewTitle(title)
  ].filter(Boolean))];
}
function overviewRowsMatchAlbum(row,a){
  if(!row||!a)return false;
  const id=String(a?.id||"").trim();
  const rowId=String(row.album_id||row.album_ref||"").trim();
  if(id&&rowId&&(rowId===id||rowId===albumRef(id)))return true;
  const title=normalizeOverviewTitle(a?.title||a?.name||a?.album_title);
  const artist=normalizeOverviewTitle(a?.artist||a?.artist_name);
  const rowTitle=normalizeOverviewTitle(row.title);
  const rowArtist=normalizeOverviewTitle(row.artist);
  return Boolean(title&&rowTitle&&title===rowTitle&&(!artist||artist===rowArtist));
}
function cacheOverviewAliases(album,row){
  if(!album||!row)return row;
  const merged={...row};
  overviewKeyCandidates(album).forEach(key=>{
    if(!key)return;
    const existing=extras.overviews[key];
    if(!existing||overviewRowsMatchAlbum(existing,album))extras.overviews[key]=merged;
  });
  if(merged.album_key)extras.overviews[merged.album_key]=merged;
  return merged;
}
function indexOverviewRows(){
  const rows=[...new Set(Object.values(extras.overviews||{}))];
  rows.forEach(row=>{
    if(!row?.title)return;
    cacheOverviewAliases({id:row.album_id||row.album_ref||"",title:row.title,artist:row.artist||""},row);
  });
  return extras.overviews;
}
function isAdminUnlocked(){return sessionStorage.getItem("musicaAdminUnlocked")==="1"}
function syncAdminUnlockButton(){const btn=$("#adminOverviewUnlock");if(btn){btn.textContent="";btn.title=isAdminUnlocked()?"Admin overview unlocked":"Admin overview";btn.setAttribute("aria-label",btn.title)}}
function adminDebug(label,details){console.debug("[Muze admin]",label,details)}
function localAdminPinSource(){
  const configured=normalizeAdminPinValue(ADMIN_PIN_CONFIG);
  if(configured)return {pin:configured,source:cfg.VITE_ADMIN_PIN?"config.VITE_ADMIN_PIN":cfg.ADMIN_PIN?"config.ADMIN_PIN":cfg.MUSICA_ADMIN_PIN?"config.MUSICA_ADMIN_PIN":cfg.NEXT_PUBLIC_ADMIN_PIN?"config.NEXT_PUBLIC_ADMIN_PIN":window.VITE_ADMIN_PIN?"window.VITE_ADMIN_PIN":window.ADMIN_PIN?"window.ADMIN_PIN":window.MUSICA_ADMIN_PIN?"window.MUSICA_ADMIN_PIN":"window.NEXT_PUBLIC_ADMIN_PIN"};
  for(const key of ADMIN_PIN_STORAGE_KEYS){
    const stored=normalizeAdminPinValue(localStorage.getItem(key));
    if(stored)return {pin:stored,source:`localStorage.${key}`};
  }
  return {pin:"",source:"none"};
}
async function sha256Hex(value){
  const bytes=new TextEncoder().encode(normalizeAdminPinValue(value));
  const hash=await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(hash)).map(byte=>byte.toString(16).padStart(2,"0")).join("");
}
window.debugMuzeAdminPin=function(){
  const expected=localAdminPinSource();
  const details={expectedPinExists:Boolean(expected.pin),expectedPinSource:expected.source,expectedPinLength:expected.pin.length,hashFallbackExists:Boolean(ADMIN_PIN_HASHES.length),isLocalRuntime:isLocalRuntime(),configHasVitePin:Boolean(normalizeAdminPinValue(cfg.VITE_ADMIN_PIN)),configHasAdminPin:Boolean(normalizeAdminPinValue(cfg.ADMIN_PIN)),configHasMusicaPin:Boolean(normalizeAdminPinValue(cfg.MUSICA_ADMIN_PIN)),storageKeys:ADMIN_PIN_STORAGE_KEYS.map(key=>({key,exists:Boolean(normalizeAdminPinValue(localStorage.getItem(key)))}))};
  console.debug("[Muze admin] PIN debug",details);
  return details;
}
window.setMuzeAdminPinForThisBrowser=function(pin){
  const clean=normalizeAdminPinValue(pin);
  if(!clean){localStorage.removeItem("muzeAdminExpectedPin");adminDebug("local pin cleared",{expectedPinExists:false,expectedPinSource:"localStorage.muzeAdminExpectedPin"});return false}
  localStorage.setItem("muzeAdminExpectedPin",clean);
  adminDebug("local pin saved",{expectedPinExists:true,expectedPinSource:"localStorage.muzeAdminExpectedPin",expectedPinLength:clean.length});
  return true;
}
async function verifyAdminPinLocally(pin){
  const entered=normalizeAdminPinValue(pin);
  const expected=localAdminPinSource();
  const enteredHash=entered&&crypto?.subtle?await sha256Hex(entered):"";
  const hashMatched=Boolean(enteredHash)&&ADMIN_PIN_HASHES.includes(enteredHash);
  const debug={enteredPinLength:entered.length,expectedPinExists:Boolean(expected.pin),expectedPinSource:expected.source,hashFallbackExists:Boolean(ADMIN_PIN_HASHES.length),hashMatched,isLocalRuntime:isLocalRuntime()};
  adminDebug("local validation",debug);
  return {ok:(Boolean(expected.pin)&&entered===expected.pin)||hashMatched,debug};
}
function setAdminInlineStatus(message="",tone="error"){
  if($("#authStatus"))setAuthStatus(message,tone);
  let toast=$("#adminInlineStatus");
  if(!message){
    toast?.classList.add("hidden");
    return;
  }
  if(!toast){
    toast=document.createElement("div");
    toast.id="adminInlineStatus";
    toast.className="adminInlineStatus";
    toast.setAttribute("role","status");
    toast.setAttribute("aria-live","polite");
    document.body.appendChild(toast);
  }
  toast.textContent=message;
  toast.dataset.tone=tone;
  toast.classList.remove("hidden");
  clearTimeout(window.__muzeAdminStatusTimer);
  if(tone==="success")window.__muzeAdminStatusTimer=setTimeout(()=>toast.classList.add("hidden"),3600);
}
function finishAdminUnlock(pin,message){
  sessionStorage.setItem("musicaAdminUnlocked","1");
  sessionStorage.setItem("musicaAdminPin",String(pin||"").trim());
  syncAdminUnlockButton();
  setAdminInlineStatus(message||"Admin overview editing is unlocked for this browser tab.","success");
  const album=typeof albumInfoCurrentAlbum==="function"?albumInfoCurrentAlbum():null;
  if(album&&!document.querySelector("#albumInfoPopup.hidden")){
    const info=extras.albumInfo[albumRef(album.id)];
    if(info?.metadata&&!albumInfoHasNamedPerformers(info))loadAlbumInfo(album,true);
    else renderAlbumInfo(album.id);
  }
}
window.unlockOverviewAdmin=async function(){
  const pin=normalizeAdminPinValue(prompt("Enter your Muze admin PIN:")||"");
  if(!pin)return;
  const localExpected=localAdminPinSource();
  adminDebug("unlock start",{enteredPinLength:pin.length,expectedPinExists:Boolean(localExpected.pin),expectedPinSource:localExpected.source,isLocalRuntime:isLocalRuntime(),hadCachedPin:Boolean(sessionStorage.getItem("musicaAdminPin"))});
  try{
    const res=await fetch("/.netlify/functions/admin-overview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"verify",pin})});
    const data=await res.json().catch(()=>({}));
    adminDebug("unlock response",{status:res.status,ok:res.ok,serverDebug:data.debug||null});
    if(!res.ok){
      const local=await verifyAdminPinLocally(pin);
      if(local.ok){
        finishAdminUnlock(pin,"Admin overview editing is unlocked locally.");
        return;
      }
      setAdminInlineStatus(data.error||"Admin PIN was not accepted.","error");return
    }
    finishAdminUnlock(pin);
  }catch(error){
    adminDebug("unlock network error",{message:error.message,isLocalRuntime:isLocalRuntime()});
    const local=await verifyAdminPinLocally(pin);
    if(local.ok){
      finishAdminUnlock(pin,"Admin overview editing is unlocked locally.");
      return;
    }
    setAdminInlineStatus("Admin PIN was not accepted. Locally, set VITE_ADMIN_PIN in config.js; on Netlify, set the same PIN in Environment variables.","error");
  }
}
function protectedOverviewRows(){
  return {
    "life after death":{album_key:"life after death",title:"Life After Death (2014 Remastered Edition)",artist:"The Notorious B.I.G.",admin_score:9.1,admin_ratings_count:5}
  };
}
function primeProtectedOverviews(){extras.overviews={...protectedOverviewRows(),...(extras.overviews||{})};clearArtistDirectoryCache();return indexOverviewRows()}
async function loadCustomOverviews(){
  const protectedLiveScores=protectedOverviewRows();
  extras.overviews={...protectedLiveScores};
  const localOverviews=JSON.parse(localStorage.getItem("musicaCustomOverviews")||"{}");
  if(!db){extras.overviews=isLocalRuntime()?{...protectedLiveScores,...localOverviews}:protectedLiveScores;clearArtistDirectoryCache();return indexOverviewRows()}
  const baseOverviewFields="album_key,title,artist,overview,loved_track_key,loved_track_name,admin_ratings_count,admin_score,hero_focus,moment_focus";
  const structuredOverviewFields=",album_id,intro_summary,sound_summary,impact_summary,legacy_summary,quote_headline,defining_tracks,sources_used,source_summary,fallback_generated,generated_at,generation_model,manual_override";
  let {data,error}=await db.from("album_overviews").select(baseOverviewFields+structuredOverviewFields);
  if(error){
    const fallback=await db.from("album_overviews").select(baseOverviewFields);
    data=fallback.data;
    error=fallback.error;
  }
  if(!error&&data){
    extras.overviews={...protectedLiveScores,...Object.fromEntries(data.map(row=>[row.album_key,row]))};
    try{
      const optional=await db.from("album_overviews").select("album_key,hero_image,moment_image,mood_score");
      if(!optional.error&&optional.data){
        optional.data.forEach(row=>{extras.overviews[row.album_key]={...(extras.overviews[row.album_key]||{}),...row}});
      }
    }catch(optionalError){}
    try{
      const genreOptional=await db.from("album_overviews").select("album_key,manual_genre,overview_focus");
      if(!genreOptional.error&&genreOptional.data){
        genreOptional.data.forEach(row=>{extras.overviews[row.album_key]={...(extras.overviews[row.album_key]||{}),...row}});
      }
    }catch(genreOptionalError){}
    try{
      const reviewOptional=await db.from("album_overviews").select("album_key,review_overview,review_sound,review_impact,review_legacy,review_tagline,review_alternative_taglines,review_defining_moments,review_muze_score,review_minimum_raters,review_closing_verdict,review_mellow_intense_score,review_mellow_intense_explanation,review_generated_at,review_generation_model,review_manual_fields");
      if(!reviewOptional.error&&reviewOptional.data){
        reviewOptional.data.forEach(row=>{extras.overviews[row.album_key]={...(extras.overviews[row.album_key]||{}),...row}});
      }
    }catch(reviewOptionalError){}
    try{
      const popularTrackOptional=await db.from("album_overviews").select("album_key,review_most_popular_track");
      if(!popularTrackOptional.error&&popularTrackOptional.data){
        popularTrackOptional.data.forEach(row=>{extras.overviews[row.album_key]={...(extras.overviews[row.album_key]||{}),...row}});
      }
    }catch(popularTrackOptionalError){}
    try{
      let published=await db.from("published_album_reviews").select("album_id,album_key,review,generation_model,prompt_version,quality_score,approved_at");
      if(published.error)published=await db.from("published_album_reviews").select("album_id,album_key,review,approved_at");
      if(!published.error&&published.data){
        published.data.forEach(item=>{
          const review=item.review||{};
          const reviewFields={
            review_overview:review.overview||"",
            review_sound:review.sound||"",
            review_impact:review.impact||"",
            review_legacy:review.legacy||"",
            review_tagline:review.tagline||"",
            review_alternative_taglines:review.alternativeTaglines||[],
            review_defining_moments:review.definingMoments||[],
            review_muze_score:review.muzeScore,
            review_minimum_raters:review.raterCount,
            review_closing_verdict:review.scoreExplanation||"",
            review_most_popular_track:review.mostPopularTrack||null,
            review_factual_warnings:review.factualWarnings||[],
            review_generation_model:item.generation_model||"",
            review_prompt_version:item.prompt_version||"",
            review_quality_score:item.quality_score,
            review_status:"approved",
            review_generated_at:item.approved_at||"",
            review_manual_fields:albumReviewFieldNames
          };
          const existing=extras.overviews[item.album_key]||{};
          extras.overviews[item.album_key]={...existing,...reviewFields,album_id:item.album_id||existing.album_id};
        });
      }
    }catch(publishedReviewError){}
    extras.overviews=mergeLocalOverviewRows(extras.overviews,localOverviews);
    clearArtistDirectoryCache();return indexOverviewRows();
  }
  console.warn("Could not load album_overviews from Supabase; using protected public score overrides only.",error);
  extras.overviews=isLocalRuntime()?{...protectedLiveScores,...localOverviews}:protectedLiveScores;
  clearArtistDirectoryCache();return indexOverviewRows();
}function albumBaseOverview(a){
  const savedRow=albumOverviewRow(a);
  if(savedRow&&albumNeedsResearch(a,savedRow))return "";
  if(savedRow&&Object.prototype.hasOwnProperty.call(savedRow,"overview")){const savedText=String(savedRow.overview||"").trim();if(savedText)return savedText;}
  const titleKey=normalizeOverviewTitle(a?.title);
  const artistKey=normalizeOverviewTitle(`${a?.artist||""} ${a?.title||""}`);
  let text=customAlbumOverviews[artistKey]||customAlbumOverviews[titleKey]||"";
  if(!text&&titleKey.includes("sgt pepper"))text=customAlbumOverviews["sgt peppers"]||customAlbumOverviews["sgt peppers lonely hearts club band"];
  if(!text&&titleKey.includes("white album"))text=customAlbumOverviews["the white album"]||customAlbumOverviews["the beatles"];
  return text||beautifulAlbumDescription(a);
}
function musicaScoreMeaning(a){const value=Number(score(a)||a.avg_rating||0);if(!value)return "Muze Score: unrated. This album is still waiting for the community to define its place.";let meaning=value>=9?"an essential community favorite":value>=8?"a strongly loved record with broad support":value>=7?"a respected album with clear supporters":value>=6?"a divisive or developing community pick":"a niche pick that may connect with specific listeners";return `Muze Score: ${value.toFixed(1)}/10, meaning ${meaning} based on listener ratings on Muze.`}
function albumCustomOverview(a){const text=albumBaseOverview(a);return text?`${text} ${musicaScoreMeaning(a)}`:""}
function albumOverviewRow(a){
  for(const key of overviewKeyCandidates(a)){
    const row=extras.overviews[key];
    if(row&&overviewRowsMatchAlbum(row,a))return cacheOverviewAliases(a,row);
  }
  return {};
}
function albumOverviewRowReadOnly(a){
  for(const key of overviewKeyCandidates(a)){
    const row=extras.overviews[key];
    if(row&&overviewRowsMatchAlbum(row,a))return row;
  }
  return {};
}
function albumOverviewNumber(a,field,fallback=0){
  const value=albumOverviewRowReadOnly(a)?.[field];
  return value!==undefined&&value!==null&&value!==""&&Number.isFinite(Number(value))?Number(value):fallback;
}
function albumOverviewFieldNumber(a,field,fallback=0){
  for(const key of overviewKeyCandidates(a)){
    const row=extras.overviews[key];
    if(!row||!overviewRowsMatchAlbum(row,a))continue;
    const value=row[field];
    if(value!==undefined&&value!==null&&value!==""&&Number.isFinite(Number(value)))return Number(value);
  }
  const row=Object.values(extras.overviews||{}).find(item=>overviewRowsMatchAlbum(item,a)&&item?.[field]!==undefined&&item?.[field]!==null&&item?.[field]!==""&&Number.isFinite(Number(item[field])));
  return row?Number(row[field]):fallback;
}
async function fetchAlbumMoodScore(album){
  if(!db||!album)return null;
  const lookupFilters=[
    ["album_key",overviewKey(album)],
    ["album_id",String(album.id||"")],
    ["title",String(album.title||"")]
  ].filter(([,value])=>String(value||"").trim());
  for(const [field,value] of lookupFilters){
    let query=db.from("album_overviews").select("album_key,title,artist,album_id,mood_score").eq(field,value).not("mood_score","is",null);
    if(field==="title"&&String(album.artist||"").trim())query=query.eq("artist",String(album.artist).trim());
    const result=await query.limit(1);
    const row=result.data?.[0];
    if(row&&overviewRowsMatchAlbum(row,album)&&Number.isFinite(Number(row.mood_score))){
      cacheOverviewAliases(album,{...albumOverviewRowReadOnly(album),...row});
      return Number(row.mood_score);
    }
  }
  return null;
}
function hasStructuredAlbumOverview(row){return Boolean(row&&(row.intro_summary||row.sound_summary||row.impact_summary||row.legacy_summary||row.quote_headline))}
function hasManualOverviewOverride(row){
  return Boolean(row?.manual_override&&[
    row.overview,
    row.intro_summary,
    row.sound_summary,
    row.impact_summary,
    row.legacy_summary,
    row.quote_headline,
    row.admin_score,
    row.admin_ratings_count,
    row.manual_genre,
    row.mood_score
  ].some(value=>value!==undefined&&value!==null&&String(value).trim()!==""));
}
function clientCleanAlbumTitle(title){return String(title||"").replace(/\s*[-\u2013\u2014]\s*(deluxe|expanded|anniversary|collector\x27?s?|special|super deluxe|legacy|remaster(?:ed)?|bonus).*$/i,"").replace(/\s*\((?=[^)]*(deluxe|expanded|anniversary|collector\x27?s?|special|super deluxe|legacy|remaster(?:ed)?|edition|version|bonus|mono|stereo|reissue))[^)]*\)/gi,"").replace(/\s*\[(?=[^\]]*(deluxe|expanded|anniversary|collector\x27?s?|special|super deluxe|legacy|remaster(?:ed)?|edition|version|bonus|mono|stereo|reissue))[^\]]*\]/gi,"").replace(/\s+/g," ").trim()||String(title||"").trim()}
function genericOverviewText(text){return /building a world with its own mood|its guitars, melodies|made to be argued over|from the \d{4}s|old scenes and new listening habits|as ratings come in|individual tracks start to connect|ratings come in, its place|atmosphere, gravity, and afterlife|period when albums were stretching|researched source data|source data|source notes|sources connect|sourced album data|public source|research notes|metadata points/i.test(String(text||""))}
function overviewSectionTokens(value){const stop=new Set(["the","and","that","this","with","for","from","into","its","album","record","music","sound"]);return String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").split(" ").filter(token=>token.length>2&&!stop.has(token))}
function overviewSectionSimilarity(a,b){const left=String(a||"").replace(/\s+/g," ").trim().toLowerCase();const right=String(b||"").replace(/\s+/g," ").trim().toLowerCase();if(!left||!right)return 0;if(left===right)return 1;if((left.length>45||right.length>45)&&(left.includes(right)||right.includes(left)))return .95;const lt=new Set(overviewSectionTokens(left));const rt=new Set(overviewSectionTokens(right));if(!lt.size||!rt.size)return 0;const shared=[...lt].filter(token=>rt.has(token)).length;return shared/(new Set([...lt,...rt]).size||1)}
function albumHasDuplicateOverviewSections(row){const fields=["sound_summary","impact_summary","legacy_summary"];for(let i=0;i<fields.length;i++){for(let j=i+1;j<fields.length;j++){if(overviewSectionSimilarity(row?.[fields[i]],row?.[fields[j]])>=.72)return true}}return false}
function overviewGenerationError(row){return Boolean(row&&row.__generationError&&!hasManualOverviewOverride(row))}
function overviewIsGenerating(row){return Boolean(row&&row.__generating&&!hasManualOverviewOverride(row)&&!overviewGenerationError(row))}
function albumNeedsResearch(a,row=albumOverviewRow(a)){
  if(!row||!Object.keys(row).length)return true;
  if(overviewGenerationError(row))return false;
  if(overviewIsGenerating(row))return true;
  if(albumHasDuplicateOverviewSections(row))return true;
  if(hasManualOverviewOverride(row))return false;
  if(row.fallback_generated===true)return true;
  if(hasStructuredAlbumOverview(row)&&String(row.source_summary||"").trim()&&row.fallback_generated!==true)return false;
  const text=[row.intro_summary,row.sound_summary,row.impact_summary,row.legacy_summary,row.quote_headline,row.overview].filter(Boolean).join(" ");
  if(genericOverviewText(text))return true;
  return hasStructuredAlbumOverview(row)&&!String(row.source_summary||"").trim();
}
function researchPlaceholderOverview(a,row={}){
  const title=a?.title||"This album";
  const artist=a?.artist||"the artist";
  if(row.__generationError){
    return {intro_summary:`Muze could not finish the overview for ${title}. Check the console or Netlify function logs for the API error.`,sound_summary:"The custom overview did not save, so Muze is holding back generic filler here.",impact_summary:"Regenerate the AI overview after fixing the logged error.",legacy_summary:"This section will update once a finished Muze overview is saved.",quote_headline:"Waiting for the full Muze story."};
  }
  return {intro_summary:`${title} by ${artist}.`,sound_summary:"Shaping the sound section around the album itself.",impact_summary:"Finding the album-specific angle before showing the final copy.",legacy_summary:"This overview will refresh once the Muze summary is saved.",quote_headline:"Writing the record into focus."};
}
function normalizeOverviewList(value){
  if(Array.isArray(value))return value.map(item=>typeof item==="string"?item:(item?.name||item?.title||item?.trackTitle||item?.url||"")).map(item=>String(item||"").trim()).filter(Boolean);
  if(typeof value==="string"){
    const trimmed=value.trim();
    if(!trimmed)return [];
    try{return normalizeOverviewList(JSON.parse(trimmed))}catch(error){}
    return trimmed.split(/\n|,/).map(item=>item.trim()).filter(Boolean);
  }
  return [];
}
const albumReviewFieldNames=["overview","sound","impact","legacy","tagline","alternativeTaglines","definingMoments","mostPopularTrack","muzeScore","minimumRaters","closingVerdict","mellowIntenseScore","mellowIntenseExplanation","factualWarnings"];
function overviewNumberOrNull(value){
  return value!==undefined&&value!==null&&value!==""&&Number.isFinite(Number(value))?Number(value):null;
}
function hasManualAlbumReview(row={}){
  return row.review_status==="approved"||normalizeOverviewList(row.review_manual_fields).length>0;
}
function albumReviewData(row={},album=null){
  if(!hasManualAlbumReview(row)){
    const manualMood=album?albumOverviewFieldNumber(album,"mood_score",null):overviewNumberOrNull(row.mood_score);
    return {overview:"",sound:"",impact:"",legacy:"",tagline:"",alternativeTaglines:[],definingMoments:[],muzeScore:null,minimumRaters:null,closingVerdict:"",mellowIntenseScore:manualMood,mellowIntenseExplanation:"",generationModel:"",generatedAt:"",manualFields:[]};
  }
  const manualMood=album?albumOverviewFieldNumber(album,"mood_score",null):overviewNumberOrNull(row.mood_score);
  const reviewMood=overviewNumberOrNull(row.review_mellow_intense_score);
  return {
    overview:String(row.review_overview||"").trim(),
    sound:String(row.review_sound||"").trim(),
    impact:String(row.review_impact||"").trim(),
    legacy:String(row.review_legacy||"").trim(),
    tagline:String(row.review_tagline||"").trim(),
    alternativeTaglines:normalizeOverviewList(row.review_alternative_taglines).slice(0,6),
    definingMoments:normalizeOverviewList(row.review_defining_moments).slice(0,5),
    muzeScore:row.review_muze_score!==undefined&&row.review_muze_score!==null&&row.review_muze_score!==""?Number(row.review_muze_score):null,
    minimumRaters:row.review_minimum_raters!==undefined&&row.review_minimum_raters!==null&&row.review_minimum_raters!==""?Number(row.review_minimum_raters):null,
    closingVerdict:String(row.review_closing_verdict||"").trim(),
    mellowIntenseScore:manualMood!==null?manualMood:reviewMood,
    mellowIntenseExplanation:String(row.review_mellow_intense_explanation||"").trim(),
    generationModel:String(row.review_generation_model||"").trim(),
    generatedAt:String(row.review_generated_at||"").trim(),
    promptVersion:String(row.review_prompt_version||"").trim(),
    qualityScore:overviewNumberOrNull(row.review_quality_score),
    status:String(row.review_status||"").trim(),
    mostPopularTrack:row.review_most_popular_track||null,
    factualWarnings:normalizeOverviewList(row.review_factual_warnings),
    manualFields:normalizeOverviewList(row.review_manual_fields)
  };
}
function hasAlbumReview(row={}){
  const review=albumReviewData(row);
  return Boolean(review.overview||review.sound||review.impact||review.legacy||review.tagline||review.alternativeTaglines.length||review.definingMoments.length||review.closingVerdict);
}
function albumReviewPayloadFromEditor(){
  const value=id=>String($(id)?.value||"").trim();
  const payload={
    review_overview:value("#reviewOverviewEditor"),
    review_sound:value("#reviewSoundEditor"),
    review_impact:value("#reviewImpactEditor"),
    review_legacy:value("#reviewLegacyEditor"),
    review_tagline:value("#reviewTaglineEditor"),
    review_alternative_taglines:value("#reviewAlternativeTaglinesEditor").split(/\n|,/).map(item=>item.trim()).filter(Boolean),
    review_defining_moments:value("#reviewDefiningMomentsEditor").split(/\n|,/).map(item=>item.trim()).filter(Boolean),
    review_muze_score:value("#reviewMuzeScoreEditor"),
    review_minimum_raters:value("#reviewMinimumRatersEditor"),
    review_closing_verdict:value("#reviewClosingVerdictEditor"),
    review_mellow_intense_score:value("#reviewMellowIntenseScoreEditor"),
    review_mellow_intense_explanation:value("#reviewMellowIntenseExplanationEditor"),
    review_manual_fields:albumReviewFieldNames
  };
  if($("#reviewMostPopularTrackEditor")){
    const title=value("#reviewMostPopularTrackEditor"),explanation=value("#reviewMostPopularExplanationEditor");
    payload.review_most_popular_track=title?{title,explanation}:null;
  }
  if($("#reviewFactualWarningsEditor"))payload.review_factual_warnings=value("#reviewFactualWarningsEditor").split(/\n/).map(item=>item.trim()).filter(Boolean);
  return payload;
}
function albumReviewHtml(row={},album=null){
  if(!hasAlbumReview(row))return "";
  const review=albumReviewData(row,album);
  const section=(title,body,extraClass="")=>body?`<article class="muzeReviewSection ${extraClass}"><span>${escapeHtml(title)}</span><p>${formatParagraphText(body)}</p></article>`:"";
  const listSection=(title,items,extraClass="")=>items?.length?`<article class="muzeReviewSection ${extraClass}"><span>${escapeHtml(title)}</span><div class="muzeReviewPills">${items.map(item=>`<b>${escapeHtml(item)}</b>`).join("")}</div></article>`:"";
  const scoreHtml=review.muzeScore!==null?`<article class="muzeReviewMetric"><span>Muze Score</span><strong>${escapeHtml(review.muzeScore.toFixed(1))}</strong></article>`:"";
  const ratersHtml=review.minimumRaters!==null?`<article class="muzeReviewMetric"><span>Minimum Raters</span><strong>${escapeHtml(String(Math.round(review.minimumRaters)))}</strong></article>`:"";
  const intensityHtml=review.mellowIntenseScore!==null?`<article class="muzeReviewIntensity"><div><span>Mellow ↔ Intense</span><strong>${escapeHtml(String(Math.round(review.mellowIntenseScore)))}</strong></div><i><b style="--w:${Math.max(0,Math.min(100,review.mellowIntenseScore))}%"></b></i>${review.mellowIntenseExplanation?`<p>${escapeHtml(review.mellowIntenseExplanation)}</p>`:""}</article>`:"";
  const popular=review.mostPopularTrack?.title?section("Most Popular Track",`${review.mostPopularTrack.title}${review.mostPopularTrack.explanation?` - ${review.mostPopularTrack.explanation}`:""}`):"";
  return `<section class="muzeAlbumReview"><div class="muzeReviewHead"><span>${review.status==="approved"?"Muze Editorial Review":"Manual Muze Review"}</span>${review.tagline?`<h3>${escapeHtml(review.tagline)}</h3>`:""}</div>${section("Overview",review.overview,"lead")}${section("The Sound",review.sound)}${section("The Impact",review.impact)}${section("The Legacy",review.legacy)}${section("Tagline",review.tagline)}${listSection("Alternative Taglines",review.alternativeTaglines)}${listSection("Defining Moments",review.definingMoments)}${popular}<div class="muzeReviewMetrics">${scoreHtml}${ratersHtml}</div>${section("Closing Verdict",review.closingVerdict,"verdict")}${intensityHtml}</section>`;
}
function wikipediaSourceUrl(sources){
  const list=Array.isArray(sources)?sources:normalizeOverviewList(sources);
  const found=list.find(source=>typeof source==="string"&&/wikipedia\.org/i.test(source));
  return found||"";
}
function overviewFieldOrPlaceholder(value,fallback){return genericOverviewText(value)?fallback:String(value||fallback||"")}
function albumSimpleTitleByArtist(a){
  const title=String(a?.title||"This album").trim();
  const artist=String(a?.artist||"the artist").trim();
  return `${title} by ${artist}.`;
}
function albumStructuredOverview(a){
  const row=albumOverviewRow(a);
  const manualOverride=hasManualOverviewOverride(row);
  const needsResearch=manualOverride?false:albumNeedsResearch(a,row);
  const isGenerating=manualOverride?false:overviewIsGenerating(row);
  if(needsResearch||isGenerating||overviewGenerationError(row)){
    const placeholder=researchPlaceholderOverview(a,row);
    return {
      row,
      isGenerating:Boolean(isGenerating||(needsResearch&&!overviewGenerationError(row))),
      intro_summary:placeholder.intro_summary,
      sound_summary:placeholder.sound_summary,
      impact_summary:placeholder.impact_summary,
      legacy_summary:placeholder.legacy_summary,
      quote_headline:placeholder.quote_headline,
      defining_tracks:normalizeOverviewList(row.defining_tracks),
      sources_used:Array.isArray(row.sources_used)?row.sources_used:normalizeOverviewList(row.sources_used),
      generation_model:row.generation_model||""
    };
  }
  const base=albumBaseOverview(a);
  const sentences=overviewSentences(base||"");
  const simpleIntro=albumSimpleTitleByArtist(a);
  const shouldUseSimpleIntro=row.fallback_generated===true||(!String(row.source_summary||"").trim()&&String(row.generation_model||"").trim());
  const intro=shouldUseSimpleIntro?simpleIntro:(row.intro_summary||sentences[0]||simpleIntro);
  const placeholder=researchPlaceholderOverview(a,row);
  return {
    row,
    isGenerating:Boolean(row.__generating),
    intro_summary:shouldUseSimpleIntro?simpleIntro:overviewFieldOrPlaceholder(row.intro_summary||intro,placeholder.intro_summary),
    sound_summary:overviewFieldOrPlaceholder(row.sound_summary||sentences[1]||intro,placeholder.sound_summary),
    impact_summary:overviewFieldOrPlaceholder(row.impact_summary||sentences[2]||sentences[0]||intro,placeholder.impact_summary),
    legacy_summary:overviewFieldOrPlaceholder(row.legacy_summary||sentences.slice(3,5).join(" ")||sentences[sentences.length-1]||intro,placeholder.legacy_summary),
    quote_headline:overviewFieldOrPlaceholder(row.quote_headline||albumEditorialThesis(a),placeholder.quote_headline),
    defining_tracks:normalizeOverviewList(row.defining_tracks),
    sources_used:Array.isArray(row.sources_used)?row.sources_used:normalizeOverviewList(row.sources_used),
    generation_model:row.generation_model||""
  };
}function refreshAlbumOverviewPopup(album){
  const popup=$("#albumOverviewPopup");
  if(!popup||popup.classList.contains("hidden")||!album)return;
  const section=$("#albumOverviewSection");
  if(section?.classList.contains("editing"))return;
  if(albumRef(album.id)!==albumRef(extras.currentAlbumId))return;
  openAlbumOverviewPopup();
}
function mergeGeneratedOverviewRow(existing={},generated={}){
  if(!hasManualOverviewOverride(existing))return {...existing,...generated};
  const merged={...existing,...generated,manual_override:true};
  ["overview","intro_summary","sound_summary","impact_summary","legacy_summary","quote_headline","admin_score","admin_ratings_count","manual_genre","mood_score"].forEach(field=>{
    if(existing[field]!==undefined&&existing[field]!==null&&String(existing[field]).trim()!=="")merged[field]=existing[field];
  });
  if(normalizeOverviewList(existing.defining_tracks).length)merged.defining_tracks=existing.defining_tracks;
  if(existing.loved_track_key)merged.loved_track_key=existing.loved_track_key;
  if(existing.loved_track_name)merged.loved_track_name=existing.loved_track_name;
  return merged;
}
async function ensureAiAlbumOverview(album,tracks=[],force=false){
  if(!album)return null;
  const key=overviewKey(album);
  const row=albumOverviewRow(album);
  if(!force&&hasManualOverviewOverride(row))return row;
  const needsResearch=albumNeedsResearch(album,row);
  console.info("[Muze overview] client check",{title:album.title,artist:album.artist,cleanTitle:clientCleanAlbumTitle(album.title),album_key:key,force,needsResearch,hasStructured:hasStructuredAlbumOverview(row),fallback_generated:row.fallback_generated,manual_override:row.manual_override,has_source_summary:Boolean(row.source_summary),intro_sample:String(row.intro_summary||row.overview||"").slice(0,220)});
  if(overviewIsGenerating(row)||extras.overviewRequests[key])return row;
  if(!force&&!needsResearch)return row;
  if(location.protocol==="file:"){
    console.error("[Muze overview] Cannot generate AI overview from file://. Run the app through Netlify Dev or themuze.app so /.netlify/functions/album-overview-ai is available.");
    extras.overviews[key]=hasManualOverviewOverride(row)?{...row,__generating:false,__generationError:""}:{...row,__generating:false,__generationError:"Netlify function unavailable from file://"};
    refreshAlbumOverviewPopup(album);
    return extras.overviews[key];
  }
  extras.overviewRequests[key]=true;
  extras.overviews[key]={...row,__generating:true};
  refreshAlbumOverviewPopup(album);
  try{
    const payload={
      album_key:key,
      album:{
        id:String(album.id||""),
        title:album.title||"",
        artist:album.artist||"",
        year:album.year||"",
        genre:albumGenreLabel(album),
        spotify_url:album.spotify_url||""
      },
      tracks:(tracks||[]).map(track=>typeof track==="string"?{name:track}:{name:track.name||"",track_number:track.track_number||null}),
      force
    };
    payload.album.tracks=payload.tracks;
    console.info("[Muze overview] requesting Muze editorial",payload);
    const res=await fetchWithTimeout("/.netlify/functions/album-overview-ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)},65000);
    const data=await res.json().catch(()=>({}));
    console.info("[Muze overview] function response",{status:res.status,ok:res.ok,data});
    if(!res.ok)throw new Error(data.error||"Album overview generation failed.");
    if(data.row){
      extras.overviews[key]={...mergeGeneratedOverviewRow(extras.overviews[key]||row,data.row),__generating:false,__researchAttempted:true,__generationError:""};
      refreshAlbumOverviewPopup(album);
      return data.row;
    }
  }catch(error){
    console.error("[Muze overview] AI generation failed",error);
    const current=extras.overviews[key]||{};
    extras.overviews[key]=hasManualOverviewOverride(current)?{...current,__generating:false,__generationError:""}:{...current,__generating:false,__generationError:error.message||String(error)};
  }finally{
    delete extras.overviewRequests[key];
    refreshAlbumOverviewPopup(album);
  }
  return extras.overviews[key]||row;
}
function albumEditorialThesis(a){
  const text=normalizeOverviewTitle(`${a?.title||""} ${a?.artist||""} ${albumGenreLabel(a||{})}`);
  const lines=[
    [/thriller|michael jackson/,"Thriller transformed pop music into global mythology."],
    [/nevermind|nirvana/,"The sound of alternative music breaking into the mainstream."],
    [/abbey road|the beatles/,"A final act of warmth, melody, and quiet perfection."],
    [/lateralus|tool/,"A meditation on chaos, growth, and transcendence."],
    [/ready to die|notorious big|biggie/,"A brutally human portrait of ambition, fear, and survival."],
    [/pet sounds|beach boys/,"Pop innocence dissolving into orchestral longing."],
    [/illmatic|nas/,"Street cinema sharpened into one of hip-hop's purest visions."],
    [/ok computer|radiohead/,"A beautiful warning signal from the edge of modern life."],
    [/revolver|the beatles/,"The studio becoming a doorway into the future of rock."],
    [/rubber soul|the beatles/,"The moment pop songwriting started looking inward."],
    [/sgt peppers|pepper lonely hearts|beatles/,"A technicolor reinvention of what an album could be."],
    [/the beatles|white album/,"A restless universe of ideas pulling a legendary band apart."],
    [/dark side of the moon|pink floyd/,"Human pressure, time, and fear suspended in cosmic motion."],
    [/wish you were here|pink floyd/,"Absence turned into one of rock's most luminous elegies."],
    [/master of puppets|metallica/,"Metal made architectural, furious, and emotionally immense."],
    [/purple rain|prince/,"Desire, drama, and devotion burning at arena scale."],
    [/rumours|fleetwood mac/,"Heartbreak turned into immaculate pop architecture."],
    [/to pimp a butterfly|kendrick/,"A fearless reckoning with history, survival, and selfhood."],
    [/blonde|frank ocean/,"Memory and heartbreak refracted into soft, unstable light."],
    [/the chronic|dr dre/,"West Coast rap reshaped into cinematic funk and low-end gravity."],
    [/blood on the tracks|bob dylan/,"Heartbreak transformed into wounded American folklore."],
    [/highway 61 revisited|bob dylan/,"Folk tradition electrified into surreal rock prophecy."],
    [/songs in the key of life|stevie wonder/,"A panoramic celebration of love, spirit, and human possibility."],
    [/experience hendrix|jimi hendrix/,"Electric guitar mythology distilled into fire and freedom."],
    [/pet sounds|brian wilson/,"Teenage longing expanded into a cathedral of sound."],
    [/the score|fugees/,"Hip-hop, soul, and exile braided into communal memory."],
    [/london calling|clash/,"Punk opening its borders to the whole restless world."],
    [/ziggy stardust|david bowie/,"Stardom, alienation, and theater fused into rock mythology."],
    [/back in black|ac dc/,"Grief and power converted into hard rock permanence."],
    [/kind of blue|miles davis/,"Cool restraint becoming one of jazz's deepest emotional languages."]
  ];
  const found=lines.find(([pattern])=>pattern.test(text));
  if(found)return found[1];
  if(text.includes("hip hop")||text.includes("rap"))return "A voice-led world of rhythm, pressure, and lived truth.";
  if(text.includes("metal"))return "Heavy music shaped into ritual, force, and catharsis.";
  if(text.includes("punk"))return "Restless energy turned into identity, release, and resistance.";
  if(text.includes("alternative"))return "A private emotional weather system breaking into public sound.";
  if(text.includes("rock"))return "A record where volume, memory, and legacy move together.";
  if(text.includes("pop"))return "Melody and feeling shaped into shared cultural memory.";
  if(text.includes("soul")||text.includes("r&b")||text.includes("funk"))return "Human feeling carried through groove, warmth, and devotion.";
  if(text.includes("folk"))return "Storytelling that turns private emotion into lasting myth.";
  if(text.includes("jazz"))return "Improvisation, restraint, and atmosphere moving as one body.";
  if(text.includes("electronic"))return "Texture and pulse building a world beyond ordinary song form.";
  return "A defining mood piece with its own atmosphere, gravity, and afterlife.";
}
function overviewSentences(text){return String(text||"").replace(/\s+/g," ").split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean)}
function overviewFilterPill(label,type){
  const clean=String(label||"").trim();
  if(!clean)return "";
  return `<button type="button" onclick="openAlbumOverviewFilter('${type}','${escapeJsString(clean)}')">${escapeHtml(clean)}</button>`;
}
function titleVisualWeight(text){
  return String(text||"").split("").reduce((sum,char)=>{
    if(/\s/.test(char))return sum+.32;
    if(/[MW@#%&]/.test(char))return sum+.95;
    if(/[A-Z0-9]/.test(char))return sum+.72;
    if(/[il.,'!:;]/.test(char))return sum+.26;
    if(/[mw]/.test(char))return sum+.78;
    return sum+.52;
  },0);
}
function albumOverviewHtml(a,{albumId,coverUrl,albumScore,total,customOverview,canEditOverview}){
  const structured=albumStructuredOverview(a);
  if(!customOverview&&!canEditOverview)customOverview=cleanAlbumSummary(a)||`${a.title} by ${a.artist||"the artist"}.`;
  const fallbackSentences=overviewSentences(customOverview||"");
  const placeholder=researchPlaceholderOverview(a,structured.row||{});
  const intro=overviewFieldOrPlaceholder(structured.intro_summary||fallbackSentences[0],placeholder.intro_summary);
  const sound=overviewFieldOrPlaceholder(structured.sound_summary||fallbackSentences[1]||intro,placeholder.sound_summary);
  const impact=overviewFieldOrPlaceholder(structured.impact_summary||fallbackSentences[2]||fallbackSentences[0]||intro,placeholder.impact_summary);
  const legacy=overviewFieldOrPlaceholder(structured.legacy_summary||fallbackSentences.slice(3,5).join(" ")||fallbackSentences[fallbackSentences.length-1]||intro,placeholder.legacy_summary);
  const quote=overviewFieldOrPlaceholder(structured.quote_headline||albumEditorialThesis(a),placeholder.quote_headline);
  const heading=escapeHtml(a.title||"This album");
  const headingText=String(a.title||"");
  const headingWords=headingText.split(/\s+/).filter(Boolean).length;
  const headingClass=headingText.length>34||headingWords>=7?' class="overviewTitleLong"':"";
  const headingVisualWeight=titleVisualWeight(headingText);
  const hasParenthetical=/[()]/.test(headingText);
  const mobileArtClass=hasParenthetical?" overviewMobileTitleArtParenthetical":headingText.length>20||headingWords>=4||headingVisualWeight>7.2?" overviewMobileTitleArtLong":headingWords>=2?" overviewMobileTitleArtMediumMulti":headingText.length>9||headingVisualWeight>4.05?" overviewMobileTitleArtMedium":"";
  const metadata=[a.artist,String(a.year||"").trim()].filter(Boolean).map(value=>escapeHtml(value)).join(" &bull; ");
  const introClass=String(intro||"").length>240?' overviewIntroLong':"";
  const overviewTagLabels=[];
  const addOverviewTag=value=>{const clean=String(value||"").trim();if(clean&&!overviewTagLabels.some(label=>label.toLowerCase()===clean.toLowerCase()))overviewTagLabels.push(clean)};
  addOverviewTag(albumGenreLabel(a));
  addOverviewTag(a.artist);
  addOverviewTag(a.year);
  const overviewTags=overviewTagLabels.slice(0,4).map(tag=>overviewFilterPill(tag,String(tag)===String(a.year)?"year":tag===a.artist?"artist":"genre")).join("");
  const sourceUrl=wikipediaSourceUrl(structured.sources_used)||String(a.wikipedia_url||a.source_url||"").trim();
  const displaySource=structured.isGenerating?"generating":(structured.row?.fallback_generated?"fallback":(structured.row?.source_summary?"supabase researched cache":(overviewGenerationError(structured.row)?"generation error":"local placeholder")));
  console.info("[Muze overview] displayed content source",{title:a.title,artist:a.artist,source:displaySource,fallback_generated:structured.row?.fallback_generated,has_source_summary:Boolean(structured.row?.source_summary),generation_model:structured.row?.generation_model||"",contains_generic:[intro,sound,impact,legacy,quote].some(genericOverviewText)});
  const sourceLink=overviewGenerationError(structured.row)?`<span class="overviewSourceLink">Overview generation failed</span>`:(structured.isGenerating?`<span class="overviewSourceLink">Generating Muze overview...</span>`:"");
  const overviewFocus=escapeHtml(structured.row?.overview_focus||"50% 28%");
  const edit=canEditOverview?`<div class="overviewAdminControls"><button class="overviewEditBtn" onclick="editAlbumOverview('${albumId}')">Edit overview</button><button onclick="startOverviewImageDrag('${albumId}')">Move overview background</button><button onclick="deleteAlbumOverview('${albumId}')">Clear custom overview</button><button onclick="clearAlbumReactionsAdmin('${albumId}')">Clear reactions</button><button onclick="clearAlbumTrackActivityAdmin('${albumId}')">Clear song ratings/comments</button><button onclick="setAlbumScoreAdmin('${albumId}')">Set Muze score</button><button onclick="setAlbumRatingsCountAdmin('${albumId}')">Set ratings count</button><button onclick="setAlbumMoodScoreAdmin('${albumId}')">Set mood bar</button><button onclick="setAlbumGenreAdmin('${albumId}')">Set genre</button><button onclick="clearAlbumRatingsAdmin('${albumId}')">Clear album ratings</button><button class="danger" onclick="deleteAlbumAdmin('${albumId}')">Delete album</button></div>`:"";
  const testRegenerate="";
  const libraryUsers=albumLibrarySaveUsers(a);
  const libraryUserRows=libraryUsers.length?libraryUsers.map(user=>`<div class="overviewLibraryUser"><span class="overviewLibraryUserAvatar">${libraryAvatarMarkup(user)}</span><span class="overviewLibraryUserText"><b>${escapeHtml(user.username)}</b><small>${escapeHtml(user.title||"Muze library")}</small></span></div>`).join(""):`<div class="overviewLibraryUser empty">No public library saves yet.</div>`;
  const reviewHtml=albumReviewHtml(structured.row||{},a);
  return `<section id="albumOverviewSection" class="linerOverview albumOverviewSleeve" data-album-id="${albumId}" style="--overview-cover:url('${coverUrl}');--overview-position:${overviewFocus}"><div class="overviewFeatureTop"><div class="overviewFeatureCopy"><p class="overviewMeta">${metadata}</p><div class="overviewTitleRow"><h3${headingClass}>${heading}</h3><span class="overviewMobileTitleArt${mobileArtClass}" aria-hidden="true"><img src="${coverUrl}" alt=""></span></div><div class="overviewFeatureTags">${overviewTags}</div><p class="overviewIntro${introClass}">${escapeHtml(intro)}</p><button type="button" class="overviewReadMore" aria-expanded="false" onclick="toggleOverviewIntro(event,this)">Read More &#8594;</button>${sourceLink}</div><div class="overviewFeatureArt"><img src="${coverUrl}" alt=""><blockquote aria-expanded="false" onclick="toggleOverviewQuote(event,this)" onkeydown="if(event.key==='Enter'||event.key===' ')toggleOverviewQuote(event,this)"><span class="overviewQuoteText">${escapeHtml(quote)}</span></blockquote><div class="overviewQuotePopover hidden">${escapeHtml(quote)}</div></div></div>${reviewHtml}<div class="overviewBodyGrid"><div class="overviewCopy"><div class="overviewPoints"><div class="overviewPoint" aria-expanded="false" onclick="toggleOverviewPoint(event,this)" onkeydown="if(event.key==='Enter'||event.key===' ')toggleOverviewPoint(event,this)"><span class="overviewIcon soundIcon" aria-hidden="true"></span><div><strong>The sound</strong><p>${escapeHtml(sound)}</p></div></div><div class="overviewPoint" aria-expanded="false" onclick="toggleOverviewPoint(event,this)" onkeydown="if(event.key==='Enter'||event.key===' ')toggleOverviewPoint(event,this)"><span class="overviewIcon impactIcon" aria-hidden="true"></span><div><strong>The impact</strong><p>${escapeHtml(impact)}</p></div></div><div class="overviewPoint" aria-expanded="false" onclick="toggleOverviewPoint(event,this)" onkeydown="if(event.key==='Enter'||event.key===' ')toggleOverviewPoint(event,this)"><span class="overviewIcon legacyIcon" aria-hidden="true"></span><div><strong>The legacy</strong><p>${escapeHtml(legacy)}</p></div></div></div><div class="overviewScoreStrip"><span>Muze Community Score</span><strong>${escapeHtml(albumScore)}</strong><em>/10</em><small>Based on ${escapeHtml(total)} ratings</small></div>${edit}${testRegenerate}</div><div class="overviewMood"><div><p>Defining tracks</p><div id="overviewMomentChips" class="overviewMomentChips"><span>Loading tracks...</span></div></div></div></div></section>`;
}function renderAlbumOverviewMoments(albumId,tracks){
  const host=$("#overviewMomentChips");
  if(!host)return;
  const album=state.albums.find(x=>albumRef(x.id)===albumRef(albumId));
  const savedNames=album?albumStructuredOverview(album).defining_tracks:[];
  const names=savedNames.length?savedNames:(tracks||[]).slice(0,5).map(track=>track.name).filter(Boolean);
  host.innerHTML=names.length?names.map(name=>`<button type="button" class="overviewMomentChip" data-track-name="${escapeHtml(name)}" onclick="playOverviewMomentPreview('${escapeJsString(albumId)}','${escapeJsString(name)}',this)">${escapeHtml(name)}</button>`).join(""):`<span>No defining tracks yet</span>`;
}
function localAlbums(){return JSON.parse(localStorage.getItem("musicaLocalAlbums")||"[]")}
function saveLocalAlbums(a){localStorage.setItem("musicaLocalAlbums",JSON.stringify(a))}
function localRatings(){return JSON.parse(localStorage.getItem("musicaLocalRatings")||"{}")}
function saveLocalRatings(r){localStorage.setItem("musicaLocalRatings",JSON.stringify(r))}
function coverKey(a){return `${(a.artist||"").toLowerCase().trim()}::${(a.title||"").toLowerCase().trim()}`}
function coverCache(){return JSON.parse(localStorage.getItem("musicaCoverCache")||"{}")}
function saveCoverCache(cache){localStorage.setItem("musicaCoverCache",JSON.stringify(cache))}
const BACK_COVER_CACHE_KEY="musicaBackCoverCacheV3";
function backCoverDebug(label,details){console.debug("[Muze back cover]",label,details)}
function backCoverCache(){
  try{
    const cache=JSON.parse(localStorage.getItem(BACK_COVER_CACHE_KEY)||"{}");
    if(Object.keys(cache).length)return cache;
    const oldCache=JSON.parse(localStorage.getItem("musicaBackCoverCache")||"{}");
    const migrated={};
    Object.entries(oldCache).forEach(([key,value])=>{if(value&&value!=="__none__")migrated[key]=value});
    if(Object.keys(migrated).length)localStorage.setItem(BACK_COVER_CACHE_KEY,JSON.stringify(migrated));
    return migrated;
  }catch(error){return {}}
}
function saveBackCoverCache(cache){localStorage.setItem(BACK_COVER_CACHE_KEY,JSON.stringify(cache))}
function backCoverUrlFromResponse(data){
  if(!data)return "";
  const direct=data.back_url||data.backCoverUrl||data.backCoverImage||data.backArtwork||data.back_cover_url||data.url||data.image_url||data.image||"";
  if(direct)return direct;
  const image=(data.images||[]).find(item=>item?.back||String(item?.type||"").toLowerCase()==="back"||(item?.types||[]).some(type=>String(type).toLowerCase()==="back"));
  return image?.back_url||image?.url||image?.image_url||image?.image||"";
}
function cleanBackCoverLookupText(value){
  return String(value||"")
    .replace(/\([^)]*(live|remaster|edition)[^)]*\)/ig," ")
    .replace(/\[[^\]]*\]/g," ")
    .replace(/\b(remastered|remaster|deluxe|expanded|anniversary|edition|explicit|clean|version|mono|stereo|bonus|disc|cd)\b/ig," ")
    .replace(/\s+/g," ")
    .trim();
}
function normalizeBackCoverLookupText(value){
  return cleanBackCoverLookupText(value).toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g," ").trim();
}
function escapeMusicBrainzQuery(value){return String(value||"").replace(/([+\-!(){}\[\]^"~*?:\\/])/g,"\\$1")}
function backCoverImageUrl(image){
  const url=image?.image||image?.thumbnails?.["1200"]||image?.thumbnails?.large||image?.thumbnails?.["500"]||"";
  return highResolutionBackCoverUrl(url);
}
function highResolutionBackCoverUrl(url){
  return String(url||"").replace(/^http:\/\//i,"https://").replace(/-(250|500|1200)(\.(jpg|jpeg|png))$/i,"$2");
}
function pickBackCoverImage(images){
  return (images||[]).find(img=>img.back===true)||(images||[]).find(img=>(img.types||[]).some(type=>String(type).toLowerCase()==="back"));
}
function scoreBackCoverRelease(release,wantedTitle,wantedArtist,wantedYear){
  const title=normalizeBackCoverLookupText(release?.title);
  const artist=normalizeBackCoverLookupText((release?.["artist-credit"]||[]).map(item=>item.name||item.artist?.name||"").join(" "));
  const year=String(release?.date||"").slice(0,4);
  let score=Number(release?.score||0);
  if(title===wantedTitle)score+=35;
  else if(title.includes(wantedTitle)||wantedTitle.includes(title))score+=15;
  if(artist.includes(wantedArtist)||wantedArtist.includes(artist))score+=25;
  if(wantedYear&&year===wantedYear)score+=15;
  if(String(release?.status||"").toLowerCase()==="official")score+=8;
  if(String(release?.["primary-type"]||"").toLowerCase()==="album")score+=8;
  return score;
}
function backCoverReleaseMatches(release,wantedTitle,wantedArtist,wantedYear){
  const title=normalizeBackCoverLookupText(release?.title);
  const artist=normalizeBackCoverLookupText((release?.["artist-credit"]||[]).map(item=>item.name||item.artist?.name||"").join(" "));
  const year=String(release?.date||"").slice(0,4);
  const titleOk=title===wantedTitle||title.includes(wantedTitle)||wantedTitle.includes(title);
  const artistOk=!wantedArtist||artist.includes(wantedArtist)||wantedArtist.includes(artist);
  const yearOk=!wantedYear||!year||year===wantedYear;
  return titleOk&&artistOk&&yearOk;
}
function shouldBypassBackCoverCache(album){
  const text=normalizeBackCoverLookupText(`${album?.artist||""} ${album?.title||""}`);
  return (text.includes("eminem")&&text.includes("encore"))||backCoverDisabledForAlbum(album);
}
async function findBackCoverDirectFromArchive(album){
  const cleanTitle=cleanBackCoverLookupText(album?.title);
  const cleanArtist=cleanBackCoverLookupText(album?.artist);
  if(!cleanTitle||!cleanArtist)return "";
  const wantedTitle=normalizeBackCoverLookupText(cleanTitle);
  const wantedArtist=normalizeBackCoverLookupText(cleanArtist);
  const wantedYear=String(album?.year||"").slice(0,4);
  const title=escapeMusicBrainzQuery(cleanTitle);
  const artist=escapeMusicBrainzQuery(cleanArtist);
  const queries=[
    `release:"${title}" artist:"${artist}"`,
    `release:${title} artist:${artist}`,
    `"${title}" artist:"${artist}"`,
    `${title} ${artist}`,
    `release:"${title}"`
  ];
  backCoverDebug("direct browser lookup start",{title:cleanTitle,artist:cleanArtist,queries});
  const releases=[];
  for(const query of queries){
    try{
      const res=await fetch(`https://musicbrainz.org/ws/2/release?query=${encodeURIComponent(query)}&limit=25&fmt=json`,{cache:"no-store"});
      const data=await res.json().catch(()=>null);
      backCoverDebug("direct musicbrainz response",{query,status:res.status,ok:res.ok,count:data?.releases?.length||0});
      if(res.ok&&data?.releases)releases.push(...data.releases);
    }catch(error){backCoverDebug("direct musicbrainz error",{query,message:error.message})}
  }
  const seen=new Set();
  const candidates=releases.filter(release=>release?.id&&!seen.has(release.id)&&seen.add(release.id)&&backCoverReleaseMatches(release,wantedTitle,wantedArtist,wantedYear))
    .sort((a,b)=>scoreBackCoverRelease(b,wantedTitle,wantedArtist,wantedYear)-scoreBackCoverRelease(a,wantedTitle,wantedArtist,wantedYear))
    .slice(0,12);
  backCoverDebug("direct candidates",candidates.map(release=>({id:release.id,title:release.title,date:release.date,score:scoreBackCoverRelease(release,wantedTitle,wantedArtist,wantedYear)})));
  for(const release of candidates){
    try{
      const res=await fetch(`https://coverartarchive.org/release/${release.id}/`,{cache:"no-store"});
      const data=await res.json().catch(()=>null);
      backCoverDebug("direct cover archive response",{releaseId:release.id,title:release.title,status:res.status,ok:res.ok,imageCount:data?.images?.length||0});
      if(!res.ok)continue;
      const back=pickBackCoverImage(data?.images);
      const url=backCoverImageUrl(back);
      if(url)return url;
    }catch(error){backCoverDebug("direct cover archive error",{releaseId:release.id,message:error.message})}
  }
  return "";
}
async function findBackCoverFromArchive(a){
  const key=coverKey(a);
  const cache=backCoverCache();
  if(shouldBypassBackCoverCache(a)&&cache[key]){
    delete cache[key];
    saveBackCoverCache(cache);
    backCoverDebug("cleared album-specific stale cache",{key,title:a?.title,artist:a?.artist});
  }
  if(cache[key]&&cache[key]!=="__none__"){
    backCoverDebug("cache hit",{key,url:cache[key]});
    return cache[key];
  }
  if(cache[key]==="__none__"){
    delete cache[key];
    saveBackCoverCache(cache);
    backCoverDebug("dropped stale not-found cache",{key});
  }
  const params=new URLSearchParams({title:a.title||"",artist:a.artist||"",year:String(a.year||"")});
  const query=params.toString();
  const endpoints=["/.netlify/functions/cover-art?"+query];
  if(location.protocol==="file:"||["localhost","127.0.0.1",""].includes(location.hostname))endpoints.push("https://lucent-cucurucho-2eda91.netlify.app/.netlify/functions/cover-art?"+query);
  let data=null;
  let url="";
  backCoverDebug("lookup start",{key,title:a.title,artist:a.artist,year:a.year,endpoints});
  for(const endpoint of endpoints){
    try{
      const bust=endpoint+(endpoint.includes("?")?"&":"?")+"v=backcover-disabled-20260602";
      const res=await fetch(bust,{cache:"no-store"});
      data=await res.json().catch(()=>null);
      backCoverDebug("api response",{endpoint,status:res.status,ok:res.ok,data});
      const candidate=backCoverUrlFromResponse(data);
      if(res.ok&&data?.found&&candidate){url=candidate;break}
    }catch(error){
      backCoverDebug("api error",{endpoint,message:error.message});
    }
  }
  if(url){
    cache[key]=url;
    saveBackCoverCache(cache);
    backCoverDebug("resolved",{key,url});
  }else{
    url=await findBackCoverDirectFromArchive(a).catch(error=>{backCoverDebug("direct browser lookup failed",{key,message:error.message});return ""});
    if(url){
      cache[key]=url;
      saveBackCoverCache(cache);
      backCoverDebug("resolved by direct browser fallback",{key,url});
    }else{
      backCoverDebug("not found",{key,lastResponse:data});
    }
  }
  return url;
}
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
function score(a){return albumOverviewNumber(a,"admin_score",Number(a?.admin_score??a?.avg_rating??0))}
function count(a){return albumOverviewNumber(a,"admin_ratings_count",Number(a?.admin_ratings_count??a?.ratings_count??0))}
function muzeOverallRank(album){
  if(!album||score(album)<=0)return null;
  const ranked=state.albums.filter(item=>score(item)>0).slice().sort((a,b)=>score(b)-score(a));
  const index=ranked.findIndex(item=>String(item.id)===String(album.id));
  return index>=0?index+1:null;
}
function muzeTop250Rank(album){
  const value=muzeOverallRank(album)||album?.muze_rank||album?.ranking||album?.rank;
  const rank=Number(String(value||"").replace(/[^0-9]/g,""));
  return Number.isInteger(rank)&&rank>=1&&rank<=250?rank:null;
}
function userScore(a){return state.ratingMap[a.id]||(isLocalRuntime()?localRatings()[a.id]:null)||null}
function displayScore(a){return score(a)>0?score(a).toFixed(1):"-"}
function coverText(a){return(a.title||"?").split(" ").filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase()}
function fallback(a){return `<div class="fallbackCover"><strong>${escapeHtml(coverText(a))}</strong><span>${escapeHtml(a.title||"Untitled album")}</span></div>`}
function albumFrontCoverOverrideUrl(album){
  const text=normalizeAlbumName(`${album?.title||""} ${album?.artist||""}`);
  return text.includes("no reason to cry")&&text.includes("eric clapton")?"https://coverartarchive.org/release/11154673-6fc3-4d0c-a844-a3cc6d7de94f/8734842577.jpg":"";
}
function albumCoverUrl(a){return albumFrontCoverOverrideUrl(a)||String(a?.cover_url||"").trim()}
function cover(a){
  const url=albumCoverUrl(a);
  if(!url) return `<div class="cover">${fallback(a)}</div>`;
  return `<div class="cover"><img src="${escapeHtml(url)}" onerror="this.hidden=true" alt="${escapeHtml(a.title||"Album cover")}">${fallback(a)}</div>`
}
function listCover(a){
  const url=albumCoverUrl(a);
  if(!url) return `<div class="listCover"><span>${escapeHtml(coverText(a))}</span></div>`;
  return `<div class="listCover"><img src="${escapeHtml(url)}" onerror="this.hidden=true" alt="${escapeHtml(a.title||"Album cover")}"><span>${escapeHtml(coverText(a))}</span></div>`
}
function backCoverDisabledForAlbum(album){
  const artist=normalizeAlbumName(album?.artist||"");
  const title=normalizeAlbumName(album?.title||"");
  const year=String(album?.year||"").slice(0,4);
  return artist.includes("eric clapton")||artist.includes("the kinks")||artist==="kinks"||title.includes("echoes silence patience and grace")||(artist.includes("pink floyd")&&title.includes("dark side of the moon"))||(artist.includes("iron maiden")&&title==="iron maiden"&&year==="1980")||(artist.includes("eagle eye cherry")&&title.includes("back on track"))||(artist.includes("bush")&&title.includes("i beat loneliness"))||(artist.includes("natalie imbruglia")&&title.includes("left of the middle"));
}
function flippableAlbumCover(a,albumId){
  const popularTrackTitle=albumMostPopularTrackTitle(a);
  const previewButton=popularTrackTitle?`<button type="button" class="albumCoverPreviewButton" aria-label="Play ${escapeHtml(popularTrackTitle)} preview" title="Play" onclick="event.stopPropagation();playOverviewMomentPreview('${escapeJsString(albumId)}','${escapeJsString(popularTrackTitle)}',this)"></button>`:"";
  if(backCoverDisabledForAlbum(a))return `${cover(a)}${previewButton}`;
  return `<div class="linerCoverFlip" data-flipped="0" onclick="flipAlbumCover('${escapeJsString(albumId)}')" title="Click album cover to flip"><div class="linerCoverFlipCard"><div class="linerCoverFace linerCoverFront">${cover(a)}</div><div class="linerCoverFace linerCoverBack"><div class="cover"><div class="backCoverLoading">Back cover</div></div></div></div></div>${previewButton}`;
}
function comparableImageUrl(url){
  return String(url||"").trim().split("?")[0].replace(/\/+$/,"").toLowerCase();
}
function isRealBackCoverUrl(album,url){
  return !!url&&comparableImageUrl(url)!==comparableImageUrl(album?.cover_url);
}
function albumBackCoverField(album){
  return album?.backCoverUrl||album?.backCoverImage||album?.backArtwork||album?.back_cover_url||album?.back_url||"";
}
function albumBackCoverClass(album){
  const text=normalizeAlbumName(`${album?.title||""} ${album?.artist||""}`);
  if(text.includes("michael jackson")&&text.includes("thriller"))return " thrillerBackCrop";
  if(text.includes("michael jackson")&&text.includes("off the wall"))return " offTheWallBackCrop";
  if(text.includes("bob dylan")&&text.includes("highway 61 revisited"))return " highway61BackCrop";
  return text.includes("freewheelin bob dylan")||text.includes("bob dylan freewheelin")?" freewheelinBackCrop":"";
}
function isHighway61Album(album){
  const text=normalizeAlbumName(`${album?.title||""} ${album?.artist||""}`);
  return text.includes("bob dylan")&&text.includes("highway 61 revisited");
}
function isFreewheelinBackCoverUrl(url){
  const value=String(url||"").toLowerCase();
  return value.includes("b14ceb58-79c6-35bb-a87a-7504864f2c7d")||value.includes("26099141951");
}
function isWrongBackCoverForAlbum(album,url){
  return isHighway61Album(album)&&isFreewheelinBackCoverUrl(url);
}
function albumBackCoverOverrideUrl(album){
  const text=normalizeAlbumName(`${album?.title||""} ${album?.artist||""}`);
  if(text.includes("pink floyd")&&text.includes("animals"))return "https://coverartarchive.org/release/14d9fa93-1efe-491a-b668-f9454979bce9/24624062414.png";
  if(text.includes("bob dylan")&&text.includes("highway 61 revisited"))return "https://coverartarchive.org/release/bde5033d-4bc7-4072-a50b-0d4f09eea47a/33608911115.jpg";
  if(text.includes("bob dylan")&&text.includes("knocked out loaded"))return "https://coverartarchive.org/release/f414a2b8-7aa3-4dc7-83ec-37ee7e5823ff/16197404598.jpg";
  if((text.includes("2pac")||text.includes("tupac"))&&text.includes("all eyez on me"))return "https://coverartarchive.org/release/b8d2916e-c077-430b-8535-069dc6891360/22866255882.png";
  if(text.includes("michael jackson")&&text.includes("off the wall"))return "https://coverartarchive.org/release/28b8a881-e552-324a-93b3-5b3f9d591006/6494959895.jpg";
  if(text.includes("michael jackson")&&text.includes("thriller"))return "https://coverartarchive.org/release/884e8b9a-bcab-4f04-bf9c-ae7af9ae4ce6/34921556793.jpg";
  if(text.includes("aretha franklin")&&text.includes("i never loved a man"))return "https://coverartarchive.org/release/4b43b2a7-2cab-4f87-9a7e-dfc0913c39ab/30181577323.jpg";
  if(text.includes("the beatles")&&text.includes("rubber soul"))return "https://coverartarchive.org/release/df2dd7e9-c39a-4302-a32f-76fd630a274c/33142967902.jpg";
  if(text.includes("the kinks")&&text.includes("low budget"))return "https://coverartarchive.org/release/42b8324a-590c-31d8-8627-e9f2832d3a14/15681828011.jpg";
  if(text.includes("metallica")&&text.includes("ride the lightning"))return "https://coverartarchive.org/release/589ff96d-0be8-3f82-bdd2-299592e51b40/41578956333.jpg";
  if(text.includes("metallica")&&text.includes("72 seasons"))return "https://coverartarchive.org/release/dbe7d43d-4a29-4a7e-b942-a62207f5a53d/back";
  if(text.includes("muse")&&text.includes("simulation theory"))return "https://coverartarchive.org/release/e4d797e2-2b5e-4d0b-9290-eb91c3b5ca39/back";
  if(text.includes("goo goo dolls")&&(text.includes("its christmas all over")||text.includes("it s christmas all over")))return "https://coverartarchive.org/release/44c1ee76-31b9-46ac-b238-02ef05a8f2d8/27726786453.jpg";
  if(text.includes("britney spears")&&text.includes("circus"))return "https://coverartarchive.org/release/513508e4-48c0-4262-9f7e-e68e2d35265a/32572798863.jpg";
  return albumBackCoverClass(album).trim()==="freewheelinBackCrop"?"https://coverartarchive.org/release/98e1831b-7440-409e-b9dc-75f6e99012f8/23064833554.png":"";
}
function handleBackCoverImageError(img){
  const cover=img?.closest?.(".cover");
  if(!cover)return;
  cover.innerHTML='<div class="backCoverLoading">Back cover unavailable</div>';
}
function toggleBackCoverInlineZoom(button,event){
  event?.stopPropagation?.();
  const flip=button?.closest?.(".linerCoverFlip");
  if(!flip)return;
  const cover=flip.querySelector(".linerCoverBack .cover");
  const zoomed=flip.classList.toggle("backCoverInlineZoomed");
  if(cover&&zoomed){
    cover.dataset.zoomScale="1.5";
    cover.dataset.panX="0";
    cover.dataset.panY="0";
    cover.style.setProperty("--back-cover-pan-x","0px");
    cover.style.setProperty("--back-cover-pan-y","0px");
    cover.style.setProperty("--back-cover-inline-scale","1.5");
  }
  if(cover&&!zoomed){
    cover.dataset.dragging="";
    cover.dataset.panX="0";
    cover.dataset.panY="0";
    cover.dataset.zoomScale="";
    cover.style.setProperty("--back-cover-pan-x","0px");
    cover.style.setProperty("--back-cover-pan-y","0px");
    cover.style.setProperty("--back-cover-inline-scale","1.5");
  }
}
function handleBackCoverInlineWheel(event){
  const cover=event.currentTarget;
  const flip=cover?.closest?.(".linerCoverFlip");
  if(!flip||flip.dataset.flipped!=="1")return;
  event.preventDefault();
  event.stopPropagation();
  if(!flip.classList.contains("backCoverInlineZoomed"))flip.classList.add("backCoverInlineZoomed");
  const current=Number(cover.dataset.zoomScale||1.5);
  const next=Math.max(1.5,Math.min(3,current+(event.deltaY<0 ? .16 : -.16)));
  cover.dataset.zoomScale=String(next);
  cover.style.setProperty("--back-cover-inline-scale",next.toFixed(2));
}
function startBackCoverInlineDrag(event){
  const cover=event.currentTarget;
  const flip=cover?.closest?.(".linerCoverFlip");
  if(!flip||flip.dataset.flipped!=="1"||!flip.classList.contains("backCoverInlineZoomed"))return;
  if(event.target?.closest?.(".backCoverInlineZoomButton"))return;
  event.stopPropagation();
  event.preventDefault();
  cover.setPointerCapture?.(event.pointerId);
  cover.dataset.dragging="1";
  cover.dataset.dragStartX=String(event.clientX);
  cover.dataset.dragStartY=String(event.clientY);
  cover.dataset.startPanX=cover.dataset.panX||"0";
  cover.dataset.startPanY=cover.dataset.panY||"0";
  cover.classList.add("backCoverDragging");
}
function moveBackCoverInlineZoom(event){
  const cover=event.currentTarget;
  const flip=cover?.closest?.(".linerCoverFlip");
  if(!flip||flip.dataset.flipped!=="1"||!flip.classList.contains("backCoverInlineZoomed"))return;
  const inlinePanBounds=()=>{
    const rect=cover.getBoundingClientRect();
    const img=cover.querySelector("img");
    const scale=Number(cover.dataset.zoomScale||1.5);
    const naturalW=Number(img?.naturalWidth||0);
    const naturalH=Number(img?.naturalHeight||0);
    let fittedW=rect.width;
    let fittedH=rect.height;
    if(naturalW&&naturalH){
      const fit=Math.min(rect.width/naturalW,rect.height/naturalH);
      fittedW=naturalW*fit;
      fittedH=naturalH*fit;
    }
    return {rect,maxX:Math.max(0,(fittedW*scale-rect.width)/2),maxY:Math.max(0,(fittedH*scale-rect.height)/2)};
  };
  if(cover.dataset.dragging==="1"){
    event.stopPropagation();
    event.preventDefault();
    const {maxX,maxY}=inlinePanBounds();
    const x=Math.max(-maxX,Math.min(maxX,Number(cover.dataset.startPanX||0)+(event.clientX-Number(cover.dataset.dragStartX||event.clientX))));
    const y=Math.max(-maxY,Math.min(maxY,Number(cover.dataset.startPanY||0)+(event.clientY-Number(cover.dataset.dragStartY||event.clientY))));
    cover.dataset.panX=String(x);
    cover.dataset.panY=String(y);
    cover.style.setProperty("--back-cover-pan-x",`${x.toFixed(2)}px`);
    cover.style.setProperty("--back-cover-pan-y",`${y.toFixed(2)}px`);
    return;
  }
  const {rect,maxX,maxY}=inlinePanBounds();
  const baseX=Number(cover.dataset.panX||0);
  const baseY=Number(cover.dataset.panY||0);
  const x=Math.max(-maxX,Math.min(maxX,baseX+((event.clientX-rect.left)/rect.width-.5)*6));
  const y=Math.max(-maxY,Math.min(maxY,baseY+((event.clientY-rect.top)/rect.height-.5)*6));
  cover.style.setProperty("--back-cover-pan-x",`${x.toFixed(2)}px`);
  cover.style.setProperty("--back-cover-pan-y",`${y.toFixed(2)}px`);
}
function endBackCoverInlineDrag(event){
  const cover=event.currentTarget;
  if(cover.dataset.dragging==="1"){
    event?.stopPropagation?.();
    cover.releasePointerCapture?.(event.pointerId);
  }
  cover.dataset.dragging="";
  cover.classList.remove("backCoverDragging");
}
function handleBackCoverInlineClick(event){
  const flip=event.currentTarget?.closest?.(".linerCoverFlip");
  if(flip?.classList.contains("backCoverInlineZoomed")){
    event.stopPropagation();
  }
}
function handleBackCoverOutsideDoubleClick(event){
  const flip=document.querySelector(".linerCoverFlip.backCoverInlineZoomed[data-flipped='1']");
  if(!flip||flip.contains(event.target))return;
  event.preventDefault();
  flip.classList.remove("backCoverInlineZoomed");
  flip.dataset.flipped="0";
  const cover=flip.querySelector(".linerCoverBack .cover");
  if(cover){
    cover.dataset.dragging="";
    cover.dataset.panX="0";
    cover.dataset.panY="0";
    cover.dataset.zoomScale="";
    cover.style.setProperty("--back-cover-pan-x","0px");
    cover.style.setProperty("--back-cover-pan-y","0px");
    cover.style.setProperty("--back-cover-inline-scale","1.5");
  }
}
document.addEventListener("dblclick",handleBackCoverOutsideDoubleClick);
function setBackCoverFace(album,url){
  const flip=document.querySelector(".linerCoverFlip");
  const backFace=flip?.querySelector(".linerCoverBack .cover");
  if(!flip||!backFace||!isRealBackCoverUrl(album,url)){backCoverDebug("rejected back face url",{title:album?.title,artist:album?.artist,url,front:album?.cover_url});return false}
  const displayUrl=highResolutionBackCoverUrl(url);
  flip.dataset.backCoverUrl=url;
  flip.dataset.backCoverDisplayUrl=displayUrl;
  flip.dataset.backCoverSource="back-cover-api";
  const backCropClass=albumBackCoverClass(album).trim();
  flip.classList.toggle("freewheelinBackCrop",backCropClass==="freewheelinBackCrop");
  flip.classList.toggle("thrillerBackCrop",backCropClass==="thrillerBackCrop");
  flip.classList.toggle("offTheWallBackCrop",backCropClass==="offTheWallBackCrop");
  flip.classList.toggle("highway61BackCrop",backCropClass==="highway61BackCrop");
  backFace.innerHTML=`<img src="${escapeHtml(displayUrl)}" alt="" loading="lazy" decoding="async" onerror="handleBackCoverImageError(this)"><span class="backCoverLabel">Back cover</span><button class="backCoverInlineZoomButton" type="button" onclick="toggleBackCoverInlineZoom(this,event)" aria-label="Zoom back cover"><span class="backCoverMagnifyIcon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m15.5 15.5 5 5"></path></svg></span></button>`;
  backFace.dataset.panX="0";
  backFace.dataset.panY="0";
  backFace.dataset.zoomScale="1.5";
  backFace.setAttribute("onpointermove","moveBackCoverInlineZoom(event)");
  backFace.setAttribute("onpointerdown","startBackCoverInlineDrag(event)");
  backFace.setAttribute("onpointerup","endBackCoverInlineDrag(event)");
  backFace.setAttribute("onpointercancel","endBackCoverInlineDrag(event)");
  backFace.setAttribute("onwheel","handleBackCoverInlineWheel(event)");
  backFace.setAttribute("onclick","handleBackCoverInlineClick(event)");
  backCoverDebug("back face set",{title:album?.title,artist:album?.artist,url});
  return true;
}
async function resolveBackCoverUrl(album){
  if(!album||backCoverDisabledForAlbum(album))return "";
  const override=albumBackCoverOverrideUrl(album);
  if(override){backCoverDebug("using album-specific back cover override",{title:album.title,artist:album.artist,url:override});return override}
  const hero=document.querySelector(`.linerHero[data-album-id="${CSS.escape(String(album.id))}"]`);
  const existing=albumBackCoverField(album)||hero?.dataset.backCoverUrl||document.querySelector(".linerCoverFlip")?.dataset.backCoverUrl||"";
  if(isRealBackCoverUrl(album,existing)&&!isWrongBackCoverForAlbum(album,existing)){backCoverDebug("using existing url",{title:album.title,artist:album.artist,url:existing});return existing}
  const cache=backCoverCache();
  const key=coverKey(album);
  if(cache[key]&&isWrongBackCoverForAlbum(album,cache[key])){
    const invalidValue=cache[key];
    delete cache[key];
    saveBackCoverCache(cache);
    backCoverDebug("removed wrong cached back cover",{key,value:invalidValue});
  }
  if(cache[key]&&!isRealBackCoverUrl(album,cache[key])){
    const invalidValue=cache[key];
    delete cache[key];
    saveBackCoverCache(cache);
    backCoverDebug("removed invalid cached url",{key,value:invalidValue});
  }
  const url=await findBackCoverFromArchive(album).catch(()=>"");
  backCoverDebug("resolved final",{title:album.title,artist:album.artist,url,isReal:isRealBackCoverUrl(album,url)});
  return isRealBackCoverUrl(album,url)?url:"";
}
async function applyBackCoverHero(album){
  if(!album||backCoverDisabledForAlbum(album))return;
  const hero=document.querySelector(`.linerHero[data-album-id="${CSS.escape(String(album.id))}"]`);
  if(!hero)return;
  const url=await resolveBackCoverUrl(album);
  if(!url)return;
  hero.style.setProperty("--hero-scene",`url("${url}")`);
  hero.dataset.backCoverUrl=url;
  hero.classList.add("backCoverHero");
  setBackCoverFace(album,url);
}
function ensureBackCoverZoomHotspot(hero,url){
  let hotspot=hero.querySelector(".backCoverZoomHotspot");
  if(!hotspot){
    hotspot=document.createElement("button");
    hotspot.type="button";
    hotspot.className="backCoverZoomHotspot";
    hotspot.setAttribute("aria-label","Zoom back cover");
    hotspot.title="Click to zoom back cover";
    hero.appendChild(hotspot);
  }
  hotspot.onclick=event=>{event.stopPropagation();openBackCoverZoom(highResolutionBackCoverUrl(url))};
}
function openBackCoverZoomFromButton(button,event){
  event?.stopPropagation?.();
  const flip=button?.closest?.(".linerCoverFlip");
  const url=flip?.dataset.backCoverDisplayUrl||flip?.dataset.backCoverUrl||flip?.querySelector?.(".linerCoverBack img")?.getAttribute?.("src")||"";
  openBackCoverZoom(highResolutionBackCoverUrl(url));
}
function backCoverViewerState(viewer){
  if(!viewer._muzeBackCoverZoom)viewer._muzeBackCoverZoom={scale:1,x:0,y:0,dragging:false,pointers:new Map(),lastTap:0,pinch:null};
  return viewer._muzeBackCoverZoom;
}
function clampBackCoverZoom(viewer){
  const stage=viewer.querySelector(".backCoverZoomStage");
  const img=viewer.querySelector(".backCoverZoomStage img");
  const state=backCoverViewerState(viewer);
  const rect=stage.getBoundingClientRect();
  const naturalW=img.naturalWidth||rect.width||1;
  const naturalH=img.naturalHeight||rect.height||1;
  const fit=Math.min(rect.width/naturalW,rect.height/naturalH,1);
  const scaledW=naturalW*fit*state.scale;
  const scaledH=naturalH*fit*state.scale;
  const maxX=Math.max(0,(scaledW-rect.width)/2);
  const maxY=Math.max(0,(scaledH-rect.height)/2);
  if(state.scale<=1.001){state.scale=1;state.x=0;state.y=0;}
  else{
    state.x=Math.max(-maxX,Math.min(maxX,state.x));
    state.y=Math.max(-maxY,Math.min(maxY,state.y));
  }
}
function renderBackCoverZoom(viewer){
  const stage=viewer.querySelector(".backCoverZoomStage");
  const state=backCoverViewerState(viewer);
  clampBackCoverZoom(viewer);
  stage.style.setProperty("--back-cover-zoom-scale",state.scale.toFixed(4));
  stage.style.setProperty("--back-cover-zoom-x",`${state.x.toFixed(2)}px`);
  stage.style.setProperty("--back-cover-zoom-y",`${state.y.toFixed(2)}px`);
  stage.classList.toggle("isZoomed",state.scale>1.001);
}
function resetBackCoverZoom(viewer){
  const state=backCoverViewerState(viewer);
  state.scale=1;state.x=0;state.y=0;state.dragging=false;state.pinch=null;state.pointers.clear();
  viewer.querySelector(".backCoverZoomStage")?.classList.remove("dragging","pinching");
  renderBackCoverZoom(viewer);
}
function zoomBackCoverAt(viewer,nextScale,clientX,clientY){
  const stage=viewer.querySelector(".backCoverZoomStage");
  const state=backCoverViewerState(viewer);
  const rect=stage.getBoundingClientRect();
  const oldScale=state.scale||1;
  nextScale=Math.max(1,Math.min(4,nextScale));
  const ratio=nextScale/oldScale;
  const offsetX=clientX-(rect.left+rect.width/2);
  const offsetY=clientY-(rect.top+rect.height/2);
  state.x=offsetX-(offsetX-state.x)*ratio;
  state.y=offsetY-(offsetY-state.y)*ratio;
  state.scale=nextScale;
  renderBackCoverZoom(viewer);
}
function backCoverPointerDistance(a,b){return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}
function backCoverPointerMidpoint(a,b){return {x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2}}
function setupBackCoverZoomViewer(viewer){
  if(viewer.dataset.zoomReady==="1")return;
  viewer.dataset.zoomReady="1";
  viewer.addEventListener("click",event=>{if(event.target===viewer)closeBackCoverZoom()});
  viewer.querySelector(".backCoverZoomClose").onclick=closeBackCoverZoom;
  const stage=viewer.querySelector(".backCoverZoomStage");
  stage.addEventListener("wheel",event=>{
    event.preventDefault();
    const state=backCoverViewerState(viewer);
    const factor=event.deltaY<0?1.14:.88;
    zoomBackCoverAt(viewer,state.scale*factor,event.clientX,event.clientY);
  },{passive:false});
  stage.addEventListener("dblclick",event=>{event.preventDefault();resetBackCoverZoom(viewer)});
  stage.addEventListener("pointerdown",event=>{
    event.preventDefault();
    const state=backCoverViewerState(viewer);
    stage.setPointerCapture?.(event.pointerId);
    state.pointers.set(event.pointerId,{clientX:event.clientX,clientY:event.clientY});
    if(state.pointers.size===2){
      const points=[...state.pointers.values()];
      const mid=backCoverPointerMidpoint(points[0],points[1]);
      state.pinch={distance:backCoverPointerDistance(points[0],points[1])||1,scale:state.scale,x:state.x,y:state.y,midX:mid.x,midY:mid.y};
      state.wasPinching=true;
      state.dragging=false;
      stage.classList.remove("dragging");
      stage.classList.add("pinching");
      return;
    }
    if(state.scale>1.001){
      state.dragging=true;
      state.dragStartX=event.clientX;
      state.dragStartY=event.clientY;
      state.startX=state.x;
      state.startY=state.y;
      stage.classList.add("dragging");
    }
  });
  stage.addEventListener("pointermove",event=>{
    const state=backCoverViewerState(viewer);
    if(!state.pointers.has(event.pointerId))return;
    state.pointers.set(event.pointerId,{clientX:event.clientX,clientY:event.clientY});
    if(state.pointers.size>=2&&state.pinch){
      event.preventDefault();
      const points=[...state.pointers.values()].slice(0,2);
      const mid=backCoverPointerMidpoint(points[0],points[1]);
      state.scale=Math.max(1,Math.min(4,state.pinch.scale*(backCoverPointerDistance(points[0],points[1])/state.pinch.distance)));
      state.x=state.pinch.x+(mid.x-state.pinch.midX);
      state.y=state.pinch.y+(mid.y-state.pinch.midY);
      renderBackCoverZoom(viewer);
      return;
    }
    if(state.dragging){
      event.preventDefault();
      state.x=state.startX+(event.clientX-state.dragStartX);
      state.y=state.startY+(event.clientY-state.dragStartY);
      renderBackCoverZoom(viewer);
    }
  });
  const endPointer=event=>{
    const state=backCoverViewerState(viewer);
    state.pointers.delete(event.pointerId);
    stage.releasePointerCapture?.(event.pointerId);
    if(event.pointerType==="touch"&&state.pointers.size===0&&!state.wasPinching){
      const now=Date.now();
      if(now-state.lastTap<320){event.preventDefault();resetBackCoverZoom(viewer);}
      state.lastTap=now;
    }
    if(state.pointers.size<2){state.pinch=null;stage.classList.remove("pinching");}
    if(state.pointers.size===0){state.dragging=false;state.wasPinching=false;stage.classList.remove("dragging");}
  };
  stage.addEventListener("pointerup",endPointer);
  stage.addEventListener("pointercancel",endPointer);
}
function openBackCoverZoom(url){
  url=highResolutionBackCoverUrl(url);
  if(!url)return;
  let viewer=document.getElementById("backCoverZoomViewer");
  if(!viewer){
    viewer=document.createElement("div");
    viewer.id="backCoverZoomViewer";
    viewer.className="backCoverZoomViewer hidden";
    viewer.innerHTML=`<div class="backCoverZoomPanel"><button class="backCoverZoomClose" type="button" aria-label="Close zoom">&times;</button><div class="backCoverZoomStage"><img alt="Back cover zoom" draggable="false"></div><div class="backCoverZoomHint">Scroll to zoom &bull; drag to explore</div></div>`;
    document.body.appendChild(viewer);
  }
  setupBackCoverZoomViewer(viewer);
  const img=viewer.querySelector("img");
  const hint=viewer.querySelector(".backCoverZoomHint");
  if(hint)hint.innerHTML=(window.matchMedia&&window.matchMedia("(pointer: coarse)").matches)?"Pinch to zoom &bull; drag to explore":"Scroll to zoom &bull; drag to explore";
  viewer.dataset.currentBackCoverUrl=url;
  img.onload=()=>{if(viewer.dataset.currentBackCoverUrl===url){img.style.visibility="visible";resetBackCoverZoom(viewer)}};
  img.onerror=()=>{if(viewer.dataset.currentBackCoverUrl===url)img.style.visibility="hidden"};
  img.style.visibility="hidden";
  img.removeAttribute("src");
  resetBackCoverZoom(viewer);
  img.src=url;
  viewer.classList.remove("hidden");
}
function closeBackCoverZoom(){
  const viewer=document.getElementById("backCoverZoomViewer");
  if(viewer){resetBackCoverZoom(viewer);viewer.classList.add("hidden");}
}
document.addEventListener("keydown",event=>{if(event.key==="Escape")closeBackCoverZoom()});
window.flipAlbumCover=async function(albumId){
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  const flip=document.querySelector(".linerCoverFlip");
  if(!album||!flip)return;
  if(flip.dataset.flipped==="1"){flip.dataset.flipped="0";return}
  const backFace=flip.querySelector(".linerCoverBack .cover");
  if(!backFace)return;
  const existing=flip.dataset.backCoverUrl||"";
  if(isRealBackCoverUrl(album,existing)){
    setBackCoverFace(album,existing);
    flip.dataset.flipped="1";
    return;
  }
  let img=backFace.querySelector("img");
  if(img&&isRealBackCoverUrl(album,img.getAttribute("src"))){
    flip.dataset.backCoverUrl=img.getAttribute("src")||"";
    flip.dataset.flipped="1";
    return;
  }
  if(!img||!isRealBackCoverUrl(album,img.getAttribute("src"))){
    backFace.innerHTML='<div class="backCoverLoading">Finding back cover...</div>';
    const url=await resolveBackCoverUrl(album);
    if(!url){backFace.innerHTML='<div class="backCoverLoading">Back cover unavailable</div>';flip.dataset.flipped="1";return}
    setBackCoverFace(album,url);
  }
  flip.dataset.flipped="1";
}

function hiddenSeedAlbums(){return JSON.parse(localStorage.getItem("musicaHiddenSeedAlbums")||"[]")}
function saveHiddenSeedAlbums(ids){localStorage.setItem("musicaHiddenSeedAlbums",JSON.stringify(ids))}
function normalizeAlbumName(value){
  return String(value||"").toLowerCase()
    .replace(/[’']/g,"")
    .replace(/&/g," and ")
    .replace(/\s*[-:]\s*(deluxe|expanded|anniversary|collector'?s?|special|super deluxe|legacy|remaster(?:ed)?|bonus|mono|stereo|reissue|explicit|clean).*$/i,"")
    .replace(/\s*\((?=[^)]*(deluxe|expanded|anniversary|collector'?s?|special|super deluxe|legacy|remaster(?:ed)?|edition|version|bonus|mono|stereo|reissue|explicit|clean))[^)]*\)/gi,"")
    .replace(/\s*\[(?=[^\]]*(deluxe|expanded|anniversary|collector'?s?|special|super deluxe|legacy|remaster(?:ed)?|edition|version|bonus|mono|stereo|reissue|explicit|clean))[^\]]*\]/gi,"")
    .replace(/\b(remaster(?:ed)?|deluxe|expanded|anniversary|edition|version|explicit|clean)\b/g," ")
    .replace(/[^a-z0-9]+/g," ")
    .replace(/\s+/g," ")
    .trim();
}
function albumIdentityTitleKey(album){
  const raw=String(album?.title||album?.name||album?.album_title||"");
  const artist=normalizeAlbumName(album?.artist||album?.artist_name);
  const colorMatch=raw.match(/\((blue|green|red|white|teal|black|yellow|van weezer)\s+album\)/i);
  const base=normalizeAlbumName(raw);
  if(artist==="weezer"&&base==="weezer"&&colorMatch)return `${base} ${colorMatch[1].toLowerCase()} album`;
  return base;
}
function albumIdentityKey(album){
  const title=albumIdentityTitleKey(album);
  const artist=normalizeAlbumName(album?.artist||album?.artist_name);
  return title&&artist?`${artist}::${title}`:"";
}
const albumOriginalReleaseDateOverrides={
  "the beatles::sgt peppers lonely hearts club band":"1967-05-26"
};
function albumReleaseYear(album){
  const verifiedDate=albumOriginalReleaseDateOverrides[albumIdentityKey(album)];
  return Number(String(verifiedDate||album?.year||"").slice(0,4))||"";
}
function isSameAlbum(a,b){const left=albumIdentityKey(a);return Boolean(left&&left===albumIdentityKey(b))}
function albumRecordQuality(album){
  return [
    Number(album?.ratings_count||0),
    Number(album?.avg_rating||0),
    album?.cover_url?1:0,
    album?.spotify_url?1:0,
    album?.summary?1:0,
    String(album?.id||"").startsWith("seed-")?0:1
  ].reduce((total,value,index)=>total+Number(value||0)*[1000,100,10,5,2,1][index],0);
}
function dedupeAlbumRows(albums=[]){
  const byKey=new Map();
  const unique=[];
  albums.forEach(album=>{
    const key=albumIdentityKey(album);
    if(!key){unique.push(album);return}
    const existingIndex=byKey.get(key);
    if(existingIndex===undefined){
      byKey.set(key,unique.length);
      unique.push(album);
      return;
    }
    const current=unique[existingIndex];
    if(albumRecordQuality(album)>albumRecordQuality(current)){
      unique[existingIndex]={...current,...album};
    }
  });
  return unique;
}
function existingAlbumMatch(album){return state.albums.find(a=>isSameAlbum(a,album))}
function canDeleteAlbum(a){return !!a}

function currentUsername(){return (savedProfileUsername()||localStorage.getItem("musicaUsername")||"").trim()}
function authMetadataName(user=loggedInUser()){
  const meta=user?.user_metadata||{};
  return String(meta.name||meta.full_name||meta.user_name||meta.preferred_username||meta.display_name||"").trim();
}
function authEmailPrefix(user=loggedInUser()){
  const email=String(user?.email||"").trim();
  return email&&email.includes("@")?email.split("@")[0]:"";
}
function trackCommentIdentity(){
  const user=loggedInUser();
  const name=(savedProfileUsername()||currentUsername()||authMetadataName(user)||authEmailPrefix(user)||"Listener").trim()||"Listener";
  const meta=user?.user_metadata||{};
  const avatarUrl=String(state.userProfile?.avatar_url||meta.avatar_url||meta.picture||"").trim();
  return {user_id:user?.id||null,name,avatar_url:avatarUrl};
}
function commentProfilePayload(){return trackCommentIdentity()}
function trackCommentAvatarMarkup(comment={},name="Listener"){
  const isMine=comment.user_id&&loggedInUser()?.id&&String(comment.user_id)===String(loggedInUser().id);
  const avatarUrl=String(comment.avatar_url||"").trim();
  if(avatarUrl)return `<span class="commentAvatar"><img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}"></span>`;
  if(isMine&&avatarHasValue())return `<span class="commentAvatar hasProfileAvatar">${currentAvatarMarkup()}</span>`;
  return `<span class="commentAvatar">${escapeHtml(String(name||"L").slice(0,1).toUpperCase()||"L")}</span>`;
}
function profileForAuthor(row={},name=""){
  const userId=String(row.user_id||"").trim();
  const username=String(row.username||row.name||name||"").trim().toLowerCase();
  if(userId&&loggedInUser()?.id&&String(loggedInUser().id)===userId)return state.userProfile||null;
  return (extras.profileDirectory||[]).find(profile=>
    (userId&&String(profile.user_id||"")===userId)||
    (username&&String(profile.username||"").trim().toLowerCase()===username)
  )||null;
}
function avatarMarkupForAuthor(row={},name="Listener",className="listenerCardAvatar"){
  const profile=profileForAuthor(row,name);
  const resolved={...(row||{}),...(profile||{}),username:profile?.username||row.username||name};
  const avatarUrl=String(profileAvatarOverride(resolved)||resolved.avatar_url||resolved.profile_avatar_url||"").trim();
  if(avatarUrl)return `<div class="${className}">${avatarImgMarkup(avatarUrl,name)}</div>`;
  const avatarSvgValue=String(resolved.avatar_svg||resolved.profile_avatar_svg||"").trim();
  if(avatarSvgValue.startsWith("<svg"))return `<div class="${className}">${avatarSvgValue}</div>`;
  let config=resolved.avatar_config||resolved.profile_avatar_config||null;
  if(typeof config==="string"){try{config=JSON.parse(config)}catch(e){config=null}}
  if(config&&typeof config==="object")return `<div class="${className}">${avatarSvg(config)}</div>`;
  return `<div class="${className}">${escapeHtml(String(name||"L").slice(0,1).toUpperCase()||"L")}</div>`;
}
function ratingName(){const saved=currentUsername().trim();if(saved)return saved;const profile=String(state.userProfile?.username||"").trim();if(profile)return profile;const name=(prompt("Enter a username for this rating, or leave blank for Anonymous:")||"").trim();if(name){localStorage.setItem("musicaUsername",name);return name}return "Anonymous"}
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
  const score=(extras.songScores[albumRef(albumId)]||{})[trackKeyValue];
  const countLine=`<div class="emptyMini">${displaySongCount(score)}</div>`;
  const list=rows.length?`<div class="ratingDetailList">${rows.map(row=>{
    const name=String(row.username||row.name||"Listener").trim()||"Listener";
    const rating=Number(row.rating||0);
    const date=row.created_at?new Date(row.created_at):null;
    const dateLabel=date&&!Number.isNaN(date.getTime())?`<small>${escapeHtml(date.toLocaleDateString(undefined,{month:"short",day:"numeric"}))}</small>`:"";
    return `<div class="ratingDetail"><strong>${escapeHtml(name)}${dateLabel}</strong><span>${rating?escapeHtml(rating.toFixed(0)):"-"}</span></div>`;
  }).join("")}</div>`:"";
  host.innerHTML=countLine+list;
}
async function loadTrackRatingDetails(albumId,trackKeyValue){
  const ref=albumRef(albumId);
  const key=`${ref}::${trackKeyValue}`;
  if(db){
    let result=await db.from("public_track_ratings").select("username,rating,created_at").eq("album_ref",ref).eq("track_key",trackKeyValue).order("created_at",{ascending:false}).limit(50);
    if(result.error&&/relation|schema cache|does not exist|public_track_ratings/i.test(result.error.message||"")){
      result=await db.from("track_ratings").select("username,rating,created_at").eq("album_ref",ref).eq("track_key",trackKeyValue).order("created_at",{ascending:false}).limit(50);
    }
    if(!result.error){extras.trackRatingDetails[key]=result.data||[];return extras.trackRatingDetails[key]}
  }
  const my=localTrackRating(albumId,trackKeyValue);
  extras.trackRatingDetails[key]=my?[{username:currentUsername()||"You",rating:my}]:[];
  return extras.trackRatingDetails[key];
}

function albumRef(albumId){return String(albumId||"")}
function localComments(){return JSON.parse(localStorage.getItem("musicaAlbumComments")||"{}")}
function saveLocalComments(comments){localStorage.setItem("musicaAlbumComments",JSON.stringify(comments))}
function localCommentReplies(){return JSON.parse(localStorage.getItem("musicaAlbumCommentReplies")||"{}")}
function saveLocalCommentReplies(replies){localStorage.setItem("musicaAlbumCommentReplies",JSON.stringify(replies))}
function localCommentLikes(){try{return JSON.parse(localStorage.getItem("muzeAlbumCommentLikes")||"{}")||{}}catch(error){return {}}}
function saveLocalCommentLikes(likes){localStorage.setItem("muzeAlbumCommentLikes",JSON.stringify(likes||{}))}
function localId(prefix="local"){return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`}
function domSafeId(value){return String(value??"").replace(/[^a-zA-Z0-9_-]/g,"_")}
function localTrackRatings(){return JSON.parse(localStorage.getItem("musicaTrackRatings")||"{}")}
function localTrackComments(){return JSON.parse(localStorage.getItem("musicaTrackComments")||"{}")}
function saveLocalTrackComments(comments){localStorage.setItem("musicaTrackComments",JSON.stringify(comments))}
function sameUsernameValue(a,b){return String(a||"").trim().toLowerCase()===String(b||"").trim().toLowerCase()}
function renameLocalNamedRows(rows,oldUsername,newUsername){
  return (rows||[]).map(row=>sameUsernameValue(row?.name,oldUsername)||sameUsernameValue(row?.username,oldUsername)?{...row,...(Object.prototype.hasOwnProperty.call(row,"name")?{name:newUsername}:{}),...(Object.prototype.hasOwnProperty.call(row,"username")?{username:newUsername}:{})}:row);
}
function propagateLocalUsernameChange(oldUsername,newUsername){
  if(!newUsername||sameUsernameValue(oldUsername,newUsername))return;
  localStorage.setItem("musicaUsername",newUsername);
  const comments=localComments();
  Object.keys(comments).forEach(ref=>{comments[ref]=renameLocalNamedRows(comments[ref],oldUsername,newUsername)});
  saveLocalComments(comments);
  const replies=localCommentReplies();
  Object.keys(replies).forEach(ref=>{
    Object.keys(replies[ref]||{}).forEach(commentId=>{replies[ref][commentId]=renameLocalNamedRows(replies[ref][commentId],oldUsername,newUsername)});
  });
  saveLocalCommentReplies(replies);
  const trackComments=localTrackComments();
  Object.keys(trackComments).forEach(key=>{trackComments[key]=renameLocalNamedRows(trackComments[key],oldUsername,newUsername)});
  saveLocalTrackComments(trackComments);
  const trackReplies=localTrackCommentReplies();
  Object.keys(trackReplies).forEach(key=>{trackReplies[key]=renameLocalNamedRows(trackReplies[key],oldUsername,newUsername)});
  saveLocalTrackCommentReplies(trackReplies);
  if(typeof localLibraries==="function"&&typeof saveLocalLibraries==="function"){
    const libraries=localLibraries().map(library=>{
      if(!(sameUsernameValue(library.username,oldUsername)||String(library.device_id||"")===String(state.deviceId)))return library;
      return {...library,username:newUsername,title:`${newUsername}'s Library`,updated_at:new Date().toISOString()};
    });
    saveLocalLibraries(libraries);
  }
  extras.libraries=(extras.libraries||[]).map(library=>{
    if(!(sameUsernameValue(library.username,oldUsername)||String(library.device_id||"")===String(state.deviceId)))return library;
    return {...library,username:newUsername,title:`${newUsername}'s Library`,updated_at:new Date().toISOString()};
  });
  Object.values(extras.comments||{}).forEach(rows=>{
    renameLocalNamedRows(rows,oldUsername,newUsername).forEach((row,index)=>{rows[index]=row});
  });
  Object.values(extras.commentReplies||{}).forEach(replyMap=>{
    Object.keys(replyMap||{}).forEach(key=>{replyMap[key]=renameLocalNamedRows(replyMap[key],oldUsername,newUsername)});
  });
}
async function propagateRemoteUsernameChange(oldUsername,newUsername){
  const user=loggedInUser();
  if(!db||!newUsername)return;
  const now=new Date().toISOString();
  const ignore=/column|schema cache|does not exist|relation|permission denied|row-level security/i;
  const attempts=[];
  const run=async promiseFactory=>{
    try{
      const {error}=await promiseFactory();
      if(error&&!ignore.test(error.message||""))console.warn("[Muze profile] Username propagation skipped",error.message||error);
    }catch(error){
      if(!ignore.test(error?.message||""))console.warn("[Muze profile] Username propagation failed",error?.message||error);
    }
  };
  const updateByIdentity=(table,field,payload)=>[
    user?.id&&(()=>db.from(table).update(payload).eq("user_id",user.id)),
    state.deviceId&&(()=>db.from(table).update(payload).eq("device_id",state.deviceId)),
    oldUsername&&(()=>db.from(table).update(payload).ilike(field,oldUsername))
  ].filter(Boolean).forEach(factory=>attempts.push(run(factory)));
  updateByIdentity("user_libraries","username",{username:newUsername,title:`${newUsername}'s Library`,updated_at:now});
  updateByIdentity("ratings","username",{username:newUsername});
  updateByIdentity("track_ratings","username",{username:newUsername});
  updateByIdentity("album_comments","name",{name:newUsername});
  updateByIdentity("track_comments","name",{name:newUsername});
  updateByIdentity("album_comment_replies","name",{name:newUsername});
  await Promise.all(attempts);
}
async function propagateUsernameChange(oldUsername,newUsername){
  const cleanNew=String(newUsername||"").trim();
  if(!cleanNew)return;
  propagateLocalUsernameChange(oldUsername,cleanNew);
  await propagateRemoteUsernameChange(oldUsername,cleanNew);
  await linkCurrentUserLibraryProfile(cleanNew);
}
function localTrackCommentLikes(){try{return JSON.parse(localStorage.getItem("muzeTrackCommentLikes")||"{}")||{}}catch(error){return {}}}
function saveLocalTrackCommentLikes(likes){localStorage.setItem("muzeTrackCommentLikes",JSON.stringify(likes||{}))}
function localTrackCommentReplies(){try{return JSON.parse(localStorage.getItem("muzeTrackCommentReplies")||"{}")||{}}catch(error){return {}}}
function saveLocalTrackCommentReplies(replies){localStorage.setItem("muzeTrackCommentReplies",JSON.stringify(replies||{}))}
function stableTrackCommentKey(row={}){
  const raw=String(row.id||row.local_id||`${row.album_ref||""}|${row.track_key||""}|${row.name||""}|${row.comment||""}|${row.created_at||""}`);
  let hash=0;
  for(let i=0;i<raw.length;i++)hash=((hash<<5)-hash+raw.charCodeAt(i))|0;
  return `track-comment-${Math.abs(hash)}`;
}
function saveLocalTrackRatings(ratings){localStorage.setItem("musicaTrackRatings",JSON.stringify(ratings))}
function profileSongRatingIndex(){try{return JSON.parse(localStorage.getItem("muzeProfileSongRatings")||"{}")||{}}catch(error){return {}}}
function saveProfileSongRatingIndex(index){localStorage.setItem("muzeProfileSongRatings",JSON.stringify(index||{}))}
function profileSongRatingBuckets(identity=profileStatsIdentity()){
  const nameBuckets=(identity.usernames?.length?identity.usernames:[identity.username]).filter(Boolean).map(username=>`name:${String(username).toLowerCase()}`);
  return [identity.userId&&`user:${identity.userId}`,...nameBuckets,identity.deviceId&&`device:${identity.deviceId}`].filter(Boolean);
}
function rememberProfileSongRating(albumId,key,identity=profileStatsIdentity()){
  const ratingKey=`${albumRef(albumId)}::${key}`;
  const index=profileSongRatingIndex();
  profileSongRatingBuckets(identity).forEach(bucket=>{
    index[bucket]=index[bucket]||{};
    index[bucket][ratingKey]=true;
  });
  saveProfileSongRatingIndex(index);
}
function previewPayload(track){return encodeURIComponent(JSON.stringify({url:track.preview_url||"",name:track.name||""}))}
function normalizedTrackName(value){return String(value||"").toLowerCase().replace(/[\u2018\u2019]/g,"'").replace(/[^a-z0-9]+/g," ").trim()}
function mostLovedTrackWhyLine(track){
  const name=String(track?.name||"").trim();
  if(!name)return "Signature album moment";
  return `Signature ${name} moment`;
}
function mostLovedTrackEditorialLine(track){
  const name=String(track?.name||"").trim();
  return name?`${name} rises out of the album as the community's defining replay, the cut that turns a great listen into a shared favorite.`:"The song listeners return to most, a defining replay from the album.";
}
function mostLovedTrackWhyLines(track){
  const name=String(track?.name||"").trim();
  return [
    "Most replayed track on the album",
    "Frequently cited as the defining moment",
    name?`${name} anchors the album experience`:"A defining moment in the album experience"
  ];
}
function setPreviewingButton(button){
  document.querySelectorAll(".isPreviewing").forEach(x=>{
    x.classList.remove("isPreviewing");
    if(x.dataset.playAriaLabel)x.setAttribute("aria-label",x.dataset.playAriaLabel);
    else x.removeAttribute("aria-label");
    if(x.dataset.playLabel&&!x.classList.contains("albumGlanceFact-music"))x.textContent=x.dataset.playLabel
  });
  if(button){
    button.dataset.playLabel=button.dataset.playLabel||button.textContent;
    button.dataset.playAriaLabel=button.dataset.playAriaLabel||button.getAttribute("aria-label")||"Play sample";
    button.classList.add("isPreviewing");
    button.setAttribute("aria-label","Pause sample");
    if(!button.classList.contains("overviewMomentChip")&&!button.classList.contains("albumGlanceFact-music"))button.textContent=""
  }
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
  const attempt=()=>{try{audio.currentTime=0}catch(e){}return audio.play()};
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
window.playOverviewMomentPreview=async function(albumId,trackName,button){
  const album=state.albums.find(x=>albumRef(x.id)===albumRef(albumId));
  if(!album)return;
  setPreviewingButton(button);
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const ref=albumRef(album.id);
  const tracks=(extras.tracks[ref]&&extras.tracks[ref].length)?extras.tracks[ref]:await fetchAlbumTracks(album);
  const wanted=normalizedTrackName(trackName);
  const track=(tracks||[]).find(item=>normalizedTrackName(item.name)===wanted)||(tracks||[]).find(item=>sameCommentTrackKey(item.name,trackName))||(tracks||[]).find(item=>{
    const candidate=normalizedTrackName(item.name);
    return candidate&&wanted&&(candidate.includes(wanted)||wanted.includes(candidate));
  });
  if(!track||!track.preview_url){setPreviewingButton(null);alert("Spotify does not provide a 30 second sample for this track.");return}
  playTrackPreview(previewPayload(track),button);
}
function stopTrackPreview(){releasePreviewAudio();extras.previewKey=null;extras.previewToken=null;setPreviewingButton(null)}function trackKey(track){return String(track.name||track.spotify_id||track.id||"").toLowerCase()}
function canonicalCommentTrackKey(value){
  return normalizedTrackName(String(value||"")
    .replace(/\((?=[^)]*(?:feat|featuring|ft\.?|with))[^)]*\)/gi," ")
    .replace(/\b(?:feat(?:uring)?|ft\.?|with)\b.*$/gi," ")
    .replace(/\((?=[^)]*(?:remaster|mix|version|edit|take|mono|stereo|live|\d{4}))[^)]*\)/gi," ")
    .replace(/\b(?:remaster(?:ed)?|mix|version|edit|take|mono|stereo|live|anniversary|deluxe)\b/gi," ")
    .replace(/\b\d{4}\b/g," "));
}
function sameCommentTrackKey(a,b){
  const rawA=String(a||"").toLowerCase().trim();
  const rawB=String(b||"").toLowerCase().trim();
  const canonicalA=canonicalCommentTrackKey(rawA);
  const canonicalB=canonicalCommentTrackKey(rawB);
  return rawA===rawB||(canonicalA&&canonicalA===canonicalB)||(canonicalA.length>=4&&canonicalB.startsWith(canonicalA+" "))||(canonicalB.length>=4&&canonicalA.startsWith(canonicalB+" "));
}
function uniqueTrackCommentRows(rows=[]){
  const seen=new Set();
  return rows.filter(row=>{
    const key=String(row.id||row.local_id||`${row.name||""}|${row.comment||""}|${row.created_at||""}`);
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  });
}
function localTrackRating(albumId,key){return localTrackRatings()[`${albumRef(albumId)}::${key}`]||null}
function setLocalTrackRating(albumId,key,value){const ratings=localTrackRatings();ratings[`${albumRef(albumId)}::${key}`]=value;saveLocalTrackRatings(ratings)}
function mergeLocalCommentReplies(ref){
  const localReplies=(localCommentReplies()[ref]||{});
  extras.commentReplies[ref]=extras.commentReplies[ref]||{};
  Object.entries(localReplies).forEach(([commentId,rows])=>{
    const key=String(commentId);
    extras.commentReplies[ref][key]=extras.commentReplies[ref][key]||[];
    (rows||[]).forEach(row=>{
      const exists=extras.commentReplies[ref][key].some(item=>String(item.id||"")===String(row.id||"")||(String(item.reply||item.comment||"")===String(row.reply||row.comment||"")&&String(item.name||"")===String(row.name||"")));
      if(!exists)extras.commentReplies[ref][key].push(row);
    });
  });
}
function albumReactionRow(row={}){return {...row,reaction_type:row.reaction_type||"album_comment"}}
function trackCommentReactionRow(row={},ref=""){
  const id=row.id||row.local_id||localId("track-comment");
  return {...row,id,local_id:row.local_id||id,album_ref:row.album_ref||ref,reaction_type:"song_comment"};
}
function extractMentions(text=""){
  const seen=new Set();
  const names=[];
  String(text||"").replace(/(^|[^\w])@([A-Za-z0-9_][A-Za-z0-9_.-]{1,31})/g,(_,prefix,name)=>{
    const clean=String(name||"").replace(/[.]+$/,"").trim();
    const key=clean.toLowerCase();
    if(clean&&!seen.has(key)){seen.add(key);names.push(clean)}
    return _;
  });
  return names;
}
function mentionProfileByName(name=""){
  const key=String(name||"").replace(/^@+/,"").trim().toLowerCase();
  if(!key)return null;
  return (extras.profileDirectory||[]).find(profile=>String(profile.username||profile.name||"").trim().toLowerCase()===key)||null;
}
function mentionCandidateProfiles(query=""){
  const q=String(query||"").trim().toLowerCase().replace(/^@/,"");
  const current=String(currentUsername()||"").toLowerCase();
  const seen=new Set();
  const addProfile=(rows,profile)=>{
    const username=String(profile?.username||profile?.name||"").trim();
    const key=String(profile?.user_id||username||profile?.email||"").toLowerCase();
    if(!username||username.toLowerCase()===current||seen.has(key))return rows;
    if(q&&!username.toLowerCase().includes(q))return rows;
    seen.add(key);
    rows.push(profile);
    return rows;
  };
  const rows=[];
  chatCommunityProfiles(visibleLibraries().filter(l=>!(l.device_id===state.deviceId||l.isMine))).forEach(profile=>addProfile(rows,profile));
  (extras.profileDirectory||[]).forEach(profile=>addProfile(rows,profile));
  return rows.slice(0,8);
}
function activeMentionTrigger(input){
  if(!input)return null;
  const value=String(input.value||"");
  const caret=input.selectionStart??value.length;
  const before=value.slice(0,caret);
  const match=before.match(/(^|[\s([{])@([A-Za-z0-9_.-]{0,31})$/);
  if(!match)return null;
  const start=caret-String(match[2]||"").length-1;
  return {start,end:caret,query:String(match[2]||"")};
}
function mentionInputEligible(input){
  if(!input)return false;
  if(input.id==="chatMessageInput"||input.id==="commentText"||input.id==="trackCommentText")return true;
  return Boolean(input.closest?.(".reactionReplyBox,.listenerReplyBox,.trackCommentReplyBox"));
}
function mentionPickerElement(){
  let picker=$("#muzeMentionPicker");
  if(!picker){
    picker=document.createElement("div");
    picker.id="muzeMentionPicker";
    picker.className="muzeMentionPicker hidden";
    document.body.appendChild(picker);
  }
  return picker;
}
function hideMentionPicker(){
  const picker=$("#muzeMentionPicker");
  if(picker)picker.classList.add("hidden");
  state.mentionTarget=null;
  state.mentionIndex=0;
}
function insertMention(input,username){
  const trigger=activeMentionTrigger(input)||state.mentionTrigger;
  if(!input||!trigger||!username)return;
  const value=String(input.value||"");
  const before=value.slice(0,trigger.start);
  const after=value.slice(trigger.end);
  const next=`${before}@${username} ${after}`;
  input.value=next;
  const caret=before.length+username.length+2;
  input.focus();
  input.setSelectionRange?.(caret,caret);
  input.dispatchEvent(new Event("input",{bubbles:true}));
  hideMentionPicker();
}
function renderMentionPicker(input){
  if(!mentionInputEligible(input)){hideMentionPicker();return}
  const trigger=activeMentionTrigger(input);
  if(!trigger){hideMentionPicker();return}
  const results=mentionCandidateProfiles(trigger.query);
  const picker=mentionPickerElement();
  state.mentionTarget=input;
  state.mentionTrigger=trigger;
  state.mentionResults=results;
  state.mentionIndex=Math.max(0,Math.min(Number(state.mentionIndex||0),Math.max(0,results.length-1)));
  if(!results.length){
    picker.innerHTML='<div class="mentionPickerEmpty">No Muze user found</div>';
  }else{
    picker.innerHTML=results.map((profile,index)=>{
      const username=profile.username||profile.name||"Listener";
      return `<button type="button" class="${index===state.mentionIndex?"active":""}" onmousedown="event.preventDefault();insertMention(state.mentionTarget,'${escapeJsString(username)}')">${chatAvatarMarkup(profile,false,index)}<span><strong>${escapeHtml(username)}</strong><small>@${escapeHtml(username)}</small></span></button>`;
    }).join("");
  }
  const rect=input.getBoundingClientRect();
  picker.style.left=Math.max(10,rect.left)+"px";
  picker.style.width=Math.min(Math.max(rect.width,260),360)+"px";
  picker.classList.remove("hidden");
  const pickerHeight=picker.offsetHeight||120;
  const topAbove=rect.top-pickerHeight-8;
  const topFallback=rect.bottom+8;
  picker.style.top=Math.max(10,topAbove>=10?topAbove:Math.min(window.innerHeight-pickerHeight-10,topFallback))+"px";
}
window.handleMentionInput=function(input){
  loadProfileDirectory().catch(()=>{});
  renderMentionPicker(input);
}
window.handleMentionKeydown=function(event,input){
  const picker=$("#muzeMentionPicker");
  const open=picker&&!picker.classList.contains("hidden")&&state.mentionTarget===input;
  if(!open)return false;
  const results=state.mentionResults||[];
  if(event.key==="ArrowDown"||event.key==="ArrowUp"){
    event.preventDefault();
    if(results.length){
      state.mentionIndex=(Number(state.mentionIndex||0)+(event.key==="ArrowDown"?1:-1)+results.length)%results.length;
      renderMentionPicker(input);
    }
    return true;
  }
  if((event.key==="Enter"||event.key==="Tab")&&results.length){
    event.preventDefault();
    insertMention(input,results[state.mentionIndex]?.username||results[state.mentionIndex]?.name||"");
    return true;
  }
  if(event.key==="Escape"){
    event.preventDefault();
    hideMentionPicker();
    return true;
  }
  return false;
}
document.addEventListener("input",event=>{
  const input=event.target;
  if(mentionInputEligible(input))window.handleMentionInput(input);
});
document.addEventListener("keydown",event=>{
  const input=event.target;
  if(mentionInputEligible(input)&&window.handleMentionKeydown(event,input)){
    event.stopPropagation();
    event.stopImmediatePropagation?.();
  }
},true);
document.addEventListener("click",event=>{
  if(!event.target?.closest?.("#muzeMentionPicker"))hideMentionPicker();
});
function linkedMentionHtml(name){
  const clean=String(name||"").replace(/^@+/,"").trim();
  const profile=mentionProfileByName(clean);
  const action=profile?.user_id?` onclick="startChatWithUser('${escapeJsString(profile.user_id)}')"`:"";
  return `<button type="button" class="muzeMention${profile?" known":""}"${action}>@${escapeHtml(clean)}</button>`;
}
function mentionTextHtml(text=""){
  const raw=String(text||"");
  let last=0;
  let html="";
  raw.replace(/(^|[^\w])@([A-Za-z0-9_][A-Za-z0-9_.-]{1,31})/g,(match,prefix,name,offset)=>{
    const mentionStart=offset+prefix.length;
    html+=escapeHtml(raw.slice(last,mentionStart));
    const clean=String(name||"").replace(/[.]+$/,"").trim();
    const suffix=String(name||"").slice(clean.length);
    html+=clean?linkedMentionHtml(clean):escapeHtml("@"+name);
    html+=escapeHtml(suffix);
    last=offset+match.length;
    return match;
  });
  html+=escapeHtml(raw.slice(last));
  return html;
}
async function createMentionNotifications(text="",context={}){
  const user=loggedInUser();
  const names=extractMentions(text);
  if(!db||!user||!names.length)return;
  await loadProfileDirectory().catch(()=>{});
  const actor=currentUsername()||savedProfileUsername()||"Someone";
  const bodyBase=context.body||`${actor} mentioned you${context.album_title?` on ${context.album_title}`:""}.`;
  await Promise.all(names.map(async name=>{
    let profile=mentionProfileByName(name);
    if(!profile?.user_id)profile=await lookupChatProfileByUsername({name,profile:{username:name},library:{username:name}}).catch(()=>null);
    const recipientId=String(profile?.user_id||"");
    if(!recipientId||recipientId===String(user.id))return;
    try{
      const {error}=await db.from("notifications").insert({
        recipient_id:recipientId,
        actor_id:user.id,
        notification_type:"mention",
        entity_type:context.entity_type||"mention",
        entity_id:context.entity_id||null,
        album_ref:context.album_ref||null,
        album_title:context.album_title||null,
        body:bodyBase
      });
      if(error)throw error;
    }catch(error){
      console.warn("[Muze] Mention notification skipped",error?.message||error);
    }
  }));
}
function reactionDisplayName(row={}){
  const current=String(currentUsername()||savedProfileUsername()||"").trim();
  const raw=String(row.name||row.username||"Listener").trim()||"Listener";
  if(!current)return raw;
  const userId=String(loggedInUser()?.id||state.userProfile?.user_id||"");
  const rowUserId=String(row.user_id||"");
  const rowDeviceId=String(row.device_id||"");
  const aliases=usernameAliases();
  const isMine=(userId&&rowUserId&&rowUserId===userId)||(rowDeviceId&&String(state.deviceId)===rowDeviceId)||aliases.some(alias=>sameUsernameValue(alias,raw));
  return isMine?current:raw;
}
function reactionLikeKey(row={}){
  return reactionDedupeKey(row);
}
function reactionLikeBaseCount(row={}){
  return Math.max(0,Number(row.like_count??row.likes??0)||0);
}
function reactionLiked(row={}){
  const local=localCommentLikes();
  const key=reactionLikeKey(row);
  if(Object.prototype.hasOwnProperty.call(local,key))return Boolean(local[key]);
  return Boolean(row.liked_by_me);
}
function reactionLikeCount(row={}){
  const base=reactionLikeBaseCount(row);
  const liked=reactionLiked(row);
  if(liked&&!row.liked_by_me)return base+1;
  if(!liked&&row.liked_by_me)return Math.max(0,base-1);
  return base;
}
function reactionLikeButton(albumId,row={},className="reactionLikeButton"){
  const liked=reactionLiked(row);
  const count=reactionLikeCount(row);
  const label=liked?"Unlike this reaction":"Like this reaction";
  return `<button type="button" class="${className}${liked?" liked":""}" aria-label="${label}" aria-pressed="${liked?"true":"false"}" onclick="toggleReactionLike('${escapeJsString(albumId)}','${escapeJsString(reactionLikeKey(row))}')"><span aria-hidden="true">${liked?"&#9829;":"&#9825;"}</span> ${count}</button>`;
}
async function createCommentLikeNotification(comment,albumId){
  const user=loggedInUser();
  if(!db||!user||!comment||comment.reaction_type==="song_comment"||!isUuid(comment.id)||!isUuid(comment.user_id))return;
  if(String(comment.user_id)===String(user.id))return;
  const album=state.albums.find(a=>String(a.id)===String(albumId))||{};
  const actor=currentUsername()||savedProfileUsername()||user.email||"Someone";
  const body=`${actor} liked your comment${album.title?` on ${album.title}`:""}.`;
  try{
    const {error}=await db.from("notifications").upsert({
      recipient_id:comment.user_id,
      actor_id:user.id,
      notification_type:"comment_like",
      entity_type:"album_comment",
      entity_id:comment.id,
      album_ref:albumRef(albumId),
      album_title:album.title||"",
      body
    },{onConflict:"recipient_id,actor_id,notification_type,entity_id"});
    if(error)throw error;
  }catch(error){
    console.warn("[Muze] Comment like notification could not be created",error?.message||error);
  }
}
function isUuid(value){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||""));
}
async function hydrateAlbumCommentLikes(rows=[]){
  const user=loggedInUser();
  if(!db||!rows.length)return rows;
  const ids=rows.map(row=>row.id).filter(isUuid);
  if(!ids.length)return rows;
  try{
    const {data,error}=await db.from("album_comment_likes").select("comment_id,user_id").in("comment_id",ids);
    if(error)throw error;
    const counts={};
    const likedByMe=new Set();
    (data||[]).forEach(like=>{
      const id=String(like.comment_id||"");
      counts[id]=(counts[id]||0)+1;
      if(user&&String(like.user_id||"")===String(user.id))likedByMe.add(id);
    });
    rows.forEach(row=>{
      const id=String(row.id||"");
      row.like_count=counts[id]||0;
      row.liked_by_me=likedByMe.has(id);
    });
  }catch(error){
    console.warn("[Muze] Album comment likes could not be loaded",error?.message||error);
  }
  return rows;
}
async function hydrateTrackCommentLikes(rows=[]){
  const user=loggedInUser();
  if(!db||!rows.length)return rows;
  const ids=rows.map(row=>row.id).filter(isUuid);
  if(!ids.length)return rows;
  try{
    const {data,error}=await db.from("track_comment_likes").select("comment_id,user_id").in("comment_id",ids);
    if(error)throw error;
    const counts={};
    const mine={};
    (data||[]).forEach(row=>{
      const id=String(row.comment_id||"");
      if(!id)return;
      counts[id]=(counts[id]||0)+1;
      if(user&&String(row.user_id||"")===String(user.id))mine[id]=true;
    });
    rows.forEach(row=>{
      const id=String(row.id||"");
      if(id&&Object.prototype.hasOwnProperty.call(counts,id))row.like_count=counts[id];
      else if(id)row.like_count=0;
      row.liked_by_me=Boolean(mine[id]);
    });
  }catch(error){
    console.warn("[Muze] Track comment likes could not be loaded",error?.message||error);
  }
  return rows;
}
function reactionDedupeKey(row={}){
  const type=row.reaction_type||"album_comment";
  if(row.id)return `${type}:id:${row.id}`;
  return `${type}:body:${row.track_key||""}:${row.name||""}:${row.comment||row.text||""}:${row.created_at||""}`;
}
function dedupeAndSortReactions(rows=[]){
  const seen=new Set();
  return rows.filter(row=>{
    const key=reactionDedupeKey(row);
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  }).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
}
function localTrackCommentReactions(ref){
  const all=localTrackComments();
  return Object.entries(all).flatMap(([key,rows])=>{
    if(!key.startsWith(ref+"::"))return [];
    const trackKeyValue=key.slice(ref.length+2);
    return (rows||[]).map(row=>trackCommentReactionRow({...row,track_key:row.track_key||trackKeyValue,track_name:row.track_name||trackKeyValue},ref));
  });
}
function addReactionToAlbumState(ref,reaction){
  extras.comments[ref]=dedupeAndSortReactions([reaction,...(extras.comments[ref]||[])]);
  console.log("[Muze] number of reactions loaded",extras.comments[ref].length);
}
async function loadComments(albumId){
  const ref=albumRef(albumId);
  extras.commentReplies[ref]=extras.commentReplies[ref]||{};
  if(db){
    let result=await db.from("album_comments").select("id,user_id,device_id,name,avatar_url,comment,created_at").eq("album_ref",ref).order("created_at",{ascending:false}).limit(30);
    if(result.error&&/column|schema cache|avatar_url|user_id|device_id/i.test(result.error.message||"")){
      result=await db.from("album_comments").select("id,name,comment,created_at").eq("album_ref",ref).order("created_at",{ascending:false}).limit(30);
    }
    const data=result.data, error=result.error;
    if(!error){
      await hydrateAlbumCommentLikes(data||[]);
      let trackRows=[];
      let trackError=null;
      let trackResult=await db.from("track_comments").select("id,user_id,device_id,name,avatar_url,comment,track_key,track_name,created_at").eq("album_ref",ref).order("created_at",{ascending:false}).limit(100);
      if(trackResult.error&&/column|schema cache|avatar_url|user_id|device_id|track_name|id/i.test(trackResult.error.message||"")){
        trackResult=await db.from("track_comments").select("name,comment,track_key,track_name,created_at").eq("album_ref",ref).order("created_at",{ascending:false}).limit(100);
      }
      if(trackResult.error)trackError=trackResult.error;
      else trackRows=(trackResult.data||[]).map(row=>trackCommentReactionRow(row,ref));
      extras.comments[ref]=dedupeAndSortReactions([...(data||[]).map(albumReactionRow),...trackRows,...localTrackCommentReactions(ref)]);
      console.log("[Muze] Listener Reactions query result",{album_ref:ref,album_comments:(data||[]).length,song_comments:trackRows.length,track_error:trackError?.message||null});
      console.log("[Muze] number of reactions loaded",extras.comments[ref].length);
      let replyResult=await db.from("album_comment_replies").select("id,comment_id,user_id,avatar_url,name,reply,created_at").eq("album_ref",ref).order("created_at",{ascending:true}).limit(200);
      if(replyResult.error&&/column|schema cache|avatar_url|user_id/i.test(replyResult.error.message||"")){
        replyResult=await db.from("album_comment_replies").select("id,comment_id,name,reply,created_at").eq("album_ref",ref).order("created_at",{ascending:true}).limit(200);
      }
      const replyRows=replyResult.data, replyError=replyResult.error;
      extras.commentReplies[ref]={};
      if(!replyError)(replyRows||[]).forEach(row=>{const key=String(row.comment_id);extras.commentReplies[ref][key]=extras.commentReplies[ref][key]||[];extras.commentReplies[ref][key].push(row)});
      mergeLocalCommentReplies(ref);
      return extras.comments[ref];
    }
  }
  const local=localComments();
  const changed=(local[ref]||[]).some(c=>!c.id);
  if(changed){local[ref]=(local[ref]||[]).map(c=>c.id?c:{...c,id:localId("comment")});saveLocalComments(local)}
  extras.comments[ref]=dedupeAndSortReactions([...(local[ref]||[]).map(albumReactionRow),...localTrackCommentReactions(ref)]);
  extras.commentReplies[ref]=localCommentReplies()[ref]||{};
  mergeLocalCommentReplies(ref);
  console.log("[Muze] Listener Reactions query result",{album_ref:ref,album_comments:(local[ref]||[]).length,song_comments:localTrackCommentReactions(ref).length,source:"local"});
  console.log("[Muze] number of reactions loaded",extras.comments[ref].length);
  return extras.comments[ref];
}
function renderReactionReply(reply){
  const name=reply.name||"Listener";
  const initial=String(name).trim().slice(0,1).toUpperCase()||"L";
  const replyId=String(reply.id||"");
  const adminDelete=isAdminUnlocked()&&replyId?`<button class="adminTinyDelete" onclick="deleteAlbumReplyAdmin('${escapeJsString(replyId)}')">Delete</button>`:"";
  return `<div class="reactionReply"><div class="reactionReplyAvatar">${escapeHtml(initial)}</div><div><div class="reactionReplyMeta"><strong>${escapeHtml(name)}</strong><span>${timeAgo(reply.created_at)}</span>${adminDelete}</div><p>${mentionTextHtml(reply.reply||reply.comment||reply.text||"")}</p></div></div>`;
}
function timeAgo(value){
  const date=value?new Date(value):new Date();
  const diff=Math.max(0,Date.now()-date.getTime());
  const mins=Math.floor(diff/60000);
  if(mins<1)return "just now";
  if(mins<60)return `${mins}m ago`;
  const hours=Math.floor(mins/60);
  if(hours<24)return `${hours}h ago`;
  const days=Math.floor(hours/24);
  if(days<7)return `${days}d ago`;
  const weeks=Math.floor(days/7);
  if(weeks<5)return `${weeks}w ago`;
  const months=Math.floor(days/30);
  if(months<12)return `${months}mo ago`;
  return `${Math.floor(days/365)}y ago`;
}
function formatReviewDate(value){
  const date=value?new Date(value):new Date();
  if(Number.isNaN(date.getTime()))return "";
  return date.toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"});
}
function localReviewMeta(){return JSON.parse(localStorage.getItem("muzeReviewMeta")||"{}")}
function saveLocalReviewMeta(meta){localStorage.setItem("muzeReviewMeta",JSON.stringify(meta))}
function reviewMetaKey(ref,comment){return String(comment.id||comment.local_id||`${ref}::${comment.name||""}::${comment.created_at||""}::${comment.comment||comment.text||""}`)}
function reviewStarRow(comment){
  const raw=comment.rating||comment.review_rating||comment.stars||comment.score;
  const rating=Math.max(0,Math.min(10,Number(raw||0)));
  if(!rating)return `<div class="reviewStars reviewStarsMuted"><span aria-hidden="true">&#9734;&#9734;&#9734;&#9734;&#9734;</span><em>Listener review</em></div>`;
  const stars=[1,2,3,4,5].map(n=>{
    const full=n*2<=rating;
    const half=!full&&n*2-1<=rating;
    return `<span class="reviewDisplayStar ${full?"full":half?"half":"empty"}" aria-hidden="true">&#9733;</span>`;
  }).join("");
  return `<div class="reviewStars" aria-label="${rating} out of 10"><span class="reviewDisplayStars">${stars}</span><em>${rating}/10</em></div>`;
}
function reviewComposerHtml(albumId){
  const stars=[1,2,3,4,5].map(n=>`<span class="reviewStarShell" data-star="${n}"><span class="reviewStarGlyph">&#9733;</span></span>`).join("");
  return `<div class="linerComposer reviewComposer"><div class="reviewComposerHead"><div><span class="reviewComposerEyebrow">Write a review</span><strong>Share your take on this album</strong></div><div class="reviewStarSelector" aria-label="Choose review rating" role="slider" aria-valuemin="0" aria-valuemax="10" aria-valuenow="0" tabindex="0" onpointerdown="startReviewRatingDrag(event)" onpointermove="moveReviewRatingPointer(event)" onpointerup="finishReviewRatingDrag(event)" onpointercancel="finishReviewRatingDrag(event)" onpointerleave="clearReviewRatingPreview(event)" onkeydown="handleReviewRatingKey(event)">${stars}</div></div><input id="commentReviewRating" type="hidden" value=""><input id="commentTitle" class="reviewTitleInput" maxlength="90" placeholder="Review title (optional)"><textarea id="commentText" maxlength="500" oninput="updateReviewCounter()" placeholder="Write your album review..."></textarea><input id="commentName" type="hidden" value="${escapeHtml(currentUsername()||"Listener")}"><div class="reviewComposerFoot"><span>Keep it honest, useful, and specific.</span><em id="commentCounter">0/500</em><button onclick="addAlbumComment('${escapeJsString(albumId)}')">Post Review</button></div></div>`;
}
function reviewRatingFromPointer(event){
  const host=event.currentTarget?.closest?.(".reviewStarSelector")||event.currentTarget;
  if(!host)return 0;
  const rect=host.getBoundingClientRect();
  const x=Math.max(0,Math.min(rect.width,event.clientX-rect.left));
  return Math.max(1,Math.min(10,Math.ceil((x/rect.width)*10)));
}
function paintReviewDraftRating(value,preview=false){
  const rating=Math.max(0,Math.min(10,Number(value)||0));
  document.querySelectorAll(".reviewStarShell").forEach(shell=>{
    const star=Number(shell.dataset.star||0);
    shell.classList.toggle(preview?"previewFull":"full",Boolean(rating)&&star*2<=rating);
    shell.classList.toggle(preview?"previewHalf":"half",Boolean(rating)&&star*2-1===rating);
    if(!preview){shell.classList.remove("previewFull","previewHalf")}
  });
  const selector=$(".reviewStarSelector");
  if(selector)selector.setAttribute("aria-valuenow",String(rating));
}
window.setReviewDraftRating=function(value){
  const input=$("#commentReviewRating");
  const rating=Math.max(0,Math.min(10,Number(value)||0));
  if(input)input.value=rating?String(rating):"";
  paintReviewDraftRating(rating,false);
}
window.previewReviewDraftRating=function(value){
  document.querySelectorAll(".reviewStarShell").forEach(shell=>shell.classList.remove("previewFull","previewHalf"));
  paintReviewDraftRating(value,true);
}
window.startReviewRatingDrag=function(event){
  const host=event.currentTarget;
  host.dataset.dragging="true";
  host.setPointerCapture?.(event.pointerId);
  setReviewDraftRating(reviewRatingFromPointer(event));
}
window.moveReviewRatingPointer=function(event){
  const rating=reviewRatingFromPointer(event);
  if(event.currentTarget.dataset.dragging==="true")setReviewDraftRating(rating);
  else previewReviewDraftRating(rating);
}
window.finishReviewRatingDrag=function(event){
  const host=event.currentTarget;
  if(host.dataset.dragging==="true")setReviewDraftRating(reviewRatingFromPointer(event));
  host.dataset.dragging="false";
  host.releasePointerCapture?.(event.pointerId);
}
window.clearReviewRatingPreview=function(event){
  if(event.currentTarget.dataset.dragging==="true")return;
  document.querySelectorAll(".reviewStarShell").forEach(shell=>shell.classList.remove("previewFull","previewHalf"));
}
window.handleReviewRatingKey=function(event){
  if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
  event.preventDefault();
  const current=Number($("#commentReviewRating")?.value||0);
  const next=event.key==="Home"?0:event.key==="End"?10:event.key==="ArrowRight"?Math.min(10,current+1):Math.max(0,current-1);
  setReviewDraftRating(next);
}
window.updateReviewCounter=function(){
  const text=$("#commentText");
  const counter=$("#commentCounter");
  if(counter&&text)counter.textContent=`${text.value.length}/500`;
}
window.toggleReactionLike=async function(albumId,likeKey){
  const ref=albumRef(albumId);
  const comments=extras.comments[ref]||[];
  const comment=comments.find(row=>reactionLikeKey(row)===likeKey);
  if(!comment)return;
  const wasLiked=reactionLiked(comment);
  const nextLiked=!wasLiked;
  const local=localCommentLikes();
  local[likeKey]=nextLiked;
  saveLocalCommentLikes(local);
  comment.like_count=Math.max(0,reactionLikeBaseCount(comment)+(nextLiked?1:-1));
  comment.liked_by_me=nextLiked;
  renderComments(albumId);
  const user=loggedInUser();
  const canSync=db&&user&&comment.reaction_type!=="song_comment"&&isUuid(comment.id);
  if(!canSync)return;
  try{
    if(nextLiked){
      const {error}=await db.from("album_comment_likes").upsert({comment_id:comment.id,user_id:user.id},{onConflict:"comment_id,user_id"});
      if(error)throw error;
      await createCommentLikeNotification(comment,albumId);
    }else{
      const {error}=await db.from("album_comment_likes").delete().eq("comment_id",comment.id).eq("user_id",user.id);
      if(error)throw error;
    }
    await loadComments(albumId);
    renderComments(albumId);
  }catch(error){
    console.warn("[Muze] Album comment like could not be synced",error?.message||error);
  }
}
function renderComments(albumId){
  const host=$("#commentsList");
  if(!host)return;
  const ref=albumRef(albumId);
  const comments=extras.comments[ref]||[];
  const replyMap=extras.commentReplies[ref]||{};
  renderListenerCards(comments,albumId);
  const allButton=$("#allReactionsButton");
  if(allButton){
    const total=comments.length||0;
    allButton.querySelector("span:first-child").textContent=`View all ${total||0} reaction${total===1?"":"s"}`;
  }
  const listenerPull=$("#listenerPull");
  if(listenerPull)listenerPull.innerHTML=`<strong>${comments.length}</strong><span>listener reaction${comments.length===1?"":"s"} so far</span>`;
  const localMeta=localReviewMeta();
  host.innerHTML=comments.length?comments.map((rawComment,i)=>{
    const c={...rawComment,...(localMeta[reviewMetaKey(ref,rawComment)]||{})};
    const name=reactionDisplayName(c);
    const initial=String(name).trim().slice(0,1).toUpperCase()||"L";
    const commentId=String(c.id||c.local_id||`${ref}-${i}`);
    const safeId=domSafeId(commentId);
    const replies=replyMap[commentId]||[];
    const repliesHtml=replies.length?replies.map(renderReactionReply).join(""):`<p class="noRepliesYet">No replies yet.</p>`;
    const isSongReaction=c.reaction_type==="song_comment";
    const trackLine=isSongReaction&&c.track_name?`<span class="songReactionTrack">on &ldquo;${escapeHtml(c.track_name)}&rdquo;</span>`:"";
    const adminDelete=isAdminUnlocked()&&!isSongReaction&&commentId?`<button class="adminTinyDelete" onclick="deleteAlbumCommentAdmin('${escapeJsString(albumId)}','${escapeJsString(commentId)}')">Delete</button>`:"";
    const likes=reactionLikeButton(albumId,c,"reactionLikeButton");
    const title=c.title||c.review_title||c.headline||"";
    const reviewDate=formatReviewDate(c.created_at);
    return `<article class="linerReaction reviewItem" data-comment-id="${escapeHtml(commentId)}">${avatarMarkupForAuthor(c,name,"reactionAvatar reviewAvatar")}<div class="reactionBody reviewBody"><div class="reactionMeta reviewMeta"><strong>${escapeHtml(name)}</strong><span class="verifiedListener">Verified Listener</span>${trackLine}</div><div class="reviewRatingLine">${reviewStarRow(c)}${reviewDate?`<span class="reviewDate">Reviewed on ${escapeHtml(reviewDate)}</span>`:""}</div>${title?`<h4 class="reviewTitle">${escapeHtml(title)}</h4>`:""}<p>${mentionTextHtml(c.comment||c.text||"")}</p><div class="reactionActions reviewActions">${likes}<button onclick="openReactionReplyBox('${escapeJsString(albumId)}','${escapeJsString(commentId)}','${escapeJsString(name)}')">Reply</button>${adminDelete}</div>${replies.length?`<button class="viewReplies" onclick="toggleReactionReplies(this)">Hide ${replies.length} ${replies.length===1?"reply":"replies"}</button>`:""}<div id="reactionReplies-${safeId}" class="reactionReplies">${repliesHtml}</div><div id="reactionReplyBox-${safeId}" class="reactionReplyBox hidden"><textarea maxlength="300" placeholder="Reply to ${escapeHtml(name)}..."></textarea><div class="reactionReplyControls"><button onclick="submitReactionReply('${escapeJsString(albumId)}','${escapeJsString(commentId)}')">Reply</button><button type="button" onclick="closeReactionReplyBox('${escapeJsString(commentId)}')">Cancel</button></div></div></div><button class="reactionMore" onclick="toggleReactionMenu(this)">???</button></article>`
  }).join(""):`<div class="emptyMini albumReactionEmpty">What moment on this album hits hardest?</div>`;
}
window.addAlbumComment=async function(albumId){
  if(!requireAuth("review",()=>window.addAlbumComment(albumId)))return;
  const nameInput=$("#commentName"), textInput=$("#commentText");
  const name=(nameInput?.value||"Listener").trim()||"Listener";
  const comment=(textInput?.value||"").trim();
  const reviewTitle=($("#commentTitle")?.value||"").trim();
  const reviewRating=Number($("#commentReviewRating")?.value||0);
  if(!comment)return;
  const ref=albumRef(albumId);
  const reviewMeta={};
  if(reviewTitle)reviewMeta.title=reviewTitle;
  if(reviewRating)reviewMeta.rating=reviewRating;
  if(db){
    const profile=commentProfilePayload();
    const insertRow={album_ref:ref,device_id:state.deviceId,name,comment,...profile};
    let result=await db.from("album_comments").insert(insertRow).select("id,user_id,name,avatar_url,comment,created_at").single();
    if(result.error&&/column|schema cache|avatar_url|user_id/i.test(result.error.message||"")){
      result=await db.from("album_comments").insert({album_ref:ref,device_id:state.deviceId,name,comment}).select("id,name,comment,created_at").single();
    }
    const data=result.data, error=result.error;
    if(error){
      const all=localComments();
      all[ref]=all[ref]||[];
      all[ref].push({id:localId("comment"),name,comment,created_at:new Date().toISOString(),...profile,...reviewMeta});
      saveLocalComments(all);
    }else if(Object.keys(reviewMeta).length){
      const meta=localReviewMeta();
      meta[reviewMetaKey(ref,data||{})]=reviewMeta;
      saveLocalReviewMeta(meta);
    }
  }else{
    const profile=commentProfilePayload();
    const all=localComments();
    all[ref]=all[ref]||[];
    all[ref].push({id:localId("comment"),name,comment,created_at:new Date().toISOString(),...profile,...reviewMeta});
    saveLocalComments(all);
  }
  textInput.value="";
  if($("#commentTitle"))$("#commentTitle").value="";
  if($("#commentReviewRating"))$("#commentReviewRating").value="";
  window.setReviewDraftRating(0);
  window.updateReviewCounter();
  await loadComments(albumId);
  const album=state.albums.find(item=>String(item.id)===String(albumId))||{};
  await createMentionNotifications(comment,{entity_type:"album_comment",album_ref:ref,album_title:album.title||""});
  renderComments(albumId);
}
function fallbackAlbumTracks(album){
  const title=normalizeAlbumName(album?.title||"");
  const artist=normalizeAlbumName(album?.artist||"");
  const make=names=>names.map((name,i)=>({name,track_number:i+1,spotify_id:`fallback-${artist}-${title}-${i+1}`,preview_url:"",preview_source:"",duration_ms:0}));
  const rawTitle=String(album?.title||"").trim().toLowerCase();
  if(artist==="ed sheeran"&&(title.includes("subtract")||rawTitle==="-"||rawTitle.includes("subtract")))return make([
    "Boat","Salt Water","Eyes Closed","Life Goes On","Dusty","End of Youth","Colourblind","Curtains","Borderline","Spark","Vega","Sycamore","No Strings","The Hills of Aberfeldy"
  ]);
  if(artist==="lynyrd skynyrd"&&title.includes("endangered species"))return make([
    "Down South Jukin'","Heartbreak Hotel","Devil In The Bottle","Things Goin' On","Saturday Night Special","Sweet Home Alabama","I Ain't The One","Am I Losin'","All I Have Is A Song","Poison Whiskey","Good Luck, Bad Luck","The Last Rebel","Hillbilly Blues"
  ]);
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
async function findItunesTrackPreview(trackName,artistName,album=null){
  if(!trackName||!artistName)return null;
  try{
    const url=`https://itunes.apple.com/search?term=${encodeURIComponent(`${trackName} ${artistName}`)}&media=music&entity=song&limit=5`;
    const res=await fetchWithTimeout(url,{cache:"force-cache"},3500);
    if(!res.ok)return null;
    const data=await res.json();
    const wantedTrack=normalizeAlbumName(trackName);
    const wantedArtist=normalizeAlbumName(artistName);
    const candidates=data.results||[];
    const matchingTrack=item=>{
      const itemTrack=normalizeAlbumName(item.trackName);
      const itemArtist=normalizeAlbumName(item.artistName);
      return item.previewUrl&&itemArtist.includes(wantedArtist.split(" ")[0])&&(itemTrack===wantedTrack||itemTrack.includes(wantedTrack)||wantedTrack.includes(itemTrack));
    };
    const wantedAlbum=normalizeAlbumName(album?.title||"");
    const albumMatch=album&&wantedAlbum?candidates.find(item=>matchingTrack(item)&&normalizeAlbumName(item.collectionName)===wantedAlbum):null;
    const match=albumMatch||candidates.find(matchingTrack)||candidates.find(item=>item.previewUrl&&normalizeAlbumName(item.artistName).includes(wantedArtist.split(" ")[0]));
    return match?{preview_url:match.previewUrl,preview_source:"itunes",duration_ms:match.trackTimeMillis||0,single_art_url:String(match.artworkUrl100||"").replace("100x100bb","600x600bb"),single_art_collection:match.collectionName||"",single_art_artist:match.artistName||""}:null;
  }catch(e){return null}
}
async function enrichFallbackTrackPreviews(album,tracks){
  if(!tracks.length)return tracks;
  const previews=await Promise.all(tracks.map(track=>findItunesTrackPreview(track.name,album.artist,album)));
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
  return (data.results||[]).filter(x=>x.wrapperType==="track").map((x,i)=>({name:x.trackName,track_number:x.trackNumber||i+1,spotify_id:String(x.trackId||x.trackName),preview_url:x.previewUrl||"",preview_source:x.previewUrl?"itunes":"",duration_ms:x.trackTimeMillis||0,single_art_url:String(x.artworkUrl100||"").replace("100x100bb","600x600bb"),single_art_collection:x.collectionName||"",single_art_artist:x.artistName||""}));
}
async function searchItunesAlbums(query){
  const res=await fetchWithTimeout(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=album&limit=10`,{cache:"no-store"},6000);
  if(!res.ok)return [];
  const data=await res.json();
  return (data.results||[]).filter(item=>item.collectionName&&item.artistName).map(item=>({
    spotify_id:"",
    title:item.collectionName||"",
    artist:item.artistName||"",
    year:item.releaseDate?String(item.releaseDate).slice(0,4):"",
    cover_url:String(item.artworkUrl100||"").replace("100x100bb","600x600bb"),
    spotify_url:`https://open.spotify.com/search/${encodeURIComponent(`${item.collectionName||""} ${item.artistName||""}`)}`,
    summary:`${item.collectionName||"This album"} by ${item.artistName||"the artist"}.`
  }));
}
function edSheeranSymbolAlbumKey(title,artist){
  if(normalizeAlbumName(artist)!=="ed sheeran")return "";
  const raw=String(title||"").trim().toLowerCase();
  const clean=normalizeAlbumName(title);
  if(raw==="-"||clean.includes("subtract")||clean.includes("minus"))return "subtract";
  if(raw==="÷"||clean.includes("divide"))return "divide";
  if(raw==="x"||clean==="x"||clean.includes("multiply"))return "multiply";
  if(raw==="+"||clean.includes("plus"))return "plus";
  if(raw==="="||clean.includes("equals"))return "equals";
  return "";
}
function spotifyAlbumCandidateScore(candidate,album){
  const wantedEdKey=edSheeranSymbolAlbumKey(album?.title,album?.artist);
  if(wantedEdKey){
    const candidateEdKey=edSheeranSymbolAlbumKey(candidate?.title,candidate?.artist);
    if(candidateEdKey!==wantedEdKey)return 0;
  }
  const title=normalizeAlbumName(album?.title||"");
  const artist=normalizeAlbumName(album?.artist||"");
  const candidateTitle=normalizeAlbumName(candidate?.title||"");
  const candidateArtist=normalizeAlbumName(candidate?.artist||"");
  if(!artist||!candidateArtist)return 0;
  if(!title&&!wantedEdKey)return 0;
  const artistToken=artist.split(" ")[0];
  let score=wantedEdKey?70:0;
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
    const res=await fetchWithTimeout(`/.netlify/functions/album-search?q=${encodeURIComponent(query)}&v=resolve-genre3`,{cache:"no-store"},8000);
    if(!res.ok)return album;
    const data=await res.json();
    const match=(data.albums||[]).map(item=>({item,score:spotifyAlbumCandidateScore(item,album)})).filter(x=>x.score>=55).sort((a,b)=>b.score-a.score)[0]?.item;
    if(!match?.spotify_id)return album;
    album.spotify_id=match.spotify_id;
    album.spotify_url=album.spotify_url||match.spotify_url||"";
    album.cover_url=album.cover_url||match.cover_url||"";
    album.genre=albumGenreLabel({...album,...match});
    album.artist_genres=match.artist_genres||album.artist_genres||[];
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
  const pinnedTracks=fallbackAlbumTracks(album);
  if(pinnedTracks.length){
    const tracks=await enrichFallbackTrackPreviews(album,pinnedTracks);
    extras.tracks[ref]=tracks;
    return tracks;
  }
  let tracks=[];
  try{tracks=await requestSpotifyTracks(album,"v24-pinned-tracklists")}catch(e){}
  if(!tracks.length){
    const hadSpotifyId=!!album.spotify_id;
    album=await resolveSpotifyAlbum(album,true);
    try{tracks=await requestSpotifyTracks(album,"v25-pinned-tracklists")}catch(e){}
    if(tracks.length&&!hadSpotifyId)saveResolvedSpotifyId(album);
  }
  if(!tracks.length)tracks=await fetchTracksFromItunes(album).catch(()=>[]);
  if(!tracks.length)tracks=fallbackAlbumTracks(album);
  tracks=await enrichFallbackTrackPreviews(album,tracks);
  extras.tracks[ref]=tracks;
  return tracks;
}
async function loadSongScores(albumId){
  const ref=albumRef(albumId);
  if(db){
    const {data,error}=await db.from("song_scores").select("track_key,track_name,avg_rating,ratings_count").eq("album_ref",ref);
    if(!error){const mapped={};(data||[]).forEach(s=>{mapped[s.track_key]=s;if(s.track_name)mapped[String(s.track_name).toLowerCase()]=s});extras.songScores[ref]=mapped;return extras.songScores[ref]}
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
function applyOptimisticSongScore(albumId,trackKeyValue,trackName,value,previousValue=0){
  const ref=albumRef(albumId);
  const scores={...(extras.songScores[ref]||{})};
  const nameKey=trackName?String(trackName).toLowerCase():"";
  const existing=scores[trackKeyValue]||(nameKey?scores[nameKey]:null)||null;
  const next=Number(value)||0;
  const previous=Number(previousValue)||0;
  let count=Number(existing?.ratings_count||0);
  let average=Number(existing?.avg_rating||0);
  if(count<=0){count=1;average=next;}
  else if(previous){average=((average*count)-previous+next)/count;}
  else{average=((average*count)+next)/(count+1);count+=1;}
  const row={...(existing||{}),track_key:trackKeyValue,track_name:trackName,avg_rating:average,ratings_count:count};
  scores[trackKeyValue]=row;
  if(nameKey)scores[nameKey]=row;
  extras.songScores[ref]=scores;
  extras.trackRatings[ref]={...(extras.trackRatings[ref]||{}),[trackKeyValue]:next};
  if(nameKey)extras.trackRatings[ref][nameKey]=next;
  return row;
}
function displaySongCount(score){if(!score||Number(score.ratings_count)<=0)return "No ratings";const total=Number(score.ratings_count);return total.toLocaleString()+" rating"+(total===1?"":"s")}

function cleanTrackVibeTitle(track){
  return String(track?.name||"").toLowerCase().replace(/\s*\([^)]*remaster[^)]*\)/g,"").replace(/\s*\[[^\]]+\]/g,"").replace(/\b\d{4}\s+remaster\b/g,"").trim();
}
function addVibeCandidate(list,tag,weight,category){
  const blocked={classic:1,driving:1,moody:1,atmospheric:1,focused:1,"guitar-driven":1,"groove-heavy":1,"riff-led":1};
  if(!tag||blocked[tag])return;
  const existing=list.find(item=>item.tag===tag);
  if(existing){existing.weight+=weight;return;}
  list.push({tag,weight,category:category||"tone"});
}
function addKnownSongVibe(list,name){
  if(/\bpurple haze\b/.test(name)){addVibeCandidate(list,"psychedelic",135,"atmosphere");return true;}
  if(/^fire\b|\bfire\b/.test(name)){addVibeCandidate(list,"explosive",135,"energy");return true;}
  if(/\bwind cries mary\b/.test(name)){addVibeCandidate(list,"yearning",132,"emotion");return true;}
  if(/\bhey joe\b/.test(name)){addVibeCandidate(list,"brooding",134,"emotion");return true;}
  if(/\ball along the watchtower\b|\bwatchtower\b/.test(name)){addVibeCandidate(list,"epic",138,"atmosphere");return true;}
  if(/\bstone free\b/.test(name)){addVibeCandidate(list,"defiant",132,"emotion");return true;}
  if(/\bcrosstown traffic\b/.test(name)){addVibeCandidate(list,"playful",132,"emotion");return true;}
  if(/\bmanic depression\b/.test(name)){addVibeCandidate(list,"restless",136,"energy");return true;}
  if(/\blittle wing\b/.test(name)){addVibeCandidate(list,"tender",134,"emotion");return true;}
  if(/\bvoodoo child|\bvoodoo chile/.test(name)){addVibeCandidate(list,"thunderous",134,"energy");return true;}
  return false;
}
function trackVibeCandidates(track,{index=0,total=0}={}){
  const name=cleanTrackVibeTitle(track);
  const duration=Number(track?.duration_ms||0);
  const list=[];
  const matchedKnown=addKnownSongVibe(list,name);
  if(/purple|haze|psychedelic|lucy|magic|acid|kaleidoscope|strange brew/.test(name))addVibeCandidate(list,"psychedelic",96,"atmosphere");
  if(/fire|burn|wild|electric|riot|rage|storm|thunder|smash|blast|eruption|kickstart|barracuda/.test(name))addVibeCandidate(list,"explosive",94,"energy");
  if(/watchtower|tower|city|street|avenue|empire|cinema|scene|picture|vision|new york state/.test(name))addVibeCandidate(list,"cinematic",90,"atmosphere");
  if(/wing|dream|sleep|float|cloud|moon|sky|star|heaven|angel|lucy/.test(name))addVibeCandidate(list,"dreamlike",88,"atmosphere");
  if(/wind|rain|river|sea|ocean|blue|winter|autumn|mist|memory|yesterday/.test(name))addVibeCandidate(list,"reflective",86,"emotion");
  if(/love|heart|sweet|tender|baby|kiss|darling|honey|dear|something/.test(name))addVibeCandidate(list,"tender",88,"emotion");
  if(/cry|cries|tears|lonely|alone|hurt|broken|trouble|goodbye|mary|wish|want|need/.test(name))addVibeCandidate(list,"yearning",90,"emotion");
  if(/depression|ghost|haunt|shadow|grave|black|fear|paranoid|joe|murder|bullet/.test(name))addVibeCandidate(list,"haunted",88,"emotion");
  if(/brood|bad moon|riders|grave|joe|murder|wanted/.test(name))addVibeCandidate(list,"brooding",91,"emotion");
  if(/free|freedom|rebel|won't|aint|ain't|no more|stand|fight|refuse/.test(name))addVibeCandidate(list,"defiant",86,"emotion");
  if(/traffic|run|rush|speed|train|highway|road|motor|machine|drive/.test(name))addVibeCandidate(list,"restless",88,"energy");
  if(/crosstown|dance|party|shake|move|swing|monkey|twist|jump/.test(name))addVibeCandidate(list,"playful",90,"emotion");
  if(/soul|spirit|prayer|lord|god|church|saint|hallelujah/.test(name))addVibeCandidate(list,"spiritual",88,"atmosphere");
  if(/gold|sun|light|shine|morning|smile|happy|beautiful day/.test(name))addVibeCandidate(list,"euphoric",84,"emotion");
  if(/victory|king|queen|crown|glory|hero|champion/.test(name))addVibeCandidate(list,"triumphant",86,"emotion");
  if(/manic|panic|pressure|urgent|now|alarm|watchtower|chase/.test(name))addVibeCandidate(list,"urgent",90,"energy");
  if(/night|midnight|after dark|moon|neon/.test(name))addVibeCandidate(list,"nocturnal",84,"atmosphere");
  if(/hypnot|loop|trance|spell|voodoo/.test(name))addVibeCandidate(list,"hypnotic",86,"atmosphere");
  if(/swagger|strut|walk this way|money|boss/.test(name))addVibeCandidate(list,"swaggering",86,"emotion");
  if(/epic|kashmir|stairway|bohemian|symphony/.test(name))addVibeCandidate(list,"epic",88,"atmosphere");
  if(duration&&duration<145000)addVibeCandidate(list,"urgent",42,"energy");
  if(duration&&duration>330000)addVibeCandidate(list,"epic",42,"atmosphere");
  if(duration&&duration>420000)addVibeCandidate(list,"hypnotic",46,"atmosphere");
  if(track?.explicit)addVibeCandidate(list,"raw",50,"energy");
  if(!matchedKnown&&index===0)addVibeCandidate(list,"urgent",22,"energy");
  if(!matchedKnown&&total&&index===total-1)addVibeCandidate(list,"melancholic",24,"emotion");
  addVibeCandidate(list,"restless",14+(index%3)*6,"energy");
  addVibeCandidate(list,"simmering",12+((index+1)%4)*5,"energy");
  addVibeCandidate(list,"hypnotic",10+((index+2)%5)*4,"atmosphere");
  return list.sort((a,b)=>b.weight-a.weight);
}
function vibeCandidateRank(candidate){
  const categoryRank={emotion:420,atmosphere:330,energy:260,musical:80,tone:120};
  const avoidPenalty={raw:30,simmering:55,vulnerable:20,reflective:12};
  return (categoryRank[candidate?.category]||0)+Number(candidate?.weight||0)-Number(avoidPenalty[candidate?.tag]||0);
}
function chooseSingleTrackVibe(candidates,counts){
  const sorted=(candidates||[]).slice().sort((a,b)=>vibeCandidateRank(b)-vibeCandidateRank(a));
  const fallbackPool=[
    {tag:"restless",category:"energy",weight:62},
    {tag:"hypnotic",category:"atmosphere",weight:60},
    {tag:"defiant",category:"emotion",weight:58},
    {tag:"nocturnal",category:"atmosphere",weight:56},
    {tag:"haunted",category:"emotion",weight:54},
    {tag:"euphoric",category:"emotion",weight:52},
    {tag:"dreamlike",category:"atmosphere",weight:50},
    {tag:"yearning",category:"emotion",weight:48},
    {tag:"epic",category:"atmosphere",weight:46},
    {tag:"swaggering",category:"emotion",weight:44},
    {tag:"melancholic",category:"emotion",weight:42},
    {tag:"thunderous",category:"energy",weight:40}
  ];
  const pick=(candidate,ignoreCount=false)=>{
    if(!candidate?.tag||candidate.tag==="classic"||candidate.tag==="driving"||candidate.tag==="moody"||candidate.tag==="atmospheric")return "";
    if(!ignoreCount&&(counts[candidate.tag]||0)>=2)return "";
    counts[candidate.tag]=(counts[candidate.tag]||0)+1;
    return candidate.tag;
  };
  for(const candidate of sorted){
    const tag=pick(candidate);
    if(tag)return tag;
  }
  for(const candidate of fallbackPool){
    const tag=pick(candidate);
    if(tag)return tag;
  }
  return pick(sorted[0],true)||"simmering";
}
function buildTrackVibeMap(tracks,{albumId,album,ratings={},songScores={}}={}){
  const counts={};
  const map={};
  tracks.forEach((track,index)=>{
    const key=trackKey(track);
    const candidates=trackVibeCandidates(track,{index,total:tracks.length,album});
    map[key]=chooseSingleTrackVibe(candidates,counts);
  });
  return map;
}
function trackLiveVibe(track,context={}){
  return chooseSingleTrackVibe(trackVibeCandidates(track,context),{});
}
async function loadTrackRatings(albumId){
  const ref=albumRef(albumId);
  if(db){
    const {data,error}=await db.from("track_ratings").select("track_key,track_name,rating").eq("album_ref",ref).eq("device_id",state.deviceId);
    if(!error){const mapped={};(data||[]).forEach(r=>{mapped[r.track_key]=r.rating;rememberProfileSongRating(albumId,r.track_key);if(r.track_name)mapped[String(r.track_name).toLowerCase()]=r.rating});extras.trackRatings[ref]=mapped;return extras.trackRatings[ref]}
  }
  const local=localTrackRatings();
  extras.trackRatings[ref]=Object.fromEntries(Object.entries(local).filter(([k])=>k.startsWith(ref+"::")).map(([k,v])=>[k.slice(ref.length+2),v]));
  Object.keys(extras.trackRatings[ref]||{}).forEach(key=>rememberProfileSongRating(albumId,key));
  return extras.trackRatings[ref];
}
function trackCommentCountsForAlbum(albumId){
  const ref=albumRef(albumId);
  const counts={};
  const addCount=(key,amount=1)=>{
    const raw=String(key||"");
    if(!raw)return;
    counts[raw]=(counts[raw]||0)+amount;
    const canonical=canonicalCommentTrackKey(raw);
    if(canonical&&canonical!==raw)counts[canonical]=(counts[canonical]||0)+amount;
  };
  (extras.comments[ref]||[]).forEach(row=>{
    if(row?.reaction_type!=="song_comment")return;
    addCount(row.track_key||row.track_name,1);
    if(row.track_key&&row.track_name&&!sameCommentTrackKey(row.track_key,row.track_name))addCount(row.track_name,1);
  });
  Object.entries(localTrackComments()).forEach(([storageKey,rows])=>{
    if(!storageKey.startsWith(ref+"::"))return;
    const key=storageKey.slice(ref.length+2);
    addCount(key,(rows||[]).length);
  });
  return counts;
}
function trackCommentCountForTrack(counts,key,trackName){
  const options=[key,trackName,canonicalCommentTrackKey(key),canonicalCommentTrackKey(trackName)].filter(Boolean);
  return Math.max(0,...options.map(option=>Number(counts[option]||0)||0));
}
function trackCommentButtonHtml(albumId,key,trackName,count=0){
  const safeCount=Math.max(0,Number(count||0));
  const badge=safeCount?`<span class="trackCommentBadge">${safeCount>99?"99+":safeCount}</span>`:"";
  return `<button class="trackDots trackCommentBubble" onclick="openTrackComments('${escapeJsString(albumId)}','${escapeJsString(key)}','${escapeJsString(trackName)}')" aria-label="Open ${safeCount} comment${safeCount===1?"":"s"} for ${escapeHtml(trackName)}"><span class="trackCommentEmoji" aria-hidden="true">&#128172;</span>${badge}</button>`;
}
function trackShareButtonHtml(albumId,key,trackName){
  return `<button class="trackShareButton" onclick="openTrackShareSheet(event,'${escapeJsString(albumId)}','${escapeJsString(key)}','${escapeJsString(trackName)}')" aria-label="Share ${escapeHtml(trackName)}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="3.2"></circle><circle cx="18" cy="6" r="3.2"></circle><circle cx="18" cy="18" r="3.2"></circle><path d="M8.8 10.5 15.2 7.5M8.8 13.5l6.4 3"></path></svg></button>`;
}
function trackArtworkAllowedForAlbum(track,album){
  const collection=normalizeAlbumName(track?.single_art_collection||track?.collectionName||track?.album_name||"");
  if(!collection)return true;
  const albumTitle=normalizeAlbumName(album?.title||"");
  const trackTitle=normalizeAlbumName(track?.name||"");
  const compilationPattern=/\b(legend|greatest hits|best of|collection|essential|anthology|gold|platinum|definitive|ultimate|very best|singles)\b/i;
  if(compilationPattern.test(collection)&&albumTitle&&!collection.includes(albumTitle))return false;
  if(albumTitle&&(collection===albumTitle||collection.includes(albumTitle)||albumTitle.includes(collection)))return true;
  if(trackTitle&&(collection===trackTitle||collection.includes(trackTitle)||trackTitle.includes(collection)))return true;
  return false;
}
function featuredTrackArtworkUrl(track,album,fallback=""){
  const candidates=[
    {url:track?.single_art_url,strict:true},
    {url:track?.artwork_url,strict:false},
    {url:track?.album_art_url,strict:false}
  ];
  for(const candidate of candidates){
    const url=String(candidate.url||"").trim();
    if(!url)continue;
    if(!candidate.strict||trackArtworkAllowedForAlbum(track,album))return url;
  }
  return fallback;
}
function muzeTrackUrl(albumId,trackKeyValue){
  const url=new URL(location.href);
  url.searchParams.set("album",String(albumId||""));
  url.searchParams.set("track",String(trackKeyValue||""));
  url.hash="track";
  return url.href;
}
function renderTrackList(albumId,suppliedTracks=null){
  const host=$("#trackRatingsList");
  if(!host)return;
  const ref=albumRef(albumId);
  const tracks=Array.isArray(suppliedTracks)?suppliedTracks:(extras.tracks[ref]||[]);
  if(Array.isArray(suppliedTracks))extras.tracks[ref]=suppliedTracks;
  const ratings=extras.trackRatings[ref]||{};
  const songScores=extras.songScores[ref]||{};
  const album=state.albums.find(a=>String(a.id)===String(albumId))||{};
  if(!tracks.length){host.innerHTML='<div class="emptyMini">No track list found for this album yet.</div>';return}
  const savedOverview=albumOverviewRow(album);
  const lovedKey=String(savedOverview.loved_track_key||"");
  const first=tracks.find(track=>trackKey(track)===lovedKey)||tracks[0];
  const firstKey=trackKey(first);
  const firstScore=displaySongScore(songScores[firstKey]).replace("No rating","")||displayScore(album);
  const firstDuration=first.duration_ms?Math.floor(first.duration_ms/60000)+":"+String(Math.floor((first.duration_ms%60000)/1000)).padStart(2,"0"):"";
  const coverHtml=album.cover_url?'<img src="'+escapeHtml(album.cover_url)+'" alt="">':'<strong>'+escapeHtml(String(album.title||"?").slice(0,1))+'</strong>';
  const momentFocus=savedOverview.moment_focus||albumMomentFocus(album);
  const momentCover=albumMomentImage(album)||album.cover_url||"";
  const heroScene=albumHeroSceneImage(album)||album.cover_url||momentCover||"";
  const coverStyle=(album.cover_url||momentCover||heroScene)?` style="--album-cover:url('${escapeHtml(album.cover_url||momentCover)}');--hero-scene:url('${escapeHtml(heroScene)}');--moment-cover:url('${escapeHtml(momentCover||album.cover_url||heroScene||"")}');--moment-focus:${escapeHtml(momentFocus)}"`:"";
  const lovedAdmin=isAdminUnlocked()?`<div class="mostLovedAdminControls"><button class="pickLovedTrackBtn" onclick="pickMostLovedTrack('${escapeJsString(albumId)}')">Pick most loved song</button><button class="pickLovedTrackBtn" onclick="uploadAlbumVisualImage('${escapeJsString(albumId)}','moment')">Upload banner image</button><button class="pickLovedTrackBtn" onclick="setMomentImageFocus('${escapeJsString(albumId)}')">Move banner image</button></div>`:"";
  const expanded=host.dataset.expanded==="true";
  const visibleTracks=expanded?tracks:tracks.slice(0,8);
  const trackVibes=buildTrackVibeMap(tracks,{albumId,album,ratings,songScores});
  const trackCommentCounts=trackCommentCountsForAlbum(albumId);
  const rows=visibleTracks.map((track,i)=>{
    const key=trackKey(track);
    const current=ratings[key]||localTrackRating(albumId,key);
    const scoreData=songScores[key];
    let score=displaySongScore(scoreData);
    if(score==="-"&&current)score=Number(current).toFixed(1);
    if(score==="-")score="";
    const scoreHtml=score?`&#9733; <span class="trackScoreNumber">${escapeHtml(score)}</span>`:"&#9733;";
    const trackVibe=trackVibes[key]||trackLiveVibe(track,{index:i,total:tracks.length,album});
    const lovedRowAdmin=trackCommentButtonHtml(albumId,key,track.name,trackCommentCountForTrack(trackCommentCounts,key,track.name));
    const shareButton=trackShareButtonHtml(albumId,key,track.name);
    return `<div class="linerTrackRow" data-track-key="${escapeHtml(key)}"><div class="linerTrackSwipe"><span class="trackNo">${i+1}</span><button class="trackPulse ${track.preview_url?'':'noPreview'}" title="${track.preview_url?'Play 30 second sample':'No Spotify sample available'}" onclick="playTrackPreview('${previewPayload(track)}',this)">&#9654;</button><strong>${escapeHtml(track.name)} <span class="rowPlayingWaves" aria-hidden="true"><i></i><i></i><i></i><i></i></span></strong>${shareButton}<button class="trackRowScore" onclick="openTrackRating('${escapeJsString(albumId)}','${escapeJsString(key)}','${escapeJsString(track.name)}')">${scoreHtml}</button><span class="trackVibePill">${escapeHtml(trackVibe)}</span>${lovedRowAdmin}</div></div>`;
  }).join("");
  const singleArtUrl=featuredTrackArtworkUrl(first,album,album.cover_url||momentCover||heroScene||"");
  const singleArtHtml=singleArtUrl?`<img src="${escapeHtml(singleArtUrl)}" alt="${escapeHtml(first.name)} artwork">`:coverHtml;
  const featuredHtml=`<section class="linerFeaturedTrack ${isAdminUnlocked()?"canDragMoment":""}" data-album-id="${escapeHtml(albumId)}"${coverStyle}><div class="momentIcon">&#9829;</div><button class="featurePlay ${first.preview_url?'':'noPreview'}" title="${first.preview_url?'Play 30 second sample':'No Spotify sample available'}" onclick="playTrackPreview('${previewPayload(first)}',this)">&#9654;</button><div class="featureTrackCopy"><span>Most loved track</span><h4>${escapeHtml(first.name)} <span class="featuredPlayingWaves" aria-hidden="true"><i></i><i></i><i></i><i></i></span></h4><div class="featureWave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><p>${escapeHtml(mostLovedTrackEditorialLine(first))}</p><em>- Muze editorial note</em>${lovedAdmin}</div><div class="featureTrackScore"><strong>${escapeHtml(firstScore)}</strong><span>2.1K</span></div><div class="momentWhy singleArtMoment" aria-label="${escapeHtml(first.name)} artwork">${singleArtHtml}</div><div class="featureCover">${coverHtml}</div></section>`;
  const tableHtml=`<section class="linerTrackTable"><div class="trackTableHead"><span>#</span><span>Title</span><span>Share</span><span>Community score</span><span>Comment</span></div>${rows}${tracks.length>8?`<button class="viewTracklist" onclick="toggleFullTracklist('${escapeJsString(albumId)}')">${expanded?"Show fewer tracks":"View full tracklist"}</button>`:""}</section>`;
  host.innerHTML=featuredHtml+tableHtml;
  syncMobileTrackHeaderScroll();
}

function syncMobileTrackHeaderScroll(){
  const table=document.querySelector("#albumModal .albumTrackSections .linerTrackTable");
  const head=table?.querySelector(".trackTableHead");
  if(!table||!head)return;
  const movingLabels=[...head.children].slice(2);
  const rows=table.querySelectorAll(".linerTrackRow");
  const isMobile=window.matchMedia?.("(max-width: 768px)")?.matches;
  head.style.transform="";
  movingLabels.forEach(label=>label.style.removeProperty("transform"));
  if(!isMobile)return;
  rows.forEach(row=>{
    row.onscroll=()=>{
      movingLabels.forEach(label=>label.style.setProperty("transform",`translateX(${-row.scrollLeft}px)`,"important"));
    };
  });
}

window.toggleFullTracklist=function(albumId){
  const host=$("#trackRatingsList");
  if(!host)return;
  host.dataset.expanded=host.dataset.expanded==="true"?"false":"true";
  renderTrackList(albumId);
}
function trackSharePayload(albumId,trackKeyValue,trackName){
  const album=state.albums.find(a=>String(a.id)===String(albumId))||{};
  const track=(extras.tracks[albumRef(albumId)]||[]).find(item=>trackKey(item)===trackKeyValue)||{name:trackName};
  const title=String(track.name||trackName||"this song");
  const albumTitle=String(album.title||"this album");
  const artist=String(album.artist||"");
  const url=muzeTrackUrl(albumId,trackKeyValue);
  const text=`${title} from ${albumTitle}${artist?` by ${artist}`:""} on Muze`;
  return {album,track,title,albumTitle,artist,url,text,body:`Shared song: ${text}`};
}
function shareUrlFor(kind,payload){
  const text=encodeURIComponent(payload.text);
  const url=encodeURIComponent(payload.url||location.href);
  if(kind==="facebook")return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
  if(kind==="whatsapp")return `https://wa.me/?text=${text}%20${url}`;
  if(kind==="gmail")return `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent("Song from Muze")}&body=${text}%0A${url}`;
  return "";
}
function trackShareUsersHtml(albumId,trackKeyValue,trackName){
  const users=chatCommunityProfiles(visibleLibraries().filter(l=>!(l.device_id===state.deviceId||l.isMine))).filter(user=>String(user.user_id||"").trim()).slice(0,5);
  if(!users.length)return `<div class="trackShareEmpty">No Muze users found yet.</div>`;
  return users.map((user,index)=>{
    const username=user.username||user.name||"Muze user";
    return `<button type="button" onclick="sendTrackShareToMuze('${escapeJsString(albumId)}','${escapeJsString(trackKeyValue)}','${escapeJsString(trackName)}','${escapeJsString(user.user_id)}')">${chatAvatarMarkup(user,isUserOnline(user.user_id),index)}<span>${escapeHtml(username)}</span></button>`;
  }).join("");
}
window.closeTrackShareSheet=function(){
  document.getElementById("trackShareSheet")?.remove();
}
window.openTrackShareSheet=function(event,albumId,trackKeyValue,trackName){
  event?.preventDefault?.();
  event?.stopPropagation?.();
  closeTrackShareSheet();
  const sheet=document.createElement("div");
  sheet.id="trackShareSheet";
  sheet.className="trackShareSheet trackShareMiniSheet";
  sheet.innerHTML=`<div class="trackShareMiniMenu"><button type="button" onclick="nativeTrackShare('${escapeJsString(albumId)}','${escapeJsString(trackKeyValue)}','${escapeJsString(trackName)}')">Share</button><button type="button" onclick="showTrackMuzeShareOptions('${escapeJsString(albumId)}','${escapeJsString(trackKeyValue)}','${escapeJsString(trackName)}')">Share to Muze user</button></div>`;
  sheet.onclick=closeTrackShareSheet;
  document.body.appendChild(sheet);
  const rect=event?.currentTarget?.getBoundingClientRect?.();
  const menu=sheet.querySelector(".trackShareMiniMenu");
  if(menu)menu.onclick=e=>e.stopPropagation();
  if(rect&&menu){
    const left=Math.min(window.innerWidth-176,Math.max(8,rect.left+rect.width+8));
    const top=Math.min(window.innerHeight-82,Math.max(8,rect.top-10));
    menu.style.left=`${left}px`;
    menu.style.top=`${top}px`;
  }
  requestAnimationFrame(()=>sheet.classList.add("open"));
}
window.showTrackMuzeShareOptions=function(albumId,trackKeyValue,trackName){
  const sheet=document.getElementById("trackShareSheet");
  const panel=sheet?.querySelector(".trackShareMiniMenu");
  if(!panel)return;
  const payload=trackSharePayload(albumId,trackKeyValue,trackName);
  panel.classList.add("muzeChatMiniMenu");
  panel.innerHTML=`<strong>${escapeHtml(payload.title)}</strong><div class="trackShareUsers">${trackShareUsersHtml(albumId,trackKeyValue,trackName)}<button type="button" class="trackShareSearchUser" onclick="sendTrackShareToUsername('${escapeJsString(albumId)}','${escapeJsString(trackKeyValue)}','${escapeJsString(trackName)}')"><span>Search username</span></button></div>`;
}
window.nativeTrackShare=async function(albumId,trackKeyValue,trackName){
  const payload=trackSharePayload(albumId,trackKeyValue,trackName);
  closeTrackShareSheet();
  if(navigator.share){
    await navigator.share({title:payload.title,text:payload.text,url:payload.url}).catch(()=>{});
  }else{
    await copyTrackShare(albumId,trackKeyValue,trackName);
  }
}
window.copyTrackShare=async function(albumId,trackKeyValue,trackName){
  const payload=trackSharePayload(albumId,trackKeyValue,trackName);
  await navigator.clipboard?.writeText(`${payload.text}\n${payload.url}`).catch(()=>{});
  alert("Song share text copied. Paste it into Instagram or any app.");
}
window.sendTrackShareToMuze=async function(albumId,trackKeyValue,trackName,userId){
  if(!requireAuth("message",()=>sendTrackShareToMuze(albumId,trackKeyValue,trackName,userId)))return;
  const recipientId=String(userId||"").trim();
  if(!recipientId){alert("Choose a Muze user to share this song with.");return}
  const payload=trackSharePayload(albumId,trackKeyValue,trackName);
  const row={sender_id:loggedInUser().id,recipient_id:recipientId,body:payload.body,message_type:"track"};
  const {data,error}=await db.from("chat_messages").insert(row).select("id,sender_id,recipient_id,body,message_type,created_at,read_at").single();
  if(error){alert(error.message||"Song could not be shared.");return}
  extras.chatMessages=[...(extras.chatMessages||[]),data];
  closeTrackShareSheet();
  alert(`Shared "${payload.title}" on Muze.`);
}
window.sendTrackShareToUsername=async function(albumId,trackKeyValue,trackName){
  const username=(prompt("Enter their Muze username:")||"").trim().replace(/^@+/,"");
  if(!username)return;
  const profile=await lookupChatProfileByUsername({name:username,profile:{username},library:{username}});
  if(!profile?.user_id){alert(`I could not find a Muze user called "${username}".`);return}
  await sendTrackShareToMuze(albumId,trackKeyValue,trackName,profile.user_id);
}

async function loadTrackComments(albumId,trackKeyValue){
  const ref=albumRef(albumId);
  const storageKey=ref+"::"+trackKeyValue;
  const matchesTrackComment=row=>sameCommentTrackKey(row?.track_key,trackKeyValue)||sameCommentTrackKey(row?.track_name,trackKeyValue);
  const localRows=Object.entries(localTrackComments()||{}).flatMap(([key,rows])=>{
    if(!key.startsWith(ref+"::"))return [];
    const storedTrackKey=key.slice(ref.length+2);
    return sameCommentTrackKey(storedTrackKey,trackKeyValue)?(rows||[]):[];
  });
  const cachedRows=(extras.comments[ref]||[]).filter(row=>row?.reaction_type==="song_comment"&&matchesTrackComment(row));
  if(db){
    let result=await db.from("track_comments").select("id,user_id,name,avatar_url,comment,track_key,track_name,created_at").eq("album_ref",ref).order("created_at",{ascending:false}).limit(100);
    if(result.error&&/column|schema cache|avatar_url|user_id/i.test(result.error.message||"")){
      result=await db.from("track_comments").select("name,comment,track_key,track_name,created_at").eq("album_ref",ref).order("created_at",{ascending:false}).limit(100);
    }
    const matchingRows=(result.data||[]).filter(matchesTrackComment);
    if(!result.error)return hydrateTrackCommentLikes(uniqueTrackCommentRows([...matchingRows,...cachedRows,...(isLocalRuntime()?localRows:[])]).sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||""))));
  }
  return hydrateTrackCommentLikes(uniqueTrackCommentRows([...(localTrackComments()[storageKey]||[]),...localRows,...cachedRows]).sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||""))));
}
function renderTrackCommentReply(reply={}){
  const name=String(reply.name||"Listener").trim()||"Listener";
  return `<div class="trackCommentReply"><span>${escapeHtml(String(name).slice(0,1).toUpperCase())}</span><div><strong>${escapeHtml(name)}</strong><small>${reply.created_at?timeAgo(reply.created_at):"Just now"}</small><p>${mentionTextHtml(reply.reply||"")}</p></div></div>`;
}
function renderTrackCommentsList(comments){
  const host=$("#trackCommentsList");
  if(!host)return;
  const likes=localTrackCommentLikes();
  const replies=localTrackCommentReplies();
  host.innerHTML=comments.length?comments.map((c,index)=>{
    const name=String(c.name||"Listener").trim()||"Listener";
    const when=c.created_at?timeAgo(c.created_at):"Just now";
    const key=stableTrackCommentKey(c);
    const hasLocalLike=Object.prototype.hasOwnProperty.call(likes,key);
    const localLiked=Boolean(likes[key]);
    const liked=hasLocalLike?localLiked:Boolean(c.liked_by_me);
    const baseHearts=Math.max(0,Number(c.like_count??c.likes??c.heart_count??0)||0);
    const hearts=baseHearts+(hasLocalLike&&!c.liked_by_me&&localLiked?1:0)-(hasLocalLike&&c.liked_by_me&&!localLiked?1:0);
    const replyRows=replies[key]||[];
    return `<article class="commentItem trackCommentFeedItem" data-track-comment-key="${escapeHtml(key)}"><div class="commentItemHead">${trackCommentAvatarMarkup(c,name)}<div class="trackCommentByline"><strong>${escapeHtml(name)}</strong><small>${escapeHtml(when)}</small></div></div><p>${mentionTextHtml(c.comment||"")}</p><div class="trackCommentActions"><button type="button" class="trackHeartAction ${liked?"liked":""}" aria-pressed="${liked?"true":"false"}" onclick="toggleTrackCommentHeart('${escapeJsString(key)}','${escapeJsString(c.id||"")}')">${liked?"♥":"♡"} ${Math.max(0,Math.round(hearts))}</button><button type="button" onclick="openTrackCommentReplyBox('${escapeJsString(key)}','${escapeJsString(name)}')">Reply</button></div>${replyRows.length?`<div class="trackCommentReplies">${replyRows.map(renderTrackCommentReply).join("")}</div>`:""}<div id="trackCommentReplyBox-${domSafeId(key)}" class="trackCommentReplyBox hidden"><textarea maxlength="240" placeholder="Reply to ${escapeHtml(name)}..."></textarea><div><button type="button" onclick="submitTrackCommentReply('${escapeJsString(key)}')">Reply</button><button type="button" onclick="closeTrackCommentReplyBox('${escapeJsString(key)}')">Cancel</button></div></div></article>`;
  }).join(""):`<div class="emptyMini">No comments for this song yet.</div>`;
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
  const user=loggedInUser();
  const album=state.albums.find(item=>String(item.id)===String(albumId)||albumRef(item.id)===albumRef(albumId))||{};
  const meta=[album.artist,album.title].filter(Boolean).join(" - ");
  const identity=user?trackCommentIdentity():null;
  const identityHtml=identity?`<div class="trackCommentIdentity">${trackCommentAvatarMarkup({user_id:identity.user_id,avatar_url:identity.avatar_url},identity.name)}<div><strong>${escapeHtml(identity.name)}</strong><span>Commenting as ${escapeHtml(identity.name)}</span></div></div>`:"";
  const formHtml=user?`<div class="commentForm trackCommentComposer">${identityHtml}<div class="trackCommentTextareaWrap"><textarea id="trackCommentText" maxlength="500" placeholder="Share your reaction..."></textarea><button class="bigBtn" onclick="addTrackComment('${escapeJsString(albumId)}','${escapeJsString(trackKeyValue)}','${escapeJsString(trackName)}')">Post</button></div></div>`:`<div class="emptyMini">Log in to comment on this song.</div>`;
  popup.innerHTML=`<div class="trackCommentPanel"><button class="close" onclick="closeTrackComments()">&times;</button><p class="eyebrow">Song Comments</p><h3>${escapeHtml(trackName)}</h3><p id="trackCommentMeta" class="trackCommentMeta">${meta?escapeHtml(meta):""}</p><div id="trackCommentsList" class="commentsList trackCommentList"><div class="emptyMini">Loading comments...</div></div>${formHtml}</div>`;
  popup.dataset.albumId=albumId;
  popup.dataset.trackKey=trackKeyValue;
  popup.dataset.trackName=trackName;
  popup.classList.remove("hidden");
  const comments=await loadTrackComments(albumId,trackKeyValue);
  const metaLabel=$("#trackCommentMeta");
  if(metaLabel)metaLabel.textContent=[meta,`${comments.length} Listener Reaction${comments.length===1?"":"s"}`].filter(Boolean).join(" • ");
  renderTrackCommentsList(comments);
}
async function refreshOpenTrackComments(){
  const popup=$("#trackCommentPopup");
  if(!popup||popup.classList.contains("hidden"))return;
  const albumId=popup.dataset.albumId;
  const trackKeyValue=popup.dataset.trackKey;
  if(!albumId||!trackKeyValue)return;
  const comments=await loadTrackComments(albumId,trackKeyValue);
  const metaLabel=$("#trackCommentMeta");
  if(metaLabel){
    const current=metaLabel.textContent.split(" • ").slice(0,-1).join(" • ");
    metaLabel.textContent=[current,`${comments.length} Listener Reaction${comments.length===1?"":"s"}`].filter(Boolean).join(" • ");
  }
  renderTrackCommentsList(comments);
}
window.toggleTrackCommentHeart=async function(commentKey,commentId=""){
  const likes=localTrackCommentLikes();
  const nextLiked=!likes[commentKey];
  likes[commentKey]=nextLiked;
  saveLocalTrackCommentLikes(likes);
  refreshOpenTrackComments();
  const user=loggedInUser();
  if(!db||!user||!isUuid(commentId))return;
  try{
    if(nextLiked){
      const {error}=await db.from("track_comment_likes").upsert({comment_id:commentId,user_id:user.id},{onConflict:"comment_id,user_id"});
      if(error)throw error;
    }else{
      const {error}=await db.from("track_comment_likes").delete().eq("comment_id",commentId).eq("user_id",user.id);
      if(error)throw error;
    }
    refreshOpenTrackComments();
  }catch(error){
    console.warn("[Muze] Track comment like could not be synced",error?.message||error);
  }
}
window.openTrackCommentReplyBox=function(commentKey,name){
  if(!requireAuth("chat",()=>window.openTrackCommentReplyBox(commentKey,name)))return;
  document.querySelectorAll(".trackCommentReplyBox").forEach(box=>box.classList.add("hidden"));
  const box=$("#trackCommentReplyBox-"+domSafeId(commentKey));
  if(!box)return;
  box.classList.remove("hidden");
  const textarea=box.querySelector("textarea");
  if(textarea){textarea.placeholder=`Reply to ${name||"Listener"}...`;textarea.focus()}
}
window.closeTrackCommentReplyBox=function(commentKey){
  $("#trackCommentReplyBox-"+domSafeId(commentKey))?.classList.add("hidden");
}
window.submitTrackCommentReply=async function(commentKey){
  if(!requireAuth("chat",()=>window.submitTrackCommentReply(commentKey)))return;
  const box=$("#trackCommentReplyBox-"+domSafeId(commentKey));
  const textarea=box?.querySelector("textarea");
  const reply=String(textarea?.value||"").trim();
  if(!reply)return;
  const identity=trackCommentIdentity();
  const all=localTrackCommentReplies();
  all[commentKey]=all[commentKey]||[];
  all[commentKey].push({id:localId("track-reply"),name:identity.name,user_id:identity.user_id,avatar_url:identity.avatar_url||null,reply,created_at:new Date().toISOString()});
  saveLocalTrackCommentReplies(all);
  await createMentionNotifications(reply,{entity_type:"track_comment_reply"});
  if(textarea)textarea.value="";
  refreshOpenTrackComments();
}
window.closeTrackComments=function(){const popup=$("#trackCommentPopup");if(popup)popup.classList.add("hidden")}
window.addTrackComment=async function(albumId,trackKeyValue,trackName){
  if(!requireAuth("chat",()=>window.addTrackComment(albumId,trackKeyValue,trackName)))return;
  const textInput=$("#trackCommentText");
  const comment=(textInput?.value||"").trim();
  if(!comment)return;
  const identity=trackCommentIdentity();
  const name=identity.name;
  const ref=albumRef(albumId);
  const storageKey=ref+"::"+trackKeyValue;
  const createdAt=new Date().toISOString();
  const baseRow={album_ref:ref,track_key:trackKeyValue,track_name:trackName,device_id:state.deviceId,user_id:identity.user_id,name,avatar_url:identity.avatar_url||null,comment,created_at:createdAt};
  let reaction=trackCommentReactionRow(baseRow,ref);
  console.log("[Muze] album_id attached to comment",{album_id:ref,track_id:trackKeyValue,track_name:trackName});
  if(db){
    let result=await db.from("track_comments").insert(baseRow).select("id,user_id,name,avatar_url,comment,track_key,track_name,created_at").single();
    let error=result.error;
    if(error&&/column|schema cache|avatar_url|user_id/i.test(error.message||"")){
      const fallbackRow={album_ref:ref,track_key:trackKeyValue,track_name:trackName,device_id:state.deviceId,name,comment};
      result=await db.from("track_comments").insert(fallbackRow).select("id,name,comment,track_key,track_name,created_at").single();
      error=result.error;
    }
    if(error){
      const all=localTrackComments();
      all[storageKey]=all[storageKey]||[];
      all[storageKey].push(baseRow);
      saveLocalTrackComments(all);
    }else if(result.data){
      reaction=trackCommentReactionRow({...result.data,album_ref:ref},ref);
    }
  }else{
    const all=localTrackComments();
    all[storageKey]=all[storageKey]||[];
    all[storageKey].push(baseRow);
    saveLocalTrackComments(all);
  }
  console.log("[Muze] song comment saved successfully",{album_id:ref,track_id:trackKeyValue,track_name:trackName});
  addReactionToAlbumState(ref,reaction);
  textInput.value="";
  const album=state.albums.find(item=>String(item.id)===String(albumId))||{};
  await createMentionNotifications(comment,{entity_type:"track_comment",entity_id:reaction.id||null,album_ref:ref,album_title:album.title||"",body:`${name} mentioned you on ${trackName||album.title||"a song"}.`});
  renderTrackCommentsList(await loadTrackComments(albumId,trackKeyValue));
  renderComments(albumId);
  renderTrackList(albumId);
}
window.openTrackRating=function(albumId,trackKeyValue,trackName){
  if(!requireAuth("rate",()=>window.openTrackRating(albumId,trackKeyValue,trackName)))return;
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
window.openAlbumRating=function(albumId){
  if(!requireAuth("rate",()=>window.openAlbumRating(albumId)))return;
  const album=state.albums.find(a=>String(a.id)===String(albumId));
  if(!album)return;
  let popup=$("#albumRatingPopup");
  if(!popup){
    popup=document.createElement("div");
    popup.id="albumRatingPopup";
    popup.className="trackRatingPopup hidden";
    document.body.appendChild(popup);
    popup.addEventListener("click",e=>{if(e.target.id==="albumRatingPopup")closeAlbumRating()});
  }
  const current=userScore(album);
  popup.innerHTML=`<div class="trackRatingPanel albumRatingPanel"><button class="close" onclick="closeAlbumRating()">&times;</button><p class="eyebrow">Album Rating</p><h3>${escapeHtml(album.title)}</h3><div class="songRatingBar popupChoices">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button class="songRateBtn ${current==n?"selected":""}" onclick="rateAlbum('${escapeJsString(albumId)}',${n});closeAlbumRating()" aria-label="Rate ${escapeHtml(album.title)} ${n} out of 10"><span class="songRateNumber">${n}</span><span class="songRateCircle"></span></button>`).join("")}</div><div class="ratingDetailsBlock"><button class="linkBtn" onclick="toggleRatingDetails('albumRatingDetails',this)">See ratings</button><div id="albumRatingDetails" class="hidden"><div class="emptyMini">Loading ratings...</div></div></div></div>`;
  loadRatingDetails(albumId).then(()=>renderRatingDetails(albumId));
  popup.classList.remove("hidden");
}
window.closeAlbumRating=function(){const popup=$("#albumRatingPopup");if(popup)popup.classList.add("hidden")}
function scrollAlbumTracksToFeatured(behavior="auto"){
  requestAnimationFrame(()=>{
    const target=document.querySelector(".linerFeaturedTrack");
    if(!target)return;
    target.scrollIntoView({behavior,block:"start"});
  });
}
function albumInfoCurrentAlbum(albumId=extras.currentAlbumId){return state.albums.find(album=>String(album.id)===String(albumId))||null}
function albumInfoRuntime(value){
  const total=Math.max(0,Number(value)||0);
  if(!total)return "";
  const whole=Math.floor(total),hours=Math.floor(whole/3600000),minutes=Math.floor((whole%3600000)/60000),seconds=Math.floor((whole%60000)/1000);
  const clock=hours?`${hours}:${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`:`${minutes}:${String(seconds).padStart(2,"0")}`;
  return clock;
}
function albumInfoSpotifyRuntime(album){
  const tracks=extras.tracks[albumRef(album?.id)];
  if(!Array.isArray(tracks)||!tracks.length||!tracks.some(track=>String(track.spotify_url||"").trim()))return 0;
  return tracks.reduce((total,track)=>total+Math.max(0,Number(track.duration_ms)||0),0);
}
function albumInfoDate(value){
  const text=String(value||"").trim();
  if(!text)return "";
  if(/^\d{4}$/.test(text))return text;
  const date=new Date(`${text}${/^\d{4}-\d{2}-\d{2}$/.test(text)?"T00:00:00Z":""}`);
  return Number.isNaN(date.getTime())?text:date.toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric",timeZone:"UTC"});
}
function albumInfoReleaseDate(album,metadata={}){
  const verifiedDate=albumOriginalReleaseDateOverrides[albumIdentityKey(album)];
  if(verifiedDate)return albumInfoDate(verifiedDate);
  const knownYear=albumReleaseYear(album);
  const sourceDate=String(metadata.original_release_date||"").trim();
  const sourceYear=Number(sourceDate.match(/\b(?:19|20)\d{2}\b/)?.[0]||metadata.release_year||0);
  if(knownYear&&sourceYear&&Number(knownYear)!==sourceYear)return String(knownYear);
  return albumInfoDate(sourceDate)||(metadata.release_year||knownYear||"");
}
function albumInfoCountry(value){
  const text=String(value||"").split(/\s*\/\s*|\s*;\s*|\s*,\s*(?=[A-Z])/).map(part=>part.trim()).find(part=>part&&!/^(?:europe|worldwide)$/i.test(part))||"";
  const code=text.toUpperCase();
  if(code==="EUROPE"||code==="WORLDWIDE")return "";
  if(/^[A-Z]{2}$/.test(code))return "";
  return text;
}
const albumInfoCountryCodeCache=new Map();
const albumInfoCurrentCountryCodes="AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");
function albumInfoCountryFlag(value){
  const country=albumInfoCountry(value);
  if(!country)return "";
  const key=country.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
  if(albumInfoCountryCodeCache.has(key))return albumInfoCountryCodeCache.get(key);
  const aliases={"united states of america":"US","south korea":"KR","north korea":"KP",russia:"RU","czech republic":"CZ",czechia:"CZ","ivory coast":"CI","vatican city":"VA",bolivia:"BO",iran:"IR",syria:"SY",tanzania:"TZ",venezuela:"VE",moldova:"MD",laos:"LA",brunei:"BN","cape verde":"CV","democratic republic of the congo":"CD","republic of the congo":"CG",palestine:"PS",taiwan:"TW",turkey:"TR",england:"GB",scotland:"GB",wales:"GB","northern ireland":"GB"};
  let code=aliases[key]||"";
  if(!code&&typeof Intl!=="undefined"&&Intl.DisplayNames){
    const regions=new Intl.DisplayNames(["en"],{type:"region"});
    for(const candidate of albumInfoCurrentCountryCodes){
      const name=String(regions.of(candidate)||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
      if(name===key){code=candidate;break}
    }
  }
  const flag=/^[A-Z]{2}$/.test(code)?`https://flagcdn.com/w40/${code.toLowerCase()}.png`:"";
  albumInfoCountryCodeCache.set(key,flag);
  return flag;
}
function albumInfoIcon(name){
  const paths={calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',disc:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"/>',tag:'<path d="M20 13 13 20l-9-9V4h7z"/><circle cx="8.5" cy="8.5" r="1"/>',music:'<path d="M9 18V5l11-2v13M9 9l11-2"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 1 0 0-8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',sliders:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',pen:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',award:'<circle cx="12" cy="8" r="6"/><path d="m8.5 13-1.5 8 5-3 5 3-1.5-8"/>',building:'<path d="M3 21h18M6 18V8l6-5 6 5v10M9 18v-5h6v5"/>',external:'<path d="M14 3h7v7M10 14 21 3M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6"/>',star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0zM6 6H3v2a4 4 0 0 0 5 4M18 6h3v2a4 4 0 0 1-5 4M12 13v5M8 21h8M9 18h6"/>',mic:'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>'};
  return `<svg class="albumInfoIcon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.disc}</svg>`;
}
function albumInfoRoleList(credit){
  return [...new Set([credit?.role,credit?.instrument].filter(Boolean).flatMap(value=>String(value).split(/[,;]+|\s+\/\s+/)).map(value=>value.trim()).filter(Boolean))]
    .map(value=>value.charAt(0).toUpperCase()+value.slice(1));
}
function albumInfoRoles(credit){return albumInfoRoleList(credit).join(", ")}
function albumInfoIsVocalRole(value){
  return /\b(vocals?|vocalisations?|vocalizations?|singers?|singing|rappers?|rapping|spoken word)\b/i.test(String(value||""));
}
function albumInfoPresentationCredits(items=[]){
  const rows=[];
  items.forEach(item=>{
    if(item?.credit_type!=="production"){rows.push(item);return}
    const roles=albumInfoRoleList(item),vocalRoles=roles.filter(albumInfoIsVocalRole),productionRoles=roles.filter(role=>!albumInfoIsVocalRole(role));
    if(vocalRoles.length)rows.push({...item,credit_type:"performer",role:vocalRoles.join(", "),instrument:vocalRoles.join(", "),_source_credit_type:item.credit_type});
    if(productionRoles.length)rows.push({...item,role:productionRoles.join(", "),instrument:""});
  });
  const merged=new Map();
  rows.forEach(row=>{
    const key=`${normalizeAlbumName(row.person_name)}::${row.credit_type}`;
    const current=merged.get(key);
    if(!current){merged.set(key,{...row});return}
    const roles=[...new Set([...albumInfoRoleList(current),...albumInfoRoleList(row)])];
    current.role=roles.join(", ");
    current.instrument=row.credit_type==="performer"?roles.join(", "):"";
  });
  return [...merged.values()];
}
function albumInfoSourceLink(row){
  if(!isAdminUnlocked())return "";
  const url=String(row?.source_url||"").trim();
  const source=String(row?.source||"").trim();
  const secondaryUrl=String(row?.source_secondary_url||"").trim();
  const secondarySource=String(row?.source_secondary||"").trim();
  const primary=!url?(source?`<span class="infoSource">Source: ${escapeHtml(source)}</span>`:""):`<a class="infoSource" href="${escapeHtml(url)}" target="_blank" rel="noopener">Source: ${escapeHtml(source||"reference")}${albumInfoIcon("external")}</a>`;
  const secondary=!secondaryUrl?(secondarySource?`<span class="infoSource">Fallback: ${escapeHtml(secondarySource)}</span>`:""):`<a class="infoSource" href="${escapeHtml(secondaryUrl)}" target="_blank" rel="noopener">Fallback: ${escapeHtml(secondarySource||"reference")}${albumInfoIcon("external")}</a>`;
  return primary+secondary;
}
function albumInfoRoleFactsHtml(items){
  return items.map(item=>`<span class="infoRolePill">${escapeHtml(item)}</span>`).join('<i class="infoRoleSeparator" aria-hidden="true">&bull;</i>');
}
function albumInfoPersonCard(credit,admin){
  const name=String(credit.person_name||"Unknown");
  const portraitStatus=String(credit.image_status||"").toLowerCase();
  const portraitApproved=credit.image_approved===true||portraitStatus==="approved";
  const candidateVisible=admin&&portraitStatus==="candidate";
  const image=portraitApproved||candidateVisible?String(credit.image_url||"").trim():"";
  const initials=name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join("").toUpperCase();
  const avatar=image?`<img src="${escapeHtml(image)}" alt="" loading="lazy">`:`<span>${escapeHtml(initials||"M")}</span>`;
  const roles=albumInfoRoleList(credit),primary=roles.slice(0,2),secondary=roles.slice(2,4),remaining=roles.slice(4);
  const more=remaining.length?`<details class="infoPersonMore"><summary>+ ${remaining.length} more role${remaining.length===1?"":"s"}</summary><p class="infoRoleFacts">${albumInfoRoleFactsHtml(remaining)}</p></details>`:"";
  const portraitSource=String(credit.image_source_url||"").trim(),portraitAuthor=String(credit.image_author||"Wikimedia Commons contributor").trim(),portraitLicense=String(credit.image_license||"").trim(),portraitLicenseUrl=String(credit.image_license_url||"").trim();
  const portraitCredit=admin&&image&&portraitSource?`<span class="infoPortraitCredit${candidateVisible?" isCandidate":""}"><a href="${escapeHtml(portraitSource)}" target="_blank" rel="noopener">${candidateVisible?"Candidate photo":"Photo"}: ${escapeHtml(portraitAuthor)}</a>${portraitLicense?` &middot; <a href="${escapeHtml(portraitLicenseUrl||portraitSource)}" target="_blank" rel="noopener">${escapeHtml(portraitLicense)}</a>`:""} &middot; circular crop</span>`:"";
  const sourceCreditType=credit._source_credit_type||credit.credit_type||"";
  const portraitTarget=`'${escapeJsString(credit.id||"")}','${escapeJsString(name)}','${escapeJsString(sourceCreditType)}'`;
  const portraitActions=admin&&portraitApproved?`<span class="infoPortraitApproved">Photo approved</span><button onclick="setAlbumInfoPortraitStatus(${portraitTarget},'rejected')" title="Find a different licensed portrait or use initials">Change photo</button>`:admin&&portraitStatus==="candidate"?`<button onclick="setAlbumInfoPortraitStatus(${portraitTarget},'approved')" title="Approve licensed portrait">Approve photo</button><button onclick="setAlbumInfoPortraitStatus(${portraitTarget},'rejected')" title="Reject portrait">Reject photo</button>`:admin&&portraitStatus==="rejected"?`<button onclick="setAlbumInfoPortraitStatus(${portraitTarget},'approved')" title="Approve licensed portrait">Approve photo</button>`:"";
  const controls=admin?`<div class="infoRowActions">${portraitActions}<button onclick="editAlbumInfoCredit('${escapeJsString(credit.id)}','${escapeJsString(name)}','${escapeJsString(sourceCreditType)}')" title="Edit credit" aria-label="Edit ${escapeHtml(name)}">Edit</button><button onclick="deleteAlbumInfoCredit('${escapeJsString(credit.id)}','${escapeJsString(name)}','${escapeJsString(sourceCreditType)}')" title="Delete credit" aria-label="Delete ${escapeHtml(name)}">Delete</button></div>`:"";
  return `<article class="infoPerson${candidateVisible?" hasPortraitCandidate":""}"><div class="infoPersonAvatar">${avatar}</div><div class="infoPersonCopy"><strong>${escapeHtml(name)}</strong><p class="infoPersonPrimary">${primary.length?primary.map(escapeHtml).join(" / "):"Credit unavailable"}</p>${secondary.length?`<p class="infoPersonSecondary">${secondary.map(escapeHtml).join(", ")}</p>`:""}${portraitCredit}${albumInfoSourceLink(credit)}</div>${controls}${more}</article>`;
}
function albumInfoSection(id,title,icon,body,className=""){
  if(!body)return "";
  const album=id==="details"?albumInfoCurrentAlbum():null,coverUrl=album?albumCoverUrl(album):"";
  const headingIcon=coverUrl?`<span class="albumInfoHeadingCover"><img src="${escapeHtml(coverUrl)}" alt=""></span>`:`<span>${albumInfoIcon(icon)}</span>`;
  return `<section id="album-info-${escapeHtml(id)}" class="albumInfoBlock ${className}"><div class="albumInfoHeading">${headingIcon}<h3>${escapeHtml(title)}</h3></div>${body}</section>`;
}
function albumInfoGroupPerformers(items,album){
  const artistName=normalizeAlbumName(album.artist);
  const groups={core:[],additional:[],guest:[],ensemble:[]};
  items.forEach(item=>{
    const text=normalizeAlbumName(`${item.person_name} ${albumInfoRoles(item)}`);
    const order=Number(item.sort_order)||0;
    const exactArtist=normalizeAlbumName(item.person_name)===artistName;
    if(order>=40000||/orchestra|ensemble|choir|chorus|string section|brass section/.test(text))groups.ensemble.push(item);
    else if(order>=30000||/guest|featured|featuring/.test(text))groups.guest.push(item);
    else if(order>=20000)groups.additional.push(item);
    else if(order>=10000||exactArtist||/lead vocal|primary artist/.test(text)||(/guitar|bass|drums/.test(text)&&!/additional|session|guest|featured/.test(text)))groups.core.push(item);
    else groups.additional.push(item);
  });
  return groups;
}
function albumInfoHeroHtml(album,info={}){
  const metadata=info.metadata||{},labels=Array.isArray(info.labels)?info.labels:[],sales=info.sales||{};
  const originalLabel=labels.find(label=>label.is_original_label)||labels[0];
  const coverUrl=albumCoverUrl(album),rating=score(album),raters=count(album);
  const country=albumInfoCountry(metadata.country),countryFlag=albumInfoCountryFlag(country);
  const meta=[
    [albumInfoReleaseDate(album,metadata),"calendar", ""],
    [albumInfoRuntime(metadata.total_runtime_ms),"clock", ""],
    [originalLabel?.label_name,"disc", ""],
    [country,"",countryFlag]
  ].filter(([value])=>value);
  const rank=muzeTop250Rank(album);
  const signals=[rating>0?`<div><strong>${escapeHtml(rating.toFixed(1))}</strong><span>Muze score${raters?` / ${escapeHtml(raters.toLocaleString())} rater${raters===1?"":"s"}`:""}</span></div>`:"",rank?`<div><strong>#${escapeHtml(rank)}</strong><span>Muze ranking</span></div>`:""].filter(Boolean).join("");
  return `<header id="albumInfoHero" class="albumInfoHero"><div class="albumInfoHeroArt">${coverUrl?`<img src="${escapeHtml(coverUrl)}" alt="${escapeHtml(album.title)} cover">`:`<div class="albumInfoCoverFallback">${escapeHtml(coverText(album))}</div>`}</div><div class="albumInfoHeroCopy"><span class="albumInfoEyebrow">Album information</span><h2>${escapeHtml(album.title)}</h2><p class="albumInfoArtist">${escapeHtml(album.artist)}</p>${meta.length?`<p class="albumInfoHeroMeta">${meta.map(([value,icon,flag])=>`<span>${flag?`<img class="albumInfoHeroFlag" src="${escapeHtml(flag)}" alt="">`:`<i>${albumInfoIcon(icon)}</i>`}${escapeHtml(value)}</span>`).join("")}</p>`:""}${signals?`<div class="albumInfoHeroSignals">${signals}</div>`:""}</div></header>`;
}
function albumMostPopularTrackTitle(album,overview=albumOverviewRowReadOnly(album)){
  const review=albumReviewData(overview,album);
  let popular=review.mostPopularTrack||overview?.review_most_popular_track||(overview?.loved_track_name?{title:overview.loved_track_name}:null);
  if(typeof popular==="string"){try{popular=JSON.parse(popular)}catch(_){popular={title:popular}}}
  return String(popular?.title||popular?.name||"").trim();
}
function albumInfoAtAGlance(album,info={}){
  const sales=info.sales||{},overview=albumOverviewRowReadOnly(album);
  const rating=score(album),rank=muzeTop250Rank(album);
  const popularTitle=albumMostPopularTrackTitle(album,overview);
  const salesValue=String(sales.display_value||"").trim();
  const facts=[
    ["Muze Score",rating>0?rating.toFixed(1):"","star"],
    ["Muze All-Time",rank?`#${rank}`:"","trophy"],
    ["Worldwide Sales",salesValue||(isAdminUnlocked()?"Add sales":""),salesValue?"globe":"globe-add"],
    ["Most Popular Track",popularTitle,"music"]
  ].filter(([,value])=>value);
  if(!facts.length)return "";
  return `<aside class="albumGlancePanel"><header><span>${albumInfoIcon("star")}</span><h4>At a Glance</h4></header><div class="albumGlanceStats">${facts.map(([label,value,icon])=>icon==="music"?`<button type="button" class="albumGlanceFact albumGlanceFact-music" onclick="playOverviewMomentPreview('${escapeJsString(album.id)}','${escapeJsString(value)}',this)" aria-label="Play ${escapeHtml(value)}" title="Play"><i>${albumInfoIcon(icon)}</i><div><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div><b class="albumGlancePlayCue" aria-hidden="true"></b></button>`:icon==="globe-add"?`<button type="button" class="albumGlanceFact albumGlanceFact-globe albumGlanceFact-addSales" onclick="editAlbumInfoSales()"><i>${albumInfoIcon("globe")}</i><div><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div></button>`:`<article class="albumGlanceFact albumGlanceFact-${icon}"><i>${albumInfoIcon(icon)}</i><div><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div></article>`).join("")}</div></aside>`;
}
function albumInfoLabelCardLogo(label,admin=false){
  const audit=label?.record_label_logo||{};
  const image=String(label?.logo_url||(admin?audit.logo_url:"")||"").trim();
  const name=normalizeAlbumName(label?.label_name);
  const apple=name==="apple"||name==="apple records";
  if(!image)return `<span class="albumInfoLabelLogo albumInfoLabelLogoFallback">${albumInfoIcon("building")}</span>`;
  return `<span class="albumInfoLabelLogo${apple?" isAppleMark":""}${admin&&!label?.logo_url?" isReviewCandidate":""}"><img src="${escapeHtml(image)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">${albumInfoIcon("building")}</span>`;
}
function albumInfoLabelLogoCredit(label){
  const logo=label?.record_label_logo||{};
  if(!label?.logo_url||!logo.requires_attribution)return "";
  const text=String(logo.attribution_text||"Logo source and licence").trim();
  const url=String(logo.source_page_url||logo.license_url||"").trim();
  return url?`<a class="albumInfoLogoCredit" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(text)}${albumInfoIcon("external")}</a>`:`<span class="albumInfoLogoCredit">${escapeHtml(text)}</span>`;
}
function albumInfoLabelLogoAudit(label){
  const logo=label?.record_label_logo;
  if(!isAdminUnlocked())return "";
  if(!logo)return `<div class="albumInfoLogoAudit isEmpty"><strong>No reviewed logo source</strong><span>Text fallback is active.</span><button onclick="editAlbumInfoLabelLogo('${escapeJsString(label.id)}')">Add documented source</button></div>`;
  const status=String(logo.review_status||"needs_review").replace(/_/g," ");
  const details=[["Source",logo.source_type],["Licence / status",logo.license_name||logo.copyright_status],["Creator",logo.creator],["Attribution",logo.requires_attribution?(logo.attribution_text||"Required but missing"):"Not required by recorded licence"],["Trademark",logo.trademark_notice],["Review reason",logo.review_reason],["Last licence check",logo.last_license_check_at?new Date(logo.last_license_check_at).toLocaleDateString():""]].filter(([,value])=>String(value||"").trim());
  const source=logo.source_page_url?`<a href="${escapeHtml(logo.source_page_url)}" target="_blank" rel="noopener">Open exact source page${albumInfoIcon("external")}</a>`:"";
  const approve=logo.review_status!=="approved"?`<button onclick="setAlbumInfoLabelLogoStatus('${escapeJsString(logo.id)}','approved')">Approve</button>`:"";
  const reject=logo.review_status!=="rejected"?`<button onclick="setAlbumInfoLabelLogoStatus('${escapeJsString(logo.id)}','rejected')">Reject</button>`:"";
  return `<div class="albumInfoLogoAudit status-${escapeHtml(String(logo.review_status||"needs_review"))}"><header><strong>${escapeHtml(status)}</strong>${logo.license_status_changed?"<em>Licence metadata changed</em>":""}</header><dl>${details.map(([term,value])=>`<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl><div>${source}${approve}${reject}<button onclick="editAlbumInfoLabelLogo('${escapeJsString(label.id)}')">Edit source</button></div></div>`;
}
function renderAlbumInfo(albumId=extras.currentAlbumId){
  const host=document.querySelector("#albumInfoPopup #albumInfoSection");
  const album=albumInfoCurrentAlbum(albumId);
  if(!host||!album)return;
  const info=extras.albumInfo[albumRef(album.id)];
  if(!info){host.innerHTML='<div class="albumInfoLoading"><span></span><p>Loading verified album information...</p></div>';return}
  if(info.error){host.innerHTML=`<div class="albumInfoUnavailable"><h3>Album information unavailable</h3><p>${escapeHtml(info.error)}</p></div>`;return}
  const metadata=info.metadata||{};
  const labels=Array.isArray(info.labels)?info.labels:[];
  const credits=albumInfoPresentationCredits(Array.isArray(info.credits)?info.credits:[]);
  const performers=credits.filter(item=>item.credit_type==="performer"&&!albumInfoIsGenericArtistCredit(item,album));
  const production=credits.filter(item=>item.credit_type==="production");
  const songwriting=credits.filter(item=>item.credit_type==="songwriting");
  const originalLabel=labels.find(label=>label.is_original_label)||labels[0];
  const albumRuntime=Math.max(0,Number(metadata.total_runtime_ms)||0),spotifyRuntime=albumInfoSpotifyRuntime(album);
  const runtimeDetails=[["Runtime",albumInfoRuntime(albumRuntime||spotifyRuntime),"clock"]];
  const hero=document.querySelector("#albumInfoPopup #albumInfoHero");
  if(hero)hero.outerHTML=albumInfoHeroHtml(album,info);
  const countryValue=albumInfoCountry(metadata.country),countryFlag=albumInfoCountryFlag(countryValue);
  const appleLogoOnly=normalizeAlbumName(originalLabel?.label_name)==="apple"||normalizeAlbumName(originalLabel?.label_name)==="apple records";
  const primaryDetails=[["Released",albumInfoReleaseDate(album,metadata),"calendar","","","","released"] ,["Label",originalLabel?.label_name,"building",originalLabel?.logo_url,"",appleLogoOnly?"appleOnly":"","label"],["Country",countryValue,"map","",countryFlag,"","country"]].filter(([,value])=>value!==undefined&&value!==null&&String(value).trim());
  const compactDetails=[["Tracks",metadata.track_count],...runtimeDetails.map(([label,value])=>[label,value])].filter(([,value])=>value!==undefined&&value!==null&&String(value).trim());
  const admin=isAdminUnlocked();
  const adminHead=admin?`<div class="albumInfoAdminBar"><span>Admin editing</span><button onclick="editAlbumInfoMetadata()">Edit details</button><button onclick="editAlbumInfoCountry()">${countryValue?"Edit":"Add"} country</button><button onclick="addAlbumInfoCredit()">Add credit</button><button onclick="addAlbumInfoLabel()">Add label</button><button onclick="editAlbumInfoSales()">${info.sales?.display_value?"Edit":"Add"} worldwide sales</button><button onclick="reloadAlbumInfoData()">Reload data</button></div>`:"";
  const spotifySource=!albumRuntime&&spotifyRuntime&&album.spotify_url?albumInfoSourceLink({source:"Spotify",source_url:album.spotify_url}):"";
  const informationPanel=`<section class="albumInformationPanel"><header><h4>Album Information</h4></header><div class="albumInformationPrimary">${primaryDetails.map(([label,value,icon,image,mark,variant,kind])=>{const classes=[image?"hasOrganizationMark":"",image&&variant?"hasCompactOrganizationMark":"",`albumInformationDetail-${kind}`].filter(Boolean).join(" ");return `<article class="${classes}"><i>${image?`<span class="albumInfoOrganizationMark${variant?" isAppleMark":""}"><img src="${escapeHtml(image)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">${albumInfoIcon(icon)}</span>`:mark?`<span class="albumInfoCountryFlag"><img src="${escapeHtml(mark)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">${albumInfoIcon(icon)}</span>`:albumInfoIcon(icon)}</i><div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div></article>`}).join("")}</div><div class="albumInformationCompact">${compactDetails.map(([label,value])=>`<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join("")}</div></section>`;
  const detailHtml=`<div class="albumSnapshotGrid">${informationPanel}${albumInfoAtAGlance(album,info)}</div><div class="albumInfoDetailSources">${albumInfoSourceLink(metadata)}${spotifySource}</div>`;
  const peopleGrid=items=>`<div class="albumInfoPeople">${items.map(item=>albumInfoPersonCard(item,admin)).join("")}</div>`;
  const performerGroups=albumInfoGroupPerformers(performers,album);
  const groupedPerformers=[["Core artists / band members",performerGroups.core],["Additional musicians",performerGroups.additional],["Guest performers",performerGroups.guest],["Orchestra / ensemble",performerGroups.ensemble]].filter(([,items])=>items.length);
  const performerBody=groupedPerformers.length?groupedPerformers.map(([title,items])=>`<div class="albumInfoPeopleGroup"><h4>${escapeHtml(title)}</h4>${peopleGrid(items)}</div>`).join(""):'<p class="infoEmpty">Credits unavailable.</p>';
  const songwriterBody=songwriting.length?(songwriting.length>4?`<details class="albumSongwriting"><summary>View album songwriting credits</summary>${peopleGrid(songwriting)}</details>`:peopleGrid(songwriting)):"";
  const schemaNote=admin&&info.schema_ready===false?'<p class="albumInfoSchemaNote">Run supabase/album-info-schema.sql to enable caching and admin edits.</p>':admin&&info.record_label_logo_schema_ready===false?'<p class="albumInfoSchemaNote">Run supabase/migrations/202608120003_record_label_logos.sql to enable conservative label-logo review and approvals.</p>':"";
  const sections=[["details","Album Snapshot","disc",detailHtml,"albumDetailsBlock"],["performers","Performing Artists","users",performerBody,"albumPerformersBlock"],["production","Production","sliders",production.length?peopleGrid(production):"","albumProductionBlock"],["writing","Songwriting","pen",songwriterBody,"albumWritingBlock"]].filter(([, , ,body])=>body);
  const navigation=`<nav class="albumInfoNav" aria-label="Album information sections">${sections.map(([id,title,icon])=>`<a href="#album-info-${id}">${albumInfoIcon(icon)}<span>${escapeHtml(title.replace("Album ",""))}</span></a>`).join("")}</nav>`;
  host.innerHTML=`${adminHead}${schemaNote}${navigation}${sections.map(([id,title,icon,body,className])=>albumInfoSection(id,title,icon,body,className)).join("")}`;
}
function albumInfoContentSignature(info){
  return JSON.stringify(info,(key,value)=>key==="cached"?undefined:value);
}
function albumInfoHasNamedPerformers(payload){
  const albumArtist=normalizeAlbumName(payload?.metadata?.artist);
  return Array.isArray(payload?.credits)&&payload.credits.some(row=>{
    if(row?.credit_type!=="performer"||!String(row?.person_name||"").trim())return false;
    const role=normalizeAlbumName([row?.role,row?.instrument].filter(Boolean).join(" "));
    return !(albumArtist&&normalizeAlbumName(row.person_name)===albumArtist&&(!role||["artist","performer","primary artist"].includes(role)));
  });
}
function albumInfoIsGenericArtistCredit(row,album){
  if(row?.credit_type!=="performer"||normalizeAlbumName(row?.person_name)!==normalizeAlbumName(album?.artist))return false;
  const role=normalizeAlbumName([row?.role,row?.instrument].filter(Boolean).join(" "));
  return !role||["artist","performer","primary artist"].includes(role);
}
async function loadAlbumInfo(album,force=false,quiet=false){
  const ref=albumRef(album?.id);
  if(!album||!ref)return null;
  if(extras.albumInfo[ref]&&!force){if(!quiet)renderAlbumInfo(ref);return extras.albumInfo[ref]}
  if(extras.albumInfoRequests[ref])return extras.albumInfoRequests[ref];
  const previous=extras.albumInfo[ref];
  if(!quiet)renderAlbumInfo(ref);
  const params=new URLSearchParams({album_ref:ref,album_id:String(album.id||""),title:album.title||"",artist:album.artist||"",year:String(albumReleaseYear(album)||"")});
  if(force){params.set("refresh","1");params.set("updated",String(Date.now()))}
  extras.albumInfoRequests[ref]=(async()=>{
    let changed=false;
    try{
      const adminPin=isAdminUnlocked()?normalizeAdminPinValue(sessionStorage.getItem("musicaAdminPin")||""):"";
      if(adminPin)params.set("admin_refresh",String(Date.now()));
      let response=await fetch(`/.netlify/functions/album-info?${params.toString()}`,{cache:"no-store",headers:adminPin?{"X-Muze-Admin-Pin":adminPin}:{}});
      let data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.message||data.error||"Album information could not be loaded.");
      if(!force&&adminPin&&data?.metadata&&!albumInfoHasNamedPerformers(data)){
        params.set("refresh","1");
        response=await fetch(`/.netlify/functions/album-info?${params.toString()}`,{cache:"no-store",headers:adminPin?{"X-Muze-Admin-Pin":adminPin}:{}});
        const refreshed=await response.json().catch(()=>({}));
        if(response.ok&&albumInfoHasNamedPerformers(refreshed))data=refreshed;
      }
      changed=albumInfoContentSignature(previous)!==albumInfoContentSignature(data);
      extras.albumInfo[ref]=data;
    }catch(error){
      if(!previous){
        extras.albumInfo[ref]={error:error.message||"Album information could not be loaded."};
        changed=true;
      }
    }
    finally{delete extras.albumInfoRequests[ref]}
    if(extras.currentAlbumId===ref&&(!quiet||changed))renderAlbumInfo(ref);
    return extras.albumInfo[ref];
  })();
  return extras.albumInfoRequests[ref];
}
async function albumInfoAdminRequest(payload){
  const pin=normalizeAdminPinValue(sessionStorage.getItem("musicaAdminPin")||"");
  if(!pin){alert("Unlock admin mode first.");return null}
  const response=await fetch("/.netlify/functions/album-info",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...payload,pin})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){alert(data.message||data.error||"Album info could not be saved.");return null}
  const album=albumInfoCurrentAlbum();
  if(album&&data.info){
    extras.albumInfo[albumRef(album.id)]=data.info;
    renderAlbumInfo(album.id);
  }
  return data;
}
function albumInfoAdminBase(action){const album=albumInfoCurrentAlbum();return album?{action,album_ref:albumRef(album.id),album_id:String(album.id||""),title:album.title||"",artist:album.artist||""}:null}
window.reloadAlbumInfoData=async function(){
  const album=albumInfoCurrentAlbum();
  if(!album)return;
  await loadAlbumInfo(album,true);
}
function promptNullable(label,current=""){const value=prompt(label,current??"");return value===null?null:value.trim()}
function albumInfoManualCountry(value){
  const text=String(value||"").trim();
  const code=text.toUpperCase();
  if(!/^[A-Z]{2}$/.test(code))return text;
  const aliases={US:"United States",GB:"United Kingdom",CA:"Canada",AU:"Australia",NZ:"New Zealand"};
  if(aliases[code])return aliases[code];
  try{return new Intl.DisplayNames(["en"],{type:"region"}).of(code)||text}catch(error){return text}
}
window.editAlbumInfoCountry=async function(){
  const album=albumInfoCurrentAlbum(),info=album&&extras.albumInfo[albumRef(album.id)],row=info?.metadata||{};
  if(!album)return;
  const entered=promptNullable("Country of original release (full name or two-letter code)",albumInfoCountry(row.country)||row.country||"");
  if(entered===null)return;
  const country=albumInfoManualCountry(entered);
  if(!country){alert("Enter a country before saving.");return}
  await albumInfoAdminRequest({...albumInfoAdminBase("save_metadata"),original_release_date:row.original_release_date||"",release_year:Number(row.release_year||albumReleaseYear(album))||null,country,album_type:row.album_type||"Album",total_runtime_ms:row.total_runtime_ms||null,track_count:row.track_count||null,source:"Admin verified",source_url:row.source_url||"",source_confidence:"verified",manually_verified:true});
}
window.editAlbumInfoMetadata=async function(){
  const album=albumInfoCurrentAlbum(),info=album&&extras.albumInfo[albumRef(album.id)],row=info?.metadata||{};
  if(!album)return;
  const original_release_date=promptNullable("Original release date (YYYY-MM-DD)",row.original_release_date||"");if(original_release_date===null)return;
  const country=promptNullable("Country of original release",row.country||"");if(country===null)return;
  const album_type=promptNullable("Album type",row.album_type||"Album");if(album_type===null)return;
  const source_url=promptNullable("Supporting source URL",row.source_url||"");if(source_url===null)return;
  await albumInfoAdminRequest({...albumInfoAdminBase("save_metadata"),original_release_date,release_year:Number(original_release_date.slice(0,4)||album.year)||null,country,album_type,total_runtime_ms:row.total_runtime_ms||null,track_count:row.track_count||null,source:"Admin verified",source_url,source_confidence:"verified",manually_verified:true});
}
window.addAlbumInfoCredit=async function(existingId=""){
  const album=albumInfoCurrentAlbum(),items=album?extras.albumInfo[albumRef(album.id)]?.credits||[]:[],row=items.find(item=>String(item.id)===String(existingId))||{};
  const person_name=promptNullable("Person or artist name",row.person_name||"");if(!person_name)return;
  const credit_type=promptNullable("Credit type: performer, production, or songwriting",row.credit_type||"performer");if(!credit_type)return;
  const role=promptNullable("Role (for example Producer or Vocals)",row.role||"");if(role===null)return;
  const instrument=promptNullable("Instrument(s), comma separated",row.instrument||"");if(instrument===null)return;
  const image_url=promptNullable("Profile image URL (optional)",row.image_url||"");if(image_url===null)return;
  let image_source_url=row.image_source_url||"",image_author=row.image_author||"",image_license=row.image_license||"",image_license_url=row.image_license_url||"",image_attribution=row.image_attribution||"",image_status=row.image_status||"",image_approved=Boolean(row.image_approved);
  if(image_url){
    image_source_url=promptNullable("Wikimedia Commons file-page URL",image_source_url);if(image_source_url===null)return;
    image_author=promptNullable("Photographer / creator",image_author);if(image_author===null)return;
    image_license=promptNullable("Licence (for example CC BY-SA 4.0)",image_license);if(image_license===null)return;
    image_license_url=promptNullable("Licence URL",image_license_url);if(image_license_url===null)return;
    image_attribution=promptNullable("Attribution text",image_attribution||`Photo: ${image_author} / Wikimedia Commons / ${image_license}`);if(image_attribution===null)return;
    image_approved=confirm("Approve this licensed Wikimedia Commons portrait for public display?");
    image_status=image_approved?"approved":"candidate";
  }else{
    image_source_url="";image_author="";image_license="";image_license_url="";image_attribution="";image_status="unavailable";image_approved=false;
  }
  const source_url=promptNullable("Supporting source URL",row.source_url||"");if(source_url===null)return;
  await albumInfoAdminRequest({...albumInfoAdminBase("save_credit"),id:existingId||undefined,person_name,credit_type,role,instrument,image_url,image_source_url,image_author,image_license,image_license_url,image_attribution,image_modified:image_url?"Displayed with a circular crop":"",image_status,image_approved,image_last_verified_at:image_url?new Date().toISOString():null,source:"Admin verified",source_url,manually_verified:true});
}
function albumInfoCreditEditorField(label,name,value,{textarea=false,type="text"}={}){
  const control=textarea
    ?`<textarea name="${escapeHtml(name)}" rows="3">${escapeHtml(value||"")}</textarea>`
    :`<input type="${escapeHtml(type)}" name="${escapeHtml(name)}" value="${escapeHtml(value||"")}">`;
  return `<label><span>${escapeHtml(label)}</span>${control}</label>`;
}
window.closeAlbumInfoCreditEditor=function(){
  const dialog=document.querySelector("#albumInfoCreditEditor");
  if(!dialog)return;
  if(dialog.open)dialog.close();
  dialog.remove();
}
window.editAlbumInfoCredit=function(id,personName="",creditType=""){
  const album=albumInfoCurrentAlbum(),items=album?extras.albumInfo[albumRef(album.id)]?.credits||[]:[];
  const row=items.find(item=>(id&&String(item.id)===String(id))||(!id&&normalizeAlbumName(item.person_name)===normalizeAlbumName(personName)&&normalizeAlbumName(item.credit_type)===normalizeAlbumName(creditType)));
  if(!row){alert("This credit could not be found. Refresh Details & Credits and try again.");return}
  closeAlbumInfoCreditEditor();
  const dialog=document.createElement("dialog");
  dialog.id="albumInfoCreditEditor";
  dialog.className="albumInfoCreditEditor";
  dialog.innerHTML=`<form method="dialog" onsubmit="saveAlbumInfoCreditEditor(event,'${escapeJsString(id)}')"><input type="hidden" name="original_person_name" value="${escapeHtml(row.person_name||"")}"><input type="hidden" name="original_credit_type" value="${escapeHtml(row.credit_type||"")}">
    <header><div><span>Admin credit editor</span><h3>Edit ${escapeHtml(row.person_name||"album credit")}</h3><p>All displayed credit text can be changed here.</p></div><button type="button" class="albumCreditEditorClose" onclick="closeAlbumInfoCreditEditor()" aria-label="Close">&times;</button></header>
    <div class="albumCreditEditorGrid">
      ${albumInfoCreditEditorField("Person or artist name","person_name",row.person_name)}
      <label><span>Credit section</span><select name="credit_type"><option value="performer"${row.credit_type==="performer"?" selected":""}>Performing Artists</option><option value="production"${row.credit_type==="production"?" selected":""}>Production</option><option value="songwriting"${row.credit_type==="songwriting"?" selected":""}>Songwriting</option></select></label>
      ${albumInfoCreditEditorField("Main credit / role","role",row.role,{textarea:true})}
      ${albumInfoCreditEditorField("Additional roles and instruments","instrument",row.instrument,{textarea:true})}
      ${albumInfoCreditEditorField("Supporting source URL","source_url",row.source_url,{type:"url"})}
    </div>
    <details class="albumCreditPortraitFields"><summary>Portrait and attribution details</summary><div class="albumCreditEditorGrid">
      ${albumInfoCreditEditorField("Portrait image URL","image_url",row.image_url,{type:"url"})}
      ${albumInfoCreditEditorField("Wikimedia Commons file-page URL","image_source_url",row.image_source_url,{type:"url"})}
      ${albumInfoCreditEditorField("Photographer / creator","image_author",row.image_author)}
      ${albumInfoCreditEditorField("Licence","image_license",row.image_license)}
      ${albumInfoCreditEditorField("Licence URL","image_license_url",row.image_license_url,{type:"url"})}
      ${albumInfoCreditEditorField("Attribution text","image_attribution",row.image_attribution,{textarea:true})}
    </div></details>
    <footer><button type="button" onclick="closeAlbumInfoCreditEditor()">Cancel</button><button type="submit" class="primary">Save all changes</button></footer>
  </form>`;
  dialog.addEventListener("click",event=>{if(event.target===dialog)closeAlbumInfoCreditEditor()});
  document.body.appendChild(dialog);
  dialog.showModal();
  dialog.querySelector('[name="person_name"]')?.focus();
}
window.saveAlbumInfoCreditEditor=async function(event,id){
  event.preventDefault();
  const form=event.currentTarget,album=albumInfoCurrentAlbum(),items=album?extras.albumInfo[albumRef(album.id)]?.credits||[]:[];
  const data=new FormData(form),originalPersonName=String(data.get("original_person_name")||"").trim(),originalCreditType=String(data.get("original_credit_type")||"").trim();
  const row=items.find(item=>(id&&String(item.id)===String(id))||(!id&&normalizeAlbumName(item.person_name)===normalizeAlbumName(originalPersonName)&&normalizeAlbumName(item.credit_type)===normalizeAlbumName(originalCreditType)));
  if(!row)return;
  const person_name=String(data.get("person_name")||"").trim();
  if(!person_name){form.querySelector('[name="person_name"]')?.focus();return}
  const submit=form.querySelector('button[type="submit"]');
  if(submit){submit.disabled=true;submit.textContent="Saving..."}
  const image_url=String(data.get("image_url")||"").trim();
  const saved=await albumInfoAdminRequest({...albumInfoAdminBase("save_credit"),id:id||undefined,original_person_name:originalPersonName,original_credit_type:originalCreditType,person_name,
    credit_type:String(data.get("credit_type")||"performer").trim(),role:String(data.get("role")||"").trim(),instrument:String(data.get("instrument")||"").trim(),
    image_url,image_source_url:String(data.get("image_source_url")||"").trim(),image_author:String(data.get("image_author")||"").trim(),image_license:String(data.get("image_license")||"").trim(),image_license_url:String(data.get("image_license_url")||"").trim(),image_attribution:String(data.get("image_attribution")||"").trim(),
    image_modified:row.image_modified||(image_url?"Displayed with a circular crop":""),image_status:row.image_status||(image_url?"candidate":"unavailable"),image_approved:Boolean(row.image_approved),image_last_verified_at:row.image_last_verified_at||null,
    person_id:row.person_id||null,person_wikidata_id:row.person_wikidata_id||null,sort_order:row.sort_order||0,source:"Admin verified",source_url:String(data.get("source_url")||"").trim(),source_secondary:row.source_secondary||null,source_secondary_url:row.source_secondary_url||null,manually_verified:true});
  if(saved)closeAlbumInfoCreditEditor();
  else if(submit){submit.disabled=false;submit.textContent="Save all changes"}
}
window.deleteAlbumInfoCredit=async function(id,person_name="",credit_type=""){if(confirm("Delete this credit?"))await albumInfoAdminRequest({...albumInfoAdminBase("delete_credit"),id:id||undefined,person_name,credit_type})}
window.setAlbumInfoPortraitStatus=async function(id,person_name,credit_type,status){
  const question=status==="approved"?"Approve this artist portrait?":"Replace this portrait with another licensed option, or use initials if none is available?";
  if(!confirm(question))return;
  const album=albumInfoCurrentAlbum(),credits=album?extras.albumInfo[albumRef(album.id)]?.credits||[]:[];
  const row=credits.find(item=>(id&&String(item.id)===String(id))||(!id&&String(item.person_name)===String(person_name)&&String(item.credit_type)===String(credit_type)))||{};
  const saved=await albumInfoAdminRequest({...albumInfoAdminBase("set_credit_image_status"),id,person_name,credit_type,image_status:status,person_id:row.person_id||"",person_wikidata_id:row.person_wikidata_id||"",role:row.role||"",instrument:row.instrument||"",sort_order:row.sort_order||0,source:row.source||"",source_url:row.source_url||"",image_url:row.image_url||"",image_source_url:row.image_source_url||"",image_author:row.image_author||"",image_license:row.image_license||"",image_license_url:row.image_license_url||"",image_attribution:row.image_attribution||"",image_modified:row.image_modified||""});
  if(!saved||!album)return;
  const refreshed=extras.albumInfo[albumRef(album.id)];
  if(status!=="approved"){renderAlbumInfo(album.id);return}
  (refreshed?.credits||[]).forEach(item=>{
    if(normalizeAlbumName(item.person_name)===normalizeAlbumName(person_name)&&normalizeAlbumName(item.credit_type)===normalizeAlbumName(credit_type)){
      item.image_status="approved";
      item.image_approved=true;
      ["image_url","image_source_url","image_author","image_license","image_license_url","image_attribution","image_modified","person_wikidata_id"].forEach(field=>{if(row[field])item[field]=row[field]});
    }
  });
  renderAlbumInfo(album.id);
}
window.addAlbumInfoLabel=async function(existingId=""){
  const album=albumInfoCurrentAlbum(),items=album?extras.albumInfo[albumRef(album.id)]?.labels||[]:[],row=items.find(item=>String(item.id)===String(existingId))||{};
  const label_name=promptNullable("Record label",row.label_name||"");if(!label_name)return;
  const label_type=promptNullable("Label type (label, imprint, distributor, or reissue)",row.label_type||"label");if(!label_type)return;
  const original=confirm("Mark this as the original release label?");
  const source_url=promptNullable("Supporting source URL",row.source_url||"");if(source_url===null)return;
  await albumInfoAdminRequest({...albumInfoAdminBase("save_label"),id:existingId||undefined,label_name,label_type,is_original_label:original,release_region:row.release_region||"",source:"Admin verified",source_url,manually_verified:true});
}
window.editAlbumInfoLabel=id=>window.addAlbumInfoLabel(id);
window.deleteAlbumInfoLabel=async function(id){if(confirm("Delete this label?"))await albumInfoAdminRequest({...albumInfoAdminBase("delete_label"),id})}
window.editAlbumInfoLabelLogo=async function(labelId){
  const album=albumInfoCurrentAlbum(),labels=album?extras.albumInfo[albumRef(album.id)]?.labels||[]:[],label=labels.find(item=>String(item.id)===String(labelId));
  if(!label){alert("Save the record label before adding a logo source.");return}
  const row=label.record_label_logo||{};
  const source_type=promptNullable("Source type: Wikimedia Commons or Official brand assets",row.source_type||"Wikimedia Commons");if(!source_type)return;
  const source_page_url=promptNullable("Exact source or brand-assets page URL",row.source_page_url||"");if(!source_page_url)return;
  const logo_url=promptNullable("Display image URL from that documented source",row.logo_url||"");if(!logo_url)return;
  const source_file_url=promptNullable("Original source file URL",row.source_file_url||logo_url);if(source_file_url===null)return;
  const license_name=promptNullable("Licence name, or stated copyright status",row.license_name||"");if(license_name===null)return;
  const license_url=promptNullable("Licence or usage-terms URL",row.license_url||"");if(license_url===null)return;
  const copyright_status=promptNullable("Copyright status",row.copyright_status||"");if(copyright_status===null)return;
  const creator=promptNullable("Creator / rights holder",row.creator||"");if(creator===null)return;
  const requires_attribution=confirm("Does this source require attribution?");
  const attribution_text=requires_attribution?promptNullable("Exact attribution text",row.attribution_text||""):"";if(attribution_text===null)return;
  const trademark_notice=promptNullable("Trademark warning or usage limitation",row.trademark_notice||"Logo may be protected by trademark rights; identification use only.");if(trademark_notice===null)return;
  const commercial_use_allowed=confirm("Do the recorded source terms clearly permit this intended commercial identification use? Choose Cancel when uncertain.");
  const review_reason=promptNullable("Why is this source usable or uncertain?",row.review_reason||"");if(review_reason===null)return;
  const notes=promptNullable("Internal review notes",row.notes||"");if(notes===null)return;
  await albumInfoAdminRequest({...albumInfoAdminBase("save_label_logo"),label_id:label.id,label_name:label.label_name,logo_url,source_type,source_page_url,source_file_url,license_name,license_url,copyright_status,creator,requires_attribution,attribution_text,trademark_notice,commercial_use_allowed,review_reason,notes});
}
window.setAlbumInfoLabelLogoStatus=async function(id,status){
  const approved=status==="approved";
  if(!confirm(approved?"Approve this logo for label identification only? Confirm that you reviewed its source, reuse terms, attribution, and trademark warning.":"Reject this logo and keep the text fallback?"))return;
  const approved_by=approved?promptNullable("Approved by",currentUsername?.()||"Muze admin"):"";if(approved&& !approved_by)return;
  const approval_notes=promptNullable(approved?"Approval notes":"Rejection notes","");if(approval_notes===null)return;
  if(approved&&!approval_notes){alert("Approval notes are required for the logo audit trail.");return}
  await albumInfoAdminRequest({...albumInfoAdminBase("set_label_logo_status"),id,review_status:status,approved_by,approval_notes});
}
window.editAlbumInfoSales=async function(){
  const album=albumInfoCurrentAlbum(),row=album?extras.albumInfo[albumRef(album.id)]?.sales||{}:{};
  const display_value=promptNullable("Reported worldwide sales (for example: 30 million or More than 5 million)",row.display_value||"");if(display_value===null)return;
  if(!display_value){alert("Enter the reported worldwide-sales figure.");return}
  const source_url=promptNullable("Supporting source URL",row.source_url||"");if(source_url===null)return;
  await albumInfoAdminRequest({...albumInfoAdminBase("save_sales"),display_value,confidence:"Reported Worldwide Sales",source:"Admin verified",source_url,manually_verified:true});
}
window.addAlbumInfoCertification=async function(existingId=""){
  const album=albumInfoCurrentAlbum(),items=album?extras.albumInfo[albumRef(album.id)]?.certifications||[]:[],row=items.find(item=>String(item.id)===String(existingId))||{};
  const country=promptNullable("Certification country",row.country||"");if(!country)return;
  const certification=promptNullable("Certification (for example: 4× Platinum)",row.certification||"");if(!certification)return;
  const organization=promptNullable("Certifying organization",row.organization||"");if(organization===null)return;
  const source_url=promptNullable("Supporting source URL",row.source_url||"");if(source_url===null)return;
  await albumInfoAdminRequest({...albumInfoAdminBase("save_certification"),id:existingId||undefined,country,certification,organization,source:"Admin verified",source_url,manually_verified:true});
}
window.editAlbumInfoCertification=id=>window.addAlbumInfoCertification(id);
window.deleteAlbumInfoCertification=async function(id){if(confirm("Delete this certification?"))await albumInfoAdminRequest({...albumInfoAdminBase("delete_certification"),id})}
async function loadAlbumExtras(album){
  extras.currentAlbumId=albumRef(album.id);
  await Promise.all([loadComments(album.id),loadTrackRatings(album.id),loadSongScores(album.id),loadRatingDetails(album.id)]);
  renderComments(album.id);
  renderRatingDetails(album.id);
  const tracks=await fetchAlbumTracks(album);
  if(extras.currentAlbumId!==albumRef(album.id))return;
  renderTrackList(album.id,tracks);
  renderAlbumOverviewMoments(album.id,tracks);
  if(!document.querySelector("#albumInfoPopup.hidden"))renderAlbumInfo(album.id);
}
window.setAlbumPopupTab=function(tab){
  if(tab==="overview"){
    openAlbumOverviewPopup();
    return;
  }
  if(tab==="info"){
    openAlbumInfoPopup();
    return;
  }
  document.querySelectorAll(".linerTabs button").forEach(btn=>btn.classList.toggle("active",btn.dataset.albumTab===tab));
  const page=document.querySelector(".linerAlbumPage");
  if(page)page.classList.toggle("showRatingsPanels",tab==="ratings");
  if(tab==="tracks"){
    const target=document.querySelector("#trackRatingsList")||document.querySelector(".albumTrackSections");
    if(target)target.scrollIntoView({behavior:"smooth",block:"start"});
    return;
  }
  if(tab==="ratings"){
    const target=document.querySelector(".linerContentGrid")||document.querySelector("#albumRatingsSection");
    if(target)target.scrollIntoView({behavior:"smooth",block:"start"});
    return;
  }
  const target=document.querySelector(".linerHero");
  if(target)target.scrollIntoView({behavior:"smooth",block:"start"});
}
function updateAlbumSeeMorePlacement(){
  const modal=$("#albumModal");
  const pill=document.querySelector("#albumModal .albumSeeMorePill");
  if(!modal||!pill)return;
  pill.style.left="";
  pill.style.top="";
  pill.style.bottom="";
  pill.style.transform="";
  if(modal.classList.contains("hidden")||window.innerWidth<=1050)return;
  const panel=modal.querySelector(".modalPanel");
  if(!panel)return;
  const panelRect=panel.getBoundingClientRect();
  const pillRect=pill.getBoundingClientRect();
  const pillHeight=pillRect.height||24;
  pill.style.left=`${panelRect.left+(panelRect.width/2)}px`;
  pill.style.top=`${Math.max(panelRect.top+18,panelRect.bottom-pillHeight-38)}px`;
  pill.style.bottom="auto";
  pill.style.transform="translateX(-50%)";
}
function albumModalScrollContainer(){
  const modal=document.querySelector("#albumModal");
  const panel=document.querySelector("#albumModal .modalPanel");
  if(window.innerWidth<=850)return modal||panel||document.scrollingElement;
  return panel||modal||document.scrollingElement;
}
window.scrollAlbumSeeMore=function(event){
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const target=document.querySelector("#albumModal .linerFeaturedTrack")||document.querySelector("#albumModal #trackRatingsList")||document.querySelector("#albumModal .albumTrackSections");
  if(!target)return;
  const scroller=albumModalScrollContainer();
  if(scroller&&typeof scroller.scrollTo==="function"&&scroller.scrollHeight>scroller.clientHeight+4){
    const rect=scroller.getBoundingClientRect?.()||{top:0};
    const targetRect=target.getBoundingClientRect();
    const top=(scroller.scrollTop||0)+targetRect.top-rect.top-12;
    scroller.scrollTo({top:Math.max(0,top),behavior:"smooth"});
    return;
  }
  target.scrollIntoView({behavior:"smooth",block:"start"});
}
function fitAlbumOverviewPopup(){
  const popup=$("#albumOverviewPopup");
  if(!popup||popup.classList.contains("hidden"))return;
  const panel=popup.querySelector(".albumOverviewPopupPanel");
  if(!panel)return;
  if(window.innerWidth>900){
    popup.style.removeProperty("--overview-mobile-scale");
    return;
  }
  const desktopWidth=760;
  const available=Math.max(280,panel.clientWidth||window.innerWidth-24);
  const scale=Math.min(1,available/desktopWidth);
  popup.style.setProperty("--overview-mobile-scale",scale.toFixed(4));
}
if(!window.__albumOverviewFitBound){
  window.__albumOverviewFitBound=true;
  window.addEventListener("resize",fitAlbumOverviewPopup);
  window.addEventListener("resize",()=>requestAnimationFrame(syncOverviewExpandableText));
}
function syncOverviewExpandableText(){
  document.querySelectorAll(".albumOverviewSleeve .overviewFeatureArt blockquote").forEach(quoteBox=>{
    const text=quoteBox.querySelector(".overviewQuoteText");
    const popover=quoteBox.parentElement?.querySelector?.(".overviewQuotePopover");
    if(!text||!popover)return;
    const clipped=text.scrollHeight>text.clientHeight+1||text.scrollWidth>text.clientWidth+1;
    quoteBox.classList.toggle("quoteCanExpand",clipped);
    quoteBox.classList.remove("quotePopoverOpen");
    popover.classList.add("hidden");
    quoteBox.setAttribute("aria-expanded","false");
    if(clipped){
      quoteBox.setAttribute("role","button");
      quoteBox.setAttribute("tabindex","0");
    }else{
      quoteBox.removeAttribute("role");
      quoteBox.removeAttribute("tabindex");
    }
  });
  document.querySelectorAll(".albumOverviewSleeve .overviewPoint").forEach(point=>{
    const text=point.querySelector("p");
    if(!text)return;
    point.classList.remove("overviewPointExpanded");
    const clipped=text.scrollHeight>text.clientHeight+1;
    point.classList.toggle("overviewPointCanExpand",clipped);
    point.setAttribute("aria-expanded","false");
    if(clipped){
      point.setAttribute("role","button");
      point.setAttribute("tabindex","0");
    }else{
      point.removeAttribute("role");
      point.removeAttribute("tabindex");
    }
  });
}
window.openAlbumOverviewPopup=function(){
  const album=state.albums.find(x=>albumRef(x.id)===albumRef(extras.currentAlbumId));
  if(!album)return;
  const albumId=escapeJsString(album.id);
    const coverUrl=escapeHtml(album.cover_url||"");
  const albumScore=displayScore(album);
  const total=count(album).toLocaleString();
  const customOverview=albumCustomOverview(album);
  const canEditOverview=isAdminUnlocked();
  let popup=$("#albumOverviewPopup");
  if(!popup){
    popup=document.createElement("div");
    popup.id="albumOverviewPopup";
    popup.className="albumOverviewPopup hidden";
    document.body.appendChild(popup);
  }
  popup.innerHTML=`<div class="albumOverviewBackdrop" onclick="closeAlbumOverviewPopup()"></div><div class="albumOverviewPopupPanel"><button class="albumOverviewClose" onclick="closeAlbumOverviewPopup()">&times;</button>${albumOverviewHtml(album,{albumId,coverUrl,albumScore,total,customOverview,canEditOverview})}</div>`;
  popup.classList.remove("hidden");
  fitAlbumOverviewPopup();
  requestAnimationFrame(fitAlbumOverviewPopup);
  requestAnimationFrame(syncOverviewExpandableText);
  renderAlbumOverviewMoments(album.id,extras.tracks[albumRef(album.id)]||[]);
}
window.closeAlbumOverviewPopup=function(){
  const popup=$("#albumOverviewPopup");
  if(popup)popup.classList.add("hidden");
}
window.openAlbumInfoPopup=async function(){
  const album=albumInfoCurrentAlbum();
  if(!album)return;
  const ref=albumRef(album.id);
  const savedInfo=extras.albumInfo[ref];
  if(isAdminUnlocked()&&savedInfo?.metadata&&!albumInfoHasNamedPerformers(savedInfo)&&!extras.albumInfoRequests[ref])await loadAlbumInfo(album,true,true);
  if(!isAdminUnlocked()&&!extras.albumInfo[ref]&&!extras.albumInfoRequests[ref])await loadAlbumInfo(album,false,true);
  let popup=$("#albumInfoPopup");
  if(!popup){
    popup=document.createElement("div");
    popup.id="albumInfoPopup";
    popup.className="albumOverviewPopup albumInfoPopup hidden";
    document.body.appendChild(popup);
  }
  if(popup.dataset.albumRef===ref&&popup.querySelector("#albumInfoSection")){
    popup.classList.remove("hidden");
    if(!extras.albumInfo[ref]&&!extras.albumInfoRequests[ref])loadAlbumInfo(album);
    return;
  }
  popup.dataset.albumRef=ref;
  const hasCachedInfo=Boolean(extras.albumInfo[ref]);
  const initialSection=hasCachedInfo?"":'<div class="albumInfoLoading"><span></span><p>Loading verified album information...</p></div>';
  popup.innerHTML=`<div class="albumOverviewBackdrop" onclick="closeAlbumInfoPopup()"></div><div class="albumOverviewPopupPanel albumInfoPopupPanel"><button class="albumOverviewClose" onclick="closeAlbumInfoPopup()" aria-label="Close album information">&times;</button><div class="albumInfoPage">${albumInfoHeroHtml(album,extras.albumInfo[ref]||{})}<section id="albumInfoSection" class="albumInfoSection" aria-label="Album information">${initialSection}</section></div></div>`;
  popup.classList.remove("hidden");
  renderAlbumInfo(album.id);
  if(!hasCachedInfo)loadAlbumInfo(album);
}
window.closeAlbumInfoPopup=function(){
  const popup=$("#albumInfoPopup");
  if(popup)popup.classList.add("hidden");
}
window.openReactionReplyBox=function(albumId,commentId,name){
  if(!requireAuth("chat",()=>window.openReactionReplyBox(albumId,commentId,name)))return;
  document.querySelectorAll(".reactionReplyBox").forEach(box=>box.classList.add("hidden"));
  const box=$("#reactionReplyBox-"+domSafeId(commentId));
  if(!box)return;
  box.classList.remove("hidden");
  const textarea=box.querySelector("textarea");
  if(textarea){textarea.placeholder=`Reply to ${name||"Listener"}...`;textarea.focus()}
}
window.openListenerCardReply=function(albumId,commentId,name){
  if(!requireAuth("chat",()=>window.openListenerCardReply(albumId,commentId,name)))return;
  document.querySelectorAll(".listenerReplyBox").forEach(box=>box.classList.add("hidden"));
  const box=$("#listenerReplyBox-"+domSafeId(commentId));
  if(!box)return;
  box.classList.remove("hidden");
  const textarea=box.querySelector("textarea");
  if(textarea){textarea.placeholder=`Reply to ${name||"Listener"}...`;textarea.focus()}
}
window.closeListenerCardReply=function(commentId){
  const box=$("#listenerReplyBox-"+domSafeId(commentId));
  if(box)box.classList.add("hidden");
}
window.closeReactionReplyBox=function(commentId){
  const box=$("#reactionReplyBox-"+domSafeId(commentId));
  if(box)box.classList.add("hidden");
}
async function postReactionReply(albumId,commentId,reply,textarea=null){
  if(!reply)return;
  const ref=albumRef(albumId);
  const name=(currentUsername()||$("#commentName")?.value||"Listener").trim()||"Listener";
  const profile=commentProfilePayload();
  const optimisticReply={id:localId("reply"),comment_id:commentId,name,reply,created_at:new Date().toISOString(),...profile};
  const all=localCommentReplies();
  all[ref]=all[ref]||{};
  all[ref][commentId]=all[ref][commentId]||[];
  const existsLocal=all[ref][commentId].some(item=>String(item.reply||item.comment||"")===reply&&String(item.name||"")===name);
  if(!existsLocal)all[ref][commentId].push(optimisticReply);
  saveLocalCommentReplies(all);
  if(db){
    let result=await db.from("album_comment_replies").insert({album_ref:ref,comment_id:commentId,device_id:state.deviceId,name,reply,user_id:profile.user_id,avatar_url:profile.avatar_url||null});
    if(result.error&&/column|schema cache|avatar_url|user_id/i.test(result.error.message||"")){
      result=await db.from("album_comment_replies").insert({album_ref:ref,comment_id:commentId,device_id:state.deviceId,name,reply});
    }
    if(result.error)console.warn("Saved reply locally because Supabase rejected it:",result.error.message);
  }
  if(textarea)textarea.value="";
  await loadComments(albumId);
  extras.commentReplies[ref]=extras.commentReplies[ref]||{};
  extras.commentReplies[ref][commentId]=extras.commentReplies[ref][commentId]||[];
  const exists=extras.commentReplies[ref][commentId].some(item=>String(item.reply||"")===reply&&String(item.name||"")===name);
  if(!exists)extras.commentReplies[ref][commentId].push(optimisticReply);
  const album=state.albums.find(item=>String(item.id)===String(albumId))||{};
  await createMentionNotifications(reply,{entity_type:"album_comment_reply",entity_id:commentId,album_ref:ref,album_title:album.title||"",body:`${name} mentioned you in a reply${album.title?` on ${album.title}`:""}.`});
  renderComments(albumId);
  const replies=$("#reactionReplies-"+domSafeId(commentId));
  if(replies)replies.classList.remove("hidden");
}
window.submitReactionReply=async function(albumId,commentId){
  if(!requireAuth("chat",()=>window.submitReactionReply(albumId,commentId)))return;
  const box=$("#reactionReplyBox-"+domSafeId(commentId));
  const textarea=box?.querySelector("textarea");
  await postReactionReply(albumId,commentId,(textarea?.value||"").trim(),textarea);
}
window.submitListenerCardReply=async function(albumId,commentId){
  if(!requireAuth("chat",()=>window.submitListenerCardReply(albumId,commentId)))return;
  const box=$("#listenerReplyBox-"+domSafeId(commentId));
  const textarea=box?.querySelector("textarea");
  await postReactionReply(albumId,commentId,(textarea?.value||"").trim(),textarea);
}
window.toggleReactionReplies=function(button){
  const replies=button?.closest(".reactionBody")?.querySelector(".reactionReplies");
  if(!replies)return;
  const hidden=replies.classList.toggle("hidden");
  button.textContent=hidden?button.textContent.replace("Hide","View"):button.textContent.replace("View","Hide");
}
window.toggleReactionMenu=function(button){
  const card=button?.closest(".linerReaction");
  if(card)card.classList.toggle("reactionMenuOpen");
}
window.toggleAllReactions=function(){
  const host=$("#commentsList");
  const button=$("#allReactionsButton");
  if(!host||!button)return;
  const expanded=host.classList.toggle("showAllReactions");
  button.classList.toggle("expanded",expanded);
}
function canUseLocalAdminFallback(action){return ["save","delete_overview","set_album_score","set_rating_count","set_mood_score","set_album_genre","set_loved_track","set_hero_focus","set_overview_focus","set_moment_focus","set_hero_image","set_moment_image","add_library_album"].includes(action)}
function localAdminFallbackResponse(payload,reason){
  if(!isLocalRuntime()||!canUseLocalAdminFallback(payload?.action))return null;
  adminDebug("request local fallback",{action:payload.action,reason});
  setAdminInlineStatus("Saved locally in this browser. Use Netlify to save for everyone.","success");
  return {ok:true,localOnly:true,row:{...(payload||{}),__localOnly:true}};
}
async function adminOverviewRequest(payload){
  const pin=normalizeAdminPinValue(sessionStorage.getItem("musicaAdminPin")||"");
  if(!pin){setAdminInlineStatus("Please unlock admin mode first.","error");return null}
  adminDebug("request start",{action:payload.action,pinLength:pin.length,isLocalRuntime:isLocalRuntime()});
  try{
    const res=await fetch("/.netlify/functions/admin-overview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...payload,pin})});
    const data=await res.json().catch(()=>({}));
    adminDebug("request response",{action:payload.action,status:res.status,ok:res.ok,serverDebug:data.debug||null});
    if(!res.ok){
      const fallback=localAdminFallbackResponse(payload,`http ${res.status}`);
      if(fallback)return fallback;
      setAdminInlineStatus(data.error||"Admin action failed.","error");
      return null;
    }
    return data;
  }catch(error){
    adminDebug("request network error",{action:payload.action,message:error.message,isLocalRuntime:isLocalRuntime()});
    const fallback=localAdminFallbackResponse(payload,error.message);
    if(fallback)return fallback;
    setAdminInlineStatus("Admin action failed. Use Netlify Dev locally or the deployed Netlify site so the admin function can validate the admin PIN.","error");
    return null;
  }
}
function adminAlbumPayload(album,action){const title=String(album?.title||album?.name||album?.album_title||album?.id||"").trim();const artist=String(album?.artist||album?.artist_name||"").trim();const key=overviewKey(album)||normalizeOverviewTitle(`${artist} ${title}`)||normalizeOverviewTitle(title)||String(album?.id||"").trim();return {action,album_key:key,album_ref:albumRef(album?.id),album_id:String(album?.id||""),title,artist}}
function editorialReviewFromRow(row){return row?.editable_review||row?.generated_review||null}
function editorialMomentLines(items){return (Array.isArray(items)?items:[]).map(item=>typeof item==="string"?item:`${item.trackPosition||""} | ${item.trackTitle||""} | ${item.explanation||""}`).join("\n")}
function editorialMomentsFromEditor(value){
  return String(value||"").split(/\n/).map(line=>line.trim()).filter(Boolean).map((line,index)=>{
    const parts=line.split("|").map(item=>item.trim());
    if(parts.length>=3)return {trackPosition:Number(parts[0])||index+1,trackTitle:parts[1],explanation:parts.slice(2).join(" | ")};
    return {trackPosition:index+1,trackTitle:parts[0],explanation:""};
  });
}
function editorialReviewFromEditor(){
  const value=id=>String($(id)?.value||"").trim();
  return {overview:value("#reviewOverviewEditor"),sound:value("#reviewSoundEditor"),impact:value("#reviewImpactEditor"),legacy:value("#reviewLegacyEditor"),tagline:value("#reviewTaglineEditor"),alternativeTaglines:value("#reviewAlternativeTaglinesEditor").split(/\n/).map(item=>item.trim()).filter(Boolean),definingMoments:editorialMomentsFromEditor(value("#reviewDefiningMomentsEditor")),mostPopularTrack:{title:value("#reviewMostPopularTrackEditor"),explanation:value("#reviewMostPopularExplanationEditor")},muzeScore:Number(value("#reviewMuzeScoreEditor")),scoreExplanation:value("#reviewScoreExplanationEditor")||value("#reviewClosingVerdictEditor"),raterCount:Number(value("#reviewMinimumRatersEditor")),factualWarnings:value("#reviewFactualWarningsEditor").split(/\n/).map(item=>item.trim()).filter(Boolean)};
}
function fillEditorialReviewEditors(review){
  if(!review)return;
  const set=(id,value)=>{const field=$(id);if(field)field.value=value??""};
  set("#reviewOverviewEditor",review.overview);set("#reviewSoundEditor",review.sound);set("#reviewImpactEditor",review.impact);set("#reviewLegacyEditor",review.legacy);set("#reviewTaglineEditor",review.tagline);set("#reviewAlternativeTaglinesEditor",(review.alternativeTaglines||[]).join("\n"));set("#reviewDefiningMomentsEditor",editorialMomentLines(review.definingMoments));set("#reviewMostPopularTrackEditor",review.mostPopularTrack?.title);set("#reviewMostPopularExplanationEditor",review.mostPopularTrack?.explanation);set("#reviewMuzeScoreEditor",review.muzeScore);set("#reviewMinimumRatersEditor",review.raterCount);set("#reviewScoreExplanationEditor",review.scoreExplanation);set("#reviewClosingVerdictEditor",review.scoreExplanation);set("#reviewFactualWarningsEditor",(review.factualWarnings||[]).join("\n"));
}
async function editorialAdminRequest(payload){
  const pin=normalizeAdminPinValue(sessionStorage.getItem("musicaAdminPin")||"");
  if(!pin){setAdminInlineStatus("Please unlock admin mode first.","error");return null}
  let authorization={};
  try{const session=(await db?.auth?.getSession?.())?.data?.session;if(session?.access_token)authorization={Authorization:`Bearer ${session.access_token}`}}catch(error){}
  try{
    const response=await fetch("/.netlify/functions/editorial-review",{method:"POST",headers:{"Content-Type":"application/json",...authorization},body:JSON.stringify({...payload,pin})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||"Editorial request failed.");
    return data;
  }catch(error){setAdminInlineStatus(error.message||"Editorial request failed.","error");return null}
}
function editorialStatusLabel(status){return ({not_generated:"Not generated",generating:"Generating",draft:"Review-ready draft",needs_revision:"Needs revision",quality_failed:"Quality failed",approved:"Approved and published",rejected:"Rejected"})[status]||"Not generated"}
function renderEditorialWorkflow(album,row=null){
  extras.editorialDrafts=extras.editorialDrafts||{};if(album)extras.editorialDrafts[String(album.id)]=row;
  const host=$("#editorialWorkflowPanel");if(!host||!album)return;
  const status=row?.status||"not_generated";const problems=Array.isArray(row?.quality_problems)?row.quality_problems:[];const warnings=Array.isArray(row?.factual_warnings)?row.factual_warnings:[];
  const artistRatings=row?.generation_context?.existingMuzeRatingContext?.sameArtist||[];
  const meta=[row?.generation_model?`Model: ${row.generation_model}`:"",row?.prompt_version?`Prompt: ${row.prompt_version}`:"",row?.generated_at?`Generated: ${new Date(row.generated_at).toLocaleString()}`:"",Number.isFinite(Number(row?.quality_score))?`Quality: ${row.quality_score}/100`:""].filter(Boolean);
  const issueHtml=problems.length?`<div class="editorialIssues"><strong>Quality-control notes</strong>${problems.map(problem=>`<p data-severity="${escapeHtml(problem.severity||"minor")}"><b>${escapeHtml(problem.field||"Review")}</b> ${escapeHtml(problem.explanation||"")}${problem.suggestedCorrection?`<small>${escapeHtml(problem.suggestedCorrection)}</small>`:""}</p>`).join("")}</div>`:"";
  const warningHtml=warnings.length?`<div class="editorialWarnings"><strong>Factual warnings</strong>${warnings.map(warning=>`<p>${escapeHtml(warning)}</p>`).join("")}</div>`:"";
  const ratingsHtml=artistRatings.length?`<div class="editorialComparisons"><strong>Artist ratings used</strong>${artistRatings.map(item=>`<span>${escapeHtml(item.title)} ${escapeHtml(Number(item.score).toFixed(1))}</span>`).join("")}</div>`:"";
  const reviewId=escapeJsString(row?.id||"");const draftReviewId=status==="approved"?"":reviewId;const albumId=escapeJsString(album.id);const disabled=!row?.id||status==="approved"?" disabled":"";const approveDisabled=status!=="draft"?" disabled":"";
  host.innerHTML=`<div class="editorialWorkflowHead"><div><p class="eyebrow">Muze Editorial Engine</p><h4>${escapeHtml(editorialStatusLabel(status))}</h4><span id="editorialUnsavedState">All draft changes saved</span></div><b class="editorialStatus status-${escapeHtml(status)}">${escapeHtml(status.replaceAll("_"," "))}</b></div>${meta.length?`<div class="editorialMeta">${meta.map(item=>`<span>${escapeHtml(item)}</span>`).join("")}</div>`:""}${ratingsHtml}${issueHtml}${warningHtml}<div class="editorialActions"><button data-editorial-action onclick="runEditorialAction('${albumId}','generate')">Generate Premium Review</button><button data-editorial-action onclick="runEditorialAction('${albumId}','quality_check','${reviewId}')"${disabled}>Run Quality Check</button><button data-editorial-action onclick="saveEditorialDraft('${albumId}','${draftReviewId}')">Save Review Draft</button><button data-editorial-action onclick="runEditorialAction('${albumId}','regenerate_section','${reviewId}','overview')"${disabled}>Improve Overview</button><button data-editorial-action onclick="runEditorialAction('${albumId}','regenerate_section','${reviewId}','sound')"${disabled}>Improve The Sound</button><button data-editorial-action onclick="runEditorialAction('${albumId}','regenerate_section','${reviewId}','impact')"${disabled}>Improve Impact</button><button data-editorial-action onclick="runEditorialAction('${albumId}','regenerate_section','${reviewId}','legacy')"${disabled}>Improve Legacy</button><button data-editorial-action onclick="runEditorialAction('${albumId}','regenerate_section','${reviewId}','score')"${disabled}>Reconsider Score</button><button data-editorial-action onclick="runEditorialAction('${albumId}','regenerate_section','${reviewId}','definingMoments')"${disabled}>Replace Defining Moments</button><button data-editorial-action onclick="runEditorialAction('${albumId}','generate')">Regenerate Full Review</button><button class="approve" data-editorial-action onclick="approveEditorialReview('${albumId}','${reviewId}')"${approveDisabled}>Approve and Publish</button><button class="danger" data-editorial-action onclick="rejectEditorialReview('${albumId}','${reviewId}')"${disabled}>Reject Draft</button><button type="button" onclick="toggleEditorialBatch()">Test Batch</button></div><div id="editorialBatchPanel" class="editorialBatchPanel hidden"></div>`;
}
function markEditorialDirty(){const status=$("#editorialUnsavedState");if(status){status.textContent="Unsaved draft changes";status.classList.add("dirty")}}
function mountEditorialWorkflow(album){
  const reviewBlock=$("#albumOverviewSection .reviewEditorBlock");if(!reviewBlock)return;
  reviewBlock.insertAdjacentHTML("beforebegin",`<section id="editorialWorkflowPanel" class="editorialWorkflowPanel"><p>Loading editorial status...</p></section>`);
  const grid=reviewBlock.querySelector(".overviewEditorGrid");
  grid?.insertAdjacentHTML("beforeend",`<label class="overviewEditorField"><span>Most Popular Track</span><input id="reviewMostPopularTrackEditor" class="overviewEditorInput"></label><label class="overviewEditorField"><span>Most Popular Track Explanation</span><textarea id="reviewMostPopularExplanationEditor" class="overviewEditorText"></textarea></label><label class="overviewEditorField"><span>Score Explanation</span><textarea id="reviewScoreExplanationEditor" class="overviewEditorText"></textarea></label><label class="overviewEditorField"><span>Factual Warnings (one per line)</span><textarea id="reviewFactualWarningsEditor" class="overviewEditorText"></textarea></label>`);
  reviewBlock.querySelectorAll("input,textarea").forEach(field=>field.addEventListener("input",markEditorialDirty));
  loadEditorialReviewAdmin(album);
}
async function loadEditorialReviewAdmin(album){const data=await editorialAdminRequest({action:"get",albumId:String(album.id)});const row=data?.row||null;if(row)fillEditorialReviewEditors(editorialReviewFromRow(row));renderEditorialWorkflow(album,row)}
function setEditorialBusy(busy,message=""){document.querySelectorAll("[data-editorial-action]").forEach(button=>button.disabled=busy);if(message)setAdminInlineStatus(message,busy?"":"success")}
window.runEditorialAction=async function(albumId,action,reviewId="",section=""){
  const album=state.albums.find(item=>String(item.id)===String(albumId));if(!album)return;
  setEditorialBusy(true,action==="generate"?"Generating and checking the premium review...":"Running the editorial action...");
  const data=await editorialAdminRequest({action,albumId:String(album.id),reviewId,section});setEditorialBusy(false);if(!data)return;
  fillEditorialReviewEditors(editorialReviewFromRow(data.row));renderEditorialWorkflow(album,data.row);setAdminInlineStatus(`${editorialStatusLabel(data.row?.status)} saved. Generated reviews remain private until approval.`,"success");
}
window.saveEditorialDraft=async function(albumId,reviewId=""){const album=state.albums.find(item=>String(item.id)===String(albumId));if(!album)return;setEditorialBusy(true,"Saving review draft...");const data=await editorialAdminRequest({action:"save_draft",albumId:String(album.id),reviewId,review:editorialReviewFromEditor()});setEditorialBusy(false);if(!data)return;renderEditorialWorkflow(album,data.row);setAdminInlineStatus("Review draft saved privately.","success")}
window.approveEditorialReview=async function(albumId,reviewId){if(!reviewId||!confirm("Approve this review and publish it on the album page?"))return;const album=state.albums.find(item=>String(item.id)===String(albumId));setEditorialBusy(true,"Approving and publishing review...");const data=await editorialAdminRequest({action:"approve",albumId:String(albumId),reviewId});setEditorialBusy(false);if(!data||!album)return;await loadCustomOverviews();setAdminInlineStatus("Review approved and published.","success");editAlbumOverview(album.id)}
window.rejectEditorialReview=async function(albumId,reviewId){if(!reviewId||!confirm("Reject this draft? The revision will be retained in history."))return;const album=state.albums.find(item=>String(item.id)===String(albumId));const data=await editorialAdminRequest({action:"reject",albumId:String(albumId),reviewId});if(data&&album)renderEditorialWorkflow(album,data.row)}
window.toggleEditorialBatch=function(){const panel=$("#editorialBatchPanel");if(!panel)return;panel.classList.toggle("hidden");if(panel.classList.contains("hidden"))return;const choices=state.albums.slice(0,20).map(album=>`<label><input type="checkbox" value="${escapeHtml(String(album.id))}"><span>${escapeHtml(album.artist)} - ${escapeHtml(album.title)}</span></label>`).join("");panel.innerHTML=`<strong>Test batch (maximum 20)</strong><div class="editorialBatchChoices">${choices}</div><button onclick="runEditorialBatch()">Generate selected</button><button id="editorialBatchRetry" class="hidden" onclick="retryEditorialBatch()">Retry failed</button><div id="editorialBatchResults"></div>`}
window.runEditorialBatch=async function(retryIds=null){const panel=$("#editorialBatchPanel");const ids=retryIds||[...panel.querySelectorAll("input:checked")].map(input=>input.value).slice(0,20);if(!ids.length){setAdminInlineStatus("Select at least one album for the test batch.","error");return}const results=$("#editorialBatchResults");if(results)results.textContent=`Generating ${ids.length} review${ids.length===1?"":"s"} sequentially...`;const data=await editorialAdminRequest({action:"bulk_generate",albumIds:ids});if(!data)return;extras.editorialBulkFailed=(data.results||[]).filter(item=>!item.ok).map(item=>item.albumId);if(results)results.innerHTML=(data.results||[]).map(item=>`<p class="${item.ok?"success":"error"}">${escapeHtml(item.albumId)}: ${escapeHtml(item.ok?item.status:item.error)}</p>`).join("");$("#editorialBatchRetry")?.classList.toggle("hidden",!extras.editorialBulkFailed.length)}
window.retryEditorialBatch=function(){return runEditorialBatch(extras.editorialBulkFailed||[])};
window.editAlbumOverview=function(albumId){
  if(!isAdminUnlocked()){unlockOverviewAdmin();return}
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  if(!album)return;
  const section=$("#albumOverviewSection");
  if(!section)return;
  const current=albumBaseOverview(album);
  const structured=albumStructuredOverview(album);
  const review=albumReviewData(structured.row||{});
  const field=(id,label,value)=>`<label class="overviewEditorField"><span>${escapeHtml(label)}</span><textarea id="${id}" class="overviewEditorText">${escapeHtml(value||"")}</textarea></label>`;
  const shortField=(id,label,value)=>`<label class="overviewEditorField"><span>${escapeHtml(label)}</span><input id="${id}" class="overviewEditorInput" value="${escapeHtml(value ?? "")}"></label>`;
  section.classList.add("editing");
  section.innerHTML=`<p class="eyebrow">Admin overview editor</p><h3>Edit album overview</h3><textarea id="overviewEditorText" class="overviewEditorText">${escapeHtml(current)}</textarea><div class="overviewEditorGrid">${field("overviewIntroEditor","Short intro summary",structured.intro_summary)}${field("overviewSoundEditor","The Sound",structured.sound_summary)}${field("overviewImpactEditor","The Impact",structured.impact_summary)}${field("overviewLegacyEditor","The Legacy",structured.legacy_summary)}${field("overviewQuoteEditor","Quote-style headline",structured.quote_headline)}${field("overviewTracksEditor","Defining tracks",structured.defining_tracks.join("\n"))}</div><div class="reviewEditorBlock"><p class="eyebrow">Manual Muze Review</p><div class="overviewEditorGrid">${field("reviewOverviewEditor","Overview",review.overview)}${field("reviewSoundEditor","The Sound",review.sound)}${field("reviewImpactEditor","The Impact",review.impact)}${field("reviewLegacyEditor","The Legacy",review.legacy)}${field("reviewTaglineEditor","Tagline",review.tagline)}${field("reviewAlternativeTaglinesEditor","Alternative Taglines",review.alternativeTaglines.join("\n"))}${field("reviewDefiningMomentsEditor","Defining Moments",review.definingMoments.join("\n"))}${shortField("reviewMostPopularTrackEditor","Most Popular Track",review.mostPopularTrack?.title||"")}${field("reviewMostPopularExplanationEditor","Most Popular Track Explanation",review.mostPopularTrack?.explanation||"")}${shortField("reviewMuzeScoreEditor","Muze Score",review.muzeScore ?? "")}${shortField("reviewMinimumRatersEditor","Minimum Raters",review.minimumRaters ?? "")}${field("reviewClosingVerdictEditor","Closing Verdict",review.closingVerdict)}${shortField("reviewMellowIntenseScoreEditor","Mellow ↔ Intense",review.mellowIntenseScore ?? "")}${field("reviewMellowIntenseExplanationEditor","Mellow ↔ Intense Explanation",review.mellowIntenseExplanation)}${field("reviewFactualWarningsEditor","Factual Warnings (one per line)",(review.factualWarnings||[]).join("\n"))}</div></div><div class="overviewEditorActions"><button onclick="saveAlbumOverview('${escapeJsString(albumId)}')">Save overview</button><button onclick="openAlbumOverviewPopup()">Cancel</button><button class="danger" onclick="deleteAlbumOverview('${escapeJsString(albumId)}')">Clear custom overview</button></div><p class="overviewAdminHint">All overview and review fields are entered and saved manually.</p>`;
}
window.saveAlbumOverview=async function(albumId){
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  const textarea=$("#overviewEditorText");
  if(!album||!textarea)return;
  const button=document.querySelector("#albumOverviewSection .overviewEditorActions button:first-child");
  const readEditorValue=id=>String($(id)?.value||"").trim();
  const intro_summary=readEditorValue("#overviewIntroEditor");
  const sound_summary=readEditorValue("#overviewSoundEditor");
  const impact_summary=readEditorValue("#overviewImpactEditor");
  const legacy_summary=readEditorValue("#overviewLegacyEditor");
  const quote_headline=readEditorValue("#overviewQuoteEditor");
  const defining_tracks=readEditorValue("#overviewTracksEditor").split(/\n|,/).map(item=>item.trim()).filter(Boolean);
  const overview=textarea.value.trim()||[intro_summary,sound_summary,impact_summary,legacy_summary].filter(Boolean).join(" ");
  const reviewPayload=albumReviewPayloadFromEditor();
  const payload={...adminAlbumPayload(album,"save"),overview,intro_summary,sound_summary,impact_summary,legacy_summary,quote_headline,defining_tracks,...reviewPayload};
  if(button){button.disabled=true;button.textContent="Saving..."}
  const data=await adminOverviewRequest(payload);
  if(!data){if(button){button.disabled=false;button.textContent="Save overview"}return}
  const savedRow={...(extras.overviews[payload.album_key]||{}),...(data.row||{}),album_key:payload.album_key,album_id:payload.album_id,title:payload.title,artist:payload.artist,overview,intro_summary,sound_summary,impact_summary,legacy_summary,quote_headline,defining_tracks,...reviewPayload,fallback_generated:false,manual_override:true};
  cacheOverviewAliases(album,savedRow);
  localStorage.setItem("musicaCustomOverviews",JSON.stringify(extras.overviews));
  setAdminInlineStatus(data.localOnly?"Manual overview saved in this browser.":"Manual overview saved and verified.","success");
  openAlbumOverviewPopup();
}
window.regenerateAlbumOverviewAdmin=async function(albumId){
  if(!isAdminUnlocked()){unlockOverviewAdmin();return}
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  if(!album)return;
  setAdminInlineStatus("Generating Muze editorial...","");
  const tracks=extras.tracks[albumRef(album.id)]||await fetchAlbumTracks(album);
  const row=await ensureAiAlbumOverview(album,tracks,true);
  if(row&&hasStructuredAlbumOverview(row)){
    setAdminInlineStatus(row.manual_override?"Muze editorial generated. Existing manual fields were preserved.":"Muze editorial generated.","success");
    openAlbumOverviewPopup();
  }else{
    setAdminInlineStatus("Could not generate Muze editorial. Check Netlify function logs for API errors.","error");
  }
}
window.generateAlbumReviewAdmin=async function(albumId,force=false){
  return window.runEditorialAction(albumId,"generate");
}
window.deleteAlbumOverview=async function(albumId){
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  if(!album)return;
  if(!confirm(`Clear the custom overview for "${album.title}"?`))return;
  const data=await adminOverviewRequest(adminAlbumPayload(album,"delete_overview"));
  if(!data)return;
  delete extras.overviews[overviewKey(album)];
  if(!db||data.localOnly)localStorage.setItem("musicaCustomOverviews",JSON.stringify(extras.overviews));
  openAlbumOverviewPopup();
}
window.deleteAlbumCommentAdmin=async function(albumId,commentId){
  if(!isAdminUnlocked()){alert("Please unlock admin mode first.");return}
  if(!commentId)return;
  if(!confirm("Delete this comment and its replies?"))return;
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  const payload=album?adminAlbumPayload(album,"delete_album_comment"):{action:"delete_album_comment",album_ref:albumRef(albumId)};
  const data=await adminOverviewRequest({...payload,comment_id:String(commentId)});
  if(!data)return;
  await loadComments(albumId);
  renderComments(albumId);
}
window.deleteAlbumReplyAdmin=async function(replyId){
  if(!isAdminUnlocked()){alert("Please unlock admin mode first.");return}
  if(!replyId)return;
  if(!confirm("Delete this reply?"))return;
  const albumId=extras.currentAlbumId;
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  const payload=album?adminAlbumPayload(album,"delete_album_reply"):{action:"delete_album_reply",album_ref:albumRef(albumId)};
  const data=await adminOverviewRequest({...payload,reply_id:String(replyId)});
  if(!data)return;
  if(albumId){await loadComments(albumId);renderComments(albumId)}
}
window.clearAlbumReactionsAdmin=async function(albumId){
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  if(!album)return;
  if(!confirm(`Delete all listener reactions for "${album.title}"?`))return;
  const data=await adminOverviewRequest(adminAlbumPayload(album,"clear_reactions"));
  if(!data)return;
  extras.comments[albumRef(album.id)]=[];
  extras.commentReplies[albumRef(album.id)]={};
  renderComments(album.id);
  alert("Listener reactions cleared.");
}
window.clearAlbumTrackActivityAdmin=async function(albumId){
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  if(!album)return;
  if(!confirm(`Delete all song ratings and song comments for "${album.title}"?`))return;
  const data=await adminOverviewRequest(adminAlbumPayload(album,"clear_track_activity"));
  if(!data)return;
  extras.trackRatings[albumRef(album.id)]={};
  extras.songScores[albumRef(album.id)]={};
  renderTrackList(album.id);
  alert("Song ratings and comments cleared.");
}
window.clearAlbumRatingsAdmin=async function(albumId){
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  if(!album)return;
  if(!confirm(`Delete all album ratings for "${album.title}"?`))return;
  const data=await adminOverviewRequest(adminAlbumPayload(album,"clear_album_ratings"));
  if(!data)return;
  if(!data.localOnly)await loadData();
  openAlbum(albumId);
  openAlbumOverviewPopup();
}
window.deleteAlbumAdmin=async function(albumId){
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  if(!album)return;
  if(!confirm(`Permanently delete "${album.title}" and its ratings/comments?`))return;
  const data=await adminOverviewRequest(adminAlbumPayload(album,"delete_album"));
  if(!data)return;
  if(String(albumId).startsWith("seed-"))saveHiddenSeedAlbums([...new Set([...hiddenSeedAlbums(),albumId])]);
  closeAlbumOverviewPopup();
  stopTrackPreview();
  $("#albumModal")?.classList.add("hidden");
  await loadData();
}
window.setAlbumScoreAdmin=async function(albumId){
  if(!isAdminUnlocked()){alert("Please unlock admin mode first.");return}
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  if(!album)return;
  const current=score(album)||0;
  const answer=(prompt(`Set Muze score for "${album.title}" (0-10):`,current?current.toFixed(1):"")||"").trim();
  if(answer==="")return;
  const value=Number(answer);
  if(!Number.isFinite(value)||value<0||value>10){alert("Please enter a score between 0 and 10.");return}
  const rounded=Math.round(value*10)/10;
  const key=overviewKey(album);
  const previous=extras.overviews[key]||{};
  const payload={...adminAlbumPayload(album,"set_album_score"),overview:albumBaseOverview(album),admin_score:rounded};
  const data=await adminOverviewRequest(payload);
  if(!data)return;
  cacheOverviewAliases(album,{...previous,...(data.row||{}),album_key:key,album_id:String(album.id||""),title:album.title,artist:album.artist||"",overview:payload.overview,admin_score:rounded});
  localStorage.setItem("musicaCustomOverviews",JSON.stringify(extras.overviews));
  if(!data.localOnly)await loadCustomOverviews();
  render();
  openAlbum(albumId);
  openAlbumOverviewPopup();
}
window.setAlbumRatingsCountAdmin=async function(albumId){
  if(!isAdminUnlocked()){alert("Please unlock admin mode first.");return}
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  if(!album)return;
  const answer=(prompt(`Set displayed rating count for "${album.title}":`,String(count(album)||0))||"").trim();
  if(answer==="")return;
  const value=Number(answer);
  if(!Number.isFinite(value)||value<0){alert("Please enter a rating count of 0 or higher.");return}
  const rounded=Math.max(0,Math.round(value));
  const key=overviewKey(album);
  const previous=extras.overviews[key]||{};
  const payload={...adminAlbumPayload(album,"set_rating_count"),overview:albumBaseOverview(album),admin_ratings_count:rounded};
  const data=await adminOverviewRequest(payload);
  if(!data)return;
  cacheOverviewAliases(album,{...previous,...(data.row||{}),album_key:key,album_id:String(album.id||""),title:album.title,artist:album.artist||"",overview:payload.overview,admin_ratings_count:rounded});
  localStorage.setItem("musicaCustomOverviews",JSON.stringify(extras.overviews));
  if(!data.localOnly)await loadCustomOverviews();
  render();
  openAlbum(albumId);
  openAlbumOverviewPopup();
}
window.setAlbumGenreAdmin=async function(albumId){
  if(!isAdminUnlocked()){alert("Please unlock admin mode first.");return}
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  if(!album)return;
  const key=overviewKey(album);
  const previous=extras.overviews[key]||{};
  const current=String(previous.manual_genre||albumGenreLabel(album)||"").trim();
  const choices=["Rock","Alternative Rock","Pop","Hip-Hop","Soul","R&B","Jazz","Folk","Folk Rock","Country","Electronic","Metal","Punk","Classical","Soundtracks","International","Album"];
  const albumTitle=String(album.title||album.name||album.id||"this album").trim();
  const answer=(prompt(`Set genre for "${albumTitle}". Common options: ${choices.join(", ")}`,current)||"").trim();
  if(answer==="")return;
  const manual_genre=answer.replace(/\s+/g," ").trim().slice(0,40);
  if(!manual_genre){alert("Please enter a genre.");return}
  const payload={...adminAlbumPayload(album,"set_album_genre"),overview:albumBaseOverview(album),manual_genre};
  const data=await adminOverviewRequest(payload);
  if(!data)return;
  extras.overviews[key]={...previous,...(data.row||{}),album_key:key,title:album.title,artist:album.artist||"",overview:payload.overview,manual_genre};
  if(!db||data.localOnly)localStorage.setItem("musicaCustomOverviews",JSON.stringify(extras.overviews));
  if(!data.localOnly)await loadCustomOverviews();
  state.albums=state.albums.map(item=>String(item.id)===String(albumId)?{...item,genre:manual_genre}:item);
  setAdminInlineStatus(`Genre saved as ${manual_genre}.`,"success");
  render();
  openAlbum(albumId);
  openAlbumOverviewPopup();
};
window.setAlbumMoodScoreAdmin=async function(albumId){
  if(!isAdminUnlocked()){alert("Please unlock admin mode first.");return}
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  if(!album)return;
  const key=overviewKey(album);
  let previous=albumOverviewRow(album);
  let current=albumOverviewFieldNumber(album,"mood_score",62);
  const freshMood=await fetchAlbumMoodScore(album);
  if(freshMood!==null){current=freshMood;previous=albumOverviewRow(album)}
  let popup=$("#albumMoodSliderPopup");
  if(!popup){
    popup=document.createElement("div");
    popup.id="albumMoodSliderPopup";
    popup.className="albumMoodSliderPopup hidden";
    document.body.appendChild(popup);
  }
  const rounded=Math.round(Math.max(0,Math.min(100,current)));
  popup.innerHTML=`<div class="albumMoodSliderBackdrop" onclick="closeAlbumMoodSlider()"></div><div class="albumMoodSliderPanel"><button class="albumMoodSliderClose" onclick="closeAlbumMoodSlider()" aria-label="Close"><span aria-hidden="true"></span></button><p class="eyebrow">Admin overview</p><h3>Vibe & Mood</h3><strong>${escapeHtml(album.title)}</strong><div class="albumMoodSliderValue"><span id="albumMoodSliderValue">${rounded}%</span></div><input id="albumMoodSliderInput" type="range" min="0" max="100" step="1" value="${rounded}" oninput="updateAlbumMoodSliderValue(this.value)"><div class="albumMoodSliderScale"><span>Mellow</span><span>Intense</span></div><div class="albumMoodSliderActions"><button onclick="saveAlbumMoodScoreAdmin('${escapeJsString(albumId)}')">Save mood</button><button type="button" onclick="closeAlbumMoodSlider()">Cancel</button></div></div>`;
  popup.classList.remove("hidden");
}
window.updateAlbumMoodSliderValue=function(value){
  const label=$("#albumMoodSliderValue");
  if(label)label.textContent=`${Math.round(Number(value)||0)}%`;
}
window.closeAlbumMoodSlider=function(){
  $("#albumMoodSliderPopup")?.classList.add("hidden");
}
window.saveAlbumMoodScoreAdmin=async function(albumId){
  if(!isAdminUnlocked()){alert("Please unlock admin mode first.");return}
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  if(!album)return;
  const key=overviewKey(album);
  const previous=albumOverviewRow(album);
  const value=Number($("#albumMoodSliderInput")?.value);
  if(!Number.isFinite(value)||value<0||value>100){alert("Please enter a mood value from 0 to 100.");return}
  const rounded=Math.round(value);
  const payload={...adminAlbumPayload(album,"set_mood_score"),overview:albumBaseOverview(album),mood_score:rounded};
  const data=await adminOverviewRequest(payload);
  if(!data)return;
  let savedMood=Number(data.row?.mood_score ?? rounded);
  if(db&&!data.localOnly){
    const verify=await db.from("album_overviews").select("mood_score").eq("album_key",key).maybeSingle();
    if(verify.error){
      setAdminInlineStatus(`Mood bar save could not be verified: ${verify.error.message}`,"error");
      return;
    }
    if(!verify.data){
      setAdminInlineStatus("Mood bar save did not update any album overview row. Check the album key in Supabase.","error");
      return;
    }
    savedMood=Number(verify.data.mood_score);
  }
  if(!Number.isFinite(savedMood)){
    setAdminInlineStatus("Mood bar save returned an invalid value. Make sure the mood_score column exists in album_overviews.","error");
    return;
  }
  extras.overviews[key]={...previous,...(data.row||{}),album_key:key,title:album.title,artist:album.artist||"",overview:data.row?.overview ?? previous.overview ?? payload.overview,mood_score:savedMood};
  if(!db||data.localOnly)localStorage.setItem("musicaCustomOverviews",JSON.stringify(extras.overviews));
  if(db&&!data.localOnly)clearLocalOverviewOverride(key);
  if(!data.localOnly)await loadCustomOverviews();
  extras.overviews[key]={...(extras.overviews[key]||{}),album_key:key,title:album.title,artist:album.artist||"",overview:extras.overviews[key]?.overview ?? previous.overview ?? payload.overview,mood_score:savedMood};
  setAdminInlineStatus(`Mood bar saved at ${Math.round(savedMood)}%.`,"success");
  closeAlbumMoodSlider();
  openAlbum(albumId);
  openAlbumOverviewPopup();
}
window.setMostLovedTrackAdmin=async function(albumId,trackKeyValue){
  if(!isAdminUnlocked()){alert("Please unlock admin mode first.");return}
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  const tracks=extras.tracks[albumRef(albumId)]||[];
  const chosen=tracks.find(track=>trackKey(track)===String(trackKeyValue));
  if(!album||!chosen){alert("Could not find that track yet. Try reopening the album after tracks load.");return}
  const key=overviewKey(album);
  const previous=extras.overviews[key]||{};
  const payload={...adminAlbumPayload(album,"set_loved_track"),overview:albumBaseOverview(album),loved_track_key:trackKey(chosen),loved_track_name:chosen.name||""};
  const data=await adminOverviewRequest(payload);
  if(!data)return;
  extras.overviews[key]={...previous,album_key:key,title:album.title,artist:album.artist||"",overview:payload.overview,loved_track_key:payload.loved_track_key,loved_track_name:payload.loved_track_name};
  if(!db||data.localOnly)localStorage.setItem("musicaCustomOverviews",JSON.stringify(extras.overviews));
  renderTrackList(albumId);
}
window.pickMostLovedTrack=async function(albumId){
  if(!isAdminUnlocked()){alert("Please unlock admin mode first.");return}
  const tracks=extras.tracks[albumRef(albumId)]||[];
  if(!tracks.length){alert("No track list found yet for this album.");return}
  const list=tracks.map((track,index)=>`${index+1}. ${track.name}`).join("\n");
  const answer=(prompt(`Pick the most loved song by number:\n\n${list}`,"1")||"").trim();
  if(!answer)return;
  const index=Number(answer)-1;
  if(!Number.isInteger(index)||index<0||index>=tracks.length){alert("Please enter a valid track number.");return}
  await setMostLovedTrackAdmin(albumId,trackKey(tracks[index]));
}
function saveAlbumVisualFocus(albumId,field,focus){
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  if(!album)return null;
  const key=overviewKey(album);
  const previous=extras.overviews[key]||{};
  extras.overviews[key]={...previous,album_key:key,title:album.title,artist:album.artist||"",overview:previous.overview||albumBaseOverview(album),[field]:focus};
  localStorage.setItem("musicaCustomOverviews",JSON.stringify(extras.overviews));
  return album;
}
function saveMomentFocus(albumId,focus){saveAlbumVisualFocus(albumId,"moment_focus",focus)}
function saveHeroFocus(albumId,focus){saveAlbumVisualFocus(albumId,"hero_focus",focus)}
function saveAlbumVisualImage(albumId,field,image){
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  if(!album)return null;
  const key=overviewKey(album);
  const previous=extras.overviews[key]||{};
  extras.overviews[key]={...previous,album_key:key,title:album.title,artist:album.artist||"",overview:previous.overview||albumBaseOverview(album),[field]:image};
  localStorage.setItem("musicaCustomOverviews",JSON.stringify(extras.overviews));
  return album;
}
async function persistHeroFocus(albumId,focus){
  const album=saveAlbumVisualFocus(albumId,"hero_focus",focus);
  if(!album)return;
  await adminOverviewRequest({...adminAlbumPayload(album,"set_hero_focus"),overview:albumBaseOverview(album),hero_focus:focus});
}
async function persistOverviewFocus(albumId,focus){
  const album=saveAlbumVisualFocus(albumId,"overview_focus",focus);
  if(!album)return;
  await adminOverviewRequest({...adminAlbumPayload(album,"set_overview_focus"),overview:albumBaseOverview(album),overview_focus:focus});
}
async function persistMomentFocus(albumId,focus){
  const album=saveAlbumVisualFocus(albumId,"moment_focus",focus);
  if(!album)return;
  await adminOverviewRequest({...adminAlbumPayload(album,"set_moment_focus"),overview:albumBaseOverview(album),moment_focus:focus});
}
async function persistAlbumVisualImage(albumId,field,image){
  const album=saveAlbumVisualImage(albumId,field,image);
  if(!album)return;
  const action=field==="hero_image"?"set_hero_image":"set_moment_image";
  const payload={...adminAlbumPayload(album,action),overview:albumBaseOverview(album)};
  payload[field]=image;
  await adminOverviewRequest(payload);
}
function readAdminImageFile(file){
  return new Promise((resolve,reject)=>{
    if(!file){resolve("");return}
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error("Could not read image."));
    reader.onload=()=>{
      const img=new Image();
      img.onerror=()=>reject(new Error("Could not load image."));
      img.onload=()=>{
        const max=1800;
        const scale=Math.min(1,max/Math.max(img.width,img.height));
        const canvas=document.createElement("canvas");
        canvas.width=Math.max(1,Math.round(img.width*scale));
        canvas.height=Math.max(1,Math.round(img.height*scale));
        const ctx=canvas.getContext("2d");
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL("image/jpeg",.86));
      };
      img.src=String(reader.result||"");
    };
    reader.readAsDataURL(file);
  });
}
window.uploadAlbumVisualImage=function(albumId,kind){
  if(!isAdminUnlocked()){alert("Please unlock admin mode first.");return}
  const input=document.createElement("input");
  input.type="file";
  input.accept="image/*";
  input.onchange=async()=>{
    try{
      const image=await readAdminImageFile(input.files&&input.files[0]);
      if(!image)return;
      if(kind==="hero"){
        await persistAlbumVisualImage(albumId,"hero_image",image);
        const hero=document.querySelector('.linerHero[data-album-id="'+CSS.escape(String(albumId))+'"]');
        if(hero)hero.style.setProperty("--hero-scene","url('"+image+"')");
        alert("Hero background uploaded. Click Move hero image to drag/crop it.");
      }else{
        await persistAlbumVisualImage(albumId,"moment_image",image);
        renderTrackList(albumId);
        alert("Most Loved Track image uploaded. Drag the banner or use Move banner image to crop it.");
      }
    }catch(error){alert(error.message||"Image upload failed.")}
  };
  input.click();
}
window.setMomentImageFocus=function(albumId){
  if(!isAdminUnlocked()){alert("Please unlock admin mode first.");return}
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  if(!album)return;
  const key=overviewKey(album);
  const previous=extras.overviews[key]||{};
  const current=previous.moment_focus||albumMomentFocus(album);
  const answer=(prompt(`Move the Most Loved Track image for "${album.title}".\n\nEnter horizontal and vertical percentages, for example:\n50 35 = centered and higher\n50 50 = centered middle\n50 65 = centered lower`,current)||"").trim();
  if(!answer)return;
  const parts=answer.split(/[ ,]+/).map(Number).filter(Number.isFinite);
  if(parts.length<2){alert("Please enter two numbers, like 50 45.");return}
  const x=Math.max(0,Math.min(100,Math.round(parts[0])));
  const y=Math.max(0,Math.min(100,Math.round(parts[1])));
  persistMomentFocus(albumId,`${x}% ${y}%`);
  renderTrackList(albumId);
}
window.startOverviewImageDrag=function(albumId){
  if(!isAdminUnlocked()){alert("Please unlock admin mode first.");return}
  const section=document.querySelector(`.albumOverviewSleeve[data-album-id="${CSS.escape(String(albumId))}"]`);
  if(!section)return;
  section.classList.add("canDragOverview","overviewDragArmed");
  const existing=section.querySelector(".overviewDragHint");
  if(existing)existing.remove();
  const hint=document.createElement("div");
  hint.className="overviewDragHint";
  hint.textContent="Drag the overview background, then release to save";
  section.appendChild(hint);
  setTimeout(()=>hint.remove(),2600);
}
function enableOverviewImageDrag(){
  document.addEventListener("pointerdown",event=>{
    const section=event.target.closest?.(".albumOverviewSleeve.canDragOverview");
    if(!section||event.target.closest("button,a,textarea,input,select"))return;
    const albumId=section.dataset.albumId;
    if(!albumId||!isAdminUnlocked())return;
    event.preventDefault();
    const rect=section.getBoundingClientRect();
    const current=String(section.style.getPropertyValue("--overview-position")||"50% 50%").match(/([0-9.]+)%\s+([0-9.]+)%/);
    const startX=current?Number(current[1]):50;
    const startY=current?Number(current[2]):50;
    const startClientX=event.clientX;
    const startClientY=event.clientY;
    section.classList.add("draggingOverview");
    section.setPointerCapture?.(event.pointerId);
    const move=moveEvent=>{
      const dx=((moveEvent.clientX-startClientX)/Math.max(1,rect.width))*100;
      const dy=((moveEvent.clientY-startClientY)/Math.max(1,rect.height))*100;
      const x=Math.max(0,Math.min(100,startX-dx));
      const y=Math.max(0,Math.min(100,startY-dy));
      section.style.setProperty("--overview-position",`${x.toFixed(0)}% ${y.toFixed(0)}%`);
    };
    const up=async()=>{
      section.releasePointerCapture?.(event.pointerId);
      section.classList.remove("draggingOverview","overviewDragArmed");
      section.removeEventListener("pointermove",move);
      section.removeEventListener("pointerup",up);
      section.removeEventListener("pointercancel",up);
      const saved=String(section.style.getPropertyValue("--overview-position")||"").trim();
      if(saved)await persistOverviewFocus(albumId,saved);
    };
    section.addEventListener("pointermove",move);
    section.addEventListener("pointerup",up);
    section.addEventListener("pointercancel",up);
  });
}
enableOverviewImageDrag();window.startHeroImageDrag=function(albumId){
  if(!isAdminUnlocked()){alert("Please unlock admin mode first.");return}
  const hero=document.querySelector(`.linerHero[data-album-id="${CSS.escape(String(albumId))}"]`);
  if(!hero)return;
  hero.classList.add("canDragHero","heroDragArmed");
  const hint=document.createElement("div");
  hint.className="heroDragHint";
  hint.textContent="Drag the background image, then release to save";
  hero.appendChild(hint);
  setTimeout(()=>hint.remove(),2600);
}
function enableHeroImageDrag(){
  document.addEventListener("pointerdown",event=>{
    const hero=event.target.closest?.(".linerHero.canDragHero");
    if(!hero||event.target.closest("button,a,textarea,input,select"))return;
    const albumId=hero.dataset.albumId;
    if(!albumId||!isAdminUnlocked())return;
    event.preventDefault();
    const rect=hero.getBoundingClientRect();
    const current=String(hero.style.getPropertyValue("--hero-position")||"0% 50%").match(/([0-9.]+)%\s+([0-9.]+)%/);
    const startX=current?Number(current[1]):0;
    const startY=current?Number(current[2]):50;
    const startClientX=event.clientX;
    const startClientY=event.clientY;
    hero.classList.add("draggingHero");
    hero.setPointerCapture?.(event.pointerId);
    const move=moveEvent=>{
      const dx=((moveEvent.clientX-startClientX)/Math.max(1,rect.width))*100;
      const dy=((moveEvent.clientY-startClientY)/Math.max(1,rect.height))*100;
      const x=Math.max(0,Math.min(100,startX-dx));
      const y=Math.max(0,Math.min(100,startY-dy));
      hero.style.setProperty("--hero-position",`${x.toFixed(0)}% ${y.toFixed(0)}%`);
    };
    const up=async()=>{
      hero.releasePointerCapture?.(event.pointerId);
      hero.classList.remove("draggingHero","heroDragArmed");
      hero.removeEventListener("pointermove",move);
      hero.removeEventListener("pointerup",up);
      hero.removeEventListener("pointercancel",up);
      const saved=String(hero.style.getPropertyValue("--hero-position")||"").trim();
      if(saved)await persistHeroFocus(albumId,saved);
    };
    hero.addEventListener("pointermove",move);
    hero.addEventListener("pointerup",up);
    hero.addEventListener("pointercancel",up);
  });
}
enableHeroImageDrag();
function enableMomentImageDrag(){
  document.addEventListener("pointerdown",event=>{
    const panel=event.target.closest?.(".linerFeaturedTrack.canDragMoment");
    if(!panel||event.target.closest("button,a,textarea,input,select"))return;
    const albumId=panel.dataset.albumId;
    if(!albumId||!isAdminUnlocked())return;
    event.preventDefault();
    const rect=panel.getBoundingClientRect();
    const current=String(panel.style.getPropertyValue("--moment-focus")||"50% 33%").match(/([0-9.]+)%\s+([0-9.]+)%/);
    const startX=current?Number(current[1]):50;
    const startY=current?Number(current[2]):33;
    const startClientX=event.clientX;
    const startClientY=event.clientY;
    panel.classList.add("draggingMoment");
    panel.setPointerCapture?.(event.pointerId);
    const move=moveEvent=>{
      const dx=((moveEvent.clientX-startClientX)/Math.max(1,rect.width))*100;
      const dy=((moveEvent.clientY-startClientY)/Math.max(1,rect.height))*100;
      const x=Math.max(0,Math.min(100,startX-dx));
      const y=Math.max(0,Math.min(100,startY-dy));
      panel.style.setProperty("--moment-focus",`${x.toFixed(0)}% ${y.toFixed(0)}%`);
    };
    const up=upEvent=>{
      panel.releasePointerCapture?.(event.pointerId);
      panel.classList.remove("draggingMoment");
      panel.removeEventListener("pointermove",move);
      panel.removeEventListener("pointerup",up);
      panel.removeEventListener("pointercancel",up);
      const saved=String(panel.style.getPropertyValue("--moment-focus")||"").trim();
      if(saved)persistMomentFocus(albumId,saved);
    };
    panel.addEventListener("pointermove",move);
    panel.addEventListener("pointerup",up);
    panel.addEventListener("pointercancel",up);
  });
}
enableMomentImageDrag();
window.rateTrack=async function(albumId,trackKeyValue,trackName,value){
  if(!requireAuth("rate",()=>window.rateTrack(albumId,trackKeyValue,trackName,value)))return;
  const username=ratingName();
  const ref=albumRef(albumId);
  const previousValue=(extras.trackRatings[ref]||{})[trackKeyValue]||localTrackRating(albumId,trackKeyValue)||0;
  setLocalTrackRating(albumId,trackKeyValue,value);
  rememberProfileSongRating(albumId,trackKeyValue);
  applyOptimisticSongScore(albumId,trackKeyValue,trackName,value,previousValue);
  renderTrackList(albumId);
  const sync=async()=>{
    if(db){
      const userId=loggedInUser()?.id||null;
      let result=await db.from("track_ratings").upsert({album_ref:ref,track_key:trackKeyValue,track_name:trackName,device_id:state.deviceId,username,user_id:userId,rating:value},{onConflict:"album_ref,track_key,device_id"});
      if(result.error&&/column|schema cache|user_id/i.test(result.error.message||"")){
        result=await db.from("track_ratings").upsert({album_ref:ref,track_key:trackKeyValue,track_name:trackName,device_id:state.deviceId,username,rating:value},{onConflict:"album_ref,track_key,device_id"});
      }
      if(result.error)console.warn("Song rating saved locally but Supabase sync failed",result.error.message||result.error);
    }
    await Promise.all([loadTrackRatings(albumId),loadSongScores(albumId),loadTrackRatingDetails(albumId,trackKeyValue)]);
    const scoreAfter=(extras.songScores[ref]||{})[trackKeyValue]||(trackName?(extras.songScores[ref]||{})[String(trackName).toLowerCase()]:null);
    if(!scoreAfter||Number(scoreAfter.ratings_count)<=0)applyOptimisticSongScore(albumId,trackKeyValue,trackName,value,previousValue);
    renderTrackList(albumId);
  };
  sync().catch(error=>console.warn("Song rating refresh failed",error));
}

function updateNavUsername(){
  const el=$("#navUsername");
  const button=$("#navSetUsername");
  const username=currentUsername()||state.userProfile?.username||"";
  if(el)el.textContent=username?"@"+username:"Sign in to save albums, rate music, and build your library.";
  if(button)button.textContent=username?"Edit profile":"Sign in / Create account";
  renderAvatarTargets();
  renderNotifications();
}
function followerSeenKey(){return "musicaSeenFollowers::"+state.deviceId}
function myPublishedLibrary(){return extras.libraries.find(l=>l.device_id===state.deviceId)||null}
function unreadFollowerCount(){const library=myPublishedLibrary();if(!library)return 0;return Math.max(0,Number(library.followers_count||0)-Number(localStorage.getItem(followerSeenKey())||0))}
function unreadChatCount(){
  const user=loggedInUser();
  if(!user)return 0;
  return (extras.chatMessages||[]).filter(message=>String(message.recipient_id||"")===String(user.id)&&!message.read_at).length;
}
function unreadNotificationRows(){
  return (extras.notifications||[]).filter(notification=>!notification.read_at);
}
function unreadNotificationCount(){
  return unreadFollowerCount()+unreadNotificationRows().length;
}
async function loadNotifications(){
  const user=loggedInUser();
  if(!db||!user){extras.notifications=[];return extras.notifications}
  try{
    const {data,error}=await db.from("notifications").select("id,notification_type,body,album_ref,album_title,created_at,read_at").eq("recipient_id",user.id).order("created_at",{ascending:false}).limit(25);
    if(error)throw error;
    extras.notifications=data||[];
  }catch(error){
    console.warn("[Muze] Notifications could not be loaded",error?.message||error);
    extras.notifications=[];
  }
  return extras.notifications;
}
async function markNotificationsRead(){
  const user=loggedInUser();
  const unread=unreadNotificationRows();
  if(!db||!user||!unread.length)return;
  try{
    const ids=unread.map(notification=>notification.id).filter(Boolean);
    if(!ids.length)return;
    const {error}=await db.from("notifications").update({read_at:new Date().toISOString()}).in("id",ids).eq("recipient_id",user.id);
    if(error)throw error;
    extras.notifications=extras.notifications.map(notification=>ids.includes(notification.id)?{...notification,read_at:new Date().toISOString()}:notification);
  }catch(error){
    console.warn("[Muze] Notifications could not be marked read",error?.message||error);
  }
}
function renderChatBadge(){
  const badge=$("#topbarChatBadge");
  if(!badge)return;
  const count=unreadChatCount();
  badge.textContent=count>99?"99+":String(count);
  badge.classList.toggle("hidden",count===0);
}
function renderNotifications(){
  const badge=$("#notificationBadge"),panel=$("#notificationPanel");
  const count=unreadNotificationCount();
  if(badge){badge.textContent=count>99?"99+":String(count);badge.classList.toggle("hidden",count===0)}
  renderChatBadge();
  if(panel&&!panel.classList.contains('hidden')){
    const rows=extras.notifications||[];
    const followerCount=unreadFollowerCount();
    const followerHtml=followerCount?`<strong>${followerCount} new follower${followerCount===1?"":"s"}</strong>`:"";
    const rowHtml=rows.length?rows.slice(0,8).map(row=>`<div class="notificationItem ${row.read_at?"":"unread"}"><strong>${escapeHtml(row.notification_type==="comment_like"?"Comment liked":"Notification")}</strong><span>${escapeHtml(row.body||"You have a new notification.")}</span><em>${timeAgo(row.created_at)}</em></div>`).join(""):"";
    panel.innerHTML=followerHtml+rowHtml||(count?"":"No new notifications.");
  }
}
window.markFollowerNotificationsRead=function(){const library=myPublishedLibrary();localStorage.setItem(followerSeenKey(),String(Number(library?.followers_count||0)));renderNotifications()}
async function refreshNotifications(){await Promise.all([loadLibraries(),loadChatMessages(),loadUserPresence(),loadNotifications()]);renderNotifications()}
function setLibraryUsername(){
  if(!requireAuth("profile",setLibraryUsername))return;
  const name=(prompt("Choose a public username for your library:",currentUsername()||"")||"").trim();
  if(!name)return;
  localStorage.setItem("musicaUsername",name);
  updateNavUsername();
}
function openNavProfileMenu(){closeNav();if(!loggedInUser()){openAuthModal("Log in to manage your Muze profile.");return}showAvatarSetup(Boolean(currentUsername()||savedProfileUsername()||avatarHasValue()))}
function localLibraries(){return JSON.parse(localStorage.getItem("musicaPublicLibraries")||"[]")}
function saveLocalLibraries(libraries){localStorage.setItem("musicaPublicLibraries",JSON.stringify(libraries))}
function myLibraryItems(){return JSON.parse(localStorage.getItem("musicaMyLibraryItems")||"[]")}
function saveMyLibraryItems(items){localStorage.setItem("musicaMyLibraryItems",JSON.stringify(items))}
function albumToLibraryItem(a){return {
  id:String(a.id),
  title:a.title,
  artist:a.artist,
  year:a.year||"",
  genre:albumGenreLabel(a),
  cover_url:a.cover_url||"",
  spotify_url:a.spotify_url||"",
  spotify_id:a.spotify_id||"",
  summary:a.summary||"",
  rating:userScore(a)?Number(userScore(a)):displayScore(a)
}}
function sortedLibraryItems(items){return items.slice()}
function liveLibraryItem(item){
  const album=state.albums.find(a=>String(a.id)===String(item.id))||existingAlbumMatch(item);
  if(!album)return item;
  return {...item,id:String(album.id),title:album.title,artist:album.artist,year:album.year||item.year||"",genre:albumGenreLabel(album),cover_url:album.cover_url||item.cover_url||"",spotify_url:album.spotify_url||item.spotify_url||"",spotify_id:album.spotify_id||item.spotify_id||"",summary:album.summary||item.summary||"",rating:displayScore(album),ratings_count:count(album)};
}
function liveLibraryItems(items){return sortedLibraryItems(items).map(liveLibraryItem)}
function albumComparableIds(album){
  return [album?.spotify_id,album?.spotifyId,album?.album_id,album?.albumId,album?.id,album?.spotify_url,album?.spotifyUrl]
    .map(value=>String(value||"").trim().toLowerCase())
    .filter(Boolean);
}
function libraryItemTitle(album){return String(album?.title||album?.album_title||album?.name||album?.album?.title||"").trim()}
function libraryItemArtist(album){
  const artists=album?.artists||album?.album?.artists;
  if(Array.isArray(artists))return artists.map(artist=>artist?.name||artist).filter(Boolean).join(", ");
  return String(album?.artist||album?.artist_name||album?.album?.artist||"").trim();
}
function isSharedLibraryAlbum(a,b){
  const titleA=normalizeAlbumName(libraryItemTitle(a));
  const titleB=normalizeAlbumName(libraryItemTitle(b));
  if(!titleA||!titleB||titleA!==titleB)return false;
  const artistA=normalizeAlbumName(libraryItemArtist(a));
  const artistB=normalizeAlbumName(libraryItemArtist(b));
  if(!artistA||!artistB)return true;
  return artistA===artistB||artistA.includes(artistB)||artistB.includes(artistA);
}
function hasMatchingAlbum(items,album){
  const ids=albumComparableIds(album);
  return (items||[]).some(item=>{
    const itemIds=albumComparableIds(item);
    return ids.some(id=>itemIds.includes(id))||isSameAlbum(item,album)||isSharedLibraryAlbum(item,album);
  });
}
function ownComparableLibraryItems(){
  const username=profileLibraryUsername().toLowerCase();
  const publishedMine=extras.libraries.find(l=>l.device_id===state.deviceId)||(username?extras.libraries.find(l=>String(l.username||"").toLowerCase()===username):null);
  const ownLibraries=[
    currentLibraryCard(),
    publishedMine,
    ...extras.libraries.filter(l=>l?.device_id===state.deviceId||(username&&String(l?.username||"").toLowerCase()===username))
  ].filter(Boolean);
  const sourceItems=[...ownLibraries.flatMap(library=>Array.isArray(library?.items)?library.items:[]),...myLibraryItems()];
  const merged=sourceItems.reduce((items,item)=>{
    const live=liveLibraryItem(item);
    if(!hasMatchingAlbum(items,live))items.push(live);
    return items;
  },[]);
  return liveLibraryItems(merged);
}
function librarySimilarity(items){
  const mine=ownComparableLibraryItems();
  const other=liveLibraryItems(items||[]);
  if(!mine.length||!other.length)return null;
  const mineKeys=new Set(mine.map(a=>coverKey(a)));
  const otherKeys=new Set(other.map(a=>coverKey(a)));
  const shared=[...mineKeys].filter(key=>otherKeys.has(key)).length;
  const total=new Set([...mineKeys,...otherKeys]).size;
  return total?Math.round((shared/total)*100):null;
}
function chatArtistParts(value){
  return String(value||"").split(/\s*(?:,|;|\u2022|\||\s+feat\.?\s+|\s+featuring\s+|\s+with\s+)\s*/i).map(part=>part.trim()).filter(Boolean);
}
function chatArtistKey(value){
  return String(value||"").toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g," ").trim();
}
function chatArtistMapFromItems(items){
  const map=new Map();
  liveLibraryItems(items||[]).forEach(item=>{
    chatArtistParts(item.artist).forEach(name=>{
      const key=chatArtistKey(name);
      if(key&&!map.has(key))map.set(key,name);
    });
  });
  return map;
}
function mutualArtistsForLibrary(library){
  const mine=chatArtistMapFromItems(ownComparableLibraryItems());
  const other=chatArtistMapFromItems(library?.items||[]);
  return [...other.entries()].filter(([key])=>mine.has(key)).map(([,name])=>name).slice(0,8);
}
function mutualAlbumsForLibrary(library){
  const mine=ownComparableLibraryItems();
  const other=liveLibraryItems(library?.items||[]);
  return other.filter(item=>hasMatchingAlbum(mine,item)).map(item=>{
    const title=libraryItemTitle(item)||"Untitled";
    const artist=libraryItemArtist(item);
    return `${title}${artist?` - ${artist}`:""}`;
  }).slice(0,8);
}
function libraryHasAlbum(album){return myLibraryItems().some(item=>isSameAlbum(item,album)||String(item.id)===String(album.id))}
function albumLibrarySaveCount(album){
  const seen=new Set();
  const countSource=(library,key)=>{
    if(!library||seen.has(key))return 0;
    const items=Array.isArray(library.items)?library.items:[];
    if(!hasMatchingAlbum(items,album))return 0;
    seen.add(key);
    return 1;
  };
  let total=extras.libraries.reduce((sum,library)=>sum+countSource(library,String(library.device_id||library.id||library.username||sum)),0);
  if(myLibraryItems().some(item=>isSameAlbum(item,album)||String(item.id)===String(album.id))){
    total+=countSource({items:myLibraryItems()},String(state.deviceId));
  }
  return total;
}
function albumLibrarySaveUsers(album){
  const seen=new Set();
  const rows=[];
  const addLibrary=(library,key)=>{
    if(!library||seen.has(key))return;
    const items=Array.isArray(library.items)?library.items:[];
    if(!hasMatchingAlbum(items,album))return;
    seen.add(key);
    const username=String(library.username||library.name||"Listener").trim()||"Listener";
    rows.push({username,title:library.title||`${username}'s Library`,id:library.id||"",device_id:library.device_id||""});
  };
  extras.libraries.forEach((library,index)=>addLibrary(library,String(library.device_id||library.id||library.username||index)));
  if(myLibraryItems().some(item=>isSameAlbum(item,album)||String(item.id)===String(album.id))){
    const username=profileLibraryUsername()||currentUsername()||"You";
    addLibrary({items:myLibraryItems(),username,title:`${username}'s Library`,device_id:state.deviceId},String(state.deviceId));
  }
  return rows.sort((a,b)=>a.username.localeCompare(b.username));
}
window.toggleAlbumLibraryUsers=function(event,button){
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const note=button?.closest?.(".overviewCommunityNote");
  const panel=note?.querySelector?.(".overviewLibraryUsersPanel");
  if(!panel)return;
  const willOpen=panel.classList.contains("hidden");
  document.querySelectorAll(".overviewLibraryUsersPanel").forEach(item=>item.classList.add("hidden"));
  document.querySelectorAll(".overviewCommunityNote button[aria-expanded]").forEach(item=>item.setAttribute("aria-expanded","false"));
  panel.classList.toggle("hidden",!willOpen);
  button.setAttribute("aria-expanded",willOpen?"true":"false");
}
window.toggleOverviewIntro=function(event,button){
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const section=button?.closest?.(".albumOverviewSleeve");
  if(!section)return;
  const expanded=section.classList.toggle("overviewIntroExpanded");
  button.textContent=expanded?"Show Less":"Read More \u2192";
  button.setAttribute("aria-expanded",expanded?"true":"false");
}
window.toggleOverviewQuote=function(event,quoteBox){
  event?.preventDefault?.();
  event?.stopPropagation?.();
  if(!quoteBox?.classList?.contains("quoteCanExpand"))return;
  const popover=quoteBox?.parentElement?.querySelector?.(".overviewQuotePopover");
  if(!popover)return;
  const willOpen=popover.classList.contains("hidden");
  popover.classList.toggle("hidden",!willOpen);
  quoteBox.classList.toggle("quotePopoverOpen",willOpen);
  quoteBox.setAttribute("aria-expanded",willOpen?"true":"false");
}
window.toggleOverviewPoint=function(event,point){
  event?.preventDefault?.();
  event?.stopPropagation?.();
  if(!point?.classList?.contains("overviewPointCanExpand"))return;
  const expanded=point.classList.toggle("overviewPointExpanded");
  point.setAttribute("aria-expanded",expanded?"true":"false");
}
function profileLibraryUsername(){return (currentUsername()||state.userProfile?.username||savedProfileUsername()||"").trim()}
function libraryRecordWeight(library){
  const albumCount=Number(library?.album_count||(Array.isArray(library?.items)?library.items.length:0)||0);
  const followers=Number(library?.followers_count||0);
  return followers*1000+albumCount;
}
function bestUsernameLibrary(username){
  const key=String(username||"").toLowerCase();
  if(!key)return null;
  return extras.libraries.filter(l=>String(l.username||"").toLowerCase()===key).sort((a,b)=>libraryRecordWeight(b)-libraryRecordWeight(a))[0]||null;
}
function matchingPublishedLibrary(){
  const username=profileLibraryUsername().toLowerCase();
  const userId=String(loggedInUser()?.id||state.userProfile?.user_id||"");
  const byOwner=extras.libraries.find(l=>(userId&&String(l.user_id||"")===userId)||String(l.device_id||"")===String(state.deviceId))||null;
  const byUsername=bestUsernameLibrary(username);
  return byOwner||byUsername||null;
}
function normalizeOwnLibrary(library={}){
  const username=profileLibraryUsername()||"Listener";
  return {...library,username,title:`${username}'s Library`,isMine:true,...profileAvatarFields()};
}
function profileAvatarFields(profile=state.userProfile||{}){
  const avatarOverride=profileAvatarOverride(profile);
  return {
    avatar_url:avatarOverride||profile.avatar_url||null,
    avatar_config:profile.avatar_config||null,
    avatar_svg:profile.avatar_svg||null,
    profile_avatar_url:avatarOverride||profile.avatar_url||null,
    profile_avatar_config:profile.avatar_config||null,
    profile_avatar_svg:profile.avatar_svg||null
  };
}
function refreshProfileAvatarLinks(){
  const username=profileLibraryUsername();
  const fields=profileAvatarFields();
  const profileKey=String(state.userProfile?.user_id||"");
  const profileName=String(state.userProfile?.username||username||"").toLowerCase();
  extras.profileDirectory=[
    {...(state.userProfile||{}),username:state.userProfile?.username||username,...fields},
    ...(extras.profileDirectory||[]).filter(profile=>{
      const sameId=profileKey&&String(profile.user_id||"")===profileKey;
      const sameName=profileName&&String(profile.username||"").toLowerCase()===profileName;
      return !sameId&&!sameName;
    })
  ];
  extras.libraries=extras.libraries.map(l=>{
    const isMine=l.device_id===state.deviceId||l.isMine||(username&&String(l.username||"").toLowerCase()===username.toLowerCase());
    return isMine?{...l,...fields}:l;
  });
  if(isLocalRuntime()){
    saveLocalLibraries(localLibraries().map(l=>{
      const isMine=l.device_id===state.deviceId||l.isMine||(username&&String(l.username||"").toLowerCase()===username.toLowerCase());
      return isMine?{...l,...fields}:l;
    }));
  }
  if(!$("#topbarChatPanel")?.classList.contains("hidden"))chatView($("#topbarChatContent")||undefined);
}
function currentLibraryCard(){
  const localItems=liveLibraryItems(myLibraryItems());
  const username=profileLibraryUsername()||"Listener";
  const existing=matchingPublishedLibrary()||{};
  const existingItems=liveLibraryItems(Array.isArray(existing.items)?existing.items:[]);
  const items=existingItems.length>localItems.length?existingItems:localItems;
  if(!items.length)return null;
  return {
    ...normalizeOwnLibrary(existing),
    id:existing.id||("local-library-"+state.deviceId),
    device_id:existing.device_id||state.deviceId,
    username,
    title:`${username}'s Library`,
    items,
    album_count:items.length,
    followers_count:Number(existing.followers_count||0),
    isMine:true
  };
}
function visibleLibraries(){
  const mine=currentLibraryCard();
  const userId=String(loggedInUser()?.id||state.userProfile?.user_id||"");
  const others=extras.libraries.filter(l=>(!mine||String(l.id)!==String(mine.id))&&String(l.device_id||"")!==String(state.deviceId)&&!(userId&&String(l.user_id||"")===userId));
  return mine?[mine,...others]:extras.libraries;
}
async function syncMyLibrary(){
  if(!requireAuth("save",syncMyLibrary))return false;
  const username=profileLibraryUsername()||ratingName();
  if(!username)return false;
  const user=loggedInUser();
  const existing=matchingPublishedLibrary();
  const merged=[...(Array.isArray(existing?.items)?existing.items:[]),...myLibraryItems()].reduce((items,item)=>{
    const live=liveLibraryItem(item);
    if(!hasMatchingAlbum(items,live))items.push(live);
    return items;
  },[]);
  const items=liveLibraryItems(merged);
  saveMyLibraryItems(items);
  const title=`${username}'s Library`;
  const basePayload={device_id:existing?.device_id||state.deviceId,user_id:user?.id||existing?.user_id||null,username,title,items,album_count:items.length,updated_at:new Date().toISOString()};
  const legacyPayload={device_id:basePayload.device_id,username,title,items,album_count:items.length,updated_at:basePayload.updated_at};
  const payload={...basePayload,...profileAvatarFields()};
  if(db){
    let query=existing?.id?db.from("user_libraries").update(payload).eq("id",existing.id):db.from("user_libraries").upsert(payload,{onConflict:"device_id"});
    let {error}=await query;
    if(error&&/avatar_|profile_avatar_|schema cache|column/i.test(error.message||"")){
      const retryPayload=/user_id/i.test(error.message||"")?legacyPayload:basePayload;
      query=existing?.id?db.from("user_libraries").update(retryPayload).eq("id",existing.id):db.from("user_libraries").upsert(retryPayload,{onConflict:"device_id"});
      const retry=await query;
      error=retry.error;
    }
    if(error){alert(error.message);return false}
  }else{
    const libraries=localLibraries().filter(l=>String(l.id)!==String(existing?.id)&&l.device_id!==state.deviceId);
    libraries.unshift({...payload,id:existing?.id||("local-library-"+state.deviceId),followers_count:Number(existing?.followers_count||0)});
    saveLocalLibraries(libraries);
  }
  await loadLibraries();
  return true;
}
async function addAlbumToMyLibrary(album){
  if(!requireAuth("save",()=>addAlbumToMyLibrary(album)))return false;
  const items=myLibraryItems();
  if(hasMatchingAlbum(items,album))return true;
  items.push(albumToLibraryItem(album));
  saveMyLibraryItems(items);
  await syncMyLibrary();
  return true;
}
window.addCurrentAlbumToLibrary=async function(albumId){
  if(!requireAuth("save",()=>window.addCurrentAlbumToLibrary(albumId)))return;
  const album=state.albums.find(a=>String(a.id)===String(albumId));
  if(!album)return;
  const added=await addAlbumToMyLibrary(album);
  if(added){
    render();
    if(!$("#albumModal")?.classList.contains("hidden"))openAlbum(albumId);
  }
};
window.removeFromMyLibrary=async function(albumId){
  if(!requireAuth("save",()=>window.removeFromMyLibrary(albumId)))return;
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
  if(!requireAuth("save"))return;
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
function localLibraryFollows(){try{return JSON.parse(localStorage.getItem("musicaLibraryFollows")||"[]")}catch(e){return []}}
function saveLocalLibraryFollows(ids){localStorage.setItem("musicaLibraryFollows",JSON.stringify([...new Set((ids||[]).map(String))]))}
function isLibraryFollowed(libraryId){return (extras.libraryFollows||[]).map(String).includes(String(libraryId))}
async function loadLibraryFollows(){
  if(db){
    const {data,error}=await db.from("library_follows").select("library_id").eq("device_id",state.deviceId);
    if(!error){extras.libraryFollows=(data||[]).map(row=>String(row.library_id));saveLocalLibraryFollows(extras.libraryFollows);return extras.libraryFollows}
    console.warn("Unable to load followed libraries",error.message||error);
  }
  extras.libraryFollows=localLibraryFollows();
  return extras.libraryFollows;
}
function rememberFollowedLibrary(libraryId){
  extras.libraryFollows=[...new Set([...(extras.libraryFollows||[]).map(String),String(libraryId)])];
  saveLocalLibraryFollows(extras.libraryFollows);
}
let presenceTimer=null;
function presenceCutoffMs(){return 2*60*1000}
function isPresenceFresh(value){
  const time=value?new Date(value).getTime():0;
  return Boolean(time&&Date.now()-time<presenceCutoffMs());
}
function isUserOnline(userId){
  const id=String(userId||"").trim();
  return Boolean(id&&isPresenceFresh(extras.userPresence?.[id]));
}
async function updateOwnPresence(isOnline=true){
  const user=loggedInUser();
  if(!db||!user)return;
  const row={user_id:user.id,last_seen_at:new Date().toISOString(),is_online:!!isOnline};
  try{
    const {error}=await db.from("user_presence").upsert(row,{onConflict:"user_id"});
    if(error&&!/user_presence|schema cache|relation|column/i.test(error.message||""))console.warn("Unable to update presence",error.message||error);
    if(!error)extras.userPresence={...(extras.userPresence||{}),[user.id]:row.last_seen_at};
  }catch(error){
    console.warn("Unable to update presence",error?.message||error);
  }
}
async function loadUserPresence(){
  if(!db){extras.userPresence={};return extras.userPresence}
  try{
    const {data,error}=await db.from("user_presence").select("user_id,last_seen_at,is_online").gte("last_seen_at",new Date(Date.now()-presenceCutoffMs()).toISOString()).eq("is_online",true);
    if(error){
      if(!/user_presence|schema cache|relation|column/i.test(error.message||""))console.warn("Unable to load presence",error.message||error);
      extras.userPresence={};
      return extras.userPresence;
    }
    extras.userPresence=Object.fromEntries((data||[]).filter(row=>isPresenceFresh(row.last_seen_at)).map(row=>[String(row.user_id),row.last_seen_at]));
  }catch(error){
    console.warn("Unable to load presence",error?.message||error);
    extras.userPresence={};
  }
  return extras.userPresence;
}
function startPresenceHeartbeat(){
  if(presenceTimer)clearInterval(presenceTimer);
  if(!db||!loggedInUser())return;
  updateOwnPresence(true);
  presenceTimer=setInterval(()=>updateOwnPresence(true),30000);
}
function stopPresenceHeartbeat(){
  if(presenceTimer){clearInterval(presenceTimer);presenceTimer=null}
  updateOwnPresence(false);
}
async function loadProfileDirectory(){
  if(db){
    let {data,error}=await db.from("public_user_profiles").select("user_id,username,avatar_url,avatar_config,avatar_svg,avatar_type,created_at").limit(200);
    if(error&&/public_user_profiles|relation|schema cache/i.test(error.message||"")){
      const fallback=await db.from("user_profiles").select("user_id,username,avatar_url,avatar_config,avatar_svg,avatar_type,created_at").limit(200);
      data=fallback.data;
      error=fallback.error;
    }
    if(!error){extras.profileDirectory=data||[];return extras.profileDirectory}
    console.warn("Unable to load profile avatars",error.message||error);
  }
  const localProfile=loadLocalUserProfile();
  extras.profileDirectory=localProfile?[localProfile]:[];
  return extras.profileDirectory;
}
async function loadLibraries(){
  await loadProfileDirectory();
  if(db){
    const {data,error}=await db.from("library_feed").select("*").order("updated_at",{ascending:false}).limit(50);
    if(!error){extras.libraries=data||[];await loadLibraryFollows();renderNotifications();return extras.libraries}
  }
  extras.libraries=localLibraries();
  renderNotifications();
  return extras.libraries;
}
async function publishMyLibrary(){
  if(!requireAuth("save",publishMyLibrary))return;
  const saved=await syncMyLibrary();
  if(!saved){alert("Add at least one album to your library first.");return}
  render();
}
async function followLibrary(libraryId){
  if(!requireAuth("follow",()=>followLibrary(libraryId)))return;
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
  if(!requireAuth("save",()=>removeLibrary(libraryId)))return;
  const library=visibleLibraries().find(l=>String(l.id)===String(libraryId));
  if(!library)return;
  const adminRemovingOther=isAdminUnlocked()&&!(library.device_id===state.deviceId||library.isMine);
  if(!confirm((adminRemovingOther?'Admin delete ':'Remove ')+'"'+(library.title||'this library')+'" from public libraries?'))return;
  if(adminRemovingOther&&db&&String(libraryId).indexOf("local-library-")!==0){
    const data=await adminOverviewRequest({action:"delete_library",library_id:String(libraryId)});
    if(!data)return;
  }else if(db&&String(libraryId).indexOf("local-library-")!==0){
    const {error}=await db.from("user_libraries").delete().eq("id",libraryId);
    if(error){alert(error.message);return}
  }else{
    saveLocalLibraries(localLibraries().filter(l=>String(l.id)!==String(libraryId)));
  }
  if(library.device_id===state.deviceId||library.isMine){saveMyLibraryItems([])}
  await loadLibraries();
  render();
}
async function findAdminLibraryAlbum(){
  const query=(prompt("Search album to add to this library:","")||"").trim();
  if(!query)return null;
  setAdminInlineStatus("Searching albums...","");
  try{
    const res=await fetch(`/.netlify/functions/album-search?q=${encodeURIComponent(query)}&v=admin-library-add`,{cache:"no-store"});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||"Album search failed.");
    const albums=(data.albums||[]).slice(0,8);
    if(!albums.length){alert("No album results found.");return null}
    const list=albums.map((album,index)=>`${index+1}. ${album.title} - ${album.artist}${album.year?` (${album.year})`:""}`).join("\n");
    const answer=(prompt(`Choose album by number:\n\n${list}`,"1")||"").trim();
    if(!answer)return null;
    const index=Number(answer)-1;
    if(!Number.isInteger(index)||index<0||index>=albums.length){alert("Please choose a valid album number.");return null}
    return albums[index];
  }catch(error){
    setAdminInlineStatus(error.message||"Album search failed.","error");
    return null;
  }
}
async function ensureAdminLibraryAlbumRecord(result){
  const album={title:result.title,artist:result.artist,year:result.year,genre:albumGenreLabel(result),cover_url:result.cover_url,spotify_url:result.spotify_url,summary:spotifyAlbumSummary(result),spotify_id:result.spotify_id||""};
  const duplicate=existingAlbumMatch(album);
  if(duplicate)return duplicate;
  const saved=await saveSpotifyAlbumRecord(album);
  const visible=showSavedAlbumImmediately(saved)||saved;
  await loadData();
  return state.albums.find(x=>String(x.spotify_id||"")&&String(x.spotify_id)===String(album.spotify_id||""))||existingAlbumMatch(album)||showSavedAlbumImmediately(visible)||visible;
}
function updateLibraryAlbumLocally(libraryId,item){
  const update=library=>{
    if(String(library.id)!==String(libraryId))return library;
    const items=liveLibraryItems(Array.isArray(library.items)?library.items:[]);
    if(!hasMatchingAlbum(items,item))items.push(item);
    return {...library,items,album_count:items.length,updated_at:new Date().toISOString()};
  };
  extras.libraries=extras.libraries.map(update);
  if(!db)saveLocalLibraries(localLibraries().map(update));
  return visibleLibraries().find(l=>String(l.id)===String(libraryId));
}
window.adminAddAlbumToLibrary=async function(libraryId){
  if(!isAdminUnlocked()){unlockOverviewAdmin();return}
  const library=visibleLibraries().find(l=>String(l.id)===String(libraryId));
  if(!library)return;
  const picked=await findAdminLibraryAlbum();
  if(!picked)return;
  setAdminInlineStatus("Adding album to library...","");
  try{
    const savedAlbum=await ensureAdminLibraryAlbumRecord(picked);
    const item=albumToLibraryItem(savedAlbum);
    const existing=liveLibraryItems(Array.isArray(library.items)?library.items:[]);
    if(hasMatchingAlbum(existing,item)){
      setAdminInlineStatus("That album is already in this library.","success");
      return;
    }
    if(db&&String(libraryId).indexOf("local-library-")!==0){
      const data=await adminOverviewRequest({action:"add_library_album",library_id:String(libraryId),album_item:item});
      if(!data)return;
    }else{
      const nextItems=[...existing,item];
      saveLocalLibraries(localLibraries().map(row=>String(row.id)===String(libraryId)?{...row,items:nextItems,album_count:nextItems.length,updated_at:new Date().toISOString()}:row));
    }
    await loadLibraries();
    const updated=updateLibraryAlbumLocally(libraryId,item)||visibleLibraries().find(l=>String(l.id)===String(libraryId));
    setAdminInlineStatus(`Added ${savedAlbum.title} to ${library.username||"this library"}.`,"success");
    render();
    if(updated&&!$("#albumModal")?.classList.contains("hidden"))openLibraryDetails(updated);
  }catch(error){
    setAdminInlineStatus(error.message||"Album could not be added to this library.","error");
  }
}
function ensureLibraryAlbum(item){
  let existing=state.albums.find(a=>String(a.id)===String(item.id))||existingAlbumMatch(item);
  if(existing)return existing;
  const album={id:String(item.id),title:item.title,artist:item.artist,year:item.year||"",genre:albumGenreLabel(item),cover_url:item.cover_url||"",spotify_url:item.spotify_url||"",summary:item.summary||"",avg_rating:Number(item.rating||0),ratings_count:1};
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
  const card='<article class="card libraryAlbumCard" onclick="event.stopPropagation();openLibraryAlbum(\''+encoded+'\')">'+(item.cover_url?'<div class="cover"><img src="'+escapeHtml(item.cover_url)+'" alt="'+escapeHtml(item.title||"Album cover")+'"></div>':'<div class="cover fallbackCover"><strong>'+escapeHtml(String(item.title||"M").slice(0,1))+'</strong></div>')+'<div class="cardBody"><div class="row"><div><div class="title">'+escapeHtml(item.title||"Untitled")+'</div><div class="artist">'+escapeHtml(item.artist||"")+(item.year?' - '+escapeHtml(item.year):'')+'</div></div>'+scoreText+'</div></div></article>';
  if(!removable)return card;
  const dragAttrs=draggable?' draggable="true" ondragstart="dragLibraryItem(event,\''+escapeJsString(item.id)+'\')" ondragend="endLibraryDrag(event)" ondragover="event.preventDefault()" ondragenter="event.currentTarget.classList.add(\'dragTarget\')" ondragleave="event.currentTarget.classList.remove(\'dragTarget\')" ondrop="dropLibraryItem(event,\''+escapeJsString(item.id)+'\')"':'';
  return '<div class="libraryDraftCard"'+dragAttrs+'>'+card+'<button class="draftRemove" onclick="event.stopPropagation();removeFromMyLibrary(\''+escapeJsString(item.id)+'\')">Remove</button></div>';
}
function openLibraryDetails(library){
  if(!library)return;
  const items=liveLibraryItems(Array.isArray(library.items)?library.items:[]);
  const isMine=library.device_id===state.deviceId||library.isMine;
  const key=escapeJsString(library.id||"");
  const adminAddAction=isAdminUnlocked()&&!isMine&&library.id?'<button class="libraryDetailAddBtn adminLibraryAddBtn" onclick="event.stopPropagation();adminAddAlbumToLibrary(\''+key+'\')">+ Add album</button>':'';
  const addAction=isMine?'<button class="libraryDetailAddBtn" onclick="event.stopPropagation();openLibrarySpotifyAdd()">+ Add album</button>':adminAddAction;
  const baseStats={albumsAdded:Number(library.album_count||items.length||0),albumsRated:0,songsRated:0,songsShared:0,commentsLeft:0};
  $("#albumModalContent").innerHTML='<div class="sectionTitle libraryDetailTitle"><div><h2>'+escapeHtml(library.title||"Library")+'</h2><span class="muted">@'+escapeHtml(library.username||"Listener")+' - '+Number(library.album_count||items.length||0)+' albums</span></div><div class="libraryDetailActions">'+addAction+'</div></div><div id="libraryProfileStatsGrid" class="profileStatsGrid libraryProfileStatsGrid">'+profileStatsMarkup(baseStats)+'</div><div class="grid libraryFullGrid">'+(items.map(item=>libraryAlbumCard(item,isMine,isMine)).join("")||'<div class="empty">No albums yet.</div>')+'</div>';
  $("#albumModal").classList.remove("hidden");
  loadPublicProfileStats(library).then(stats=>{
    const grid=$("#libraryProfileStatsGrid");
    if(grid&&stats)grid.innerHTML=profileStatsMarkup({...baseStats,...stats,albumsAdded:Math.max(Number(stats.albumsAdded||0),baseStats.albumsAdded)});
  }).catch(error=>console.warn("Unable to load public profile stats",error.message||error));
}function openLibraryDetailsById(key){
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
function librarySeedPick(values,library){
  const seed=String((library&&library.id)||"")+String((library&&library.username)||"")+String((library&&library.title)||"");
  let total=0;
  for(let i=0;i<seed.length;i++)total+=seed.charCodeAt(i);
  return values[values.length?total%values.length:0];
}
function libraryIdentityLabel(genres,library){
  const primary=String(genres[0]||"").toLowerCase();
  if(primary.includes("rock"))return librarySeedPick(["Records for lonely drives","Midnight rock essentials","Analog classics","Albums that aged beautifully","Classic rock for grown-ups"],library);
  if(primary.includes("hip"))return librarySeedPick(["Records with sharp edges","Late-night rhyme studies","Beat tapes with fingerprints","Street-corner essentials","Albums built for headphones"],library);
  if(primary.includes("soul"))return librarySeedPick(["Warm records for quiet rooms","Velvet soul essentials","Songs that still glow","Sunday-night soul shelves","Records with a human pulse"],library);
  if(primary.includes("alternative"))return librarySeedPick(["Left-turn albums for late hours","Indie records with weather","Beautifully strange essentials","Guitar music off the main road","Albums for restless moods"],library);
  if(primary.includes("pop"))return librarySeedPick(["Hooks that still sparkle","Polished records with feeling","Bright albums for repeat plays","Pop with a private heartbeat","Big songs, carefully chosen"],library);
  if(!primary||primary==="album")return librarySeedPick(["A handpicked listening room","Albums with a point of view","Records worth getting lost in","A small world of favorite records","A shelf with its own gravity"],library);
  return librarySeedPick([genres[0]+" records with character",genres[0]+" albums worth lingering on",genres[0]+" picks with a point of view",genres[0]+" for curious listeners"],library);
}
function libraryMobileMatchLabel(similarity,library){
  if(similarity>=70)return "Close Taste";
  if(similarity>=30)return "Shared Current";
  if(similarity>0)return "Adjacent Taste";
  return librarySeedPick(["New Territory","Outside Your Taste","Different Perspective","Untapped Corner"],library);
}
function libraryMatchSignals(similarity,library){
  return '<div class="mockLibrarySignals"><span class="mockCompatibilityPill '+(similarity===0?'zeroMatch':'')+'">'+similarity+'% Match</span><span class="mockMobileMatch mockContextPill">'+escapeHtml(libraryMobileMatchLabel(similarity,library))+'</span></div>';
}
function libraryDiscoveryMetric(genres,items,sharedCount,discoveryCount,library){
  const newAlbums=Math.max(1,discoveryCount||items.length||1);
  const artists=[...new Set(items.map(item=>String(item.artist||"").trim()).filter(Boolean))].length||1;
  if(sharedCount>0)return sharedCount+" familiar album"+(sharedCount===1?"":"s")+", "+newAlbums+" still unexplored";
  return librarySeedPick([newAlbums+" albums you haven't rated",Math.max(1,artists)+" artist"+(artists===1?"":"s")+" outside your taste profile",newAlbums+" hidden gem"+(newAlbums===1?"":"s")+" waiting",newAlbums+" albums discovered through compatible listeners"],library);
}
function libraryDiscoveryCopy(sharedCount,discoveryCount,albumCount,library){
  const count=Math.max(1,discoveryCount||albumCount||1);
  if(sharedCount>0)return {title:sharedCount+" shared album"+(sharedCount===1?"":"s"),body:"This library already connects with your taste."};
  return librarySeedPick([
    {title:"You haven't explored this corner of music yet.",body:count+" album"+(count===1?"":"s")+" may fit your taste surprisingly well."},
    {title:"This library comes from outside your usual orbit.",body:count+" album"+(count===1?"":"s")+" could open a new door."},
    {title:"There is unfamiliar ground here.",body:count+" album"+(count===1?"":"s")+" look ready for a closer listen."}
  ],library);
}
function libraryAlbumCountText(albumCount){return albumCount+" album"+(albumCount===1?"":"s")}
function libraryCommonText(sharedCount){return sharedCount>0?sharedCount+" album"+(sharedCount===1?"":"s")+" in common":""}
function libraryDiscoveryReason(sharedCount,discoveryCount,albumCount,similarity,library){
  const newAlbums=Math.max(0,discoveryCount||0);
  if(albumCount>0&&albumCount<=2)return {title:"Early library, see their first picks.",body:libraryAlbumCountText(albumCount)+" waiting inside."};
  if(sharedCount>0)return {title:"You both love "+sharedCount+" album"+(sharedCount===1?"":"s")+". Explore the rest.",body:newAlbums>0?newAlbums+" more pick"+(newAlbums===1?"":"s")+" to discover.":"Open the full shelf."};
  if(similarity>=70)return {title:"Similar taste: discover what they found next.",body:libraryAlbumCountText(albumCount)+" in this music world."};
  if(similarity<40)return {title:"New territory: "+Math.max(1,newAlbums||albumCount)+" album"+(Math.max(1,newAlbums||albumCount)===1?"":"s")+" you have not rated yet.",body:"Step outside your usual orbit."};
  return librarySeedPick([
    {title:"Shared currents, fresh records ahead.",body:libraryAlbumCountText(albumCount)+" to explore."},
    {title:"Interesting overlap with room to wander.",body:Math.max(1,newAlbums||albumCount)+" possible new favorite"+(Math.max(1,newAlbums||albumCount)===1?"":"s")+"."}
  ],library);
}
function libraryRelativeAge(date){
  const days=Math.floor(Math.max(0,Date.now()-date.getTime())/86400000);
  if(days<1)return "today";
  if(days<7)return days+" day"+(days===1?"":"s")+" ago";
  const weeks=Math.floor(days/7);
  if(weeks<5)return weeks+" week"+(weeks===1?"":"s")+" ago";
  const months=Math.floor(days/30);
  if(months<12)return months+" month"+(months===1?"":"s")+" ago";
  const years=Math.floor(days/365);
  return years+" year"+(years===1?"":"s")+" ago";
}
function libraryActivityLine(library,items){
  const itemDates=(items||[]).map(item=>({item,date:new Date(item.added_at||item.created_at||item.updated_at||"")})).filter(entry=>entry.item?.title&&!Number.isNaN(entry.date.getTime())).sort((a,b)=>b.date-a.date);
  if(itemDates.length){
    const days=Math.floor(Math.max(0,Date.now()-itemDates[0].date.getTime())/86400000);
    if(days<=14)return "Added "+itemDates[0].item.title+" recently";
  }
  const raw=library?.updated_at||library?.created_at||"";
  if(!raw)return "";
  const date=new Date(raw);
  if(Number.isNaN(date.getTime()))return "";
  const age=libraryRelativeAge(date);
  if(age==="today")return "Updated today";
  return "Last active "+age;
}
function libraryGenreTags(genres,items){
  const fallback=items.map(item=>albumGenreLabel(item)).filter(Boolean);
  return [...new Set([...(genres||[]),...fallback].filter(Boolean).filter(g=>String(g).toLowerCase()!=="album"))].slice(0,3);
}
function libraryTinyAlbum(item,extraClass=""){
  const scoreText=item.rating&&item.rating!=="-"?'<span class="mockAlbumScore"><svg class="libraryInlineIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9L6.6 20l1-6.1-4.4-4.3 6.1-.9L12 3.2z"></path></svg>' + escapeHtml(item.rating)+'</span>':'';
  const img=item.cover_url?'<img src="'+escapeHtml(item.cover_url)+'" alt="'+escapeHtml(item.title||"Album cover")+'">':'<strong>'+escapeHtml(String(item.title||"M").slice(0,1))+'</strong>';
  return '<article class="mockAlbumTile '+extraClass+'" onclick="event.stopPropagation();openLibraryAlbum(\''+encodeURIComponent(JSON.stringify(item))+'\')"><div class="mockAlbumCover">'+img+'</div><div class="mockAlbumCopy"><strong>'+escapeHtml(item.title||"Untitled")+'</strong><span>'+escapeHtml(item.artist||"")+(item.year?' &middot; '+escapeHtml(item.year):'')+'</span></div>'+scoreText+'</article>';
}
function libraryRowAlbum(item){
  const scoreText=item.rating&&item.rating!=="-"?'<span class="mockAlbumScore"><svg class="libraryInlineIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9L6.6 20l1-6.1-4.4-4.3 6.1-.9L12 3.2z"></path></svg>' + escapeHtml(item.rating)+'</span>':'';
  const img=item.cover_url?'<img src="'+escapeHtml(item.cover_url)+'" alt="'+escapeHtml(item.title||"Album cover")+'">':'<strong>'+escapeHtml(String(item.title||"M").slice(0,1))+'</strong>';
  return '<article class="mockAlbumRow" onclick="event.stopPropagation();openLibraryAlbum(\''+encodeURIComponent(JSON.stringify(item))+'\')"><div class="mockAlbumCover">'+img+'</div><div><strong>'+escapeHtml(item.title||"Untitled")+'</strong><span>'+escapeHtml(item.artist||"")+(item.year?' &middot; '+escapeHtml(item.year):'')+'</span></div>'+scoreText+'</article>';
}
function libraryMatchLabel(similarity){
  return similarity>=70?"Very close taste":similarity>=30?"Some overlap":similarity>0?"Low overlap":"New territory";
}
function libraryAvatarConfig(library){
  const seed=String(library.username||library.title||library.device_id||"listener");
  let hash=0;
  for(let i=0;i<seed.length;i++)hash=(hash*31+seed.charCodeAt(i))>>>0;
  const pick=list=>list[hash%list.length];
  return {...defaultAvatarConfig(),skinColor:pick(["#8f5a3a","#b87952","#d0a17a","#6f4632","#c98f63"]),hairColor:pick(["#1b120d","#3b2416","#5b3825","#d8c7a1","#7a4a2a"]),hairStyle:pick(["waves","short","medium","curly","straight","fade"]),faceShape:pick(["oval","round","heart","soft-square"]),eyes:pick(["focused","calm","bright"]),brows:pick(["soft","bold","arched","straight"]),mouth:pick(["smile","neutral","smirk"]),accessory:pick(["none","glasses","round-glasses","earring","headphones"]),age:24+(hash%24)};
}
function profileForLibrary(library={}){
  const username=String(library.username||library.name||"").trim().toLowerCase();
  const userId=String(library.user_id||library.profile_user_id||"").trim();
  const email=String(library.email||library.profile_email||"").trim().toLowerCase();
  const directory=extras.profileDirectory||[];
  return directory.find(profile=>
    (userId&&String(profile.user_id||"")===userId)||
    (username&&String(profile.username||"").trim().toLowerCase()===username)||
    (email&&String(profile.email||"").trim().toLowerCase()===email)
  )||null;
}
function libraryAvatarMarkup(library){
  const profile=profileForLibrary(library);
  const resolved={...(library||{}),...(profile||{})};
  const label=String(resolved.username||resolved.title||"Listener");
  const avatarUrl=String(profileAvatarOverride(resolved)||resolved.avatar_url||resolved.profile_avatar_url||resolved.photo_url||"").trim();
  if(avatarUrl)return avatarImgMarkup(avatarUrl,label);
  const avatarSvgValue=String(resolved.avatar_svg||resolved.profile_avatar_svg||"").trim();
  if(avatarSvgValue.startsWith("<svg"))return avatarSvgValue;
  let config=resolved.avatar_config||resolved.profile_avatar_config||null;
  if(typeof config==="string"){try{config=JSON.parse(config)}catch(e){config=null}}
  return avatarSvg(config&&typeof config==="object"?config:libraryAvatarConfig(resolved));
}
function libraryBlock(library){
  const items=liveLibraryItems(Array.isArray(library.items)?library.items:[]);
  const isMine=library.device_id===state.deviceId||library.isMine;
  const key=escapeJsString(library.id||library.device_id||"");
  const canFollow=!isMine&&library.id&&String(library.id).indexOf("local-library-")!==0;
  const canRemove=(isMine||(currentUsername()&&String(library.username||"").toLowerCase()===currentUsername().toLowerCase())||isAdminUnlocked())&&library.id;
  const followers=Number(library.followers_count||0);
  const albumCount=Number(library.album_count||items.length||0);
  const genres=[...new Set(items.map(albumGenreLabel).filter(g=>g&&g!=="Album"))].slice(0,3);
  const tags=libraryGenreTags(genres,items);
  const avatar=libraryAvatarMarkup(library);
  const mineItems=ownComparableLibraryItems();
  const sharedCount=isMine?albumCount:items.filter(item=>hasMatchingAlbum(mineItems,item)).length;
  const discoveryCount=isMine?0:Math.max(0,albumCount-sharedCount);
  const similarityRaw=isMine?100:librarySimilarity(items);
  const similarity=Math.max(0,Math.min(100,Number(similarityRaw)||0));
  const matchSignals=libraryMatchSignals(similarity,library);
  const commonLine=libraryCommonText(sharedCount);

  const reason=libraryDiscoveryReason(sharedCount,discoveryCount,albumCount,similarity,library);
  const activityLine=libraryActivityLine(library,items);
  const activity=activityLine?'<div class="mockActivityLine">'+escapeHtml(activityLine)+'</div>':'';
  const preview=items.slice(0,2);
  const mobileAlbum=items[2]?libraryTinyAlbum(items[2],"mockSideAlbum mockMobileOnlyAlbum"):"";
  const extraCount=Math.max(0,items.length-preview.length);
  const albumPreview=items.length===1?libraryRowAlbum(items[0]):preview.map((item,index)=>libraryTinyAlbum(item,index===0?"mockFeaturedAlbum":"mockSideAlbum")).join("")+mobileAlbum+(extraCount?'<div class="mockMoreTile">+'+extraCount+'<br>more</div>':'');
  const discoveryMetric=isMine?'':'<div class="mockDiscoveryMetric">'+escapeHtml(libraryDiscoveryMetric(genres,items,sharedCount,discoveryCount,library))+'</div>';
  const discovery=isMine?'':'<div class="libraryDiscovery '+(sharedCount?"hasOverlap":"newTaste")+'"><strong>'+escapeHtml(reason.title)+'</strong><span>'+escapeHtml(reason.body)+'</span></div>';
  return '<div class="libraryCard mockLibraryCard '+(isMine?'mockOwnCommunity':'')+'" onclick="openLibraryDetailsById(\''+key+'\')"><div class="mockLibraryTop"><div class="mockAvatar">'+avatar+'</div><div class="mockLibraryTitle"><h3>'+escapeHtml(library.title||"Library")+'</h3><p class="mockLibraryByline"><span class="mockUsername">@'+escapeHtml(library.username||"Listener")+'</span><span class="mockAlbumMeta"> &middot; '+libraryAlbumCountText(albumCount)+'</span><span class="mockFollowerMeta"> &middot; '+followers+' follower'+(followers===1?'':'s')+'</span></p><div class="mockMobileSignals">'+matchSignals+(commonLine?'<span class="mockCommonLine">'+escapeHtml(commonLine)+'</span>':'')+'</div></div><div class="mockMatch">'+matchSignals+(commonLine?'<span class="mockCommonLine">'+escapeHtml(commonLine)+'</span>':'')+'</div>'+(canRemove?'<button class="libraryMenuBtn mockRemove" onclick="event.stopPropagation();removeLibrary(\''+escapeJsString(library.id)+'\')" title="Remove library">'+(isAdminUnlocked()&&!isMine?'Delete':'...')+'</button>':'')+'</div><div class="mockDescriptor"><span class="mockDescriptorDesktop">'+escapeHtml(libraryGenreLabel(genres))+'</span><span class="mockDescriptorMobile">'+escapeHtml(libraryIdentityLabel(genres,library))+'</span></div>'+activity+discoveryMetric+'<div class="mockTags">'+(tags.length?tags.map(tag=>'<span>'+escapeHtml(tag)+'</span>').join(""):'<span>Personal</span><span>Essentials</span>')+'</div><div class="mockAlbumPreview '+(items.length===1?'singlePreview':'')+' '+(items.length>=3?'hasMobileTrio':'')+'">'+(albumPreview||'<div class="emptyMini">No public albums yet.</div>')+'</div>'+discovery+'<div class="mockLibraryActions"><button class="libraryExploreBtn" onclick="event.stopPropagation();openLibraryDetailsById(\''+key+'\')">Explore Library</button>'+(canFollow?'<button class="libraryFollowBtn" onclick="event.stopPropagation();followLibrary(\''+escapeJsString(library.id)+'\')">Follow</button>':'<button class="libraryFollowBtn following" onclick="event.stopPropagation();openLibraryDetailsById(\''+key+'\')"><svg class="libraryInlineIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>Following</button>')+'</div></div>';
}
function ownLibrarySubtitle(genres,items){
  const clean=[...new Set((genres||[]).filter(g=>g&&g!=="Album"))].slice(0,2);
  if(clean.length>=2)return clean.join(", ")+", and timeless records.";
  if(clean.length===1)return clean[0]+" albums, personal favorites, and new discoveries.";
  if(items&&items.length)return items.length>4?"A growing library shaped by your taste.":"A collection in progress.";
  return "";
}

function ownLibraryHero(library){
  const items=liveLibraryItems(Array.isArray(library.items)?library.items:[]);
  const followers=Number(library.followers_count||0);
  const key=escapeJsString(library.id||library.device_id||"");
  const heroGenres=[...new Set(items.map(albumGenreLabel).filter(g=>g&&g!=="Album"))].slice(0,3);
  const subtitle=ownLibrarySubtitle(heroGenres,items);
  const recent=items.slice(0,3).map(item=>'<div class="ownRecentCover">'+(item.cover_url?'<img src="'+escapeHtml(item.cover_url)+'" alt="'+escapeHtml(item.title||"Album cover")+'">':'<strong>'+escapeHtml(String(item.title||"M").slice(0,1))+'</strong>')+'</div>').join("");
  const avatarCover=items[0]?.cover_url?'<img src="'+escapeHtml(items[0].cover_url)+'" alt="">':'<span>'+escapeHtml(String(library.username||"L").slice(0,1).toUpperCase())+'</span>';
  return '<section class="mockYourLibrary"><div class="ownIdentity"><div class="ownAvatar">'+avatarCover+'</div><div><p>Your Library</p><h3>'+escapeHtml(library.title||"Your Library")+'</h3>'+(subtitle?'<small class="ownLibrarySubtitle">'+escapeHtml(subtitle)+'</small>':'')+'<span>100% match</span><em>'+items.length+' albums &middot; '+followers+' follower'+(followers===1?'':'s')+'</em><button onclick="openLibraryDetailsById(\''+key+'\')">View your library</button></div></div><div class="ownRecent"><p>Recently added</p><div>'+recent+'</div></div><div class="ownNumbers"><p>Your taste in numbers</p><div><strong>100%</strong><span>Albums you love</span></div><div><strong>'+items.length+'</strong><span>New discoveries</span></div><div><strong>'+items.length+'</strong><span>Shared albums</span></div></div></section>';
}
function libraryRecommendationPanel(){
  const mine=liveLibraryItems(myLibraryItems());
  const recs=state.albums.filter(album=>!mine.some(item=>isSameAlbum(item,album)||String(item.id)===String(album.id))).slice(0,4);
  if(!recs.length)return "";
  return '<div class="libraryRecoPanel"><h3>Because you loved these albums</h3><div>'+recs.map(album=>'<article onclick="openAlbum(\''+escapeJsString(album.id)+'\')">'+cover(album)+'<strong>'+escapeHtml(album.title)+'</strong><span>'+escapeHtml(album.artist)+' &middot; '+escapeHtml(album.year||"")+'</span><em><svg class="libraryInlineIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9L6.6 20l1-6.1-4.4-4.3 6.1-.9L12 3.2z"></path></svg>' + displayScore(album)+'</em></article>').join("")+'</div><button onclick="findMoreLibraryAlbums()">Find more albums</button></div>';
}
function librariesView(){
  const username=currentUsername();
  const allLibraries=visibleLibraries();
  const mineCard=currentLibraryCard()||allLibraries.find(l=>(l.device_id===state.deviceId||l.isMine||(username&&String(l.username||"").toLowerCase()===username.toLowerCase())));
  const fallbackMine={id:"local-library-"+state.deviceId,device_id:state.deviceId,isMine:true,username:username||"Listener",title:(username?username:"Your")+"'s Library",items:liveLibraryItems(myLibraryItems()),album_count:myLibraryItems().length,followers_count:0};
  const displayMine=mineCard||fallbackMine;
  const query=String(state.librarySearch||"").toLowerCase().trim();
  const community=allLibraries.filter(l=>!(l.device_id===state.deviceId||l.isMine||(username&&String(l.username||"").toLowerCase()===username.toLowerCase()))).filter(l=>!query||(`${l.title||""} ${l.username||""} ${(Array.isArray(l.items)?l.items:[]).map(i=>`${i.title||""} ${i.artist||""}`).join(" ")}`).toLowerCase().includes(query));
  content.innerHTML=`<div class="mockLibrariesHeader"><div><h2>Libraries</h2><p>Explore people through the albums they choose.</p></div><div class="mockLibraryTools"><label><span aria-hidden="true"><svg class="libraryInlineIcon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m16 16 4 4"></path></svg></span><input value="${escapeHtml(state.librarySearch||"")}" oninput="setLibrarySearch(this.value)" placeholder="Search libraries, people, albums..."></label><button onclick="openLibrarySpotifyAdd()">+ Add album</button></div></div>${ownLibraryHero(displayMine)}<div class="mockCommunityTitle"><div><strong>Community Libraries</strong></div><button onclick="setLibrarySearch('')">See all</button></div><div class="libraryGrid communityLibraryGrid mockCommunityGrid">${community.map(libraryBlock).join("")||'<div class="empty">No public libraries yet.</div>'}</div>${libraryRecommendationPanel()}`;
}
function chatAlbumByText(text,index=0){
  const query=String(text||"").toLowerCase();
  return state.albums.find(album=>`${album.title||""} ${album.artist||""}`.toLowerCase().includes(query))||state.albums[index]||seedAlbums[index%seedAlbums.length]||{};
}
function chatLibraryFallback(index=0){
  const username=currentUsername()||"Muze Listener";
  const items=liveLibraryItems(myLibraryItems()).length?liveLibraryItems(myLibraryItems()):state.albums.slice(index,index+4).map(albumToLibraryItem);
  const avatarFields=username&&username!=="Muze Listener"?profileAvatarFields():{};
  return {id:"chat-library-"+index,username,index,title:index?`${username}'s discovery shelf`:`${username}'s listening room`,items,album_count:items.length,followers_count:index?8:0,...avatarFields};
}
function chatLocalMessages(){
  try{return JSON.parse(localStorage.getItem("muzeChatMessages")||"{}")||{}}
  catch(error){return {}}
}
function saveChatLocalMessages(messages){
  localStorage.setItem("muzeChatMessages",JSON.stringify(messages||{}));
}
function chatSchemaUnavailable(error){
  const message=String(error?.message||error||"");
  return /schema cache|relation .*chat_messages.*does not exist|could not find .*chat_messages|column .* does not exist|Could not find the .* column/i.test(message);
}
function chatMessageTimeLabel(value){
  const date=value?new Date(value):new Date();
  if(Number.isNaN(date.getTime()))return chatCurrentTimeLabel();
  return date.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
}
async function loadChatMessages(){
  const user=loggedInUser();
  if(!db||!user){extras.chatMessages=[];extras.chatSchemaReady=false;renderChatBadge();return extras.chatMessages}
  const {data,error}=await db.from("chat_messages").select("id,sender_id,recipient_id,body,message_type,created_at,read_at").or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order("created_at",{ascending:true}).limit(500);
  if(error){
    extras.chatSchemaReady=false;
    extras.chatMessages=[];
    if(!chatSchemaUnavailable(error))console.warn("Unable to load chat messages",error.message||error);
    renderChatBadge();
    return extras.chatMessages;
  }
  extras.chatSchemaReady=true;
  extras.chatMessages=data||[];
  renderChatBadge();
  return extras.chatMessages;
}
function chatParticipantId(thread){
  const direct=String(thread?.profile?.user_id||thread?.library?.user_id||thread?.recipient_user_id||profileDirectoryMatch(thread)?.user_id||"").trim();
  if(direct)return direct;
  const id=String(thread?.id||"");
  const match=id.match(/^person-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  return match?match[1]:"";
}
function normalizeChatProfileKey(value){
  return String(value||"")
    .trim()
    .toLowerCase()
    .replace(/^@+/,"")
    .replace(/[’']/g,"'")
    .replace(/\s*'s\s+library$/,"")
    .replace(/\s+library$/,"")
    .replace(/[^a-z0-9._-]+/g," ")
    .trim();
}
function chatProfileMatchKeys(thread){
  return [
    thread?.profile?.username,
    thread?.profile?.name,
    thread?.profile?.title,
    thread?.library?.username,
    thread?.library?.name,
    thread?.name
  ].flatMap(value=>{
    const normalized=normalizeChatProfileKey(value);
    return normalized?[normalized,normalized.replace(/\s+/g,"")]:[];
  }).filter(Boolean);
}
function profileDirectoryMatch(thread){
  const keys=chatProfileMatchKeys(thread);
  if(!keys.length)return null;
  return (extras.profileDirectory||[]).find(profile=>{
    const username=normalizeChatProfileKey(profile.username);
    const name=normalizeChatProfileKey(profile.name);
    const title=normalizeChatProfileKey(profile.title);
    const emailPrefix=normalizeChatProfileKey(String(profile.email||"").split("@")[0]);
    const candidates=[username,name,title,emailPrefix].filter(Boolean).flatMap(value=>[value,value.replace(/\s+/g,"")]);
    return candidates.some(value=>keys.includes(value));
  })||null;
}
async function publicProfileByUserId(userId){
  const id=String(userId||"").trim();
  if(!db||!id)return null;
  try{
    let result=await db.from("public_user_profiles").select("user_id,username,avatar_url,avatar_config,avatar_svg,avatar_type,created_at").eq("user_id",id).limit(1).maybeSingle();
    if(result.error&&/public_user_profiles|relation|schema cache/i.test(result.error.message||"")){
      result=await db.from("user_profiles").select("user_id,username,avatar_url,avatar_config,avatar_svg,avatar_type,created_at").eq("user_id",id).limit(1).maybeSingle();
    }
    if(!result.error&&result.data?.user_id)return result.data;
    const libraryResult=await db.from("user_libraries").select("user_id,username,title,updated_at").eq("user_id",id).order("updated_at",{ascending:false}).limit(1).maybeSingle();
    if(!libraryResult.error&&libraryResult.data?.user_id){
      return {
        user_id:libraryResult.data.user_id,
        username:libraryResult.data.username,
        title:libraryResult.data.title
      };
    }
  }catch(error){
    console.warn("Unable to verify Muze user",error?.message||error);
  }
  return null;
}
async function lookupChatProfileByUsername(thread){
  if(!db)return null;
  const keys=[...new Set(chatProfileMatchKeys(thread))].filter(Boolean);
  if(!keys.length)return null;
  for(const key of keys){
    const usernames=[...new Set([key,key.replace(/\s+/g,"")].filter(Boolean))];
    for(const username of usernames){
      try{
        let result=await db.from("public_user_profiles").select("user_id,username,avatar_url,avatar_config,avatar_svg,avatar_type,created_at").ilike("username",username).limit(1).maybeSingle();
        if(result.error&&/public_user_profiles|relation|schema cache/i.test(result.error.message||"")){
          result=await db.from("user_profiles").select("user_id,username,avatar_url,avatar_config,avatar_svg,avatar_type,created_at").ilike("username",username).limit(1).maybeSingle();
        }
        if(result.error)continue;
        if(result.data?.user_id){
          extras.profileDirectory=[result.data,...(extras.profileDirectory||[]).filter(profile=>String(profile.user_id||"")!==String(result.data.user_id))];
          return result.data;
        }
        const libraryResult=await db.from("user_libraries").select("user_id,username,title,updated_at").ilike("username",username).not("user_id","is",null).order("updated_at",{ascending:false}).limit(1).maybeSingle();
        if(!libraryResult.error&&libraryResult.data?.user_id){
          const profile={
            user_id:libraryResult.data.user_id,
            username:libraryResult.data.username,
            title:libraryResult.data.title
          };
          extras.profileDirectory=[profile,...(extras.profileDirectory||[]).filter(item=>String(item.user_id||"")!==String(profile.user_id))];
          return profile;
        }
      }catch(error){
        console.warn("Unable to look up Muze user",error?.message||error);
      }
    }
  }
  return null;
}
async function resolveChatRecipientId(thread){
  const direct=chatParticipantId(thread);
  if(direct){
    const verified=await publicProfileByUserId(direct);
    if(verified){
      thread.recipient_user_id=verified.user_id;
      thread.profile={...(thread.profile||{}),...verified,user_id:verified.user_id};
      thread.library={...(thread.library||{}),...verified,user_id:verified.user_id};
      return verified.user_id;
    }
    if(thread){
      thread.recipient_user_id="";
      if(thread.profile)thread.profile.user_id="";
      if(thread.library)thread.library.user_id="";
    }
  }
  let profile=profileDirectoryMatch(thread);
  if(!profile&&db){
    await loadProfileDirectory().catch(error=>console.warn("Unable to refresh Muze users",error));
    profile=profileDirectoryMatch(thread);
  }
  if(profile?.user_id){
    const verified=await publicProfileByUserId(profile.user_id);
    profile=verified||null;
  }
  if(!profile)profile=await lookupChatProfileByUsername(thread);
  const id=String(profile?.user_id||"").trim();
  if(id&&thread){
    thread.recipient_user_id=id;
    thread.profile={...(thread.profile||{}),...(profile||{}),user_id:id};
    thread.library={...(thread.library||{}),...(profile||{}),user_id:id};
  }
  return id;
}
function chatRemoteMessagesForThread(thread){
  const user=loggedInUser();
  const participantId=chatParticipantId(thread);
  if(!user||!participantId)return [];
  return (extras.chatMessages||[])
    .filter(message=>{
      const sender=String(message.sender_id||"");
      const recipient=String(message.recipient_id||"");
      return (sender===String(user.id)&&recipient===participantId)||(sender===participantId&&recipient===String(user.id));
    })
    .map(message=>({
      id:message.id,
      side:String(message.sender_id||"")===String(user.id)?"me":"them",
      type:message.message_type||"text",
      time:chatMessageTimeLabel(message.created_at),
      body:message.body||"",
      created_at:message.created_at,
      read_at:message.read_at
    }));
}
function chatUnreadForThread(thread){
  const user=loggedInUser();
  const participantId=chatParticipantId(thread);
  if(!user||!participantId)return Number(thread?.unread||0);
  return (extras.chatMessages||[]).filter(message=>String(message.sender_id||"")===participantId&&String(message.recipient_id||"")===String(user.id)&&!message.read_at).length;
}
async function markChatThreadRead(thread){
  const user=loggedInUser();
  const participantId=chatParticipantId(thread);
  if(!db||!user||!participantId)return;
  const unread=(extras.chatMessages||[]).filter(message=>String(message.sender_id||"")===participantId&&String(message.recipient_id||"")===String(user.id)&&!message.read_at);
  if(!unread.length)return;
  const readAt=new Date().toISOString();
  unread.forEach(message=>{message.read_at=readAt});
  renderChatBadge();
  const {error}=await db.from("chat_messages").update({read_at:readAt}).in("id",unread.map(message=>message.id)).eq("recipient_id",user.id);
  if(error&&!chatSchemaUnavailable(error))console.warn("Unable to mark chat messages read",error.message||error);
}
function chatCurrentTimeLabel(){
  return new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
}
let mobileChatViewportReady=false;
function isMobileChatViewport(){return window.matchMedia?.("(max-width: 650px)")?.matches||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent||"")}
function syncMobileChatViewport(){
  const panel=$("#topbarChatPanel");
  if(!panel)return;
  const isMobile=isMobileChatViewport();
  const visual=window.visualViewport;
  const height=Math.max(360,Math.floor(visual?.height||window.innerHeight||window.screen.height||720));
  document.documentElement.style.setProperty("--mobile-chat-height",height+"px");
  const keyboardOpen=!!(isMobile&&visual&&visual.height<window.innerHeight-80);
  panel.classList.toggle("keyboardOpen",keyboardOpen);
  if(keyboardOpen){
    $("#topbarChatContent")?.scrollTo?.({top:0,behavior:"auto"});
    document.scrollingElement?.scrollTo?.({top:0,behavior:"auto"});
  }
}
function installMobileChatViewportSync(){
  if(mobileChatViewportReady)return;
  mobileChatViewportReady=true;
  window.visualViewport?.addEventListener("resize",syncMobileChatViewport);
  window.visualViewport?.addEventListener("scroll",syncMobileChatViewport);
  window.addEventListener("resize",syncMobileChatViewport);
}
function bindMobileChatInputViewport(){
  installMobileChatViewportSync();
  syncMobileChatViewport();
  const input=$("#chatMessageInput");
  if(!input||input.dataset.mobileViewportBound)return;
  input.dataset.mobileViewportBound="1";
  input.addEventListener("focus",()=>{
    syncMobileChatViewport();
    requestAnimationFrame(()=>{
      $("#topbarChatContent")?.scrollTo?.({top:0,behavior:"auto"});
      input.scrollIntoView?.({block:"nearest",inline:"nearest",behavior:"auto"});
    });
  });
  input.addEventListener("blur",()=>setTimeout(syncMobileChatViewport,120));
}
function chatLastMessageText(message){
  if(!message)return "";
  if(message.type==="album")return `Shared ${message.album?.title||"an album"}.`;
  if(message.type==="rating")return `Rated ${message.album?.title||"an album"}.`;
  if(message.type==="review")return `Shared a review of ${message.album?.title||"an album"}.`;
  if(message.type==="library")return message.body||"Shared a library.";
  return message.body||"";
}
function chatCommunityProfiles(community){
  const seen=new Set();
  const current=String(currentUsername()||"").toLowerCase();
  const rows=[];
  community.forEach(library=>{
    const username=String(library.username||"").trim();
    const key=(username||library.device_id||library.id||"").toString().toLowerCase();
    if(!key||seen.has(key))return;
    seen.add(key);
    const profile=profileForLibrary(library);
    rows.push({...library,user_id:library.user_id||profile?.user_id||null,email:library.email||profile?.email||null,...profileAvatarFields(profile||library)});
  });
  (extras.profileDirectory||[]).forEach(profile=>{
    const username=String(profile.username||"").trim();
    const key=(username||profile.user_id||profile.email||"").toString().toLowerCase();
    if(!key||key===current||seen.has(key))return;
    seen.add(key);
    rows.push({
      id:"profile-chat-"+(profile.user_id||username||key),
      user_id:profile.user_id,
      email:profile.email,
      username:username||String(profile.email||"").split("@")[0]||"Listener",
      title:(username||"Listener")+"'s Library",
      items:[],
      album_count:0,
      ...profileAvatarFields(profile)
    });
  });
  return rows;
}
function chatThreadFromLibrary(library,index){
  const items=liveLibraryItems(library.items||[]);
  const fallbackAlbum=chatAlbumByText(index%2?"ok computer":"abbey road",index);
  const album=items[0]||fallbackAlbum;
  const second=items[1]||chatAlbumByText(index%2?"rumours":"to pimp a butterfly",index+1);
  const match=librarySimilarity(library.items||[]);
  const name=library.username||library.name||"Listener";
  const profile=profileForLibrary(library);
  const recipientUserId=String(library.user_id||profile?.user_id||"").trim();
  const id=String(recipientUserId||library.id||library.device_id||name||index).replace(/[^a-z0-9_-]+/gi,"-").toLowerCase();
  const mutualArtists=mutualArtistsForLibrary(library);
  const sharedAlbums=mutualAlbumsForLibrary(library);
  const thread={
    id:"person-"+id,
    name,
    profile:{...library,...(profile||{}),user_id:recipientUserId||library.user_id||profile?.user_id||null},
    recipient_user_id:recipientUserId,
    role:"Shared albums and listener notes",
    online:isUserOnline(recipientUserId),
    unread:0,
    time:"",
    match:match===null?Math.max(58,92-index*7):match,
    artists:mutualArtists,
    sharedAlbums,
    albums:[album.title||"Abbey Road",second.title||"To Pimp a Butterfly"],
    library:{...library,user_id:recipientUserId||library.user_id||profile?.user_id||null},
    preview:"No messages yet.",
    messages:[]
  };
  const messages=chatRemoteMessagesForThread(thread);
  const last=messages[messages.length-1];
  const unread=chatUnreadForThread(thread);
  return {...thread,messages,preview:chatLastMessageText(last)||thread.preview,time:last?.time||thread.time,unread:last?.side==="me"?0:unread};
}
function chatThreadIdForProfile(profile,index=0){
  return chatThreadFromLibrary(profile,index).id;
}
function chatStableThreadId(thread){
  const participantId=chatParticipantId(thread);
  if(participantId)return "person-"+String(participantId).replace(/[^a-z0-9_-]+/gi,"-").toLowerCase();
  return String(thread?.id||"");
}
function chatProfileForUserId(userId){
  const id=String(userId||"").trim();
  if(!id)return null;
  const user=loggedInUser();
  if(user&&String(user.id)===id){
    return {
      ...(state.userProfile||{}),
      user_id:id,
      username:savedProfileUsername()||currentUsername()||authMetadataName(user)||authEmailPrefix(user)||"Your profile",
      name:savedProfileUsername()||currentUsername()||authMetadataName(user)||authEmailPrefix(user)||"Your profile"
    };
  }
  return (extras.profileDirectory||[]).find(profile=>String(profile.user_id||"")===id)||null;
}
function chatThreadFromParticipantId(userId,index=0){
  const id=String(userId||"").trim();
  if(!id)return null;
  const profile=chatProfileForUserId(id)||{};
  const username=String(profile.username||profile.name||profile.title||"Muze user").trim();
  const thread={
    id:"person-"+id,
    name:username,
    profile:{...profile,user_id:id,username},
    recipient_user_id:id,
    role:"Real Muze conversation",
    online:isUserOnline(id),
    unread:0,
    time:"",
    match:0,
    artists:[],
    sharedAlbums:[],
    albums:[],
    library:{...profile,user_id:id,username},
    preview:"No messages yet.",
    messages:[]
  };
  const messages=chatRemoteMessagesForThread(thread);
  const last=messages[messages.length-1];
  const unread=chatUnreadForThread(thread);
  return {...thread,messages,preview:chatLastMessageText(last)||thread.preview,time:last?.time||thread.time,unread:last?.side==="me"?0:unread};
}
function chatSearchProfiles(query=""){
  const q=String(query||"").trim().toLowerCase().replace(/^@/,"");
  if(!q)return [];
  const current=String(currentUsername()||"").toLowerCase();
  const seen=new Set();
  return chatCommunityProfiles(visibleLibraries().filter(l=>!(l.device_id===state.deviceId||l.isMine)))
    .filter(profile=>{
      const username=String(profile.username||profile.name||"").trim();
      const key=String(profile.user_id||username||profile.email||"").toLowerCase();
      if(!username||username.toLowerCase()===current||seen.has(key))return false;
      seen.add(key);
      return username.toLowerCase().includes(q);
    })
    .slice(0,8);
}
function chatUserSearchHtml(){
  if(!state.chatUserSearchOpen)return "";
  const query=String(state.chatUserSearchQuery||"");
  const results=chatSearchProfiles(query);
  const resultHtml=query&&!results.length?'<div class="chatUserSearchEmpty">No Muze user found.</div>':results.map((profile,index)=>{
    const username=profile.username||profile.name||"Listener";
    const id=chatThreadIdForProfile(profile,index);
    return `<button class="chatUserSearchResult" type="button" onclick="startChatWithUser('${escapeJsString(id)}')">${chatAvatarMarkup(profile,false,index)}<span><strong>${escapeHtml(username)}</strong><small>@${escapeHtml(username)}</small></span></button>`;
  }).join("");
  return `<div class="chatUserSearchPanel"><label><input id="chatUserSearchInput" value="${escapeHtml(query)}" placeholder="Search Muze username..." oninput="setChatUserSearch(this.value)" onkeydown="if(event.key==='Enter')selectFirstChatSearchResult()"></label><div class="chatUserSearchResults">${resultHtml}</div></div>`;
}
function chatConversationData(){
  const libraries=visibleLibraries();
  const community=libraries.filter(l=>!(l.device_id===state.deviceId||l.isMine||(currentUsername()&&String(l.username||"").toLowerCase()===currentUsername().toLowerCase())));
  const people=chatCommunityProfiles(community);
  const threads=people.map(chatThreadFromLibrary);
  Object.values(extras.chatAdHocThreads||{}).forEach(savedThread=>{
    if(savedThread&&!threads.some(thread=>thread.id===savedThread.id))threads.push(savedThread);
  });
  const user=loggedInUser();
  if(user){
    const ids=[...new Set((extras.chatMessages||[]).map(message=>{
      const sender=String(message.sender_id||"");
      const recipient=String(message.recipient_id||"");
      return sender===String(user.id)?recipient:recipient===String(user.id)?sender:"";
    }).filter(id=>id&&id!==String(user.id)))];
    ids.forEach((id,index)=>{
      if(!threads.some(thread=>chatParticipantId(thread)===id||thread.id==="person-"+id)){
        const thread=chatThreadFromParticipantId(id,index);
        if(thread)threads.push(thread);
      }
    });
  }
  return threads;
}
function chatScoreLabel(album){
  const direct=Number(album?.avg_rating||0);
  if(direct>0)return displayScore(album);
  const rating=Number(album?.rating||0);
  return rating>0?rating.toFixed(1):"-";
}
function chatMatchLabel(match){
  const value=Number(match||0);
  if(value>=80)return "Strong Match";
  if(value>=60)return "Shared Classics";
  if(value>=35)return "Adjacent Taste";
  if(value>0)return "Unexpected Discovery";
  return "New Territory";
}
function chatCompatibilityText(match,withPrefix=false){
  return chatMatchLabel(match);
}
function chatStrictSharedAlbumObjects(active){
  const library=active?.library||active?.profile||{};
  const mine=ownComparableLibraryItems();
  const other=liveLibraryItems(library?.items||[]);
  return other.filter(item=>hasMatchingAlbum(mine,item));
}
function chatThreadDiscoveryLabel(thread,index=0){
  const shared=chatStrictSharedAlbumObjects(thread);
  if(shared.length){
    const first=shared[0]?.title||"Shared albums";
    return shared.length>1?`${first} + ${shared.length-1} more`:first;
  }
  const genres=chatSharedGenres(thread);
  if(genres.length)return `Shared ${genres[0]} taste`;
  const labels=["New Territory","Unexpected Discovery","Adjacent Taste","Shared Classics","Strong Match"];
  return chatMatchLabel(thread?.match)||labels[index%labels.length];
}
function chatThreadDiscoveryClass(thread,index=0){
  const label=chatThreadDiscoveryLabel(thread,index).toLowerCase();
  if(label.includes("common")||label.includes("classic"))return "chatDiscoveryShared";
  if(label.includes("strong"))return "chatDiscoveryStrong";
  if(label.includes("adjacent"))return "chatDiscoveryAdjacent";
  if(label.includes("unexpected"))return "chatDiscoveryUnexpected";
  return "chatDiscoveryNew";
}
function chatTasteChips(items,limit=2){
  const clean=[...new Set((items||[]).filter(Boolean))];
  const visible=clean.slice(0,limit).map(item=>`<span>${escapeHtml(item)}</span>`).join("");
  const more=clean.length>limit?`<span class="chatMoreChip">+${clean.length-limit} more</span>`:"";
  return visible+more;
}
function chatConnectionPurpose(active){
  const artist=active.artists?.[0]||"music";
  const album=active.albums?.[0]||"the same records";
  if(Number(active.match||0)>=80)return `You both keep returning to ${artist} and ${album}.`;
  if(Number(active.match||0)>0)return `You have overlap around ${artist}, with room to trade discoveries.`;
  return `Their library sits outside your usual taste, which makes it useful for discovery.`;
}
function chatConnectionContext(active){
  return chatRecentActivityHeader(active);
  const activeLibrary=active?.profile||active?.library||null;
  const liveSharedAlbums=activeLibrary?mutualAlbumsForLibrary(activeLibrary):[];
  const liveArtists=activeLibrary?mutualArtistsForLibrary(activeLibrary):[];
  const sharedAlbums=[...new Set([...(active.sharedAlbums||[]),...liveSharedAlbums].filter(Boolean))].slice(0,8);
  const artists=[...new Set([...(active.artists||[]),...liveArtists].filter(Boolean))].slice(0,8);
  const sharedObjects=chatStrictSharedAlbumObjects(active);
  const genres=chatSharedGenres(active);
  const topShared=chatTopSharedAlbum(active);
  const albumNames=(sharedObjects.length?sharedObjects.map(album=>album.title):sharedAlbums).filter(Boolean).slice(0,2);
  const context=[
    albumNames.length?`You both love ${albumNames.join(" and ")}.`:"",
    genres.length?`Shared genres: ${genres.slice(0,2).join(", ")}.`:"",
    topShared?.title?`Highest overlap: ${topShared.title}.`:(artists.length?`Mutual artist: ${artists[0]}.`:"")
  ].filter(Boolean);
  const pills=context.length?context.map(item=>`<span>${escapeHtml(item)}</span>`).join(""):`<p>No overlap yet. Start with a recommendation.</p>`;
  return `<div class="chatConnectionContext"><small>Music overlap</small><div class="chatMutualArtistPills">${pills}</div></div>`;
}
function chatEmojiSearchText(label,emoji){
  function flagCountryName(value){
    const points=[...String(value||"")].map(ch=>ch.codePointAt(0));
    if(points.length!==2||points.some(point=>point<0x1f1e6||point>0x1f1ff))return "";
    const code=points.map(point=>String.fromCharCode(65+point-0x1f1e6)).join("");
    try{return new Intl.DisplayNames([navigator.language||"en"],{type:"region"}).of(code)||code}catch(e){return code}
  }
  const categoryAliases={
    Smileys:"face smile happy laugh lol joy sad cry angry love sick sleepy shocked thinking wink cool party",
    People:"person people hand hands body gesture thumbs clap pray muscle family job sport royal king queen crown",
    Animals:"animal nature plant flower tree pet dog cat bird fish bug",
    Food:"food drink fruit vegetable meal dessert coffee beer wine pizza burger",
    Activities:"activity sport sports game ball music instrument art trophy medal movie ticket",
    Travel:"travel place vehicle car bus train plane boat building house mountain beach city",
    Objects:"object phone computer camera clock money tool gift book lock key mail",
    Symbols:"symbol heart love music arrow number warning check circle square color",
    Flags:"flag country pride pirate race"
  };
  const emojiAliases={
    "😀":"grin happy smile face glad cheerful","😃":"smile happy face glad cheerful","😄":"smile happy laugh glad cheerful","😁":"grin smile happy glad cheerful","😆":"laugh smile happy glad cheerful","😅":"sweat laugh smile happy","😂":"laugh tears joy lol happy funny","🤣":"rofl laugh rolling lol happy funny","🥲":"tear smile touched happy sad","🥹":"holding tears emotional happy sad","☺️":"smile blush happy glad","😊":"smile blush happy glad cheerful","😇":"angel innocent happy smile","🙂":"smile slight happy glad","🙃":"upside down silly happy smile","😉":"wink happy smile","😌":"relieved calm happy","😍":"heart eyes love happy","🥰":"love hearts smile happy","😘":"kiss love happy","😗":"kiss happy","😙":"kiss happy smile","😚":"kiss happy blush","😋":"yum tasty happy","😛":"tongue silly happy","😝":"tongue silly happy","😜":"wink tongue silly happy","🤪":"crazy silly happy","🤨":"raised eyebrow suspicious confused","🧐":"monocle curious","🤓":"nerd glasses happy","😎":"cool sunglasses happy","🥸":"disguise glasses","🤩":"star eyes excited happy","🥳":"party celebrate happy","😏":"smirk","😒":"unamused annoyed sad","😞":"sad disappointed unhappy","😔":"sad pensive unhappy","😟":"worried sad unhappy","😕":"confused sad","🙁":"frown sad unhappy","☹️":"frown sad unhappy","😣":"pained sad frustrated","😖":"confounded sad upset","😫":"tired sad weary","😩":"weary sad tired","🥺":"pleading puppy eyes sad","😢":"cry sad tear unhappy","😭":"sob cry sad unhappy","😤":"triumph angry mad annoyed","😠":"angry mad annoyed","😡":"rage angry mad annoyed","🤬":"swear angry mad annoyed","🤯":"mind blown shocked","😳":"flushed embarrassed","🥵":"hot","🥶":"cold frozen","😱":"scream scared shocked","😨":"fear scared","😰":"anxious sweat","😥":"sad relieved sweat","😓":"sad sweat","🫣":"peek scared","🤗":"hug happy","🫡":"salute","🤔":"thinking","🫢":"oops shocked","🤭":"giggle oops happy","🤫":"shush quiet","🤥":"lie liar","😶":"silent neutral","😐":"neutral blank","😑":"expressionless blank","😬":"grimace awkward","🫨":"shaking shocked","🫠":"melting","🙄":"eye roll annoyed","😯":"surprised","😦":"frown open sad","😧":"anguished sad","😮":"open mouth surprised","😲":"astonished shocked","🥱":"yawn tired","😴":"sleep sleepy","🤤":"drool","😪":"sleepy sad","😵":"dizzy","😵‍💫":"dizzy confused","🫥":"invisible","🤐":"zipper mouth secret","🥴":"woozy","🤢":"nauseous sick","🤮":"vomit sick","🤧":"sneeze sick","😷":"mask sick","🤒":"thermometer sick","🤕":"bandage hurt","🤑":"money face","🤠":"cowboy happy",
    "👋":"wave hello hand","👍":"thumbs up like yes","👎":"thumbs down dislike no","👏":"clap applause","🙌":"raise hands celebrate","🫶":"heart hands love","🙏":"pray please thanks","💪":"muscle strong flex","👀":"eyes look","👄":"lips mouth kiss","👶":"baby","🧑":"person","👨":"man","👩":"woman","🧓":"older adult","👴":"old man","👵":"old woman","👑":"crown king queen royal","🫅":"royal person crown king queen","🤴":"king prince royal crown","👸":"queen princess royal crown","👨‍👩‍👧":"family parents child","👨‍👩‍👦":"family parents son","👨‍👩‍👧‍👦":"family parents children","👨‍👩‍👦‍👦":"family parents sons","👨‍👩‍👧‍👧":"family parents daughters","👩‍👩‍👧":"family mothers child","👩‍👩‍👦":"family mothers son","👩‍👩‍👧‍👦":"family mothers children","👩‍👩‍👦‍👦":"family mothers sons","👩‍👩‍👧‍👧":"family mothers daughters","👨‍👨‍👧":"family fathers child","👨‍👨‍👦":"family fathers son","👨‍👨‍👧‍👦":"family fathers children","👨‍👨‍👦‍👦":"family fathers sons","👨‍👨‍👧‍👧":"family fathers daughters","👩‍👧":"family mother daughter","👩‍👦":"family mother son","👩‍👧‍👦":"family mother children","👩‍👦‍👦":"family mother sons","👩‍👧‍👧":"family mother daughters","👨‍👧":"family father daughter","👨‍👦":"family father son","👨‍👧‍👦":"family father children","👨‍👦‍👦":"family father sons","👨‍👧‍👧":"family father daughters","🏃":"run running","💃":"dance dancer","🕺":"dance dancer","🚴":"bike bicycle cycling","🏊":"swim swimming","⛹️":"basketball sport","🏋️":"lift weights gym","🧘":"meditate yoga",
    "🐶":"dog pet","🐱":"cat pet","🐭":"mouse","🐰":"rabbit bunny","🦊":"fox","🐻":"bear","🐼":"panda","🐨":"koala","🐯":"tiger","🦁":"lion","🐮":"cow","🐷":"pig","🐸":"frog","🐵":"monkey","🐔":"chicken","🐧":"penguin","🐦":"bird","🦆":"duck","🦅":"eagle","🦉":"owl","🦇":"bat","🐴":"horse","🦄":"unicorn","🐝":"bee","🐛":"bug caterpillar","🦋":"butterfly","🐌":"snail","🐞":"ladybug","🐜":"ant","🕷️":"spider","🐢":"turtle","🐍":"snake","🐙":"octopus","🐟":"fish","🐬":"dolphin","🐳":"whale","🦈":"shark","🐘":"elephant","🦒":"giraffe","🐕":"dog pet","🐈":"cat pet","🌵":"cactus","🎄":"christmas tree","🌲":"tree","🌳":"tree","🌴":"palm tree","🌱":"seedling plant","🌿":"herb plant","☘️":"clover","🍀":"lucky clover","🍄":"mushroom","💐":"bouquet flowers","🌷":"tulip flower","🌹":"rose flower love","🌺":"hibiscus flower","🌸":"cherry blossom flower","🌼":"flower","🌻":"sunflower",
    "🍇":"grapes fruit","🍉":"watermelon fruit","🍊":"orange fruit","🍋":"lemon fruit","🍌":"banana fruit","🍍":"pineapple fruit","🥭":"mango fruit","🍎":"apple fruit","🍐":"pear fruit","🍑":"peach fruit","🍒":"cherries fruit","🍓":"strawberry fruit","🥝":"kiwi fruit","🍅":"tomato","🥑":"avocado","🍆":"eggplant","🥔":"potato","🥕":"carrot","🌽":"corn","🥒":"cucumber","🥦":"broccoli","🧄":"garlic","🧅":"onion","🍞":"bread","🥐":"croissant","🧀":"cheese","🍖":"meat","🍗":"chicken","🥩":"steak meat","🍔":"burger hamburger","🍟":"fries chips","🍕":"pizza","🌭":"hot dog","🌮":"taco","🌯":"burrito","🥚":"egg","🍳":"cooking breakfast","🥗":"salad","🍿":"popcorn","🍱":"bento","🍚":"rice","🍜":"ramen noodles","🍝":"pasta spaghetti","🍠":"sweet potato","🍣":"sushi","🍤":"shrimp tempura","🍦":"ice cream","🍩":"donut","🍪":"cookie","🎂":"cake birthday","🍰":"cake dessert","🍫":"chocolate","🍬":"candy","☕":"coffee","🍵":"tea","🍺":"beer","🍻":"beers cheers","🥂":"cheers champagne","🍷":"wine","🍸":"cocktail","🥤":"drink cup","🧊":"ice",
    "⚽":"soccer football ball sport","🏀":"basketball ball sport","🏈":"football american sport","⚾":"baseball ball sport","🎾":"tennis ball sport","🏐":"volleyball sport","🏉":"rugby sport","🎱":"pool billiards 8 ball","🏓":"ping pong table tennis","🏸":"badminton","🏒":"hockey","🏑":"field hockey","🏏":"cricket","🥅":"goal net","⛳":"golf","🏹":"archery bow","🎣":"fishing","🥊":"boxing glove","🥋":"martial arts","🎽":"running shirt","🛹":"skateboard","⛸️":"ice skate","🎿":"ski","⛷️":"skiing","🏂":"snowboard","🏋️":"weight lifting gym","🤼":"wrestling","🤸":"gymnastics","⛹️":"basketball player","🤺":"fencing","🏇":"horse racing","🏄":"surf","🚣":"rowing","🏊":"swimming","🚴":"cycling bike","🏆":"trophy winner","🥇":"gold medal first","🥈":"silver medal second","🥉":"bronze medal third","🏅":"medal","🎖️":"military medal","🎫":"ticket","🎟️":"tickets","🎪":"circus","🎭":"theater drama","🩰":"ballet","🎨":"art paint","🎬":"movie clapper film","🎤":"microphone singing","🎧":"headphones music","🎼":"music score","🎹":"piano keyboard","🥁":"drums","🎷":"saxophone","🎺":"trumpet","🎸":"guitar","🎻":"violin","🎲":"dice game","♟️":"chess","🎯":"target dart","🎳":"bowling","🎮":"video game controller","🎰":"slot machine","🧩":"puzzle",
    "🚗":"car vehicle","🚕":"taxi","🚙":"suv car","🚌":"bus","🚎":"trolley bus","🏎️":"race car","🚓":"police car","🚑":"ambulance","🚒":"fire truck","🚐":"van","🚚":"truck delivery","🚛":"truck","🚜":"tractor","🛴":"scooter","🚲":"bike bicycle","🏍️":"motorcycle","🚨":"siren police","🚔":"police car","🚍":"bus","🚘":"car","🚖":"taxi","🚡":"cable car","🚠":"mountain cableway","🚟":"railway","🚃":"train","🚋":"tram","🚞":"train","🚝":"monorail","🚄":"train fast","🚅":"bullet train","🚈":"train metro","🚂":"locomotive train","🚆":"train","🚇":"subway metro","✈️":"plane airplane flight","🛫":"takeoff plane","🛬":"landing plane","🚀":"rocket","🛸":"ufo","⛵":"sailboat","🚤":"speedboat","🛳️":"ship cruise","⛴️":"ferry","🚢":"ship","⚓":"anchor","⛽":"gas fuel","🚧":"construction","🚦":"traffic light","🗺️":"map","🗿":"statue","🗽":"statue liberty","🏰":"castle","🎡":"ferris wheel","🎢":"roller coaster","⛲":"fountain","🏖️":"beach","🏝️":"island","🏜️":"desert","🌋":"volcano","⛰️":"mountain","🏔️":"snow mountain","🗻":"mount fuji","🏕️":"camping","⛺":"tent","🏠":"house home","🏡":"house home","🏢":"office building","🏥":"hospital","🏦":"bank","🏨":"hotel","🏫":"school","⛪":"church","🕌":"mosque","🛕":"temple","🌅":"sunrise","🌃":"night city",
    "⌚":"watch clock","📱":"phone mobile","💻":"laptop computer","⌨️":"keyboard","🖥️":"desktop computer","🖨️":"printer","🖱️":"mouse computer","💽":"disk","💾":"save floppy","💿":"cd disc","📷":"camera","📸":"camera flash","📹":"video camera","🎥":"movie camera","📞":"phone telephone","📺":"tv television","📻":"radio","🎙️":"microphone","⏰":"alarm clock","⌛":"hourglass","🔋":"battery","🔌":"plug","💡":"light bulb idea","🔦":"flashlight","🕯️":"candle","💸":"money cash","💵":"dollar money","💰":"money bag","💳":"credit card","💎":"diamond gem","⚖️":"scale balance law","🔧":"wrench tool","🔨":"hammer tool","⚙️":"gear settings","🔫":"water gun","💣":"bomb","🔪":"knife","🛡️":"shield","🔮":"crystal ball magic","🧿":"evil eye","💈":"barber","🔭":"telescope","🔬":"microscope","🧪":"test tube science","🧹":"broom clean","🧺":"basket","🚽":"toilet","🚿":"shower","🛁":"bathtub","🧼":"soap","🔑":"key","🚪":"door","🛋️":"couch","🛏️":"bed","🧳":"luggage","🛒":"shopping cart","🎁":"gift present","🎈":"balloon","🎀":"ribbon","🎊":"confetti","🎉":"party popper","✉️":"mail envelope","📩":"email","📦":"package box","📜":"scroll paper","📄":"document paper","📊":"chart graph","📈":"chart up","📉":"chart down","📅":"calendar","📌":"pin","✂️":"scissors","🖊️":"pen","📝":"memo note","🔍":"search magnify","🔒":"lock","🔓":"unlock",
    "❤️":"heart love red","🧡":"heart orange love","💛":"heart yellow love","💚":"heart green love","💙":"heart blue love","🩵":"heart light blue love","💜":"heart purple love","🤎":"heart brown love","🖤":"heart black love","🤍":"heart white love","💔":"broken heart","❤️‍🔥":"heart fire love","❤️‍🩹":"mending heart healing","💕":"two hearts love","💞":"revolving hearts love","💓":"beating heart love","💗":"growing heart love","💖":"sparkling heart love","💘":"cupid heart love","☮️":"peace","✝️":"cross christian","☪️":"islam crescent","✡️":"star david jewish","☯️":"yin yang","♈":"aries zodiac","♉":"taurus zodiac","♊":"gemini zodiac","♋":"cancer zodiac","♌":"leo zodiac","♍":"virgo zodiac","♎":"libra zodiac","♏":"scorpio zodiac","♐":"sagittarius zodiac","♑":"capricorn zodiac","♒":"aquarius zodiac","♓":"pisces zodiac","❌":"x cross no","⭕":"circle o","🛑":"stop sign","⛔":"no entry","💯":"hundred 100 perfect","❗":"exclamation","❓":"question mark","⚠️":"warning","✅":"check yes done","🎵":"music note","🎶":"music notes","➡️":"right arrow","⬅️":"left arrow","⬆️":"up arrow","⬇️":"down arrow","🔴":"red circle","🟠":"orange circle","🟡":"yellow circle","🟢":"green circle","🔵":"blue circle","🟣":"purple circle","⚫":"black circle","⚪":"white circle","⬛":"black square","⬜":"white square",
    "🏁":"checkered flag race finish","🚩":"red flag","🎌":"crossed flags japan","🏴":"black flag","🏳️":"white flag","🏳️‍🌈":"rainbow pride flag","🏳️‍⚧️":"trans transgender pride flag","🏴‍☠️":"pirate flag","🇺🇳":"un united nations flag","🇦🇺":"australia flag","🇧🇪":"belgium flag","🇧🇷":"brazil flag","🇨🇦":"canada flag","🇨🇳":"china flag","🇫🇷":"france flag","🇩🇪":"germany flag","🇬🇧":"uk britain england flag","🇺🇸":"usa america flag","🇮🇱":"israel flag","🇮🇹":"italy flag","🇯🇵":"japan flag","🇰🇷":"korea flag","🇲🇽":"mexico flag","🇳🇱":"netherlands flag","🇳🇿":"new zealand flag","🇪🇸":"spain flag","🇸🇪":"sweden flag","🇨🇭":"switzerland flag","🇺🇦":"ukraine flag","🇦🇪":"uae emirates flag","🇻🇳":"vietnam flag"
  };
  return [label,categoryAliases[label]||"",emojiAliases[emoji]||"",flagCountryName(emoji),emoji].join(" ").toLowerCase();
}
function chatEmojiPickerHtml(){
  const groups=[
    ["Smileys","😀 😃 😄 😁 😆 😅 😂 🤣 🥲 🥹 ☺️ 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 🙂‍↕️ 😏 😒 🙂‍↔️ 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😶‍🌫️ 😱 😨 😰 😥 😓 🫣 🤗 🫡 🤔 🫢 🤭 🤫 🤥 😶 😐 😑 😬 🫨 🫠 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 😵‍💫 🫥 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠"],
    ["People","👋 🤚 🖐️ ✋ 🖖 🫱 🫲 🫳 🫴 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 🫵 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦿 🦵 🦶 👂 🦻 👃 🧠 🫀 🫁 🦷 🦴 👀 👁️ 👅 👄 🫦 👶 🧒 👦 👧 🧑 👱 👨 🧔 🧔‍♂️ 🧔‍♀️ 👩 🧓 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷 🧑‍⚕️ 🧑‍🎓 🧑‍🏫 🧑‍⚖️ 🧑‍🌾 🧑‍🍳 🧑‍🔧 🧑‍🏭 🧑‍💼 🧑‍🔬 🧑‍💻 🧑‍🎤 🧑‍🎨 🧑‍✈️ 🧑‍🚀 🧑‍🚒 🥷 🕵️ 💂 👷 👑 🫅 🤴 👸 👳 👲 🧕 🤵 👰 🤰 🫃 🫄 🤱 👨‍👩‍👧 👨‍👩‍👦 👨‍👩‍👧‍👦 👨‍👩‍👦‍👦 👨‍👩‍👧‍👧 👩‍👩‍👧 👩‍👩‍👦 👩‍👩‍👧‍👦 👩‍👩‍👦‍👦 👩‍👩‍👧‍👧 👨‍👨‍👧 👨‍👨‍👦 👨‍👨‍👧‍👦 👨‍👨‍👦‍👦 👨‍👨‍👧‍👧 👩‍👧 👩‍👦 👩‍👧‍👦 👩‍👦‍👦 👩‍👧‍👧 👨‍👧 👨‍👦 👨‍👧‍👦 👨‍👦‍👦 👨‍👧‍👧 👼 🎅 🤶 🧑‍🎄 🦸 🦹 🧙 🧚 🧛 🧜 🧝 🧞 🧟 🧌 💆 💇 🚶 🧍 🧎 🏃 💃 🕺 🕴️ 👯 🧖 🧗 🤺 🏇 ⛷️ 🏂 🏌️ 🏄 🚣 🏊 ⛹️ 🏋️ 🚴 🚵 🤸 🤼 🤽 🤾 🤹 🧘 🛀 🛌"],
    ["Animals","🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐽 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🐥 🪿 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🫎 🐝 🪱 🐛 🦋 🐌 🐞 🐜 🪰 🪲 🪳 🦟 🦗 🕷️ 🕸️ 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞 🦀 🪼 🪸 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🦧 🦣 🐘 🦛 🦏 🐪 🐫 🦒 🦘 🦬 🐃 🐂 🐄 🫏 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🐩 🦮 🐕‍🦺 🐈 🐈‍⬛ 🪶 🐓 🦃 🦤 🦚 🦜 🪽 🐇 🦝 🦨 🦡 🦫 🦦 🦥 🐁 🐀 🐿️ 🦔 🐾 🐉 🐲 🌵 🎄 🌲 🌳 🌴 🪵 🌱 🌿 ☘️ 🍀 🎍 🪴 🎋 🍃 🍂 🍁 🪺 🪹 🍄 🐚 🪨 🌾 💐 🌷 🪷 🌹 🥀 🌺 🌸 🪻 🌼 🌻"],
    ["Food","🍇 🍈 🍉 🍊 🍋 🍋‍🟩 🍌 🍍 🥭 🍎 🍏 🍐 🍑 🍒 🍓 🫐 🥝 🍅 🫒 🥥 🥑 🍆 🥔 🥕 🌽 🌶️ 🫑 🥒 🥬 🥦 🧄 🧅 🥜 🫘 🌰 🫚 🫛 🍄‍🟫 🍞 🥐 🥖 🫓 🥨 🥯 🥞 🧇 🧀 🍖 🍗 🥩 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🫔 🥙 🧆 🥚 🍳 🥘 🍲 🫕 🥣 🥗 🍿 🧈 🧂 🥫 🍱 🍘 🍙 🍚 🍛 🍜 🍝 🍠 🍢 🍣 🍤 🍥 🥮 🍡 🥟 🥠 🥡 🦪 🍦 🍧 🍨 🍩 🍪 🎂 🍰 🧁 🥧 🍫 🍬 🍭 🍮 🍯 🍼 🥛 ☕ 🫖 🍵 🍶 🍾 🍷 🍸 🍹 🍺 🍻 🥂 🥃 🫗 🥤 🧋 🧃 🧉 🧊 🥢 🍽️ 🍴 🥄 🔪 🫙 🏺"],
    ["Activities","⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🛝 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🪂 🏋️ 🤼 🤸 ⛹️ 🤺 🤾 🏌️ 🏇 🧘 🏄 🏊 🤽 🚣 🧗 🚴 🚵 🏆 🥇 🥈 🥉 🏅 🎖️ 🏵️ 🎗️ 🎫 🎟️ 🎪 🤹 🎭 🩰 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🪘 🪇 🎷 🎺 🪗 🎸 🪕 🎻 🪈 🎲 ♟️ 🎯 🎳 🎮 🎰 🧩"],
    ["Travel","🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🦯 🦽 🦼 🛴 🚲 🛵 🏍️ 🛺 🛞 🚨 🚔 🚍 🚘 🚖 🚡 🚠 🚟 🚃 🚋 🚞 🚝 🚄 🚅 🚈 🚂 🚆 🚇 🚊 🚉 ✈️ 🛫 🛬 🛩️ 💺 🛰️ 🚀 🛸 🚁 🛶 ⛵ 🚤 🛥️ 🛳️ ⛴️ 🚢 🛟 ⚓ 🪝 ⛽ 🚧 🚦 🚥 🚏 🗺️ 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛲ ⛱️ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏔️ 🗻 🏕️ ⛺ 🛖 🏠 🏡 🏘️ 🏚️ 🏗️ 🏭 🏢 🏬 🏣 🏤 🏥 🏦 🏨 🏪 🏫 🏩 💒 🏛️ ⛪ 🕌 🕍 🛕 🕋 ⛩️ 🛤️ 🛣️ 🌅 🌄 🌠 🎇 🎆 🌇 🌆 🏙️ 🌃 🌌 🌉 🌁"],
    ["Objects","⌚ 📱 📲 💻 ⌨️ 🖥️ 🖨️ 🖱️ 🖲️ 🕹️ 🗜️ 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📽️ 🎞️ 📞 ☎️ 📟 📠 📺 📻 🎙️ 🎚️ 🎛️ 🧭 ⏱️ ⏲️ ⏰ 🕰️ ⌛ ⏳ 📡 🔋 🪫 🔌 💡 🔦 🕯️ 🪔 🧯 🛢️ 💸 💵 💴 💶 💷 🪙 💰 💳 🪪 💎 ⚖️ 🪜 🧰 🪛 🔧 🔨 ⚒️ 🛠️ ⛏️ 🪚 🔩 ⚙️ 🪤 🧱 ⛓️ 🧲 🔫 💣 🧨 🪓 🔪 🗡️ ⚔️ 🛡️ 🚬 ⚰️ 🪦 ⚱️ 🏺 🔮 📿 🧿 🪬 💈 ⚗️ 🔭 🔬 🕳️ 🩻 🩹 🩺 💊 💉 🩸 🧬 🦠 🧫 🧪 🌡️ 🧹 🪠 🧺 🧻 🚽 🚰 🚿 🛁 🛀 🧼 🪥 🪒 🧽 🪣 🧴 🛎️ 🔑 🗝️ 🚪 🪑 🛋️ 🛏️ 🪞 🪟 🧳 🛒 🎁 🎈 🎏 🎀 🪄 🪅 🎊 🎉 🪩 🎎 🏮 🎐 🧧 ✉️ 📩 📨 📧 💌 📥 📤 📦 🏷️ 🪧 📪 📫 📬 📭 📮 📯 📜 📃 📄 📑 🧾 📊 📈 📉 🗒️ 🗓️ 📆 📅 🗑️ 📇 🗃️ 🗳️ 🗄️ 📋 📁 📂 🗂️ 🗞️ 📰 📓 📔 📒 📕 📗 📘 📙 📚 📖 🔖 🧷 🔗 📎 🖇️ 📐 📏 🧮 📌 📍 ✂️ 🖊️ 🖋️ ✒️ 🖌️ 🖍️ 📝 ✏️ 🔍 🔎 🔏 🔐 🔒 🔓"],
    ["Symbols","❤️ 🧡 💛 💚 💙 🩵 💜 🤎 🖤 🩶 🤍 🩷 💔 ❤️‍🔥 ❤️‍🩹 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ 🔯 🕎 ☯️ ☦️ 🛐 ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ 🆔 ⚛️ 🉑 ☢️ ☣️ 📴 📳 🈶 🈚 🈸 🈺 🈷️ ✴️ 🆚 💮 🉐 ㊙️ ㊗️ 🈴 🈵 🈹 🈲 🅰️ 🅱️ 🆎 🆑 🅾️ 🆘 ❌ ⭕ 🛑 ⛔ 📛 🚫 💯 💢 ♨️ 🚷 🚯 🚳 🚱 🔞 📵 🚭 ❗ ❕ ❓ ❔ ‼️ ⁉️ 🔅 🔆 〽️ ⚠️ 🚸 🔱 ⚜️ 🔰 ♻️ ✅ 🈯 💹 ❇️ ✳️ ❎ 🌐 💠 Ⓜ️ 🌀 💤 🏧 🚾 ♿ 🅿️ 🛗 🈳 🈂️ 🛂 🛃 🛄 🛅 🚹 🚺 🚼 ⚧️ 🚻 🚮 🎦 📶 🈁 🔣 ℹ️ 🔤 🔡 🔠 🆖 🆗 🆙 🆒 🆕 🆓 0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟 🔢 #️⃣ *️⃣ ⏏️ ▶️ ⏸️ ⏯️ ⏹️ ⏺️ ⏭️ ⏮️ ⏩ ⏪ ⏫ ⏬ ◀️ 🔼 🔽 ➡️ ⬅️ ⬆️ ⬇️ ↗️ ↘️ ↙️ ↖️ ↕️ ↔️ ↪️ ↩️ ⤴️ ⤵️ 🔀 🔁 🔂 🔄 🔃 🎵 🎶 ➕ ➖ ➗ ✖️ 🟰 ♾️ 💲 💱 ™️ ©️ ®️ 〰️ ➰ ➿ 🔚 🔙 🔛 🔝 🔜 ✔️ ☑️ 🔘 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🔺 🔻 🔸 🔹 🔶 🔷 🔳 🔲 ▪️ ▫️ ◾ ◽ ◼️ ◻️ 🟥 🟧 🟨 🟩 🟦 🟪 ⬛ ⬜ 🟫"],
    ["Flags","🏁 🚩 🎌 🏴 🏳️ 🏳️‍🌈 🏳️‍⚧️ 🏴‍☠️ 🇺🇳 🇦🇨 🇦🇩 🇦🇪 🇦🇫 🇦🇬 🇦🇮 🇦🇱 🇦🇲 🇦🇴 🇦🇶 🇦🇷 🇦🇸 🇦🇹 🇦🇺 🇦🇼 🇦🇽 🇦🇿 🇧🇦 🇧🇧 🇧🇩 🇧🇪 🇧🇫 🇧🇬 🇧🇭 🇧🇮 🇧🇯 🇧🇱 🇧🇲 🇧🇳 🇧🇴 🇧🇶 🇧🇷 🇧🇸 🇧🇹 🇧🇻 🇧🇼 🇧🇾 🇧🇿 🇨🇦 🇨🇨 🇨🇩 🇨🇫 🇨🇬 🇨🇭 🇨🇮 🇨🇰 🇨🇱 🇨🇲 🇨🇳 🇨🇴 🇨🇵 🇨🇷 🇨🇺 🇨🇻 🇨🇼 🇨🇽 🇨🇾 🇨🇿 🇩🇪 🇩🇬 🇩🇯 🇩🇰 🇩🇲 🇩🇴 🇩🇿 🇪🇦 🇪🇨 🇪🇪 🇪🇬 🇪🇭 🇪🇷 🇪🇸 🇪🇹 🇪🇺 🇫🇮 🇫🇯 🇫🇰 🇫🇲 🇫🇴 🇫🇷 🇬🇦 🇬🇧 🇬🇩 🇬🇪 🇬🇫 🇬🇬 🇬🇭 🇬🇮 🇬🇱 🇬🇲 🇬🇳 🇬🇵 🇬🇶 🇬🇷 🇬🇸 🇬🇹 🇬🇺 🇬🇼 🇬🇾 🇭🇰 🇭🇲 🇭🇳 🇭🇷 🇭🇹 🇭🇺 🇮🇨 🇮🇩 🇮🇪 🇮🇱 🇮🇲 🇮🇳 🇮🇴 🇮🇶 🇮🇷 🇮🇸 🇮🇹 🇯🇪 🇯🇲 🇯🇴 🇯🇵 🇰🇪 🇰🇬 🇰🇭 🇰🇮 🇰🇲 🇰🇳 🇰🇵 🇰🇷 🇰🇼 🇰🇾 🇰🇿 🇱🇦 🇱🇧 🇱🇨 🇱🇮 🇱🇰 🇱🇷 🇱🇸 🇱🇹 🇱🇺 🇱🇻 🇱🇾 🇲🇦 🇲🇨 🇲🇩 🇲🇪 🇲🇫 🇲🇬 🇲🇭 🇲🇰 🇲🇱 🇲🇲 🇲🇳 🇲🇴 🇲🇵 🇲🇶 🇲🇷 🇲🇸 🇲🇹 🇲🇺 🇲🇻 🇲🇼 🇲🇽 🇲🇾 🇲🇿 🇳🇦 🇳🇨 🇳🇪 🇳🇫 🇳🇬 🇳🇮 🇳🇱 🇳🇴 🇳🇵 🇳🇷 🇳🇺 🇳🇿 🇴🇲 🇵🇦 🇵🇪 🇵🇫 🇵🇬 🇵🇭 🇵🇰 🇵🇱 🇵🇲 🇵🇳 🇵🇷 🇵🇸 🇵🇹 🇵🇼 🇵🇾 🇶🇦 🇷🇪 🇷🇴 🇷🇸 🇷🇺 🇷🇼 🇸🇦 🇸🇧 🇸🇨 🇸🇩 🇸🇪 🇸🇬 🇸🇭 🇸🇮 🇸🇯 🇸🇰 🇸🇱 🇸🇲 🇸🇳 🇸🇴 🇸🇷 🇸🇸 🇸🇹 🇸🇻 🇸🇽 🇸🇾 🇸🇿 🇹🇦 🇹🇨 🇹🇩 🇹🇫 🇹🇬 🇹🇭 🇹🇯 🇹🇰 🇹🇱 🇹🇲 🇹🇳 🇹🇴 🇹🇷 🇹🇹 🇹🇻 🇹🇼 🇹🇿 🇺🇦 🇺🇬 🇺🇲 🇺🇸 🇺🇾 🇺🇿 🇻🇦 🇻🇨 🇻🇪 🇻🇬 🇻🇮 🇻🇳 🇻🇺 🇼🇫 🇼🇸 🇽🇰 🇾🇪 🇾🇹 🇿🇦 🇿🇲 🇿🇼"]
  ];
  const categoryIcons={Smileys:"&#9786;&#65039;",People:"&#128075;",Animals:"&#128062;",Food:"&#127828;",Activities:"&#9917;",Travel:"&#128652;",Objects:"&#128187;",Symbols:"&#127925;",Flags:"&#127987;&#65039;"};
  const nav=groups.map(([label])=>`<button type="button" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}" onclick="scrollChatEmojiSection('${escapeJsString(label)}')">${categoryIcons[label]||"&#8226;"}</button>`).join("");
  const body=groups.map(([label,items])=>{
    const emojis=items.split(" ").filter(Boolean);
    return `<div class="chatEmojiGroup" data-emoji-group="${escapeHtml(label)}"><strong>${escapeHtml(label)}</strong>${emojis.map(emoji=>`<button type="button" data-emoji-search="${escapeHtml(chatEmojiSearchText(label,emoji))}" onclick="insertChatEmoji('${emoji}')">${emoji}</button>`).join("")}</div>`;
  }).join("");
  return `<div class="chatEmojiPicker" id="chatEmojiPicker" hidden><div class="chatEmojiTools"><div class="chatEmojiSearchField"><span aria-hidden="true">&#128269;</span><input id="chatEmojiSearch" type="search" placeholder="Search emoji" autocomplete="off" oninput="filterChatEmojiPicker(this.value)" onkeydown="if(event.key==='Enter')event.preventDefault()"></div><nav class="chatEmojiNav" aria-label="Emoji categories">${nav}</nav></div><div class="chatEmojiResults" id="chatEmojiResults">${body}<div class="chatEmojiNoResults" hidden>No emoji found</div></div></div>`;
}
function chatAvatarMarkup(person,online=false,index=0){
  const profile=typeof person==="object"&&person?person:null;
  const name=profile?String(profile.username||profile.name||profile.title||"Chat participant"):String(person||"Chat participant");
  if(profile)return `<span class="chatAvatar ${online?"online":""} hasChatPhoto">${libraryAvatarMarkup({...profile,username:name})}</span>`;
  const seed=String(name||"Muze").split("").reduce((sum,ch)=>sum+ch.charCodeAt(0),0)+index;
  const url=MUZE_AVATAR_ICONS[seed%MUZE_AVATAR_ICONS.length]||DEFAULT_AVATAR_URL;
  return `<span class="chatAvatar ${online?"online":""} hasChatPhoto"><img src="${escapeHtml(url)}" alt="${escapeHtml(name||"Chat participant")}"></span>`;
}
function chatSharedAlbumCard(album,note=""){
  const id=escapeJsString(album.id||"");
  return `<article class="chatAlbumCard">${cover(album)}<span><small>Album shared</small><strong>${escapeHtml(album.title||"Untitled album")}</strong><em>${escapeHtml(album.artist||"Unknown artist")} &middot; ${escapeHtml(album.year||"")}</em>${note?`<b>${escapeHtml(note)}</b>`:""}<span class="chatCardActions"><button onclick="openAlbumRating('${id}')">Rate Album</button><button onclick="openAlbum('${id}')">Open Album</button><button onclick="addCurrentAlbumToLibrary('${id}')">Save Album</button></span></span><i>${escapeHtml(chatScoreLabel(album))}</i></article>`;
}
function chatLibraryShareCard(library){
  const items=liveLibraryItems(library.items||[]).slice(0,3);
  const key=escapeJsString(library.id||library.device_id||"");
  const openAction=key&&!String(library.id||"").startsWith("chat-library-")?`openLibraryDetailsById('${key}')`:"navigateToView('libraries')";
  const followAction=key&&!String(library.id||"").startsWith("chat-library-")?`followLibrary('${key}')`:"navigateToView('libraries')";
  return `<article class="chatLibraryShare"><span><small>Library shared</small><strong>${escapeHtml(library.title||"Music library")}</strong><em>${items.length} highlighted albums</em><span class="chatCardActions"><button onclick="${openAction}">Open Library</button><button onclick="${followAction}">Follow Library</button></span></span><div>${items.map(item=>item.cover_url?`<img src="${escapeHtml(item.cover_url)}" alt="${escapeHtml(item.title||"Album")}">`:`<b>${escapeHtml(coverText(item))}</b>`).join("")}</div></article>`;
}
function chatMessageHtml(message){
  const body=message.type==="album"?chatSharedAlbumCard(message.album,message.note):
    message.type==="track"?`<div class="chatShareBox trackShare"><small>Song shared</small><p>${mentionTextHtml(message.body||"")}</p></div>`:
    message.type==="rating"?`<div class="chatShareBox ratingShare"><small>Rating shared</small><p>${mentionTextHtml(message.body||"")}</p><strong>${escapeHtml(message.album?.title||"Album")}</strong><span><b>&#9733;</b> ${escapeHtml(message.score||"-")}</span></div>`:
    message.type==="review"?`<div class="chatShareBox reviewShare"><small>Review shared</small><p>&ldquo;${mentionTextHtml(message.body||"")}&rdquo;</p><em>${escapeHtml(message.album?.title||"Album")}</em></div>`:
    message.type==="library"?`<div>${message.body?`<p>${mentionTextHtml(message.body)}</p>`:""}${chatLibraryShareCard(message.library)}</div>`:
    `<p>${mentionTextHtml(message.body||"")}</p>`;
  return `<article class="chatMessage ${message.side==="me"?"fromMe":"fromThem"} ${message.type==="album"?"albumMessage":""}"><div class="chatBubble">${body}<time>${escapeHtml(message.time||"")}</time></div></article>`;
}
function chatStarterStrip(active){
  const items=liveLibraryItems(active.library?.items||[]);
  const fallback=[chatAlbumByText("abbey road",0),chatAlbumByText("ok computer",2),chatAlbumByText("to pimp a butterfly",1)].filter(Boolean);
  const picks=(items.length?items:fallback).slice(0,4);
  const labels=["Recently added to their library","Recently rated 10","Recently saved","Recently reviewed"];
  return `<div class="chatStarterStrip">${labels.map((label,index)=>{
    const album=picks[index%picks.length]||{};
    return `<button onclick="${album.id?`openAlbum('${escapeJsString(album.id)}')`:"navigateToView('libraries')"}"><small>${escapeHtml(label)}</small><strong>${escapeHtml(album.title||"Share an album")}</strong><span>${escapeHtml(album.artist||"Compare libraries")}</span></button>`;
  }).join("")}</div>`;
}
function chatSharedAlbumObjects(active){
  const library=active?.library||active?.profile||{};
  const other=liveLibraryItems(library?.items||[]);
  const shared=chatStrictSharedAlbumObjects(active);
  const fallback=other.length?other:[chatAlbumByText("abbey road",0),chatAlbumByText("ok computer",1),chatAlbumByText("to pimp a butterfly",2)].filter(Boolean);
  return (shared.length?shared:fallback).slice(0,4);
}
function chatTopSharedAlbum(active){
  const shared=chatStrictSharedAlbumObjects(active);
  const source=shared.length?shared:chatSharedAlbumObjects(active);
  return [...source].sort((a,b)=>{
    const aScore=Number(chatScoreLabel(a))||0;
    const bScore=Number(chatScoreLabel(b))||0;
    return bScore-aScore;
  })[0]||null;
}
function chatSharedGenres(active){
  const library=active?.library||active?.profile||{};
  const mine=ownComparableLibraryItems();
  const mineGenres=new Set(mine.map(albumGenreLabel).filter(Boolean).map(genre=>genre.toLowerCase()));
  const otherGenres=liveLibraryItems(library?.items||[]).map(albumGenreLabel).filter(Boolean);
  const shared=otherGenres.filter(genre=>mineGenres.has(String(genre).toLowerCase()));
  const source=shared.length?shared:otherGenres;
  return [...new Set(source)].slice(0,4);
}
function chatRecentSharedActivity(active){
  const album=chatSharedAlbumObjects(active)[0];
  const title=album?.title||active?.albums?.[0]||"a record";
  const artist=album?.artist||"their library";
  if(active?.preview&&active.preview!=="No messages yet.")return active.preview;
  if(album?.title)return `${active.name} recently connected with ${title} by ${artist}.`;
  return `${active.name} has a library worth comparing before the first message.`;
}
function chatHumanMatchLine(active){
  const albums=chatSharedAlbumObjects(active).filter(album=>album?.title);
  const genres=chatSharedGenres(active);
  if(albums.length>=2)return `You both love ${albums[0].title} and ${albums[1].title}.`;
  if(albums.length===1&&genres.length)return `You both circle around ${albums[0].title} and ${genres[0]}.`;
  if(albums.length===1)return `You both have ${albums[0].title} in your music world.`;
  if(genres.length)return `You both spend time in ${genres.slice(0,2).join(" and ")}.`;
  return `${active?.name||"This listener"} could pull your taste somewhere new.`;
}
function chatRecentActivityItems(active){
  const library=active?.library||active?.profile||{};
  const items=liveLibraryItems(library?.items||[]);
  const albums=chatSharedAlbumObjects(active);
  const rated=items.find(item=>Number(item?.rating||item?.avg_rating||0)>0)||albums[0];
  const added=items[0]||albums[1]||albums[0];
  const top=chatTopSharedAlbum(active)||albums[0];
  const lines=[
    rated?.title?`Rated ${rated.title}${Number(rated?.rating||rated?.avg_rating||0)>0?` ${chatScoreLabel(rated)}`:""}.`:"",
    added?.title?`Added ${added.title} to their library.`:"",
    top?.title?`Highest overlap: ${top.title}.`:""
  ].filter(Boolean);
  return [...new Set(lines)].slice(0,3);
}
function chatRecentActivityHeader(active){
  const activity=chatRecentActivityItems(active);
  const items=(activity.length?activity:[chatRecentSharedActivity(active)]).slice(0,2);
  if(!items.length)return "";
  return `<div class="chatHeaderActivity"><span>Recent activity</span>${items.map(item=>`<em>${escapeHtml(item)}</em>`).join("")}</div>`;
}
function chatAlbumMiniCard(album){
  const title=album?.title||"Untitled";
  const artist=album?.artist||"Unknown artist";
  const score=chatScoreLabel(album);
  const open=album?.id?` onclick="openAlbum('${escapeJsString(album.id)}')"`:"";
  const image=album?.cover_url?`<img src="${escapeHtml(album.cover_url)}" alt="${escapeHtml(title)}">`:`<b>${escapeHtml(coverText(album||{title}))}</b>`;
  return `<button class="chatMatchAlbumCard" type="button"${open}>${image}<span class="chatMatchAlbumScore">&#9733; ${escapeHtml(score&&score!=="-"?score:"Muze pick")}</span><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(artist)}</small></span></button>`;
}
function chatConversationStarters(active){
  const albums=chatSharedAlbumObjects(active);
  const first=albums[0]?.title||active?.albums?.[0]||"a shared album";
  const second=albums[1]?.title||active?.albums?.[1]||"a recent discovery";
  const artist=albums[0]?.artist||active?.artists?.[0]||"this artist";
  const genres=chatSharedGenres(active);
  return [
    `What first made ${first} click for you?`,
    `Where does ${first} rank in ${artist}'s catalog?`,
    `If I like ${first}, what should I play next?`,
    genres[0]?`What is your favorite ${genres[0]} record lately?`:"Most underrated album you've heard recently?",
    `Is ${second} a grower or an instant one for you?`
  ];
}
function chatComposerPlaceholder(active){
  const albums=chatSharedAlbumObjects(active);
  const first=albums[0]?.title||active?.albums?.[0];
  const second=albums[1]?.title||active?.albums?.[1];
  if(first)return `Ask about ${first}...`;
  if(second)return `Share your thoughts on ${second}...`;
  const genre=chatSharedGenres(active)[0];
  if(genre)return `Talk ${genre} records...`;
  return "Talk music...";
}
function fillChatStarter(text){
  const input=$("#chatMessageInput");
  if(!input)return;
  input.value=text;
  input.focus();
}
function chatWhyMatched(active){
  const albums=chatSharedAlbumObjects(active);
  const genres=chatSharedGenres(active);
  const albumCards=albums.length?albums.map(chatAlbumMiniCard).join(""):`<div class="chatMatchEmptyLine">No shared albums yet. Their library can still widen yours.</div>`;
  const genreTags=genres.length?genres.map(genre=>`<span>${escapeHtml(genre)}</span>`).join(""):`<span>Discovery lane</span>`;
  return `<section class="chatWhyMatched"><div class="chatWhyBlock chatAlbumsFirst"><div class="chatWhyLabel">Albums in common</div><div class="chatMatchAlbumGrid">${albumCards}</div></div><div class="chatWhyBlock"><div class="chatWhyLabel">Shared genres</div><div class="chatMatchGenres">${genreTags}</div></div></section>`;
}
function chatTarget(){
  const panel=$("#topbarChatPanel");
  const panelContent=$("#topbarChatContent");
  return panel&&panelContent&&!panel.classList.contains("hidden")?panelContent:content;
}
function chatView(target=chatTarget()){
  const conversations=chatConversationData();
  const active=conversations.find(item=>item.id===state.chatThread)||extras.chatAdHocThreads?.[state.chatThread]||conversations[0];
  if(active&&state.chatThread!==active.id)state.chatThread=active.id;
  const activeIndex=Math.max(0,conversations.findIndex(item=>item.id===active.id));
  const activeId=escapeJsString(active.id);
  const sendDisabled=active.group||!chatParticipantId(active);
  const inputPlaceholder=sendDisabled?"Message about an album...":chatComposerPlaceholder(active);
  target.innerHTML=`<section class="muzeChatShell simpleMessengerChat"><aside class="muzeChatList"><div class="muzeChatListHead"><div><h2>Chat</h2><p>Share albums, compare libraries, discuss records.</p></div><button class="chatComposeButton" type="button" title="Start conversation">+</button></div>${conversations.map((thread,index)=>`<button class="muzeChatThread ${thread.id===active.id?"active":""} ${thread.unread?"hasUnread":""}" onclick="setChatConversation('${escapeJsString(thread.id)}')">${chatAvatarMarkup(thread.profile||(!thread.group?thread.library:null)||thread.name,thread.online,index)}<span class="muzeChatThreadCopy"><strong>${escapeHtml(thread.name)}</strong><i>${escapeHtml(chatCompatibilityText(thread.match))}</i><small>${escapeHtml(thread.preview)}</small></span><span class="chatThreadMeta"><em>${escapeHtml(thread.time)}</em>${thread.unread?`<b>${thread.unread}</b>`:""}</span></button>`).join("")}</aside><section class="muzeChatPanel"><header class="muzeChatHeader"><div class="chatProfileIdentity">${chatAvatarMarkup(active.profile||(!active.group?active.library:null)||active.name,active.online,activeIndex)}<div><h3>${escapeHtml(active.name)}</h3><p><strong>${escapeHtml(chatCompatibilityText(active.match,true))}</strong><span>${escapeHtml(chatMatchLabel(active.match))}</span></p></div></div><button class="chatCloseButton" type="button" onclick="closeChatView()" aria-label="Close chat"><span aria-hidden="true"></span></button></header>${chatConnectionContext(active)}<div class="muzeChatMessages">${active.messages.map(chatMessageHtml).join("")}</div><footer class="muzeChatComposer"><label><span class="chatInputWrap"><input id="chatMessageInput" placeholder="Message about an album..." onkeydown="if(event.key==='Enter')sendChatMessage('${activeId}')"><button class="chatEmojiButton" type="button" onclick="toggleChatEmojiPicker()" title="Open emoji picker" aria-label="Open emoji picker">🙂</button>${chatEmojiPickerHtml()}</span><button class="chatSendIconButton" type="button" onclick="sendChatMessage('${activeId}')" title="Send message" aria-label="Send message"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.8 20.2 21 12 3.8 3.8l2.5 7.2L14 12l-7.7 1-2.5 7.2Z"></path></svg></button></label></footer></section></section>`;
}
function objectValueCount(object){
  return Object.values(object||{}).reduce((total,value)=>total+(Array.isArray(value)?value.length:(value?1:0)),0);
}
function localChatSharedCount(){
  const local=chatLocalMessages();
  return Object.values(local||{}).flat().filter(message=>message?.side==="me"&&["album","library","rating","review"].includes(message?.type)).length;
}
function selfLibraryAlbumCount(){
  const username=profileLibraryUsername().toLowerCase();
  const candidates=[
    currentLibraryCard(),
    ...extras.libraries.filter(l=>l.device_id===state.deviceId||(username&&String(l.username||"").toLowerCase()===username))
  ];
  return Math.max(
    myLibraryItems().length,
    ...candidates.map(library=>Math.max(
      Number(library?.album_count||0),
      Array.isArray(library?.items)?library.items.length:0
    ))
  );
}
function fallbackSelfStats(){
  const albumCount=selfLibraryAlbumCount();
  const identity=profileStatsIdentity();
  const indexedRatings=profileSongRatingBuckets(identity).flatMap(bucket=>Object.keys(profileSongRatingIndex()[bucket]||{}));
  const songRatings=new Set([
    ...indexedRatings,
    ...Object.keys(localTrackRatings()||{}),
    ...Object.entries(extras.trackRatings||{}).flatMap(([ref,ratings])=>Object.keys(ratings||{}).map(key=>`${ref}::${key}`))
  ]).size;
  const commentsLeft=objectValueCount(localComments())+objectValueCount(localTrackComments());
  const songsShared=localChatSharedCount()+(extras.chatMessages||[]).filter(message=>String(message.sender_id||"")===String(loggedInUser()?.id||"")&&["album","library","rating","review"].includes(message.message_type)).length;
  return {albumsAdded:albumCount,albumsRated:Object.keys(state.ratingMap||{}).length,songsRated:songRatings,songsShared,commentsLeft};
}
function profileStatsIdentity(){
  const user=loggedInUser();
  const username=(savedProfileUsername()||currentUsername()||authMetadataName(user)||authEmailPrefix(user)||"").trim();
  const usernames=[...new Set([username,...usernameAliases()].map(name=>String(name||"").trim()).filter(Boolean))];
  return {userId:String(user?.id||""),deviceId:String(state.deviceId||""),username,usernames};
}
async function fetchStatRows(table,select,identity,{usernameColumn="username",includeUserId=true}={}){
  if(!db)return [];
  const batches=[];
  const fallbackSelect=String(select||"").split(",").map(part=>part.trim()).filter(part=>part&&part!=="user_id"&&part!=="avatar_url").join(",");
  const schemaError=/column|schema cache|does not exist|user_id|username|name|avatar_url/i;
  const addQuery=async queryFactory=>{
    let {data,error}=await queryFactory(select);
    if(error&&schemaError.test(error.message||"")&&fallbackSelect&&fallbackSelect!==select){
      ({data,error}=await queryFactory(fallbackSelect));
    }
    if(error){
      if(schemaError.test(error.message||""))return [];
      console.warn(`[Muze profile stats] ${table} query failed`,error.message||error);
      return [];
    }
    return data||[];
  };
  if(identity.deviceId)batches.push(addQuery(columns=>db.from(table).select(columns).eq("device_id",identity.deviceId)));
  (identity.usernames?.length?identity.usernames:[identity.username]).filter(Boolean).forEach(username=>{
    batches.push(addQuery(columns=>db.from(table).select(columns).ilike(usernameColumn,username)));
  });
  if(includeUserId&&identity.userId)batches.push(addQuery(columns=>db.from(table).select(columns).eq("user_id",identity.userId)));
  return (await Promise.all(batches)).flat();
}
function uniqueCount(rows,keyFn){
  const keys=new Set();
  (rows||[]).forEach((row,index)=>{
    const key=String(keyFn(row,index)||"").trim();
    if(key)keys.add(key);
  });
  return keys.size;
}
async function repairOwnRatingIdentity(identity=profileStatsIdentity()){
  if(!db||!identity.deviceId)return;
  const patch={};
  if(identity.username)patch.username=identity.username;
  if(identity.userId)patch.user_id=identity.userId;
  if(!Object.keys(patch).length)return;
  const updateTable=async table=>{
    let result=await db.from(table).update(patch).eq("device_id",identity.deviceId);
    if(result.error&&/column|schema cache|user_id/i.test(result.error.message||"")&&patch.user_id){
      const legacyPatch={...patch};
      delete legacyPatch.user_id;
      result=await db.from(table).update(legacyPatch).eq("device_id",identity.deviceId);
    }
    if(result.error&&!/row-level security|permission denied/i.test(result.error.message||"")){
      console.warn(`[Muze profile stats] Unable to repair ${table} identity`,result.error.message||result.error);
    }
  };
  await Promise.all([updateTable("ratings"),updateTable("track_ratings")]);
}
async function loadProfileStatsFromFunction(identity){
  const token=state.authSession?.access_token;
  if(!token||typeof fetch!=="function")return null;
  const response=await fetch("/.netlify/functions/profile-stats",{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
    body:JSON.stringify({device_id:identity.deviceId,username:identity.username,username_aliases:identity.usernames||[]})
  });
  if(!response.ok)return null;
  const data=await response.json().catch(()=>null);
  return data?.stats||null;
}
async function loadPublicProfileStats(library={}){
  const identity=profileStatsIdentity();
  const token=state.authSession?.access_token;
  if(!token||typeof fetch!=="function")return null;
  const response=await fetch("/.netlify/functions/profile-stats",{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
    body:JSON.stringify({
      device_id:identity.deviceId,
      username:identity.username,
      target_user_id:String(library.user_id||""),
      target_device_id:String(library.device_id||""),
      target_username:String(library.username||"")
    })
  });
  if(!response.ok)return null;
  const data=await response.json().catch(()=>null);
  return data?.stats||null;
}
async function loadProfileActivityFromFunction(kind){
  const identity=profileStatsIdentity();
  const token=state.authSession?.access_token;
  if(!token||typeof fetch!=="function")return null;
  const response=await fetch("/.netlify/functions/profile-stats",{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
    body:JSON.stringify({device_id:identity.deviceId,username:identity.username,username_aliases:identity.usernames||[],activity:kind})
  });
  if(!response.ok)return null;
  const data=await response.json().catch(()=>null);
  return Array.isArray(data?.activity)?data.activity:null;
}
async function loadChatSelfStats(){
  const fallback=fallbackSelfStats();
  extras.selfStats=fallback;
  const user=loggedInUser();
  if(!db||!user)return fallback;
  const identity=profileStatsIdentity();
  await repairOwnRatingIdentity(identity).catch(error=>console.warn("Unable to repair rating identity",error.message||error));
  const serverStatsPromise=loadProfileStatsFromFunction(identity).catch(error=>{
    console.warn("Unable to load private profile stats",error.message||error);
    return null;
  });
  const countRows=async query=>{
    const result=await query;
    return result.error?null:Number(result.count||0);
  };
  const [serverStats,libraryRows,albumRatingRows,trackRatingRows,albumCommentRows,trackCommentRows,albumReplyRows,songsShared]=await Promise.all([
    serverStatsPromise,
    fetchStatRows("user_libraries","id,device_id,username,user_id,album_count,items",identity,{usernameColumn:"username"}),
    fetchStatRows("ratings","id,album_id,device_id,username,user_id",identity,{usernameColumn:"username"}),
    fetchStatRows("track_ratings","id,album_ref,track_key,device_id,username,user_id",identity,{usernameColumn:"username"}),
    fetchStatRows("album_comments","id,device_id,name,user_id",identity,{usernameColumn:"name"}),
    fetchStatRows("track_comments","id,device_id,name,user_id",identity,{usernameColumn:"name"}),
    fetchStatRows("album_comment_replies","id,device_id,name,user_id",identity,{usernameColumn:"name"}),
    countRows(db.from("chat_messages").select("id",{count:"exact",head:true}).eq("sender_id",user.id).neq("message_type","text"))
  ]);
  const libraryAlbumCount=Math.max(0,...libraryRows.map(row=>Math.max(Number(row?.album_count||0),Array.isArray(row?.items)?row.items.length:0)));
  const albumsRated=uniqueCount(albumRatingRows,row=>row.album_id||row.id);
  const songsRated=uniqueCount(trackRatingRows,row=>`${row.album_ref||""}::${row.track_key||row.id||""}`);
  const commentsLeft=uniqueCount(albumCommentRows,row=>row.id)+uniqueCount(trackCommentRows,row=>row.id)+uniqueCount(albumReplyRows,row=>row.id);
  extras.selfStats={
    ...fallback,
    albumsAdded:Math.max(Number(serverStats?.albumsAdded||0),libraryAlbumCount,fallback.albumsAdded),
    albumsRated:Math.max(Number(serverStats?.albumsRated||0),albumsRated,fallback.albumsRated),
    songsRated:Math.max(Number(serverStats?.songsRated||0),songsRated,fallback.songsRated),
    songsShared:Math.max(Number(serverStats?.songsShared||0),songsShared??0,fallback.songsShared),
    commentsLeft:Math.max(Number(serverStats?.commentsLeft||0),commentsLeft,fallback.commentsLeft)
  };
  return extras.selfStats;
}
function chatSelfProfileCard(){
  const user=loggedInUser();
  const username=(savedProfileUsername()||currentUsername()||authMetadataName(user)||authEmailPrefix(user)||"Your profile").trim();
  const stats=extras.selfStats||fallbackSelfStats();
  const detail=`${Number(stats.albumsAdded||0)} album${Number(stats.albumsAdded||0)===1?"":"s"} in your library`;
  return `<button class="chatSelfProfileCard" type="button" onclick="openChatSelfProfile(event)" title="Edit your profile"><span class="chatSelfAvatar">${currentAvatarMarkup()}</span><span class="chatSelfCopy"><small>Your Muze profile</small><strong>${escapeHtml(username)}</strong><em>${escapeHtml(detail)}</em></span></button>`;
}
window.openChatSelfProfile=function(event){
  event?.preventDefault?.();
  event?.stopPropagation?.();
  closeTopbarChat();
  $("#notificationPanel")?.classList.add("hidden");
  if(!loggedInUser()){
    openAuthModal("Log in to manage your Muze profile.");
    return;
  }
  loadChatSelfStats().then(renderAccountProfileStats).catch(error=>console.warn("Unable to refresh profile stats",error));
  showAvatarSetup(Boolean(currentUsername()||savedProfileUsername()||avatarHasValue()));
}
chatView=function(target=chatTarget()){
  const conversations=chatConversationData();
  const active=conversations.find(item=>item.id===state.chatThread)||conversations[0];
  if(!active){
    target.innerHTML=`<section class="muzeChatShell simpleMessengerChat chatListOnly"><aside class="muzeChatList"><div class="muzeChatListHead"><div><h2>Chat</h2><p>Search for a Muze user to start a real conversation.</p></div><button class="chatComposeButton ${state.chatUserSearchOpen?"active":""}" type="button" title="Start conversation" onclick="toggleChatUserSearch(event)">+</button></div>${chatUserSearchHtml()}<div class="chatEmptyState">No Muze chats yet. Use + to find someone by username.</div>${chatSelfProfileCard()}</aside><section class="muzeChatPanel"></section></section>`;
    if(state.chatUserSearchOpen)requestAnimationFrame(()=>$("#chatUserSearchInput")?.focus());
    return;
  }
  if(active&&state.chatThread!==active.id)state.chatThread=active.id;
  const activeIndex=Math.max(0,conversations.findIndex(item=>item.id===active.id));
  const activeId=escapeJsString(active.id);
  const sendDisabled=active.group||!chatParticipantId(active);
  const inputPlaceholder=chatComposerPlaceholder(active);
  const threadButtons=conversations.map((thread,index)=>`<button class="muzeChatThread ${thread.id===active.id?"active":""} ${thread.unread?"hasUnread":""}" onclick="setChatConversation('${escapeJsString(thread.id)}')">${chatAvatarMarkup(thread.profile||(!thread.group?thread.library:null)||thread.name,thread.online,index)}<span class="muzeChatThreadCopy"><strong>${escapeHtml(thread.name)}</strong><i class="${chatThreadDiscoveryClass(thread,index)}">${escapeHtml(chatThreadDiscoveryLabel(thread,index))}</i><small>${escapeHtml(thread.preview)}</small></span><span class="chatThreadMeta"><em>${escapeHtml(thread.time)}</em>${thread.unread?`<b>${thread.unread}</b>`:""}</span></button>`).join("");
  const messagesHtml=active.messages.length?active.messages.map(chatMessageHtml).join(""):chatWhyMatched(active);
  target.innerHTML=`<section class="muzeChatShell simpleMessengerChat"><aside class="muzeChatList"><div class="muzeChatListHead"><div><h2>Chat</h2><p>Share albums, compare libraries, discuss records.</p></div><button class="chatComposeButton ${state.chatUserSearchOpen?"active":""}" type="button" title="Start conversation" onclick="toggleChatUserSearch(event)">+</button></div>${chatUserSearchHtml()}${threadButtons}${chatSelfProfileCard()}</aside><section class="muzeChatPanel"><header class="muzeChatHeader"><div class="chatProfileIdentity">${chatAvatarMarkup(active.profile||(!active.group?active.library:null)||active.name,active.online,activeIndex)}<div><h3>${escapeHtml(active.name)}${active.online?`<em class="chatHeaderPresence"><i></i>online</em>`:""}</h3><p><strong>${escapeHtml(chatCompatibilityText(active.match,true))}</strong><span>${escapeHtml(chatMatchLabel(active.match))}</span></p></div></div><button class="chatCloseButton" type="button" onclick="closeChatView()" aria-label="Close chat"><span aria-hidden="true"></span></button></header>${chatConnectionContext(active)}<div class="muzeChatMessages ${active.messages.length?"":"hasWhyMatched"}">${messagesHtml}</div><footer class="muzeChatComposer"><label><span class="chatInputWrap"><input id="chatMessageInput" placeholder="${escapeHtml(inputPlaceholder)}" onkeydown="if(event.key==='Enter')sendChatMessage('${activeId}')"><button class="chatEmojiButton" type="button" onclick="toggleChatEmojiPicker()" title="Open emoji picker" aria-label="Open emoji picker">&#128578;</button>${chatEmojiPickerHtml()}</span><button class="chatSendIconButton" type="button" onclick="sendChatMessage('${activeId}')" title="Send message" aria-label="Send message"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.8 20.2 21 12 3.8 3.8l2.5 7.2L14 12l-7.7 1-2.5 7.2Z"></path></svg></button></label></footer></section></section>`;
  if(state.chatUserSearchOpen)requestAnimationFrame(()=>$("#chatUserSearchInput")?.focus());
  bindMobileChatInputViewport();
  if(active)markChatThreadRead(active);
}
window.toggleChatUserSearch=async function(event){
  event?.preventDefault?.();
  event?.stopPropagation?.();
  state.chatUserSearchOpen=!state.chatUserSearchOpen;
  if(state.chatUserSearchOpen){
    state.chatUserSearchQuery=state.chatUserSearchQuery||"";
    try{await loadProfileDirectory()}catch(error){console.warn("Unable to refresh Muze users",error)}
  }
  chatView();
}
window.setChatUserSearch=function(value){
  state.chatUserSearchQuery=String(value||"");
  chatView();
}
window.selectFirstChatSearchResult=function(){
  const first=chatSearchProfiles(state.chatUserSearchQuery)[0];
  if(first)window.startChatWithUser(chatThreadIdForProfile(first,0));
}
window.startChatWithUser=function(id){
  const thread=chatConversationData().find(item=>item.id===id);
  if(thread)extras.chatAdHocThreads[id]=thread;
  state.chatUserSearchOpen=false;
  state.chatUserSearchQuery="";
  window.setChatConversation(id);
}
window.setChatConversation=async function(id){
  state.chatThread=id;
  if(db&&loggedInUser())await loadChatMessages().catch(error=>console.warn("Unable to refresh chat messages",error));
  chatView();
  requestAnimationFrame(()=>{
    const content=$("#topbarChatPanel:not(.hidden) #topbarChatContent");
    const isMobile=window.matchMedia?.("(max-width: 650px)")?.matches;
    if(content&&isMobile){
      content.classList.add("mobileChatConversationOpen");
      content.scrollTop=0;
      content.querySelector(".muzeChatMessages")?.scrollTo?.({top:0,behavior:"auto"});
    }
  });
}
window.closeChatView=function(){
  const panel=$("#topbarChatPanel");
  if(panel&&!panel.classList.contains("hidden")){
    const content=$("#topbarChatContent");
    if(content?.classList.contains("mobileChatConversationOpen")){
      panel.classList.remove("keyboardOpen");
      content.classList.remove("mobileChatConversationOpen");
      content.scrollTop=0;
      return;
    }
    panel.classList.remove("keyboardOpen");
    closeTopbarChat();
    return;
  }
  state.view="rankings";
  document.querySelectorAll(".tab,.navItem[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view==="rankings"));
  render();
  window.scrollTo({top:0,behavior:"smooth"});
}
window.sendChatMessage=async function(threadId){
  const input=document.getElementById("chatMessageInput");
  const body=String(input?.value||"").trim();
  if(!body)return;
  const key=String(threadId||state.chatThread||"");
  let active=chatConversationData().find(thread=>thread.id===key)||extras.chatAdHocThreads?.[key]||null;
  if(!active&&db){
    await loadProfileDirectory().catch(error=>console.warn("Unable to refresh Muze users",error));
    active=chatConversationData().find(thread=>thread.id===key)||extras.chatAdHocThreads?.[key]||null;
  }
  const recipientId=await resolveChatRecipientId(active);
  if(!recipientId){
    const label=active?.name||active?.profile?.username||active?.library?.username||"that user";
    alert(`I still can't find a Muze account for "${label}". Ask them to open Muze once and save their username in profile, then use + search and select them again.`);
    return;
  }
  if(!requireAuth("message",()=>window.sendChatMessage(threadId)))return;
  const stableKey=chatStableThreadId(active)||key;
  active.id=stableKey;
  active.recipient_user_id=recipientId;
  extras.chatAdHocThreads[stableKey]=active;
  if(key&&key!==stableKey)extras.chatAdHocThreads[key]=active;
  if(input)input.disabled=true;
  if(db&&loggedInUser()){
    const row={sender_id:loggedInUser().id,recipient_id:recipientId,body,message_type:"text"};
    const {data,error}=await db.from("chat_messages").insert(row).select("id,sender_id,recipient_id,body,message_type,created_at,read_at").single();
    if(error){
      console.warn("Chat message insert failed",error.message||error);
      if(chatSchemaUnavailable(error))alert("Real messaging needs the chat_messages SQL added in Supabase first.");
      else if(/foreign key.*recipient|recipient_id.*fkey/i.test(error.message||""))alert("This chat is still linked to an old non-account id. Use + search, select the exact Muze username again, then send.");
      else if(/row-level security|violates row-level security|permission denied/i.test(error.message||""))alert("Supabase blocked this message with chat row security. Log out and back in, then try again. If it still fails, rerun the chat_messages policies SQL.");
      else alert(error.message||"Message could not be sent.");
      if(input)input.disabled=false;
      return;
    }
    extras.chatSchemaReady=true;
    extras.chatMessages=[...(extras.chatMessages||[]),data];
    await createMentionNotifications(body,{entity_type:"chat_message",entity_id:data?.id||null,body:`${currentUsername()||"Someone"} mentioned you in chat.`});
  }else{
    alert("Real messaging needs Supabase to be connected.");
    if(input)input.disabled=false;
    return;
  }
  if(input)input.value="";
  const picker=document.getElementById("chatEmojiPicker");
  if(picker)picker.hidden=true;
  state.chatThread=stableKey;
  chatView();
}
window.toggleChatEmojiPicker=function(){
  const input=document.getElementById("chatMessageInput");
  const isMobile=window.matchMedia?.("(max-width: 650px)")?.matches||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent||"");
  if(isMobile){
    const picker=document.getElementById("chatEmojiPicker");
    if(picker)picker.hidden=true;
    input?.focus();
    return;
  }
  const picker=document.getElementById("chatEmojiPicker");
  if(!picker)return;
  picker.hidden=!picker.hidden;
  if(!picker.hidden){
    document.getElementById("chatEmojiSearch")?.focus();
  }else{
    input?.focus();
  }
}
window.insertChatEmoji=function(emoji){
  const input=document.getElementById("chatMessageInput");
  if(!input)return;
  const start=input.selectionStart??input.value.length;
  const end=input.selectionEnd??input.value.length;
  input.value=input.value.slice(0,start)+emoji+input.value.slice(end);
  const next=start+emoji.length;
  input.focus();
  input.setSelectionRange(next,next);
}
window.filterChatEmojiPicker=function(value){
  const picker=document.getElementById("chatEmojiPicker");
  if(!picker)return;
  const query=String(value||"").trim().toLowerCase();
  const searchAliases={happy:["happy","smile","joy","glad","cheerful"],sad:["sad","cry","tear","frown","unhappy"],angry:["angry","mad","rage","annoyed"],hamburger:["hamburger","burger"],soccer:["soccer","football"],egg:["egg"],laugh:["laugh","lol","funny"],heart:["heart","love"],king:["king","royal","crown"],queen:["queen","royal","crown"],crown:["crown","king","queen","royal"],royal:["royal","king","queen","crown"],family:["family","parents","children","mother","father"]};
  const termGroups=query.split(/\s+/).filter(Boolean).map(term=>searchAliases[term]||[term]);
  let visibleCount=0;
  picker.querySelectorAll(".chatEmojiGroup").forEach(group=>{
    let groupVisible=0;
    group.querySelectorAll("button[data-emoji-search]").forEach(button=>{
      const label=String(group.dataset.emojiGroup||"");
      const emoji=String(button.textContent||"").trim();
      const searchText=String(button.dataset.emojiSearch||chatEmojiSearchText(label,emoji)||"").toLowerCase();
      const match=!termGroups.length||termGroups.every(aliases=>aliases.some(term=>searchText.includes(term)));
      button.hidden=!match;
      if(match){groupVisible++;visibleCount++}
    });
    group.hidden=groupVisible===0;
  });
  const empty=picker.querySelector(".chatEmojiNoResults");
  if(empty)empty.hidden=visibleCount>0;
}
window.scrollChatEmojiSection=function(label){
  const picker=document.getElementById("chatEmojiPicker");
  const group=[...document.querySelectorAll("#chatEmojiPicker .chatEmojiGroup")].find(item=>item.dataset.emojiGroup===label);
  if(!picker||!group)return;
  const search=picker.querySelector("#chatEmojiSearch");
  if(search&&search.value){search.value="";filterChatEmojiPicker("")}
  const tools=picker.querySelector(".chatEmojiTools");
  const headerOffset=(tools?.offsetHeight||0)+4;
  requestAnimationFrame(()=>{
    picker.scrollTo({top:Math.max(0,group.offsetTop-headerOffset),behavior:"smooth"});
  });
}
window.setLibrarySearch=function(value){state.librarySearch=value;librariesView()}
function scrollToHomepageAlbums(){
  requestAnimationFrame(()=>{
    const target=document.querySelector(".tabs")||document.querySelector("#content .sectionTitle")||content;
    if(!target)return;
    const top=target.getBoundingClientRect().top+window.scrollY-22;
    window.scrollTo({top:Math.max(0,top),behavior:"smooth"});
  });
}
window.findMoreLibraryAlbums=function(){
  state.view="rankings";
  state.search="";
  state.genre="All";
  state.sort="score";
  document.querySelectorAll(".tab,.navItem[data-view]").forEach(button=>button.classList.toggle("active",button.dataset.view==="rankings"));
  render();
  closeNav();
  scrollToHomepageAlbums();
}
window.openAlbumOverviewFilter=function(type,value){
  const clean=String(value||"").trim();
  if(!clean)return;
  state.view="rankings";
  state.sort="score";
  if(type==="genre"){
    state.genre=clean;
    state.search="";
  }else{
    state.genre="All";
    state.search=clean;
  }
  const searchInput=$("#searchInput");
  const genreFilter=$("#genreFilter");
  if(searchInput)searchInput.value=state.search;
  if(genreFilter)genreFilter.value=state.genre;
  $("#albumModal")?.classList.add("hidden");
  $("#albumOverviewPopup")?.classList.add("hidden");
  $("#albumInfoPopup")?.classList.add("hidden");
  document.querySelectorAll(".tab,.navItem[data-view]").forEach(button=>button.classList.toggle("active",button.dataset.view==="rankings"));
  render();
  window.scrollTo({top:0,behavior:"smooth"});
}
function genres(){return["All",...new Set([...state.albums.map(albumGenreLabel).filter(Boolean),"Classical","Soundtracks","International"])]}
function filtered(){let a=state.albums.filter(x=>{let q=state.search.toLowerCase();const label=albumGenreLabel(x);const genreOk=state.genre==="All"?label!=="Greatest hits":label===state.genre;return genreOk&&(`${x.title} ${x.artist} ${x.year||""} ${genreSearchText(x)}`.toLowerCase().includes(q))});if(state.sort==="score")a.sort((x,y)=>score(y)-score(x));if(state.sort==="year")a.sort((x,y)=>(y.year||0)-(x.year||0));if(state.sort==="ratings")a.sort((x,y)=>count(y)-count(x));if(state.sort==="hidden")a.sort((x,y)=>count(x)-count(y));return a}
function scheduleHomeSearchRender(){
  clearTimeout(homeSearchRenderTimer);
  homeSearchRenderTimer=setTimeout(()=>{homeSearchRenderTimer=0;state.homeAlbumLimit=120;render()},120);
}
function card(a){const genreLabel=albumGenreLabel(a);const adminDelete=isAdminUnlocked()?`<button class="adminAlbumDeleteBtn" onclick="event.stopPropagation();deleteAlbumAdmin('${escapeJsString(a.id)}')" aria-label="Delete ${escapeHtml(a.title)}">Delete</button>`:"";return`<article class="card albumCard" onclick="openAlbum('${escapeJsString(a.id)}')">${cover(a)}<button class="quickLibraryAdd" onclick="event.stopPropagation();addCurrentAlbumToLibrary('${escapeJsString(a.id)}')">+ Add to my library</button>${adminDelete}<div class="cardBody"><div class="row"><div><div class="title">${escapeHtml(a.title)}</div><div class="artist">${escapeHtml(a.artist)} - ${escapeHtml(a.year||"")}</div></div><div class="score">${displayScore(a)}</div></div><span class="pill">${escapeHtml(genreLabel)}</span></div></article>`}
function row(a,i){const genreLabel=albumGenreLabel(a);return`<div class="listRow" onclick="openAlbum('${escapeJsString(a.id)}')"><div class="rank">#${i+1}</div>${listCover(a)}<div><strong>${escapeHtml(a.title)}</strong><div class="artist">${escapeHtml(a.artist)} - ${escapeHtml(genreLabel)} - ${count(a).toLocaleString()} ratings</div></div><div class="miniScore">${displayScore(a)}</div></div>`}
function render(){
if(!state.dataReady){$("#heroScore").textContent="-";$("#heroTitle").textContent="Loading current rankings...";const heroCard=$("#heroCard");if(heroCard){heroCard.style.removeProperty("--hero-cover");heroCard.removeAttribute("onclick");heroCard.removeAttribute("role");heroCard.removeAttribute("tabindex");heroCard.removeAttribute("aria-label");heroCard.onkeydown=null}content.innerHTML='<div class="empty">Loading current album rankings...</div>';return}
let arr=[];if(state.view==="rankings"){arr=filtered();let top=state.albums.slice().sort((a,b)=>score(b)-score(a))[0];if(top){$("#heroScore").textContent=displayScore(top);$("#heroTitle").textContent=top.title;const heroCard=$("#heroCard");if(heroCard){heroCard.setAttribute("onclick",`openAlbum('${escapeJsString(top.id)}')`);heroCard.setAttribute("role","button");heroCard.setAttribute("tabindex","0");heroCard.setAttribute("aria-label",`Open ${top.title||"top-rated album"} album details`);heroCard.onkeydown=event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();openAlbum(top.id)}};if(top.cover_url){heroCard.style.setProperty("--hero-cover",`url("${top.cover_url}")`)}else{heroCard.style.removeProperty("--hero-cover")}}}$("#genreFilter").innerHTML=genres().map(g=>`<option value="${escapeHtml(g)}" ${g===state.genre?"selected":""}>${escapeHtml(g==="All"?"All genres":g)}</option>`).join("")}
if(state.view==="rankings"){
  const limit=Math.max(60,Number(state.homeAlbumLimit)||120);
  const visible=arr.slice(0,limit);
  const more=visible.length<arr.length?`<div class="albumBatchMore"><button onclick="showMoreAlbums()">See more</button>${isAdminUnlocked()?`<span>${visible.length.toLocaleString()} of ${arr.length.toLocaleString()}</span>`:""}</div>`:"";
  const resultCount=isAdminUnlocked()?`<span class="muted">${arr.length} results</span>`:"";
  content.innerHTML=state.sort==="hidden"?`<div class="sectionTitle"><h2>Hidden Gems</h2></div><div class="empty">Coming soon</div>`:`<div class="sectionTitle"><h2>Top Albums</h2>${resultCount}</div><div class="grid">${visible.map(card).join("")}</div>${more}`;
}
if(state.view==="discover"){content.innerHTML=`<div class="sectionTitle"><h2>Hidden Gems</h2></div><div class="empty">Coming soon</div>`}
if(state.view==="artists"){content.innerHTML=artistPage(true);setTimeout(()=>renderArtistResults({chunked:true}),25)}
if(state.view==="artist-profile"){content.innerHTML=artistProfilePage()}
if(state.view==="myratings"){let rated=state.albums.filter(a=>userScore(a));content.innerHTML=rated.length?`<div class="sectionTitle"><h2>My Ratings</h2></div><div class="list">${rated.map(row).join("")}</div>`:`<div class="empty">You haven't rated anything yet.</div>`}
if(state.view==="libraries"){librariesView()}
if(state.view==="chat"){chatView(content)}
document.body.classList.toggle("chatView",state.view==="chat");
document.body.classList.toggle("artistProfileView",state.view==="artist-profile");
if(state.view==="artist-profile")requestAnimationFrame(syncMobileArtistBiography);
const chatPanel=$("#topbarChatPanel");
const chatOpen=state.view==="chat"||(chatPanel&&!chatPanel.classList.contains("hidden"));
const chatButton=$("#topbarChatButton");if(chatButton){chatButton.classList.toggle("active",chatOpen);chatButton.setAttribute("aria-expanded",chatOpen?"true":"false")}
}
window.showMoreAlbums=function(){state.homeAlbumLimit=(Number(state.homeAlbumLimit)||120)+120;render()}
function artistScoreLabel(albums){const rated=albums.filter(a=>score(a)>0);if(!rated.length)return "";return (rated.reduce((sum,a)=>sum+score(a),0)/rated.length).toFixed(1)}
const albumSceneImages=[
  {match:["thriller","michael jackson"],hero:"https://commons.wikimedia.org/wiki/Special:FilePath/Michael_Jackson_with_Grammy_Awards_in_1984.jpg",moment:"https://commons.wikimedia.org/wiki/Special:FilePath/Michael_Jackson_with_Grammy_Awards_in_1984.jpg",focus:"50% 24%"},
  {match:["off the wall","michael jackson"],hero:"https://commons.wikimedia.org/wiki/Special:FilePath/Michael_Jackson_with_Grammy_Awards_in_1984.jpg",moment:"https://commons.wikimedia.org/wiki/Special:FilePath/Michael_Jackson_with_Grammy_Awards_in_1984.jpg",focus:"50% 24%"},
  {match:["abbey road","beatles"],hero:"https://commons.wikimedia.org/wiki/Special:FilePath/Abbey_Road_Zebra.jpg",moment:"https://commons.wikimedia.org/wiki/Special:FilePath/Abbey_Road_Zebra.jpg",focus:"50% 48%"},
  {match:["nevermind","nirvana"],hero:"https://commons.wikimedia.org/wiki/Special:FilePath/Nirvana_around_1992.jpg",moment:"https://commons.wikimedia.org/wiki/Special:FilePath/Nirvana_around_1992.jpg",focus:"50% 34%"},
  {match:["ok computer","radiohead"],hero:"https://commons.wikimedia.org/wiki/Special:FilePath/Radiohead.jpg",moment:"https://commons.wikimedia.org/wiki/Special:FilePath/Radiohead.jpg",focus:"50% 34%"},
  {match:["illmatic","nas"],hero:"https://commons.wikimedia.org/wiki/Special:FilePath/Nas-04.jpg",moment:"https://commons.wikimedia.org/wiki/Special:FilePath/Nas-04.jpg",focus:"50% 30%"},
  {match:["rumours","fleetwood mac"],hero:"https://commons.wikimedia.org/wiki/Special:FilePath/Fleetwood_Mac_Billboard_1977.jpg",moment:"https://commons.wikimedia.org/wiki/Special:FilePath/Fleetwood_Mac_Billboard_1977.jpg",focus:"50% 34%"},
  {match:["purple rain","prince"],hero:"https://commons.wikimedia.org/wiki/Special:FilePath/Prince_at_Coachella_001.jpg",moment:"https://commons.wikimedia.org/wiki/Special:FilePath/Prince_at_Coachella_001.jpg",focus:"50% 30%"},
  {match:["like a rolling stone","bob dylan"],hero:"https://commons.wikimedia.org/wiki/Special:FilePath/Bob_Dylan_-_Azkena_Rock_Festival_2010_2.jpg",moment:"https://commons.wikimedia.org/wiki/Special:FilePath/Bob_Dylan_-_Azkena_Rock_Festival_2010_2.jpg",focus:"50% 31%"}
];
function albumSceneMatch(album){
  const text=`${album.title||""} ${album.artist||""}`.toLowerCase();
  return albumSceneImages.find(item=>item.match.every(part=>text.includes(part)));
}
function albumHeroSceneImage(album){
  const saved=albumOverviewRow(album);
  return saved.hero_image||albumSceneMatch(album)?.hero||album.cover_url||"";
}
function albumMomentImage(album){
  const saved=albumOverviewRow(album);
  return saved.moment_image||albumSceneMatch(album)?.moment||album.cover_url||"";
}
function albumMomentFocus(album){
  const matched=albumSceneMatch(album);
  if(matched?.focus)return matched.focus;
  const text=`${album.title||""} ${album.artist||""}`.toLowerCase();
  if(text.includes("thriller")||text.includes("off the wall")||text.includes("michael jackson"))return "50% 24%";
  if(text.includes("nevermind")||text.includes("nirvana"))return "50% 34%";
  if(text.includes("abbey road")||text.includes("beatles"))return "50% 48%";
  if(text.includes("illmatic")||text.includes("nas"))return "50% 30%";
  if(text.includes("to pimp a butterfly")||text.includes("kendrick"))return "50% 38%";
  if(text.includes("jim croce")||text.includes("photographs"))return "50% 28%";
  if(text.includes("bob dylan")||text.includes("rolling stone"))return "50% 31%";
  return "50% 33%";
}
function albumAmbientStyleVars(album){
  const text=`${album.title||""} ${album.artist||""} ${albumGenreLabel(album)}`.toLowerCase();
  let tint={rgb:"255,190,48",soft:"255,217,128",strength:.10};
  if(text.includes("nevermind")||text.includes("nirvana")){
    tint={rgb:"78,178,218",soft:"132,214,238",strength:.105};
  }else if(text.includes("thriller")||text.includes("michael jackson")){
    tint={rgb:"255,187,54",soft:"255,222,132",strength:.12};
  }else if(text.includes("abbey road")||text.includes("beatles")){
    tint={rgb:"226,163,82",soft:"255,219,148",strength:.11};
  }else if(text.includes("metal")||text.includes("metallica")||text.includes("master of puppets")||text.includes("type o negative")){
    tint={rgb:"88,150,230",soft:"145,190,255",strength:.105};
  }else if(text.includes("radiohead")||text.includes("ok computer")){
    tint={rgb:"104,154,190",soft:"162,196,218",strength:.095};
  }else if(text.includes("hip-hop")||text.includes("rap")||text.includes("nas")||text.includes("kendrick")){
    tint={rgb:"214,154,64",soft:"255,210,126",strength:.095};
  }else if(text.includes("soul")||text.includes("jazz")||text.includes("stevie")){
    tint={rgb:"226,174,88",soft:"255,226,150",strength:.105};
  }
  return `;--album-ambient-rgb:${tint.rgb};--album-ambient-soft-rgb:${tint.soft};--album-ambient-strength:${tint.strength}`;
}
function albumVibeTags(album){
  const text=`${album.title||""} ${album.artist||""} ${albumGenreLabel(album)}`.toLowerCase();
  if(text.includes("radiohead")||text.includes("ok computer"))return ["anxious","cinematic","late-night","alienated"];
  if(text.includes("nirvana")||text.includes("nevermind"))return ["explosive","raw","restless","anthemic"];
  if(text.includes("beatles")||text.includes("abbey"))return ["timeless","melodic","warm","iconic"];
  if(text.includes("nas")||text.includes("illmatic"))return ["streetwise","cinematic","focused","classic"];
  if(text.includes("hip-hop")||text.includes("rap"))return ["rhythmic","confident","lyrical","urgent"];
  if(text.includes("rock")||text.includes("alternative"))return ["guitar-led","restless","charged","replayable"];
  if(text.includes("soul")||text.includes("jazz"))return ["soulful","warm","fluid","immersive"];
  return ["immersive","personal","replayable","talked-about"];
}
function albumHeroLine(album){
  const text=`${album.title||""} ${album.artist||""} ${albumGenreLabel(album)}`.toLowerCase();
  const lines=[
    [/nirvana|nevermind/,"The album that dragged alternative rock into the mainstream."],
    [/abbey road|the beatles/,"A golden final stretch of melody, warmth, and farewell."],
    [/thriller|michael jackson/,"Pop music turned into cinema, spectacle, and pure electricity."],
    [/ok computer|radiohead/,"Modern anxiety made strangely beautiful."],
    [/illmatic|nas/,"Queensbridge rendered with pressure, poetry, and cinematic focus."],
    [/to pimp a butterfly|kendrick/,"A fearless conversation with history, identity, and survival."],
    [/rumours|fleetwood mac/,"Heartbreak polished into perfect pop tension."],
    [/wish you were here|pink floyd/,"Absence, distance, and longing stretched into glowing space."],
    [/smash|offspring/,"Fast, bratty hooks built for volume, release, and restless energy."],
    [/october rust|type o negative/,"Gothic romance turned slow, heavy, and strangely beautiful."],
    [/life after death|notorious|biggie/,"A cinematic statement of legacy, ambition, and survival."],
    [/blonde|frank ocean/,"Memory, distance, and heartbreak broken into soft light."],
    [/purple rain|prince/,"Desire, drama, and guitar fire made larger than life."],
    [/dark side of the moon|pink floyd/,"A patient orbit through pressure, time, and human fragility."]
  ];
  const found=lines.find(([pattern])=>pattern.test(text));
  if(found)return found[1];
  if(text.includes("hip-hop")||text.includes("rap"))return "Voice, rhythm, and perspective turned into a world.";
  if(text.includes("rock")||text.includes("alternative"))return "Guitars, memory, and momentum with its own emotional weather.";
  if(text.includes("soul"))return "Warmth, groove, and feeling that stays in the room.";
  if(text.includes("jazz"))return "Movement, restraint, and improvisation with a human pulse.";
  return "A record with its own mood, pressure, and emotional shape.";
}function albumReturnHeadline(album){
  const text=`${album.title||""} ${album.artist||""}`.toLowerCase();
  if(text.includes("nevermind")||text.includes("nirvana"))return "Every listen still feels like impact.";
  if(text.includes("abbey road")||text.includes("beatles"))return "Every listen finds another melody.";
  if(text.includes("thriller")||text.includes("michael jackson"))return "Every listen feels like spectacle.";
  if(text.includes("ok computer")||text.includes("radiohead"))return "Every listen catches another warning.";
  if(text.includes("illmatic")||text.includes("nas"))return "Every listen sharpens the city.";
  return "Every listen feels like a new discovery.";
}
function albumReturnBody(album){
  const text=`${album.title||""} ${album.artist||""} ${albumGenreLabel(album)}`.toLowerCase();
  if(text.includes("nevermind")||text.includes("nirvana"))return "The tension is immediate, the hooks are wounded, and the whole record still sounds like it is breaking through the room.";
  if(text.includes("abbey road")||text.includes("beatles"))return "The production is polished, the melodies are generous, and each replay reveals another small piece of warmth.";
  if(text.includes("thriller")||text.includes("michael jackson"))return "The production is cinematic, the hooks are physical, and every track feels designed for shared memory.";
  if(text.includes("ok computer")||text.includes("radiohead"))return "The atmosphere is anxious and beautiful, full of tiny details that reward late-night listening.";
  if(text.includes("illmatic")||text.includes("nas"))return "The writing is focused, the world is vivid, and every bar feels cut from lived experience.";
  if(text.includes("rock")||text.includes("alternative"))return "The energy is immediate, the atmosphere has weight, and the songs keep opening up on repeat plays.";
  if(text.includes("hip-hop")||text.includes("rap"))return "The voice leads, the rhythm holds, and the best lines stay with listeners long after the record ends.";
  return "The album carries a distinct atmosphere, giving listeners room to replay, debate, and make it personal.";
}
function renderListenerCards(comments,albumId=extras.currentAlbumId||""){
  const host=$("#listenerCardsList");
  if(!host)return;
  const visible=(comments||[]).slice(0,3);
  const ref=albumRef(albumId);
  host.innerHTML=visible.length?visible.map((c,i)=>{
    const rawName=reactionDisplayName(c);
    const name=escapeHtml(rawName);
    const commentId=String(c.id||c.local_id||`${ref}-${i}`);
    const safeId=domSafeId(commentId);
    const avatar=avatarMarkupForAuthor(c,rawName,"listenerCardAvatar");
    const songLabel=c.reaction_type==="song_comment"?(c.track_name||c.track_key||"Song"):"";
    const songMeta=songLabel?`<small class="listenerSongLabel">${escapeHtml(songLabel)}</small>`:"";
    return `<article class="listenerCard">${avatar}<div><strong>${name}</strong><span>${timeAgo(c.created_at)}</span></div>${songMeta}<p>${mentionTextHtml(c.comment||c.text||"")}</p><div class="listenerCardActions">${reactionLikeButton(albumId,c,"listenerLikeButton")}<button type="button" class="listenerReplyButton" onclick="openListenerCardReply('${escapeJsString(albumId)}','${escapeJsString(commentId)}','${escapeJsString(rawName)}')">Reply</button></div><div id="listenerReplyBox-${safeId}" class="listenerReplyBox hidden"><textarea maxlength="300" placeholder="Reply to ${name}..."></textarea><div><button type="button" onclick="submitListenerCardReply('${escapeJsString(albumId)}','${escapeJsString(commentId)}')">Reply</button><button type="button" onclick="closeListenerCardReply('${escapeJsString(commentId)}')">Cancel</button></div></div></article>`;
  }).join(""):`<div class="listenerCard empty">No listener reactions yet.</div>`;
}function albumHeroPullQuotes(album){
  const text=`${album.title||""} ${album.artist||""} ${albumGenreLabel(album)}`.toLowerCase();
  if(text.includes("nirvana")||text.includes("nevermind"))return ["Still sounds dangerous","Raw feeling, no polish","A generation breaking open"];
  if(text.includes("abbey road")||text.includes("beatles"))return ["Melody that keeps returning","Warmth, farewell, legacy","A record people live with"];
  if(text.includes("thriller")||text.includes("michael jackson"))return ["Pop as pure spectacle","Every hook lands","The room changes when it plays"];
  if(text.includes("radiohead")||text.includes("ok computer"))return ["Beautiful machine anxiety","Best after midnight","Tension in every detail"];
  if(text.includes("illmatic")||text.includes("nas"))return ["Street cinema in miniature","Every bar feels carved","Queensbridge in sharp focus"];
  if(text.includes("hip-hop")||text.includes("rap"))return ["Lines people quote back","Voice first, world second","Stories with pressure"];
  if(text.includes("rock")||text.includes("alternative"))return ["Guitars with weather","Loud feelings, lasting hooks","Built for replay"];
  return ["Listeners keep returning","A mood you can step into","Taste forming in real time"];
}
function albumHeroCenterpiece(album){
  const text=`${album.title||""} ${album.artist||""} ${albumGenreLabel(album)}`.toLowerCase();
  if(text.includes("nirvana")||text.includes("nevermind"))return "Why people return: the songs still feel unstable, immediate, and alive, like every chorus is pushing against the walls.";
  if(text.includes("abbey road")||text.includes("beatles"))return "Why people return: the melodies feel effortless, but the emotion keeps unfolding with every replay.";
  if(text.includes("thriller")||text.includes("michael jackson"))return "Why people return: every track feels engineered for movement, memory, and shared electricity.";
  if(text.includes("radiohead")||text.includes("ok computer"))return "Why people return: it turns dread, distance, and modern noise into something strangely beautiful.";
  if(text.includes("illmatic")||text.includes("nas"))return "Why people return: it captures a place, a pressure, and a voice with almost impossible focus.";
  if(text.includes("hip-hop")||text.includes("rap"))return "Why people return: the perspective stays sharp, the rhythm keeps moving, and the best lines linger.";
  if(text.includes("rock")||text.includes("alternative"))return "Why people return: the energy is immediate, but the feeling underneath keeps changing shape.";
  return "Why people return: this record leaves a distinct emotional trace, giving listeners something to replay, argue for, and make their own.";
}function albumCommunityPull(album){
  const text=`${album.title||""} ${album.artist||""} ${albumGenreLabel(album)}`.toLowerCase();
  if(text.includes("radiohead")||text.includes("ok computer"))return "92% say this album sounds better after midnight.";
  if(text.includes("nirvana")||text.includes("nevermind"))return "Most listeners come back for the moments that still feel volatile.";
  if(text.includes("beatles")||text.includes("abbey"))return "Frequently replayed when listeners want melody, warmth, and legacy.";
  if(text.includes("nas")||text.includes("illmatic"))return "Fans keep returning to the verses that feel carved into the city.";
  if(text.includes("hip-hop")||text.includes("rap"))return "Most replayed moments are the lines people quote back.";
  if(text.includes("soul")||text.includes("jazz"))return "Listeners are drawn to the human details between the grooves.";
  return "This album is becoming a small meeting place for strong opinions.";
}
function albumReactionWhispers(album){
  const text=`${album.title||""} ${album.artist||""} ${albumGenreLabel(album)}`.toLowerCase();
  if(text.includes("radiohead"))return ["?That tension never lets go?","?Best after midnight?","?Every detail matters?"];
  if(text.includes("nirvana"))return ["?Still sounds dangerous?","?That chorus detonates?","?Pure catharsis?"];
  if(text.includes("beatles"))return ["?The melodies keep giving?","?Timeless for a reason?","?Warm from front to back?"];
  if(text.includes("hip-hop")||text.includes("rap"))return ["?Every bar lands?","?The storytelling is unreal?","?Still quote this one?"];
  return ["?That transition destroyed me?","?Gets better at night?","?Replay material?"];
}
function artistFastOverviewRow(a){for(const key of overviewKeyCandidates(a)){const row=extras.overviews?.[key];if(row&&overviewRowsMatchAlbum(row,a))return row}return {}}
function artistFastScore(a){const row=artistFastOverviewRow(a);return Number(row.admin_score??a?.admin_score??a?.avg_rating??0)||0}
function artistFastCount(a){const row=artistFastOverviewRow(a);return Number(row.admin_ratings_count??a?.admin_ratings_count??a?.ratings_count??0)||0}
function artistFastGenre(a){const row=artistFastOverviewRow(a);return String(row.manual_genre||a?.genre||"").trim()||"Album"}
function artistFastScoreLabel(value){return Number(value)>0?Number(value).toFixed(1):""}
function artistFastListCover(a){const url=String(a?.cover_url||"").trim();return url?`<div class="listCover"><img src="${escapeHtml(url)}" loading="lazy" decoding="async" onerror="this.hidden=true" alt="${escapeHtml(a.title||"Album cover")}"><span>${escapeHtml(coverText(a))}</span></div>`:`<div class="listCover"><span>${escapeHtml(coverText(a))}</span></div>`}
function artistAlbumRow(a){return`<div class="artistAlbumRow" onclick="openAlbum('${escapeJsString(a.id)}')">${artistFastListCover(a)}<div><strong>${escapeHtml(a.title)}</strong>${artistFastCount(a)>0?`<span>${artistFastCount(a).toLocaleString()} ratings</span>`:""}</div><div class="artistAlbumScore">${artistFastScoreLabel(artistFastScore(a))}</div></div>`}
let artistDirectoryCache=null;
function clearArtistDirectoryCache(){artistDirectoryCache=null}
function artistDirectoryCacheKey(){return `${state.albums.length}:${state.albums[0]?.id||""}:${state.albums[state.albums.length-1]?.id||""}`}
function warmArtistDirectory(){setTimeout(()=>{try{artistDirectoryBaseRows()}catch(error){console.warn("Unable to warm artist directory",error)}},120)}
function artistDirectoryBaseRows(){
  const key=artistDirectoryCacheKey();
  if(artistDirectoryCache?.key===key)return artistDirectoryCache.rows;
  const byName=new Map();
  state.albums.forEach(album=>{
    const name=album.artist;
    if(!name)return;
    if(!byName.has(name))byName.set(name,[]);
    byName.get(name).push(album);
  });
  const rows=[...byName.entries()].map(([name,albums])=>{
    const sorted=albums.slice().sort((a,b)=>artistFastScore(b)-artistFastScore(a));
    const genres=[...new Set(sorted.map(artistFastGenre).filter(g=>g&&g!=="Album"))];
    const rated=sorted.filter(a=>artistFastScore(a)>0||artistFastCount(a)>0);
    const totalRatings=rated.reduce((sum,a)=>sum+artistFastCount(a),0);
    const avg=rated.length?rated.reduce((sum,a)=>sum+artistFastScore(a),0)/rated.length:0;
    const top=rated.length?Math.max(...rated.map(a=>artistFastScore(a))):0;
    const hero=sorted.find(a=>a.cover_url)||sorted[0]||{};
    const searchText=`${name} ${sorted.map(a=>`${a.title||""} ${artistFastGenre(a)}`).join(" ")}`.toLowerCase();
    return {name,albums:sorted,genres,hero,featured:sorted.slice(0,4),slug:artistSlugForName(name),totalRatings,scoreLabel:artistFastScoreLabel(avg),rank:{ratedCount:rated.length,totalRatings,avg,top},searchText};
  });
  artistDirectoryCache={key,rows};
  return rows;
}
function artistGenres(){const counts={};artistDirectoryBaseRows().forEach(row=>row.genres.forEach(label=>{counts[label]=(counts[label]||0)+1}));return ["Popular",...Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([genre])=>genre)]}
function artistDirectoryRows(){
  const rows=artistDirectoryBaseRows();
  const q=state.artistSearch.toLowerCase().trim();
  const filtered=rows.filter(row=>{
    const letterOk=state.artistLetter==="All"||String(row.name).trim().toUpperCase().startsWith(state.artistLetter);
    const genreOk=state.artistGenre==="All"||state.artistGenre==="Popular"||row.genres.includes(state.artistGenre);
    const searchOk=!q||row.searchText.includes(q);
    return letterOk&&genreOk&&searchOk;
  });
  return filtered.sort((a,b)=>{
    const ra=a.rank,rb=b.rank;
    if(state.artistGenre==="All"||state.artistGenre==="Popular"){
      if(!!rb.ratedCount!==!!ra.ratedCount)return rb.ratedCount?1:-1;
      if(rb.avg!==ra.avg)return rb.avg-ra.avg;
      if(rb.top!==ra.top)return rb.top-ra.top;
      if(rb.totalRatings!==ra.totalRatings)return rb.totalRatings-ra.totalRatings;
    }
    return a.name.localeCompare(b.name);
  });
}
function artistRank(name){return artistDirectoryRows().find(row=>row.name===name)?.rank||{ratedCount:0,totalRatings:0,avg:0,top:0}}
function artistNames(){return artistDirectoryRows().map(row=>row.name)}
let artistRenderToken=0;
function renderArtistResults(options={}){let artists=[];let grid=$("#artistResults");let count=$("#artistCount");try{artists=artistDirectoryRows()}catch(error){console.error("Unable to render artist directory",error);if(count)count.textContent="Artists unavailable";if(grid)grid.innerHTML='<div class="empty">Artists could not be loaded.</div>';return}if(count)count.textContent=artists.length+" artist"+(artists.length===1?"":"s");if(!grid)return;artistRenderToken++;const token=artistRenderToken;if(!options.chunked){grid.innerHTML=artists.map(artistBlock).join("")||'<div class="empty">No artists found.</div>';return}grid.innerHTML="";if(!artists.length){grid.innerHTML='<div class="empty">No artists found.</div>';return}let index=0;function renderChunk(){if(token!==artistRenderToken||state.view!=="artists"||!document.body.contains(grid))return;const next=artists.slice(index,index+36).map(artistBlock).join("");if(next)grid.insertAdjacentHTML("beforeend",next);index+=36;if(index<artists.length)requestAnimationFrame(renderChunk)}renderChunk()}
function artistPage(deferResults=false){let letters=["All",..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];let genres=deferResults&&!artistDirectoryCache?["Popular","Rock","Pop","Alternative Rock","Hip-Hop","Folk Rock","Pop Rock","Metal","Soul"]:artistGenres();let artists=deferResults?[]:artistDirectoryRows();let countLabel=deferResults?"Loading artists...":`${artists.length} artist${artists.length===1?"":"s"}`;let activeLetter=state.artistLetter==="All"?"A-Z Filter":state.artistLetter;return `<div class="artistTopBand"><section class="artistDiscovery"><div><p class="eyebrow">Music culture</p><h2>Artists</h2><p>Discover legendary artists, hidden gems, and community favorites.</p></div><div class="artistSearchWrap"><input id="artistSearchInput" value="${escapeHtml(state.artistSearch)}" oninput="setArtistSearch(this.value)" placeholder="Search artists, albums, genres, moods..."><span id="artistCount">${countLabel}</span></div></section><div class="artistFilterDock"><div class="artistFilterLabel">Genres</div><div class="artistGenreChips">${genres.map(genre=>`<button class="${(state.artistGenre===genre||(genre==="Popular"&&state.artistGenre==="All"))?"active":""}" onclick="setArtistGenre('${escapeJsString(genre)}')">${escapeHtml(genre)}</button>`).join("")}<details class="artistAZMenu"><summary>${activeLetter} <span>v</span></summary><div class="artistAZ">${letters.map(letter=>`<button class="${state.artistLetter===letter?"active":""}" onclick="setArtistLetter('${letter}')">${letter}</button>`).join("")}</div></details></div></div></div><div id="artistResults" class="artistGrid">${deferResults?"":(artists.map(artistBlock).join("")||'<div class="empty">No artists found.</div>')}</div>`}window.setArtistLetter=function(letter){state.artistLetter=letter;render()}
window.setArtistGenre=function(genre){state.artistGenre=genre==="Popular"?"All":genre;render()}
window.setArtistSearch=function(value){state.artistSearch=value;renderArtistResults({chunked:true})}
function artistBlock(row){if(typeof row==="string")row=artistDirectoryRows().find(item=>item.name===row)||{name:row,albums:[],genres:[],hero:{},featured:[],slug:artistSlugForName(row),totalRatings:0,scoreLabel:""};let genres=(row.genres||[]).slice(0,3);return`<section class="artistCard"><div class="artistHero" style="--artist-cover:url('${escapeHtml(row.hero?.cover_url||"")}')"><div><h3><button class="artistDiscoveryLink" onclick="openArtistPage('${escapeJsString(row.slug)}')">${escapeHtml(row.name)}</button></h3><p>${genres.length?escapeHtml(genres.join(" - "))+" - ":""}${row.albums.length} album${row.albums.length===1?"":"s"} ranked</p><div class="artistTags">${genres.map(g=>`<span>${escapeHtml(g)}</span>`).join("")}</div></div><div class="artistScore">${row.scoreLabel||""}${row.totalRatings?`<span>${row.totalRatings.toLocaleString()} ratings</span>`:""}</div></div><div class="artistAlbumList">${row.featured.map(artistAlbumRow).join("")}</div></section>`}

function artistSlugForName(value){
  return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")
}
function artistSlugFromPath(){
  const match=String(location.pathname||"").match(/\/artist\/([^/?#]+)/i);
  if(!match)return "";
  try{return artistSlugForName(decodeURIComponent(match[1]))}catch(error){return artistSlugForName(match[1])}
}
function artistFallbackRecord(slug){
  const name=artistNames().find(item=>artistSlugForName(item)===slug)||"";
  if(!name)return null;
  const albums=state.albums.filter(album=>artistSlugForName(album.artist)===slug);
  return {id:null,name,slug,image_url:"",image_source_url:"",image_author:"",image_license:"",image_license_url:"",image_attribution:"",bio:"",bio_sources:[],bio_generated_at:null,bio_generation_model:"",country:"",artist_type:"",genres:[...new Set(albums.map(albumGenreLabel).filter(label=>label&&label!=="Album"))],formed_year:null,disbanded_year:null,birth_date:null,death_date:null}
}
function artistProfileMeta(profile){
  const parts=[];
  if(profile.country)parts.push(profile.country);
  if(profile.artist_type)parts.push(profile.artist_type);
  (Array.isArray(profile.genres)?profile.genres:[]).slice(0,3).forEach(genre=>{if(genre&&!parts.includes(genre))parts.push(genre)});
  return parts
}
function artistRejectedImageUrls(profile){
  const value=profile?.image_rejected_urls;
  if(Array.isArray(value))return value.map(item=>String(item||"").trim()).filter(Boolean);
  try{const parsed=JSON.parse(String(value||"[]"));return Array.isArray(parsed)?parsed.map(item=>String(item||"").trim()).filter(Boolean):[]}catch(error){return []}
}
function artistProfileApprovedPortraits(rows=[],rejectedUrls=[]){
  const seen=new Set();
  const rejected=new Set((rejectedUrls||[]).map(item=>String(item||"").trim()).filter(Boolean));
  return rows.filter(row=>row?.image_approved===true&&String(row?.image_status||"").toLowerCase()==="approved"&&String(row?.image_url||"").trim()).filter(row=>!rejected.has(String(row.image_url||"").trim())&&!rejected.has(String(row.image_source_url||"").trim())).filter(row=>normalizeAlbumName(row.person_name)!=="prince"||String(row.person_wikidata_id||"").toUpperCase()==="Q7542").filter(row=>{
    const key=String(row.person_wikidata_id||row.person_name||row.image_url||"").trim().toLowerCase();
    if(!key||seen.has(key))return false;
    seen.add(key);return true
  }).sort((left,right)=>(Number(left.sort_order)||99999)-(Number(right.sort_order)||99999));
}
function artistProfilePortraitSource(profile){
  const rejected=artistRejectedImageUrls(profile);
  const approved=artistProfileApprovedPortraits(state.artistProfilePortraits||[],rejected);
  const exact=approved.find(row=>normalizeAlbumName(row.person_name)===normalizeAlbumName(profile.name));
  if(profile.image_url&&normalizeAlbumName(profile.name)!=="prince"&&!rejected.includes(String(profile.image_url||"").trim()))return {type:"profile",image_url:String(profile.image_url||""),portraits:[],credit:profile};
  if(exact)return {type:"credit",image_url:String(exact.image_url||""),portraits:[exact]};
  const portraits=exact?[exact]:approved.slice(0,4);
  if(!portraits.length||(!exact&&portraits.length<2))return null;
  return {type:portraits.length>1?"collage":"credit",image_url:String(portraits[0]?.image_url||""),portraits};
}
function artistImageCreditMarkup(source){
  const credit=source?.credit||source?.portraits?.[0]||{};
  const attribution=String(credit.image_attribution||"").trim();
  const author=String(credit.image_author||"").trim();
  const license=String(credit.image_license||"").trim();
  const sourceUrl=String(credit.image_source_url||"").trim();
  const licenseUrl=String(credit.image_license_url||"").trim();
  if(!attribution&&!author&&!license&&!sourceUrl)return "";
  const label=attribution||["Photo",author].filter(Boolean).join(": ")||"Image source";
  const sourceLink=sourceUrl?`<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`:escapeHtml(label);
  const licenseLink=license?` <span>&middot;</span> ${licenseUrl?`<a href="${escapeHtml(licenseUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(license)}</a>`:escapeHtml(license)}`:"";
  return `<p class="muzeArtistImageCredit">${sourceLink}${licenseLink}</p>`
}
function artistProfilePortraitMarkup(profile){
  const source=artistProfilePortraitSource(profile);
  if(!source)return "";
  if(source.type==="profile")return `<figure class="muzeArtistPortraitFrame"><div class="muzeArtistPortrait"><img src="${escapeHtml(source.image_url)}" alt="${escapeHtml(profile.name)}"></div>${artistImageCreditMarkup(source)}</figure>`;
  const collage=source.portraits.length>1;
  return `<figure class="muzeArtistPortraitFrame"><div class="muzeArtistPortrait isCreditPortrait${collage?` isMemberCollage count-${source.portraits.length}`:""}">${source.portraits.map(row=>`<img src="${escapeHtml(row.image_url)}" alt="${escapeHtml(collage?row.person_name:profile.name)}" loading="lazy">`).join("")}</div>${artistImageCreditMarkup(source)}</figure>`;
}
function artistProfileAlbumCard(album){
  const image=albumCoverUrl(album);
  const rating=score(album)>0?`<span class="muzeArtistAlbumScore">&#9733; ${displayScore(album)}</span>`:"";
  return `<article class="muzeArtistAlbumCard" role="button" tabindex="0" onclick="openAlbum('${escapeJsString(album.id)}')" onkeydown="if(event.key==='Enter'||event.key===' ')openAlbum('${escapeJsString(album.id)}')"><div class="muzeArtistAlbumCover">${image?`<img src="${escapeHtml(image)}" alt="${escapeHtml(album.title||"Album")} cover">`:`<span>${escapeHtml(String(album.title||"A").slice(0,1))}</span>`}</div><div><strong>${escapeHtml(album.title||"Untitled album")}</strong><p>${escapeHtml(album.year||"")}</p>${rating}</div></article>`
}
const artistDiscographyYearSensitiveTitles=new Set([
  "fleetwood mac::fleetwood mac",
  "peter gabriel::peter gabriel",
  "seal::seal",
  "duran duran::duran duran",
  "killing joke::killing joke"
]);
function artistDiscographyDisplayKey(album){
  const titleIdentity=albumIdentityTitleKey(album);
  if(!titleIdentity)return "";
  const identity=albumIdentityKey(album);
  if(!artistDiscographyYearSensitiveTitles.has(identity))return titleIdentity;
  const year=albumReleaseYear(album)||String(album?.release_date||"").slice(0,4)||"unknown";
  return `${titleIdentity}::${year}`;
}
function dedupeArtistDiscography(albums=[]){
  const rows=[];
  const byRelease=new Map();
  albums.forEach(album=>{
    const identity=albumIdentityKey(album);
    const year=albumReleaseYear(album)||String(album?.release_date||"").slice(0,4)||"unknown";
    const key=artistDiscographyDisplayKey(album);
    if(!key){rows.push(album);return}
    const existingIndex=byRelease.get(key);
    if(existingIndex===undefined){
      byRelease.set(key,rows.length);
      rows.push(album);
      return;
    }
    const current=rows[existingIndex];
    const currentYear=Number(albumReleaseYear(current)||String(current?.release_date||"").slice(0,4));
    const incomingYear=Number(year);
    const earliestYear=[currentYear,incomingYear].filter(Number.isFinite).filter(value=>value>0).sort((a,b)=>a-b)[0]||"";
    const preferred=albumRecordQuality(album)>albumRecordQuality(current)?{...current,...album}:current;
    rows[existingIndex]=earliestYear&&!artistDiscographyYearSensitiveTitles.has(identity)?{...preferred,year:earliestYear}:preferred;
  });
  return rows;
}
function artistDiscographyCards(albums=[]){
  const rendered=new Set();
  return albums.map(album=>{
    const key=artistDiscographyDisplayKey(album);
    if(key&&rendered.has(key))return "";
    if(key)rendered.add(key);
    return artistProfileAlbumCard(album);
  }).join("");
}
function artistEditField(id,label,value,type="text"){
  const clean=value??"";
  if(type==="textarea")return `<label>${escapeHtml(label)}<textarea id="${id}" rows="6">${escapeHtml(clean)}</textarea></label>`;
  return `<label>${escapeHtml(label)}<input id="${id}" type="${type}" value="${escapeHtml(clean)}"></label>`
}
function artistBioSources(value){
  let rows=value;
  if(typeof rows==="string"){try{rows=JSON.parse(rows)}catch(error){rows=[]}}
  return (Array.isArray(rows)?rows:[]).map(row=>({name:String(row?.name||"Source").trim(),url:String(row?.url||"").trim(),kind:String(row?.kind||"").trim(),accessed_at:String(row?.accessed_at||"").trim()})).filter(row=>/^https:\/\//i.test(row.url))
}
function artistBioSourcesMarkup(value){
  const rows=artistBioSources(value);
  if(!rows.length)return '<p class="muzeArtistBioNoSources">No research sources are attached to this biography yet.</p>';
  return `<ul>${rows.map(row=>`<li><a href="${escapeHtml(row.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.name)}</a>${row.kind?`<span>${escapeHtml(row.kind)}</span>`:""}</li>`).join("")}</ul>`
}
function artistAdminEditor(profile){
  if(!isAdminUnlocked()||!state.artistEditing)return "";
  const sources=state.artistBioDraftSources.length?state.artistBioDraftSources:artistBioSources(profile.bio_sources);
  const imageSource=artistProfilePortraitSource(profile);
  const imageActions=imageSource?.image_url?`<div class="muzeArtistImageTools"><button type="button" onclick="rejectArtistProfileImage()">Reject current image</button><span id="artistImageStatus">Looks for the next approved linked portrait.</span></div>`:`<div class="muzeArtistImageTools"><span id="artistImageStatus">No artist image is active.</span></div>`;
  return `<section class="muzeArtistAdmin"><header><div><span>Admin editing</span><h2>Edit artist</h2></div><button type="button" onclick="cancelArtistEdit()">Cancel</button></header><div class="muzeArtistAdminGrid">${artistEditField("artistEditName","Artist name",profile.name)}<div class="muzeArtistImageField">${artistEditField("artistEditImage","Artist image URL",profile.image_url)}${imageActions}</div>${artistEditField("artistEditCountry","Country",profile.country)}${artistEditField("artistEditType","Artist type",profile.artist_type)}${artistEditField("artistEditGenres","Genres (comma separated)",(profile.genres||[]).join(", "))}<div class="muzeArtistImageCreditFields">${artistEditField("artistImageSource","Image source page URL",profile.image_source_url,"url")}${artistEditField("artistImageAuthor","Image author / credit",profile.image_author)}${artistEditField("artistImageLicense","Image license",profile.image_license)}${artistEditField("artistImageLicenseUrl","Image license URL",profile.image_license_url,"url")}${artistEditField("artistImageAttribution","Image attribution text",profile.image_attribution)}</div>${artistEditField("artistEditFormed","Formed year",profile.formed_year,"number")}${artistEditField("artistEditDisbanded","Disbanded year",profile.disbanded_year,"number")}${artistEditField("artistEditBirth","Birth date",profile.birth_date,"date")}${artistEditField("artistEditDeath","Death date",profile.death_date,"date")}<div class="muzeArtistAdminBio">${artistEditField("artistEditBio","Muze biography",profile.bio,"textarea")}<div class="muzeArtistBioTools"><button id="artistBioDraftButton" type="button" onclick="generateArtistBioDraft()">Generate Bio Draft</button><span id="artistBioDraftStatus">Researches structured facts and returns an unpublished draft.</span></div><div class="muzeArtistBioSources"><strong>Sources consulted</strong><div id="artistBioSourcesList">${artistBioSourcesMarkup(sources)}</div></div></div></div><button class="muzeArtistAdminSave" type="button" onclick="saveArtistProfile()">Save artist</button></section>`
}
function artistProfilePage(){
  if(state.artistProfileLoading)return `<section class="muzeArtistState"><span class="muzeArtistLoader" aria-hidden="true"></span><h2>Loading artist</h2></section>`;
  const profile=state.artistProfile;
  if(!profile)return `<section class="muzeArtistState"><p class="eyebrow">Muze artists</p><h2>Artist not found</h2><p>${escapeHtml(state.artistProfileError||"This artist does not have a Muze page yet.")}</p><button onclick="navigateToView('artists')">Back to Muze artists</button></section>`;
  const albums=dedupeArtistDiscography(state.artistProfileAlbums||[]).sort((a,b)=>(Number(b.year)||0)-(Number(a.year)||0)||String(a.title||"").localeCompare(String(b.title||"")));
  const meta=artistProfileMeta(profile);
  const image=artistProfilePortraitMarkup(profile);
  const adminButton=isAdminUnlocked()?`<button class="muzeArtistEditButton" onclick="editArtistProfile()">Edit Artist</button>`:"";
  const activeRange=profile.formed_year?`${profile.formed_year} - ${profile.disbanded_year||"Present"}`:"";
  const heroMeta=[profile.country,(profile.genres||[])[0],activeRange?`Active ${activeRange}`:""].filter(Boolean);
  const biography=profile.bio?artistBiographyMarkup(profile.bio):isAdminUnlocked()?`<p class="muzeArtistHeroBioEmpty">No Muze biography has been written yet.</p>`:"";
  return `<div class="muzeArtistPage"><section class="muzeArtistProfileHero${image?" hasPortrait":" noPortrait"}">${image}<div class="muzeArtistHeroCopy"><p class="eyebrow">Artist</p><h1>${escapeHtml(profile.name)}</h1>${heroMeta.length?`<p class="muzeArtistHeroMeta">${heroMeta.map(escapeHtml).join(" <b>&middot;</b> ")}</p>`:meta.length?`<p class="muzeArtistHeroMeta">${meta.map(escapeHtml).join(" <b>&middot;</b> ")}</p>`:""}<i aria-hidden="true"></i>${biography}${adminButton}</div></section>${artistAdminEditor(profile)}<section class="muzeArtistDiscography"><header><div><p class="eyebrow">Discography</p><h2>Albums</h2></div><span>${albums.length} album${albums.length===1?"":"s"}</span></header><div class="muzeArtistAlbumGrid">${albums.length?artistDiscographyCards(albums):'<div class="muzeArtistNoAlbums">No Muze albums are linked to this artist yet.</div>'}</div></section></div>`
}
async function loadArtistProfile(slug){
  const cleanSlug=artistSlugForName(slug);
  state.artistProfileLoading=true;state.artistProfileError="";state.artistProfile=null;state.artistProfileAlbums=[];state.artistProfilePortraits=[];state.artistEditing=false;state.artistBioDraftSources=[];state.artistBioDraftModel="";state.artistBioDraftedAt="";render();
  let profile=null;let albums=[];
  if(db&&cleanSlug){
    try{
      const profileResult=await db.from("artists").select("*").eq("slug",cleanSlug).maybeSingle();
      if(profileResult.error)throw profileResult.error;
      profile=profileResult.data||null;
      if(profile?.id){
        const linksResult=await db.from("album_artists").select("album_id,role,sort_order").eq("artist_id",profile.id).order("sort_order",{ascending:true});
        if(linksResult.error)throw linksResult.error;
        const ids=[...new Set((linksResult.data||[]).map(row=>row.album_id).filter(Boolean))];
        if(ids.length){
          let albumsResult=await db.from("album_scores").select("*").in("id",ids);
          if(albumsResult.error)albumsResult=await db.from("albums").select("id,title,artist,year,genre,cover_url,spotify_url,summary,spotify_id,wikipedia_url,source_url").in("id",ids);
          if(albumsResult.error)throw albumsResult.error;
          albums=albumsResult.data||[];
          const overviewResult=await db.from("album_overviews").select("*").in("album_id",ids);
          if(!overviewResult.error&&(overviewResult.data||[]).length){
            overviewResult.data.forEach(row=>{if(row?.album_key)extras.overviews[row.album_key]=row});
            indexOverviewRows();
          }
          const portraitsResult=await db.from("album_credits").select("album_id,person_name,person_wikidata_id,image_url,image_source_url,image_author,image_license,image_license_url,image_attribution,image_status,image_approved,credit_type,role,sort_order").in("album_id",ids).eq("credit_type","performer").eq("image_approved",true).not("image_url","is",null);
          if(!portraitsResult.error)state.artistProfilePortraits=portraitsResult.data||[];
        }
      }
    }catch(error){
      if(!/artists|album_artists|schema cache|PGRST205|42P01/i.test(error.message||""))console.warn("Muze artist page query failed",error);
    }
  }
  if(!profile)profile=artistFallbackRecord(cleanSlug);
  if(profile&&!albums.length)albums=state.albums.filter(album=>artistSlugForName(album.artist)===cleanSlug);
  if(albums.length)state.albums=mergeAlbumSources(state.albums,albums);
  state.artistProfile=profile;state.artistProfileAlbums=dedupeArtistDiscography(albums);state.artistProfileLoading=false;
  if(!profile)state.artistProfileError="Check the artist name or return to the Muze artist directory.";
  render();window.scrollTo({top:0,behavior:"auto"});return {profile,usedDatabase:Boolean(profile?.id)}
}
async function navigateToArtist(slug,{replace=false}={}){
  const cleanSlug=artistSlugForName(slug);if(!cleanSlug)return;
  const albumOpen=!$("#albumModal")?.classList.contains("hidden");
  if(!replace){
    history.replaceState({...history.state,musica:"inside",view:state.view,albumId:albumOpen?extras.currentAlbumId:null},"",location.href);
    history.pushState({musica:"artist",artistSlug:cleanSlug},"",`/artist/${encodeURIComponent(cleanSlug)}`);
  }else history.replaceState({musica:"artist",artistSlug:cleanSlug},"",location.href);
  closeAlbumPopup();state.view="artist-profile";document.querySelectorAll(".tab,.navItem[data-view]").forEach(item=>item.classList.remove("active"));
  await loadArtistProfile(cleanSlug)
}
window.openArtistPage=function(slug){return navigateToArtist(slug)};
window.editArtistProfile=function(){if(!isAdminUnlocked())return;state.artistBioDraftSources=artistBioSources(state.artistProfile?.bio_sources);state.artistBioDraftModel=String(state.artistProfile?.bio_generation_model||"");state.artistBioDraftedAt=String(state.artistProfile?.bio_generated_at||"");state.artistEditing=true;render()};
window.cancelArtistEdit=function(){state.artistEditing=false;state.artistBioDraftSources=[];state.artistBioDraftModel="";state.artistBioDraftedAt="";render()};
window.rejectArtistProfileImage=async function(){
  if(!isAdminUnlocked()||!state.artistProfile)return;
  const source=artistProfilePortraitSource(state.artistProfile);
  if(!source?.image_url){const status=$("#artistImageStatus");if(status)status.textContent="No artist image is active.";return}
  if(!confirm("Reject this artist image and replace it with the next approved linked portrait if one is available?"))return;
  const button=document.querySelector(".muzeArtistImageTools button");const status=$("#artistImageStatus");
  if(button){button.disabled=true;button.textContent="Replacing..."}if(status)status.textContent="Checking approved linked portraits.";
  try{
    const result=await adminOverviewRequest({action:"reject_artist_image",slug:state.artistProfile.slug,name:state.artistProfile.name,image_url:source.image_url});
    if(!result?.ok)return;
    state.artistProfile={...state.artistProfile,...result.row};
    const editor=$("#artistEditImage");if(editor)editor.value=state.artistProfile.image_url||"";
    [["#artistImageSource","image_source_url"],["#artistImageAuthor","image_author"],["#artistImageLicense","image_license"],["#artistImageLicenseUrl","image_license_url"],["#artistImageAttribution","image_attribution"]].forEach(([id,field])=>{const input=$(id);if(input)input.value=state.artistProfile[field]||""});
    if((result.stripped_columns||[]).includes("image_rejected_urls"))alert("The image was replaced, but rejection history could not be stored because the live artists table needs the artist image rejection migration.");
    if(status)status.textContent=result.replacement?"Image replaced with the next approved portrait.":"Image rejected. No replacement portrait is available yet.";
    render();
  }catch(error){if(status)status.textContent=error.message||"Artist image could not be rejected."}
  finally{if(button){button.disabled=false;button.textContent="Reject current image"}}
};
window.generateArtistBioDraft=async function(){
  if(!isAdminUnlocked()||!state.artistProfile)return;
  const pin=normalizeAdminPinValue(sessionStorage.getItem("musicaAdminPin")||"");
  const name=String($("#artistEditName")?.value||state.artistProfile.name||"").trim();
  const button=$("#artistBioDraftButton");const status=$("#artistBioDraftStatus");
  if(button){button.disabled=true;button.textContent="Researching..."}if(status)status.textContent="Checking structured data, official sources, reference sites, and reputable music reporting.";
  try{
    const albums=(state.artistProfileAlbums||[]).map(album=>({title:album.title,year:albumReleaseYear(album)||album.year||""}));
    const response=await fetch("/.netlify/functions/artist-bio-draft",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin,name,albums})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||"Biography research failed.");
    const editor=$("#artistEditBio");if(editor)editor.value=data.bio||"";
    state.artistBioDraftSources=artistBioSources(data.sources);state.artistBioDraftModel=String(data.generation_model||"");state.artistBioDraftedAt=String(data.generated_at||new Date().toISOString());
    const sourceHost=$("#artistBioSourcesList");if(sourceHost)sourceHost.innerHTML=artistBioSourcesMarkup(state.artistBioDraftSources);
    if(status)status.textContent="Draft ready. Review and edit it, then Save Artist to publish.";
  }catch(error){if(status)status.textContent=error.message||"Biography research failed."}
  finally{if(button){button.disabled=false;button.textContent="Generate Bio Draft"}}
};
window.saveArtistProfile=async function(){
  if(!isAdminUnlocked()||!state.artistProfile)return;
  const value=id=>String($(id)?.value||"").trim();
  const payload={action:"save_artist",slug:state.artistProfile.slug,name:value("#artistEditName"),image_url:value("#artistEditImage"),image_source_url:value("#artistImageSource"),image_author:value("#artistImageAuthor"),image_license:value("#artistImageLicense"),image_license_url:value("#artistImageLicenseUrl"),image_attribution:value("#artistImageAttribution"),country:value("#artistEditCountry"),artist_type:value("#artistEditType"),genres:value("#artistEditGenres").split(",").map(item=>item.trim()).filter(Boolean),formed_year:value("#artistEditFormed"),disbanded_year:value("#artistEditDisbanded"),birth_date:value("#artistEditBirth"),death_date:value("#artistEditDeath"),bio:value("#artistEditBio"),bio_sources:state.artistBioDraftSources.length?state.artistBioDraftSources:artistBioSources(state.artistProfile.bio_sources),bio_generated_at:state.artistBioDraftedAt||state.artistProfile.bio_generated_at||null,bio_generation_model:state.artistBioDraftModel||state.artistProfile.bio_generation_model||""};
  const result=await adminOverviewRequest(payload);if(!result?.ok)return;
  if((result.stripped_columns||[]).some(column=>column.startsWith("bio_")))alert("The biography was saved, but its research provenance could not be stored because the live artists table needs supabase/migrations/202608150002_artist_biography_sources.sql.");
  if((result.stripped_columns||[]).some(column=>column.startsWith("image_")&&column!=="image_url"))alert("The artist was saved, but image credit details could not be stored because the live artists table needs the artist image attribution migration.");
  state.artistProfile={...state.artistProfile,...result.row};state.artistEditing=false;state.artistBioDraftSources=[];state.artistBioDraftModel="";state.artistBioDraftedAt="";render()
};

window.openAlbum=async function(id){
  let a=state.albums.find(x=>String(x.id)===String(id));
  if(!a)return;
  const verifiedYear=albumReleaseYear(a);
  if(verifiedYear&&Number(a.year)!==Number(verifiedYear))a={...a,year:verifiedYear};
  await fetchAlbumMoodScore(a);
  extras.currentAlbumId=albumRef(a.id);
  const albumScore=displayScore(a);
  const total=count(a).toLocaleString();
  const albumId=escapeJsString(a.id);
  const initial=escapeHtml((authDisplayName()||"L").slice(0,1).toUpperCase());
  const coverUrl=escapeHtml(albumCoverUrl(a));
  const savedOverview=albumOverviewRow(a);
  const heroFocus=escapeHtml(savedOverview.hero_focus||"50% 50%");
  const heroSceneUrl=escapeHtml(albumHeroSceneImage(a)||albumCoverUrl(a)||"");
  const momentCoverUrl=escapeHtml(albumMomentImage(a)||albumCoverUrl(a)||heroSceneUrl||"");
  const pageImageStyle=` style="--album-cover:url('${coverUrl}');--hero-scene:url('${heroSceneUrl}');--hero-position:${heroFocus};--moment-cover:url('${momentCoverUrl}')${albumAmbientStyleVars(a)}"`;
  const structuredOverview=albumStructuredOverview(a);
  const summary=structuredOverview.intro_summary||albumHeroLine(a);
  const customOverview=albumCustomOverview(a);
  const canEditOverview=isAdminUnlocked();
  const tags=[albumGenreLabel(a),a.year?String(a.year):"Classic","Community pick"].filter(Boolean).slice(0,4);
  const titleText=String(a.title||"").trim();
  const titleWords=titleText.split(/\s+/).filter(Boolean).length;
  const albumTitleClass=titleText.length>38||titleWords>=6?"albumTitleLong":titleText.length>26||titleWords>=4?"albumTitleMedium":"";
  const albumTitleClassAttr=albumTitleClass?` class="${albumTitleClass}"`:"";
  const scoreMood=Number(albumScore)>=9.5?"classic album":Number(albumScore)>=9?"universally acclaimed":Number(albumScore)>=8?"deeply loved":"still dividing listeners";
  const vibeTags=albumVibeTags(a).map(tag=>`<span>${escapeHtml(tag)}</span>`).join("");
  const heroMoodTags=albumVibeTags(a).slice(0,4).map(tag=>`<span>${escapeHtml(tag)}</span>`).join("");
  const socialProof=count(a)>0?`${total} listeners shaping it`:"Be first to shape it";
  const heroPullQuotes=albumHeroPullQuotes(a).map((line,i)=>`<span class="pull${i+1}">${escapeHtml(line)}</span>`).join("");
  const heroCenterpiece=albumHeroCenterpiece(a);
  const returnHeadline=structuredOverview.quote_headline||albumReturnHeadline(a);
  const returnBody=structuredOverview.legacy_summary||albumReturnBody(a);
  const consensusLine=count(a)>5?"Early consensus forming":"Taste is starting to gather";
  const isInLibrary=libraryHasAlbum(a);
  const librarySavedCount=albumLibrarySaveCount(a);
  const librarySavedLabel=librarySavedCount.toLocaleString();
  const libraryLine=librarySavedCount>0?`Saved by ${librarySavedLabel} listener${librarySavedCount===1?"":"s"}`:"Add it to your music world";
  const communityPull=formatParagraphText(structuredOverview.impact_summary||albumCommunityPull(a));
  const reactionWhispers=albumReactionWhispers(a).map(line=>`<span>${escapeHtml(line)}</span>`).join("");
  const heroAdmin=canEditOverview?`<div class="heroAdminControls"><button class="heroDragButton" onclick="uploadAlbumVisualImage('${albumId}','hero')">Upload hero image</button><button class="heroDragButton" onclick="startHeroImageDrag('${albumId}')">Move hero image</button></div>`:"";
  const moodScore=Math.max(0,Math.min(100,albumOverviewFieldNumber(a,"mood_score",62)));
  const moodStart=moodScore<40?"#45d66d":moodScore<72?"#b6d94b":"#ffd51f";
  const moodEnd=moodScore<40?"#a8ef72":moodScore<72?"#ffd51f":"#ff9a1f";
  const moodGlow=moodScore<40?"69,214,109":moodScore<72?"255,213,31":"255,154,31";
  const scoreStat=canEditOverview?`<button class="linerStatEdit" onclick="setAlbumScoreAdmin('${albumId}')"><span>Rating</span><strong>${albumScore}</strong><small>${escapeHtml(scoreMood)}</small><em>Edit</em></button>`:`<button class="linerStatEdit albumRateStat" onclick="openAlbumRating('${albumId}')" aria-label="Rate this album"><span>Rating</span><strong>${albumScore}</strong><small>${escapeHtml(scoreMood)}</small></button>`;
  const countStat=canEditOverview?`<button class="linerStatEdit" onclick="setAlbumRatingsCountAdmin('${albumId}')"><span>Rated by</span><strong>${total}</strong><small>${escapeHtml(consensusLine)}</small><em>Edit</em></button>`:`<div><span>Rated by</span><strong>${total}</strong><small>${escapeHtml(consensusLine)}</small></div>`;
  const heroSavedStrip=`<div class="heroSavedStrip"><span class="miniAvatars"><i></i><i></i><i></i><i></i></span><span>${librarySavedCount>0?`Saved by <b>${librarySavedLabel}</b> listener${librarySavedCount===1?"":"s"}`:"Add it to your library"}</span></div>`;
  const soundInfluenceText=structuredOverview.sound_summary||albumCommunityPull(a);
  const soundInfluenceHasMore=hasExpandableText(soundInfluenceText);
  const soundInfluenceAttrs=soundInfluenceHasMore?` role="button" tabindex="0" aria-expanded="false" onclick="toggleHeroInfluenceCard(this)" onkeydown="if(event.key==='Enter'||event.key===' ')toggleHeroInfluenceCard(this,event)"`:"";
  const soundInfluenceHint=soundInfluenceHasMore?`<span class="influenceExpandHint"><b>Read more</b><b>Show less</b></span>`:"";
  const heroSideCards=`<aside class="linerHeroSide"><div class="heroSideCard love"><h4><span>&#9825;</span>Why people love it</h4><p>"${formatParagraphText(returnHeadline)}"</p><div class="heroFanRow"><span class="miniAvatars"><i></i><i></i><i></i><i></i></span><b>Fan favorite &#9829;</b></div></div><div class="heroSideCard mood" style="--mood-score:${moodScore}%;--mood-start:${moodStart};--mood-end:${moodEnd};--mood-glow:${moodGlow}"><h4><span>&#12316;</span>Vibe & Mood</h4><p>${albumVibeTags(a).slice(0,3).map(escapeHtml).join(" &middot; ")}</p><div class="moodMeter"><span></span></div><div class="moodScale"><em>Mellow</em><em>Intense</em></div></div><div class="heroSideCard influence${soundInfluenceHasMore?" is-collapsible":""}"${soundInfluenceAttrs}><h4><span>&#9733;</span>Sound & Influence</h4><p class="influencePreview">${formatParagraphText(compactPreviewText(soundInfluenceText))}</p><p class="influenceFull">${formatParagraphText(soundInfluenceText)}</p><div>${albumVibeTags(a).slice(0,3).map(tag=>`<small>${escapeHtml(tag)}</small>`).join("")}</div>${soundInfluenceHint}</div></aside>`;
  $("#albumModalContent").innerHTML=`<div class="linerAlbumPage"${pageImageStyle}><div class="linerTabs"><button data-album-tab="overview" onclick="setAlbumPopupTab('overview')">Overview</button><button data-album-tab="tracks" onclick="setAlbumPopupTab('tracks')" class="active">Tracks</button><button data-album-tab="ratings" onclick="setAlbumPopupTab('ratings')">Ratings & Reviews</button></div><section class="linerHero" data-album-id="${albumId}" style="--album-cover:url('${coverUrl}');--hero-scene:url('${heroSceneUrl}');--hero-position:${heroFocus}">${heroAdmin}<div class="linerCover">${flippableAlbumCover(a,a.id)}${heroSavedStrip}</div><div class="linerHeroCopy"><p class="eyebrow">Album &middot; ${escapeHtml(a.year||"")}</p><h2${albumTitleClassAttr}>${escapeHtml(a.title)}</h2><h3>${escapeHtml(a.artist)} <span>&#9679;</span></h3><p>${formatParagraphText(summary)}</p><div class="linerTags">${tags.map(tag=>`<span>${escapeHtml(tag)}</span>`).join("")}</div><div class="linerMoodTags">${heroMoodTags}</div><div class="linerStats">${scoreStat}${countStat}<button class="linerSocialProof librarySaveStat" onclick="addCurrentAlbumToLibrary('${albumId}')" aria-label="Add this album to your library"><span>Library</span><strong>${isInLibrary?"Saved":"+"}</strong><small>${escapeHtml(libraryLine)}</small></button></div><div class="heroRightAtmosphere" aria-hidden="true">${heroPullQuotes}<i></i><i></i><i></i></div><div class="linerActions"><button onclick="addCurrentAlbumToLibrary('${albumId}')">+ Add to my library</button><a target="_blank" href="${escapeHtml(a.spotify_url||`https://open.spotify.com/search/${encodeURIComponent(a.title+" "+a.artist)}`)}"><span class="spotifyMark" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11"></circle><path d="M7 9.2c3.4-1 7.3-.7 10.2.9"></path><path d="M7.6 12.1c2.8-.8 6-.5 8.2.7"></path><path d="M8.2 14.8c2.1-.5 4.4-.3 6.2.6"></path></svg></span>Open in Spotify</a></div></div>${heroSideCards}<button type="button" class="albumSeeMorePill" onclick="window.scrollAlbumSeeMore()">See more &#8595;</button><section class="linerHeroSoul"><div class="returnIcon">&#9829;</div><div class="returnHeadline"><span>Why people return</span><h3>${formatParagraphText(returnHeadline)}</h3></div><p>${formatParagraphText(returnBody)}</p><div class="returnTags">${heroMoodTags}</div></section></section><section class="linerContentGrid"><div class="linerPanel trackPanel"><div class="linerPanelTitle"><span>&#9733;</span><div><h3>Why people love this album</h3><p>Community feeling, not just numbers.</p></div></div><div class="linerScoreRow"><div class="scoreRing"><strong>${albumScore}</strong><span>avg. rating &#9733;</span><small>${escapeHtml(scoreMood)}</small></div><div class="ratingBars"><div><span>5 &#9733;</span><b style="--w:72%"></b><em>72%</em></div><div><span>4 &#9733;</span><b style="--w:20%"></b><em>20%</em></div><div><span>3 &#9733;</span><b style="--w:6%"></b><em>6%</em></div><div><span>2 &#9733;</span><b style="--w:1%"></b><em>1%</em></div><div><span>1 &#9733;</span><b style="--w:1%"></b><em>1%</em></div></div></div><div class="trackMoodTags">${vibeTags}</div><div class="communityPulse">${communityPull}</div></div><div id="albumRatingsSection" class="linerPanel reactionsPanel"><div class="linerPanelTitle"><span class="listenerIcon" aria-hidden="true"></span><div><h3>Listener Reactions</h3><p>Real moments from the community.</p></div></div><div class="reactionAtmosphere">${reactionWhispers}<i></i><i></i><i></i></div><div class="linerComposer"><div class="voiceAvatar gold">${initial}</div><textarea id="commentText" maxlength="500" placeholder="Share your moment with this album..."></textarea><input id="commentName" type="hidden" value="${escapeHtml(currentUsername()||"Listener")}"><div><span>&#9786;</span><em>0/500</em><button onclick="addAlbumComment('${albumId}')">Post</button></div></div><div class="reactionFilters"><button class="active">Top</button><button class="recentFilter">Recent</button><button class="friendsFilter">Friends</button></div><div id="listenerPull" class="listenerPull"><strong>0</strong><span>listener reactions so far</span></div><div id="commentsList" class="commentsList"><div class="emptyMini">Loading reactions...</div></div><button id="allReactionsButton" class="allReactions" onclick="toggleAllReactions()"><span>View all reactions</span><span class="allReactionsArrow" aria-hidden="true"></span></button></div></section><div id="trackRatingsList" class="albumTrackSections"><div class="emptyMini">Loading tracks...</div></div><section class="listenerCardsSection"><div class="listenerCardsHead"><h3>Listener reactions</h3><div><button aria-label="Previous reaction">&lsaquo;</button><button aria-label="Next reaction">&rsaquo;</button></div></div><div id="listenerCardsList" class="listenerCardsGrid"><div class="listenerCard empty">Loading reactions...</div></div></section><div class="linerPlayer"><div>${cover(a)}<div><strong>${escapeHtml(a.title)}</strong><span>${escapeHtml(a.artist)} ? ${escapeHtml(a.title)}</span></div></div><div><button>&#9664;</button><button class="playNow" id="albumPreviewPlay" onclick="playFirstAlbumPreview(this)">&#9654;</button><button>&#9654;</button></div></div></div>`;
  const heroDescription=$("#albumModalContent .linerHeroCopy > p:not(.eyebrow)");
  if(heroDescription){
    heroDescription.classList.add("albumHeroDescription");
    heroDescription._fullDescriptionHtml=heroDescription.innerHTML;
    heroDescription._fullDescriptionText=heroDescription.textContent.replace(/\s+/g," ").trim();
  }
  const artistHeading=$("#albumModalContent .linerHeroCopy h3");
  if(artistHeading)artistHeading.innerHTML=`<button type="button" class="linerArtistLink" onclick="event.stopPropagation();openArtistPage('${escapeJsString(artistSlugForName(a.artist))}')">${escapeHtml(a.artist)}</button> <span>&#9679;</span>`;
  const albumTabs=$("#albumModalContent .linerTabs");
  const ratingsTab=albumTabs?.querySelector('[data-album-tab="ratings"]');
  if(ratingsTab)ratingsTab.insertAdjacentHTML("beforebegin",'<button data-album-tab="info" onclick="setAlbumPopupTab(\'info\')">Details &amp; Credits</button>');
  const flip=$("#albumModalContent .linerCoverFlip");
  const reviewAtmosphere=$("#albumModalContent .reactionsPanel .reactionAtmosphere");
  const reviewComposer=$("#albumModalContent .reactionsPanel .linerComposer");
  if(reviewAtmosphere)reviewAtmosphere.classList.add("reviewAtmosphere");
  if(reviewComposer)reviewComposer.outerHTML=reviewComposerHtml(albumId);
  if(flip)flip.dataset.flipped="0";
  $("#albumModal").classList.remove("hidden");
  applyBackCoverHero(a);
  requestAnimationFrame(()=>{updateAlbumSeeMorePlacement();syncAlbumHeroDescriptionToggle()});
  setTimeout(()=>{updateAlbumSeeMorePlacement();syncAlbumHeroDescriptionToggle()},180);
  loadAlbumExtras(a);
}
window.toggleHeroInfluenceCard=function(card,event){
  if(event)event.preventDefault();
  if(!card||!card.classList.contains("is-collapsible"))return;
  const expanded=card.classList.toggle("is-expanded");
  card.setAttribute("aria-expanded",expanded?"true":"false");
};
function syncAlbumHeroDescriptionToggle(){
  const description=document.querySelector("#albumModal .albumHeroDescription");
  if(!description)return;
  const fullHtml=description._fullDescriptionHtml||description.innerHTML;
  const fullText=description._fullDescriptionText||description.textContent.replace(/\s+/g," ").trim();
  description._fullDescriptionHtml=fullHtml;
  description._fullDescriptionText=fullText;
  if(!window.matchMedia("(max-width: 850px)").matches){
    description.classList.remove("is-expanded");
    description.innerHTML=fullHtml;
    return;
  }
  const toggle='<button type="button" class="albumHeroDescriptionToggle" aria-expanded="false" onclick="toggleAlbumHeroDescription(this)">See more <span aria-hidden="true">&rarr;</span></button>';
  description.classList.remove("is-expanded");
  description.innerHTML=`${escapeHtml(fullText)} ${toggle}`;
  const lineHeight=parseFloat(getComputedStyle(description).lineHeight)||24;
  const maxHeight=lineHeight*4+.5;
  if(description.scrollHeight<=maxHeight){
    description.innerHTML=fullHtml;
    return;
  }
  let low=0,high=fullText.length;
  while(low<high){
    const mid=Math.ceil((low+high)/2);
    description.innerHTML=`${escapeHtml(fullText.slice(0,mid).trimEnd())}&hellip; ${toggle}`;
    if(description.scrollHeight<=maxHeight)low=mid;else high=mid-1;
  }
  let end=low;
  const wordBreak=fullText.lastIndexOf(" ",end);
  if(wordBreak>Math.max(0,end-24))end=wordBreak;
  description.innerHTML=`${escapeHtml(fullText.slice(0,end).trimEnd())}&hellip; ${toggle}`;
}
window.toggleAlbumHeroDescription=function(button){
  const description=button?.closest(".albumHeroDescription");
  if(!description?.classList.contains("albumHeroDescription"))return;
  const expanded=button.getAttribute("aria-expanded")!=="true";
  if(expanded){
    description.classList.add("is-expanded");
    description.innerHTML=`${description._fullDescriptionHtml} <button type="button" class="albumHeroDescriptionToggle" aria-expanded="true" onclick="toggleAlbumHeroDescription(this)">See less <span aria-hidden="true">&uarr;</span></button>`;
  }else{
    syncAlbumHeroDescriptionToggle();
  }
};
function scrollToSharedTrack(trackKeyValue){
  const key=String(trackKeyValue||"");
  if(!key)return;
  const target=document.querySelector(`#albumModal .linerTrackRow[data-track-key="${CSS.escape(key)}"]`);
  if(!target)return;
  document.querySelectorAll("#albumModal .linerTrackRow.sharedTrackTarget").forEach(row=>row.classList.remove("sharedTrackTarget"));
  target.classList.add("sharedTrackTarget");
  target.scrollIntoView({block:"center",behavior:"smooth"});
}
function handleMuzeDeepLink(){
  const artistSlug=artistSlugFromPath();
  if(artistSlug){navigateToArtist(artistSlug,{replace:true});return}
  const params=new URLSearchParams(location.search);
  const albumId=params.get("album");
  const track=params.get("track");
  if(!albumId)return;
  openAlbum(albumId);
  if(track){
    setTimeout(()=>scrollToSharedTrack(track),900);
    setTimeout(()=>scrollToSharedTrack(track),1700);
  }
}
window.deleteAlbum=async function(albumId){
  const album=state.albums.find(a=>String(a.id)===String(albumId));
  if(!album)return;
  if(!confirm(`Delete "${album.title}" from Muze?`))return;
  const ref=albumRef(albumId);
  if(String(albumId).startsWith("seed-")){
    const hidden=[...new Set([...hiddenSeedAlbums(),albumId])];
    saveHiddenSeedAlbums(hidden);
  }else if(db){
    await db.from("album_comment_replies").delete().eq("album_ref",ref);
    await db.from("album_comments").delete().eq("album_ref",ref);
    await db.from("track_ratings").delete().eq("album_ref",ref);
    await db.from("track_comments").delete().eq("album_ref",ref);
    const {error}=await db.from("albums").delete().eq("id",albumId);
    if(error){alert(error.message);return}
  }else{
    saveLocalAlbums(localAlbums().filter(a=>String(a.id)!==String(albumId)));
    const comments=localComments();delete comments[ref];saveLocalComments(comments);
    const commentReplies=localCommentReplies();delete commentReplies[ref];saveLocalCommentReplies(commentReplies);
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

window.rateAlbum=async function(albumId,value){
  if(!requireAuth("rate",()=>window.rateAlbum(albumId,value)))return;
  const username=ratingName();
  if(db&&!String(albumId).startsWith("seed-")){
    const userId=loggedInUser()?.id||null;
    let result=await db.from("ratings").upsert({album_id:albumId,device_id:state.deviceId,username,user_id:userId,rating:value},{onConflict:"album_id,device_id"});
    if(result.error&&/column|schema cache|user_id/i.test(result.error.message||"")){
      result=await db.from("ratings").upsert({album_id:albumId,device_id:state.deviceId,username,rating:value},{onConflict:"album_id,device_id"});
    }
    if(result.error){alert(result.error.message);return}
    localStorage.removeItem("musicaLocalRatings");
    await loadData();
    openAlbum(albumId);
  }else{
    let r=isLocalRuntime()?localRatings():{};
    r[albumId]=value;
    if(isLocalRuntime())saveLocalRatings(r);
    state.ratingMap=r;
    render();
    openAlbum(albumId);
  }
}
async function loadAllAlbumScoreRows(){
  const pageSize=1000;
  const rows=[];
  for(let from=0;;from+=pageSize){
    const to=from+pageSize-1;
    const result=await db.from("album_scores").select("*").order("avg_rating",{ascending:false}).range(from,to);
    if(result.error)throw result.error;
    const batch=result.data||[];
    rows.push(...batch);
    if(batch.length<pageSize)break;
  }
  return rows;
}
async function loadRawAlbumRows(){
  if(!db)return [];
  const fields="id,title,artist,year,genre,cover_url,spotify_url,summary,spotify_id,wikipedia_url,source_url";
  let result=await db.from("albums").select(fields).order("created_at",{ascending:false});
  if(result.error&&/wikipedia_url|source_url|schema cache|column/i.test(result.error.message||"")){
    result=await db.from("albums").select("id,title,artist,year,genre,cover_url,spotify_url,summary,spotify_id").order("created_at",{ascending:false});
  }
  if(result.error){
    console.warn("Muze raw album fallback failed",result.error.message||result.error);
    return [];
  }
  return (result.data||[]).map(album=>({...album,avg_rating:Number(album.avg_rating||0),ratings_count:Number(album.ratings_count||0)}));
}
function mergeAlbumSources(primary=[],fallback=[]){
  const byId=new Set(primary.map(album=>String(album.id||"")).filter(Boolean));
  const rows=primary.slice();
  fallback.forEach(album=>{
    const id=String(album.id||"");
    if(id&&byId.has(id))return;
    rows.push(album);
    if(id)byId.add(id);
  });
  return dedupeAlbumRows(rows);
}
const ALBUM_BOOT_CACHE_KEY="muzeAlbumBootCache:v2";
function cachedBootAlbums(){try{const rows=JSON.parse(localStorage.getItem(ALBUM_BOOT_CACHE_KEY)||"[]");return Array.isArray(rows)?rows.filter(album=>album&&album.id&&album.title):[]}catch(error){return []}}
function saveBootAlbums(rows){try{localStorage.setItem(ALBUM_BOOT_CACHE_KEY,JSON.stringify((rows||[]).slice(0,1200)))}catch(error){}}
function materializedBootAlbums(){return state.albums.map(album=>({...album,admin_score:score(album),admin_ratings_count:count(album),genre:albumGenreLabel(album)}))}
function showSavedAlbumImmediately(album){
  if(!album)return null;
  const visibleAlbum={...album,avg_rating:Number(album.avg_rating||0),ratings_count:Number(album.ratings_count||0),genre:albumGenreLabel(album)};
  const existing=state.albums.find(item=>String(item.id||"")&&String(item.id)===String(visibleAlbum.id))||existingAlbumMatch(visibleAlbum);
  if(existing)return existing;
  state.albums=dedupeAlbumRows([visibleAlbum,...state.albums]);
  render();
  return visibleAlbum;
}
async function loadData(){
  state.dataReady=false;
  render();
  const directArtistSlug=artistSlugFromPath();
  if(db&&directArtistSlug){
    state.dataReady=true;state.view="artist-profile";
    const directArtistResult=await loadArtistProfile(directArtistSlug);
    if(directArtistResult?.usedDatabase){deepLinkHandled=true;return}
    state.dataReady=false;state.view="rankings";render();
  }
  if(!db){
    $("#setupWarning").classList.remove("hidden");
    const localOnly=isLocalRuntime();
    state.albums=dedupeAlbumRows([...seedAlbums.filter(a=>!hiddenSeedAlbums().includes(a.id)),...(localOnly?localAlbums():[])]);
    state.albums=state.albums.map(a=>({...a,genre:albumGenreLabel(a)}));
    state.ratingMap=localOnly?localRatings():{};
    primeProtectedOverviews();
    applyCachedCovers();
    state.dataReady=true;
    render();
    warmArtistDirectory();
    if(!deepLinkHandled){deepLinkHandled=true;setTimeout(handleMuzeDeepLink,120)}
    hydrateMissingCovers();
    loadCustomOverviews().then(()=>{applyCachedCovers();render();warmArtistDirectory()}).catch(error=>console.warn("Muze overview scores could not be loaded",error));
    return;
  }
  localStorage.removeItem("musicaLocalAlbums");
  const bootAlbums=cachedBootAlbums();
  if(bootAlbums.length){
    state.albums=bootAlbums;
    primeProtectedOverviews();
    applyCachedCovers();
    state.dataReady=true;
    render();
    warmArtistDirectory();
  }
  let albums=[];
  let rawAlbums=[];
  const [scoreResult,rawResult]=await Promise.allSettled([loadAllAlbumScoreRows(),loadRawAlbumRows()]);
  if(scoreResult.status==="fulfilled")albums=scoreResult.value;
  else console.error("Muze album load failed",scoreResult.reason);
  if(rawResult.status==="fulfilled")rawAlbums=rawResult.value;
  else console.warn("Muze raw album fallback failed",rawResult.reason);
  state.albums=mergeAlbumSources([...seedAlbums,...albums],rawAlbums);
  if(!state.albums.length){state.albums=seedAlbums}
  state.albums=state.albums.map(a=>({...a,genre:albumGenreLabel(a)}));
  primeProtectedOverviews();
  applyCachedCovers();
  state.dataReady=true;
  render();
  warmArtistDirectory();
  if(!deepLinkHandled){deepLinkHandled=true;setTimeout(handleMuzeDeepLink,120)}
  hydrateMissingCovers();
  const [ratingsResult,overviewsResult]=await Promise.allSettled([
    db.from("ratings").select("album_id,rating").eq("device_id",state.deviceId),
    loadCustomOverviews()
  ]);
  if(ratingsResult.status==="fulfilled"){
    const {data:ratings,error:ratingsError}=ratingsResult.value;
    state.ratingMap=ratingsError?{}:Object.fromEntries((ratings||[]).map(r=>[r.album_id,r.rating]));
  }else state.ratingMap={};
  if(overviewsResult.status==="rejected")console.warn("Muze overview scores could not be loaded",overviewsResult.reason);
  applyCachedCovers();
  saveBootAlbums(materializedBootAlbums());
  render();
  warmArtistDirectory();
}function openSpotifyAdd(target){
  extras.spotifyTarget=target||"musica";
  const title=$("#addModalTitle");
  const copy=$("#addModalCopy");
  if(title)title.textContent=extras.spotifyTarget==="library"?"Add album to your library":"Search Album";
  if(copy)copy.textContent=extras.spotifyTarget==="library"?"Search an Album and Artist.":"Search an Album and Artist.";
  const status=$("#spotifyStatus");
  const results=$("#spotifyResults");
  if(status)status.textContent="";
  if(results)results.innerHTML="";
  $("#addModal").classList.remove("hidden");
}
window.openLibrarySpotifyAdd=function(){if(!requireAuth("save",window.openLibrarySpotifyAdd))return;openSpotifyAdd("library")}
async function searchSpotify(){
  const q=$("#spotifyQuery").value.trim();
  if(!q)return;
  $("#spotifyStatus").textContent="Searching Spotify...";
  $("#spotifyResults").innerHTML="";
  try{
    let albums=[];
    let usedFallback=false;
    try{
      const res=await fetch(`/.netlify/functions/album-search?q=${encodeURIComponent(q)}&v=final3`,{cache:"no-store"});
      const text=await res.text();
      let data;
      try{data=JSON.parse(text)}catch(parseError){throw new Error("Spotify function is not returning JSON yet.")}
      if(!res.ok)throw new Error(data.error||"Spotify search failed.");
      albums=data.albums||[];
    }catch(spotifyError){
      console.warn("[Muze] Spotify album search unavailable, using backup search",spotifyError?.message||spotifyError);
      albums=await searchItunesAlbums(q);
      usedFallback=true;
    }
    $("#spotifyStatus").textContent=albums.length?(usedFallback?"Spotify is temporarily unavailable. Showing backup album results:":"Choose an album:"):"No results found.";
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
    document.querySelectorAll("#spotifyResults .bigBtn").forEach(button=>{button.onclick=()=>addSpotifyAlbum(albums[Number(button.dataset.index)],button)});
  }catch(e){
    $("#spotifyStatus").textContent=e.message;
  }
}
async function saveSpotifyAlbumRecord(album){
  if(db){
    const payload={title:album.title,artist:album.artist,year:album.year,genre:album.genre,cover_url:album.cover_url,spotify_url:album.spotify_url,summary:album.summary};
    const {data,error}=await db.from("albums").insert(payload).select().single();
    if(error)throw error;
    return data||payload;
  }
  const savedAlbum={...album,id:"local-"+Date.now(),avg_rating:0,ratings_count:0};
  let arr=localAlbums();arr.push(savedAlbum);saveLocalAlbums(arr);
  return savedAlbum;
}
window.addSpotifyAlbum=async function(a,button){
  if(extras.spotifyTarget==="library"&&!requireAuth("save",()=>window.addSpotifyAlbum(a,button)))return;
  const status=$("#spotifyStatus");
  if(a.source==="muze"||a.id){
    const existing=state.albums.find(album=>String(album.id)===String(a.id))||existingAlbumMatch(a);
    if(existing){
      if(extras.spotifyTarget==="library"){
        await addAlbumToMyLibrary(existing);
        if(status)status.textContent=`Added "${existing.title}" to your library.`;
      }else{
        $("#addModal").classList.add("hidden");
        openAlbum(existing.id);
      }
      return;
    }
  }
  const album={title:a.title,artist:a.artist,year:a.year,genre:albumGenreLabel(a),cover_url:a.cover_url,spotify_url:a.spotify_url,summary:spotifyAlbumSummary(a)};
  const lockKey=String(`${album.artist}::${album.title}`).toLowerCase();
  extras.spotifyAddLocks=extras.spotifyAddLocks||{};
  if(extras.spotifyAddLocks[lockKey])return;
  extras.spotifyAddLocks[lockKey]=true;
  const originalText=button?button.textContent:"";
  if(button){button.disabled=true;button.textContent="Adding...";button.classList.add("isAdding")}
  let duplicate=existingAlbumMatch(album);
  let savedAlbum=duplicate;
  if(status)status.textContent=duplicate?"Album already exists in Muze.":"Adding album to Muze...";
  try{
    if(!savedAlbum){
      savedAlbum=await saveSpotifyAlbumRecord(album);
      savedAlbum=showSavedAlbumImmediately(savedAlbum)||savedAlbum;
      await loadData();
      savedAlbum=existingAlbumMatch(album)||showSavedAlbumImmediately(savedAlbum)||savedAlbum;
    }
    if(extras.spotifyTarget==="library"){
      const added=await addAlbumToMyLibrary(savedAlbum);
      if(added&&status)status.textContent=duplicate?'Added the existing Muze album to your public library.':'Added to Muze and your public library.';
      if(button){button.textContent="Added";button.classList.remove("isAdding");button.classList.add("isAdded")}
      render();
      const mine=currentLibraryCard();
      if(mine&&!$("#albumModal")?.classList.contains("hidden"))openLibraryDetails(mine);
      return;
    }
    if(duplicate){
      if(status)status.textContent=`"${duplicate.title}" by ${duplicate.artist} is already in Muze. Use the hover button or album page to add it to your library.`;
      if(button){button.textContent="Already added";button.classList.remove("isAdding");button.classList.add("isAdded")}
      return;
    }
    if(status)status.textContent='Added to Muze. You can keep adding more albums.';
    if(button){button.textContent="Added";button.classList.remove("isAdding");button.classList.add("isAdded")}
  }catch(error){
    console.error("Muze album add failed",error);
    if(status)status.textContent=error.message||"Album could not be added.";
    else alert(error.message||"Album could not be added.");
    if(button){button.disabled=false;button.textContent=originalText||"Add";button.classList.remove("isAdding")}
  }finally{
    delete extras.spotifyAddLocks[lockKey];
  }
};
function openNav(){$("#sideNav").classList.add("open");$("#navOverlay").classList.remove("hidden")}function closeNav(){$("#sideNav").classList.remove("open");$("#navOverlay").classList.add("hidden")}
function closeTopbarChat(){const panel=$("#topbarChatPanel");const button=$("#topbarChatButton");if(panel){panel.classList.remove("keyboardOpen");panel.classList.add("hidden")}if(button&&!document.body.classList.contains("chatView")){button.classList.remove("active");button.setAttribute("aria-expanded","false")}}
async function openTopbarChat(){const panel=$("#topbarChatPanel");const button=$("#topbarChatButton");const panelContent=$("#topbarChatContent");if(!panel||!panelContent)return;$("#notificationPanel")?.classList.add("hidden");panel.classList.remove("hidden");installMobileChatViewportSync();syncMobileChatViewport();if(button){button.classList.add("active");button.setAttribute("aria-expanded","true")}try{await Promise.all([loadLibraries(),loadChatMessages(),loadChatSelfStats(),loadUserPresence()])}catch(error){console.warn("Unable to refresh chat people",error)}chatView(panelContent);closeNav()}
function toggleTopbarChat(){const panel=$("#topbarChatPanel");if(panel&&!panel.classList.contains("hidden"))closeTopbarChat();else openTopbarChat()}
updateNavUsername();$("#topbarChatButton").onclick=e=>{e.stopPropagation();toggleTopbarChat()};$("#topbarChatPanel").onclick=e=>{if(e.target&&e.target.id==="topbarChatPanel")closeTopbarChat();else e.stopPropagation()};$("#notificationBell").onclick=async e=>{e.stopPropagation();closeTopbarChat();const panel=$("#notificationPanel");panel.classList.toggle("hidden");await refreshNotifications();if(panel&&!panel.classList.contains("hidden")&&unreadNotificationCount()>0){const library=myPublishedLibrary();localStorage.setItem(followerSeenKey(),String(Number(library?.followers_count||0)));await markNotificationsRead();renderNotifications()}};$("#notificationPanel").onclick=e=>e.stopPropagation();document.addEventListener("click",()=>{$("#notificationPanel")?.classList.add("hidden");closeTopbarChat()});$("#navSetUsername").onclick=openNavProfileMenu;$("#adminOverviewUnlock").onclick=unlockOverviewAdmin;syncAdminUnlockButton();$("#menuBtn").onclick=openNav;$("#closeNav").onclick=closeNav;$("#navOverlay").onclick=closeNav;$("#addAlbumBtn").onclick=()=>openSpotifyAdd("musica");$("#navAddAlbum").onclick=()=>{openSpotifyAdd("musica");closeNav()};$("#spotifySearchBtn").onclick=searchSpotify;$("#spotifyQuery").addEventListener("keydown",e=>{if(e.key==="Enter")searchSpotify()});$("#authButton").onclick=()=>openAuthModal(loggedInUser()?"Manage your Muze session.":"Log in to join the conversation.");$("#authLoginMode").onclick=()=>showAuthEmailForm("login");$("#authSignupMode").onclick=()=>showAuthEmailForm("signup");$("#libraryAccessLogin").onclick=()=>showLibraryAccessAuthForm("login");$("#libraryAccessSignup").onclick=()=>showLibraryAccessAuthForm("signup");$("#authEmailContinue").onclick=continueAuthEmail;$("#authGoogleLogin").onclick=()=>startOAuthSignup("google");$("#authSpotifyLogin").onclick=()=>startOAuthSignup("spotify");$("#authFacebookLogin").onclick=()=>startOAuthSignup("facebook");$("#continueEmailSignup").onclick=()=>showAuthEmailForm("signup");$("#continueGoogleSignup").onclick=()=>startOAuthSignup("google");$("#continueSpotifySignup").onclick=()=>startOAuthSignup("spotify");$("#continueFacebookSignup").onclick=()=>startOAuthSignup("facebook");$("#authForm").onsubmit=submitAuth;$("#authLogout").onclick=logoutAuth;$("#editAvatarButton").onclick=()=>showAvatarSetup(true);$("#avatarEditorBack").onclick=hideAvatarSetup;$("#avatarEditReveal").onclick=openAvatarEditControls;$("#avatarUploadTab").onclick=()=>setAvatarMode("upload");$("#avatarCreateTab").onclick=()=>setAvatarMode("create");document.querySelectorAll(".avatarStyleChoice").forEach(button=>button.onclick=()=>applyAvatarStyle(button.dataset.avatarStyle||"editorial"));document.querySelectorAll(".avatarColorChoice").forEach(button=>button.onclick=()=>applyAvatarSkin(button.dataset.avatarSkin||"#c98f63"));$("#avatarPhotoInput").onchange=handleAvatarPhotoSelected;const saveUsernameButton=$("#saveUsernameButton");if(saveUsernameButton){saveUsernameButton.onclick=handleSaveUsernameAction;saveUsernameButton.addEventListener("pointerup",handleSaveUsernameAction);saveUsernameButton.addEventListener("touchend",handleSaveUsernameAction,{passive:false})}$("#profileUsernameInput")?.addEventListener("keydown",e=>{if(e.key==="Enter")handleSaveUsernameAction(e)});avatarControlFields().forEach(([id])=>{$("#"+id)?.addEventListener("input",()=>{state.avatarConfig=readAvatarControls();syncAvatarControls()})});if($("#randomizeAvatarButton"))$("#randomizeAvatarButton").onclick=()=>applyAvatarConfig(randomAvatarConfig());if($("#saveFavoriteAvatarButton"))$("#saveFavoriteAvatarButton").onclick=()=>{localStorage.setItem("muzeFavoriteAvatarConfig",JSON.stringify(readAvatarControls()));setAuthStatus("Favorite avatar look saved.","success")};if($("#loadFavoriteAvatarButton"))$("#loadFavoriteAvatarButton").onclick=()=>{try{const saved=JSON.parse(localStorage.getItem("muzeFavoriteAvatarConfig")||"null");if(saved)applyAvatarConfig(saved);else setAuthStatus("No favorite avatar look saved yet.","error")}catch(e){setAuthStatus("Favorite avatar look could not be loaded.","error")}};const saveAvatarButton=$("#saveAvatarButton");if(saveAvatarButton){saveAvatarButton.onclick=handleSaveAvatarAction;saveAvatarButton.addEventListener("pointerup",handleSaveAvatarAction);saveAvatarButton.addEventListener("touchend",handleSaveAvatarAction,{passive:false})}$("#skipAvatarButton").onclick=hideAvatarSetup;
if($("#avatarCategoryToggle"))$("#avatarCategoryToggle").onclick=toggleAvatarCategoryMenu;
document.querySelectorAll("#avatarCategoryMenu [data-avatar-category]").forEach(button=>button.onclick=()=>setAvatarCategory(button.dataset.avatarCategory||"face"));
document.addEventListener("click",e=>{if(!e.target.closest(".avatarCategoryDropdown")){$("#avatarCategoryMenu")?.classList.add("hidden");$("#avatarCategoryToggle")?.setAttribute("aria-expanded","false")}});
document.querySelectorAll("[data-avatar-type]").forEach(button=>button.onclick=()=>applyAvatarType(button.dataset.avatarType||"androgynous"));
$("#avatarType")?.addEventListener("change",e=>applyAvatarType(e.target.value));
$("#authLogout")?.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();logoutAuth()});
function closeAlbumPopup(){stopTrackPreview();$("#albumModal").classList.add("hidden")}$("#closeAlbumModal").onclick=closeAlbumPopup;$("#closeAddModal").onclick=()=>$("#addModal").classList.add("hidden");$("#closeAuthModal").onclick=closeAuthModal;$("#albumModal").onclick=e=>{if(e.target.id==="albumModal")closeAlbumPopup()};$("#addModal").onclick=e=>{if(e.target.id==="addModal")$("#addModal").classList.add("hidden")};$("#authModal").onclick=e=>{if(e.target.id==="authModal")closeAuthModal()};
function goHome(){state.view="rankings";state.artistProfile=null;state.artistProfileAlbums=[];document.querySelectorAll(".tab,.navItem[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view==="rankings"));render();closeNav();window.scrollTo({top:0,behavior:"smooth"})}
async function navigateToView(view){
  if(view==="libraries"&&!loggedInUser()){
    openLibrariesAuthPrompt();
    closeNav();
    return;
  }
  if(artistSlugFromPath())history.pushState({musica:"inside",view},"","/");
  state.view=view;
  state.artistProfile=null;state.artistProfileAlbums=[];state.artistEditing=false;
  if(state.view==="libraries"||state.view==="chat"){
    try{await Promise.all([loadLibraries(),loadChatMessages(),loadUserPresence()])}
    catch(error){console.warn("Unable to load libraries",error);extras.libraries=localLibraries();renderNotifications()}
  }
  document.querySelectorAll(".tab,.navItem[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view===state.view));
  render();
  closeNav();
}
function rememberSiteState(){const slug=artistSlugFromPath();if(slug){history.replaceState({musica:"artist",artistSlug:slug},"",location.href);return}if(!history.state||!history.state.musica)history.replaceState({musica:"home"},"");history.pushState({musica:"inside",view:state.view},"")}
rememberSiteState();
window.addEventListener("resize",()=>requestAnimationFrame(updateAlbumSeeMorePlacement));
$("#albumModal")?.addEventListener("scroll",()=>requestAnimationFrame(updateAlbumSeeMorePlacement),{passive:true});
window.addEventListener("popstate",event=>{
  const slug=artistSlugFromPath();
  if(slug){state.view="artist-profile";loadArtistProfile(slug);return}
  if(!$("#authModal").classList.contains("hidden")){closeAuthModal();return}
  if(!$("#albumModal").classList.contains("hidden")){closeAlbumPopup();return}
  if(!$("#addModal").classList.contains("hidden")){$("#addModal").classList.add("hidden");return}
  const returnView=event.state?.view||"rankings";
  state.view=returnView;state.artistProfile=null;state.artistProfileAlbums=[];
  document.querySelectorAll(".tab,.navItem[data-view]").forEach(item=>item.classList.toggle("active",item.dataset.view===returnView));
  render();
  if(event.state?.albumId)setTimeout(()=>openAlbum(event.state.albumId),0);
});
let navViewPointerAt=0;
function handleNavViewAction(event){
  const target=event?.currentTarget;
  const view=target?.dataset?.view;
  if(!view)return;
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const now=Date.now();
  if(event?.type==="click"&&now-navViewPointerAt<500)return;
  if(event?.type==="pointerup"||event?.type==="touchend")navViewPointerAt=now;
  navigateToView(view);
}
document.querySelectorAll(".tab,.navItem[data-view]").forEach(t=>{t.onclick=handleNavViewAction;t.addEventListener("pointerup",handleNavViewAction);t.addEventListener("touchend",handleNavViewAction,{passive:false})});
$("#searchInput").oninput=e=>{state.search=e.target.value;scheduleHomeSearchRender()};$("#genreFilter").onchange=e=>{state.genre=e.target.value;render()};$("#sortSelect").onchange=e=>{state.sort=e.target.value;render()};const themeToggle=$("#themeToggle");function syncThemeToggle(){if(themeToggle)themeToggle.setAttribute("aria-label",document.body.classList.contains("light")?"Switch to dark mode":"Switch to light mode")}syncThemeToggle();themeToggle.onclick=()=>{document.body.classList.toggle("light");state.theme=document.body.classList.contains("light")?"light":"dark";localStorage.setItem("musicaThemePreference",state.theme);syncThemeToggle()};
document.addEventListener("visibilitychange",()=>{if(document.hidden)updateOwnPresence(false);else startPresenceHeartbeat()});
window.addEventListener("pagehide",()=>updateOwnPresence(false));
initAuth();
loadData().catch(error=>{
  console.error("Muze data initialization failed",error);
  state.dataReady=true;
  state.artistProfileError="Muze could not finish loading artist data.";
  render();
});






































window.playFirstAlbumPreview=function(button){const ref=extras.currentAlbumId;const track=(extras.tracks[ref]||[]).find(t=>t.preview_url);if(!track){alert("Spotify does not provide 30 second samples for this album.");return}playTrackPreview(previewPayload(track),button)};






















































































