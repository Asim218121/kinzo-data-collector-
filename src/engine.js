// Kinzo Professional Video Engine frontend — requires the Node backend to be deployed.
const el=s=>document.querySelector(s);
const encode=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storeKey='kinzo-backend-api-url';
function normalizeBackend(v){
 try{const u=new URL(v);if(u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)))return '';
 return u.origin;}catch{return ''}
}
let backend=normalizeBackend(localStorage.getItem(storeKey)||'')||location.origin;
const api=(path)=>backend+path;
function engineStatus(msg,mode='info'){el('#engineStatus').textContent=msg;el('#engineStatus').dataset.status=mode;}
function fmtDate(x){return x?new Date(x).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}):'Date unverified'}
function showVideos(items){
 const target=el('#engineVideoResults');
 if(!items.length){target.innerHTML='<div class="r-empty">No matching playable videos returned by the connected providers. Try broader search keywords or enable Pexels/Pixabay API keys.</div>';return;}
 target.innerHTML=items.map((v,i)=>{
  const url=encode(v.videoUrl),source=encode(v.sourceUrl),preview=encode(v.preview||''),safeUrl=/^https?:\/\//.test(v.videoUrl||'');
  return '<article class="pro-video-card"><div class="pro-video-wrap">'+
   (safeUrl?'<video controls playsinline preload="none" '+(preview?'poster="'+preview+'"':'')+' data-video="'+url+'"><source src="'+url+'" type="video/mp4">Your browser cannot play this video.</video>':'<div class="pro-video-missing">No playable file available</div>')+
   '<span class="pro-platform">'+encode(v.platform)+'</span></div>'+
   '<div class="pro-video-meta"><h4>'+encode(v.title)+'</h4><p>'+encode(v.creator||'Unknown creator')+' · '+encode(v.duration?v.duration+' sec':'Duration unknown')+'</p>'+
   '<p>Uploaded: '+encode(fmtDate(v.dateUploaded))+' · Recorded: '+encode(fmtDate(v.dateRecorded))+'</p>'+
   '<p class="pro-rights">'+encode(v.license||'Check rights')+'</p><div class="pro-links">'+
   '<a class="secondary" target="_blank" rel="noopener noreferrer" href="'+source+'">Original source ↗</a>'+
   (safeUrl?'<a class="secondary" target="_blank" rel="noopener noreferrer" href="'+url+'">Open MP4 ↗</a>':'')+
   (safeUrl&&v.downloadEligible?'<a class="primary" target="_blank" rel="noopener noreferrer" href="'+url+'" download>Download MP4 ↗</a>':'')+
   '</div><small>Not verified news-event footage; verify license and event date before publishing.</small></div></article>';
 }).join('');
}
function showBackendNews(items){
 const n=el('#engineNewsResults');if(!items.length){n.innerHTML='<p class="muted">No matching cached news articles for this topic/date range.</p>';return}
 n.innerHTML=items.slice(0,24).map(x=>'<article class="pro-news-card"><small>'+encode(x.provider)+' · '+encode(fmtDate(x.publishedAt))+'</small><p>'+encode(x.title)+'</p><a href="'+encode(x.url)+'" rel="noopener noreferrer" target="_blank">Read original report ↗</a></article>').join('');
}
function linksOut(links){el('#engineSocialLinks').innerHTML=(links||[]).map(x=>'<a target="_blank" rel="noopener noreferrer" href="'+encode(x.url)+'">'+encode(x.platform)+' ('+encode(x.type)+') ↗</a>').join('')}
function days(){return Number(el('#engineDays')?.value||7)}
function query(){return el('#searchQuery')?.value.trim()||'California flooding'}
async function checkBackend(){
 engineStatus('Checking video backend connection…');
 try{
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),5000);
  let r;
  try{r=await fetch(api('/api/health'),{signal:ctrl.signal});}finally{clearTimeout(timer)}
  if(!r.ok)throw Error('HTTP '+r.status);
  const d=await r.json();if(d.service!=='Kinzo Video Research API')throw Error('Wrong endpoint');
  engineStatus('Backend connected · Wikimedia '+(d.providers.commons?'ready':'offline')+' · Pexels '+(d.providers.pexels?'enabled':'needs key')+' · Pixabay '+(d.providers.pixabay?'enabled':'needs key'),'ok');
  return true;
 }catch{
  engineStatus('Live backend not deployed/connected. Existing stock clips and news-link research remain separate below. Connect the Render URL after deployment.','warn');return false;
 }
}
async function runEngineSearch(){
 const button=el('#engineSearch');
 button.disabled=true;engineStatus('Searching authorized video providers and dated news…');
 try{
  const params=new URLSearchParams({q:query(),source:el('#engineProvider').value,days:String(days()),limit:'35'});
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),25000);
  let r;try{r=await fetch(api('/api/search?'+params),{signal:c.signal});}finally{clearTimeout(timer)}
  if(!r.ok)throw Error('Backend HTTP '+r.status);
  const data=await r.json();
  if(!Array.isArray(data.videos)||!Array.isArray(data.news))throw Error('Incorrect backend response');
  showVideos(data.videos);showBackendNews(data.news);linksOut(data.links);
  const summary=Object.entries(data.providerStatus||{}).map(([k,v])=>k+': '+v).join(' · ');
  engineStatus(data.videos.length+' playable video references · '+data.news.length+' news articles · '+(data.links?.length||0)+' original-source links. '+summary,'ok');
 }catch(e){
  showVideos([]);showBackendNews([]);linksOut([]);
  engineStatus('Backend search unavailable ('+e.message+'). This page cannot fetch new Pexels/Pixabay results until the backend is hosted and configured.','warn');
 }finally{button.disabled=false}
}
const input=el('#engineBackendURL');input.value=backend===location.origin?'':backend;
el('#engineSaveBackend').addEventListener('click',()=>{
 const v=normalizeBackend(input.value);
 if(!v){engineStatus('Enter a valid https:// backend URL, e.g. https://your-service.onrender.com','warn');return}
 backend=v;localStorage.setItem(storeKey,v);checkBackend();
});
el('#engineResetBackend').addEventListener('click',()=>{localStorage.removeItem(storeKey);backend=location.origin;input.value='';checkBackend()});
el('#engineSearch').addEventListener('click',runEngineSearch);
el('#searchForm').addEventListener('submit',()=>{if(el('#engineAuto').checked)runEngineSearch()});
checkBackend();
