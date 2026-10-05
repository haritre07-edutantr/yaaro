export async function enableCallNotifications(){
 if(!('Notification' in window)||!('serviceWorker' in navigator))return false;
 // Called only from the notification-settings button, never automatically.
 const permission=await Notification.requestPermission();if(permission!=='granted')return false;
 await navigator.serviceWorker.register('/call-notifications-sw.js',{scope:'/'});
 await navigator.serviceWorker.ready;return true;
}
export async function showCallNotification(id:string,name:string,mode:'voice'|'video'){
 if(!('Notification' in window)||Notification.permission!=='granted'||!('serviceWorker' in navigator))return;
 const registration=await navigator.serviceWorker.getRegistration('/');if(!registration?.active)return;
 await registration.showNotification(`Incoming ${mode} call`,{body:`${name} is calling on YAARO. Tap to return and answer.`,tag:`yaaro-call-${id}`,icon:'/favicon.svg'});
 return async()=>{for(const notification of await registration.getNotifications({tag:`yaaro-call-${id}`}))notification.close();};
}
