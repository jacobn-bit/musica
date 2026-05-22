const seedAlbums=[
{id:"seed-1",title:"Abbey Road",artist:"The Beatles",year:1969,genre:"Rock",avg_rating:9.4,ratings_count:18432,tag:"Classic",summary:"Polished, melodic, and endlessly replayable.",spotify_url:"https://open.spotify.com/search/The%20Beatles%20Abbey%20Road",cover_url:""},
{id:"seed-2",title:"To Pimp a Butterfly",artist:"Kendrick Lamar",year:2015,genre:"Hip-Hop",avg_rating:9.3,ratings_count:22102,tag:"Modern classic",summary:"Dense, political, jazz-infused, and emotionally huge.",spotify_url:"https://open.spotify.com/search/Kendrick%20Lamar%20To%20Pimp%20a%20Butterfly",cover_url:""},
{id:"seed-3",title:"OK Computer",artist:"Radiohead",year:1997,genre:"Alternative",avg_rating:9.2,ratings_count:20110,tag:"Essential",summary:"Alienation, technology, beauty, and dread in one perfect arc.",spotify_url:"https://open.spotify.com/search/Radiohead%20OK%20Computer",cover_url:""},
{id:"seed-4",title:"Songs in the Key of Life",artist:"Stevie Wonder",year:1976,genre:"Soul",avg_rating:9.2,ratings_count:11240,tag:"Masterpiece",summary:"Warm, ambitious, human, and full of life.",spotify_url:"https://open.spotify.com/search/Stevie%20Wonder%20Songs%20in%20the%20Key%20of%20Life",cover_url:""},
{id:"seed-5",title:"Illmatic",artist:"Nas",year:1994,genre:"Hip-Hop",avg_rating:9.1,ratings_count:16650,tag:"Essential",summary:"Compact, cinematic, and one of rap's purest statements.",spotify_url:"https://open.spotify.com/search/Nas%20Illmatic",cover_url:""},
{id:"seed-6",title:"Rumours",artist:"Fleetwood Mac",year:1977,genre:"Pop Rock",avg_rating:9.0,ratings_count:15100,tag:"Timeless",summary:"Perfect songwriting wrapped in heartbreak and tension.",spotify_url:"https://open.spotify.com/search/Fleetwood%20Mac%20Rumours",cover_url:""}
];

