import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {db,identity,failure} from '@/lib/server';
import {MediaService} from '@/lib/media-service';
import {mediaGuard,boundedMedia} from '@/lib/media-server';
import {validatePhoto} from '@/lib/photo-validation';
import {MAX_MOMENT_VIDEO_BYTES,validateMomentVideo,sanitizeMomentVideo} from '@/lib/moment-video';
export async function GET(req:Request){try{
 const user=await identity();if(!user)throw new Error('UNAUTHORIZED');const service=new MediaService(db(),user.userId);
 // Media is never delivered by a reusable GET or used as a feed thumbnail.
 if(new URL(req.url).searchParams.has('id'))throw new Error('FORBIDDEN');
 const expired=await service.purgeExpired();if(expired.length)await env.BUCKET?.delete(expired).catch(()=>{});
 return Response.json({moments:await service.moments()},{headers:{'Cache-Control':'no-store'}});
}catch(e){return failure(e);}}
export async function POST(req:Request){let key:string|undefined;try{
 if(req.headers.get('content-type')?.startsWith('application/json')){
 const user=await mediaGuard(req,'moment_open',24),body=JSON.parse(new TextDecoder().decode(await boundedMedia(req,2048))),id=z.string().uuid().parse(body.id);if(body.action!=='open')throw new Error('INVALID');
 const service=new MediaService(db(),user.userId),moment=await service.momentAsset(id);
 const object=moment.photo_key?await env.BUCKET?.get(moment.photo_key):null;if(moment.photo_key&&!object)throw new Error('STORAGE');
 // Unique (moment,member) row makes concurrent openings across devices fail closed.
 await service.claimMoment(id);
 if(!object)return Response.json({body:moment.body},{headers:{'Cache-Control':'private, no-store'}});
 return new Response(object.body,{headers:{'Content-Type':moment.media_kind==='video'?'video/mp4':'image/png','Content-Length':String(object.size),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Moment-Caption':encodeURIComponent(moment.body)}});
 }
 const user=await mediaGuard(req,'moment_write'),bytes=await boundedMedia(req,MAX_MOMENT_VIDEO_BYTES+100000),form=await new Response(bytes,{headers:{'Content-Type':req.headers.get('content-type')||''}}).formData();
 const id=z.string().uuid().parse(form.get('id')),body=z.string().trim().max(500).parse(form.get('body')),visibility=z.enum(['everyone','selected']).parse(form.get('visibility')),recipients=z.array(z.string().uuid()).max(100).parse(JSON.parse(String(form.get('recipients')||'[]'))),kind=z.enum(['photo','video']).parse(form.get('kind')),file=form.get('media');
 const service=new MediaService(db(),user.userId);if(await service.existingMoment(id))return Response.json({saved:true});
 if(!(file instanceof File)||!file.size||!env.BUCKET)throw new Error('INVALID');const media=new Uint8Array(await file.arrayBuffer());
 if(kind==='photo'){if(file.type!=='image/png')throw new Error('INVALID');validatePhoto(media);}else{if(file.type!=='video/mp4')throw new Error('VIDEO_INVALID');validateMomentVideo(media);sanitizeMomentVideo(media);}
 if((visibility==='selected'&&!recipients.length)||(visibility==='everyone'&&recipients.length))throw new Error('INVALID');
 key=`moments/${id}/${crypto.randomUUID()}.${kind==='video'?'mp4':'png'}`;await env.BUCKET.put(key,media);
 return Response.json(await service.saveMoment(id,body,visibility,'24h',key,recipients,kind));
}catch(e){if(key)await env.BUCKET?.delete(key).catch(()=>{});return failure(e);}}
export async function DELETE(req:Request){try{const user=await mediaGuard(req,'moment_write'),id=z.string().uuid().parse(new URL(req.url).searchParams.get('id')),key=await new MediaService(db(),user.userId).deleteMoment(id);if(key)await env.BUCKET?.delete(key);return Response.json({saved:true});}catch(e){return failure(e);}}
