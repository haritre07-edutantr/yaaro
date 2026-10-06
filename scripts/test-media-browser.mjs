import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
const dir=new URL('../.sites-runtime/media-browser-tests/',import.meta.url);mkdirSync(dir,{recursive:true});
for(const name of ['media-browser','media-validation']){let source=readFileSync(new URL(`../lib/${name}.ts`,import.meta.url),'utf8').replaceAll("'./media-validation'","'./media-validation.mjs'");writeFileSync(new URL(`${name}.mjs`,dir),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);}
const {prepareChatPhoto,isVideoUpload}=await import(new URL('media-browser.mjs',dir));
let imageFails=false,bitmapCalls=0,closed=0,drawn=0,revoked=0,width=1200;
URL.createObjectURL=()=> 'blob:photo';URL.revokeObjectURL=()=>revoked++;
globalThis.Image=class {naturalWidth=width;naturalHeight=800;set src(value){queueMicrotask(()=>imageFails?this.onerror?.():this.onload?.());}removeAttribute(){}};
globalThis.createImageBitmap=async()=>{bitmapCalls++;return {width:1200,height:800,close(){closed++;}};};
globalThis.document={createElement(kind){assert.equal(kind,'canvas');return {width:0,height:0,getContext(){return {drawImage(){drawn++;}};},toBlob(callback,type){assert.equal(type,'image/png');assert.equal(this.width,512);callback(new Blob(['converted'],{type}));}};}};
const heic=new File(['native-photo'],'IMG_0001.HEIC',{type:'image/heic'});
assert.equal((await prepareChatPhoto(heic)).type,'image/png');assert.equal(bitmapCalls,0,'HEIC uses browser image decoding instead of requiring ImageBitmap');assert.equal(revoked,1);
imageFails=true;await prepareChatPhoto(new File(['jpeg'],'photo.jpg',{type:'image/jpeg'}));assert.equal(bitmapCalls,1);assert.equal(closed,1,'Fallback bitmap closes after encoding');assert.equal(revoked,2);
imageFails=false;await prepareChatPhoto(new File(['heic'],'photo.heic'));assert.equal(drawn,3,'Missing native file MIME can use an allowlisted extension');
width=12000;await assert.rejects(()=>prepareChatPhoto(heic),/smaller photo/);assert.equal(revoked,4,'Rejected photo still releases its object URL');
await assert.rejects(()=>prepareChatPhoto(new File(['svg'],'bad.svg',{type:'image/svg+xml'})),/Choose/);
assert.equal(isVideoUpload(new File(['mov'],'video.mov',{type:'video/quicktime'})),true);assert.equal(isVideoUpload(new File(['mov'],'video.MOV')),true);assert.equal(isVideoUpload(heic),false);
console.log('iOS photo decoding, bitmap fallback, cleanup, input validation and native video classification checks passed');
