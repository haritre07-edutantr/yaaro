import {sanitizeMomentVideo} from './moment-video';
// Loaded only when the fast, validated MP4 path cannot handle a phone recording.
export async function convertPhoneVideo(file:File,maxBytes:number,onProgress?:(progress:number)=>void){
 const {Input,BlobSource,ALL_FORMATS,Output,BufferTarget,Mp4OutputFormat,Conversion,canEncodeAudio}=await import('mediabunny');
 const input=new Input({source:new BlobSource(file),formats:ALL_FORMATS});
 let conversion:Awaited<ReturnType<typeof Conversion.init>>|undefined,timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const duration=await input.computeDuration(),video=await input.getPrimaryVideoTrack();
  if(!video||!Number.isFinite(duration)||duration<=0)throw new Error('VIDEO_INVALID');
  if(duration>10)throw new Error('VIDEO_TOO_LONG');
  const audio=await input.getPrimaryAudioTrack();
  if(audio&&await audio.getCodec()!=='aac'&&!await canEncodeAudio('aac')){const {registerAacEncoder}=await import('@mediabunny/aac-encoder');registerAacEncoder();}
  const output=new Output({format:new Mp4OutputFormat({fastStart:'in-memory'}),target:new BufferTarget()});
  conversion=await Conversion.init({input,output,tracks:'primary',tags:{},video:{codec:'avc'},audio:{codec:'aac'}});
  if(!conversion.isValid||conversion.discardedTracks.length)throw new Error('VIDEO_CONVERSION_UNAVAILABLE');
  conversion.onProgress=progress=>onProgress?.(Math.min(99,Math.round(progress*100)));
  await Promise.race([conversion.execute(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{void conversion?.cancel();reject(new Error('VIDEO_CONVERSION_TIMEOUT'));},60000);})]);
  const buffer=output.target.buffer;if(!buffer||buffer.byteLength>maxBytes)throw new Error('VIDEO_OUTPUT_TOO_LARGE');
  const bytes=sanitizeMomentVideo(new Uint8Array(buffer));onProgress?.(100);
  return new File([bytes as Uint8Array<ArrayBuffer>],'moment.mp4',{type:'video/mp4'});
 }finally{if(timer)clearTimeout(timer);if(conversion&&conversion.state!=='done')await conversion.cancel().catch(()=>{});input.dispose();}
}
