// Account-wide subscription: the selected conversation is deliberately absent.
export function watchIncomingCalls<T>({load,isBusy,isOnline,onIncoming,windowEvents,documentEvents,pollMs=1000}:{load:()=>Promise<T|null>;isBusy:()=>boolean;isOnline:()=>boolean;onIncoming:(call:T|null)=>void;windowEvents:EventTarget;documentEvents:EventTarget;pollMs?:number}){
 let stopped=false,inFlight=false;
 async function check(){if(stopped||inFlight||isBusy()||!isOnline())return;inFlight=true;try{const call=await load();if(!stopped&&!isBusy())onIncoming(call);}catch{/* Retry on the next tick or foreground event. */}finally{inFlight=false;}}
 const resume=()=>void check();const timer=setInterval(resume,pollMs);
 windowEvents.addEventListener('focus',resume);windowEvents.addEventListener('online',resume);documentEvents.addEventListener('visibilitychange',resume);resume();
 return()=>{stopped=true;clearInterval(timer);windowEvents.removeEventListener('focus',resume);windowEvents.removeEventListener('online',resume);documentEvents.removeEventListener('visibilitychange',resume);};
}
