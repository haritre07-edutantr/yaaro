import {Brand} from '@/components/ui';
import PasswordRecovery from '@/components/password-recovery';
export default async function Page({searchParams}:{searchParams:Promise<{token_hash?:string}>}){const params=await searchParams;return <main className="password-recovery-page"><Brand/><PasswordRecovery token={typeof params.token_hash==='string'?params.token_hash:''}/></main>;}
