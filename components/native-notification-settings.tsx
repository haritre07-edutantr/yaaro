'use client';
import {useEffect,useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {App} from '@capacitor/app';
import {api} from '@/lib/services';
import {nativeApp,enableNativeNotifications,disableNativeNotifications,NativeChat,type AndroidNotificationStatus} from '@/lib/native-notifications';
export default function NativeNotificationSettings(){
 const [native,setNative]=useState(false),[enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[status,setStatus]=useState<AndroidNotificationStatus|null>(null);
 async function refresh(){
  try{const ready=await api('/api/native-devices');let permission=true;if(Capacitor.getPlatform()==='android'){try{const current=await NativeChat.getNotificationStatus();setStatus(current);permission=current.notificationsAllowed;}catch{setStatus(null);}}
   setEnabled(!!ready.registered&&permission&&localStorage.getItem('yaaro-native-push')==='on');
  }catch{setNotice('Unable to check this phone’s notification registration. Try again when connected.');}
 }
 useEffect(()=>{if(!nativeApp())return;setNative(true);void refresh();let stopped=false,remove:(()=>Promise<void>)|undefined;
  const saved=()=>{void refresh();setNotice('App notifications enabled. Test with a message or call from another account.');},failed=()=>setNotice('Notification registration failed. Tap Enable app notifications to retry.'),disabled=()=>setEnabled(false);
  window.addEventListener('yaaro-push-enabled',saved);window.addEventListener('yaaro-push-error',failed);window.addEventListener('yaaro-push-disabled',disabled);
  void App.addListener('appStateChange',s=>{if(s.isActive)void refresh();}).then(handle=>{if(stopped)void handle.remove();else remove=()=>handle.remove();});
  return()=>{stopped=true;void remove?.();window.removeEventListener('yaaro-push-enabled',saved);window.removeEventListener('yaaro-push-error',failed);window.removeEventListener('yaaro-push-disabled',disabled);};
 },[]);
 if(!native)return null;
 async function toggle(){setBusy(true);setNotice('');try{if(enabled){await disableNativeNotifications();setEnabled(false);}else{await enableNativeNotifications();await refresh();setNotice('App notifications enabled.');}}catch(e){setNotice((e as Error).message);}finally{setBusy(false);}}
 const android=Capacitor.getPlatform()==='android';
 return <div className="panel real-privacy"><h2>Messages & call alerts</h2><p>Receive message and incoming-call alerts while using another app.</p><div className="setting-row"><span>This phone</span><b>{enabled?'Registered for alerts':'Not enabled'}</b></div>{status&&<><div className="setting-row"><span>Android notifications</span><b>{status.notificationsAllowed?'Allowed':'Blocked'}</b></div><div className="setting-row"><span>Chat bubbles</span><b>{!status.bubblesSupported?'Not supported':status.bubblePreference==='all'?'All conversations':status.bubblePreference==='selected'?'Selected conversations':'Not allowed'}</b></div>{(!status.callsAllowed||!status.messagesAllowed)&&<p role="status">Android has disabled {status.callsAllowed?'message':status.messagesAllowed?'call':'message and call'} alerts. Enable those categories in Notification settings.</p>}</>}<div className="native-notification-actions"><button className="button primary" disabled={busy} onClick={()=>void toggle()}>{busy?'Please wait…':enabled?'Turn off app notifications':'Enable app notifications'}</button>{android&&<><button className="button outline" onClick={()=>void NativeChat.openNotificationSettings().catch(()=>setNotice('Open Android Settings → Apps → YAARO → Notifications.'))}>Notification settings</button><button className="button outline" onClick={()=>void NativeChat.openBubbleSettings().catch(()=>setNotice('Open Android Settings → Apps → YAARO → Notifications → Bubbles.'))}>Chat bubble settings</button></>}</div>{android&&<p className="small-note">Enable app notifications, then open Chat bubble settings and choose All conversations can bubble. Locking your phone shows notifications instead of floating bubbles.</p>}{notice&&<p role="status">{notice}</p>}</div>;
}
