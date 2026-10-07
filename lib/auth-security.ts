export function validNativeAuthState(value:string|null|undefined):boolean{
  return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
export function safeReturnPath(value:string|null|undefined):string{
  if(!value||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u001f]/.test(value))return '/community';
  const url=new URL(value,'https://yaaro.invalid');
  if(url.origin!=='https://yaaro.invalid'||url.pathname.startsWith('/auth/'))return '/community';
  return url.pathname+url.search;
}
export function isSuperAdmin(user:{userId:string;email:string;emailVerified?:boolean}|null,configuredId:string|undefined){
  return !!user&&!!configuredId&&user.userId===configuredId&&user.emailVerified===true&&user.email.toLowerCase()==='haritre07@gmail.com';
}
