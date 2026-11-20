import {sentences,stripHtml,licenseClass,toCSV,cleanFilename,providerLinks,imageFromCommons} from './core.js';
const $=(s)=>document.querySelector(s);
const $$=(s)=>[...document.querySelectorAll(s)];
const STORAGE='kinzo-footage-collector-v1';

const STOCK_BROLL = [["Flooded street","D Goug","5s","18640859","18640859-hd_1920_1080_60fps.mp4","california-floods-flooding-heavy-rains-speeding-18640859.jpeg"],["Flooded nighttime road","Lone Pictures","15s","9481659","9481659-hd_1920_1080_24fps.mp4","busy-road-city-road-city-traffic-india-9481659.jpeg"],["Urban flood in rainstorm","Somogro Bangladesh","13s","38550052","16374217_1920_1080_30fps.mp4","pexels-photo-38550052.jpeg"],["Rainfall on city street","Kiwi and Camera","15s","39273127","16711476_1920_1080_25fps.mp4","auckland-city-city-life-cloudy-39273127.jpeg"],["Ocean waves surfing","Nothing Ahead","60s","15814621","15814621-hd_1920_1080_30fps.mp4","pexels-photo-15814621.jpeg"],["Stormy waves on rocks","Everett Bumstead","47s","35970704","15252357_1920_1080_24fps.mp4","4k-sunset-beach-rocks-british-columbia-canada-35970704.jpeg"],["Beach waves","Marc K","31s","17739264","17739264-hd_1920_1080_30fps.mp4","pexels-photo-17739264.jpeg"],["Rocky shoreline waves","Emily H","9s","36072343","15297967_1920_1080_30fps.mp4","pexels-photo-36072343.jpeg"],["Snowy forest road","Александр Сергеев","5s","35280444","14946008_1920_1080_30fps.mp4","-35280444.jpeg"],["Driving through snowfall","Ms. Jade","11s","10268512","10268512-hd_1920_1080_30fps.mp4","road-roadtrip-sky-snow-10268512.jpeg"],["Snowy highway traffic","K","12s","30243327","12967729_1920_1080_24fps.mp4","pexels-photo-30243327.jpeg"],["Snowstorm highway drive","Kim Dodge","59s","35193500","14909547_1920_1080_30fps.mp4","2-lanes-blizzard-canada-december-35193500.jpeg"]];
function stockMatches(query){
  const words=String(query||'').toLowerCase().split(/\W+/).filter(w=>w.length>3&& !['california','november','river','atmospheric','weather','video','footage','latest'].includes(w));
  const topic=String(query||'').toLowerCase();
  let picks=STOCK_BROLL.filter((c,i)=>{
    const cat=i<4?'flooding rain storm':i<8?'ocean coastal waves pacific storm surf':'snow mountain highway blizzard winter';
    return words.some(w=>(c[0]+' '+cat).toLowerCase().includes(w));
  });
  if(!picks.length && /flood|rain|atmospher|california|river|storm/.test(topic)) picks=STOCK_BROLL;
  return picks.map(c=>{
    const id=c[3], title=c[0];
    const file=c[4];
    return {id:'pexels-'+id,provider:'Pexels stock video',title,kind:'video',
      preview:'https://images.pexels.com/videos/'+id+'/'+c[5]+'?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200',
      url:'https://videos.pexels.com/video-files/'+id+'/'+file,
      source:'https://www.pexels.com/video/'+id+'/',
      creator:c[1],license:'Pexels License — verify on original page',licenseUrl:'https://www.pexels.com/license/',
      description:'Illustrative stock B-roll; not authenticated footage of a current event. Runtime '+c[2]+'. Recording and upload dates not verified.',
      width:1920,height:1080,mime:'video/mp4',permission:'review',dateUploaded:null,dateRecorded:null};
  });
}
function addFootageFilters(){
 const tools=document.querySelector('.search-tools');
 if(!tools)return;
 const filter=document.createElement('label');
 filter.className='choice';
 filter.textContent=' Date ';
 const select=document.createElement('select');select.id='dateFilter';
 select.innerHTML='<option value="all">Any date</option><option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option>';
 select.title='Filters items with a confirmed upload date; stock clips with unknown dates are excluded';
 filter.appendChild(select);tools.appendChild(filter);
 const note=document.createElement('p');note.className='muted';note.style.margin='8px 0 0';
 note.textContent='Stock B-roll is not dated news footage. For actual latest events, open YouTube or Google News research links and verify original dates and reuse rights.';
 tools.parentElement.appendChild(note);
 select.addEventListener('change',()=>renderResults());
}
function dateFilterAssets(arr){
 const days=document.querySelector('#dateFilter')?.value||'all';
 if(days==='all')return arr;
 const cutoff=Date.now()-Number(days)*86400000;
 return arr.filter(a=>a.dateUploaded&&new Date(a.dateUploaded).getTime()>=cutoff);
}

