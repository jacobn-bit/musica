let cachedRows=null;
let cachedAt=0;
const CACHE_MS=60_000;
const CURATED_ALBUMS=[
  {id:"seed-1",title:"Abbey Road",artist:"The Beatles",year:1969,genre:"Rock",cover_url:"https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/48/53/43/485343e3-dd6a-0034-faec-f4b6403f8108/13UMGIM63890.rgb.jpg/600x600bb.jpg",avg_rating:9.4,ratings_count:18432},
  {id:"seed-2",title:"To Pimp a Butterfly",artist:"Kendrick Lamar",year:2015,genre:"Hip-Hop",cover_url:"https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/b5/a6/91/b5a69171-5232-3d5b-9c15-8963802f83dd/15UMGIM15814.rgb.jpg/600x600bb.jpg",avg_rating:9.3,ratings_count:22102},
  {id:"seed-3",title:"OK Computer",artist:"Radiohead",year:1997,genre:"Alternative",cover_url:"https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/07/60/ba/0760ba0f-148c-b18f-d0ff-169ee96f3af5/634904078164.png/600x600bb.jpg",avg_rating:9.2,ratings_count:20110},
  {id:"seed-4",title:"Songs in the Key of Life",artist:"Stevie Wonder",year:1976,genre:"Soul",cover_url:"https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/eb/1f/12/eb1f12ec-474c-63aa-43af-09282f423b9d/00602537004737.rgb.jpg/600x600bb.jpg",avg_rating:9.2,ratings_count:11240},
  {id:"seed-5",title:"Illmatic",artist:"Nas",year:1994,genre:"Hip-Hop",cover_url:"https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/b9/eb/cc/b9ebccbc-5ba4-2cdb-5332-b065739abd9a/886444567619.jpg/600x600bb.jpg",avg_rating:9.1,ratings_count:16650},
  {id:"seed-6",title:"Rumours",artist:"Fleetwood Mac",year:1977,genre:"Pop Rock",cover_url:"https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/4d/13/ba/4d13bac3-d3d5-7581-2c74-034219eadf2b/081227970949.jpg/600x600bb.jpg",avg_rating:9.0,ratings_count:15100}
];

