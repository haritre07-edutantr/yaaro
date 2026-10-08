import {createClient} from '@supabase/supabase-js';
import {env} from 'cloudflare:workers';
import {cookies} from 'next/headers';
import {supabaseServer,authConfig} from '@/lib/supabase-server';
import {db,failure,payload} from '@/lib/server';
import {eraseAccountData} from '@/lib/account-deletion';
import {cleanupMediaStorage} from '@/lib/media-server';
export async function POST(request:Request){
 try{
  if(request.headers.get('origin')!==new URL(request.url).origin)throw Error('FORBIDDEN');
  if(!request.headers.get('content-type')?.includes('application/json'))throw Error('INVALID');
  const body=await payload(request);if(body.confirmation!=='DELETE')throw Error('INVALID');
  const client=await supabaseServer(),{data:{user},error}=await client.auth.getUser();
  if(error||!user||user.is_anonymous)throw Error('UNAUTHORIZED');
  const config=authConfig();
  if(!config||!env.SUPABASE_SECRET_KEY)return Response.json({error:'Account deletion is being configured. Contact haritre07@gmail.com from your account email to request deletion.'},{status:503});
  const admin=createClient(config.url,env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error:adminError}=await admin.auth.admin.getUserById(user.id);
  if(adminError)return Response.json({error:'Account deletion configuration could not be verified. Your data has not been changed. Please contact haritre07@gmail.com.'},{status:503});
  // Revocation must succeed before any irreversible erasure. getUser above validates identity.
  const {error:signoutError}=await client.auth.signOut({scope:'others'});if(signoutError)throw Error('AUTH_UNAVAILABLE');
  await eraseAccountData(db(),user.id);
  const {error:deleteError}=await admin.auth.admin.deleteUser(user.id);
  if(deleteError){console.warn('Account deletion awaiting auth cleanup',{code:deleteError.code||'AUTH_DELETE_FAILED'});return Response.json({error:'Your YAARO data has been removed and access disabled. Sign-in cleanup could not finish; keep this page open and retry deletion.'},{status:503});}
  await db().prepare('UPDATE account_deletions SET completed_at=? WHERE owner=?').bind(Date.now(),user.id).run().catch(()=>console.warn('Account deletion completion record pending')); 
  await client.auth.signOut({scope:'local'});
  (await cookies()).delete('yaaro_native_device');
  await cleanupMediaStorage().catch(()=>console.warn('Deleted account media cleanup pending'));
  return Response.json({deleted:true},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return failure(e);}
}
