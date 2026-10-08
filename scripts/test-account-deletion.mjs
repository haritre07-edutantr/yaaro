import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
const out=new URL('../.sites-runtime/account-tests/',import.meta.url);mkdirSync(out,{recursive:true});
for(const n of ['data','community-model','community-service','account-deletion']){let s=readFileSync(new URL('../lib/'+n+'.ts',import.meta.url),'utf8');for(const dep of ['data','community-model'])s=s.replaceAll("'./"+dep+"'","'./"+dep+".mjs'");writeFileSync(new URL(n+'.mjs',out),ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);}
const {eraseAccountData}=await import(new URL('account-deletion.mjs',out)),{CommunityService}=await import(new URL('community-service.mjs',out));
const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');for(const f of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
class Statement{constructor(sql,v=[]){this.sql=sql;this.v=v;}bind(...v){return new Statement(this.sql,v);}async first(){return sqlite.prepare(this.sql).get(...this.v)||null;}async run(){const r=sqlite.prepare(this.sql).run(...this.v);return {meta:{changes:Number(r.changes)}};}}
const db={prepare:sql=>new Statement(sql),async batch(stmts){sqlite.exec('BEGIN');try{const r=[];for(const s of stmts)r.push(await s.run());sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
for(const owner of ['alice','bob'])await new CommunityService(db,owner).act({action:'profile',profile:{name:owner,dob:'2000-01-01',languages:['English'],interests:['Music'],bio:'Private bio',vibe:'Chill',avatar:'A',region:'Bengaluru'},consent:true});
const alice=await new CommunityService(db,'alice').memberId(),bob=await new CommunityService(db,'bob').memberId();
const sql=(q,...v)=>sqlite.prepare(q).run(...v),row=q=>sqlite.prepare(q).get();
sql("UPDATE members SET photo_key='private/photo' WHERE id=?",alice);
sql("INSERT INTO friendships(id,member_a,member_b,requester,status,created_at,updated_at) VALUES('pair',?,?,?,'accepted',1,1)",alice,bob,alice);
sql("INSERT INTO chat_messages(id,conversation,author,body,created_at) VALUES('message','pair',?,'secret',1)",alice);
sql("INSERT INTO chat_media(id,message,conversation,storage_key,kind,content_type,created_at) VALUES('media','message','pair','private/chat','photo','image/png',1)");
sql("INSERT INTO interest_spaces(id,owner,name,description,topic,language,access,rules,created_at,updated_at) VALUES('space',?,'Shared','Description','Music','English','open','Rules',1,1)",alice);
await assert.rejects(()=>eraseAccountData(db,'alice'),/OWNER_TRANSFER/);assert.equal(row('SELECT COUNT(*) n FROM account_deletions').n,0);
sql("UPDATE interest_spaces SET owner=? WHERE id='space'",bob);
sql("INSERT INTO space_channels(id,space,name,created_at) VALUES('channel','space','General',1)");
sql("INSERT INTO space_posts(id,space,channel,author,kind,body,created_at) VALUES('post','space','channel',?,'discussion','Private content',1)",alice);
sql("INSERT INTO reports(id,owner,target,category,description,created_at) VALUES('report','alice',?,'Spam','Safety evidence',1)",bob);
await eraseAccountData(db,'alice');await eraseAccountData(db,'alice');
assert.equal(row("SELECT name FROM members WHERE owner='bob'").name,'bob');assert.equal(row("SELECT name FROM members WHERE status='deleted'").name,'Deleted account');assert.equal(row("SELECT body FROM space_posts WHERE id='post'").body,'');assert.equal(row('SELECT COUNT(*) n FROM chat_messages').n,0);assert.equal(row('SELECT COUNT(*) n FROM chat_media').n,0);assert.equal(row('SELECT COUNT(*) n FROM media_cleanup').n,2);assert.equal(row("SELECT owner FROM reports WHERE id='report'").owner,'deleted-account');assert.equal(row('SELECT COUNT(*) n FROM interest_spaces').n,1);assert.equal(sqlite.prepare('PRAGMA foreign_key_check').all().length,0);
await eraseAccountData(db,'no-profile');assert.equal(row("SELECT COUNT(*) n FROM account_deletions WHERE owner='no-profile'").n,1);
console.log('Account deletion: ownership gate, media cleanup, shared community, anonymity, safety retention, retries and profile-less account passed.');
// Storage retries retain failed keys and remove successfully deleted keys.
writeFileSync(new URL('media-cleanup.mjs',out),ts.transpileModule(readFileSync(new URL('../lib/media-cleanup.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {cleanupQueuedMedia}=await import(new URL('media-cleanup.mjs',out));
const deleted=[];const cleanupDb={prepare:q=>({all:async()=>({results:sqlite.prepare(q).all()}),bind:k=>({run:async()=>sql(q,k)})})};
await cleanupQueuedMedia(cleanupDb,{delete:async k=>{if(k==='private/photo')throw Error('temporary failure');deleted.push(k);}});
assert.deepEqual(deleted,['private/chat']);assert.equal(row('SELECT COUNT(*) n FROM media_cleanup').n,1);
await cleanupQueuedMedia(cleanupDb,{delete:async k=>deleted.push(k)});assert.equal(row('SELECT COUNT(*) n FROM media_cleanup').n,0);
console.log('Storage cleanup retries passed.');
// Route authorization and remote-auth cleanup are mocked: never delete a real account.
let routeSource=readFileSync(new URL('../app/api/account/route.ts',import.meta.url),'utf8');
routeSource=routeSource.replace("import {createClient} from '@supabase/supabase-js';","const createClient=()=>globalThis.accountTest.admin;")
.replace("import {env} from 'cloudflare:workers';","const env={get SUPABASE_SECRET_KEY(){return globalThis.accountTest.secret;}};")
.replace("import {cookies} from 'next/headers';","const cookies=async()=>({delete:()=>{}});")
.replace("import {supabaseServer,authConfig} from '@/lib/supabase-server';","const supabaseServer=async()=>globalThis.accountTest.client;const authConfig=()=>({url:'https://auth.example',key:'public'});")
.replace("import {db,failure,payload} from '@/lib/server';","const db=()=>({prepare:()=>({bind:()=>({run:async()=>{}})})});const failure=e=>Response.json({error:e.message},{status:e.message==='UNAUTHORIZED'?401:403});const payload=r=>r.json();")
.replace("import {eraseAccountData} from '@/lib/account-deletion';","const eraseAccountData=async()=>{globalThis.accountTest.calls.push('erase');};")
.replace("import {cleanupMediaStorage} from '@/lib/media-server';","const cleanupMediaStorage=async()=>{globalThis.accountTest.calls.push('media');};");
writeFileSync(new URL('route.mjs',out),ts.transpileModule(routeSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {POST}=await import(new URL('route.mjs',out));
function reset(){globalThis.accountTest={secret:'test-only',calls:[],client:{auth:{getUser:async()=>({data:{user:{id:'test-user'}},error:null}),signOut:async()=>({error:null})}},admin:{auth:{admin:{getUserById:async()=>({error:null}),deleteUser:async()=>{globalThis.accountTest.calls.push('auth-delete');return {error:null};}}}}};}
const request=(origin='https://yaaro.example',confirmation='DELETE')=>new Request('https://yaaro.example/api/account',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({confirmation})});
reset();assert.equal((await POST(request('https://attacker.example'))).status,403);assert.deepEqual(globalThis.accountTest.calls,[]);
reset();assert.equal((await POST(request(undefined,'WRONG'))).status,403);assert.deepEqual(globalThis.accountTest.calls,[]);
reset();globalThis.accountTest.client.auth.getUser=async()=>({data:{user:null},error:null});assert.equal((await POST(request())).status,401);
reset();globalThis.accountTest.secret=undefined;assert.equal((await POST(request())).status,503);assert.deepEqual(globalThis.accountTest.calls,[]);
reset();globalThis.accountTest.admin.auth.admin.getUserById=async()=>({error:{code:'bad-secret'}});assert.equal((await POST(request())).status,503);assert.deepEqual(globalThis.accountTest.calls,[]);
reset();globalThis.accountTest.client.auth.signOut=async()=>({error:{code:'offline'}});assert.equal((await POST(request())).status,403);assert.deepEqual(globalThis.accountTest.calls,[]);
reset();assert.equal((await POST(request())).status,200);assert.deepEqual(globalThis.accountTest.calls,['erase','auth-delete','media']);
reset();globalThis.accountTest.admin.auth.admin.deleteUser=async()=>({error:{code:'provider-unavailable'}});assert.equal((await POST(request())).status,503);assert.deepEqual(globalThis.accountTest.calls,['erase']);
console.log('Deletion route authorization, configuration, revocation and failure-stage checks passed.');
