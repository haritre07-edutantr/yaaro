'use client';
import {useEffect,useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {nativeApp,enableNativeNotifications,disableNativeNotifications,NativeChat} from '@/lib/native-notifications';
export default function NativeNotificationSettings(){
 const [native,setNative]=useState(false),[enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{setNative(nativeApp());setEnabled(localStorage.getItem('yaaro-native-push')==='on');const saved=()=>{setEnabled(true);setBusy(false);setNotice('App notifications enabled.');},failed=()=>{setBusy(false);setNotice('Notification registration failed. Please try again.');};window.addEventListener('yaaro-push-enabled',saved);window.addEventListener('yaaro-push-error',failed);return()=>{window.removeEventListener('yaaro-push-enabled',saved);window.removeEventListener('yaaro-push-error',failed);};},[]);
 if(!native)return null;
 async function toggle(){setBusy(true);setNotice('');try{if(enabled){await disableNativeNotifications();setEnabled(false);}else{await enableNativeNotifications();setNotice('App notifications enabled.');}}catch(e){setNotice((e as Error).message);}finally{setBusy(false);}}
 return <div className="panel real-privacy"><h2>App notifications</h2><p>Receive message and incoming-call alerts while using another app.</p><button className="button primary" disabled={busy} onClick={()=>void toggle()}>{busy?'Please wait…':enabled?'Turn off app notifications':'Enable app notifications'}</button>{Capacitor.getPlatform()==='android'&&<button className="button outline" onClick={()=>void NativeChat.openBubbleSettings().catch(()=>setNotice('Open Android Settings → Notifications → Bubbles.'))}>Chat bubble settings</button>}{notice&&<p role="status">{notice}</p>}</div>;
}
