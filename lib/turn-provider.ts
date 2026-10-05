type Settings = {CLOUDFLARE_TURN_KEY_ID?: string; CLOUDFLARE_TURN_API_TOKEN?: string; TURN_URLS?: string; TURN_SHARED_SECRET?: string};
type Relay = {urls: string[]; username: string; credential: string};
export function coturnUrls(settings: Settings) {
  const list=(settings.TURN_URLS||'').split(',').map(x=>x.trim()).filter(Boolean);
  return list.length&&list.length<=4&&list.every(x=>/^turns?:[a-z0-9.-]+:\d{2,5}(\?transport=(udp|tcp))?$/i.test(x))?list:[];
}
function cloudflareReady(s: Settings) {return /^[a-z0-9_-]{8,128}$/i.test(s.CLOUDFLARE_TURN_KEY_ID||'')&&(s.CLOUDFLARE_TURN_API_TOKEN?.length||0)>=32;}
export function relayReady(s: Settings) {return cloudflareReady(s)||((s.TURN_SHARED_SECRET?.length||0)>=32&&coturnUrls(s).length>0);}
// Bounded per-isolate cache also coalesces repeated credential requests.
const cache=new Map<string,{expires:number; value:Promise<Relay[]>}>();
export async function relayServers(s: Settings, callId:string, memberId:string, createdAt:number, fetcher:typeof fetch=fetch):Promise<Relay[]> {
  const remaining=Math.floor((createdAt+3900000-Date.now())/1000);
  if(remaining<1||!relayReady(s))throw new Error('CALLS_UNAVAILABLE');
  if(cloudflareReady(s)) {
    const key=`${s.CLOUDFLARE_TURN_KEY_ID}:${callId}:${memberId}`;
    const found=cache.get(key);if(found&&found.expires>Date.now())return found.value;
    if(cache.size>=200)cache.delete(cache.keys().next().value!);
    const value=(async()=>{
      try {
        const response=await fetcher(`https://rtc.live.cloudflare.com/v1/turn/keys/${s.CLOUDFLARE_TURN_KEY_ID}/credentials/generate-ice-servers`,{method:'POST',headers:{Authorization:`Bearer ${s.CLOUDFLARE_TURN_API_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({ttl:Math.min(3900,remaining)}),signal:AbortSignal.timeout(8000)});
        if(!response.ok)throw new Error('CALLS_UNAVAILABLE');
        const data=await response.json() as {iceServers?: Array<{urls?:unknown;username?:unknown;credential?:unknown}>};
        const servers:Relay[]=[];
        for(const item of data.iceServers||[]) {
          if(typeof item.username!=='string'||typeof item.credential!=='string'||!item.username||!item.credential)continue;
          const input=Array.isArray(item.urls)?item.urls:[item.urls];
          const urls=input.filter((u):u is string=>typeof u==='string'&&/^turns?:turn\.cloudflare\.com:(3478|443|80)(\?transport=(udp|tcp))?$/.test(u));
          if(urls.length)servers.push({urls,username:item.username,credential:item.credential});
        }
        if(!servers.length)throw new Error('CALLS_UNAVAILABLE');
        return servers;
      } catch {cache.delete(key);throw new Error('CALLS_UNAVAILABLE');}
    })();
    cache.set(key,{expires:Date.now()+Math.min(300000,remaining*1000),value});return value;
  }
  const username=`${Math.floor(createdAt/1000)+3900}:${memberId}`;
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(s.TURN_SHARED_SECRET!),{name:'HMAC',hash:'SHA-1'},false,['sign']);
  const sig=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(username)));
  return [{urls:coturnUrls(s),username,credential:btoa(String.fromCharCode(...sig))}];
}
