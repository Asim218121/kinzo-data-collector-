import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {queryVideos,mergeResults} from './providers.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.png':'image/png','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
const cache=new Map(),TTL=10*60*1000;
const safe=(s,max=180)=>String(s||'').trim().slice(0,max);
const allowedOrigin=(o,env)=>{
 if(!o)return '';
 const set=new Set(['https://asim218121.github.io','http://localhost:5173','http://127.0.0.1:5173','http://localhost:8765','http://127.0.0.1:8765',...(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean)]);
 return set.has(o)?o:'';
};
const send=(res,status,data,headers={})=>{
 const body=JSON.stringify(data);
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});
 res.end(body);
};
export const searchLinks=(q,days)=>{
 const u=encodeURIComponent(q),date=new Date(Date.now()-days*86400000).toISOString().slice(0,10);
 return [
  {platform:'YouTube',type:'social',url:'https://www.youtube.com/results?search_query='+u},
  {platform:'X',type:'social',url:'https://x.com/search?q='+encodeURIComponent(q+' since:'+date)+'&f=live'},
  {platform:'Instagram',type:'social',url:'https://www.instagram.com/explore/search/keyword/?q='+u},
  {platform:'Facebook',type:'social',url:'https://www.facebook.com/search/videos/?q='+u},
  {platform:'TikTok',type:'social',url:'https://www.tiktok.com/search?q='+u},
  {platform:'Reddit',type:'social',url:'https://www.reddit.com/search/?q='+u},
  {platform:'Reuters',type:'news',url:'https://www.reuters.com/site-search/?query='+u},
  {platform:'AP',type:'news',url:'https://apnews.com/search?q='+u},
  {platform:'BBC',type:'news',url:'https://www.bbc.co.uk/search?q='+u},
  {platform:'Google News',type:'news',url:'https://news.google.com/search?q='+u},
  {platform:'NOAA',type:'official',url:'https://www.google.com/search?q=site%3Anoaa.gov+'+u},
  {platform:'USGS',type:'official',url:'https://www.google.com/search?q=site%3Ausgs.gov+'+u}
 ];
};
export function matchNews(articles,q,days=7,limit=35){
 const stop=new Set(['california','usa','canada','australia','north','south','weather','november','latest','news','video','2026','the','for']);
 const words=q.toLowerCase().split(/[^a-z]+/).filter(w=>w.length>=4),key=words.filter(w=>!stop.has(w)),cutoff=Date.now()-days*86400000;
 return articles.filter(a=>{
  const d=Date.parse(a.publishedAt||'');
  if(!Number.isFinite(d)||d<cutoff||!/^https?:\/\//.test(a.url||''))return false;
  const title=String(a.title||'').toLowerCase();
  const variants=w=>[w,w.replace(/ing$/,''),w==='atmospheric'?'rain':'',w==='snowstorm'?'snow':''].filter(Boolean);
  if(key.length)return key.some(w=>variants(w).some(z=>title.includes(z)));
  return words.some(w=>title.includes(w))||!words.length;
 }).sort((a,b)=>String(b.publishedAt).localeCompare(a.publishedAt)).slice(0,limit);
}
async function loadNews(){
 try{const d=JSON.parse(await readFile(path.join(root,'data/news.json'),'utf8'));return d}
 catch{return {generatedAt:null,articles:[]}}
}
async function mediaSearch(q,source,limit,env,fetcher){
 const key=JSON.stringify([q.toLowerCase(),source,limit,Boolean(env.PEXELS_API_KEY),Boolean(env.PIXABAY_API_KEY)]);
 const cached=cache.get(key);
 if(cached&&Date.now()-cached.at<TTL)return {...cached.data,cacheHit:true};
 const remote=await queryVideos(q,{fetcher,env,perPage:Math.min(limit,30),source});
 const data={videos:mergeResults(q,remote.videos,limit),providers:remote.status,cacheHit:false};
 cache.set(key,{at:Date.now(),data});
 if(cache.size>120)cache.delete(cache.keys().next().value);
 return data;
}
async function respond(req,res,{env,fetcher}){
 const origin=allowedOrigin(req.headers.origin,env);
 if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method==='OPTIONS'){res.writeHead(origin?204:403,{'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type'});res.end();return;}
 if(req.method!=='GET'){send(res,405,{error:'Only GET requests are supported'});return}
 const url=new URL(req.url,'http://localhost'),pathname=url.pathname;
 if(pathname==='/api/health'){
  return send(res,200,{status:'ok',service:'Kinzo Video Research API',version:'2.0',providers:{pexels:Boolean(env.PEXELS_API_KEY),pixabay:Boolean(env.PIXABAY_API_KEY),commons:true},news:'same-server JSON cache'});
 }
 if(pathname.startsWith('/api/')){
  if(!['/api/search','/api/videos','/api/news'].includes(pathname))return send(res,404,{error:'Unknown endpoint'});
  const q=safe(url.searchParams.get('q'));
  if(q.length<3)return send(res,400,{error:'Search query must contain at least 3 characters'});
  const source=safe(url.searchParams.get('source')||'all',30);
  if(!['all','pexels','pixabay','commons'].includes(source))return send(res,400,{error:'Unknown media source'});
  const limit=Math.max(1,Math.min(50,Number.parseInt(url.searchParams.get('limit'),10)||24));
  const days=Math.max(1,Math.min(90,Number.parseInt(url.searchParams.get('days'),10)||7));
  const wantsVideos=pathname!== '/api/news',wantsNews=pathname!=='/api/videos';
  const [media,news]=await Promise.all([wantsVideos?mediaSearch(q,source,limit,env,fetcher):Promise.resolve({videos:[],providers:{}}),wantsNews?loadNews():Promise.resolve({articles:[]})]);
  return send(res,200,{query:q,days,generatedAt:new Date().toISOString(),videos:media.videos,
   news:wantsNews?matchNews(news.articles||[],q,days,limit):[],newsUpdatedAt:news.generatedAt||null,
   links:searchLinks(q,days),providerStatus:media.providers,cacheHit:!!media.cacheHit,
   notes:['Playable video files are licensed stock/Commons assets, not proof of current news events.','News and social platforms are source links; download only with rights or authorized APIs.','Unknown recording dates remain null.']});
 }
 let pathnameDecoded;
 try{pathnameDecoded=decodeURIComponent(pathname)}catch{send(res,400,{error:'Invalid path'});return}
 if(pathnameDecoded==='/'||pathnameDecoded==='/index.html')pathnameDecoded='/index.html';
 if(pathnameDecoded.includes('..')||pathnameDecoded.startsWith('/backend/')||pathnameDecoded.startsWith('/scripts/')||pathnameDecoded.startsWith('/tests/')||pathnameDecoded.startsWith('/.github/')||pathnameDecoded.startsWith('/node_modules/')||pathnameDecoded==='/package.json'||pathnameDecoded==='/render.yaml'){
  send(res,404,{error:'Not found'});return;
 }
 const local=path.resolve(root,'.'+pathnameDecoded);
 if(!local.startsWith(root+path.sep)){send(res,403,{error:'Forbidden'});return}
 try{
  if(!(await stat(local)).isFile())throw Error('Not a file');
  const b=await readFile(local),type=mime[path.extname(local)]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':type,'Cache-Control':type.startsWith('text/html')?'no-cache':'public, max-age=90'});
  res.end(b);
 }catch{send(res,404,{error:'File not found'})}
}
export function createServer({env=process.env,fetcher=fetch}={}){
 return http.createServer((req,res)=>{
  respond(req,res,{env,fetcher}).catch(err=>{console.error('Kinzo request error:',err.message);if(!res.headersSent)send(res,500,{error:'Internal server error'});else res.end()})
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Math.min(65535,Math.max(1,Number(process.env.PORT)||8787));
 createServer().listen(port,'0.0.0.0',()=>console.log('Kinzo backend listening on '+port));
}
