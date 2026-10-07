'use client';
import {useEffect,useRef,useState} from 'react';
import {consumeNativeAuth} from '@/lib/native-auth';
import {browserAuth} from '@/lib/supabase-browser';
export default function NativeReturn(){
  const started=useRef(false),[notice,setNotice]=useState('Finishing your secure sign-in…');
  useEffect(()=>{if(started.current)return;started.current=true;void(async()=>{
    try{
      const query=new URLSearchParams(location.search),code=query.get('code');
      const next=consumeNativeAuth(query.get('state'));
      history.replaceState(null,'','/auth/native-return');
      if(!code||code.length>=4096)throw Error('Sign-in was cancelled. Please try again.');
      const {client}=await browserAuth();const {error}=await client.auth.exchangeCodeForSession(code);
      if(error)throw Error('Unable to verify this sign-in. Please start again in YAARO.');
      location.replace(next);
    }catch(e){setNotice(e instanceof Error?e.message:'Unable to finish sign-in.');}
  })();},[]);
  return <main className="auth-form-wrap"><div className="auth-form"><h1>Welcome back to YAARO</h1><p role="status">{notice}</p><a className="button outline wide" href="/auth/login">Back to sign in</a></div></main>;
}
