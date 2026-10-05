// Keep streamless audio/video track events together instead of replacing a stream.
export function addRemoteTrack(stream:MediaStream,track:MediaStreamTrack){
 if(!stream.getTracks().some(existing=>existing.id===track.id))stream.addTrack(track);
}
// Muted video must keep playing even when a browser requires a tap for sound.
export async function playRemoteMedia(video:HTMLVideoElement|null,audio:HTMLAudioElement|null,stream:MediaStream,sound:boolean):Promise<boolean>{
 if(video){if(video.srcObject!==stream)video.srcObject=stream;video.muted=true;}
 if(audio){if(audio.srcObject!==stream)audio.srcObject=stream;audio.muted=!sound;}
 const results=await Promise.allSettled([
  video&&stream.getVideoTracks().length?video.play():Promise.resolve(),
  audio&&sound&&stream.getAudioTracks().length?audio.play():Promise.resolve()
 ]);
 return results[1].status==='rejected'&&(results[1].reason as Error)?.name==='NotAllowedError';
}
