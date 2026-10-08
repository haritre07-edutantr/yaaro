export type PasswordReturn='android'|'web';
// Navigation hint only: never used to authorize a reset or transfer a session.
export function passwordReturn(value:string|undefined,redirect:string|undefined,origin:string):PasswordReturn{
 if(value==='android')return 'android';
 if(value==='web')return 'web';
 try{const url=new URL(redirect||'');if(url.origin===origin&&url.pathname==='/auth/recovery'&&url.searchParams.get('return_to')==='android')return 'android';}catch{}
 return 'web';
}
export function passwordSignInLink(target:PasswordReturn,androidDevice:boolean,origin:string){
 if(target!=='android'||!androidDevice)return '/auth/login';
 const fallback=encodeURIComponent(new URL('/auth/login',origin).href);
 return `intent://auth/login#Intent;scheme=com.edutantr.yaaro;package=com.edutantr.yaaro;S.browser_fallback_url=${fallback};end`;
}
