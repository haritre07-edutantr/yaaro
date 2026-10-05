import Onboarding from '@/components/onboarding';
import {getYaaroUser} from '@/lib/identity';
export const dynamic='force-dynamic';
export default async function Page(){return <Onboarding signedIn={!!await getYaaroUser()}/>;}
