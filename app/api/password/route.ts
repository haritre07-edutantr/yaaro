import {createClient} from '@supabase/supabase-js';
import {cookies} from 'next/headers';
import {authConfig,supabaseServer} from '@/lib/supabase-server';
import {db,payload,failure,identity} from '@/lib/server';
import {passwordFields,recoveryHash,RECOVERY_COOKIE} from '@/lib/password-security';
async function limit(owner:string){const now=Date.now();const result=await db().prepare("INSERT INTO product_events(id,owner,event,created_at) SELECT ?,?,'password',? WHERE (SELECT COUNT(*) FROM product_events WHERE owner=? AND event='password' AND created_at>?)<5").bind(crypto.randomUUID(),owner,now,owner,now-60000).run();if(!result.meta.changes)throw Error('RATE');}
export async function GET(){const user=await identity(),ticket=(await cookies()).get(RECOVERY_COOKIE)?.value;const recovery=!!(user&&ticket&&await db().prepare('SELECT owner FROM password_recoveries WHERE ticket_hash=? AND owner=? AND expires_at>?').bind(await recoveryHash(ticket),user.userId,Date.now()).first());return Response.json({email:user?.email||'',recovery},{headers:{'Cache-Control':'no-store'}});}
export async function POST(request:Request){
 try{
  if(request.headers.get('origin')!==new URL(request.url).origin)throw Error('FORBIDDEN');
  if(!request.headers.get('content-type')?.includes('application/json'))throw Error('INVALID');
  const body=await payload(request),config=authConfig();if(!config)throw Error('AUTH_UNAVAILABLE');
  await db().prepare('DELETE FROM password_recoveries WHERE expires_at<?').bind(Date.now()).run();
  if(body.action==='request'){
   if(typeof body.email!=='string'||body.email.length>254||!/^\S+@\S+\.\S+$/.test(body.email.trim()))throw Error('INVALID');
   await limit('recovery:'+await recoveryHash(body.email.trim().toLowerCase()));
   const isolated=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,flowType:'implicit'}});
   const {error}=await isolated.auth.resetPasswordForEmail(body.email.trim(),{redirectTo:new URL('/auth/recovery?return_to='+ (body.returnTo==='android'?'android':'web'),request.url).href});
   if(error)throw Error(error.status===429?'RATE':'AUTH_UNAVAILABLE');
   return Response.json({message:'If this email belongs to a YAARO account, a password reset link will arrive shortly. Check your inbox and spam folder.'});
  }
  const client=await supabaseServer(),jar=await cookies();
  if(body.action==='verify'){
   if(typeof body.token!=='string'||!/^[a-f0-9]{32,128}$/i.test(body.token))throw Error('INVALID');
   await limit('recovery-link:'+await recoveryHash(body.token));
   const {data,error}=await client.auth.verifyOtp({token_hash:body.token,type:'recovery'});
   if(error||!data.user||!data.session)throw Error('RECOVERY_INVALID');
   if(await db().prepare('SELECT owner FROM account_deletions WHERE owner=?').bind(data.user.id).first())throw Error('UNAUTHORIZED');
   const ticket=crypto.randomUUID();
   await db().prepare('INSERT INTO password_recoveries(ticket_hash,owner,expires_at) VALUES(?,?,?) ON CONFLICT(owner) DO UPDATE SET ticket_hash=excluded.ticket_hash,expires_at=excluded.expires_at').bind(await recoveryHash(ticket),data.user.id,Date.now()+900000).run();
   jar.set(RECOVERY_COOKIE,ticket,{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:900});
   return Response.json({verified:true});
  }
  const user=await identity();if(!user)throw Error('UNAUTHORIZED');
  const password=passwordFields(body);await limit(user.userId);
  if(body.action==='change'){
   if(typeof body.oldPassword!=='string'||!body.oldPassword||body.oldPassword.length>128)throw Error('OLD_PASSWORD');
   const isolated=createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
   const verified=await isolated.auth.signInWithPassword({email:user.email,password:body.oldPassword});
   if(verified.error||verified.data.user?.id!==user.userId)throw Error('OLD_PASSWORD');
   try{const {error}=await client.auth.updateUser({password,current_password:body.oldPassword});if(error)throw Error('PASSWORD_SAVE');}finally{await isolated.auth.signOut({scope:'local'});}
  }else if(body.action==='reset'){
   const ticket=jar.get(RECOVERY_COOKIE)?.value;if(!ticket)throw Error('RECOVERY_INVALID');
   const grant=await db().prepare('DELETE FROM password_recoveries WHERE ticket_hash=? AND owner=? AND expires_at>? RETURNING owner').bind(await recoveryHash(ticket),user.userId,Date.now()).first();
   if(!grant)throw Error('RECOVERY_INVALID');
   const {error}=await client.auth.updateUser({password});jar.delete(RECOVERY_COOKIE);
   if(error)throw Error('PASSWORD_SAVE');
  }else throw Error('INVALID');
  await client.auth.signOut({scope:'others'});
  return Response.json({saved:true},{headers:{'Cache-Control':'no-store'}});
 }catch(e){const message=e instanceof Error?e.message:'';const messages:Record<string,string>={OLD_PASSWORD:'Your old password is incorrect. Try again or choose Forgot password.',PASSWORD_INVALID:'Use at least 12 characters and make sure both new passwords match.',RECOVERY_INVALID:'This reset link has expired or already been used. Request a new link.',PASSWORD_SAVE:'The password could not be updated. Try again, or request a new reset link.'};if(messages[message])return Response.json({error:messages[message]},{status:400});return failure(e);}
}
