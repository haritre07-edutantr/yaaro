import {authConfig} from '@/lib/supabase-server';
import {env} from 'cloudflare:workers';
export async function GET(){
  const config=authConfig(),headers={'Cache-Control':'no-store'};
  if(!config||!env.PUBLIC_APP_ORIGIN)return Response.json({configured:false,email:false,phone:false,google:false,notice:'Sign-in is being configured. You can explore the demo in the meantime.'},{headers});
  try{
    const response=await fetch(config.url+'/auth/v1/settings',{headers:{apikey:config.key},signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw new Error('Settings unavailable');
    const settings=await response.json() as {external:Record<string,boolean>};
    return Response.json({configured:true,...config,email:!!settings.external.email&&env.AUTH_EMAIL_DELIVERY_READY==='true',phone:!!settings.external.phone,google:!!settings.external.google,notice:env.AUTH_EMAIL_DELIVERY_READY!=='true'?'Email delivery is being configured. Available providers will appear here when ready.':undefined},{headers});
  }catch{return Response.json({configured:false,email:false,phone:false,google:false,notice:'Sign-in is temporarily unavailable. Please try again.'},{status:503,headers});}
}
