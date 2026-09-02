(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.MuzeRoutes=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  const VIEW_PATHS={
    rankings:"/charts/top",
    discover:"/discover",
    artists:"/artists",
    myratings:"/my-ratings",
    libraries:"/libraries",
    chat:"/community"
  };

  function normalizePath(pathname="/"){
    const value=String(pathname||"/").split(/[?#]/,1)[0].replace(/\/{2,}/g,"/");
    if(value==="/")return value;
    return `/${value.replace(/^\/+|\/+$/g,"")}`;
  }

  function viewFromPath(pathname="/"){
    const path=normalizePath(pathname);
    if(path==="/")return "rankings";
    return Object.entries(VIEW_PATHS).find(([,route])=>route===path)?.[0]||null;
  }

  function pathForView(view){return VIEW_PATHS[view]||"/"}

  function albumIdFromPath(pathname="/"){
    const match=normalizePath(pathname).match(/^\/album\/([^/]+)(?:\/[^/]+)?$/i);
    if(!match)return "";
    try{return decodeURIComponent(match[1])}catch(error){return match[1]}
  }

  function slug(value){
    return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,90)||"album";
  }

  function albumPath(album){
    const id=String(album?.id||"").trim();
    if(!id)return "/";
    const label=slug([album?.title,album?.artist].filter(Boolean).join(" "));
    return `/album/${encodeURIComponent(id)}/${label}`;
  }

  return {VIEW_PATHS,normalizePath,viewFromPath,pathForView,albumIdFromPath,albumPath,slug};
});
