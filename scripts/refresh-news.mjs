// Kinzo cached news collector. Runs on GitHub Actions, not in the viewer's browser.
// Each result is a source link and metadata, not reusable video or image content.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const topics=[
 'California atmospheric river flooding','California snowstorm Sierra Nevada',
 'California coastal waves storm','US weather storm forecast',
 'polar vortex winter North America','Canada severe weather',
 'USGS earthquake tsunami','volcano eruption USGS',
 'NOAA hurricane storm','Australia severe weather',
 'UK flooding storm','NASA earth science weather'
];
const decode=s=>String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,v)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[v]));
const tag=(xml,name)=>decode(xml.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'))?.[1]||'').trim();
const validUrl=s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}};
export function parseRss(xml,topic){
 const items=String(xml).match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi)||[];
 return items.map(item=>{
  const title=tag(item,'title').slice(0,360),url=validUrl(tag(item,'link'));
  const date=Date.parse(tag(item,'pubDate'));
  const publisher=tag(item,'source')||'Google News indexed publisher';
  if(!url||!title||!Number.isFinite(date))return null;
  return {id:url,title,url,provider:publisher,publishedAt:new Date(date).toISOString(),
   recordedAt:null,topic,image:null,kind:'News reference',license:'Source link only; permission required for footage'};
 }).filter(Boolean);
}
async function fetchFeed(topic){
 const q=topic+' when:7d';
 const url='https://news.google.com/rss/search?q='+encodeURIComponent(q)+'&hl=en-US&gl=US&ceid=US:en';
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),17000);
 try{
  const res=await fetch(url,{signal:ctrl.signal,headers:{'User-Agent':'KinzoResearch/1.0 (news reference collector)','Accept':'application/rss+xml,application/xml,text/xml'}});
  if(!res.ok)throw Error('HTTP '+res.status);
  const body=await res.text();
  return parseRss(body,topic).slice(0,30);
 }finally{clearTimeout(timer)}
}
async function main(){
 const collected=[],errors=[];
 for(const topic of topics){
  try{const articles=await fetchFeed(topic);collected.push(...articles);console.log(topic+': '+articles.length)}
  catch(e){errors.push(topic+': '+e.message);console.warn('Source unavailable: '+topic+' '+e.message)}
 }
 const unique=new Map();
 for(const item of collected)if(!unique.has(item.url))unique.set(item.url,item);
 const articles=[...unique.values()].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)).slice(0,250);
 await mkdir('data',{recursive:true});
 if(!articles.length){
  console.warn('No feeds available; preserving last known cache. '+errors.join('; '));
  try{await readFile('data/news.json','utf8');return}catch{}
 }
 const out={generatedAt:new Date().toISOString(),source:'Google News RSS publisher links',dateMeaning:'Publisher-reported article date, not footage recording date',articles,errors:errors.slice(0,8)};
 await writeFile('data/news.json',JSON.stringify(out,null,2)+'\n','utf8');
 console.log('Written '+articles.length+' unique news references.');
}
if(process.argv[1]&&process.argv[1].endsWith('refresh-news.mjs')) main().catch(e=>{console.error(e);process.exitCode=1});
