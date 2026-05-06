
const seedAlbums=[
{id:"seed-1",title:"Abbey Road",artist:"The Beatles",year:1969,genre:"Rock",avg_rating:9.4,ratings_count:18432,tag:"Classic",summary:"Polished, melodic, and endlessly replayable.",spotify_url:"https://open.spotify.com/search/The%20Beatles%20Abbey%20Road",cover_url:""},
{id:"seed-2",title:"To Pimp a Butterfly",artist:"Kendrick Lamar",year:2015,genre:"Hip-Hop",avg_rating:9.3,ratings_count:22102,tag:"Modern classic",summary:"Dense, political, jazz-infused, and emotionally huge.",spotify_url:"https://open.spotify.com/search/Kendrick%20Lamar%20To%20Pimp%20a%20Butterfly",cover_url:""},
{id:"seed-3",title:"OK Computer",artist:"Radiohead",year:1997,genre:"Alternative",avg_rating:9.2,ratings_count:20110,tag:"Essential",summary:"Alienation, technology, beauty, and dread in one perfect arc.",spotify_url:"https://open.spotify.com/search/Radiohead%20OK%20Computer",cover_url:""},
{id:"seed-4",title:"Songs in the Key of Life",artist:"Stevie Wonder",year:1976,genre:"Soul",avg_rating:9.2,ratings_count:11240,tag:"Masterpiece",summary:"Warm, ambitious, human, and full of life.",spotify_url:"https://open.spotify.com/search/Stevie%20Wonder%20Songs%20in%20the%20Key%20of%20Life",cover_url:""},
{id:"seed-5",title:"Illmatic",artist:"Nas",year:1994,genre:"Hip-Hop",avg_rating:9.1,ratings_count:16650,tag:"Essential",summary:"Compact, cinematic, and one of rap’s purest statements.",spotify_url:"https://open.spotify.com/search/Nas%20Illmatic",cover_url:""},
{id:"seed-6",title:"Rumours",artist:"Fleetwood Mac",year:1977,genre:"Pop Rock",avg_rating:9.0,ratings_count:15100,tag:"Timeless",summary:"Perfect songwriting wrapped in heartbreak and tension.",spotify_url:"https://open.spotify.com/search/Fleetwood%20Mac%20Rumours",cover_url:""}
];

