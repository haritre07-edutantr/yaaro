export function supportsTorch(track?:MediaStreamTrack){try{return !!track&&(track.getCapabilities?.() as MediaTrackCapabilities&{torch?:boolean}).torch===true;}catch{return false;}}
export async function setTorch(track:MediaStreamTrack,enabled:boolean){if(!supportsTorch(track)||track.readyState!=='live')throw Error('Flashlight is unavailable on this camera.');await track.applyConstraints({advanced:[{torch:enabled} as MediaTrackConstraintSet]});if((track.getSettings() as MediaTrackSettings&{torch?:boolean}).torch!==enabled)throw Error('Your browser could not switch the flashlight.');}
export async function replaceVideoCamera({sender,stream,front,isCurrent,acquire}:{sender:RTCRtpSender;stream:MediaStream;front:boolean;isCurrent:()=>boolean;acquire:(front:boolean)=>Promise<MediaStream>}){
 const old=stream.getVideoTracks()[0];let capture:MediaStream|undefined,restored=false;
 try{try{capture=await acquire(front);}catch(error){if((error as Error).name!=='NotReadableError')throw error;old?.stop();try{capture=await acquire(front);}catch{capture=await acquire(!front);restored=true;}}
 const track=capture.getVideoTracks()[0];if(!track)throw Error('No camera was found.');if(!isCurrent())throw Error('Call cancelled.');track.enabled=old?.enabled??true;await sender.replaceTrack(track);if(!isCurrent())throw Error('Call cancelled.');if(old){stream.removeTrack(old);old.stop();}stream.addTrack(track);return {track,front:restored?!front:front,restored};
 }catch(error){capture?.getTracks().forEach(track=>track.stop());throw error;}
}
