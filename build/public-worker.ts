import handler from 'vinext/server/fetch-handler';
export default {
  async fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext) {
    const headers=new Headers(request.headers);
    for(const name of [...headers.keys()]) if(name.startsWith('oai-')) headers.delete(name);
    const response=await handler.fetch(new Request(request,{headers}),env,ctx);
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
