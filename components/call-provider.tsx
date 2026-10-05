'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import type {Member} from '@/lib/community-model';
import CallManager,{type CallIntent} from './call-manager';
import {enableCallNotifications} from '@/lib/call-notifications';
type Controller={setMember:(member:Member|null)=>void;startCall:(intent:CallIntent)=>void;notificationsEnabled:boolean;toggleNotifications:()=>Promise<string>};
const Context=createContext<Controller|null>(null);
export function useCalls(){const value=useContext(Context);if(!value)throw new Error('Call provider unavailable');return value;}
export default function CallProvider({children}:{children:ReactNode}){
 const [me,setMember]=useState<Member|null>(null),[intent,setIntent]=useState<CallIntent|null>(null),[notificationsEnabled,setNotificationsEnabled]=useState(false);
 const path=usePathname();
 useEffect(()=>{setNotificationsEnabled(localStorage.getItem('yaaro-call-notifications')==='on');},[]);
 useEffect(()=>{const controller=new AbortController();void fetch('/api/calls?self=1',{signal:controller.signal,cache:'no-store'}).then(async response=>{if(response.status===401||response.status===403){setMember(null);setIntent(null);return;}if(response.ok){const data=await response.json() as {me:Member};if(!controller.signal.aborted)setMember(data.me);}}).catch(()=>{});return()=>controller.abort();},[path]);
 async function toggleNotifications(){if(notificationsEnabled){localStorage.removeItem('yaaro-call-notifications');setNotificationsEnabled(false);return 'Browser call notifications turned off. Incoming calls still appear inside YAARO.';}try{if(!await enableCallNotifications())return 'Notifications were not enabled. Incoming calls still appear inside YAARO.';localStorage.setItem('yaaro-call-notifications','on');setNotificationsEnabled(true);return 'Call notifications enabled while YAARO is open. Tap a notification to return and answer.';}catch{return 'This browser could not enable notifications. Incoming calls still appear inside YAARO.';}}
 return <Context.Provider value={{setMember,startCall:setIntent,notificationsEnabled,toggleNotifications}}>{children}{me&&<CallManager key={me.id} me={me} intent={intent} onClear={()=>setIntent(null)} notificationsEnabled={notificationsEnabled}/>}</Context.Provider>;
}
