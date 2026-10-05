// Both tasks begin only after the user explicitly starts or accepts a call.
export async function prepareCallMedia<T>({loadConfig,acquire,isCurrent,onMedia}:{loadConfig:()=>Promise<T>;acquire:()=>Promise<MediaStream>;isCurrent:()=>boolean;onMedia:(media:MediaStream)=>void}){
 let failed=false,media:MediaStream|undefined;
 const configTask=Promise.resolve().then(loadConfig);
 const mediaTask=Promise.resolve().then(acquire).then(value=>{media=value;if(failed||!isCurrent()){value.getTracks().forEach(track=>track.stop());throw new Error('Call cancelled.');}onMedia(value);return value;});
 try{const [config,stream]=await Promise.all([configTask,mediaTask]);if(!isCurrent())throw new Error('Call cancelled.');return {config,media:stream};}catch(error){failed=true;media?.getTracks().forEach(track=>track.stop());throw error;}
}