const cfg=window.MUSICA_CONFIG||{};
const configured=cfg.SUPABASE_URL&&!cfg.SUPABASE_URL.includes("PASTE_")&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_ANON_KEY.includes("PASTE_");
const db=configured?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
const state={view:"rankings",search:"",genre:"All",sort:"score",albums:[],ratingMap:{},theme:localStorage.getItem("musicaTheme")||"dark",deviceId:localStorage.getItem("musicaDeviceId")||crypto.randomUUID()};
localStorage.setItem("musicaDeviceId",state.deviceId);
if(state.theme==="light")document.body.classList.add("light");
const $=s=>document.querySelector(s),content=$("#content");
function localAlbums(){return JSON.parse(localStorage.getItem("musicaLocalAlbums")||"[]")}
function saveLocalAlbums(a){localStorage.setItem("musicaLocalAlbums",JSON.stringify(a))}
function localRatings(){return JSON.parse(localStorage.getItem("musicaLocalRatings")||"{}")}
function saveLocalRatings(r){localStorage.setItem("musicaLocalRatings",JSON.stringify(r))}
function score(a){return Number(a.avg_rating||0)}
function count(a){return Number(a.ratings_count||0)}
function userScore(a){return state.ratingMap[a.id]||localRatings()[a.id]||null}
function displayScore(a){return score(a)>0?score(a).toFixed(1):"—"}
function coverText(a){return(a.title||"?").split(" ").slice(0,2).map(w=>w[0]).join("")}
function fallback(a){return `<div class="fallbackCover"><strong>${coverText(a)}</strong><span>${a.title}</span></div>`}
function cover(a){
  if(!a.cover_url){
    return `<div class="cover">${fallback(a)}</div>`;
  }

  return `
    <div class="cover">
      <img src="${a.cover_url}" alt="">
    </div>
  `;
}
}
function genres(){return["All",...new Set(state.albums.map(a=>a.genre).filter(Boolean))]}
function filtered(){let a=state.albums.filter(x=>{let q=state.search.toLowerCase();return(state.genre==="All"||x.genre===state.genre)&&(`${x.title} ${x.artist} ${x.genre||""}`.toLowerCase().includes(q))});if(state.sort==="score")a.sort((x,y)=>score(y)-score(x));if(state.sort==="year")a.sort((x,y)=>(y.year||0)-(x.year||0));if(state.sort==="ratings")a.sort((x,y)=>count(y)-count(x));if(state.sort==="hidden")a.sort((x,y)=>count(x)-count(y));return a}
function card(a){return`<article class="card" onclick="openAlbum('${a.id}')">${cover(a)}<div class="cardBody"><div class="row"><div><div class="title">${a.title}</div><div class="artist">${a.artist} · ${a.year||""}</div></div><div class="score">${displayScore(a)}</div></div><span class="pill">${a.genre||"Album"}</span></div></article>`}
function row(a,i){return`<div class="listRow" onclick="openAlbum('${a.id}')"><div class="rank">#${i+1}</div>${listCover(a)}<div><strong>${a.title}</strong><div class="artist">${a.artist} · ${a.genre||""} · ${count(a).toLocaleString()} ratings</div></div><div class="miniScore">${displayScore(a)}</div></div>`}
function render(){let arr=filtered();let top=state.albums.slice().sort((a,b)=>score(b)-score(a))[0];if(top){$("#heroScore").textContent=displayScore(top);$("#heroTitle").textContent=top.title}$("#genreFilter").innerHTML=genres().map(g=>`<option ${g===state.genre?"selected":""}>${g}</option>`).join("");
if(state.view==="rankings")content.innerHTML=`<div class="sectionTitle"><h2>Top Albums</h2><span class="muted">${arr.length} results</span></div><div class="grid">${arr.map(card).join("")}</div>`;
if(state.view==="discover"){let hidden=state.albums.slice().sort((a,b)=>count(a)-count(b)).slice(0,6);let newer=state.albums.slice().sort((a,b)=>(b.year||0)-(a.year||0)).slice(0,6);content.innerHTML=`<div class="sectionTitle"><h2>Hidden Gems</h2></div><div class="list">${hidden.map(row).join("")}</div><div class="sectionTitle"><h2>Newer Albums</h2></div><div class="list">${newer.map(row).join("")}</div>`}
if(state.view==="artists"){let artists=[...new Set(state.albums.map(a=>a.artist))].sort();content.innerHTML=`<div class="sectionTitle"><h2>Artists</h2></div><div class="artistGrid">${artists.map(artistBlock).join("")}</div>`}
if(state.view==="myratings"){let rated=state.albums.filter(a=>userScore(a));content.innerHTML=rated.length?`<div class="sectionTitle"><h2>My Ratings</h2></div><div class="list">${rated.map(row).join("")}</div>`:`<div class="empty">You haven’t rated anything yet.</div>`}}
function artistBlock(name){let d=state.albums.filter(a=>a.artist===name).sort((a,b)=>score(b)-score(a));let avg=(d.reduce((s,a)=>s+score(a),0)/d.length).toFixed(1);return`<div class="artistBlock"><div class="row"><h3 style="margin:0">${name}</h3><div class="score">${avg}</div></div><div class="list" style="margin-top:12px">${d.map((a,i)=>row(a,i)).join("")}</div></div>`}
window.openAlbum=function(id){let a=state.albums.find(x=>String(x.id)===String(id));let my=userScore(a);$("#albumModalContent").innerHTML=`<div class="detail">${cover(a)}<div><p class="eyebrow">${a.genre||"Album"} · ${a.year||""}</p><h2 style="font-size:34px;margin:0 0 6px">${a.title}</h2><div class="artist" style="font-size:18px">${a.artist}</div><div style="margin:18px 0"><div class="scoreBig">${displayScore(a)}</div><div class="muted">Musica Score · ${count(a).toLocaleString()} ratings</div></div><p>${a.summary||"Added to Musica."}</p><strong>Your rating</strong><div class="ratingBar">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button class="rateBtn ${my==n?"selected":""}" onclick="rateAlbum('${a.id}',${n})">${n}</button>`).join("")}</div><a class="btn" target="_blank" href="${a.spotify_url||`https://open.spotify.com/search/${encodeURIComponent(a.title+" "+a.artist)}`}">Open in Spotify</a></div></div>`;$("#albumModal").classList.remove("hidden")}
window.rateAlbum=async function(albumId,value){if(db){let {error}=await db.from("ratings").upsert({album_id:albumId,device_id:state.deviceId,rating:value},{onConflict:"album_id,device_id"});if(error){alert(error.message);return}await loadData();openAlbum(albumId)}else{let r=localRatings();r[albumId]=value;saveLocalRatings(r);state.ratingMap=r;render();openAlbum(albumId)}}
async function loadData(){if(!db){$("#setupWarning").classList.remove("hidden");state.albums=[...seedAlbums,...localAlbums()];state.ratingMap=localRatings();render();return}let {data:albums,error}=await db.from("album_scores").select("*").order("avg_rating",{ascending:false});if(error){
  alert(error.message);
  state.albums = seedAlbums;
} else {
  state.albums = [...seedAlbums, ...(albums || [])];
}if(!state.albums.length){state.albums=seedAlbums}let {data:ratings}=await db.from("ratings").select("album_id,rating").eq("device_id",state.deviceId);state.ratingMap=Object.fromEntries((ratings||[]).map(r=>[r.album_id,r.rating]));render()}
async function searchSpotify(){
  const q = $("#spotifyQuery").value.trim();
  if(!q) return;

  $("#spotifyStatus").textContent = "Searching Spotify…";
  $("#spotifyResults").innerHTML = "";

  try {
    const res = await fetch(`/.netlify/functions/album-search?q=${encodeURIComponent(q)}&v=final2`, { cache: "no-store" });
    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      throw new Error("Spotify function is not returning JSON yet. Open /.netlify/functions/album-search?q=rubber%20soul to test the function directly.");
    }

    if(!res.ok) {
      throw new Error(data.error || "Spotify search failed.");
    }

    const albums = data.albums || [];
    $("#spotifyStatus").textContent = albums.length ? "Choose an album:" : "No results found.";

    $("#spotifyResults").innerHTML = albums.map(a => `
      <div class="spotifyResult">
        <img src="${a.cover_url || ""}" alt="">
        <div>
          <strong>${a.title}</strong>
          <div class="artist">${a.artist} · ${a.year || ""}</div>
        </div>
        <button class="bigBtn" onclick='addSpotifyAlbum(${JSON.stringify(a).replaceAll("'", "&#39;")})'>Add</button>
      </div>
    `).join("");
  } catch(e) {
    $("#spotifyStatus").textContent = e.message;
  }
}
window.addSpotifyAlbum=async function(a){let album={title:a.title,artist:a.artist,year:a.year,genre:"",cover_url:a.cover_url,spotify_url:a.spotify_url,summary:"Added from Spotify."};if(db){let {error}=await db.from("albums").insert(album);if(error){alert(error.message);return}}else{let arr=localAlbums();arr.push({...album,id:"local-"+Date.now(),avg_rating:0,ratings_count:0});saveLocalAlbums(arr)}$("#addModal").classList.add("hidden");await loadData()}
function openNav(){ $("#sideNav").classList.add("open"); $("#navOverlay").classList.remove("hidden") }function closeNav(){ $("#sideNav").classList.remove("open"); $("#navOverlay").classList.add("hidden") }
$("#menuBtn").onclick=openNav;$("#closeNav").onclick=closeNav;$("#navOverlay").onclick=closeNav;$("#addAlbumBtn").onclick=()=>$("#addModal").classList.remove("hidden");$("#navAddAlbum").onclick=()=>{$("#addModal").classList.remove("hidden");closeNav()};$("#spotifySearchBtn").onclick=searchSpotify;$("#spotifyQuery").addEventListener("keydown",e=>{if(e.key==="Enter")searchSpotify()});
$("#closeAlbumModal").onclick=()=>$("#albumModal").classList.add("hidden");$("#closeAddModal").onclick=()=>$("#addModal").classList.add("hidden");$("#albumModal").onclick=e=>{if(e.target.id==="albumModal")$("#albumModal").classList.add("hidden")};$("#addModal").onclick=e=>{if(e.target.id==="addModal")$("#addModal").classList.add("hidden")};
document.querySelectorAll(".tab,.navItem[data-view]").forEach(t=>t.onclick=()=>{state.view=t.dataset.view;document.querySelectorAll(".tab,.navItem[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view===state.view));render();closeNav()});
$("#searchInput").oninput=e=>{state.search=e.target.value;render()};$("#genreFilter").onchange=e=>{state.genre=e.target.value;render()};$("#sortSelect").onchange=e=>{state.sort=e.target.value;render()};$("#themeToggle").onclick=()=>{document.body.classList.toggle("light");state.theme=document.body.classList.contains("light")?"light":"dark";localStorage.setItem("musicaTheme",state.theme)};
loadData();
