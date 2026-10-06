import {encodeVoice} from './media-validation';
export function isVideoUpload(file:File){return file.type.startsWith('video/')||(!file.type&&/\.(mp4|mov|m4v|webm|mkv|avi|3gp|mpeg|mpg|ogv)$/i.test(file.name));}
export async function prepareChatPhoto(file:File,options:{maxBytes?:number;broadFormats?:boolean}={}){
 const supported=['image/jpeg','image/png','image/webp','image/heic','image/heif',...(options.broadFormats?['image/avif','image/gif','image/bmp','image/x-ms-bmp','image/tiff','image/jxl']:[])],maxBytes=options.maxBytes??5*1024*1024;
 if((!supported.includes(file.type)&&!(file.type===''&&(options.broadFormats?/\.(jpe?g|png|webp|heic|heif|avif|gif|bmp|tiff?|jxl)$/i:/\.(jpe?g|png|webp|heic|heif)$/i).test(file.name)))||file.size>maxBytes)throw new Error(`Choose a supported photo up to ${maxBytes/(1024*1024)} MB. JPEG, PNG, WebP and iPhone HEIC are supported where your browser can decode them.`);
 // Safari can decode native HEIC with an image element even when ImageBitmap fails.
 const url=URL.createObjectURL(file),image=new Image();let bitmap:ImageBitmap|undefined;
 try{
  let source:CanvasImageSource=image,width=0,height=0;
  try{await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('PHOTO_DECODE')),15000);image.onload=()=>{clearTimeout(timer);resolve();};image.onerror=()=>{clearTimeout(timer);reject(new Error('PHOTO_DECODE'));};image.src=url;});width=image.naturalWidth;height=image.naturalHeight;}
  catch{if(typeof createImageBitmap!=='function')throw new Error('This browser could not open your photo. Choose a JPEG or use Camera.');try{bitmap=await createImageBitmap(file);source=bitmap;width=bitmap.width;height=bitmap.height;}catch{throw new Error('This browser could not open your photo. For HEIC, use an updated Safari or choose a JPEG.');}}
  if(!width||!height||width>10000||height>10000||width*height>(options.broadFormats?60000000:40000000))throw new Error('Choose a smaller photo.');
  const ratio=Math.min(1,512/Math.max(width,height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Photo preparation is unavailable.');ctx.drawImage(source,0,0,canvas.width,canvas.height);
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob&&blob.size<=1048576?resolve(blob):reject(new Error('Choose a simpler or smaller photo.')),'image/png'));
 }finally{bitmap?.close();image.onload=null;image.onerror=null;image.removeAttribute('src');URL.revokeObjectURL(url);}
}
export type VoiceCapture={stop:()=>Promise<Blob>;cancel:()=>void};
export async function captureVoice():Promise<VoiceCapture>{
 if(!navigator.mediaDevices?.getUserMedia||!window.AudioContext)throw new Error('Voice notes need a current browser over HTTPS.');const stream=await navigator.mediaDevices.getUserMedia({audio:true});let context:AudioContext|undefined;
 try{context=new AudioContext({sampleRate:16000});if(!context.audioWorklet)throw new Error('Voice recording is unavailable in this browser. Try a current browser over HTTPS.');await context.audioWorklet.addModule('/voice-recorder-worklet.js');await context.resume();const source=context.createMediaStreamSource(stream),node=new AudioWorkletNode(context,'yaaro-voice-recorder'),chunks:Float32Array[]=[];let stopped=false,finish:(()=>void)|undefined;node.port.onmessage=event=>{if(event.data==='done')finish?.();else if(event.data instanceof Float32Array)chunks.push(event.data);};source.connect(node);node.connect(context.destination);
 const close=()=>{stream.getTracks().forEach(track=>track.stop());source.disconnect();node.disconnect();void context!.close();};
 return {cancel(){if(stopped)return;stopped=true;close();},async stop(){if(stopped)throw new Error('Recording cancelled.');stopped=true;await new Promise<void>(resolve=>{const timeout=setTimeout(resolve,1000);finish=()=>{clearTimeout(timeout);resolve();};node.port.postMessage('flush');});close();if(!chunks.length)throw new Error('No audio was recorded.');const bytes=encodeVoice(chunks,context!.sampleRate);if(bytes.length<3244)throw new Error('Record at least a short hello.');return new Blob([bytes],{type:'audio/wav'});}};
 }catch(error){stream.getTracks().forEach(track=>track.stop());void context?.close();throw error;}
}

export async function prepareMomentVideo(file:File,maxBytes=12*1024*1024,onProgress?:(progress:number)=>void){
 if(!isVideoUpload(file)||file.size>maxBytes)throw new Error(`Choose an MP4 or compatible iPhone MOV video up to ${maxBytes/(1024*1024)} MB.`);
 const {normalizeMomentVideo}=await import('./moment-video');let prepared:File;
 try{const bytes=normalizeMomentVideo(new Uint8Array(await file.arrayBuffer()));prepared=new File([bytes as Uint8Array<ArrayBuffer>],'moment.mp4',{type:'video/mp4'});}catch(e){
  if((e as Error).message==='VIDEO_TOO_LONG')throw new Error('Videos can be no longer than 10 seconds.');
  try{const {convertPhoneVideo}=await import('./video-conversion');prepared=await convertPhoneVideo(file,maxBytes,onProgress);}
  catch(error){const code=(error as Error).message;throw new Error(code==='VIDEO_TOO_LONG'?'Videos can be no longer than 10 seconds.':code==='VIDEO_OUTPUT_TOO_LARGE'?`The converted video is larger than ${maxBytes/(1024*1024)} MB. Choose a smaller clip.`:code==='VIDEO_CONVERSION_TIMEOUT'?'Video conversion took too long. Try a smaller recording.':'Your browser could not convert this recording. Try an updated Safari or Chrome, or choose a different video.');}
 }
 const url=URL.createObjectURL(prepared),video=document.createElement('video');video.preload='metadata';video.muted=true;video.playsInline=true;
 try{await new Promise<void>((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Unable to read this video. Try another MP4.')),10000);video.onloadedmetadata=()=>{clearTimeout(timeout);Number.isFinite(video.duration)&&video.duration>0&&video.duration<=10?resolve():reject(new Error('Videos can be no longer than 10 seconds.'));};video.onerror=()=>{clearTimeout(timeout);reject(new Error('This video cannot play in your browser. Choose another MP4.'));};video.src=url;video.load();});return prepared;}
 finally{video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
}
