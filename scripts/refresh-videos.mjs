import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {curatedVideos,fromCommons} from '../backend/providers.mjs';

// No paid API, no scraping of restricted social platforms. Re-run on GitHub Actions.
export const topics=[
 'flood','flooding rain','hurricane','typhoon cyclone','tornado','lightning',
 'storm waves ocean','snow storm','blizzard','winter weather','wildfire',
 'earthquake','volcano eruption','tsunami','satellite weather'
];
const allowedMime=new Set(['video/mp4','video/webm','video/ogg']);
const fetchJson=async(url)=>{
 const c=new AbortController(),timeout=setTimeout(()=>c.abort(),18000);
 try{
  const response=await fetch(url,{signal:c.signal,headers:{'User-Agent':'KinzoDocumentaryResearch/2.1 (attribution-aware media index)','Accept':'application/json'}});
  if(!response.ok)throw Error('HTTP '+response.status);
  return await response.json();
 }finally{clearTimeout(timeout)}
};
export async function commonsSearch(q){
 const params=new URLSearchParams({
  action:'query',generator:'search',gsrsearch:q,gsrnamespace:'6',gsrlimit:'45',prop:'imageinfo',
  iiprop:'url|mime|size|extmetadata|timestamp',iiurlwidth:'560',format:'json',formatversion:'2'
 });
 const data=await fetchJson('https://commons.wikimedia.org/w/api.php?'+params.toString());
 const pages=data.query?.pages||[];
 return pages.map(fromCommons).filter(x=>x&&allowedMime.has(x.mime)&&x.preview&&x.videoUrl&&x.sourceUrl);
}
export async function refresh(){
 const now=new Date().toISOString(),errors=[];
 const existing=await readFile('data/videos.json','utf8').then(JSON.parse).catch(()=>({videos:[]}));
 const all=topics.flatMap(q=>curatedVideos(q,30));let commons=0;
 for(const topic of topics){
  try{
   const results=await commonsSearch(topic);
   all.push(...results.map(x=>({...x,topics:[topic]})));
   commons+=results.length;
   console.log(topic+' -> '+results.length+' actual Commons video files');
  }catch(e){console.warn('Commons '+topic+': '+e.message);errors.push(topic+': '+e.message);}
 }
 // If Wikimedia temporarily fails, retain last correctly indexed Commons clips.
 if(!commons){
  all.push(...(existing.videos||[]).filter(x=>x.platform==='Wikimedia Commons'));
 }
 const unique=new Map();
 for(const v of all){
  if(!v||!v.videoUrl||!v.sourceUrl||!v.platform)continue;
  const key=v.platform+'::'+v.sourceUrl;
  if(!unique.has(key))unique.set(key,v);
 }
 const videos=[...unique.values()].sort((a,b)=>{
  const rank=v=>v.platform==='Wikimedia Commons'?2:1;
  return rank(b)-rank(a) || String(b.dateUploaded||'').localeCompare(a.dateUploaded||'');
 }).slice(0,500);
 await mkdir('data',{recursive:true});
 await writeFile('data/videos.json',JSON.stringify({generatedAt:now,source:'Wikimedia Commons + Pexels verified-source curated sample',videos,errors,dateMeaning:'Upload date only when provided; original recording dates unknown'},null,2)+'\n');
 console.log(JSON.stringify({total:videos.length,commons:videos.filter(x=>x.platform==='Wikimedia Commons').length,stock:videos.filter(x=>x.platform==='Pexels').length,errors:errors.length}));
}
if(process.argv[1]?.endsWith('refresh-videos.mjs'))refresh().catch(e=>{console.error(e);process.exitCode=1});
