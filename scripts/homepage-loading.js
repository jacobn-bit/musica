(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.MuzeHomepageLoading=api;
})(typeof window!=="undefined"?window:globalThis,function(){
  function mergeUnique(existing,incoming,keyOf){
    const getKey=keyOf||((item)=>String(item?.id||""));
    const seen=new Set();
    return [...(existing||[]),...(incoming||[])].filter(item=>{
      const key=getKey(item);
      if(!key||seen.has(key))return false;
      seen.add(key);
      return true;
    });
  }
  function pageFromRows(rows,pageSize,offset){
    const values=Array.isArray(rows)?rows:[];
    return {
      albums:values.slice(0,pageSize),
      hasMore:values.length>pageSize,
      nextOffset:offset+Math.min(pageSize,values.length)
    };
  }
  function withTimeout(promise,timeoutMs,setTimer=setTimeout,clearTimer=clearTimeout){
    let timer;
    const timeout=new Promise((_,reject)=>{timer=setTimer(()=>reject(Object.assign(new Error("Muze rankings request timed out"),{code:"MUZE_HOMEPAGE_TIMEOUT"})),timeoutMs)});
    return Promise.race([promise,timeout]).finally(()=>clearTimer(timer));
  }
  function createRequestGate(){
    let active=null;
    return {
      get active(){return Boolean(active)},
      run(task){
        if(active)return active;
        active=Promise.resolve().then(task).finally(()=>{active=null});
        return active;
      }
    };
  }
  return {mergeUnique,pageFromRows,withTimeout,createRequestGate};
});
