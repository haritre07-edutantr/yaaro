import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
const output=new URL('../.sites-runtime/auth-tests/',import.meta.url);mkdirSync(output,{recursive:true});
writeFileSync(new URL('security.mjs',output),ts.transpileModule(readFileSync(new URL('../lib/auth-security.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {safeReturnPath,isSuperAdmin,validNativeAuthState,nativeAuthScheme}=await import(new URL('security.mjs',output));
let checks=0;
for(const malicious of ['https://attacker.example','//attacker.example','/\\attacker.example','/auth/callback','/\n/attacker.example','/auth/signout',null,'']){assert.equal(safeReturnPath(malicious),'/community');checks++;}
assert.equal(safeReturnPath('/admin?tab=reports'),'/admin?tab=reports');checks++;
const user={userId:'verified-user',email:'haritre07@gmail.com',emailVerified:true};
for(const [candidate,id] of [[null,'verified-user'],[user,undefined],[user,'other-user'],[{...user,emailVerified:false},'verified-user'],[{...user,email:'someone@example.com'},'verified-user'],[{...user,userId:'other-user'},'verified-user']]){assert.equal(isSuperAdmin(candidate,id),false);checks++;}
assert.equal(isSuperAdmin(user,'verified-user'),true);checks++;
const nonce='11111111-1111-4111-8111-111111111111';
assert.equal(validNativeAuthState(nonce),true);checks++;
for(const bad of [null,'',nonce+'<script>',nonce.replace('-4111-','-1111-')]){assert.equal(validNativeAuthState(bad),false);checks++;}
const nativeSource=readFileSync(new URL('../lib/native-auth.ts',import.meta.url),'utf8').replace("import {Capacitor} from '@capacitor/core';","const Capacitor={getPlatform:()=>globalThis.testPlatform};").replace("import {App} from '@capacitor/app';","const App={getInfo:async()=>({id:globalThis.testAppId})};").replace("from './auth-security'","from './security.mjs'");
writeFileSync(new URL('native.mjs',output),ts.transpileModule(nativeSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {nativeAuthRedirect,consumeNativeAuth}=await import(new URL('native.mjs',output));
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
globalThis.location={origin:'https://yaaro.example'};globalThis.testPlatform='android';globalThis.testAppId='com.yaaro.app';
const redirect=new URL(await nativeAuthRedirect('/community?tab=chats'));const state=redirect.searchParams.get('native_state');
assert.equal(redirect.pathname,'/auth/callback');assert.ok(validNativeAuthState(state));checks+=2;
assert.throws(()=>consumeNativeAuth(nonce),/expired/);checks++;
assert.equal(consumeNativeAuth(state),'/community?tab=chats');checks++;
assert.throws(()=>consumeNativeAuth(state),/expired/);checks++;
storage.set('yaaro-native-auth',JSON.stringify({state:nonce,next:'https://attacker.example',created:Date.now()}));
assert.equal(consumeNativeAuth(nonce),'/community');checks++;
for(const created of [Date.now()-900001,Date.now()+60000]){storage.set('yaaro-native-auth',JSON.stringify({state:nonce,next:'/community',created}));assert.throws(()=>consumeNativeAuth(nonce),/expired/);checks++;}
globalThis.testPlatform='web';assert.equal(new URL(await nativeAuthRedirect('/community')).searchParams.has('native_state'),false);assert.throws(()=>consumeNativeAuth(nonce),/YAARO app/);checks+=2;
globalThis.testPlatform='android';globalThis.testAppId='com.edutantr.yaaro';
assert.equal(new URL(await nativeAuthRedirect('/community')).searchParams.get('native_app'),'com.edutantr.yaaro');checks++;
globalThis.testAppId='attacker.app';await assert.rejects(()=>nativeAuthRedirect('/community'),/unsupported/);checks++;
for(const value of ['attacker.app','com.edutantr.yaaro://evil','', 'javascript:']){assert.equal(nativeAuthScheme(value),null);checks++;}
const callbackSource=readFileSync(new URL('../app/auth/callback/route.ts',import.meta.url),'utf8').replace("import {supabaseServer} from '@/lib/supabase-server';","const supabaseServer=async()=>({auth:{exchangeCodeForSession:async()=>{globalThis.exchanges++;return {error:null};}}});").replace("from '@/lib/auth-security'","from './security.mjs'").replace("import {env} from 'cloudflare:workers';","const env={PUBLIC_APP_ORIGIN:'https://yaaro.example'};");
writeFileSync(new URL('callback.mjs',output),ts.transpileModule(callbackSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {GET}=await import(new URL('callback.mjs',output));globalThis.exchanges=0;
const relay=await GET(new Request(`https://yaaro.example/auth/callback?native_state=${nonce}&code=test-code`));
assert.equal(relay.status,200);assert.equal(relay.headers.get('Cache-Control'),'no-store');assert.match(await relay.text(),/com\.yaaro\.app:\/\/auth\/callback/);assert.equal(globalThis.exchanges,0);checks+=4;
assert.equal((await GET(new Request('https://yaaro.example/auth/callback?native_state=bad&code=test-code'))).status,400);checks++;
assert.equal((await GET(new Request(`https://attacker.example/auth/callback?native_state=${nonce}&code=test-code`))).status,503);checks++;
for(const app of ['com.edutantr.yaaro','com.yaaro.app']){const response=await GET(new Request(`https://yaaro.example/auth/callback?native_state=${nonce}&native_app=${app}&code=test-code`));assert.equal(response.status,200);assert.ok((await response.text()).includes(app+'://auth/callback'));checks+=2;}
for(const app of ['attacker.app','javascript:','com.edutantr.yaaro%22%3E']){assert.equal((await GET(new Request(`https://yaaro.example/auth/callback?native_state=${nonce}&native_app=${app}&code=test-code`))).status,400);checks++;}
assert.equal(globalThis.exchanges,0,'Never exchange native PKCE in the external browser');checks++;
const web=await GET(new Request('https://yaaro.example/auth/callback?code=test-code&next=https://attacker.example'));
assert.equal(web.status,303);assert.equal(web.headers.get('Location'),'https://yaaro.example/community');assert.equal(globalThis.exchanges,1);checks+=3;
console.log(`${checks} authentication security checks passed`);
