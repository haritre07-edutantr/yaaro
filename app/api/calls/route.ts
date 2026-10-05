import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {db,identity,guard,payload,failure} from '@/lib/server';
import {CallService,callAction} from '@/lib/call-service';
function urls(){const list=(env.TURN_URLS||'').split(',').map(x=>x.trim()).filter(Boolean);return list.length&&list.length<=4&&list.every(x=>/^turns?:[a-z0-9.-]+:\d{2,5}(\?transport=(udp|tcp))?$/i.test(x))?list:[];}
function ready(){return (env.TURN_SHARED_SECRET?.length||0)>=32&&urls().length>0;}
export async function GET(req:Request){try{const u=await identity();if(!u)throw new Error('UNAUTHORIZED');const q=new URL(req.url).searchParams;const service=new CallService(db(),u.userId);if(q.has('capabilities'))return Response.json({configured:ready()},{headers:{'Cache-Control':'no-store'}});const id=q.has('id')?z.string().uuid().parse(q.get('id')):undefined;
 if(q.has('ice')){if(!id||!ready())throw new Error('CALLS_UNAVAILABLE');await service.expire();const {me,c}=await service.access(id);if(!['ringing','connecting','active'].includes(c.state))throw new Error('FORBIDDEN');const username=`${Math.floor(c.created_at/1000)+3900}:${me}`;const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.TURN_SHARED_SECRET!),{name:'HMAC',hash:'SHA-1'},false,['sign']);const sig=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(username)));const credential=btoa(String.fromCharCode(...sig));return Response.json({iceServers:[{urls:urls(),username,credential}],iceTransportPolicy:'relay'},{headers:{'Cache-Control':'no-store'}});}
 return Response.json({call:await service.get(id)},{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}}
export async function POST(req:Request){try{const u=await guard(req);const a=callAction.parse(await payload(req));if(a.action==='start'&&!ready())throw new Error('CALLS_UNAVAILABLE');return Response.json(await new CallService(db(),u.userId).act(a));}catch(e){return failure(e);}}
