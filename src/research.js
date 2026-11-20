// Kinzo News & Social Research — browser-only, no unauthorized media scraping.
const qs = (s) => document.querySelector(s);
const researchKey='kinzo-news-references-v1';
const providers=[
 ['Google News','https://news.google.com/search?q='],
 ['Associated Press','https://apnews.com/search?q='],
 ['Reuters','https://www.reuters.com/site-search/?query='],
 ['BBC News','https://www.bbc.co.uk/search?q='],
 ['CNN','https://www.cnn.com/search?q='],
 ['ABC News','https://abcnews.go.com/search?searchtext='],
 ['NBC News','https://www.nbcnews.com/search/?q='],
 ['Fox Weather','https://www.foxweather.com/search?q='],
 ['The Weather Channel','https://weather.com/search?q='],
 ['AccuWeather','https://www.accuweather.com/en/search-locations?query='],
 ['The Guardian','https://www.theguardian.com/uk/search?q='],
 ['Los Angeles Times','https://www.latimes.com/search?q='],
 ['SF Chronicle','https://www.sfchronicle.com/search/?action=search&searchindex=solr&query='],
 ['CBS News','https://www.cbsnews.com/search/?q='],
 ['USGS','https://www.usgs.gov/search?keywords='],
 ['NOAA','https://www.google.com/search?q=site%3Anoaa.gov+'],
 ['NASA','https://www.google.com/search?q=site%3Anasa.gov+']
];
const social=[
 ['YouTube','https://www.youtube.com/results?search_query='],
 ['X / Twitter','https://x.com/search?q='],
 ['Instagram','https://www.instagram.com/explore/search/keyword/?q='],
 ['Facebook Videos','https://www.facebook.com/search/videos/?q='],
 ['TikTok','https://www.tiktok.com/search?q='],
 ['Reddit','https://www.reddit.com/search/?q='],
 ['Threads','https://www.threads.com/search?q=']
];
const safe=(s)=>String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(url,label)=>'<a class="r-link" target="_blank" rel="noopener noreferrer" href="'+safe(url)+'">'+safe(label)+'</a>';
const getQuery=()=>qs('#searchQuery')?.value.trim()||'California weather';
const days=()=>Number(qs('#newsDays')?.value||7);
const fromDate=()=>{const dt=new Date(Date.now()-days()*86400000);return dt.toISOString().slice(0,10)};
const dateQ=(name,q)=>name==='X / Twitter'?q+' since:'+fromDate():q;
const sourceSearch=(domain,q)=>'https://www.google.com/search?q='+encodeURIComponent('site:'+domain+' '+q+' after:'+fromDate());
const currentSaved=()=>{try{return JSON.parse(localStorage.getItem(researchKey)||'[]').filter(x=>x&&x.url)}catch{return []}};
function persistSaved(v){try{localStorage.setItem(researchKey,JSON.stringify(v.slice(0,300)))}catch{status('Storage full; export the saved source list.')} }
const status=(s)=>{qs('#newsStatus').textContent=s};
const dedupe=(list)=>{const seen=new Set();return list.filter(x=>{if(!x.url||seen.has(x.url))return false;seen.add(x.url);return true})};
const articleDate=(raw)=>{
 if(typeof raw!=='string'||!raw)return null;
 if(/^\d{14}$/.test(raw))return raw.slice(0,4)+'-'+raw.slice(4,6)+'-'+raw.slice(6,8)+'T'+raw.slice(8,10)+':'+raw.slice(10,12)+':'+raw.slice(12,14)+'Z';
 const d=new Date(raw);return isNaN(d.getTime())?null:d.toISOString()
};
function recordNews(raw){
 const u=raw.url||'';
 if(!/^https?:\/\//i.test(u))return null;
 let host='unknown';try{host=new URL(u).hostname.replace(/^www\./,'')}catch{}
 return {id:u,title:String(raw.title||'Untitled article').slice(0,320),url:u,provider:host,
   publishedAt:articleDate(raw.seendate||raw.publishedAt||raw.date),recordedAt:null,
   image:(/^https?:\/\//i.test(raw.socialimage||''))?raw.socialimage:null,
   language:raw.language||'Unknown',kind:'News reference',license:'Not licensed for redistribution'};
}
function renderCards(items){
 const el=qs('#newsResults');
 if(!items.length){el.innerHTML='<div class="r-empty">No live news returned for this search. Use the verified publisher search links below.</div>';return}
 el.innerHTML=items.map(x=>'<article class="r-card">'+(x.image?'<img loading="lazy" referrerpolicy="no-referrer" alt="" src="'+safe(x.image)+'" onerror="this.remove()"/>':'')+
   '<div class="r-body"><span class="r-meta">'+safe(x.provider)+' · '+safe(x.publishedAt?new Date(x.publishedAt).toLocaleString():'Date unverified')+'</span>'+
   '<h4>'+safe(x.title)+'</h4><p>Article reference only · Media reuse requires rights clearance</p>'+
   '<div class="r-actions">'+link(x.url,'Open original article ↗')+'<button class="r-save" data-save="'+safe(x.id)+'">Save source</button></div></div></article>').join('');
}
let newsArticles=[];
const btn=qs('#newsSearch');
async function searchNews(){
 const q=getQuery();
 if(!q){status('Enter a search topic first.');return;}
 btn.disabled=true;
 drawLinks();
 status('Loading news results saved by the Kinzo news collector…');
 qs('#newsResults').innerHTML='';
 try{
  // Same-origin GitHub Pages JSON: no cross-site API or CORS request.
  const res=await fetch('./data/news.json?reload='+Date.now(),{cache:'no-store'});
  if(!res.ok)throw Error('News cache HTTP '+res.status);
  const data=await res.json();
  const all=Array.isArray(data.articles)?data.articles:[];
  const words=q.toLowerCase().split(/\W+/).filter(w=>w.length>=4&&!['latest','news','video','footage','weather','november','2026'].includes(w));
  const cutoff=Date.now()-days()*86400000;
  const priority=words.filter(w=>!['california','canada','america','american','australia','united','states','north','south','eastern','western','november','2026'].includes(w));
  const normalize=(str)=>String(str||'').toLowerCase();
  const isRelevant=(x)=>{const title=normalize(x.title),topic=normalize(x.topic);if(!priority.length)return words.some(w=>(title+' '+topic).includes(w))||!words.length;return priority.some(w=>title.includes(w)|| (w==='flooding'&&/flood|rain|atmospheric|storm/.test(title)) || (w==='snowstorm'&&/snow|winter|blizzard/.test(title)) || (w==='earthquake'&&/quake|seismic|earthquake/.test(title))) && (!words.some(w=>['california','canada','australia'].includes(w)) || words.some(w=>['california','canada','australia'].includes(w)&&(title+' '+topic).includes(w)));};
  newsArticles=dedupe(all.map(x=>({...x,id:x.url})).filter(x=>{
   if(!x.url||!x.title||!x.publishedAt)return false;
   const date=Date.parse(x.publishedAt);
   if(!Number.isFinite(date)||date<cutoff)return false;
   if(!words.length)return true;
   return isRelevant(x);
  }).sort((a,b)=>(b.publishedAt||'').localeCompare(a.publishedAt||''))).slice(0,75);
  renderCards(newsArticles);
  if(!all.length){
    status('The automatic news cache has not gathered articles yet. Open the publisher and social search links below for live results. Stock B-roll is shown separately below.');
  }else if(!newsArticles.length){
    status(all.length+' articles cached, but none match this topic and date range. Try broader words or 30 days. Publisher search links below show live topic results.');
  }else{
    status(newsArticles.length+' dated news references matched. Cache updated '+(data.generatedAt?new Date(data.generatedAt).toLocaleString():'date unverified')+'. These are article links, not licensed videos.');
  }
 }catch(e){
  newsArticles=[];renderCards([]);
  status('News cache unavailable ('+e.message+'). Use the live publisher and social links below. Video B-roll remains available above.');
 }finally{btn.disabled=false;}
}
function drawLinks(){
 const q=getQuery(),u=encodeURIComponent(q);
 const wrap=qs('#newsPublisherLinks');
 wrap.innerHTML=providers.map(([name,base])=>'<a target="_blank" rel="noopener noreferrer" href="'+safe(base+u)+'">'+safe(name)+' ↗</a>').join('');
 const sc=qs('#socialResearchLinks');
 sc.innerHTML=social.map(([name,base])=>{
   const query=dateQ(name,q);
   const target=name==='X / Twitter'?base+encodeURIComponent(query)+'&f=live':base+encodeURIComponent(query);
   let fallback='';
   if(name==='Instagram'||name==='Facebook Videos'||name==='Threads'){
     const domain=name==='Instagram'?'instagram.com':name==='Threads'?'threads.com':'facebook.com';
     fallback=link(sourceSearch(domain,q),'Google-indexed recent posts');
   }
   return '<article class="r-social"><strong>'+safe(name)+'</strong><small>Search links · verify post date and creator</small><div class="r-actions">'+link(target,'Open search ↗')+fallback+'</div></article>';
 }).join('');
 qs('#newsRangeLabel').textContent='Latest '+days()+' days · links reflect the current topic';
}
function saveNews(id){
 const x=newsArticles.find(z=>z.id===id);if(!x)return;
 const list=currentSaved();
 if(!list.some(y=>y.url===x.url)){list.push(x);persistSaved(list)}
 updateSaved();
}
function updateSaved(){
 const list=currentSaved();qs('#newsSavedCount').textContent=list.length+' saved';
 qs('#newsSavedLinks').innerHTML=list.length?list.slice(-12).reverse().map(x=>'<div class="r-saved">'+link(x.url,x.title.slice(0,95))+'<button class="r-remove" data-remove="'+safe(x.url)+'">Remove</button></div>').join(''):'No saved articles yet.';
}
function download(name,content,mime){const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),8000)}
qs('#newsExport').addEventListener('click',()=>download('kinzo-news-sources.json',JSON.stringify({topic:getQuery(),dateRangeDays:days(),exportedAt:new Date().toISOString(),sources:currentSaved()},null,2),'application/json'));
qs('#newsExportCSV').addEventListener('click',()=>{
 const lines=[['title','provider','date_reported','source_url','rights'],...currentSaved().map(a=>[a.title,a.provider,a.publishedAt||'',a.url,a.license])];
 const csv=lines.map(row=>row.map(x=>'"'+String(x??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 download('kinzo-news-sources.csv','\ufeff'+csv,'text/csv;charset=utf-8');
});
document.addEventListener('click',e=>{const save=e.target.closest('[data-save]');if(save)saveNews(save.dataset.save);
 const del=e.target.closest('[data-remove]');if(del){persistSaved(currentSaved().filter(x=>x.url!==del.dataset.remove));updateSaved();}
});
btn.addEventListener('click',searchNews);
qs('#searchForm').addEventListener('submit',()=>{searchNews();});
qs('#newsDays').addEventListener('change',drawLinks);
qs('#searchQuery').addEventListener('input',drawLinks);
qs('#newsLinksRefresh').addEventListener('click',drawLinks);
drawLinks();updateSaved();
// Show genuine news references immediately on page load; no extra hidden step.
searchNews();