let state={scenes:[],assets:[],selectedScene:'',query:'',results:[]};
try{const data=JSON.parse(localStorage.getItem(STORAGE)||'null');if(data && Array.isArray(data.scenes)&&Array.isArray(data.assets))state={...state,...data,results:[]};}catch{}
const esc=(v)=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify({...state,results:[]}));}catch{toast('Browser storage is full. Export project JSON now.');}}
function toast(message){const t=$('#toast');t.textContent=message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500);}
function changeTab(id){$$('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.tab===id));$$('.tab').forEach(x=>x.classList.toggle('active',x.id===`tab-${id}`));const titles={discover:['Discover footage','Find real photos and videos. Save sources and match them to your voiceover.'],scenes:['Script & scenes','Convert narration into visual research tasks.'],collection:['Saved collection','Your selected shots, descriptions and source credits.'],export:['Export your project','Take your research into Codex, CapCut or your next production tool.']};$('#viewTitle').textContent=titles[id][0];$('#viewSubtitle').textContent=titles[id][1];if(id==='collection')renderCollection();if(id==='scenes')renderScenes();}
$$('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>changeTab(btn.dataset.tab)));
function refreshCounters(){const n=state.assets.length;$('#navCount').textContent=n;$('#collectionCount').textContent=n;$('#sceneCount').textContent=state.scenes.length;const sel=$('#currentScene');sel.innerHTML='<option value="">Unassigned</option>'+state.scenes.map((x,i)=>`<option value="${esc(x.id)}">Scene ${String(i+1).padStart(3,'0')}</option>`).join('');sel.value=state.selectedScene||'';}
$('#currentScene').addEventListener('change',e=>{state.selectedScene=e.target.value;persist();});
function renderLinks(){const q=$('#searchQuery').value.trim()||'weather footage';$('#sourceLinks').innerHTML=providerLinks(q).map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer"><span>${esc(x.name)}</span><small>${esc(x.kind)} ↗</small></a>`).join('');}
$('#searchQuery').addEventListener('input',renderLinks);renderLinks();
function card(asset,fromSaved=false){const saved=state.assets.some(x=>x.id===asset.id);const thumb=asset.preview||'';const badge=asset.permission==='review'?'<span class="lic review">Check rights</span>':asset.permission==='open'?'<span class="lic open">Public domain / CC0</span>':'<span class="lic attrib">Attribution required</span>';return `<article class="media-card"><div class="media-thumb">${thumb?`<img loading="lazy" src="${esc(thumb)}" alt="${esc(asset.title)}"/>`:'<span class="no-thumb">No thumbnail</span>'}<span class="media-type">${asset.kind==='video'?'▶ Video':'▧ Photo'}</span></div><div class="media-body"><h4 title="${esc(asset.title)}">${esc(asset.title)}</h4><p>${esc(asset.creator)} · ${esc(asset.provider)} · ${esc(asset.dateUploaded?'Uploaded '+asset.dateUploaded.slice(0,10):'Date unverified')}</p><div class="lic-row">${badge}</div><div class="card-actions"><button data-action="details" data-id="${esc(asset.id)}" class="small">Details</button><button data-action="${saved?'remove':'save'}" data-id="${esc(asset.id)}" class="small ${saved?'saved':''}">${saved?'✓ Saved':'+ Save'}</button><a class="small" href="${esc(asset.source)}" target="_blank" rel="noopener noreferrer">Source ↗</a></div></div></article>`;}
function renderResults(){const media=dateFilterAssets(state.results);$('#resultCount').textContent=media.length?`${media.length} found`:'';$('#results').innerHTML=media.length?media.map(x=>card(x)).join(''):'<div class="empty">No matching files returned. Try shorter, more specific keywords or a different media type.</div>';}
function renderCollection(){refreshCounters();$('#collectionResults').innerHTML=state.assets.length?state.assets.map(x=>card(x,true)).join(''):'<div class="empty">Nothing saved yet. Search for images or videos and click Save.</div>';}
function renderScenes(){refreshCounters();$('#sceneList').innerHTML=state.scenes.length?state.scenes.map((scene,i)=>{const shots=state.assets.filter(x=>x.sceneId===scene.id);return `<article class="scene-card"><div class="scene-header"><strong>SCENE ${String(i+1).padStart(3,'0')}</strong><div><span class="muted">${shots.length} assets</span><button class="small" data-action="search-scene" data-id="${esc(scene.id)}">Find footage ↗</button></div></div><p>${esc(scene.text)}</p>${shots.length?`<div class="scene-assets">${shots.map(x=>`<span>${esc(x.title.slice(0,45))}</span>`).join('')}</div>`:''}</article>`;}).join(''):'<div class="empty">Import a narration script to create scenes automatically.</div>';}
function fullAsset(id){return state.results.find(x=>x.id===id)||state.assets.find(x=>x.id===id);}
function showDetails(asset){const saved=state.assets.some(x=>x.id===asset.id);const sceneSelector=state.scenes.map((x,i)=>`<option value="${esc(x.id)}" ${asset.sceneId===x.id?'selected':''}>Scene ${String(i+1).padStart(3,'0')}</option>`).join('');$('#detailContent').innerHTML=`<h2>${esc(asset.title)}</h2>${asset.preview?`<img class="detail-image" src="${esc(asset.preview)}" alt="Preview" />`:''}<dl><dt>Source</dt><dd>${esc(asset.provider)}</dd><dt>Creator</dt><dd>${esc(asset.creator)}</dd><dt>License</dt><dd>${esc(asset.license)}</dd><dt>Dimensions</dt><dd>${asset.width||'?'} × ${asset.height||'?'}</dd><dt>Upload date</dt><dd>${esc(asset.dateUploaded||'Unverified')}</dd><dt>Recorded date</dt><dd>${esc(asset.dateRecorded||'Unverified')}</dd><dt>Description</dt><dd>${esc(asset.description||'No description supplied')}</dd></dl><p><a target="_blank" rel="noopener noreferrer" href="${esc(asset.source)}">Review original file and license ↗</a> ${asset.licenseUrl?`<a target="_blank" rel="noopener noreferrer" href="${esc(asset.licenseUrl)}">License terms ↗</a>`:''}</p><div class="actions"><button class="primary" type="button" data-action="${saved?'remove':'save'}" data-id="${esc(asset.id)}">${saved?'Remove from collection':'Save to collection'}</button>${asset.provider==='Pexels stock video'?`<a class="secondary" href="${esc(asset.url)}" target="_blank" rel="noopener noreferrer">Open MP4 footage ↗</a>`:asset.permission!=='review'&&asset.url?`<button class="secondary" type="button" data-action="download" data-id="${esc(asset.id)}">Download permitted media</button>`:''}</div>${saved?`<label class="detail-scene">Assign saved item to scene <select id="detailScene" data-id="${esc(asset.id)}"><option value="">Unassigned</option>${sceneSelector}</select></label>`:''}`;$('#detailDialog').showModal();}
async function downloadAsset(asset){if(asset.permission==='review'||!asset.url)return toast('Review rights on the original page before download.');if(!confirm(`Please verify the source and license before downloading.\n\n${asset.license}\n${asset.source}\n\nContinue?`))return;try{const res=await fetch(asset.url,{mode:'cors'});if(!res.ok)throw Error('Download unavailable');const blob=await res.blob();if(blob.size>200*1024*1024)throw Error('File exceeds 200 MB in-browser download limit. Use original page instead.');const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=cleanFilename(asset.title);document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),25000);toast('Download started. Keep source and attribution metadata.');}catch{window.open(asset.source,'_blank','noopener,noreferrer');toast('Direct download blocked. Opened source page instead.');}}
function saveAsset(id){const a=fullAsset(id);if(!a)return;if(state.assets.some(x=>x.id===id))return toast('Already saved.');state.assets.push({...a,sceneId:state.selectedScene||''});persist();refreshCounters();renderResults();toast('Saved to your collection.');}
function removeAsset(id){state.assets=state.assets.filter(x=>x.id!==id);persist();refreshCounters();renderResults();renderCollection();toast('Removed.');}
document.addEventListener('click',async e=>{const btn=e.target.closest('[data-action]');if(!btn)return;const action=btn.dataset.action,id=btn.dataset.id; if(action==='search-scene'){const scene=state.scenes.find(x=>x.id===id);state.selectedScene=id;persist();changeTab('discover');$('#searchQuery').value=scene?.text.split(/\s+/).slice(0,9).join(' ')||'';renderLinks();$('#searchQuery').focus();}if(action==='details'){const a=fullAsset(id);if(a)showDetails(a);}if(action==='save'){saveAsset(id);if($('#detailDialog').open)showDetails(fullAsset(id));}if(action==='remove'){removeAsset(id);if($('#detailDialog').open)$('#detailDialog').close();}if(action==='download'){const a=fullAsset(id);if(a)await downloadAsset(a);}});
$('#detailContent').addEventListener('change',e=>{if(e.target.id!=='detailScene')return;const a=state.assets.find(x=>x.id===e.target.dataset.id);if(a){a.sceneId=e.target.value;persist();toast('Scene assignment updated.');}});
addFootageFilters();

let offset=0,currentSearch='',currentType='video',busy=false;
function commonsJsonp(params,timeoutMs=8500){
 return new Promise((resolve,reject)=>{
  const id='kinzoCommons'+Date.now()+Math.floor(Math.random()*10000);
  const script=document.createElement('script');let finished=false;
  const cleanup=()=>{if(finished)return;finished=true;clearTimeout(timer);delete window[id];script.remove();};
  window[id]=(json)=>{cleanup();resolve(json);};
  script.onerror=()=>{cleanup();reject(new Error('Media source blocked'));};
  const timer=setTimeout(()=>{cleanup();reject(new Error('Media source timeout'));},timeoutMs);
  const qp=new URLSearchParams(params);
  qp.delete('origin');
  qp.set('callback',id);
  script.src='https://commons.wikimedia.org/w/api.php?'+qp;
  document.head.appendChild(script);
 });
}
async function getCommons(params){
 const url='https://commons.wikimedia.org/w/api.php?'+params;
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),6500);
 try{
  const res=await fetch(url,{signal:ctrl.signal});
  if(!res.ok)throw Error('HTTP '+res.status);
  return await res.json();
 }catch{
  return commonsJsonp(params);
 }finally{clearTimeout(timer);}
}
async function search(append=false){
 if(busy)return;
 const q=$('#searchQuery').value.trim();
 if(!q){toast('Enter a topic first.');return;}
 currentSearch=q;
 currentType=$('input[name="mediaType"]:checked')?.value||'video';
 if(!append){
  offset=0;state.results=currentType==='image'?[]:stockMatches(q);
  renderResults();
 }
 busy=true;$('#searchButton').disabled=true;
 $('#searchStatus').textContent=state.results.length?'Showing curated real MP4 source clips. Checking Wikimedia for more footage...':'Searching Wikimedia Commons for additional media...';
 $('#loadMore').hidden=true;
 const params=new URLSearchParams({action:'query',generator:'search',gsrsearch:q,gsrnamespace:'6',gsrlimit:'40',gsroffset:String(offset),prop:'imageinfo',iiprop:'url|mime|size|extmetadata|timestamp',iiurlwidth:'600',format:'json',origin:'*'});
 try{
  const data=await getCommons(params);
  const pages=Object.values(data.query?.pages||{});
  const all=pages.map(imageFromCommons).filter(Boolean).map(a=>({...a,dateUploaded:pages.find(p=>p.pageid===a.pageId)?.imageinfo?.[0]?.timestamp||null,dateRecorded:null}));
  const subset=all.filter(a=>currentType==='all'||a.kind===currentType);
  state.results.push(...subset.filter(a=>!state.results.some(x=>x.id===a.id)));
  offset+=40;
  renderResults();
  $('#searchStatus').textContent=state.results.length+' source results. Stock video recording dates are unverified. News & Social Research links below provide more recent coverage.';
  $('#loadMore').hidden=pages.length<40;
 }catch{
  renderResults();
  $('#searchStatus').textContent=state.results.length?'Showing '+state.results.length+' curated MP4 clips. Live Wikimedia search could not connect; use News & Social Research below for latest material.':'Wikimedia media search could not connect from this browser. Use News & Social Research and original-source links below.';
  $('#loadMore').hidden=true;
 }finally{busy=false;$('#searchButton').disabled=false;}
}
$('#searchForm').addEventListener('submit',e=>{e.preventDefault();search(false);});$('#loadMore').addEventListener('click',()=>search(true));
$('#scriptFile').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>2e6){toast('TXT too large (maximum 2 MB).');return;}$('#scriptInput').value=await file.text();$('#sceneStatus').textContent=`Loaded ${file.name}`;});
$('#makeScenes').addEventListener('click',()=>{const s=sentences($('#scriptInput').value);if(!s.length)return toast('Paste or import script first.');if(state.scenes.length&&!confirm('Replace existing scenes? Saved assets remain, but scene mappings will reset.'))return;state.scenes=s.map((text,i)=>({id:`scene-${i+1}`,text}));state.assets=state.assets.map(a=>({...a,sceneId:''}));state.selectedScene='';persist();renderScenes();$('#sceneStatus').textContent=`Created ${s.length} scenes.`;toast(`Created ${s.length} scenes.`);});
$('#clearScenes').addEventListener('click',()=>{if(!confirm('Clear all scenes? Saved footage will remain but lose scene assignments.'))return;state.scenes=[];state.assets=state.assets.map(a=>({...a,sceneId:''}));state.selectedScene='';persist();renderScenes();});
$('#clearCollection').addEventListener('click',()=>{if(!confirm('Permanently clear saved collection in this browser?'))return;state.assets=[];persist();renderCollection();});
function fileDownload(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
$('#exportJSON').addEventListener('click',()=>fileDownload('kinzo-project.json',JSON.stringify({exportedAt:new Date().toISOString(),scenes:state.scenes,assets:state.assets},null,2),'application/json'));
$('#exportCSV').addEventListener('click',()=>{const hdr=['scene','narration','asset','type','provider','creator','license','license_url','source_url','media_url'];const rows=state.assets.map(a=>{const idx=state.scenes.findIndex(s=>s.id===a.sceneId);return [idx<0?'':idx+1,idx<0?'':state.scenes[idx].text,a.title,a.kind,a.provider,a.creator,a.license,a.licenseUrl,a.source,a.url];});fileDownload('kinzo-shot-list.csv','\ufeff'+toCSV([hdr,...rows]),'text/csv;charset=utf-8');});
$('#exportAttribution').addEventListener('click',()=>{const lines=state.assets.map((a,i)=>`${i+1}. ${a.title}\nCreator: ${a.creator}\nSource: ${a.source}\nLicense: ${a.license}\nTerms: ${a.licenseUrl||'Check source'}\n`);fileDownload('kinzo-credits.txt',`KINZO FOOTAGE SOURCE AND ATTRIBUTION NOTES\nReview each item's rights and restrictions before use.\n\n${lines.join('\n')}`,'text/plain');});
$('#exportScript').addEventListener('click',()=>fileDownload('kinzo-scene-script.txt',state.scenes.map((x,i)=>`Scene ${String(i+1).padStart(3,'0')}: ${x.text}`).join('\n\n'),'text/plain'));
refreshCounters();renderScenes();renderCollection();
