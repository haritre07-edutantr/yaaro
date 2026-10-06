import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {SpacesService} from '@/lib/spaces-service';
import {db,identity,failure} from '@/lib/server';
import {mediaGuard,boundedMedia,privateMedia} from '@/lib/media-server';
import {validatePhoto} from '@/lib/photo-validation';
import {publishSpaceChange} from '@/lib/space-realtime';
const params=(req:Request)=>{const q=new URL(req.url).searchParams;return {space:z.string().uuid().parse(q.get('space')),kind:z.enum(['logo','cover']).parse(q.get('kind'))};};
export async function GET(req:Request){try{const user=await identity();if(!user)throw Error('UNAUTHORIZED');const {space,kind}=params(req),key=await new SpacesService(db(),user.userId).image(space,kind);if(!key)throw Error('NOT_FOUND');return privateMedia(key,'image/png');}catch(e){return failure(e);}}
export async function POST(req:Request){try{const user=await mediaGuard(req,'space_image',6),{space,kind}=params(req),service=new SpacesService(db(),user.userId);const {space:record}=await service.access(space);if(record.myRole!=='owner')throw Error('FORBIDDEN');if(!env.BUCKET)throw Error('STORAGE');if(req.headers.get('content-type')!=='image/png')throw Error('INVALID');const bytes=await boundedMedia(req,1048576);validatePhoto(bytes,kind==='cover'?{maxWidth:1024,maxHeight:576}:{maxWidth:512,maxHeight:512});const key=`communities/${space}/${kind}/${crypto.randomUUID()}.png`;await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:'image/png'}});let old;try{old=await service.saveImage(space,kind,key);}catch(e){await env.BUCKET.delete(key);throw e;}if(old)await env.BUCKET.delete(old).catch(()=>{});await publishSpaceChange(space).catch(()=>{});return Response.json({saved:true});}catch(e){return failure(e);}}
export async function DELETE(req:Request){try{const user=await mediaGuard(req,'space_image',6),{space,kind}=params(req),old=await new SpacesService(db(),user.userId).saveImage(space,kind,null);if(old&&env.BUCKET)await env.BUCKET.delete(old);await publishSpaceChange(space).catch(()=>{});return Response.json({saved:true});}catch(e){return failure(e);}}
