import {z} from 'zod';
import { db, guard, failure, payload } from '@/lib/server';
const allowed=['profile_completed','vibe_selected','discovery_viewed','connection_requested','connection_accepted','quick_connect_started','match_completed','chat_started','room_joined','moment_viewed'];
export async function POST(req:Request){try{const u=await guard(req);const b=z.object({event:z.string().max(60)}).parse(await payload(req));if(!allowed.includes(b.event))throw new Error('INVALID');await db().prepare('INSERT INTO product_events (id, owner, event, created_at) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(),u.userId,b.event,Date.now()).run();return Response.json({saved:true});}catch(e){return failure(e);}}
