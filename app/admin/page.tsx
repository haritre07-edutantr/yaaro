import Admin from '@/components/admin';
import {Brand} from '@/components/ui';
import {getYaaroUser,yaaroSignInPath} from '@/lib/identity';
import {adminAccess} from '@/lib/server';
export const dynamic='force-dynamic';
export default async function Page(){const u=await getYaaroUser();if(!u)return <main className="access-page"><Brand/><h1>Secure administration</h1><p>Sign in with the designated Super Admin’s verified Supabase identity.</p><a className="button primary" href={yaaroSignInPath('/admin')} target="_top">Sign in to YAARO</a><a href="/demo/admin" className="button outline">Explore fictional admin demo</a></main>;if(!adminAccess(u))return <main className="access-page"><Brand/><h1>Permission denied</h1><p>This verified identity does not have administrative access.</p><a className="button outline" href="/demo/admin">Explore the admin demo</a><a href="/app/home">Back to YAARO</a></main>;return <Admin demo={false} signedIn/>;}
