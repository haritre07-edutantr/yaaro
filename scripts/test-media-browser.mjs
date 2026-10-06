import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
const dir=new URL('../.sites-runtime/media-browser-tests/',import.meta.url);mkdirSync(dir,{recursive:true});
for(const name of ['media-browser','media-validation']){let source=readFileSync(new URL(`../lib/${name}.ts`,import.meta.url),'utf8').replaceAll("'./media-validation'","'./media-validation.mjs'");writeFileSync(new URL(`${name}.mjs`,dir),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);}
const {prepareChatPhoto,prepareProfilePhoto,isVideoUpload}=await import(new URL('media-browser.mjs',dir));
let imageFails=false,bitmapCalls=0,closed=0,drawn=0,revoked=0,width=1200,expectedWidth=512,lastDraw=[];
URL.createObjectURL=()=> 'blob:photo';URL.revokeObjectURL=()=>revoked++;
globalThis.Image=class {naturalWidth=width;naturalHeight=800;set src(value){queueMicrotask(()=>imageFails?this.onerror?.():this.onload?.());}removeAttribute(){}};
globalThis.createImageBitmap=async()=>{bitmapCalls++;return {width:1200,height:800,close(){closed++;}};};
globalThis.document={createElement(kind){assert.equal(kind,'canvas');return {width:0,height:0,getContext(){return {drawImage(...args){drawn++;lastDraw=args;}};},toBlob(callback,type){assert.equal(type,'image/png');assert.equal(this.width,expectedWidth);callback(new Blob(['converted'],{type}));}};}};
const heic=new File(['native-photo'],'IMG_0001.HEIC',{type:'image/heic'});
assert.equal((await prepareChatPhoto(heic)).type,'image/png');assert.equal(bitmapCalls,0,'HEIC uses browser image decoding instead of requiring ImageBitmap');assert.equal(revoked,1);
imageFails=true;await prepareChatPhoto(new File(['jpeg'],'photo.jpg',{type:'image/jpeg'}));assert.equal(bitmapCalls,1);assert.equal(closed,1,'Fallback bitmap closes after encoding');assert.equal(revoked,2);
imageFails=false;await prepareChatPhoto(new File(['heic'],'photo.heic'));assert.equal(drawn,3,'Missing native file MIME can use an allowlisted extension');
width=12000;await assert.rejects(()=>prepareChatPhoto(heic),/smaller photo/);assert.equal(revoked,4,'Rejected photo still releases its object URL');
await assert.rejects(()=>prepareChatPhoto(new File(['svg'],'bad.svg',{type:'image/svg+xml'})),/Choose/);
assert.equal(isVideoUpload(new File(['mov'],'video.mov',{type:'video/quicktime'})),true);assert.equal(isVideoUpload(new File(['mov'],'video.MOV')),true);assert.equal(isVideoUpload(heic),false);
console.log('iOS photo decoding, bitmap fallback, cleanup, input validation and native video classification checks passed');

width=1200;const largePhoto=new File([new Uint8Array(6*1024*1024)],'large.jpg',{type:'image/jpeg'});
await assert.rejects(()=>prepareChatPhoto(largePhoto),/5 MB/);
assert.equal((await prepareChatPhoto(largePhoto,{maxBytes:15*1024*1024,broadFormats:true})).type,'image/png','Moments accepts larger photos without increasing chat limits');
await assert.rejects(()=>prepareChatPhoto(new File([new Uint8Array(15*1024*1024+1)],'large.jpg',{type:'image/jpeg'}),{maxBytes:15*1024*1024,broadFormats:true}),/15 MB/);
assert.equal((await prepareChatPhoto(new File(['avif'],'image.avif',{type:'image/avif'}),{maxBytes:15*1024*1024,broadFormats:true})).type,'image/png','Additional raster formats use canonical photo conversion');
console.log('Moments 15 MB photo limit and broader raster input checks passed');

expectedWidth=384;const profile=await prepareProfilePhoto(heic);assert.equal(profile.type,'image/png');assert.deepEqual(lastDraw.slice(1),[200,0,800,800,0,0,384,384],'Profile photo stays centered and square through iOS-compatible decoding');
await prepareProfilePhoto(largePhoto);
console.log('Profile HEIC conversion, 15 MB original limit and centered 384px crop checks passed');
