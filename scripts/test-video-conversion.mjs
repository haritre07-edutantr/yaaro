import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
const dir=new URL('../.sites-runtime/video-conversion-tests/',import.meta.url);mkdirSync(dir,{recursive:true});
for(const name of ['moment-video','video-conversion']){const source=readFileSync(new URL(`../lib/${name}.ts`,import.meta.url),'utf8').replaceAll("'./moment-video'","'./moment-video.mjs'");writeFileSync(new URL(`${name}.mjs`,dir),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);}
const {convertPhoneVideo}=await import(new URL('video-conversion.mjs',dir));const {validateMomentVideo,normalizeMomentVideo}=await import(new URL('moment-video.mjs',dir));
const fixture=new URL('phone.mov',dir);execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=blue:s=128x128:r=30:d=1','-f','lavfi','-i','sine=frequency=440:duration=1','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',fixture.pathname]);
const native=new Uint8Array(readFileSync(fixture));assert.throws(()=>normalizeMomentVideo(native),'Native phone container needs conversion rather than only a new extension');
const file=new File([native],'phone.mov',{type:'video/quicktime'}),progress=[];
const converted=await convertPhoneVideo(file,30*1024*1024,p=>progress.push(p));assert.equal(converted.type,'video/mp4');assert.equal(validateMomentVideo(new Uint8Array(await converted.arrayBuffer())),true,'Converted MOV passes the unchanged server video validator');assert.equal(progress.at(-1),100);
const outputFile=new URL('converted.mp4',dir);writeFileSync(outputFile,new Uint8Array(await converted.arrayBuffer()));const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_name,codec_type','-of','json',outputFile.pathname],{encoding:'utf8'}));assert.deepEqual(probe.streams.map(s=>s.codec_name).sort(),['aac','h264'],'Conversion retains audio and playable H.264 video');

await assert.rejects(()=>convertPhoneVideo(file,10),/VIDEO_OUTPUT_TOO_LARGE/);
const long=new URL('long.mov',dir);execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=blue:s=32x32:r=10:d=11','-c:v','libx264',long.pathname]);await assert.rejects(()=>convertPhoneVideo(new File([readFileSync(long)],'long.mov',{type:'video/quicktime'}),30*1024*1024),/VIDEO_TOO_LONG/);
console.log('Real QuickTime video/audio conversion, strict output validation, duration and output-size checks passed');
