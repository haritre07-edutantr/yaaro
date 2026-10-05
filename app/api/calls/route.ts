import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {db,identity,guard,payload,failure} from '@/lib/server';
import {CallService,callAction} from '@/lib/call-service';
import {relayReady,relayServers} from '@/lib/turn-provider';
function ready(){return relayReady(env);}
export async function GET(req:Request){try{const u=await identity();if(!u)throw new Error('UNAUTHORIZED');const q=new URL(req.url).searchParams;const service=new CallService(db(),u.userId);if(q.has('self'))return Response.json({me:await service.self()},{headers:{'Cache-Control':'no-store'}});if(q.has('capabilities'))return Response.json({configured:ready()},{headers:{'Cache-Control':'no-store'}});const id=q.has('id')?z.string().uuid().parse(q.get('id')):undefined;
 if(q.has('ice')){if(!id||!ready())throw new Error('CALLS_UNAVAILABLE');await service.expire();const {me,c}=await service.access(id);if(!['ringing','connecting','active'].includes(c.state))throw new Error('FORBIDDEN');const iceServers=await relayServers(env,c.id,me,c.created_at);return Response.json({iceServers,iceTransportPolicy:'relay'},{headers:{'Cache-Control':'no-store'}});}
 return Response.json({call:await service.get(id)},{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}}
export async function POST(req:Request){try{const u=await guard(req);const a=callAction.parse(await payload(req));if(a.action==='start'&&!ready())throw new Error('CALLS_UNAVAILABLE');return Response.json(await new CallService(db(),u.userId).act(a));}catch(e){return failure(e);}}
