import Community from '@/components/community';
import {Brand} from '@/components/ui';
import {getYaaroUser,yaaroSignInPath} from '@/lib/identity';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getYaaroUser();if(!user)return <main className="access-page"><Brand/><h1>Your next hello starts here.</h1><p>Use secure Supabase sign-in to create your real YAARO profile, send connection requests, and talk with your Yaaros.</p><a className="button primary" href={yaaroSignInPath('/community')} target="_top">Continue to YAARO</a><a className="button outline" href="/app/home">Explore the fictional demo</a><p className="small-note">Available sign-in methods are shown on the login screen.</p></main>;return <Community/>;}
