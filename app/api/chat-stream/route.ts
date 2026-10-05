import {z} from 'zod';
import {cleanupMediaStorage} from '@/lib/media-server';
import {db,identity,failure} from '@/lib/server';
import {CommunityService} from '@/lib/community-service';
export async function GET(req:Request){try{
 const u=await identity();if(!u)throw new Error('UNAUTHORIZED');const id=z.string().min(1).max(100).parse(new URL(req.url).searchParams.get('conversation'));const service=new CommunityService(db(),u.userId);await service.conversationAccess(id);
 let stopped=false,timer:ReturnType<typeof setTimeout>|undefined;const enc=new TextEncoder();let finish:()=>void=()=>{};
 const stream=new ReadableStream<Uint8Array>({start(controller){let last='',ticks=0;finish=()=>{if(stopped)return;stopped=true;clearTimeout(timer);req.signal.removeEventListener('abort',finish);try{controller.close();}catch{}};req.signal.addEventListener('abort',finish,{once:true});const push=async()=>{if(stopped)return;try{const messages=await service.messages(id);if(ticks%5===0)await cleanupMediaStorage();if(stopped)return;const data=JSON.stringify({messages});if(data!==last){controller.enqueue(enc.encode(`event: messages\ndata: ${data}\n\n`));last=data;}else controller.enqueue(enc.encode(': keepalive\n\n'));if(++ticks>=20){controller.enqueue(enc.encode('event: renew\ndata: {}\n\n'));finish();return;}timer=setTimeout(push,1200);}catch{if(!stopped){controller.enqueue(enc.encode('event: revoked\ndata: {}\n\n'));finish();}}};void push();},cancel(){stopped=true;clearTimeout(timer);req.signal.removeEventListener('abort',finish);}});
 return new Response(stream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff'}});
}catch(e){return failure(e);}}
