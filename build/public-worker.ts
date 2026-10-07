import {drainNativePush} from '../lib/native-push-service';
import {ExploreService} from '../lib/explore-service';
import handler from 'vinext/server/fetch-handler';
import {communitySocketResponse} from '../lib/space-socket';
export {CommunityHub} from '../lib/space-hub';
export default {
  scheduled(_event:ScheduledController,env:Cloudflare.Env,ctx:ExecutionContext){if(!env.DB)return;ctx.waitUntil(drainNativePush(env.DB,env).catch(()=>console.warn('Native push retry pending')));ctx.waitUntil(new ExploreService(env.DB,'').cleanup().catch(()=>{console.error('Exploration cleanup failed');}));},
  async fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext) {
    if(new URL(request.url).pathname==='/api/space-stream'&&request.headers.get('Upgrade')==='websocket')return communitySocketResponse(request,env);
    const headers=new Headers(request.headers);
    for(const name of [...headers.keys()]) if(name.startsWith('oai-')) headers.delete(name);
    const response=await handler.fetch(new Request(request,{headers}),env,ctx);
    if(response.status===101)return response;
    if(env.DB&&(env.FCM_SERVICE_ACCOUNT||env.APNS_PRIVATE_KEY)&&request.method==='POST'&&response.ok&&['/api/community','/api/calls','/api/chat-media'].includes(new URL(request.url).pathname))ctx.waitUntil(drainNativePush(env.DB,env).catch(()=>console.warn('Native push retry pending')));
    const secured=new Response(response.body,response);
    secured.headers.set('X-Content-Type-Options','nosniff');
    secured.headers.set('Referrer-Policy','strict-origin-when-cross-origin');
    secured.headers.set('Permissions-Policy','camera=(self), microphone=(self), geolocation=()');
    const path=new URL(request.url).pathname;
    if(path.startsWith('/api/')||path.startsWith('/auth/')||['/community','/admin','/onboarding'].includes(path)||secured.headers.has('Set-Cookie')) {
      secured.headers.set('Cache-Control','private, no-store');
      secured.headers.set('Vary','Cookie');
    }
    return secured;
  }
};