function clean(value){return String(value||"").trim().toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function cleanTitle(value){return clean(String(value||"").replace(/\s*[-–—]\s*(deluxe|expanded|anniversary|collector'?s?|special|super deluxe|legacy|remaster(?:ed)?|bonus).*$/i,"").replace(/\s*\((?=[^)]*(deluxe|expanded|anniversary|collector'?s?|special|super deluxe|legacy|remaster(?:ed)?|edition|version|bonus|mono|stereo|reissue))[^)]*\)/gi,"").replace(/\s*\[(?=[^\]]*(deluxe|expanded|anniversary|collector'?s?|special|super deluxe|legacy|remaster(?:ed)?|edition|version|bonus|mono|stereo|reissue))[^\]]*\]/gi,""))}
function identity(title,artist){return `${cleanTitle(title)}::${clean(artist)}`}
function compareScore(left,right){return right.effective_score-left.effective_score||right.effective_ratings_count-left.effective_ratings_count||String(left.title||"").localeCompare(String(right.title||""))||String(left.id).localeCompare(String(right.id))}
function releaseDateSortKey(album){
  const value=String(album?.release_date||"").trim();
  const match=value.match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/);
  const year=Number(match?.[1]||album?.year)||0;
  const month=Number(match?.[2])||0;
  const day=Number(match?.[3])||0;
  return year*10_000+month*100+day;
}
function compareForMode(mode){
  if(mode==="year")return (left,right)=>releaseDateSortKey(right)-releaseDateSortKey(left)||String(left.id).localeCompare(String(right.id));
  if(mode==="ratings")return (left,right)=>right.effective_ratings_count-left.effective_ratings_count||right.effective_score-left.effective_score||String(left.id).localeCompare(String(right.id));
  if(mode==="hidden")return (left,right)=>left.effective_ratings_count-right.effective_ratings_count||right.effective_score-left.effective_score||String(left.id).localeCompare(String(right.id));
  return compareScore;
}
function isGreatestHits(album){
  const title=clean(album?.title);
  return clean(album?.genre)==="greatest hits"||/(^| )(greatest hits|best of|very best of)( |$)/.test(title);
}
function applyCatalogueQuery(allRows,{query="",genre="",year=null,sort="score"}={}){
  const search=clean(query);
  const genreKey=clean(genre);
  const greatestHits=allRows.filter(isGreatestHits);
  const globallyEligible=allRows.filter(album=>!isGreatestHits(album));
  const source=genreKey==="greatest hits"?greatestHits:(search?allRows:globallyEligible);
  const rows=source.filter(album=>(!search||clean(`${album.title} ${album.artist} ${album.genre}`).includes(search))&&(!genreKey||genreKey==="all"||(genreKey==="greatest hits"?isGreatestHits(album):clean(album.genre)===genreKey))&&(!year||Number(album.year)===Number(year))).slice().sort(compareForMode(sort));
  const genres=[...new Set([...globallyEligible.map(album=>String(album.genre||"").trim()).filter(Boolean),...(greatestHits.length?["Greatest hits"]:[])])].sort((a,b)=>a.localeCompare(b));
  return {globallyEligible,rows,genres};
}
async function restRows(url,key,table,fields,filter="",from=0,to=999){
  const response=await fetch(`${url.replace(/\/$/,"")}/rest/v1/${table}?select=${encodeURIComponent(fields)}${filter}`,{headers:{apikey:key,Authorization:`Bearer ${key}`,Range:`${from}-${to}`}});
  const text=await response.text();
  if(!response.ok)throw new Error(`Catalogue query failed (${response.status}): ${text.slice(0,240)}`);
  return JSON.parse(text||"[]");
}
async function restAllRows(url,key,table,fields,filter=""){
  const rows=[];
  const pageSize=1000;
  for(let from=0;;from+=pageSize){
    const batch=await restRows(url,key,table,fields,filter,from,from+pageSize-1);
    rows.push(...batch);
    if(batch.length<pageSize)break;
  }
  return rows;
}

async function rankedRows(){
  if(cachedRows&&Date.now()-cachedAt<CACHE_MS)return cachedRows;
  const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY;
  if(!url||!key)throw new Error("Homepage catalogue service is unavailable");
  const [scores,scoreOverviews,countOverviews,metadataRows]=await Promise.all([
    restAllRows(url,key,"album_scores","id,title,artist,year,genre,cover_url,avg_rating,ratings_count"),
    restAllRows(url,key,"album_overviews","album_id,album_key,title,artist,admin_score,admin_ratings_count","&admin_score=not.is.null"),
    restAllRows(url,key,"album_overviews","album_id,album_key,title,artist,admin_score,admin_ratings_count","&admin_ratings_count=not.is.null"),
    restAllRows(url,key,"album_metadata","album_ref,album_id,title,artist,original_release_date,release_year","&original_release_date=not.is.null")
  ]);
  const overviews=[...scoreOverviews,...countOverviews];
  const byId=new Map();
  const byIdentity=new Map();
  for(const overview of overviews||[]){
    const merge=(current={})=>({...current,...overview,admin_score:overview.admin_score??current.admin_score,admin_ratings_count:Math.max(Number(current.admin_ratings_count)||0,Number(overview.admin_ratings_count)||0)||null});
    if(overview.album_id){const id=String(overview.album_id);byId.set(id,merge(byId.get(id)))}
    const rowIdentity=identity(overview.title,overview.artist);byIdentity.set(rowIdentity,merge(byIdentity.get(rowIdentity)));
    if(overview.album_key){const keyIdentity=identity(overview.album_key,overview.artist);byIdentity.set(keyIdentity,merge(byIdentity.get(keyIdentity)))}
  }
  const metadataById=new Map();
  const metadataByIdentity=new Map();
  for(const metadata of metadataRows||[]){
    const releaseDate=String(metadata.original_release_date||"").trim();
    if(!releaseDate)continue;
    if(metadata.album_id&&!metadataById.has(String(metadata.album_id)))metadataById.set(String(metadata.album_id),releaseDate);
    const metadataIdentity=identity(metadata.title,metadata.artist);
    if(metadataIdentity!=="::"&&!metadataByIdentity.has(metadataIdentity))metadataByIdentity.set(metadataIdentity,releaseDate);
  }
  const resolved=[...(scores||[]),...CURATED_ALBUMS].map(album=>{
    const overview=byId.get(String(album.id))||byIdentity.get(identity(album.title,album.artist))||{};
    const releaseDate=metadataById.get(String(album.id))||metadataByIdentity.get(identity(album.title,album.artist))||String(album.release_date||album.year||"");
    let effectiveScore=Number(overview.admin_score??album.avg_rating??0);
    let effectiveCount=Number(overview.admin_ratings_count??album.ratings_count??0);
    if(clean(album.title)==="life after death"&&clean(album.artist).includes("notorious b i g")){
      effectiveScore=9.1;
      effectiveCount=5;
    }
    return {...album,release_date:releaseDate,effective_score:effectiveScore,effective_ratings_count:effectiveCount};
  });
  const unique=new Map();
  for(const album of resolved){
    const albumKey=identity(album.title,album.artist)||String(album.id);
    const current=unique.get(albumKey);
    if(!current||album.effective_ratings_count>current.effective_ratings_count||(album.effective_ratings_count===current.effective_ratings_count&&album.effective_score>current.effective_score))unique.set(albumKey,album);
  }
  cachedRows=[...unique.values()].sort(compareScore).map((album,index)=>({...album,muze_rank:index+1}));
  cachedAt=Date.now();
  return cachedRows;
}
async function databaseQueryPage({searchTerm,genre,year,sort,offset,limit}){
  const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY;
  if(!url||!key)return null;
  const response=await fetch(`${url.replace(/\/$/,"")}/rest/v1/rpc/muze_homepage_catalogue_query`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({p_search:searchTerm,p_genre:genre||"All",p_year:year,p_sort:sort,p_offset:offset,p_limit:limit})});
  const text=await response.text();
  if(!response.ok){
    if(response.status===404||/PGRST202|42883|could not find the function/i.test(text))return null;
    throw new Error(`Global catalogue query failed (${response.status}): ${text.slice(0,240)}`);
  }
  const rows=JSON.parse(text||"[]");
  const first=rows[0]||{};
  return {albums:rows.map(({total_matches,global_top,global_genres,...album})=>album),hasMore:offset+rows.length<Number(first.total_matches||0),total:Number(first.total_matches)||0,topAlbum:first.global_top||null,genres:Array.isArray(first.global_genres)?first.global_genres:[]};
}

exports.handler=async function(event){
  try{
    const offset=Math.max(0,Number.parseInt(event.queryStringParameters?.offset||"0",10)||0);
    const limit=Math.min(120,Math.max(1,Number.parseInt(event.queryStringParameters?.limit||"120",10)||120));
    const query=clean(event.queryStringParameters?.q||"");
    const genre=clean(event.queryStringParameters?.genre||"");
    const year=Number.parseInt(event.queryStringParameters?.year||"",10)||null;
    const requestedSort=String(event.queryStringParameters?.sort||"score").toLowerCase();
    const sort=["score","year","ratings","hidden"].includes(requestedSort)?requestedSort:"score";
    const databasePage=await databaseQueryPage({searchTerm:query,genre:genre||"All",year,sort,offset,limit});
    if(databasePage)return {statusCode:200,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"public, max-age=30, stale-while-revalidate=120"},body:JSON.stringify({...databasePage,query:{searchTerm:query,genre:genre||"all",year,sortMode:sort,offset,limit}})};
    const allRows=await rankedRows();
    const {globallyEligible,rows,genres}=applyCatalogueQuery(allRows,{query,genre,year,sort});
    return {statusCode:200,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"public, max-age=30, stale-while-revalidate=120"},body:JSON.stringify({albums:rows.slice(offset,offset+limit),hasMore:offset+limit<rows.length,total:rows.length,topAlbum:globallyEligible[0]||null,genres,query:{searchTerm:query,genre:genre||"all",year,sortMode:sort,offset,limit}})};
  }catch(error){
    console.error("[Muze homepage rankings]",error);
    return {statusCode:503,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"},body:JSON.stringify({error:"Muze rankings are temporarily unavailable."})};
  }
};
exports._test={clean,identity,releaseDateSortKey,compareForMode,isGreatestHits,applyCatalogueQuery};
