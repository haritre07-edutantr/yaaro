import {Brand} from '@/components/ui';
import PasswordRecovery from '@/components/password-recovery';
import {passwordReturn} from '@/lib/password-return';
import {env} from 'cloudflare:workers';
export default async function Page({searchParams}:{searchParams:Promise<{token_hash?:string;return_to?:string;redirect_to?:string}>}){const params=await searchParams;const returnTo=passwordReturn(typeof params.return_to==='string'?params.return_to:undefined,typeof params.redirect_to==='string'?params.redirect_to:undefined,env.PUBLIC_APP_ORIGIN||'https://autumn-lake-80feyaaro.haritre07.workers.dev');return <main className="password-recovery-page"><Brand/><PasswordRecovery token={typeof params.token_hash==='string'?params.token_hash:''} returnTo={returnTo}/></main>;}
