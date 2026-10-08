// Compatibility exports for preserved components; authentication is Supabase-only.
import {env} from 'cloudflare:workers';
import {redirect} from 'next/navigation';
import {supabaseServer,authConfig} from '@/lib/supabase-server';
import {safeReturnPath} from '@/lib/auth-security';
export type YaaroUser={userId:string;displayName:string;email:string;fullName:string|null;emailVerified:boolean};
export async function getYaaroUser():Promise<YaaroUser|null>{
  if(!authConfig())return null;
  const supabase=await supabaseServer();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user||user.is_anonymous||(!user.email_confirmed_at&&!user.phone_confirmed_at))return null;
  if(env.DB&&await env.DB.prepare('SELECT owner FROM account_deletions WHERE owner=?').bind(user.id).first())return null;
  return {userId:user.id,displayName:'Yaaro',email:user.email||'',fullName:null,emailVerified:!!user.email_confirmed_at};
}
export async function requireYaaroUser(returnTo:string){const user=await getYaaroUser();if(user)return user;redirect(yaaroSignInPath(returnTo));}
export function yaaroSignInPath(returnTo:string){return '/auth/login?next='+encodeURIComponent(safeReturnPath(returnTo));}
export function yaaroSignOutPath(){return '/auth/signout';}
