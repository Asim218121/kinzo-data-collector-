export function sentences(text) {
  const normalized = String(text || '').replace(/\r\n/g, '\n').replace(/[ \t]+/g,' ').trim();
  if (!normalized) return [];
  // Sentence segmentation with fallback; newlines are usually already sentence-per-line for imported Kinzo scripts.
  const lines = normalized.split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('en',{granularity:'sentence'}) : null;
  const output=[];
  for (const line of lines){
    if (segmenter) for(const p of segmenter.segment(line)){const x=p.segment.trim();if(x)output.push(x);}
    else output.push(...line.match(/[^.!?]+(?:[.!?]+|$)/g)?.map(x=>x.trim()).filter(Boolean) || [line]);
  }
  return output;
}
export function stripHtml(s){return String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();}
export function licenseClass(name, url=''){
  const x=`${name||''} ${url||''}`.toLowerCase();
  if(/cc0|public domain|publicdomain|pdm|pd[- ]/.test(x))return 'open';
  if(/cc[- ]?by(?:[- ]?sa)?(?:[- ]?[234]\.0)?|creativecommons\.org\/licenses\/by/.test(x))return 'attribution';
  return 'review';
}
export function csvEscape(x){const s=String(x??'');return /[,"\n\r]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;}
export function toCSV(rows){return rows.map(row=>row.map(csvEscape).join(',')).join('\r\n');}
export function cleanFilename(name){return (String(name||'footage').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,90) || 'footage');}
export function providerLinks(q){
  const e=encodeURIComponent(q.trim());
  return [
    {name:'Google Images',url:`https://www.google.com/search?tbm=isch&q=${e}`,kind:'Discover'},
    {name:'YouTube',url:`https://www.youtube.com/results?search_query=${e}`,kind:'Reference'},
    {name:'Pexels',url:`https://www.pexels.com/search/videos/${e}/`,kind:'Stock'},
    {name:'Pixabay',url:`https://pixabay.com/videos/search/${e}/`,kind:'Stock'},
    {name:'TikTok',url:`https://www.tiktok.com/search?q=${e}`,kind:'Reference'},
    {name:'Instagram',url:`https://www.instagram.com/explore/tags/${encodeURIComponent(q.toLowerCase().replace(/[^a-z0-9 ]/g,'').trim().replace(/\s+/g,''))}/`,kind:'Reference'},
    {name:'Google News',url:`https://news.google.com/search?q=${e}`,kind:'News'},
    {name:'NOAA',url:`https://www.google.com/search?q=site%3Anoaa.gov+${e}`,kind:'Official'},
    {name:'USGS',url:`https://www.google.com/search?q=site%3Ausgs.gov+${e}`,kind:'Official'}
  ];
}
export function imageFromCommons(page){
  const info=page.imageinfo?.[0];if(!info)return null;
  const metadata=info.extmetadata||{};
  const get=(k)=>stripHtml(metadata[k]?.value||'');
  const license=get('LicenseShortName')||'Unverified';
  return {id:`commons-${page.pageid}`,provider:'Wikimedia Commons',title:page.title?.replace(/^File:/,'')||'Untitled',kind:info.mime?.startsWith('video/')?'video':'image',preview:info.thumburl||info.url||'',url:info.url||'',source:info.descriptionurl||`https://commons.wikimedia.org/?curid=${page.pageid}`,creator:get('Artist')||'See source',license,licenseUrl:get('LicenseUrl'),credit:get('Credit'),description:get('ImageDescription'),width:info.width||null,height:info.height||null,mime:info.mime||'',permission:licenseClass(license,get('LicenseUrl')),pageId:page.pageid};
}
