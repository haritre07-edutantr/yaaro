export type PushEnv={FCM_SERVICE_ACCOUNT?:string;APNS_KEY_ID?:string;APNS_TEAM_ID?:string;APNS_PRIVATE_KEY?:string;APNS_BUNDLE_ID?:string};
export type PushData={kind:'message'|'call';eventId:string;conversation:string;sender:string;name:string;mode?:string;account:string};
type PushStage='configuration'|'signing'|'oauth'|'fcm';
const providerCodes=new Set(['invalid_grant','invalid_client','unauthorized_client','access_denied','INVALID_ARGUMENT','UNREGISTERED','SENDER_ID_MISMATCH','QUOTA_EXCEEDED','UNAVAILABLE','INTERNAL','THIRD_PARTY_AUTH_ERROR','PERMISSION_DENIED','UNAUTHENTICATED','SERVICE_DISABLED','API_DISABLED']);
const safeProviderCode=(value:unknown)=>typeof value==='string'&&providerCodes.has(value)?value:'PROVIDER_REJECTED';
export class PushDeliveryError extends Error{
 constructor(public stage:PushStage,public code:string,public httpStatus?:number){super('PUSH_DELIVERY_FAILED');}
}
// Never log error messages or provider bodies: they may contain keys, tokens or user data.
export function pushFailureDetails(error:unknown){
 if(error instanceof PushDeliveryError)return {stage:error.stage,code:error.code,...(error.httpStatus?{httpStatus:error.httpStatus}:{})};
 return {stage:'dispatch',code:error instanceof Error&&['TimeoutError','AbortError'].includes(error.name)?'NETWORK_TIMEOUT':'UNEXPECTED_ERROR'};
}
const encode=(v:Uint8Array|string)=>btoa(typeof v==='string'?v:String.fromCharCode(...v)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
async function jwt(header:object,claims:object,pem:string,ec=false){const bytes=Uint8Array.from(atob(pem.replace(/-----[^-]+-----|\s/g,'')),c=>c.charCodeAt(0));const algorithm=ec?{name:'ECDSA',namedCurve:'P-256'}:{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'};const key=await crypto.subtle.importKey('pkcs8',bytes,algorithm,false,['sign']);const body=encode(JSON.stringify(header))+'.'+encode(JSON.stringify(claims));const signature=await crypto.subtle.sign(ec?{name:'ECDSA',hash:'SHA-256'}:algorithm,key,new TextEncoder().encode(body));return body+'.'+encode(new Uint8Array(signature));}
export function pushReady(env:PushEnv,platform:string){return platform==='android'?!!env.FCM_SERVICE_ACCOUNT:!!(env.APNS_KEY_ID&&env.APNS_TEAM_ID&&env.APNS_PRIVATE_KEY&&env.APNS_BUNDLE_ID);}
let oauth:{source:string;expires:number;value:Promise<{token:string;project:string}>}|undefined;
async function fcmAuth(source:string){
 if(oauth?.source===source&&oauth.expires>Date.now())return oauth.value;
 const value=(async()=>{
  let s:{project_id:string;client_email:string;private_key:string};
  try{s=JSON.parse(source);if(!s||typeof s.project_id!=='string'||!s.project_id||typeof s.client_email!=='string'||!s.client_email||typeof s.private_key!=='string'||!s.private_key)throw Error();}
  catch{throw new PushDeliveryError('configuration','INVALID_SERVICE_ACCOUNT_JSON');}
  const now=Math.floor(Date.now()/1000);let assertion:string;
  try{assertion=await jwt({alg:'RS256',typ:'JWT'},{iss:s.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600},s.private_key);}
  catch{throw new PushDeliveryError('signing','INVALID_PRIVATE_KEY');}
  let response:Response;
  try{response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(7000)});}
  catch{throw new PushDeliveryError('oauth','NETWORK_FAILURE');}
  const data=await response.json().catch(()=>({})) as {access_token?:string;error?:string};
  if(!response.ok||!data.access_token)throw new PushDeliveryError('oauth',safeProviderCode(data.error),response.status);
  return {token:data.access_token,project:s.project_id};
 })();
 oauth={source,expires:Date.now()+3000000,value};try{return await value;}catch(e){oauth=undefined;throw e;}
}
// Push carries only routing and a generic alert, never message text or media.
export async function deliverPush(env:PushEnv,device:{token:string;platform:string;environment:string},data:PushData):Promise<'sent'|'invalid'|'retry'>{
 const title=data.kind==='call'?`Incoming ${data.mode||'voice'} call`:'YAARO';const body=data.kind==='call'?`${data.name} is calling. Open YAARO to answer.`:`${data.name} sent you a message.`;
 if(device.platform==='android'){
  const auth=await fcmAuth(env.FCM_SERVICE_ACCOUNT!);let response:Response;
  try{response=await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(auth.project)}/messages:send`,{method:'POST',headers:{Authorization:'Bearer '+auth.token,'Content-Type':'application/json'},body:JSON.stringify({message:{token:device.token,data:{...data,title,body},android:{priority:'HIGH',ttl:data.kind==='call'?'90s':'3600s',collapse_key:data.kind==='call'?data.eventId:data.conversation}}}),signal:AbortSignal.timeout(7000)});}
  catch{throw new PushDeliveryError('fcm','NETWORK_FAILURE');}
  if(response.ok){console.info('Native push accepted by provider',{platform:'android',kind:data.kind});return 'sent';}
  const result=await response.json().catch(()=>({})) as {error?:{status?:string;details?:{errorCode?:string;reason?:string}[]}};
  const details=result.error?.details||[];
  const code=safeProviderCode(details.find(d=>d.errorCode)?.errorCode||details.find(d=>d.reason)?.reason||result.error?.status);
  console.warn('Native push provider rejected delivery',{platform:'android',kind:data.kind,...pushFailureDetails(new PushDeliveryError('fcm',code,response.status))});
  return code==='UNREGISTERED'?'invalid':'retry';
 }
 const now=Math.floor(Date.now()/1000),authorization=await jwt({alg:'ES256',kid:env.APNS_KEY_ID},{iss:env.APNS_TEAM_ID,iat:now},env.APNS_PRIVATE_KEY!,true);
 const response=await fetch(`https://${device.environment==='sandbox'?'api.sandbox.push.apple.com':'api.push.apple.com'}/3/device/${device.token}`,{method:'POST',headers:{authorization:'bearer '+authorization,'apns-topic':env.APNS_BUNDLE_ID!,'apns-push-type':'alert','apns-priority':'10','apns-expiration':String(now+(data.kind==='call'?90:3600)),'Content-Type':'application/json'},body:JSON.stringify({aps:{alert:{title,body},sound:'default'},...data}),signal:AbortSignal.timeout(7000)});if(response.ok)return 'sent';const result=await response.json() as {reason?:string};return ['BadDeviceToken','Unregistered','DeviceTokenNotForTopic'].includes(result.reason||'')?'invalid':'retry';
}
