import SocialApp from '@/components/social-app';
import {getYaaroUser} from '@/lib/identity';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{section?:string[]}>}){const p=await params;const u=await getYaaroUser();return <SocialApp section={p.section?.[0]||'home'} signedIn={!!u} displayName={u?.fullName||''}/>;}
