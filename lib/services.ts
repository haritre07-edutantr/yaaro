export async function api(path:string,method='GET',body?:unknown){const r=await fetch(path,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});const data:any=await r.json();if(!r.ok)throw new Error(data.error||'Something went wrong. Please try again.');return data;}
export const analytics={track(event:string){void api('/api/events','POST',{event}).catch(()=>{});}};
export const capabilities={consumerAuth:false,realtimeChat:false,calls:false,liveRooms:false,payments:false,uploads:false};
// Future providers implement these interfaces without changing the product components.
export interface RealtimeProvider { subscribe(conversationId:string,onMessage:(message:unknown)=>void):()=>void; send(conversationId:string,payload:unknown):Promise<void>; }
export interface CallProvider { join(id:string,mode:'voice'|'video'):Promise<void>; leave():Promise<void>; }
export interface PaymentProvider { checkout(productId:string):Promise<{url:string}>; }
