import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {env} from 'cloudflare:workers';
export function authConfig(){
  const url=env.SUPABASE_URL,key=env.SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key||!key.startsWith('sb_publishable_')) return null;
  return {url,key};
}
export async function supabaseServer(){
  const config=authConfig();if(!config)throw new Error('AUTH_UNAVAILABLE');
  const jar=await cookies();
  return createServerClient(config.url,config.key,{cookies:{
    getAll:()=>jar.getAll(),
    setAll(values){try{for(const {name,value,options} of values)jar.set(name,value,options);}catch{/* Middleware refreshes cookies for Server Components. */}}
  }});
}
