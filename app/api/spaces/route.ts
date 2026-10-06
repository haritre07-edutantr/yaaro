import {z} from 'zod';
import {db,identity,guard,payload,failure} from '@/lib/server';
import {SpacesService} from '@/lib/spaces-service';
import {spaceAction} from '@/lib/spaces-model';
export async function GET(req:Request){try{const u=await identity();if(!u)throw Error('UNAUTHORIZED');const service=new SpacesService(db(),u.userId),q=new URL(req.url).searchParams;let result;
 if(q.has('activity'))result=await service.activity();
 else if(q.has('space')){const id=z.string().uuid().parse(q.get('space'));if(q.has('members'))result=await service.members(id,{q:q.has('q')?z.string().max(100).parse(q.get('q')):undefined,status:q.has('status')?z.enum(['active','pending','banned']).parse(q.get('status')):undefined,offset:q.has('offset')?z.coerce.number().int().min(0).max(10000).parse(q.get('offset')):undefined});else if(q.has('resources'))result=await service.resources(id,{q:q.has('q')?z.string().max(100).parse(q.get('q')):undefined,offset:q.has('offset')?z.coerce.number().int().min(0).max(10000).parse(q.get('offset')):undefined});else if(q.has('posts'))result=await service.posts(id,{post:q.has('post')?z.string().uuid().parse(q.get('post')):undefined,channel:q.has('channel')?z.string().uuid().parse(q.get('channel')):undefined,parent:q.has('parent')?z.string().uuid().parse(q.get('parent')):undefined,saved:q.get('saved')==='1',cursor:q.has('cursor')?z.string().uuid().parse(q.get('cursor')):undefined,before:q.has('before')?z.coerce.number().int().positive().parse(q.get('before')):undefined});else result=await service.detail(id);}
 else result=await service.list({q:q.has('q')?z.string().max(100).parse(q.get('q')):undefined,topic:q.has('topic')?z.string().max(40).parse(q.get('topic')):undefined,mine:q.get('mine')==='1',offset:q.has('offset')?z.coerce.number().int().min(0).max(10000).parse(q.get('offset')):undefined});
 return Response.json(result,{headers:{'Cache-Control':'no-store'}});
}catch(e){return failure(e);}}
export async function POST(req:Request){try{const u=await guard(req),a=spaceAction.parse(await payload(req));return Response.json(await new SpacesService(db(),u.userId).act(a));}catch(e){return failure(e);}}
