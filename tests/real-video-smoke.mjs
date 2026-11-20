import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {curatedVideos} from '../backend/providers.mjs';
const clip=curatedVideos('flooding')[0];
assert.ok(clip?.videoUrl,'No curated MP4 reference available');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
try{
 const page=await browser.newPage();
 await page.goto('about:blank');
 await page.setContent('<video controls preload="auto" muted playsinline style="width:640px" src="'+clip.videoUrl+'"></video>');
 await page.waitForFunction(()=>{
  const v=document.querySelector('video');
  return v?.readyState>=1||v?.error;
 },{timeout:25000});
 const state=await page.locator('video').evaluate(v=>({readyState:v.readyState,error:v.error?.message||null,duration:v.duration,source:v.currentSrc,networkState:v.networkState}));
 assert.ok(state.readyState>=1&&!state.error&&state.duration>0,'Remote MP4 did not load usable video metadata: '+JSON.stringify(state));
 await page.locator('video').evaluate(v=>v.play());
 await page.waitForFunction(()=>document.querySelector('video')?.currentTime>0.05,{timeout:15000});
 const playback=await page.locator('video').evaluate(v=>({time:v.currentTime,width:v.videoWidth,height:v.videoHeight,paused:v.paused}));
 assert.ok(playback.time>0,'Video did not actually play');
 console.log(JSON.stringify({result:'REAL_MP4_PLAYBACK_PASSED',source:clip.sourceUrl,mp4:clip.videoUrl,metadata:state,playback}));
}finally{await browser.close()}
