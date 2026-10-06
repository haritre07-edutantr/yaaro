import {z} from 'zod';
import {db,identity,guard,payload,failure} from '@/lib/server';
import {exploreAction} from '@/lib/explore-model';
import {ExploreService} from '@/lib/explore-service';
export async function GET(req:Request){try{const user=await identity();if(!user)throw new Error('UNAUTHORIZED');const ticket=z.string().uuid().parse(new URL(req.url).searchParams.get('ticket'));return Response.json(await new ExploreService(db(),user.userId).state(ticket),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return failure(e);}}
export async function POST(req:Request){try{const user=await guard(req);return Response.json(await new ExploreService(db(),user.userId).act(exploreAction.parse(await payload(req))),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return failure(e);}}
