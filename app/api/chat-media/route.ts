import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {db,identity,failure} from '@/lib/server';
import {MediaService} from '@/lib/media-service';
import {mediaGuard,boundedMedia,privateMedia} from '@/lib/media-server';
import {validatePhoto} from '@/lib/photo-validation';
import {validateVoice} from '@/lib/media-validation';
export async function GET(req:Request){try{const user=await identity();if(!user)throw new Error('UNAUTHORIZED');const id=z.string().uuid().parse(new URL(req.url).searchParams.get('id')),asset=await new MediaService(db(),user.userId).chatAsset(id);return await privateMedia(asset.storage_key,asset.content_type);}catch(e){return failure(e);}}
export async function POST(req:Request){let key:string|undefined;try{const user=await mediaGuard(req);if(!env.BUCKET)throw new Error('STORAGE');const params=new URL(req.url).searchParams,id=z.string().uuid().parse(params.get('id')),conversation=z.string().min(1).max(100).parse(params.get('conversation')),kind=z.enum(['photo','voice']).parse(params.get('kind'));if(req.headers.get('content-type')!==(kind==='photo'?'image/png':'audio/wav'))throw new Error('INVALID');if(await new MediaService(db(),user.userId).existingChat(id,conversation))return Response.json({saved:true});const bytes=await boundedMedia(req,kind==='photo'?1048576:1920044);if(kind==='photo')validatePhoto(bytes);else validateVoice(bytes);key=`chat/${id}/${crypto.randomUUID()}.${kind==='photo'?'png':'wav'}`;await env.BUCKET.put(key,bytes);const result=await new MediaService(db(),user.userId).saveChat(id,conversation,kind,key);return Response.json(result);}catch(e){if(key)await env.BUCKET?.delete(key).catch(()=>{});return failure(e);}}
