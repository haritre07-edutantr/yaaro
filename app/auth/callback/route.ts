import {supabaseServer} from '@/lib/supabase-server';
import {safeReturnPath,validNativeAuthState} from '@/lib/auth-security';
import {env} from 'cloudflare:workers';
export async function GET(request:Request){
  const url=new URL(request.url),origin=env.PUBLIC_APP_ORIGIN;
  if(!origin||url.origin!==origin)return new Response('Authentication origin is not configured correctly.',{status:503});
  const code=url.searchParams.get('code');
  const state=url.searchParams.get('native_state');
  if(state!==null){
    if(!validNativeAuthState(state))return new Response('Invalid app sign-in.',{status:400});
    const link=new URL('com.yaaro.app://auth/callback');link.searchParams.set('state',state);
    if(code&&code.length<4096)link.searchParams.set('code',code);
    const href=link.href.replaceAll('&','&amp;').replaceAll('"','&quot;');
    // Chrome has no access to the app's PKCE verifier. Exchange only inside YAARO.
    return new Response(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${href}"><title>Return to YAARO</title></head><body style="background:#08131f;color:#eef7ff;font:18px system-ui;display:grid;place-items:center;min-height:90vh"><main style="text-align:center;padding:24px"><h1>Return to YAARO</h1><p>Finish your secure sign-in in the app.</p><a href="${href}" style="display:inline-block;padding:16px 28px;background:#087fad;color:white;border-radius:16px;text-decoration:none">Open YAARO</a></main></body></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'"}});
  }
  if(code&&code.length<4096){const supabase=await supabaseServer();const {error}=await supabase.auth.exchangeCodeForSession(code);if(!error)return Response.redirect(origin+safeReturnPath(url.searchParams.get('next')),303);}
  return Response.redirect(origin+'/auth/login?error=callback',303);
}
