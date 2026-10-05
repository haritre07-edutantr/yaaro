import {supabaseServer} from '@/lib/supabase-server';
import {safeReturnPath} from '@/lib/auth-security';
import {env} from 'cloudflare:workers';
export async function GET(request:Request){
  const url=new URL(request.url),origin=env.PUBLIC_APP_ORIGIN;
  if(!origin||url.origin!==origin)return new Response('Authentication origin is not configured correctly.',{status:503});
  const code=url.searchParams.get('code');
  if(code&&code.length<4096){const supabase=await supabaseServer();const {error}=await supabase.auth.exchangeCodeForSession(code);if(!error)return Response.redirect(origin+safeReturnPath(url.searchParams.get('next')),303);}
  return Response.redirect(origin+'/auth/login?error=callback',303);
}
