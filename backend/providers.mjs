// Kinzo's authorized video providers. No scraping or bypassing login/DRM.
export const fallback=[
 ['Flooded street','flood rain california','D Goug','18640859','18640859-hd_1920_1080_60fps.mp4','california-floods-flooding-heavy-rains-speeding-18640859.jpeg',5],
 ['Flooded nighttime road','flood road cars','Lone Pictures','9481659','9481659-hd_1920_1080_24fps.mp4','busy-road-city-road-city-traffic-india-9481659.jpeg',15],
 ['Urban street flood','flood rainstorm street','Somogro Bangladesh','38550052','16374217_1920_1080_30fps.mp4','pexels-photo-38550052.jpeg',13],
 ['Heavy city rain','rain wet street','Kiwi and Camera','39273127','16711476_1920_1080_25fps.mp4','auckland-city-city-life-cloudy-39273127.jpeg',15],
 ['Ocean storm waves','ocean coast storm waves','Everett Bumstead','35970704','15252357_1920_1080_24fps.mp4','4k-sunset-beach-rocks-british-columbia-canada-35970704.jpeg',47],
 ['Beach waves','ocean coast waves','Marc K','17739264','17739264-hd_1920_1080_30fps.mp4','pexels-photo-17739264.jpeg',31],
 ['Rocky coast waves','ocean storm waves rocky','Emily H','36072343','15297967_1920_1080_30fps.mp4','pexels-photo-36072343.jpeg',9],
 ['Snowy forest road','winter snowy road forest','Александр Сергеев','35280444','14946008_1920_1080_30fps.mp4','-35280444.jpeg',5],
 ['Driving through snowfall','winter snow storm highway','Ms. Jade','10268512','10268512-hd_1920_1080_30fps.mp4','road-roadtrip-sky-snow-10268512.jpeg',11],
 ['Snowy highway','winter snow highway','K','30243327','12967729_1920_1080_24fps.mp4','pexels-photo-30243327.jpeg',12],
 ['Blizzard driving','winter snow blizzard highway','Kim Dodge','35193500','14909547_1920_1080_30fps.mp4','2-lanes-blizzard-canada-december-35193500.jpeg',59]
];
const stop=new Set(['california','canada','usa','the','and','for','latest','video','videos','footage','weather','november','2026','storm','breaking','north','south','news','this','from']);
const terms=q=>String(q||'').toLowerCase().split(/[^a-z]+/).filter(w=>w.length>=3&&!stop.has(w));
const stems=t=>[t,t.replace(/ing$/,''),t.replace(/s$/,''),t==='atmospheric'?'rain':'',t==='blizzard'?'snow':'',t==='flooding'?'flood':''].filter(Boolean);
export function relevance(q,text){
 const t=String(text||'').toLowerCase(),words=terms(q);
 if(!words.length)return 0;
 return words.reduce((score,w)=>score+(stems(w).some(part=>t.includes(part))?1:0),0);
}
export function curatedVideos(q,limit=20){
 return fallback.map(([title,tags,creator,id,mp4,image,duration])=>{
  const score=relevance(q,title+' '+tags);
  if(!score)return null;
  return {id:'pexels-curated-'+id,platform:'Pexels',kind:'video',title,creator,duration,
   preview:'https://images.pexels.com/videos/'+id+'/'+image+'?auto=compress&cs=tinysrgb&w=900',
   videoUrl:'https://videos.pexels.com/video-files/'+id+'/'+mp4,
   sourceUrl:'https://www.pexels.com/video/'+id+'/',license:'Pexels License (review source)',
   licenseUrl:'https://www.pexels.com/license/',downloadEligible:true,
   mime:'video/mp4',dateUploaded:null,dateRecorded:null,sourceType:'curated','relevance':score};
 }).filter(Boolean).sort((a,b)=>b.relevance-a.relevance).slice(0,limit);
}
export const isWebUrl=x=>{try{const u=new URL(String(x));return ['https:','http:'].includes(u.protocol)}catch{return false}};
const parseMeta=meta=>String(meta?.value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const licenseNote=(short,url)=>{const s=(short+' '+url).toLowerCase();
 if(/public domain|cc0|publicdomain/.test(s))return {license:short||'Public domain',downloadEligible:true};
 if(/cc[- ]?by|creativecommons.org\/licenses\/by/.test(s))return {license:short||'Creative Commons BY (attribution required)',downloadEligible:true};
 return {license:short||'Review original rights',downloadEligible:false};};
export function fromCommons(page){
 const info=page?.imageinfo?.[0],url=info?.url;
 if(!info?.mime?.startsWith('video/')||!isWebUrl(url))return null;
 const m=info.extmetadata||{},short=parseMeta(m.LicenseShortName),licenseUrl=parseMeta(m.LicenseUrl);
 const rights=licenseNote(short,licenseUrl);
 return {id:'commons-'+page.pageid,platform:'Wikimedia Commons',kind:'video',
  title:String(page.title||'Commons video').replace(/^File:/,''),
  creator:parseMeta(m.Artist)||'See original',preview:isWebUrl(info.thumburl)?info.thumburl:null,
  videoUrl:url,sourceUrl:info.descriptionurl||'https://commons.wikimedia.org/?curid='+page.pageid,
  license: rights.license,licenseUrl,downloadEligible:rights.downloadEligible,
  mime:info.mime,dateUploaded:info.timestamp||null,dateRecorded:null,duration:null,
  sourceType:'api',relevance:0};
}
export function fromPexels(v){
 const files=(v.video_files||[]).filter(f=>f.file_type==='video/mp4'&&isWebUrl(f.link));
 const best=files.sort((a,b)=>Math.abs((a.height||720)-720)-Math.abs((b.height||720)-720))[0];
 if(!best||!isWebUrl(v.url))return null;
 return {id:'pexels-'+v.id,platform:'Pexels',kind:'video',title:'Pexels footage #'+v.id,
   creator:v.user?.name||'Pexels creator',preview:isWebUrl(v.image)?v.image:null,videoUrl:best.link,
   sourceUrl:v.url,license:'Pexels License (review source)',
   licenseUrl:'https://www.pexels.com/license/',downloadEligible:true,dateUploaded:null,dateRecorded:null,
   mime:'video/mp4',duration:v.duration||null,width:best.width||null,height:best.height||null,sourceType:'api',relevance:1};
}
export function fromPixabay(v){
 const sizes=v.videos||{},file=sizes.medium||sizes.large||sizes.small||sizes.tiny;
 if(!file?.url||!isWebUrl(file.url))return null;
 return {id:'pixabay-'+v.id,platform:'Pixabay',kind:'video',title:'Pixabay footage #'+v.id,
   creator:v.user||'Pixabay creator',preview:isWebUrl(v.picture_id?('https://i.vimeocdn.com/video/'+v.picture_id+'_640x360.jpg'):null)?'https://i.vimeocdn.com/video/'+v.picture_id+'_640x360.jpg':null,
   videoUrl:file.url,sourceUrl:v.pageURL||'https://pixabay.com/videos/id-'+v.id+'/',
   license:'Pixabay Content License (review source)',licenseUrl:'https://pixabay.com/service/license-summary/',
   downloadEligible:true,dateUploaded:null,dateRecorded:null,duration:v.duration||null,
   mime:'video/mp4',width:file.width||null,height:file.height||null,sourceType:'api',relevance:1};
}
async function jsonFetch(url,opts={},fetcher=fetch,timeout=9000){
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeout);
 try{const r=await fetcher(url,{...opts,signal:c.signal});if(!r.ok)throw new Error('Upstream HTTP '+r.status);return await r.json();}
 finally{clearTimeout(timer)}
}
export async function queryVideos(q,{fetcher=fetch,env=process.env,perPage=18,source='all'}={}){
 const results=[],status={};
 const sources=['pexels','pixabay','commons'].filter(s=>source==='all'||source===s);
 const tasks=sources.map(async kind=>{
  try{
   let mapped=[];
   if(kind==='pexels'){
    if(!env.PEXELS_API_KEY){status.pexels='API key not configured';return}
    const u='https://api.pexels.com/v1/videos/search?'+new URLSearchParams({query:q,per_page:String(perPage),orientation:'landscape'});
    const d=await jsonFetch(u,{headers:{Authorization:env.PEXELS_API_KEY}},fetcher);
    mapped=(d.videos||[]).map(fromPexels).filter(Boolean);
   }else if(kind==='pixabay'){
    if(!env.PIXABAY_API_KEY){status.pixabay='API key not configured';return}
    const u='https://pixabay.com/api/videos/?'+new URLSearchParams({key:env.PIXABAY_API_KEY,q,per_page:String(Math.max(3,perPage)),safesearch:'true'});
    const d=await jsonFetch(u,{},fetcher);
    mapped=(d.hits||[]).map(fromPixabay).filter(Boolean);
   }else{
    const u='https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',generator:'search',gsrsearch:q+' filetype:video',gsrnamespace:'6',gsrlimit:String(perPage),prop:'imageinfo',iiprop:'url|mime|size|extmetadata|timestamp',iiurlwidth:'540',format:'json',origin:'*'});
    const d=await jsonFetch(u,{},fetcher);
    mapped=Object.values(d.query?.pages||{}).map(fromCommons).filter(Boolean);
   }
   results.push(...mapped);
   status[kind]=mapped.length+' video results';
  }catch(e){status[kind]='Unavailable: '+e.message}
 });
 await Promise.allSettled(tasks);
 return {videos:results,status};
}
export function mergeResults(q,remote,limit=40){
 const seen=new Set(),all=[...remote,...curatedVideos(q,limit)];
 return all.filter(v=>{
  const key=v.platform+':'+v.sourceUrl;
  if(!v.videoUrl||!isWebUrl(v.videoUrl)||seen.has(key))return false;
  seen.add(key);return true;
 }).slice(0,limit);
}
