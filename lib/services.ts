export async function api(path:string,method='GET',body?:unknown){
 const r=await fetch(path,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});let data:any;
 try{data=JSON.parse(await r.text());}catch{throw Object.assign(new Error(r.status===401?'Your session expired. Sign in again to continue.':`YAARO returned an unexpected response (HTTP ${r.status}). Your changes are still on this screen; please try again.`),{status:r.status});}
 if(!r.ok)throw Object.assign(new Error(typeof data?.error==='string'?data.error:'Something went wrong. Please try again.'),{status:r.status});return data;
}
export const analytics={track(event:string){void api('/api/events','POST',{event}).catch(()=>{});}};
export const capabilities={consumerAuth:false,realtimeChat:false,calls:false,liveRooms:false,payments:false,uploads:false};
// Future providers implement these interfaces without changing the product components.
export interface RealtimeProvider { subscribe(conversationId:string,onMessage:(message:unknown)=>void):()=>void; send(conversationId:string,payload:unknown):Promise<void>; }
export interface CallProvider { join(id:string,mode:'voice'|'video'):Promise<void>; leave():Promise<void>; }
export interface PaymentProvider { checkout(productId:string):Promise<{url:string}>; }
