import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
const out=new URL('../.sites-runtime/password-tests/',import.meta.url);mkdirSync(out,{recursive:true});
writeFileSync(new URL('security.mjs',out),ts.transpileModule(readFileSync(new URL('../lib/password-security.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {passwordFields,RECOVERY_COOKIE}=await import(new URL('security.mjs',out));
for(const body of [{password:'short',confirmation:'short'},{password:'a'.repeat(129),confirmation:'a'.repeat(129)},{password:'new-password-123',confirmation:'different'},{}])assert.throws(()=>passwordFields(body),/PASSWORD_INVALID/);
assert.equal(passwordFields({password:'new-password-123',confirmation:'new-password-123'}),'new-password-123');
const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');for(const f of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
const database={prepare:sql=>({bind:(...v)=>({run:async()=>({meta:{changes:Number(sqlite.prepare(sql).run(...v).changes)}}),first:async()=>sqlite.prepare(sql).get(...v)||null})})};
let source=readFileSync(new URL('../app/api/password/route.ts',import.meta.url),'utf8');
source=source.replace("import {createClient} from '@supabase/supabase-js';","const createClient=()=>globalThis.pw.isolated;")
.replace("import {cookies} from 'next/headers';","const cookies=async()=>globalThis.pw.jar;")
.replace("import {authConfig,supabaseServer} from '@/lib/supabase-server';","const authConfig=()=>({url:'https://auth.example',key:'public'});const supabaseServer=async()=>globalThis.pw.client;")
.replace("import {db,payload,failure,identity} from '@/lib/server';","const db=()=>globalThis.pw.database;const payload=r=>r.json();const identity=async()=>globalThis.pw.user;const failure=e=>Response.json({error:e.message},{status:e.message==='UNAUTHORIZED'?401:e.message==='RATE'?429:403});")
.replace("from '@/lib/password-security'","from './security.mjs'");
writeFileSync(new URL('route.mjs',out),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {POST,GET}=await import(new URL('route.mjs',out));let changes=0,mail=0,verifiedCalls=0,revocations=0,lastRedirect='';
const cookies=new Map();
const state={database,user:{userId:'one',email:'registered@example.com'},jar:{get:k=>cookies.has(k)?{value:cookies.get(k)}:undefined,set:(k,v,opts)=>{assert.ok(opts.httpOnly&&opts.secure&&opts.sameSite==='strict');cookies.set(k,v);},delete:k=>cookies.delete(k)},isolated:{auth:{resetPasswordForEmail:async(email,options)=>{lastRedirect=options.redirectTo;mail++;return {error:null};},signInWithPassword:async ({email,password})=>({error:password==='old-password'?null:{code:'invalid'},data:{user:{id:email==='registered@example.com'?'one':'other'}}}),signOut:async()=>({error:null})}},client:{auth:{verifyOtp:async ({type,token_hash})=>{verifiedCalls++;assert.equal(type,'recovery');return token_hash==='a'.repeat(64)?{data:{user:{id:'one'},session:{}},error:null}:{data:{},error:{code:'expired'}};},updateUser:async()=>{changes++;return {error:null};},signOut:async()=>{revocations++;return {error:null};}}}};
globalThis.pw=state;
const request=(body,origin='https://yaaro.example')=>new Request('https://yaaro.example/api/password',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
const change={action:'change',oldPassword:'wrong',password:'new-password-123',confirmation:'new-password-123'};
assert.equal((await POST(request(change,'https://evil.example'))).status,403);assert.equal(changes,0);
assert.equal((await POST(request(change))).status,400);assert.equal(changes,0,'Wrong old password cannot update');
state.user.email='other@example.com';assert.equal((await POST(request({...change,oldPassword:'old-password'}))).status,400);assert.equal(changes,0,'Reauthentication cannot switch account');state.user.email='registered@example.com';
assert.equal((await POST(request({...change,oldPassword:'old-password'}))).status,200);assert.equal(changes,1);assert.equal(revocations,1);
const reset={action:'reset',password:'new-password-123',confirmation:'new-password-123'};
assert.equal((await POST(request(reset))).status,400);assert.equal(changes,1,'Signed-in user without emailed recovery grant cannot reset');
sqlite.exec('DELETE FROM product_events');
assert.equal((await POST(request({action:'request',email:'registered@example.com'}))).status,200);assert.equal(mail,1);assert.equal(lastRedirect,'https://yaaro.example/auth/recovery?return_to=web');
assert.equal((await POST(request({action:'request',email:'android@example.com',returnTo:'android'}))).status,200);assert.equal(lastRedirect,'https://yaaro.example/auth/recovery?return_to=android');
assert.equal((await POST(request({action:'request',email:'evil@example.com',returnTo:'https://evil.example'}))).status,200);assert.equal(lastRedirect,'https://yaaro.example/auth/recovery?return_to=web');
assert.equal((await POST(request({action:'verify',token:'b'.repeat(64)}))).status,400);assert.equal(cookies.size,0);
assert.equal((await POST(request({action:'verify',token:'a'.repeat(64)}))).status,200);assert.ok(cookies.has(RECOVERY_COOKIE));assert.equal(verifiedCalls,2);assert.equal((await (await GET()).json()).recovery,true);
state.user.userId='other';assert.equal((await (await GET()).json()).recovery,false);assert.equal((await POST(request(reset))).status,400);assert.equal(changes,1);state.user.userId='one';
sqlite.exec('DELETE FROM product_events');assert.equal((await POST(request({...reset,confirmation:'mismatch'}))).status,400);assert.equal(changes,1);
assert.equal((await POST(request(reset))).status,200);assert.equal(changes,2);assert.equal(cookies.size,0);
assert.equal((await POST(request(reset))).status,400);assert.equal(changes,2,'Recovery grant is single use');
assert.equal((await POST(request({action:'verify',token:'a'.repeat(64)}))).status,200);sqlite.exec('UPDATE password_recoveries SET expires_at=0');assert.equal((await POST(request(reset))).status,400);assert.equal(changes,2,'Expired grant cannot update');
sqlite.exec('DELETE FROM product_events');for(let i=0;i<5;i++)assert.equal((await POST(request({action:'request',email:'limited@example.com'}))).status,200);assert.equal((await POST(request({action:'request',email:'limited@example.com'}))).status,429);
console.log('Password security: old-password verification, account binding, mail recovery, single use, expiry, confirmation and rate limits passed.');

writeFileSync(new URL('return.mjs',out),ts.transpileModule(readFileSync(new URL('../lib/password-return.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {passwordReturn,passwordSignInLink}=await import(new URL('return.mjs',out));
const origin='https://yaaro.example';
assert.equal(passwordReturn(undefined,origin+'/auth/recovery?return_to=android',origin),'android');
assert.equal(passwordReturn('android',undefined,origin),'android');
assert.equal(passwordReturn('web',origin+'/auth/recovery?return_to=android',origin),'web');
for(const redirect of ['https://evil.example/auth/recovery?return_to=android','javascript:alert(1)',origin+'/evil?return_to=android',undefined])assert.equal(passwordReturn(undefined,redirect,origin),'web');
for(const android of [false,true])assert.equal(passwordSignInLink('web',android,origin),'/auth/login','Website resets always stay in browser');
assert.equal(passwordSignInLink('android',false,origin),'/auth/login','Cross-device desktop/iPhone links stay usable');
const link=passwordSignInLink('android',true,origin);
assert.ok(link.startsWith('intent://auth/login#Intent;scheme=com.edutantr.yaaro;package=com.edutantr.yaaro;'));
assert.ok(link.includes('S.browser_fallback_url='+encodeURIComponent(origin+'/auth/login')));
assert.ok(!link.includes('token_hash')&&!link.includes('password='),'App navigation never carries credentials');
console.log('Password return routing: app/web origin, untrusted redirect rejection, cross-device and app-missing fallback passed.');
