import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {db,guard,payload,failure} from '@/lib/server';
import {SpacesService} from '@/lib/spaces-service';
export async function POST(req:Request){try{const user=await guard(req);if(!env.SPACE_HUB)throw Error('STORAGE');const {space}=z.object({space:z.string().uuid()}).parse(await payload(req)),{me}=await new SpacesService(db(),user.userId).access(space);return env.SPACE_HUB.get(env.SPACE_HUB.idFromName(space)).fetch(new Request('https://hub/ticket',{method:'POST',headers:{'X-Space':space,'X-Member':me}}));}catch(e){return failure(e);}}
