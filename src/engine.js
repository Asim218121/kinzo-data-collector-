// Kinzo Free Video Research — static GitHub Pages edition; no paid server or API credentials.
const $=selector=>document.querySelector(selector);
const escapeText=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel=d=>d&&!Number.isNaN(Date.parse(d))?new Date(d).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}):'Unverified';
let freeVideoCache=null,freeNewsCache=null,isLoading=false;
const stop=new Set(['the','and','november','2026','usa','california','canada','australia','this','weather','video','videos','news','footage','latest','from','for','north','south','united','states','american']);
const tokens=q=>String(q||'').toLowerCase().split(/[^a-z]+/).filter(w=>w.length>3&&!stop.has(w));
const alias={flooding:['flood','rain','water'],atmospheric:['rain','flood'],rainfall:['rain','flood'],earthquake:['earthquake','seismic','quake'],snowstorm:['snow','blizzard','winter'],hurricane:['hurricane','typhoon','storm'],cyclone:['cyclone','typhoon','storm'],volcano:['volcano','eruption'],tsunami:['tsunami','ocean','wave'],tornado:['tornado','twister'],wildfire:['wildfire','fire']};
const expanded=w=>[w,w.replace(/ing$/,''),...(alias[w]||[])];
function scoreVideo(v,q){
 const words=tokens(q);
 if(!words.length)return 1;
 const text=[v.title,v.topics?.join(' '),v.tags,v.description].join(' ').toLowerCase();
 return words.reduce((n,w)=>n+(expanded(w).some(p=>p.length>=3&&text.includes(p))?1:0),0);
}
function matchNews(a,q){
 const words=tokens(q);
 if(!words.length)return 1;
 const title=String(a.title||'').toLowerCase();
 return words.reduce((n,w)=>n+(expanded(w).some(p=>p.length>=3&&title.includes(p))?1:0),0);
}
function mark(s,mode='info'){$('#engineStatus').textContent=s;$('#engineStatus').dataset.status=mode;}
async function fetchCache(file){
 const response=await fetch('./data/'+file+'.json',{cache:'no-store'});
 if(!response.ok)throw Error(file+' cache HTTP '+response.status);
 return await response.json();
}
function socialSources(q){
 const e=encodeURIComponent(q),date=new Date(Date.now()-7*86400000).toISOString().slice(0,10);
 return [
  ['YouTube videos','https://www.youtube.com/results?search_query='+e],
  ['X posts','https://x.com/search?q='+encodeURIComponent(q+' since:'+date)+'&f=live'],
  ['Instagram','https://www.instagram.com/explore/search/keyword/?q='+e],
  ['Facebook videos','https://www.facebook.com/search/videos/?q='+e],
  ['TikTok videos','https://www.tiktok.com/search?q='+e],
  ['Reddit','https://www.reddit.com/search/?q='+e],
  ['Google News','https://news.google.com/search?q='+e],
  ['Reuters','https://www.reuters.com/site-search/?query='+e],
  ['AP','https://apnews.com/search?q='+e],
  ['NOAA','https://www.google.com/search?q=site%3Anoaa.gov+'+e],
  ['NASA','https://www.google.com/search?q=site%3Anasa.gov+'+e]
 ].map(([platform,url])=>({platform,url}));
}
function renderVideos(items){
 const target=$('#engineVideoResults');
 if(!items.length){target.innerHTML='<div class="r-empty">No matching playable files in the current free video index. Try flood, snow, storm, volcano, hurricane or earthquake. Social searches below can find original event coverage.</div>';return;}
 target.innerHTML=items.map(v=>{
  const url=escapeText(v.videoUrl),orig=escapeText(v.sourceUrl),poster=escapeText(v.preview||'');
  const isWebm=v.mime==='video/webm'||/\.webm(?:[?#]|$)/i.test(v.videoUrl||'');
  const sourceType=isWebm?'video/webm':'video/mp4';
  const fileLabel=isWebm?'WebM':'MP4';
  const license=escapeText(v.license||'Check original file license');
  return '<article class="pro-video-card"><div class="pro-video-wrap"><video controls playsinline preload="none" '+(poster?'poster="'+poster+'"':'')+'><source src="'+url+'" type="'+sourceType+'">Video format unsupported by this browser.</video>'+
    '<span class="pro-platform">'+escapeText(v.platform||'Media source')+'</span></div><div class="pro-video-meta">'+
    '<h4>'+escapeText(v.title||'Untitled media')+'</h4>'+
    '<p>'+escapeText(v.creator||'Creator unverified')+' · '+(v.duration?escapeText(v.duration)+' seconds':'Duration unknown')+'</p>'+
    '<p>Uploaded: '+escapeText(dateLabel(v.dateUploaded))+' · Recorded: '+escapeText(dateLabel(v.dateRecorded))+'</p>'+
    '<p class="pro-rights">'+license+'</p><div class="pro-links">'+
    '<a class="secondary" target="_blank" rel="noopener noreferrer" href="'+orig+'">Original source ↗</a>'+
    '<a class="secondary" target="_blank" rel="noopener noreferrer" href="'+url+'">Play full '+fileLabel+' ↗</a>'+
    (v.downloadEligible?'<a class="primary" target="_blank" rel="noopener noreferrer" href="'+url+'" download>Download '+fileLabel+' ↗</a>':'')+
    '</div><small>Stock/archival illustrative footage. This is not independently verified footage of the searched current news event. Check rights before use.</small></div></article>';
 }).join('');
}
function renderNews(items){
 const target=$('#engineNewsResults');
 target.innerHTML=items.length?items.slice(0,24).map(n=>
  '<article class="pro-news-card"><small>'+escapeText(n.provider||'News source')+' · '+escapeText(dateLabel(n.publishedAt))+'</small>'+
  '<p>'+escapeText(n.title)+'</p><a href="'+escapeText(n.url)+'" target="_blank" rel="noopener noreferrer">Read dated report ↗</a></article>'
 ).join(''):'<p class="muted">No matching dated news cached. Use original publisher search links below.</p>';
}
function renderSocial(q){
 $('#engineSocialLinks').innerHTML=socialSources(q).map(x=>'<a href="'+escapeText(x.url)+'" target="_blank" rel="noopener noreferrer">'+escapeText(x.platform)+' ↗</a>').join('');
}
function selectedDays(){return Number($('#engineDays').value)||7}
function searchQuery(){return $('#searchQuery').value.trim()||'California flooding'}
async function runFreeSearch(){
 if(isLoading)return;
 isLoading=true;const button=$('#engineSearch');button.disabled=true;
 const q=searchQuery(),type=$('#engineProvider')?.value||'all';
 mark('Loading free video index and news cache…');
 renderSocial(q);
 try{
  const [videos,news]=await Promise.all([
   freeVideoCache?Promise.resolve(freeVideoCache):fetchCache('videos'),
   freeNewsCache?Promise.resolve(freeNewsCache):fetchCache('news')
  ]);
  freeVideoCache=videos;freeNewsCache=news;
  const videoSet=(videos.videos||[]).filter(v=>v?.videoUrl&&v?.sourceUrl&&
     ['video/mp4','video/webm','video/ogg',undefined].includes(v.mime)&&
     (type==='all'||v.platform===type))
    .map(v=>({...v,matchScore:scoreVideo(v,q)})).filter(v=>v.matchScore>0)
    .sort((a,b)=>b.matchScore-a.matchScore||((a.platform==='Wikimedia Commons')?-1:1))
    .slice(0,48);
  const cutoff=Date.now()-selectedDays()*86400000;
  const newsSet=(news.articles||[]).filter(n=>n.title&&n.url&&Number.isFinite(Date.parse(n.publishedAt))&&Date.parse(n.publishedAt)>=cutoff)
    .map(n=>({...n,matchScore:matchNews(n,q)})).filter(n=>n.matchScore>0)
    .sort((a,b)=>b.matchScore-a.matchScore||String(b.publishedAt).localeCompare(a.publishedAt)).slice(0,36);
  renderVideos(videoSet);renderNews(newsSet);
  mark(videoSet.length+' playable video references · '+newsSet.length+' dated news reports · 11 official platform/source links. Index updated '+(videos.generatedAt?dateLabel(videos.generatedAt):'pending')+'. Free GitHub Pages mode: no backend required.','ok');
 }catch(e){
  mark('Video/news index unavailable: '+e.message+'. Social and publisher links below still open.','warn');
  renderVideos([]);renderNews([]);
 }finally{isLoading=false;button.disabled=false;}
}
$('#engineSearch').addEventListener('click',runFreeSearch);
$('#searchForm').addEventListener('submit',()=>{runFreeSearch()});
$('#engineProvider').addEventListener('change',runFreeSearch);
$('#engineDays').addEventListener('change',runFreeSearch);
$('#searchQuery').addEventListener('input',()=>renderSocial(searchQuery()));
renderSocial(searchQuery());
runFreeSearch();
