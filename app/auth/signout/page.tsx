import {Brand} from '@/components/ui';
export const dynamic='force-dynamic';
export default function Page(){return <main className="access-page"><Brand/><h1>See you soon, Yaaro.</h1><form action="/api/signout" method="post"><button className="button primary">Sign out of this device</button></form><a href="/community">Stay on YAARO</a></main>;}
