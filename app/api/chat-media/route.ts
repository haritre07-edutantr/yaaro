import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {db,identity,failure} from '@/lib/server';
import {MediaService} from '@/lib/media-service';
import {mediaGuard,boundedMedia,privateMedia,cleanupMediaStorage} from '@/lib/media-server';
import {validatePhoto} from '@/lib/photo-validation';
import {validateVoice} from '@/lib/media-validation';
import {validateMomentVideo,sanitizeMomentVideo} from '@/lib/moment-video';
export async function GET(req:Request){try{const user=await identity();if(!user)throw new Error('UNAUTHORIZED');const id=z.string().uuid().parse(new URL(req.url).searchParams.get('id')),asset=await new MediaService(db(),user.userId).chatAsset(id);if(asset.kind!=='voice')throw new Error('FORBIDDEN');return await privateMedia(asset.storage_key,asset.content_type);}catch(e){return failure(e);}}
export async function POST(req:Request){let key:string|undefined;try{
 if(req.headers.get('content-type')?.startsWith('application/json')){
  const user=await mediaGuard(req,'chat_media_view',24),body=z.object({action:z.enum(['open','close']),id:z.string().uuid()}).parse(JSON.parse(new TextDecoder().decode(await boundedMedia(req,2048)))),service=new MediaService(db(),user.userId);
  if(body.action==='close'){const result=await service.closeChat(body.id);await cleanupMediaStorage();return Response.json(result);}
  const asset=await service.chatAsset(body.id);if(asset.kind==='voice')throw new Error('FORBIDDEN');const object=await env.BUCKET?.get(asset.storage_key);if(!object)throw new Error('STORAGE');await service.claimChat(body.id);
  return new Response(object.body,{headers:{'Content-Type':asset.content_type,'Content-Length':String(object.size),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }
 const user=await mediaGuard(req);if(!env.BUCKET)throw new Error('STORAGE');const params=new URL(req.url).searchParams,id=z.string().uuid().parse(params.get('id')),conversation=z.string().min(1).max(100).parse(params.get('conversation')),kind=z.enum(['photo','voice','video']).parse(params.get('kind'));const mime=kind==='photo'?'image/png':kind==='video'?'video/mp4':'audio/wav';if(req.headers.get('content-type')!==mime)throw new Error('INVALID');
 const service=new MediaService(db(),user.userId);if(await service.existingChat(id,conversation))return Response.json({saved:true});
 const bytes=await boundedMedia(req,kind==='photo'?1048576:kind==='video'?12*1024*1024:1920044);if(kind==='photo')validatePhoto(bytes);else if(kind==='voice')validateVoice(bytes);else{validateMomentVideo(bytes);sanitizeMomentVideo(bytes);}
 key=`chat/${id}/${crypto.randomUUID()}.${kind==='photo'?'png':kind==='video'?'mp4':'wav'}`;await env.BUCKET.put(key,bytes);const result=await service.saveChat(id,conversation,kind,key);await cleanupMediaStorage();return Response.json(result);
}catch(e){if(key)await env.BUCKET?.delete(key).catch(()=>{});return failure(e);}}
