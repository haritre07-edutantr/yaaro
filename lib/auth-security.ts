export function safeReturnPath(value:string|null|undefined):string{
  if(!value||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u001f]/.test(value))return '/community';
  const url=new URL(value,'https://yaaro.invalid');
  if(url.origin!=='https://yaaro.invalid'||url.pathname.startsWith('/auth/'))return '/community';
  return url.pathname+url.search;
}
export function isSuperAdmin(user:{userId:string;email:string;emailVerified?:boolean}|null,configuredId:string|undefined){
  return !!user&&!!configuredId&&user.userId===configuredId&&user.emailVerified===true&&user.email.toLowerCase()==='haritre07@gmail.com';
}
