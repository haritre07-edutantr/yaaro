import Admin from '@/components/admin';
import {getYaaroUser} from '@/lib/identity';
export const dynamic='force-dynamic';
export default async function Page(){return <Admin demo signedIn={!!await getYaaroUser()}/>;}
