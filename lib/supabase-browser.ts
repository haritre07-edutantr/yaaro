'use client';
import {createBrowserClient} from '@supabase/ssr';
export type PublicAuthConfig={configured:boolean;url?:string;key?:string;email:boolean;phone:boolean;google:boolean;notice?:string};
export async function browserAuth(){
  const response=await fetch('/api/auth-config',{cache:'no-store'});
  if(!response.ok)throw new Error('Sign-in is temporarily unavailable. Try again shortly.');
  const config=await response.json() as PublicAuthConfig;
  if(!config.configured||!config.url||!config.key)throw new Error(config.notice||'Sign-in is not configured yet.');
  return {client:createBrowserClient(config.url,config.key),config};
}
