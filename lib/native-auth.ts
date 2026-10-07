'use client';
import {Capacitor} from '@capacitor/core';
import {App} from '@capacitor/app';
import {safeReturnPath,validNativeAuthState,nativeAuthScheme} from './auth-security';
const KEY='yaaro-native-auth';
export async function nativeAuthRedirect(next:string){
  const callback=new URL('/auth/callback',location.origin);
  callback.searchParams.set('next',safeReturnPath(next));
  if(Capacitor.getPlatform()==='android'){
    const info=await App.getInfo();
    const scheme=nativeAuthScheme(info.id);
    if(!scheme)throw Error('This YAARO app identity is unsupported. Install the current release.');
    callback.searchParams.set('native_app',scheme);
    const state=crypto.randomUUID();
    localStorage.setItem(KEY,JSON.stringify({state,next:safeReturnPath(next),created:Date.now()}));
    callback.searchParams.set('native_state',state);
  }
  return callback.href;
}
export function consumeNativeAuth(state:string|null){
  if(Capacitor.getPlatform()!=='android')throw Error('Open this sign-in in the YAARO app.');
  let pending;try{pending=JSON.parse(localStorage.getItem(KEY)||'null');}catch{pending=null;}
  if(!validNativeAuthState(state)||!pending||pending.state!==state||typeof pending.created!=='number'||Date.now()-pending.created>900000||pending.created>Date.now())throw Error('This sign-in expired. Start a new sign-in in YAARO.');
  localStorage.removeItem(KEY);
  return safeReturnPath(pending.next);
}
