'use client';
import {useEffect,useState} from 'react';
import {MessageCircle,ShieldCheck,Mail,Phone} from 'lucide-react';
import {Brand} from './ui';
import {browserAuth,type PublicAuthConfig} from '@/lib/supabase-browser';
import {safeReturnPath} from '@/lib/auth-security';
import {nativeAuthRedirect} from '@/lib/native-auth';

// Version 1 uses email and Google; retain SMS OTP for a later release.
const PHONE_LOGIN_ENABLED=false;

export default function Auth({mode='signup'}:{mode?:string}){
  const [method,setMethod]=useState('Email'),[address,setAddress]=useState(''),[code,setCode]=useState('');
  const [challenge,setChallenge]=useState(false),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  const [config,setConfig]=useState<PublicAuthConfig|null>(null),[consent,setConsent]=useState(false);
  const signup=mode==='signup';
  useEffect(()=>{let alive=true;fetch('/api/auth-config',{cache:'no-store'}).then(r=>r.json()).then(c=>{if(alive)setConfig(c as PublicAuthConfig);}).catch(()=>{if(alive)setNotice('Unable to check sign-in. Please reload or try again later.');});if(new URLSearchParams(location.search).get('error'))setNotice('That sign-in link expired or could not be verified. Please request a new one.');return()=>{alive=false;};},[]);
  const next=()=>safeReturnPath(new URLSearchParams(location.search).get('next'));
  async function submit(e:React.FormEvent){
    e.preventDefault();if(busy)return;setBusy(true);setNotice('');
    try{
      const {client,config:current}=await browserAuth();
      if(method==='Phone'){
        if(!current.phone)throw new Error('Phone verification needs a configured SMS provider.');
        if(!/^\+[1-9]\d{7,14}$/.test(address.trim()))throw new Error('Enter your phone number with its country code, for example +91 followed by your number.');
        if(challenge){const {error}=await client.auth.verifyOtp({phone:address.trim(),token:code.trim(),type:'sms'});if(error)throw error;location.assign(next());return;}
        const {error}=await client.auth.signInWithOtp({phone:address.trim()});if(error)throw error;
        setChallenge(true);setNotice('Code requested. Enter the code delivered to your phone.');
      }else{
        if(!current.email)throw new Error('Email delivery is still being configured. Please try again when it is available.');
        const {error}=await client.auth.signInWithOtp({email:address.trim(),options:{emailRedirectTo:await nativeAuthRedirect(next())}});
        if(error)throw error;setNotice('Sign-in link requested. Check your inbox and spam folder. Delivery can take a moment.');
      }
    }catch(e){setNotice(e instanceof Error?e.message:'Unable to sign in. Please try again.');}finally{setBusy(false);}
  }
  async function google(){
    setBusy(true);setNotice('');try{const {client,config:current}=await browserAuth();if(!current.google)throw new Error('Google sign-in is still being configured.');const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:await nativeAuthRedirect(next())}});if(error)throw error;}catch(e){setNotice(e instanceof Error?e.message:'Unable to start Google sign-in.');setBusy(false);}
  }
  const available=method==='Email'?config?.email:config?.phone;
  return <div className="auth-layout"><div className="auth-story"><Brand/><div className="auth-story-copy"><div className="eyebrow">YOUR NEXT HELLO STARTS HERE</div><h1>Your vibe.<br/>Your people.<br/><span>Your YAARO.</span></h1><p>Good conversations have a way of turning strangers into friends.</p><div className="auth-quote"><MessageCircle size={28}/><p>“Same wavelength. Different stories.”</p><span>A space for genuine connection.</span></div></div><span className="auth-story-footer">MEET. TALK. CONNECT.</span></div><main className="auth-form-wrap"><a className="back-link" href="/">Back to YAARO</a><div className="auth-form"><span className="auth-icon"><ShieldCheck size={27}/></span><h1>{challenge?'Your hello is one code away.':signup?'Find your people.':'Welcome back, Yaaro.'}</h1><p>{challenge?'Enter the verification code from your phone.':'Sign in securely. Your friendships start here.'}</p>{config?.notice&&<div className="form-notice" role="status">{config.notice}</div>}{PHONE_LOGIN_ENABLED&&<div className="auth-tabs">{['Email','Phone'].map(x=><button type="button" className={method===x?'selected':''} disabled={busy} onClick={()=>{setMethod(x);setChallenge(false);setAddress('');setCode('');setNotice('');}} key={x}>{x==='Email'?<Mail size={16}/>:<Phone size={16}/>} {x}</button>)}</div>}<form onSubmit={submit}><label>{method==='Email'?'Email address':'Phone number'}<input required value={address} disabled={busy||challenge} onChange={e=>setAddress(e.target.value)} type={method==='Email'?'email':'tel'} placeholder={method==='Email'?'you@example.com':'+91 Your phone number'} autoComplete={method==='Email'?'email':'tel'}/></label>{challenge&&<label>Verification code<input required value={code} onChange={e=>setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6}/></label>}{signup&&<label className="checkbox"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required/> I’m 18 or older and agree to the <a href="/policy/terms">Terms</a>.</label>}<button className="button primary wide" disabled={busy||!available||(signup&&!consent)}>{busy?'Please wait…':!available?'Coming soon':challenge?'Verify & connect':method==='Email'?'Send secure sign-in link':'Send verification code'}</button></form>{notice&&<div className="form-notice" role="status">{notice}</div>}{challenge&&<button className="button outline wide" onClick={()=>{setChallenge(false);setCode('');}}>Use another phone number</button>}<button className="button outline wide google-button" disabled={busy||!config?.google||(signup&&!consent)} onClick={()=>void google()}><b>G</b> Continue with Google{config&&!config.google?' · coming soon':''}</button><a className="demo-link" href="/app/home">Explore the fictional demo</a><div className="auth-links">{signup?<>Already have an account? <a href="/auth/login">Log In</a></>:<>New around here? <a href="/auth/signup">Join YAARO</a></>}</div><p className="small-note"><ShieldCheck size={14}/> Secure verification powered by Supabase.<br/>{PHONE_LOGIN_ENABLED?'No passwords are needed for email-link or phone-code sign-in.':'Sign in with a secure email link or your Google account.'}</p></div></main></div>;
}
