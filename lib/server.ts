import { env } from 'cloudflare:workers';
import { isSuperAdmin } from '@/lib/auth-security';
import { getYaaroUser } from '@/lib/identity';
export function db(){ if(!env.DB) throw new Error('Storage unavailable'); return env.DB; }
export const ADMIN_EMAIL='haritre07@gmail.com';
export async function identity(){ return getYaaroUser(); }
export function adminAccess(user: Awaited<ReturnType<typeof identity>>) { return isSuperAdmin(user, env.SUPER_ADMIN_USER_ID); }
export async function guard(request:Request){
 const user=await identity(); if(!user) throw new Error('UNAUTHORIZED');
 const origin=request.headers.get('origin'); if(!origin || origin!==new URL(request.url).origin) throw new Error('FORBIDDEN');
 if(!request.headers.get('content-type')?.includes('application/json')) throw new Error('INVALID');
 if(Number(request.headers.get('content-length')||0)>65536) throw new Error('INVALID');
 const result=await db().prepare('INSERT INTO product_events (id, owner, event, created_at) SELECT ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM product_events WHERE owner = ? AND created_at > ?) < 60').bind(crypto.randomUUID(),user.userId,'write',Date.now(),user.userId,Date.now()-60000).run();
 if(!result.meta.changes)throw new Error('RATE');
 return user;
}
export function failure(e:unknown){const m=e instanceof SyntaxError || (e instanceof Error && e.name==='ZodError')?'INVALID':e instanceof Error?e.message:'';const status=m==='UNAUTHORIZED'?401:['FORBIDDEN','SUSPENDED'].includes(m)?403:['INVALID','AGE','VIDEO_INVALID','VIDEO_TOO_LONG'].includes(m)?400:m==='RATE'?429:m==='NOT_FOUND'?404:['CONFLICT','COOLDOWN','PROFILE','BUSY','PIN_LIMIT','FAVORITE_LIMIT','VIEWED'].includes(m)?409:503;const messages:Record<string,string>={VIEWED:'This Moment has already been opened. Each person gets one view.',VIDEO_TOO_LONG:'Choose a video that is 10 seconds or shorter.',VIDEO_INVALID:'Choose a standard H.264 MP4 video under 12 MB, up to 10 seconds long.',PIN_LIMIT:'You can pin up to 2 Yaaros. Unpin someone first.',FAVORITE_LIMIT:'You can favorite up to 3 Yaaros. Remove a favorite first.',CALLS_UNAVAILABLE:'Voice and video need a configured private calling relay. No camera or microphone has been accessed.',STORAGE:'Photo storage is unavailable. Please try again later.',BUSY:'One of you is already in a call. Try again later.',UNAUTHORIZED:'Sign in securely to continue.',SUSPENDED:'This account is restricted. Community access is unavailable.',FORBIDDEN:'This action is unavailable. Check your connection and privacy settings.',AGE:'YAARO is currently for adults aged 18 or older. Enter a valid date of birth.',PROFILE:'Complete your profile to join the community.',COOLDOWN:'Give this Yaaro some space. Please wait before requesting again.',CONFLICT:'This request has changed. Refresh and try again.',INVALID:'Check the information you entered and try again.',NOT_FOUND:'This Yaaro or conversation is no longer available.',RATE:'Please take a moment and try again.'};return Response.json({error:messages[m]||'Unable to save right now. Your input is still on this screen.'},{status});}


export async function payload(request:Request){const reader=request.body?.getReader();if(!reader)throw new Error('INVALID');const chunks:Uint8Array[]=[];let size=0;while(true){const item=await reader.read();if(item.done)break;size+=item.value.byteLength;if(size>64000){await reader.cancel();throw new Error('INVALID');}chunks.push(item.value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return JSON.parse(new TextDecoder().decode(bytes));}
