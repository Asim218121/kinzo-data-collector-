import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,matchNews,searchLinks} from '../backend/server.mjs';
import {fromPexels,fromPixabay,fromCommons,curatedVideos} from '../backend/providers.mjs';
const response=body=>({ok:true,status:200,json:async()=>body});
async function withServer(env,fetcher,callback){
 const server=createServer({env,fetcher});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 try{return await callback(origin)}finally{await new Promise(resolve=>server.close(resolve))}
}
test('actual curated MP4 references are query matched and not mislabeled news',()=>{
 const v=curatedVideos('California flooding');
 assert.ok(v.length>=3);
 assert.ok(v.every(x=>x.videoUrl.endsWith('.mp4')&&x.dateRecorded===null&&x.sourceUrl.includes('pexels.com')));
 assert.ok(!curatedVideos('Mars rover sampling').length);
});
test('Pexels API maps real mp4 renditions with creator, duration and source',()=>{
 const video=fromPexels({id:72,url:'https://www.pexels.com/video/72/',duration:17,image:'https://images.pexels.com/poster.jpg',user:{name:'Jane'},video_files:[{file_type:'video/mp4',height:720,link:'https://videos.pexels.com/example.mp4'}]});
 assert.equal(video.platform,'Pexels');assert.equal(video.duration,17);assert.equal(video.creator,'Jane');
 assert.equal(video.videoUrl,'https://videos.pexels.com/example.mp4');assert.equal(video.dateRecorded,null);
});
test('Pixabay/Commons normalize sources and enforce mime/rights',()=>{
 const x=fromPixabay({id:8,user:'Artist',pageURL:'https://pixabay.com/videos/abc-8/',videos:{medium:{url:'https://cdn.pixabay.com/video.mp4',height:720}}});
 assert.equal(x.platform,'Pixabay');
 const w=fromCommons({pageid:10,title:'File:Event.webm',imageinfo:[{mime:'video/webm',url:'https://upload.wikimedia.org/video.webm',timestamp:'2026-11-20T00:00:00Z',extmetadata:{LicenseShortName:{value:'CC BY-SA 4.0'}}}]});
 assert.equal(w.platform,'Wikimedia Commons');assert.equal(w.downloadEligible,true);
 assert.equal(fromCommons({imageinfo:[{mime:'image/jpeg',url:'https://example.com/a.jpg'}]}),null);
});
test('unified API returns playable videos, dates, news and source links without API keys',async()=>{
 await withServer({},async()=>response({query:{pages:{}}}),async base=>{
  const health=await (await fetch(base+'/api/health')).json();
  assert.equal(health.status,'ok');assert.equal(health.providers.pexels,false);
  const r=await fetch(base+'/api/search?q=California%20flooding&limit=15&days=7');
  assert.equal(r.status,200);const data=await r.json();
  assert.ok(data.videos.length>=3,'curated MP4 fallback');
  assert.ok(data.videos.every(x=>x.videoUrl.startsWith('https://')));
  assert.ok(data.news.length>0,'actual cached article metadata');
  assert.ok(data.links.some(x=>x.platform==='YouTube'));
  assert.ok(data.links.some(x=>x.platform==='TikTok'));
  assert.ok(data.providerStatus.pexels.includes('not configured'));
  assert.equal(data.news[0].kind,'News reference');
 });
});
test('API keys enable Pexels and Pixabay API and return valid play URLs',async()=>{
 const called=[];
 const fetcher=async url=>{
  called.push(url);
  if(url.includes('api.pexels.com'))return response({videos:[{id:72,url:'https://www.pexels.com/video/72/',video_files:[{file_type:'video/mp4',height:720,link:'https://videos.pexels.com/video.mp4'}]}]});
  if(url.includes('pixabay.com'))return response({hits:[{id:19,user:'Example',pageURL:'https://pixabay.com/videos/foo-19/',videos:{medium:{url:'https://cdn.pixabay.com/video.mp4'}}}]});
  return response({query:{pages:{'1':{pageid:1,title:'File:Video.webm',imageinfo:[{mime:'video/webm',url:'https://upload.wikimedia.org/video.webm',descriptionurl:'https://commons.wikimedia.org/wiki/File:Video.webm',extmetadata:{LicenseShortName:{value:'Public domain'}}}]}}}});
 };
 await withServer({PEXELS_API_KEY:'test',PIXABAY_API_KEY:'test'},fetcher,async base=>{
  const d=await (await fetch(base+'/api/videos?q=California%20flooding')).json();
  assert.ok(d.videos.some(x=>x.platform==='Pexels'&&x.sourceType==='api'));
  assert.ok(d.videos.some(x=>x.platform==='Pixabay'));
  assert.ok(d.videos.some(x=>x.platform==='Wikimedia Commons'));
  assert.ok(called.length>=3);
 });
});
test('CORS restricted and server source code not publicly served',async()=>{
 await withServer({},async()=>response({query:{}}),async base=>{
  const a=await fetch(base+'/api/health',{headers:{Origin:'https://asim218121.github.io'}});
  assert.equal(a.headers.get('access-control-allow-origin'),'https://asim218121.github.io');
  const b=await fetch(base+'/api/health',{headers:{Origin:'https://evil.example'}});
  assert.equal(b.headers.get('access-control-allow-origin'),null);
  assert.equal((await fetch(base+'/backend/server.mjs')).status,404);
  assert.equal((await fetch(base+'/api/search?q=a')).status,400);
  assert.equal((await fetch(base+'/')).status,200);
 });
});
test('news date filter and relevance do not present unrelated quake as flood',()=>{
 const now=new Date().toISOString();
 const a=[{title:'California earthquake reported',url:'https://a.example/x',publishedAt:now},
 {title:'California flooding and heavy rainfall',url:'https://a.example/y',publishedAt:now}];
 const out=matchNews(a,'California flooding',7);
 assert.equal(out.length,1);assert.match(out[0].title,/flooding/);
 assert.ok(searchLinks('California flooding',7).length>=8);
});