const cfg=window.MUSICA_CONFIG||{};
const SUPABASE_URL=cfg.SUPABASE_URL||cfg.VITE_SUPABASE_URL||window.VITE_SUPABASE_URL||"";
const SUPABASE_ANON_KEY=cfg.SUPABASE_ANON_KEY||cfg.VITE_SUPABASE_ANON_KEY||window.VITE_SUPABASE_ANON_KEY||"";
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
const db=configured?window.supabase.createClient(SUPABASE_URL.trim(),SUPABASE_ANON_KEY.trim()):null;
const MUSICA_CLIENT_DATA_VERSION="mobile-live-score-reset-2026-05-18-6";
function isLocalRuntime(){return location.protocol==="file:"||["localhost","127.0.0.1",""].includes(location.hostname)}
function resetStaleClientData(){
  try{
    const previous=localStorage.getItem("musicaClientDataVersion");
    if(previous!==MUSICA_CLIENT_DATA_VERSION){
      ["musicaCustomOverviews","musicaLocalAlbums","musicaLocalRatings"].forEach(key=>localStorage.removeItem(key));
      localStorage.setItem("musicaClientDataVersion",MUSICA_CLIENT_DATA_VERSION);
    }
    if("serviceWorker" in navigator){navigator.serviceWorker.getRegistrations().then(registrations=>registrations.forEach(reg=>reg.unregister())).catch(()=>{})}
    if(window.caches){caches.keys().then(keys=>keys.forEach(key=>caches.delete(key))).catch(()=>{})}
  }catch(error){}
}
resetStaleClientData();
const state={view:"rankings",search:"",genre:"All",sort:"score",artistLetter:"All",artistGenre:"All",artistSearch:"",albums:[],ratingMap:{},theme:localStorage.getItem("musicaThemePreference")==="light"?"light":"dark",deviceId:localStorage.getItem("musicaDeviceId")||crypto.randomUUID(),authSession:null,authMode:"login",pendingAuthAction:null};
const extras={tracks:{},trackRatings:{},songScores:{},ratingDetails:{},trackRatingDetails:{},comments:{},commentReplies:{},libraries:[],overviews:{},currentAlbumId:null,spotifyTarget:"musica",previewAudio:null,previewKey:null};
localStorage.setItem("musicaDeviceId",state.deviceId);
if(state.theme==="light")document.body.classList.add("light");
const $=s=>document.querySelector(s),content=$("#content");
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
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
  if(/invalid api key|api key/i.test(message))return "Supabase rejected the public anon key. Replace config.js or Netlify VITE_SUPABASE_ANON_KEY with the anon key from your Supabase project settings.";
  if(/rate limit|too many|over email send rate limit/i.test(message))return "Supabase is rate limiting confirmation emails. Wait a few minutes, then try again.";
  if(/invalid login credentials/i.test(message))return "Email or password is incorrect.";
  if(/user already registered|already registered|already exists/i.test(message))return "That email already has a Muze account. Try logging in instead.";
  if(/password/i.test(message)&&/(weak|short|least|characters|min)/i.test(message))return message;
  if(/email/i.test(message)&&/invalid/i.test(message))return "Enter a valid email address.";
  return message;
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
  const localHosts=["localhost","127.0.0.1","::1"];
  const redirectTo=localHosts.includes(window.location.hostname)?window.location.origin:"https://musica-rating.netlify.app";
  setAuthStatus(`Opening ${providerName} login...`,"");
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
  if(buttonLabel)buttonLabel.textContent=user?(currentUsername()?`@${currentUsername()}`:"Account"):"Login / Sign Up";
  const title=$("#authTitle");
  const prompt=$("#authPrompt");
  if(user&&title)title.textContent="Your Muze account";
  if(user&&prompt)prompt.textContent="Manage your Muze session.";
  $("#authLoggedOut")?.classList.toggle("hidden",!!user);
  $("#authLoggedIn")?.classList.toggle("hidden",!user);
  const email=$("#authUserEmail");
  if(email)email.textContent=user?.email||"your account";
  updateNavUsername();
}
function openAuthModal(message="Log in to join the conversation."){
  const modal=$("#authModal");
  const prompt=$("#authPrompt");
  modal?.classList.remove("libraryAccessModal");
  modal?.classList.remove("libraryAuthFlow");
  $("#authModal .authPanel")?.classList.remove("libraryAccessPanel");
  $("#libraryAccessCard")?.classList.add("hidden");
  $("#authLoggedOut")?.classList.toggle("hidden",!!loggedInUser());
  if(prompt)prompt.textContent=message;
  if(modal){modal.classList.remove("hidden");modal.setAttribute("aria-hidden","false")}
  if(!loggedInUser())showAuthEmailForm("login");
  syncAuthUi();
}
function closeAuthModal(){
  const modal=$("#authModal");
  if(modal){modal.classList.add("hidden");modal.setAttribute("aria-hidden","true")}
  modal?.classList.remove("libraryAccessModal");
  modal?.classList.remove("libraryAuthFlow");
  $("#authModal .authPanel")?.classList.remove("libraryAccessPanel");
  $("#libraryAccessCard")?.classList.add("hidden");
  $("#signupOnboarding")?.classList.add("hidden");
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
    syncAuthUi();
    closeAuthModal();
    resumePendingAuthAction();
  }catch(error){
    authDebug("submit exception",{message:error.message,stack:error.stack});
    setAuthStatus(error.message||"Could not reach Supabase Auth. Check your internet connection and Supabase project settings.","error");
  }finally{
    if(submit)submit.disabled=false;
  }
}
async function logoutAuth(){
  if(!db)return;
  const {error}=await db.auth.signOut();
  if(error){setAuthStatus(error.message,"error");return}
  state.authSession=null;
  syncAuthUi();
  setAuthStatus("Logged out.","success");
}
async function initAuth(){
  authDebug("init",{configured,urlHost:supabaseUrlHost(),hasAnonKey:Boolean(SUPABASE_ANON_KEY)});
  if(!db){syncAuthUi();return}
  const {data,error}=await db.auth.getSession();
  if(error)authDebug("get session error",{message:error.message,status:error.status,name:error.name});
  state.authSession=data?.session||null;
  syncAuthUi();
  db.auth.onAuthStateChange((event,session)=>{
    authDebug("state change",{event,hasSession:Boolean(session),email:session?.user?.email||null});
    const wasLoggedOut=!loggedInUser();
    state.authSession=session||null;
    syncAuthUi();
    if(wasLoggedOut&&session)resumePendingAuthAction();
  });
}
window.requireAuth=requireAuth;
window.gateLikeAction=function(){requireAuth("like",()=>window.gateLikeAction())}
function spotifyAlbumSummary(a){const year=a.year||String(a.release_date||"").slice(0,4);const trackCount=Number(a.total_tracks||0);const type=(a.album_type||"album").replace(/_/g," ");let parts=[];if(year)parts.push(`released in ${year}`);if(trackCount)parts.push(`${trackCount} track${trackCount===1?"":"s"}`);const detail=parts.length?` This ${type} was ${parts.join(" with ")}.`:"";return `${a.title} by ${a.artist}.${detail}`}
function cleanAlbumSummary(a){const generated=spotifyAlbumSummary(a);let summary=String(a.summary||generated||"Added to Muze.");summary=summary.replace(/\s+was added from Spotify\./i,".");summary=summary.replace(/^Added from Spotify\.?$/i,generated);summary=summary.replace(/\.\s*\./g,".");return summary}
const genreRules=[
  {label:"Progressive Metal",tests:["progressive metal","prog metal","tool lateralus"]},
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
  "the offspring::smash":"Punk Rock"
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
  "nirvana":"Alternative Rock",
  "kendrick lamar":"Hip-Hop",
  "nas":"Hip-Hop",
  "stevie wonder":"Soul"
};
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
function albumGenreLabel(album){
  const artist=normalizeArtistKey(album?.artist);
  const title=normalizeMatchKey(album?.title);
  const direct=validGenreCandidate(album?.genre)?normalizeGenreLabel(album.genre)||String(album.genre).trim():"";
  if(direct)return direct;
  for(const candidate of albumArtistGenreCandidates(album)){const label=normalizeGenreLabel(candidate);if(label)return label}
  for(const candidate of albumStoredGenreCandidates(album)){const label=normalizeGenreLabel(candidate);if(label)return label}
  const exact=albumGenreOverrides[`${artist}::${title}`]||partialOverrideLookup(albumGenreOverrides,`${artist}::${title}`);
  if(exact)return exact;
  const artistLabel=partialOverrideLookup(artistGenreOverrides,artist);
  if(artistLabel)return artistLabel;
  for(const candidate of [`${artist} ${title}`,artist]){const label=normalizeGenreLabel(candidate);if(label)return label}
  return "Album";
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
  let opening=exact?exact[1]:(hasRealSummary?saved:`${title} finds ${artist} building a world with its own mood, pace, and personality.`);
  const lowerGenre=genre.toLowerCase();
  const genreLines={
    "punk":"The record thrives on speed, impact, and directness, with songs that hit quickly and leave a charge behind.",
    "rock":"Its guitars, melodies, and sense of momentum give it the feel of a record made to be argued over, replayed, and rediscovered.",
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
  const genreLine=genreLines[lowerGenre]||genreLines[Object.keys(genreLines).find(g=>lowerGenre.includes(g))]||"Its identity comes through in the details: the sequencing, the sound, and the way individual tracks start to connect into a larger mood.";
  const era=Number(year)||0;
  const eraLine=era>=2020?`As a newer release, ${title} still feels open-ended, with its reputation being shaped in real time by listeners.`:era>=2000?`From the ${Math.floor(era/10)*10}s, it carries the sound of a period when albums were stretching between old scenes and new listening habits.`:era>=1990?`Coming out of the ${Math.floor(era/10)*10}s, it has the kind of immediacy that still cuts through decades later.`:era?`Heard now, its ${year} setting gives the record a sense of history without making it feel distant.`:`Heard now, it feels less tied to a date than to a particular state of mind.`;
  const scoreLine=rating>=9?`The ${rating.toFixed(1)} community score suggests listeners are treating it as essential, not just enjoyable.`:rating>=7?`Its ${rating.toFixed(1)} community score points to a record with real supporters and enough character to keep the conversation moving.`:rating>0?`Its ${rating.toFixed(1)} community score leaves room for debate, which can make the album more interesting than a simple consensus pick.`:`As ratings come in, its place in the community will start to reveal itself track by track.`;
  return `${opening} ${genreLine} ${eraLine} ${scoreLine}`;
}
const customAlbumOverviews={
  "thriller": "Thriller is more than just a blockbuster album, it’s the moment pop music became cinematic. Building on the sleek disco-funk foundations of Off the Wall, Michael Jackson and producer Quincy Jones crafted a record that fused pop, funk, rock, soul, and spectacle into something universal. From the razor-sharp groove of “Billie Jean” to the explosive crossover energy of “Beat It” and the theatrical horror of “Thriller,” every track feels engineered for maximum impact. At the height of his powers, Jackson balanced charisma, vulnerability, paranoia, and ambition with unmatched precision, creating an album that didn’t just dominate the charts, it reshaped the possibilities of mainstream music. Decades later, Thriller remains less like an album and more like a cultural event permanently frozen in time.",
  "revolver": "Revolver captures The Beatles at the moment they stopped treating the studio as a place to record songs and started using it as an instrument itself. Layered with tape loops, backward guitars, distorted textures, and psychedelic experimentation, the album pushed rock music into entirely new territory. Tracks like “Tomorrow Never Knows” feel less like traditional pop songs and more like immersive soundscapes, while “Eleanor Rigby” introduced a striking emotional maturity rarely heard in mainstream music at the time. Influenced by LSD, avant-garde composition, and Eastern spirituality, the band expanded far beyond their early pop roots, blending innovation with unforgettable songwriting. From the biting groove of “Taxman” to the dreamlike haze of “I’m Only Sleeping,” every track feels like a band redefining what modern music could become. By the time Revolver was released, the Beatles had already outgrown the limits of live performance, and stepped into a completely different artistic world.",
  "blood on the tracks": "This is Bob Dylan at his most vulnerable, turning heartbreak and emotional collapse into something timeless. Written during the breakdown of his marriage, the album blends intimate storytelling with raw, restless emotion, capturing love, regret, anger, and memory with extraordinary precision. From the winding reflections of “Tangled Up in Blue” to the bitterness of “Idiot Wind” and the aching tenderness of “You’re a Big Girl Now,” Dylan moves through personal devastation with lyrical detail that feels both deeply specific and universally human. The contrast between the quieter New York recordings and the more urgent Minneapolis sessions gives the album a unique emotional tension, shifting between reflection, fury, and resignation. Sparse yet emotionally overwhelming, Blood on the Tracks remains one of Dylan’s most powerful achievements: a breakup album transformed into poetic folklore.",
  "nevermind": "Nevermind didn’t just make Nirvana famous, it completely changed the direction of mainstream rock. Emerging from Seattle’s underground grunge scene, the album exploded into popular culture with “Smells Like Teen Spirit,” replacing the excess of hair metal with something rawer, darker, and more emotionally honest. Driven by Kurt Cobain’s jagged songwriting, tortured vocals, and unforgettable quiet-to-loud dynamics, Nevermind balances chaos with melody in a way that felt revolutionary. Tracks like “Lithium,” “Breed,” and “Come as You Are” capture alienation, anger, vulnerability, and rebellion all at once, while the crushing rhythm section of Dave Grohl and Krist Novoselic gives the album its relentless force. Beneath the distortion and aggression lies a deep pop sensibility, turning deeply personal turmoil into songs that resonated with an entire generation. Decades later, Nevermind still feels less like a breakthrough album and more like a cultural detonation.",
  "abbey road": "Abbey Road captures The Beatles at the end of their journey, fractured personally, yet still capable of creating music with extraordinary unity and elegance. Recorded as the band was nearing breakup, the album channels tension, nostalgia, experimentation, and warmth into one of the most refined records of the rock era. From the crushing intensity of “I Want You (She’s So Heavy)” to the radiant optimism of “Here Comes the Sun,” Abbey Road moves effortlessly between styles while maintaining a seamless sense of flow. George Harrison delivers some of his finest songwriting with “Something” and “Here Comes the Sun,” while John Lennon and Paul McCartney balance vulnerability, theatricality, bitterness, and beauty across the album’s iconic second-half medley. Polished yet deeply human, Abbey Road feels like a final moment of creative harmony from a band already drifting apart, a farewell that somehow sounds timeless, comforting, and endlessly alive.",
  "pet sounds": "Pet Sounds transformed what a pop album could be. Created largely by Brian Wilson as an intensely personal studio project, the record replaced the carefree surf-pop image of The Beach Boys with something far more emotional, ambitious, and orchestral. Inspired by the sophistication of Rubber Soul, Wilson responded with an album that would, in turn, inspire Sgt. Pepper’s Lonely Hearts Club Band. Blending lush harmonies with unconventional instruments, layered arrangements, and deeply introspective songwriting, Pet Sounds captures the fragile transition from youthful innocence to adult uncertainty. Songs like “Wouldn’t It Be Nice,” “God Only Knows,” and “I Just Wasn’t Made for These Times” ache with longing, vulnerability, and emotional isolation, while still sounding warm and impossibly beautiful. Every detail, from bicycle bells and barking dogs to harpsichords, strings, and horns, feels carefully placed to create a dreamlike emotional world. More than just a collection of songs, Pet Sounds became a blueprint for the modern album: intimate, cohesive, cinematic, and profoundly human.",
  "illmatic": "Illmatic is one of hip-hop’s most vivid portraits of urban life, a debut that turned Nas into a legend before he was even old enough to legally drink. Across just under 40 minutes, Nas paints cinematic scenes of New York street life with extraordinary precision, moving through themes of survival, paranoia, ambition, crime, and escape with the eye of a poet and the realism of someone who lived it. Built on atmospheric production from some of the greatest producers in East Coast hip-hop, Illmatic feels immersive from the opening subway sounds to the final track. Songs like “N.Y. State of Mind,” “Memory Lane,” and “The World Is Yours” combine razor-sharp storytelling with dense internal rhyme schemes that reshaped lyrical standards in rap music. What made the album revolutionary wasn’t loudness or commercial ambition, it was clarity, detail, and authenticity. Nas delivered street rap with literary depth, creating a record that became a cornerstone of hip-hop culture and a blueprint for generations of MCs that followed.",
  "ok computer": "OK Computer marked the moment Radiohead transcended alternative rock and created something far stranger, colder, and more emotionally disorienting. Expanding beyond traditional guitar music, the band stretched their sound into atmospheric textures, unsettling electronics, orchestral noise, and fragmented songwriting that captured the anxiety of the modern world. Tracks like “Karma Police,” “Paranoid Android,” and “No Surprises” balance beauty with unease, combining haunting melodies with themes of alienation, technological paranoia, emotional numbness, and societal collapse. The album constantly shifts between intimacy and chaos, using distorted guitars, eerie strings, and abstract production to create a feeling of quiet psychological pressure. Rather than chasing conventional rock grandeur, OK Computer embraced experimentation and uncertainty, redefining what a mainstream rock album could sound like in the late 1990s. Decades later, it still feels uncannily ahead of its time, a melancholic, futuristic masterpiece that only grows more relevant with age.",
  "blonde on blonde": "Blonde on Blonde is Bob Dylan at his most expansive, surreal, and musically fearless. Blending folk, blues, rock, and country into a sprawling double album, Dylan created what he famously described as his “thin, wild mercury sound”, a restless mix of poetic chaos, emotional clarity, and electric intensity. Recorded in Nashville with seasoned session musicians, the album balances loose, almost drunken spontaneity with remarkable musical precision. Songs like “Rainy Day Women #12 & 35” and “Stuck Inside of Mobile with the Memphis Blues Again” overflow with vivid imagery, cryptic humor, and stream-of-consciousness storytelling, while tracks such as “I Want You” and “Sad Eyed Lady of the Lowlands” reveal a more romantic and vulnerable side of Dylan’s songwriting. At once playful, mysterious, and emotionally rich, Blonde on Blonde pushed rock music into more literary and experimental territory without losing its raw musical energy. It remains one of Dylan’s defining achievements, a dreamlike collision of poetry, passion, and sound.",
  "the chronic": "The Chronic redefined West Coast hip-hop by transforming the raw aggression of gangsta rap into something smoother, heavier, and unmistakably cinematic. Drawing deeply from the funk legacy of George Clinton and P-Funk, Dr. Dre built a new sound -G-Funk- driven by deep basslines, hypnotic synths, slow grooves, and razor-sharp production. The album also introduced the world to Snoop Dogg, whose relaxed flow and effortless charisma became central to the record’s identity. Tracks like “Nuthin’ but a ‘G’ Thang” and “Let Me Ride” combined street realism with laid-back swagger, creating music that felt both dangerous and irresistibly smooth. More than just a hit record, The Chronic reshaped the sound of 1990s hip-hop, turning funk into the backbone of modern rap production and cementing Dr. Dre as one of the genre’s most influential architects.",
  "off the wall": "Off the Wall was the moment Michael Jackson fully emerged as a solo superstar, stepping beyond the legacy of the The Jackson 5 and into a sound that felt entirely his own. Blending disco, funk, pop, and soul with extraordinary precision, the album captures Jackson balancing emotional vulnerability with pure dance-floor electricity. Tracks like “Don’t Stop ’Til You Get Enough,” “Rock With You,” and “Burn This Disco Out” radiate joy, rhythm, and effortless charisma, helping define the sound of late-70s pop music. At the same time, the album’s ballads reveal a more intimate side of Jackson, particularly on “She’s Out of My Life,” where his emotional performance famously breaks into tears. Produced with Quincy Jones, Off the Wall laid the foundation for the global phenomenon that would follow with Thriller, combining flawless grooves with a level of emotion and crossover appeal few pop records had ever achieved.",
  "rubber soul": "Rubber Soul (1965) marked the moment The Beatles evolved from a world-conquering pop group into something more introspective, experimental, and artistically ambitious. Influenced heavily by the lyrical depth of Bob Dylan, the album introduced more mature songwriting, emotional nuance, and new sonic textures that expanded the boundaries of rock music. From the playful groove of “Drive My Car” to the melancholy reflection of “I’m Looking Through You” and “You Won’t See Me,” Rubber Soul feels more personal and cohesive than anything the band had made before. “Norwegian Wood” became especially groundbreaking, with George Harrison introducing the sitar into mainstream rock, giving the album an atmosphere that hinted at the psychedelic experimentation still to come. Warm, melodic, and quietly revolutionary, Rubber Soul captures the Beatles at the start of a remarkable creative transformation, one that would completely reshape popular music over the next few years.",
  "the beatles": "The Beatles (The White Album) (1968) captures The Beatles at their most unpredictable, fragmented, and creatively fearless. Written largely during the band’s retreat in India with Maharishi Mahesh Yogi, the album became an explosion of individual ideas, personalities, and musical styles, sprawling across folk, hard rock, psychedelia, blues, avant-garde experimentation, country, and pop. Rather than chasing a single cohesive sound, each member pushed deeper into their own artistic identity. John Lennon balanced tenderness and chaos on tracks like “Julia” and “Happiness Is a Warm Gun,” while Paul McCartney moved effortlessly between playful melodies and sharp satire with songs like “Martha My Dear” and “Back in the U.S.S.R.” George Harrison delivered some of the album’s emotional high points, including “While My Guitar Gently Weeps,” featuring a legendary guest solo from Eric Clapton. Restless, messy, adventurous, and endlessly inventive, The White Album feels less like a single statement and more like an entire universe of ideas unfolding at once, a portrait of a band testing the absolute limits of what popular music could contain.",
  "sgt peppers": "Sgt. Pepper's Lonely Hearts Club Band, released in 1967, marked the moment The Beatles fully abandoned the limits of live performance and reinvented themselves as studio artists. Freed from touring and the pressures of Beatlemania, the band used the album’s fictional alter-ego concept as a gateway into psychedelic experimentation, orchestral ambition, and boundless creative freedom. From the dreamlike surrealism of “Lucy in the Sky With Diamonds” to the communal warmth of “With a Little Help From My Friends” and the monumental finale “A Day in the Life,” the album constantly shifts between fantasy, nostalgia, melancholy, and wonder. Songs like “Being for the Benefit of Mr. Kite!” and “Fixing a Hole” blend Victorian imagery, avant-garde production, Indian influences, classical instrumentation, and psychedelic rock into something entirely new for popular music. More than just a landmark album, Sgt. Pepper’s Lonely Hearts Club Band redefined what an album could be — immersive, conceptual, and artistically limitless. Its influence reshaped rock music for the rest of the decade and beyond.",
  "master of puppets": "Master of Puppets, released in 1986, cemented Metallica as one of the most powerful and uncompromising forces in heavy music. Blending blistering speed, intricate musicianship, and dark psychological themes, the album pushed thrash metal far beyond aggression alone and into something more ambitious, cinematic, and emotionally intense. Centered around themes of control, addiction, and manipulation, songs like “Master of Puppets,” “Battery,” and “Welcome Home (Sanitarium)” combine crushing riffs with relentless momentum and razor-sharp precision. Even the album’s quieter moments feel tense and unstable, only making the heavier sections hit with greater force. The record also marked the final appearance of bassist Cliff Burton, whose melodic influence and musical depth helped shape the album’s expansive sound. Both technically masterful and emotionally ferocious, Master of Puppets became a defining blueprint for modern metal and remains one of the genre’s most influential albums ever recorded.",
  "the doors": "The Doors, released in 1967, introduced The Doors as one of the most mysterious and provocative bands of the psychedelic era. Blending hypnotic organ melodies, dark poetry, blues-rock energy, and theatrical intensity, the album created a sound that felt both dangerous and seductive. Driven by the magnetic presence of Jim Morrison, songs like “Break on Through (To the Other Side),” “Crystal Ship,” and “Light My Fire” balanced pop accessibility with surreal imagery and emotional volatility. Beneath the psychedelic atmosphere, the band’s tight musicianship — especially the swirling keyboards of Ray Manzarek — gave the album its distinctive tension and momentum. The record’s centrepiece, “The End,” pushed rock music into darker and more experimental territory, turning a live improvisational piece into a haunting psychological epic. With its mix of sensuality, rebellion, and poetic ambition, The Doors became one of the defining debuts of the 1960s and helped redefine the possibilities of rock music.",
  "sgt peppers lonely hearts club band": "Sgt. Pepper's Lonely Hearts Club Band, released in 1967, marked the moment The Beatles fully abandoned the limits of live performance and reinvented themselves as studio artists. Freed from touring and the pressures of Beatlemania, the band used the album’s fictional alter-ego concept as a gateway into psychedelic experimentation, orchestral ambition, and boundless creative freedom. From the dreamlike surrealism of “Lucy in the Sky With Diamonds” to the communal warmth of “With a Little Help From My Friends” and the monumental finale “A Day in the Life,” the album constantly shifts between fantasy, nostalgia, melancholy, and wonder. Songs like “Being for the Benefit of Mr. Kite!” and “Fixing a Hole” blend Victorian imagery, avant-garde production, Indian influences, classical instrumentation, and psychedelic rock into something entirely new for popular music. More than just a landmark album, Sgt. Pepper’s Lonely Hearts Club Band redefined what an album could be — immersive, conceptual, and artistically limitless. Its influence reshaped rock music for the rest of the decade and beyond.",
  "sgt pepper s lonely hearts club band": "Sgt. Pepper's Lonely Hearts Club Band, released in 1967, marked the moment The Beatles fully abandoned the limits of live performance and reinvented themselves as studio artists. Freed from touring and the pressures of Beatlemania, the band used the album’s fictional alter-ego concept as a gateway into psychedelic experimentation, orchestral ambition, and boundless creative freedom. From the dreamlike surrealism of “Lucy in the Sky With Diamonds” to the communal warmth of “With a Little Help From My Friends” and the monumental finale “A Day in the Life,” the album constantly shifts between fantasy, nostalgia, melancholy, and wonder. Songs like “Being for the Benefit of Mr. Kite!” and “Fixing a Hole” blend Victorian imagery, avant-garde production, Indian influences, classical instrumentation, and psychedelic rock into something entirely new for popular music. More than just a landmark album, Sgt. Pepper’s Lonely Hearts Club Band redefined what an album could be — immersive, conceptual, and artistically limitless. Its influence reshaped rock music for the rest of the decade and beyond.",
  "the white album": "The Beatles (The White Album) (1968) captures The Beatles at their most unpredictable, fragmented, and creatively fearless. Written largely during the band’s retreat in India with Maharishi Mahesh Yogi, the album became an explosion of individual ideas, personalities, and musical styles, sprawling across folk, hard rock, psychedelia, blues, avant-garde experimentation, country, and pop. Rather than chasing a single cohesive sound, each member pushed deeper into their own artistic identity. John Lennon balanced tenderness and chaos on tracks like “Julia” and “Happiness Is a Warm Gun,” while Paul McCartney moved effortlessly between playful melodies and sharp satire with songs like “Martha My Dear” and “Back in the U.S.S.R.” George Harrison delivered some of the album’s emotional high points, including “While My Guitar Gently Weeps,” featuring a legendary guest solo from Eric Clapton. Restless, messy, adventurous, and endlessly inventive, The White Album feels less like a single statement and more like an entire universe of ideas unfolding at once, a portrait of a band testing the absolute limits of what popular music could contain."
};
function normalizeOverviewTitle(value){return String(value||"").toLowerCase().replace(/&/g,"and").replace(/\([^)]*\)/g," ").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim()}
function overviewKey(a){return normalizeOverviewTitle(a?.title)}
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
async function loadCustomOverviews(){
  const protectedLiveScores={
    "life after death":{album_key:"life after death",title:"Life After Death (2014 Remastered Edition)",artist:"The Notorious B.I.G.",admin_score:9.1,admin_ratings_count:5}
  };
  extras.overviews={...protectedLiveScores};
  const localOverviews=JSON.parse(localStorage.getItem("musicaCustomOverviews")||"{}");
  if(!db){extras.overviews=isLocalRuntime()?{...protectedLiveScores,...localOverviews}:protectedLiveScores;return extras.overviews}
  const {data,error}=await db.from("album_overviews").select("album_key,title,artist,overview,loved_track_key,loved_track_name,admin_ratings_count,admin_score,hero_focus,moment_focus");
  localStorage.removeItem("musicaCustomOverviews");
  if(!error&&data){
    extras.overviews={...protectedLiveScores,...Object.fromEntries(data.map(row=>[row.album_key,row]))};
    try{
      const optional=await db.from("album_overviews").select("album_key,hero_image,moment_image,mood_score");
      if(!optional.error&&optional.data){
        optional.data.forEach(row=>{extras.overviews[row.album_key]={...(extras.overviews[row.album_key]||{}),...row}});
      }
    }catch(optionalError){}
    return extras.overviews;
  }
  console.warn("Could not load album_overviews from Supabase; using protected public score overrides only.",error);
  extras.overviews=protectedLiveScores;
  return extras.overviews;
}function albumBaseOverview(a){
  const key=overviewKey(a);
  const savedRow=extras.overviews[key];
  if(savedRow&&Object.prototype.hasOwnProperty.call(savedRow,"overview")){const savedText=String(savedRow.overview||"").trim();if(savedText)return savedText;}
  const titleKey=normalizeOverviewTitle(a?.title);
  const artistKey=normalizeOverviewTitle(`${a?.artist||""} ${a?.title||""}`);
  let text=customAlbumOverviews[titleKey]||customAlbumOverviews[artistKey];
  if(!text&&titleKey.includes("sgt pepper"))text=customAlbumOverviews["sgt peppers"]||customAlbumOverviews["sgt peppers lonely hearts club band"];
  if(!text&&titleKey.includes("white album"))text=customAlbumOverviews["the white album"]||customAlbumOverviews["the beatles"];
  return text||beautifulAlbumDescription(a);
}
function musicaScoreMeaning(a){const value=Number(score(a)||a.avg_rating||0);if(!value)return "Muze Score: unrated. This album is still waiting for the community to define its place.";let meaning=value>=9?"an essential community favorite":value>=8?"a strongly loved record with broad support":value>=7?"a respected album with clear supporters":value>=6?"a divisive or developing community pick":"a niche pick that may connect with specific listeners";return `Muze Score: ${value.toFixed(1)}/10, meaning ${meaning} based on listener ratings on Muze.`}
function albumCustomOverview(a){const text=albumBaseOverview(a);return text?`${text} ${musicaScoreMeaning(a)}`:""}
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
function albumOverviewHtml(a,{albumId,coverUrl,albumScore,total,customOverview,canEditOverview}){
  if(!customOverview&&!canEditOverview)customOverview=cleanAlbumSummary(a)||`${a.title} by ${a.artist||"the artist"}.`;
  const sentences=overviewSentences(customOverview||"");
  const intro=sentences[0]||`${a.title} carries the sound and story of ${a.artist||"its artist"}.`;
  const sound=sentences[1]||intro;
  const impact=sentences[2]||sentences[0]||intro;
  const legacy=sentences.slice(3,5).join(" ")||sentences[sentences.length-1]||intro;
  const quote=albumEditorialThesis(a);
  const titleWords=String(a.title||"This album").split(" ");
  const lastWord=titleWords.length>1?titleWords.pop():"matters";
  const heading=`${escapeHtml(titleWords.join(" ")||a.title||"This album")} <span>${escapeHtml(lastWord)}</span>`;
  const sourceUrl=String(a.wikipedia_url||a.source_url||"").trim();
  const sourceLink=sourceUrl?`<a class="overviewSourceLink" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">Source: Wikipedia</a>`:"";
  const edit=canEditOverview?`<div class="overviewAdminControls"><button class="overviewEditBtn" onclick="editAlbumOverview('${albumId}')">Edit overview</button><button onclick="deleteAlbumOverview('${albumId}')">Clear custom overview</button><button onclick="clearAlbumReactionsAdmin('${albumId}')">Clear reactions</button><button onclick="clearAlbumTrackActivityAdmin('${albumId}')">Clear song ratings/comments</button><button onclick="setAlbumScoreAdmin('${albumId}')">Set Muze score</button><button onclick="setAlbumRatingsCountAdmin('${albumId}')">Set ratings count</button><button onclick="setAlbumMoodScoreAdmin('${albumId}')">Set mood bar</button><button onclick="clearAlbumRatingsAdmin('${albumId}')">Clear album ratings</button><button class="danger" onclick="deleteAlbumAdmin('${albumId}')">Delete album</button></div>`:"";
  return `<section id="albumOverviewSection" class="linerOverview albumOverviewSleeve" style="--overview-cover:url('${coverUrl}')"><div class="overviewCopy"><p class="eyebrow">Album overview</p><h3>${heading}</h3><p class="overviewIntro">${escapeHtml(intro)}</p>${sourceLink}<div class="overviewPoints"><div><span class="overviewIcon soundIcon" aria-hidden="true"></span><div><strong>The sound</strong><p>${escapeHtml(sound)}</p></div></div><div><span class="overviewIcon impactIcon" aria-hidden="true"></span><div><strong>The impact</strong><p>${escapeHtml(impact)}</p></div></div><div><span class="overviewIcon legacyIcon" aria-hidden="true"></span><div><strong>The legacy</strong><p>${escapeHtml(legacy)}</p></div></div></div><div class="overviewScoreStrip"><span>Muze Community Score</span><strong>${escapeHtml(albumScore)}</strong><em>/10</em><small>Based on ${escapeHtml(total)} ratings</small></div>${edit}</div><div class="overviewMood"><blockquote>${escapeHtml(quote)}</blockquote><div><p>Defining moments</p><div id="overviewMomentChips" class="overviewMomentChips"><span>Loading tracks...</span></div></div><div class="overviewCommunityNote"><span></span><p>Join listeners who connect with this album every day.</p></div></div></section>`;
}
function renderAlbumOverviewMoments(albumId,tracks){
  const host=$("#overviewMomentChips");
  if(!host)return;
  const names=(tracks||[]).slice(0,5).map(track=>track.name).filter(Boolean);
  host.innerHTML=names.length?names.map(name=>`<span>${escapeHtml(name)}</span>`).join(""):`<span>No defining tracks yet</span>`;
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
  const url=image?.thumbnails?.["1200"]||image?.thumbnails?.large||image?.thumbnails?.["500"]||image?.image||"";
  return String(url||"").replace(/^http:\/\//i,"https://");
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
  const candidates=releases.filter(release=>release?.id&&!seen.has(release.id)&&seen.add(release.id))
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
      const bust=endpoint+(endpoint.includes("?")?"&":"?")+"v=backcover-restore-1";
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
function score(a){const override=extras.overviews[overviewKey(a)]?.admin_score;return override!==undefined&&override!==null&&override!==""?Number(override):Number(a.avg_rating||0)}
function count(a){const override=extras.overviews[overviewKey(a)]?.admin_ratings_count;return override!==undefined&&override!==null&&override!==""?Number(override):Number(a.ratings_count||0)}
function userScore(a){return state.ratingMap[a.id]||(isLocalRuntime()?localRatings()[a.id]:null)||null}
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
function flippableAlbumCover(a,albumId){
  return `<div class="linerCoverFlip" data-flipped="0" onclick="flipAlbumCover('${escapeJsString(albumId)}')" title="Click album cover to flip"><div class="linerCoverFlipCard"><div class="linerCoverFace linerCoverFront">${cover(a)}</div><div class="linerCoverFace linerCoverBack"><div class="cover"><div class="backCoverLoading">Back cover</div></div></div></div></div>`;
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
  return text.includes("freewheelin bob dylan")||text.includes("bob dylan freewheelin")?" freewheelinBackCrop":"";
}
function albumBackCoverOverrideUrl(album){
  return albumBackCoverClass(album)?"https://coverartarchive.org/release/b14ceb58-79c6-35bb-a87a-7504864f2c7d/26099141951-1200.jpg":"";
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
  if(cover&&!zoomed){
    cover.dataset.dragging="";
    cover.dataset.panX="0";
    cover.dataset.panY="0";
    cover.style.setProperty("--back-cover-pan-x","0px");
    cover.style.setProperty("--back-cover-pan-y","0px");
  }
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
  if(cover.dataset.dragging==="1"){
    event.stopPropagation();
    event.preventDefault();
    const rect=cover.getBoundingClientRect();
    const maxX=rect.width*.64;
    const maxY=rect.height*.64;
    const x=Math.max(-maxX,Math.min(maxX,Number(cover.dataset.startPanX||0)+(event.clientX-Number(cover.dataset.dragStartX||event.clientX))));
    const y=Math.max(-maxY,Math.min(maxY,Number(cover.dataset.startPanY||0)+(event.clientY-Number(cover.dataset.dragStartY||event.clientY))));
    cover.dataset.panX=String(x);
    cover.dataset.panY=String(y);
    cover.style.setProperty("--back-cover-pan-x",`${x.toFixed(2)}px`);
    cover.style.setProperty("--back-cover-pan-y",`${y.toFixed(2)}px`);
    return;
  }
  const rect=cover.getBoundingClientRect();
  const baseX=Number(cover.dataset.panX||0);
  const baseY=Number(cover.dataset.panY||0);
  const x=baseX+((event.clientX-rect.left)/rect.width-.5)*6;
  const y=baseY+((event.clientY-rect.top)/rect.height-.5)*6;
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
    cover.style.setProperty("--back-cover-pan-x","0px");
    cover.style.setProperty("--back-cover-pan-y","0px");
  }
}
document.addEventListener("dblclick",handleBackCoverOutsideDoubleClick);
function setBackCoverFace(album,url){
  const flip=document.querySelector(".linerCoverFlip");
  const backFace=flip?.querySelector(".linerCoverBack .cover");
  if(!flip||!backFace||!isRealBackCoverUrl(album,url)){backCoverDebug("rejected back face url",{title:album?.title,artist:album?.artist,url,front:album?.cover_url});return false}
  flip.dataset.backCoverUrl=url;
  flip.dataset.backCoverSource="back-cover-api";
  flip.classList.toggle("freewheelinBackCrop",albumBackCoverClass(album).trim()==="freewheelinBackCrop");
  backFace.innerHTML=`<img src="${escapeHtml(url)}" alt="" loading="lazy" decoding="async" onerror="handleBackCoverImageError(this)"><button class="backCoverInlineZoomButton" type="button" onclick="toggleBackCoverInlineZoom(this,event)" aria-label="Zoom back cover">⌕</button><span class="backCoverLabel">Back cover</span>`;
  backFace.dataset.panX="0";
  backFace.dataset.panY="0";
  backFace.setAttribute("onpointermove","moveBackCoverInlineZoom(event)");
  backFace.setAttribute("onpointerdown","startBackCoverInlineDrag(event)");
  backFace.setAttribute("onpointerup","endBackCoverInlineDrag(event)");
  backFace.setAttribute("onpointercancel","endBackCoverInlineDrag(event)");
  backFace.setAttribute("onpointerleave","endBackCoverInlineDrag(event)");
  backFace.setAttribute("onclick","handleBackCoverInlineClick(event)");
  backCoverDebug("back face set",{title:album?.title,artist:album?.artist,url});
  return true;
}
async function resolveBackCoverUrl(album){
  if(!album)return "";
  const override=albumBackCoverOverrideUrl(album);
  if(override){backCoverDebug("using album-specific back cover override",{title:album.title,artist:album.artist,url:override});return override}
  const hero=document.querySelector(`.linerHero[data-album-id="${CSS.escape(String(album.id))}"]`);
  const existing=albumBackCoverField(album)||hero?.dataset.backCoverUrl||document.querySelector(".linerCoverFlip")?.dataset.backCoverUrl||"";
  if(isRealBackCoverUrl(album,existing)){backCoverDebug("using existing url",{title:album.title,artist:album.artist,url:existing});return existing}
  const cache=backCoverCache();
  const key=coverKey(album);
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
  if(!album)return;
  const hero=document.querySelector(`.linerHero[data-album-id="${CSS.escape(String(album.id))}"]`);
  if(!hero)return;
  const url=await resolveBackCoverUrl(album);
  if(!url)return;
  hero.style.setProperty("--hero-scene",`url("${url}")`);
  hero.dataset.backCoverUrl=url;
  hero.classList.add("backCoverHero");
  setBackCoverFace(album,url);
  ensureBackCoverZoomHotspot(hero,url);
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
  hotspot.onclick=event=>{event.stopPropagation();openBackCoverZoom(url)};
}
function openBackCoverZoom(url){
  if(!url)return;
  let viewer=document.getElementById("backCoverZoomViewer");
  if(!viewer){
    viewer=document.createElement("div");
    viewer.id="backCoverZoomViewer";
    viewer.className="backCoverZoomViewer hidden";
    viewer.innerHTML=`<div class="backCoverZoomPanel"><button class="backCoverZoomClose" type="button" aria-label="Close zoom">&times;</button><div class="backCoverZoomStage"><img alt="Back cover zoom"></div><div class="backCoverZoomHint">20x zoom - drag or scroll to explore</div></div>`;
    document.body.appendChild(viewer);
    viewer.addEventListener("click",event=>{if(event.target===viewer)closeBackCoverZoom()});
    viewer.querySelector(".backCoverZoomClose").onclick=closeBackCoverZoom;
    const stage=viewer.querySelector(".backCoverZoomStage");
    let dragging=false,startX=0,startY=0,startLeft=0,startTop=0;
    stage.addEventListener("pointerdown",event=>{dragging=true;stage.classList.add("dragging");startX=event.clientX;startY=event.clientY;startLeft=stage.scrollLeft;startTop=stage.scrollTop;stage.setPointerCapture?.(event.pointerId)});
    stage.addEventListener("pointermove",event=>{if(!dragging)return;stage.scrollLeft=startLeft-(event.clientX-startX);stage.scrollTop=startTop-(event.clientY-startY)});
    const stop=event=>{dragging=false;stage.classList.remove("dragging");stage.releasePointerCapture?.(event.pointerId)};
    stage.addEventListener("pointerup",stop);
    stage.addEventListener("pointercancel",stop);
  }
  const img=viewer.querySelector("img");
  const stage=viewer.querySelector(".backCoverZoomStage");
  img.onload=()=>{stage.scrollLeft=Math.max(0,(img.clientWidth-stage.clientWidth)/2);stage.scrollTop=Math.max(0,(img.clientHeight-stage.clientHeight)/2)};
  img.src=url;
  viewer.classList.remove("hidden");
}
function closeBackCoverZoom(){
  const viewer=document.getElementById("backCoverZoomViewer");
  if(viewer)viewer.classList.add("hidden");
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
function localCommentReplies(){return JSON.parse(localStorage.getItem("musicaAlbumCommentReplies")||"{}")}
function saveLocalCommentReplies(replies){localStorage.setItem("musicaAlbumCommentReplies",JSON.stringify(replies))}
function localId(prefix="local"){return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`}
function domSafeId(value){return String(value??"").replace(/[^a-zA-Z0-9_-]/g,"_")}
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
function stopTrackPreview(){releasePreviewAudio();extras.previewKey=null;extras.previewToken=null;setPreviewingButton(null)}function trackKey(track){return String(track.name||track.spotify_id||track.id||"").toLowerCase()}
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
async function loadComments(albumId){
  const ref=albumRef(albumId);
  extras.commentReplies[ref]=extras.commentReplies[ref]||{};
  if(db){
    const {data,error}=await db.from("album_comments").select("id,name,comment,created_at").eq("album_ref",ref).order("created_at",{ascending:false}).limit(30);
    if(!error){
      extras.comments[ref]=data||[];
      const {data:replyRows,error:replyError}=await db.from("album_comment_replies").select("id,comment_id,name,reply,created_at").eq("album_ref",ref).order("created_at",{ascending:true}).limit(200);
      extras.commentReplies[ref]={};
      if(!replyError)(replyRows||[]).forEach(row=>{const key=String(row.comment_id);extras.commentReplies[ref][key]=extras.commentReplies[ref][key]||[];extras.commentReplies[ref][key].push(row)});
      mergeLocalCommentReplies(ref);
      return extras.comments[ref];
    }
  }
  const local=localComments();
  const changed=(local[ref]||[]).some(c=>!c.id);
  if(changed){local[ref]=(local[ref]||[]).map(c=>c.id?c:{...c,id:localId("comment")});saveLocalComments(local)}
  extras.comments[ref]=(local[ref]||[]).slice().reverse();
  extras.commentReplies[ref]=localCommentReplies()[ref]||{};
  mergeLocalCommentReplies(ref);
  return extras.comments[ref];
}
function renderReactionReply(reply){
  const name=reply.name||"Listener";
  const initial=String(name).trim().slice(0,1).toUpperCase()||"L";
  const replyId=String(reply.id||"");
  const adminDelete=isAdminUnlocked()&&replyId?`<button class="adminTinyDelete" onclick="deleteAlbumReplyAdmin('${escapeJsString(replyId)}')">Delete</button>`:"";
  return `<div class="reactionReply"><div class="reactionReplyAvatar">${escapeHtml(initial)}</div><div><div class="reactionReplyMeta"><strong>${escapeHtml(name)}</strong><span>${timeAgo(reply.created_at)}</span>${adminDelete}</div><p>${escapeHtml(reply.reply||reply.comment||reply.text||"")}</p></div></div>`;
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
function renderComments(albumId){
  const host=$("#commentsList");
  if(!host)return;
  const ref=albumRef(albumId);
  const comments=extras.comments[ref]||[];
  const replyMap=extras.commentReplies[ref]||{};
  renderListenerCards(comments);
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
    const name=c.name||"Listener";
    const initial=String(name).trim().slice(0,1).toUpperCase()||"L";
    const commentId=String(c.id||c.local_id||`${ref}-${i}`);
    const safeId=domSafeId(commentId);
    const replies=replyMap[commentId]||[];
    const repliesHtml=replies.length?replies.map(renderReactionReply).join(""):`<p class="noRepliesYet">No replies yet.</p>`;
    const adminDelete=isAdminUnlocked()&&commentId?`<button class="adminTinyDelete" onclick="deleteAlbumCommentAdmin('${escapeJsString(albumId)}','${escapeJsString(commentId)}')">Delete</button>`:"";
    const likeCount=Number(c.likes||c.like_count||0);
    const likes=likeCount>0?`<span>&#9825; ${likeCount}</span>`:"";
    const title=c.title||c.review_title||c.headline||"";
    const reviewDate=formatReviewDate(c.created_at);
    return `<article class="linerReaction reviewItem" data-comment-id="${escapeHtml(commentId)}"><div class="reactionAvatar reviewAvatar">${escapeHtml(initial)}</div><div class="reactionBody reviewBody"><div class="reactionMeta reviewMeta"><strong>${escapeHtml(name)}</strong><span class="verifiedListener">Verified Listener</span></div><div class="reviewRatingLine">${reviewStarRow(c)}${reviewDate?`<span class="reviewDate">Reviewed on ${escapeHtml(reviewDate)}</span>`:""}</div>${title?`<h4 class="reviewTitle">${escapeHtml(title)}</h4>`:""}<p>${escapeHtml(c.comment||c.text||"")}</p><div class="reactionActions reviewActions">${likes}<button onclick="openReactionReplyBox('${escapeJsString(albumId)}','${escapeJsString(commentId)}','${escapeJsString(name)}')">Reply</button>${adminDelete}</div>${replies.length?`<button class="viewReplies" onclick="toggleReactionReplies(this)">Hide ${replies.length} ${replies.length===1?"reply":"replies"}</button>`:""}<div id="reactionReplies-${safeId}" class="reactionReplies">${repliesHtml}</div><div id="reactionReplyBox-${safeId}" class="reactionReplyBox hidden"><textarea maxlength="300" placeholder="Reply to ${escapeHtml(name)}..."></textarea><div class="reactionReplyControls"><button onclick="submitReactionReply('${escapeJsString(albumId)}','${escapeJsString(commentId)}')">Reply</button><button type="button" onclick="closeReactionReplyBox('${escapeJsString(commentId)}')">Cancel</button></div></div></div><button class="reactionMore" onclick="toggleReactionMenu(this)">•••</button></article>`
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
    const {data,error}=await db.from("album_comments").insert({album_ref:ref,device_id:state.deviceId,name,comment}).select("id,name,comment,created_at").single();
    if(error){
      const all=localComments();
      all[ref]=all[ref]||[];
      all[ref].push({id:localId("comment"),name,comment,created_at:new Date().toISOString(),...reviewMeta});
      saveLocalComments(all);
    }else if(Object.keys(reviewMeta).length){
      const meta=localReviewMeta();
      meta[reviewMetaKey(ref,data||{})]=reviewMeta;
      saveLocalReviewMeta(meta);
    }
  }else{
    const all=localComments();
    all[ref]=all[ref]||[];
    all[ref].push({id:localId("comment"),name,comment,created_at:new Date().toISOString(),...reviewMeta});
    saveLocalComments(all);
  }
  textInput.value="";
  if($("#commentTitle"))$("#commentTitle").value="";
  if($("#commentReviewRating"))$("#commentReviewRating").value="";
  window.setReviewDraftRating(0);
  window.updateReviewCounter();
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
function displaySongCount(score){if(!score||Number(score.ratings_count)<=0)return "No ratings";const total=Number(score.ratings_count);return total.toLocaleString()+" rating"+(total===1?"":"s")}

async function loadTrackRatings(albumId){
  const ref=albumRef(albumId);
  if(db){
    const {data,error}=await db.from("track_ratings").select("track_key,track_name,rating").eq("album_ref",ref).eq("device_id",state.deviceId);
    if(!error){const mapped={};(data||[]).forEach(r=>{mapped[r.track_key]=r.rating;if(r.track_name)mapped[String(r.track_name).toLowerCase()]=r.rating});extras.trackRatings[ref]=mapped;return extras.trackRatings[ref]}
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
  const savedOverview=extras.overviews[overviewKey(album)]||{};
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
  const rows=visibleTracks.map((track,i)=>{
    const key=trackKey(track);
    const current=ratings[key]||localTrackRating(albumId,key);
    let score=displaySongScore(songScores[key]);
    if(score==="-"&&current)score=Number(current).toFixed(1);
    if(score==="-")score="";
    const scoreHtml=score?`&#9733; <span class="trackScoreNumber">${escapeHtml(score)}</span>`:"&#9733;";
    const lovedRowAdmin=`<button class="trackDots" onclick="openTrackComments('${escapeJsString(albumId)}','${escapeJsString(key)}','${escapeJsString(track.name)}')">•••</button>`;
    return `<div class="linerTrackRow"><span class="trackNo">${i+1}</span><button class="trackPulse ${track.preview_url?'':'noPreview'}" title="${track.preview_url?'Play 30 second sample':'No Spotify sample available'}" onclick="playTrackPreview('${previewPayload(track)}',this)">&#9654;</button><strong>${escapeHtml(track.name)} <span class="rowPlayingWaves" aria-hidden="true"><i></i><i></i><i></i><i></i></span></strong><button class="trackRowScore" onclick="openTrackRating('${escapeJsString(albumId)}','${escapeJsString(key)}','${escapeJsString(track.name)}')">${scoreHtml}</button><button class="trackLove" onclick="gateLikeAction()" aria-label="Like ${escapeHtml(track.name)}">&#9825;</button>${lovedRowAdmin}</div>`;
  }).join("");
  const featuredHtml=`<section class="linerFeaturedTrack ${isAdminUnlocked()?"canDragMoment":""}" data-album-id="${escapeHtml(albumId)}"${coverStyle}><div class="momentIcon">&#9829;</div><button class="featurePlay ${first.preview_url?'':'noPreview'}" title="${first.preview_url?'Play 30 second sample':'No Spotify sample available'}" onclick="playTrackPreview('${previewPayload(first)}',this)">&#9654;</button><div class="featureTrackCopy"><span>Most loved track</span><h4>${escapeHtml(first.name)} <span class="featuredPlayingWaves" aria-hidden="true"><i></i><i></i><i></i><i></i></span></h4><div class="featureWave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><p>“The production on this is untouchable. Every bar hits.”</p><em>- community review</em>${lovedAdmin}</div><div class="featureTrackScore"><strong>${escapeHtml(firstScore)}</strong><span>2.1K</span></div><div class="momentWhy"><strong>Why it hits</strong><span>Most replayed track</span><span>Feel-good classic</span><span>appears in 136 playlists</span></div><div class="featureCover">${coverHtml}</div></section>`;
  const tableHtml=`<section class="linerTrackTable"><div class="trackTableHead"><span>#</span><span>Title</span><span>Community score</span><span>Vibes</span></div>${rows}${tracks.length>8?`<button class="viewTracklist" onclick="toggleFullTracklist('${escapeJsString(albumId)}')">${expanded?"Show fewer tracks":"View full tracklist"}</button>`:""}</section>`;
  host.innerHTML=featuredHtml+tableHtml;
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
  if(!requireAuth("chat",()=>window.openTrackComments(albumId,trackKeyValue,trackName)))return;
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
  if(!requireAuth("chat",()=>window.addTrackComment(albumId,trackKeyValue,trackName)))return;
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
function scrollAlbumTracksToFeatured(behavior="auto"){
  requestAnimationFrame(()=>{
    const target=document.querySelector(".linerFeaturedTrack");
    if(!target)return;
    target.scrollIntoView({behavior,block:"start"});
  });
}
async function loadAlbumExtras(album){
  extras.currentAlbumId=albumRef(album.id);
  await Promise.all([loadComments(album.id),loadTrackRatings(album.id),loadSongScores(album.id),loadRatingDetails(album.id)]);
  renderComments(album.id);
  renderRatingDetails(album.id);
  const tracks=await fetchAlbumTracks(album);
  if(extras.currentAlbumId!==albumRef(album.id))return;
  renderTrackList(album.id,tracks);
  renderAlbumOverviewMoments(album.id,tracks);
}
window.setAlbumPopupTab=function(tab){
  if(tab==="overview"){
    openAlbumOverviewPopup();
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
  renderAlbumOverviewMoments(album.id,extras.tracks[albumRef(album.id)]||[]);
}
window.closeAlbumOverviewPopup=function(){
  const popup=$("#albumOverviewPopup");
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
window.closeReactionReplyBox=function(commentId){
  const box=$("#reactionReplyBox-"+domSafeId(commentId));
  if(box)box.classList.add("hidden");
}
window.submitReactionReply=async function(albumId,commentId){
  if(!requireAuth("chat",()=>window.submitReactionReply(albumId,commentId)))return;
  const box=$("#reactionReplyBox-"+domSafeId(commentId));
  const textarea=box?.querySelector("textarea");
  const reply=(textarea?.value||"").trim();
  if(!reply)return;
  const ref=albumRef(albumId);
  const name=(currentUsername()||$("#commentName")?.value||"Listener").trim()||"Listener";
  const optimisticReply={id:localId("reply"),comment_id:commentId,name,reply,created_at:new Date().toISOString()};
  const all=localCommentReplies();
  all[ref]=all[ref]||{};
  all[ref][commentId]=all[ref][commentId]||[];
  const existsLocal=all[ref][commentId].some(item=>String(item.reply||item.comment||"")===reply&&String(item.name||"")===name);
  if(!existsLocal)all[ref][commentId].push(optimisticReply);
  saveLocalCommentReplies(all);
  if(db){
    const {error}=await db.from("album_comment_replies").insert({album_ref:ref,comment_id:commentId,device_id:state.deviceId,name,reply});
    if(error)console.warn("Saved reply locally because Supabase rejected it:",error.message);
  }
  if(textarea)textarea.value="";
  await loadComments(albumId);
  extras.commentReplies[ref]=extras.commentReplies[ref]||{};
  extras.commentReplies[ref][commentId]=extras.commentReplies[ref][commentId]||[];
  const exists=extras.commentReplies[ref][commentId].some(item=>String(item.reply||"")===reply&&String(item.name||"")===name);
  if(!exists)extras.commentReplies[ref][commentId].push(optimisticReply);
  renderComments(albumId);
  const replies=$("#reactionReplies-"+domSafeId(commentId));
  if(replies)replies.classList.remove("hidden");
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
function canUseLocalAdminFallback(action){return ["set_album_score","set_rating_count","set_mood_score","set_loved_track","set_hero_focus","set_moment_focus","set_hero_image","set_moment_image"].includes(action)}
function localAdminFallbackResponse(payload,reason){
  if(!isLocalRuntime()||!canUseLocalAdminFallback(payload?.action))return null;
  adminDebug("request local fallback",{action:payload.action,reason});
  setAdminInlineStatus("Saved locally in this browser. Use Netlify to save for everyone.","success");
  return {ok:true,localOnly:true};
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
function adminAlbumPayload(album,action){return {action,album_key:overviewKey(album),album_ref:albumRef(album.id),album_id:String(album.id),title:album.title,artist:album.artist||""}}
window.editAlbumOverview=function(albumId){
  if(!isAdminUnlocked()){unlockOverviewAdmin();return}
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  if(!album)return;
  const section=$("#albumOverviewSection");
  if(!section)return;
  const current=albumBaseOverview(album);
  section.classList.add("editing");
  section.innerHTML=`<p class="eyebrow">Admin overview editor</p><h3>Edit album overview</h3><textarea id="overviewEditorText" class="overviewEditorText">${escapeHtml(current)}</textarea><div class="overviewEditorActions"><button onclick="saveAlbumOverview('${escapeJsString(albumId)}')">Save overview</button><button onclick="openAlbumOverviewPopup()">Cancel</button><button class="danger" onclick="deleteAlbumOverview('${escapeJsString(albumId)}')">Clear custom overview</button></div><p class="overviewAdminHint">The Muze Score meaning is added automatically after this text.</p>`;
}
window.saveAlbumOverview=async function(albumId){
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  const textarea=$("#overviewEditorText");
  if(!album||!textarea)return;
  const overview=textarea.value.trim();
  const payload={...adminAlbumPayload(album,"save"),overview};
  const data=await adminOverviewRequest(payload);
  if(!data)return;
  extras.overviews[payload.album_key]={...(extras.overviews[payload.album_key]||{}),album_key:payload.album_key,title:payload.title,artist:payload.artist,overview};
  if(!db)localStorage.setItem("musicaCustomOverviews",JSON.stringify(extras.overviews));
  openAlbumOverviewPopup();
}
window.deleteAlbumOverview=async function(albumId){
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  if(!album)return;
  if(!confirm(`Clear the custom overview for "${album.title}"?`))return;
  const data=await adminOverviewRequest(adminAlbumPayload(album,"delete_overview"));
  if(!data)return;
  delete extras.overviews[overviewKey(album)];
  if(!db)localStorage.setItem("musicaCustomOverviews",JSON.stringify(extras.overviews));
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
  extras.overviews[key]={...previous,album_key:key,title:album.title,artist:album.artist||"",overview:payload.overview,admin_score:rounded};
  if(!db||data.localOnly)localStorage.setItem("musicaCustomOverviews",JSON.stringify(extras.overviews));
  if(!data.localOnly)await loadData();
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
  extras.overviews[key]={...previous,album_key:key,title:album.title,artist:album.artist||"",overview:payload.overview,admin_ratings_count:rounded};
  if(!db||data.localOnly)localStorage.setItem("musicaCustomOverviews",JSON.stringify(extras.overviews));
  if(!data.localOnly)await loadData();
  openAlbum(albumId);
  openAlbumOverviewPopup();
}
window.setAlbumMoodScoreAdmin=async function(albumId){
  if(!isAdminUnlocked()){alert("Please unlock admin mode first.");return}
  const album=state.albums.find(x=>String(x.id)===String(albumId));
  if(!album)return;
  const key=overviewKey(album);
  const previous=extras.overviews[key]||{};
  const current=Number.isFinite(Number(previous.mood_score))?Number(previous.mood_score):62;
  const answer=(prompt(`Set Vibe & Mood intensity for "${album.title}" (0 mellow, 100 intense):`,String(Math.round(current)))||"").trim();
  if(answer==="")return;
  const value=Number(answer);
  if(!Number.isFinite(value)||value<0||value>100){alert("Please enter a mood value from 0 to 100.");return}
  const rounded=Math.round(value);
  const payload={...adminAlbumPayload(album,"set_mood_score"),overview:albumBaseOverview(album),mood_score:rounded};
  const data=await adminOverviewRequest(payload);
  if(!data)return;
  extras.overviews[key]={...previous,album_key:key,title:album.title,artist:album.artist||"",overview:payload.overview,mood_score:rounded};
  if(!db||data.localOnly)localStorage.setItem("musicaCustomOverviews",JSON.stringify(extras.overviews));
  if(!data.localOnly)await loadData();
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
window.startHeroImageDrag=function(albumId){
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
  if(db){
    const {error}=await db.from("track_ratings").upsert({album_ref:ref,track_key:trackKeyValue,track_name:trackName,device_id:state.deviceId,username,rating:value},{onConflict:"album_ref,track_key,device_id"});
    if(error)setLocalTrackRating(albumId,trackKeyValue,value);
  }else setLocalTrackRating(albumId,trackKeyValue,value);
  await Promise.all([loadTrackRatings(albumId),loadSongScores(albumId),loadTrackRatingDetails(albumId,trackKeyValue)]);
  renderTrackList(albumId);
}


function updateNavUsername(){
  const el=$("#navUsername");
  const button=$("#navSetUsername");
  const username=currentUsername();
  if(el)el.textContent=username?"@"+username:"Sign in to save albums, rate music, and build your library.";
  if(button)button.textContent=username?"Edit profile":"Sign in / Create account";
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
  if(!requireAuth("profile",setLibraryUsername))return;
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
  genre:albumGenreLabel(a),
  cover_url:a.cover_url||"",
  spotify_url:a.spotify_url||"",
  summary:a.summary||"",
  rating:userScore(a)?Number(userScore(a)):displayScore(a)
}}
function sortedLibraryItems(items){return items.slice()}
function liveLibraryItem(item){
  const album=state.albums.find(a=>String(a.id)===String(item.id))||existingAlbumMatch(item);
  if(!album)return item;
  return {...item,id:String(album.id),title:album.title,artist:album.artist,year:album.year||item.year||"",genre:albumGenreLabel(album),cover_url:album.cover_url||item.cover_url||"",spotify_url:album.spotify_url||item.spotify_url||"",summary:album.summary||item.summary||"",rating:displayScore(album),ratings_count:count(album)};
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
  if(!requireAuth("save",syncMyLibrary))return false;
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
  if(!requireAuth("save",()=>addAlbumToMyLibrary(album)))return false;
  const items=myLibraryItems();
  if(items.some(item=>isSameAlbum(item,album)||String(item.id)===String(album.id))){alert('That album is already in your library.');return false}
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
  if(added){alert('Added to your public library.');render()}
}
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
  const fallback=items.map(item=>albumGenreLabel(item)).filter(Boolean);
  return [...new Set([...(genres||[]),...fallback].filter(Boolean).filter(g=>String(g).toLowerCase()!=="album"))].slice(0,3);
}
function libraryTinyAlbum(item){
  const scoreText=item.rating&&item.rating!=="-"?'<span class="mockAlbumScore">? '+escapeHtml(item.rating)+'</span>':'';
  const img=item.cover_url?'<img src="'+escapeHtml(item.cover_url)+'" alt="'+escapeHtml(item.title||"Album cover")+'">':'<strong>'+escapeHtml(String(item.title||"?").slice(0,1))+'</strong>';
  return '<article class="mockAlbumTile" onclick="event.stopPropagation();openLibraryAlbum(\''+encodeURIComponent(JSON.stringify(item))+'\')"><div class="mockAlbumCover">'+img+'</div><div class="mockAlbumCopy"><strong>'+escapeHtml(item.title||"Untitled")+'</strong><span>'+escapeHtml(item.artist||"")+(item.year?' &middot; '+escapeHtml(item.year):'')+'</span></div>'+scoreText+'</article>';
}
function libraryRowAlbum(item){
  const scoreText=item.rating&&item.rating!=="-"?'<span class="mockAlbumScore">? '+escapeHtml(item.rating)+'</span>':'';
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
  const canRemove=(isMine||(currentUsername()&&String(library.username||"").toLowerCase()===currentUsername().toLowerCase())||isAdminUnlocked())&&library.id;
  const followers=Number(library.followers_count||0);
  const albumCount=Number(library.album_count||items.length||0);
  const genres=[...new Set(items.map(albumGenreLabel).filter(g=>g&&g!=="Album"))].slice(0,3);
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
  return '<div class="libraryCard mockLibraryCard '+(isMine?'mockOwnCommunity':'')+'" onclick="openLibraryDetailsById(\''+key+'\')"><div class="mockLibraryTop"><div class="mockAvatar">'+escapeHtml(avatar)+'</div><div class="mockLibraryTitle"><h3>'+escapeHtml(library.title||"Library")+'</h3><p>@'+escapeHtml(library.username||"Listener")+' &middot; '+albumCount+' albums &middot; '+followers+' follower'+(followers===1?'':'s')+'</p></div><div class="mockMatch"><strong>'+similarity+'% match</strong><span>'+matchLabel+'</span></div>'+(canRemove?'<button class="libraryMenuBtn mockRemove" onclick="event.stopPropagation();removeLibrary(\''+escapeJsString(library.id)+'\')" title="Remove library">'+(isAdminUnlocked()&&!isMine?'Delete':'...')+'</button>':'')+'</div><div class="mockDescriptor">'+escapeHtml(libraryGenreLabel(genres))+'</div><div class="mockTags">'+(tags.length?tags.map(tag=>'<span>'+escapeHtml(tag)+'</span>').join(""):'<span>Personal</span><span>Essentials</span>')+'</div><div class="mockAlbumPreview '+(items.length===1?'singlePreview':'')+'">'+(albumPreview||'<div class="emptyMini">No public albums yet.</div>')+'</div>'+discovery+'<div class="mockLibraryActions"><button class="libraryExploreBtn" onclick="event.stopPropagation();openLibraryDetailsById(\''+key+'\')">Explore Library</button>'+(canFollow?'<button class="libraryFollowBtn" onclick="event.stopPropagation();followLibrary(\''+escapeJsString(library.id)+'\')">Follow</button>':'<button class="libraryFollowBtn following" onclick="event.stopPropagation();openLibraryDetailsById(\''+key+'\')">? Following</button>')+'</div></div>';
}
function ownLibraryHero(library){
  const items=liveLibraryItems(Array.isArray(library.items)?library.items:[]);
  const followers=Number(library.followers_count||0);
  const key=escapeJsString(library.id||library.device_id||"");
  const recent=items.slice(0,3).map(item=>'<div class="ownRecentCover">'+(item.cover_url?'<img src="'+escapeHtml(item.cover_url)+'" alt="'+escapeHtml(item.title||"Album cover")+'">':'<strong>'+escapeHtml(String(item.title||"?").slice(0,1))+'</strong>')+'</div>').join("");
  const avatarCover=items[0]?.cover_url?'<img src="'+escapeHtml(items[0].cover_url)+'" alt="">':'<span>'+escapeHtml(String(library.username||"L").slice(0,1).toUpperCase())+'</span>';
  return '<section class="mockYourLibrary"><div class="ownIdentity"><div class="ownAvatar">'+avatarCover+'</div><div><p>Your Library</p><h3>'+escapeHtml(library.title||"Your Library")+'</h3><span>100% match</span><em>'+items.length+' albums &middot; '+followers+' follower'+(followers===1?'':'s')+'</em><button onclick="openLibraryDetailsById(\''+key+'\')">View your library ?</button></div></div><div class="ownRecent"><p>Recently added</p><div>'+recent+'</div></div><div class="ownNumbers"><p>Your taste in numbers</p><div><strong>100%</strong><span>Albums you love</span></div><div><strong>'+items.length+'</strong><span>New discoveries</span></div><div><strong>'+items.length+'</strong><span>Shared albums</span></div></div></section>';
}
function libraryRecommendationPanel(){
  const mine=liveLibraryItems(myLibraryItems());
  const recs=state.albums.filter(album=>!mine.some(item=>isSameAlbum(item,album)||String(item.id)===String(album.id))).slice(0,4);
  if(!recs.length)return "";
  return '<div class="libraryRecoPanel"><h3>Because you loved these albums</h3><div>'+recs.map(album=>'<article onclick="openAlbum(\''+escapeJsString(album.id)+'\')">'+cover(album)+'<strong>'+escapeHtml(album.title)+'</strong><span>'+escapeHtml(album.artist)+' &middot; '+escapeHtml(album.year||"")+'</span><em>? '+displayScore(album)+'</em></article>').join("")+'</div><button onclick="setView(\'rankings\')">Find more libraries ?</button></div>';
}
function librariesView(){
  const username=currentUsername();
  const allLibraries=visibleLibraries();
  const mineCard=currentLibraryCard()||allLibraries.find(l=>(l.device_id===state.deviceId||l.isMine||(username&&String(l.username||"").toLowerCase()===username.toLowerCase())));
  const fallbackMine={id:"local-library-"+state.deviceId,device_id:state.deviceId,isMine:true,username:username||"Listener",title:(username?username:"Your")+"'s Library",items:liveLibraryItems(myLibraryItems()),album_count:myLibraryItems().length,followers_count:0};
  const displayMine=mineCard||fallbackMine;
  const query=String(state.librarySearch||"").toLowerCase().trim();
  const community=allLibraries.filter(l=>!(l.device_id===state.deviceId||l.isMine||(username&&String(l.username||"").toLowerCase()===username.toLowerCase()))).filter(l=>!query||(`${l.title||""} ${l.username||""} ${(Array.isArray(l.items)?l.items:[]).map(i=>`${i.title||""} ${i.artist||""}`).join(" ")}`).toLowerCase().includes(query));
  content.innerHTML=`<div class="mockLibrariesHeader"><div><h2>Libraries <span>?</span></h2><p>Explore people through the albums they choose.</p></div><div class="mockLibraryTools"><label><span>?</span><input value="${escapeHtml(state.librarySearch||"")}" oninput="setLibrarySearch(this.value)" placeholder="Search libraries, people, albums..."></label><button onclick="openLibrarySpotifyAdd()">+ Add album</button></div></div>${ownLibraryHero(displayMine)}<div class="mockCommunityTitle"><div><strong>Community Libraries</strong><button>For you?</button></div><button onclick="setLibrarySearch('')">See all</button></div><div class="libraryGrid communityLibraryGrid mockCommunityGrid">${community.map(libraryBlock).join("")||'<div class="empty">No public libraries yet.</div>'}</div>${libraryRecommendationPanel()}`;
}
window.setLibrarySearch=function(value){state.librarySearch=value;librariesView()}
function genres(){return["All",...new Set(state.albums.map(albumGenreLabel).filter(Boolean))]}
function filtered(){let a=state.albums.filter(x=>{let q=state.search.toLowerCase();const label=albumGenreLabel(x);return(state.genre==="All"||label===state.genre)&&(`${x.title} ${x.artist} ${genreSearchText(x)}`.toLowerCase().includes(q))});if(state.sort==="score")a.sort((x,y)=>score(y)-score(x));if(state.sort==="year")a.sort((x,y)=>(y.year||0)-(x.year||0));if(state.sort==="ratings")a.sort((x,y)=>count(y)-count(x));if(state.sort==="hidden")a.sort((x,y)=>count(x)-count(y));return a}
function card(a){const genreLabel=albumGenreLabel(a);return`<article class="card albumCard" onclick="openAlbum('${escapeJsString(a.id)}')">${cover(a)}<button class="quickLibraryAdd" onclick="event.stopPropagation();addCurrentAlbumToLibrary('${escapeJsString(a.id)}')">+ Add to my library</button><div class="cardBody"><div class="row"><div><div class="title">${escapeHtml(a.title)}</div><div class="artist">${escapeHtml(a.artist)} - ${escapeHtml(a.year||"")}</div></div><div class="score">${displayScore(a)}</div></div><span class="pill">${escapeHtml(genreLabel)}</span></div></article>`}
function row(a,i){const genreLabel=albumGenreLabel(a);return`<div class="listRow" onclick="openAlbum('${escapeJsString(a.id)}')"><div class="rank">#${i+1}</div>${listCover(a)}<div><strong>${escapeHtml(a.title)}</strong><div class="artist">${escapeHtml(a.artist)} - ${escapeHtml(genreLabel)} - ${count(a).toLocaleString()} ratings</div></div><div class="miniScore">${displayScore(a)}</div></div>`}
function render(){let arr=filtered();let top=state.albums.slice().sort((a,b)=>score(b)-score(a))[0];if(top){$("#heroScore").textContent=displayScore(top);$("#heroTitle").textContent=top.title;const heroCard=$("#heroCard");if(heroCard){if(top.cover_url){heroCard.style.setProperty("--hero-cover",`url("${top.cover_url}")`)}else{heroCard.style.removeProperty("--hero-cover")}}}$("#genreFilter").innerHTML=genres().map(g=>`<option ${g===state.genre?"selected":""}>${escapeHtml(g)}</option>`).join("");
if(state.view==="rankings")content.innerHTML=state.sort==="hidden"?`<div class="sectionTitle"><h2>Hidden Gems</h2></div><div class="empty">Coming soon</div>`:`<div class="sectionTitle"><h2>Top Albums</h2><span class="muted">${arr.length} results</span></div><div class="grid">${arr.map(card).join("")}</div>`;
if(state.view==="discover"){content.innerHTML=`<div class="sectionTitle"><h2>Hidden Gems</h2></div><div class="empty">Coming soon</div>`}
if(state.view==="artists"){content.innerHTML=artistPage()}
if(state.view==="myratings"){let rated=state.albums.filter(a=>userScore(a));content.innerHTML=rated.length?`<div class="sectionTitle"><h2>My Ratings</h2></div><div class="list">${rated.map(row).join("")}</div>`:`<div class="empty">You haven't rated anything yet.</div>`}
if(state.view==="libraries"){librariesView()}
}
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
  const saved=extras.overviews[overviewKey(album)]||{};
  return saved.hero_image||albumSceneMatch(album)?.hero||album.cover_url||"";
}
function albumMomentImage(album){
  const saved=extras.overviews[overviewKey(album)]||{};
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
function renderListenerCards(comments){
  const host=$("#listenerCardsList");
  if(!host)return;
  const visible=(comments||[]).slice(0,3);
  host.innerHTML=visible.length?visible.map(c=>{
    const name=escapeHtml(c.name||"Listener");
    const avatar=name.slice(0,1).toUpperCase()||"L";
    const likes=Number(c.likes||c.like_count||0);
    return `<article class="listenerCard"><div class="listenerCardAvatar">${avatar}</div><div><strong>${name}</strong><span>${timeAgo(c.created_at)}</span></div><p>${escapeHtml(c.comment||c.text||"")}</p><small>&#9825; ${likes}</small></article>`;
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
  if(text.includes("radiohead"))return ["“That tension never lets go”","“Best after midnight”","“Every detail matters”"];
  if(text.includes("nirvana"))return ["“Still sounds dangerous”","“That chorus detonates”","“Pure catharsis”"];
  if(text.includes("beatles"))return ["“The melodies keep giving”","“Timeless for a reason”","“Warm from front to back”"];
  if(text.includes("hip-hop")||text.includes("rap"))return ["“Every bar lands”","“The storytelling is unreal”","“Still quote this one”"];
  return ["“That transition destroyed me”","“Gets better at night”","“Replay material”"];
}
function artistAlbumRow(a){return`<div class="artistAlbumRow" onclick="openAlbum('${escapeJsString(a.id)}')">${listCover(a)}<div><strong>${escapeHtml(a.title)}</strong>${count(a)>0?`<span>${count(a).toLocaleString()} ratings</span>`:""}</div><div class="artistAlbumScore">${score(a)>0?displayScore(a):""}</div></div>`}
function artistGenres(){const counts={};state.albums.forEach(a=>{const label=albumGenreLabel(a);if(label&&label!=="Album")counts[label]=(counts[label]||0)+1});return ["Popular",...Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([genre])=>genre)]}
function artistRank(name){let albums=state.albums.filter(a=>a.artist===name);let rated=albums.filter(a=>score(a)>0||count(a)>0);let totalRatings=rated.reduce((sum,a)=>sum+count(a),0);let avg=rated.length?rated.reduce((sum,a)=>sum+score(a),0)/rated.length:0;let top=rated.length?Math.max(...rated.map(a=>score(a))):0;return {ratedCount:rated.length,totalRatings,avg,top}}
function artistNames(){let names=[...new Set(state.albums.map(a=>a.artist).filter(Boolean))];let q=state.artistSearch.toLowerCase().trim();let filtered=names.filter(name=>{let albums=state.albums.filter(a=>a.artist===name);let letterOk=state.artistLetter==="All"||String(name).trim().toUpperCase().startsWith(state.artistLetter);let genreOk=state.artistGenre==="All"||state.artistGenre==="Popular"||albums.some(a=>albumGenreLabel(a)===state.artistGenre);let searchOk=!q||String(name).toLowerCase().includes(q)||albums.some(a=>`${a.title} ${genreSearchText(a)}`.toLowerCase().includes(q));return letterOk&&genreOk&&searchOk});return filtered.sort((a,b)=>{let ra=artistRank(a),rb=artistRank(b);if(state.artistGenre==="All"||state.artistGenre==="Popular"){if(!!rb.ratedCount!==!!ra.ratedCount)return rb.ratedCount?1:-1;if(rb.avg!==ra.avg)return rb.avg-ra.avg;if(rb.top!==ra.top)return rb.top-ra.top;if(rb.totalRatings!==ra.totalRatings)return rb.totalRatings-ra.totalRatings}return a.localeCompare(b)})}
function renderArtistResults(){let artists=artistNames();let grid=$("#artistResults");let count=$("#artistCount");if(count)count.textContent=artists.length+" artist"+(artists.length===1?"":"s");if(grid)grid.innerHTML=artists.map(artistBlock).join("")||'<div class="empty">No artists found.</div>'}
function artistPage(){let letters=["All",..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];let genres=artistGenres();let artists=artistNames();let activeLetter=state.artistLetter==="All"?"A-Z Filter":state.artistLetter;return `<section class="artistDiscovery"><div><p class="eyebrow">Music culture</p><h2>Artists</h2><p>Discover legendary artists, hidden gems, and community favorites.</p></div><div class="artistSearchWrap"><input id="artistSearchInput" value="${escapeHtml(state.artistSearch)}" oninput="setArtistSearch(this.value)" placeholder="Search artists, albums, genres, moods..."><span id="artistCount">${artists.length} artist${artists.length===1?"":"s"}</span></div></section><div class="artistFilterDock"><div class="artistFilterLabel">Genres</div><div class="artistGenreChips">${genres.map(genre=>`<button class="${(state.artistGenre===genre||(genre==="Popular"&&state.artistGenre==="All"))?"active":""}" onclick="setArtistGenre('${escapeJsString(genre)}')">${escapeHtml(genre)}</button>`).join("")}<details class="artistAZMenu"><summary>${activeLetter} <span>v</span></summary><div class="artistAZ">${letters.map(letter=>`<button class="${state.artistLetter===letter?"active":""}" onclick="setArtistLetter('${letter}')">${letter}</button>`).join("")}</div></details></div></div><div id="artistResults" class="artistGrid">${artists.map(artistBlock).join("")||'<div class="empty">No artists found.</div>'}</div>`}window.setArtistLetter=function(letter){state.artistLetter=letter;render()}
window.setArtistGenre=function(genre){state.artistGenre=genre==="Popular"?"All":genre;render()}
window.setArtistSearch=function(value){state.artistSearch=value;renderArtistResults()}
function artistBlock(name){let d=state.albums.filter(a=>a.artist===name).sort((a,b)=>score(b)-score(a));let genres=[...new Set(d.map(albumGenreLabel).filter(g=>g&&g!=="Album"))].slice(0,3);let hero=d.find(a=>a.cover_url)||d[0]||{};let totalRatings=d.reduce((sum,a)=>sum+count(a),0);let featured=d.slice(0,4);return`<section class="artistCard"><div class="artistHero" style="--artist-cover:url('${escapeHtml(hero.cover_url||"")}')"><div><h3>${escapeHtml(name)}</h3><p>${genres.length?escapeHtml(genres.join(" - "))+" - ":""}${d.length} album${d.length===1?"":"s"} ranked</p><div class="artistTags">${genres.map(g=>`<span>${escapeHtml(g)}</span>`).join("")}</div></div><div class="artistScore">${artistScoreLabel(d)}${totalRatings?`<span>${totalRatings.toLocaleString()} ratings</span>`:""}</div></div><div class="artistAlbumList">${featured.map(artistAlbumRow).join("")}</div></section>`}

window.openAlbum=function(id){
  let a=state.albums.find(x=>String(x.id)===String(id));
  if(!a)return;
  extras.currentAlbumId=albumRef(a.id);
  const albumScore=displayScore(a);
  const total=count(a).toLocaleString();
  const albumId=escapeJsString(a.id);
  const initial=escapeHtml((authDisplayName()||"L").slice(0,1).toUpperCase());
  const coverUrl=escapeHtml(a.cover_url||"");
  const savedOverview=extras.overviews[overviewKey(a)]||{};
  const heroFocus=escapeHtml(savedOverview.hero_focus||"50% 50%");
  const heroSceneUrl=escapeHtml(albumHeroSceneImage(a)||a.cover_url||"");
  const momentCoverUrl=escapeHtml(albumMomentImage(a)||a.cover_url||heroSceneUrl||"");
  const pageImageStyle=` style="--album-cover:url('${coverUrl}');--hero-scene:url('${heroSceneUrl}');--hero-position:${heroFocus};--moment-cover:url('${momentCoverUrl}')${albumAmbientStyleVars(a)}"`;
  const summary=albumHeroLine(a);
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
  const returnHeadline=albumReturnHeadline(a);
  const returnBody=albumReturnBody(a);
  const consensusLine=count(a)>5?"Early consensus forming":"Taste is starting to gather";
  const libraryLine=count(a)>0?`Saved by ${total} listeners`:"Add it to your music world";
  const communityPull=escapeHtml(albumCommunityPull(a));
  const reactionWhispers=albumReactionWhispers(a).map(line=>`<span>${escapeHtml(line)}</span>`).join("");
  const heroAdmin=canEditOverview?`<div class="heroAdminControls"><button class="heroDragButton" onclick="uploadAlbumVisualImage('${albumId}','hero')">Upload hero image</button><button class="heroDragButton" onclick="startHeroImageDrag('${albumId}')">Move hero image</button></div>`:"";
  const moodScore=Math.max(0,Math.min(100,Number(extras.overviews[overviewKey(a)]?.mood_score ?? 62)));
  const scoreStat=canEditOverview?`<button class="linerStatEdit" onclick="setAlbumScoreAdmin('${albumId}')"><span>Community score</span><strong>${albumScore}</strong><small>${escapeHtml(scoreMood)}</small><em>Edit</em></button>`:`<div><span>Community score</span><strong>${albumScore}</strong><small>${escapeHtml(scoreMood)}</small></div>`;
  const countStat=canEditOverview?`<button class="linerStatEdit" onclick="setAlbumRatingsCountAdmin('${albumId}')"><span>Listeners</span><strong>${total}</strong><small>${escapeHtml(consensusLine)}</small><em>Edit</em></button>`:`<div><span>Listeners</span><strong>${total}</strong><small>${escapeHtml(consensusLine)}</small></div>`;
  const heroSavedStrip=`<div class="heroSavedStrip"><span class="miniAvatars"><i></i><i></i><i></i><i></i></span><span>Saved by <b>${total}</b> listeners</span></div>`;
  const heroSideCards=`<aside class="linerHeroSide"><div class="heroSideCard love"><h4><span>&#9825;</span>Why people love it</h4><p>"${escapeHtml(returnHeadline)}"</p><div class="heroFanRow"><span class="miniAvatars"><i></i><i></i><i></i><i></i></span><b>Fan favorite &#9829;</b></div></div><div class="heroSideCard mood" style="--mood-score:${moodScore}%"><h4><span>&#12316;</span>Vibe & Mood</h4><p>${escapeHtml(albumVibeTags(a).slice(0,3).join(" · "))}</p><div class="moodMeter"><span></span></div><div class="moodScale"><em>Mellow</em><em>Intense</em></div></div><div class="heroSideCard influence"><h4><span>&#9733;</span>Sound & Influence</h4><p>${escapeHtml(albumCommunityPull(a))}</p><div>${albumVibeTags(a).slice(0,3).map(tag=>`<small>${escapeHtml(tag)}</small>`).join("")}</div></div></aside>`;
  $("#albumModalContent").innerHTML=`<div class="linerAlbumPage"${pageImageStyle}><div class="linerTabs"><button data-album-tab="overview" onclick="setAlbumPopupTab('overview')">Overview</button><button data-album-tab="tracks" onclick="setAlbumPopupTab('tracks')" class="active">Tracks</button><button data-album-tab="ratings" onclick="setAlbumPopupTab('ratings')">Ratings & Reviews</button></div><section class="linerHero" data-album-id="${albumId}" style="--album-cover:url('${coverUrl}');--hero-scene:url('${heroSceneUrl}');--hero-position:${heroFocus}">${heroAdmin}<div class="linerCover">${flippableAlbumCover(a,a.id)}${heroSavedStrip}</div><div class="linerHeroCopy"><p class="eyebrow">Album · ${escapeHtml(a.year||"")}</p><h2${albumTitleClassAttr}>${escapeHtml(a.title)}</h2><h3>${escapeHtml(a.artist)} <span>&#9679;</span></h3><p>${escapeHtml(summary)}</p><div class="linerTags">${tags.map(tag=>`<span>${escapeHtml(tag)}</span>`).join("")}</div><div class="linerMoodTags">${heroMoodTags}</div><div class="linerStats">${scoreStat}${countStat}<div class="linerSocialProof"><span>Library</span><strong>${libraryHasAlbum(a)?"Saved":"+"}</strong><small>${escapeHtml(libraryLine)}</small></div></div><div class="heroRightAtmosphere" aria-hidden="true">${heroPullQuotes}<i></i><i></i><i></i></div><div class="linerActions"><button onclick="addCurrentAlbumToLibrary('${albumId}')">+ Add to my library</button><a target="_blank" href="${escapeHtml(a.spotify_url||`https://open.spotify.com/search/${encodeURIComponent(a.title+" "+a.artist)}`)}"><span class="spotifyMark" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11"></circle><path d="M7 9.2c3.4-1 7.3-.7 10.2.9"></path><path d="M7.6 12.1c2.8-.8 6-.5 8.2.7"></path><path d="M8.2 14.8c2.1-.5 4.4-.3 6.2.6"></path></svg></span>Open in Spotify</a></div></div>${heroSideCards}</section><section class="linerHeroSoul"><div class="returnIcon">&#9829;</div><div class="returnHeadline"><span>Why people return</span><h3>${escapeHtml(returnHeadline)}</h3></div><p>${escapeHtml(returnBody)}</p><div class="returnTags">${heroMoodTags}</div></section><section class="linerContentGrid"><div class="linerPanel trackPanel"><div class="linerPanelTitle"><span>&#9733;</span><div><h3>Why people love this album</h3><p>Community feeling, not just numbers.</p></div></div><div class="linerScoreRow"><div class="scoreRing"><strong>${albumScore}</strong><span>avg. rating &#9733;</span><small>${escapeHtml(scoreMood)}</small></div><div class="ratingBars"><div><span>5 &#9733;</span><b style="--w:72%"></b><em>72%</em></div><div><span>4 &#9733;</span><b style="--w:20%"></b><em>20%</em></div><div><span>3 &#9733;</span><b style="--w:6%"></b><em>6%</em></div><div><span>2 &#9733;</span><b style="--w:1%"></b><em>1%</em></div><div><span>1 &#9733;</span><b style="--w:1%"></b><em>1%</em></div></div></div><div class="trackMoodTags">${vibeTags}</div><div class="communityPulse">${communityPull}</div></div><div id="albumRatingsSection" class="linerPanel reactionsPanel"><div class="linerPanelTitle"><span class="listenerIcon" aria-hidden="true"></span><div><h3>Listener Reactions</h3><p>Real moments from the community.</p></div></div><div class="reactionAtmosphere">${reactionWhispers}<i></i><i></i><i></i></div><div class="linerComposer"><div class="voiceAvatar gold">${initial}</div><textarea id="commentText" maxlength="500" placeholder="Share your moment with this album..."></textarea><input id="commentName" type="hidden" value="${escapeHtml(currentUsername()||"Listener")}"><div><span>&#9786;</span><em>0/500</em><button onclick="addAlbumComment('${albumId}')">Post</button></div></div><div class="reactionFilters"><button class="active">Top</button><button class="recentFilter">Recent</button><button class="friendsFilter">Friends</button></div><div id="listenerPull" class="listenerPull"><strong>0</strong><span>listener reactions so far</span></div><div id="commentsList" class="commentsList"><div class="emptyMini">Loading reactions...</div></div><button id="allReactionsButton" class="allReactions" onclick="toggleAllReactions()"><span>View all reactions</span><span class="allReactionsArrow" aria-hidden="true"></span></button></div></section><div id="trackRatingsList" class="albumTrackSections"><div class="emptyMini">Loading tracks...</div></div><section class="listenerCardsSection"><div class="listenerCardsHead"><h3>Listener reactions</h3><div><button aria-label="Previous reaction">‹</button><button aria-label="Next reaction">›</button></div></div><div id="listenerCardsList" class="listenerCardsGrid"><div class="listenerCard empty">Loading reactions...</div></div></section><div class="linerPlayer"><div>${cover(a)}<div><strong>${escapeHtml(a.title)}</strong><span>${escapeHtml(a.artist)} · ${escapeHtml(a.title)}</span></div></div><div><button>&#9664;</button><button class="playNow" id="albumPreviewPlay" onclick="playFirstAlbumPreview(this)">&#9654;</button><button>&#9654;</button></div></div></div>`;
  const flip=$("#albumModalContent .linerCoverFlip");
  const reviewAtmosphere=$("#albumModalContent .reactionsPanel .reactionAtmosphere");
  const reviewComposer=$("#albumModalContent .reactionsPanel .linerComposer");
  if(reviewAtmosphere)reviewAtmosphere.classList.add("reviewAtmosphere");
  if(reviewComposer)reviewComposer.outerHTML=reviewComposerHtml(albumId);
  if(flip)flip.dataset.flipped="0";
  $("#albumModal").classList.remove("hidden");
  applyBackCoverHero(a);
  loadAlbumExtras(a);
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

window.rateAlbum=async function(albumId,value){if(!requireAuth("rate",()=>window.rateAlbum(albumId,value)))return;const username=ratingName();if(db&&!String(albumId).startsWith("seed-")){let {error}=await db.from("ratings").upsert({album_id:albumId,device_id:state.deviceId,username,rating:value},{onConflict:"album_id,device_id"});if(error){alert(error.message);return}localStorage.removeItem("musicaLocalRatings");await loadData();openAlbum(albumId)}else{let r=isLocalRuntime()?localRatings():{};r[albumId]=value;if(isLocalRuntime())saveLocalRatings(r);state.ratingMap=r;render();openAlbum(albumId)}}
async function loadData(){
  if(!db){
    $("#setupWarning").classList.remove("hidden");
    const localOnly=isLocalRuntime();
    state.albums=[...seedAlbums.filter(a=>!hiddenSeedAlbums().includes(a.id)),...(localOnly?localAlbums():[])];
    state.albums=state.albums.map(a=>({...a,genre:albumGenreLabel(a)}));
    state.ratingMap=localOnly?localRatings():{};
    await loadCustomOverviews();
    applyCachedCovers();
    render();
    hydrateMissingCovers();
    return;
  }
  localStorage.removeItem("musicaLocalAlbums");
  localStorage.removeItem("musicaCustomOverviews");
  let {data:albums,error}=await db.from("album_scores").select("*").order("avg_rating",{ascending:false});
  if(error){
    alert(error.message);
    state.albums=seedAlbums;
  }else{
    state.albums=[...seedAlbums,...(albums||[])];
  }
  if(!state.albums.length){state.albums=seedAlbums}
  state.albums=state.albums.map(a=>({...a,genre:albumGenreLabel(a)}));
  let {data:ratings,error:ratingsError}=await db.from("ratings").select("album_id,rating").eq("device_id",state.deviceId);
  state.ratingMap=ratingsError?{}:Object.fromEntries((ratings||[]).map(r=>[r.album_id,r.rating]));
  await loadCustomOverviews();
  applyCachedCovers();
  render();
  hydrateMissingCovers();
}function openSpotifyAdd(target){
  extras.spotifyTarget=target||"musica";
  const title=$("#addModalTitle");
  const copy=$("#addModalCopy");
  if(title)title.textContent=extras.spotifyTarget==="library"?"Add album to your library":"Add album from Spotify";
  if(copy)copy.textContent=extras.spotifyTarget==="library"?"Search Spotify. If the album is already in Muze, it will be added from the existing main page album. If not, Muze adds it once first.":"Search an album and artist. Choose the correct result and Muze pulls the cover, year, and Spotify link automatically.";
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
    const res=await fetch(`/.netlify/functions/album-search?q=${encodeURIComponent(q)}&v=genre3`,{cache:"no-store"});
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
  if(extras.spotifyTarget==="library"&&!requireAuth("save",()=>window.addSpotifyAlbum(a)))return;
  let album={title:a.title,artist:a.artist,year:a.year,genre:albumGenreLabel(a),cover_url:a.cover_url,spotify_url:a.spotify_url,summary:spotifyAlbumSummary(a),spotify_id:a.spotify_id||""};
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
    if(added)$("#spotifyStatus").textContent=duplicate?'Added the existing Muze album to your public library.':'Added to Muze and your public library.';
    render();
    return;
  }
  if(duplicate){$("#spotifyStatus").textContent=`"${duplicate.title}" by ${duplicate.artist} is already in Muze. Use the hover button or album page to add it to your library.`;return}
  $("#spotifyStatus").textContent='Added to Muze. You can keep adding more albums.';
  await loadData();
}
function openNav(){$("#sideNav").classList.add("open");$("#navOverlay").classList.remove("hidden")}function closeNav(){$("#sideNav").classList.remove("open");$("#navOverlay").classList.add("hidden")}
updateNavUsername();$("#notificationBell").onclick=async e=>{e.stopPropagation();const panel=$("#notificationPanel");panel.classList.toggle("hidden");await refreshNotifications();if(panel&&!panel.classList.contains("hidden")&&unreadFollowerCount()>0){const library=myPublishedLibrary();localStorage.setItem(followerSeenKey(),String(Number(library?.followers_count||0)));const badge=$("#notificationBadge");if(badge){badge.textContent="0";badge.classList.add("hidden")}}};$("#notificationPanel").onclick=e=>e.stopPropagation();document.addEventListener("click",()=>$("#notificationPanel")?.classList.add("hidden"));$("#navSetUsername").onclick=setLibraryUsername;$("#adminOverviewUnlock").onclick=unlockOverviewAdmin;syncAdminUnlockButton();$("#menuBtn").onclick=openNav;$("#closeNav").onclick=closeNav;$("#navOverlay").onclick=closeNav;$("#addAlbumBtn").onclick=()=>openSpotifyAdd("musica");$("#navAddAlbum").onclick=()=>{openSpotifyAdd("musica");closeNav()};$("#spotifySearchBtn").onclick=searchSpotify;$("#spotifyQuery").addEventListener("keydown",e=>{if(e.key==="Enter")searchSpotify()});$("#authButton").onclick=()=>openAuthModal(loggedInUser()?"Manage your Muze session.":"Log in to join the conversation.");$("#authLoginMode").onclick=()=>showAuthEmailForm("login");$("#authSignupMode").onclick=()=>showAuthEmailForm("signup");$("#libraryAccessLogin").onclick=()=>showLibraryAccessAuthForm("login");$("#libraryAccessSignup").onclick=()=>showLibraryAccessAuthForm("signup");$("#authEmailContinue").onclick=continueAuthEmail;$("#authGoogleLogin").onclick=()=>startOAuthSignup("google");$("#authSpotifyLogin").onclick=()=>startOAuthSignup("spotify");$("#authFacebookLogin").onclick=()=>startOAuthSignup("facebook");$("#continueEmailSignup").onclick=()=>showAuthEmailForm("signup");$("#continueGoogleSignup").onclick=()=>startOAuthSignup("google");$("#continueSpotifySignup").onclick=()=>startOAuthSignup("spotify");$("#continueFacebookSignup").onclick=()=>startOAuthSignup("facebook");$("#authForm").onsubmit=submitAuth;$("#authLogout").onclick=logoutAuth;
function closeAlbumPopup(){stopTrackPreview();$("#albumModal").classList.add("hidden")}$("#closeAlbumModal").onclick=closeAlbumPopup;$("#closeAddModal").onclick=()=>$("#addModal").classList.add("hidden");$("#closeAuthModal").onclick=closeAuthModal;$("#albumModal").onclick=e=>{if(e.target.id==="albumModal")closeAlbumPopup()};$("#addModal").onclick=e=>{if(e.target.id==="addModal")$("#addModal").classList.add("hidden")};$("#authModal").onclick=e=>{if(e.target.id==="authModal")closeAuthModal()};
function goHome(){state.view="rankings";document.querySelectorAll(".tab,.navItem[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view==="rankings"));render();closeNav();window.scrollTo({top:0,behavior:"smooth"})}
async function navigateToView(view){
  if(view==="libraries"&&!loggedInUser()){
    openLibrariesAuthPrompt();
    closeNav();
    return;
  }
  state.view=view;
  if(state.view==="libraries")await loadLibraries();
  document.querySelectorAll(".tab,.navItem[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view===state.view));
  render();
  closeNav();
}
function rememberSiteState(){if(!history.state||!history.state.musica)history.replaceState({musica:"home"},"");history.pushState({musica:"inside"},"")}
rememberSiteState();
window.addEventListener("popstate",()=>{if(!$("#authModal").classList.contains("hidden")){closeAuthModal();history.pushState({musica:"inside"},"");return}if(!$("#albumModal").classList.contains("hidden")){closeAlbumPopup();history.pushState({musica:"inside"},"");return}if(!$("#addModal").classList.contains("hidden")){$("#addModal").classList.add("hidden");history.pushState({musica:"inside"},"");return}goHome();history.pushState({musica:"inside"},"")});
document.querySelectorAll(".tab,.navItem[data-view]").forEach(t=>t.onclick=async()=>navigateToView(t.dataset.view));
$("#searchInput").oninput=e=>{state.search=e.target.value;render()};$("#genreFilter").onchange=e=>{state.genre=e.target.value;render()};$("#sortSelect").onchange=e=>{state.sort=e.target.value;render()};const themeToggle=$("#themeToggle");function syncThemeToggle(){if(themeToggle)themeToggle.setAttribute("aria-label",document.body.classList.contains("light")?"Switch to dark mode":"Switch to light mode")}syncThemeToggle();themeToggle.onclick=()=>{document.body.classList.toggle("light");state.theme=document.body.classList.contains("light")?"light":"dark";localStorage.setItem("musicaThemePreference",state.theme);syncThemeToggle()};
initAuth();
loadData();






































window.playFirstAlbumPreview=function(button){const ref=extras.currentAlbumId;const track=(extras.tracks[ref]||[]).find(t=>t.preview_url);if(!track){alert("Spotify does not provide 30 second samples for this album.");return}playTrackPreview(previewPayload(track),button)};






















































































