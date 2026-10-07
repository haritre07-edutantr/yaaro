import {cookies} from 'next/headers';
import {db,identity} from '@/lib/server';
import {NativeDevices} from '@/lib/native-push-service';
import {supabaseServer} from '@/lib/supabase-server';
export async function POST(request:Request){
  const url=new URL(request.url);if(request.headers.get('origin')!==url.origin)return new Response('Forbidden',{status:403});
  const user=await identity(),jar=await cookies(),device=jar.get('yaaro_native_device')?.value;if(user&&device)await new NativeDevices(db(),user.userId).removeDevice(device);jar.delete('yaaro_native_device');
  const supabase=await supabaseServer();const {error}=await supabase.auth.signOut({scope:'local'});
  if(error)return Response.json({error:'Unable to sign out. Please try again.'},{status:503});
  return Response.redirect(url.origin+'/',303);
}
