import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import ts from 'typescript';

const out=new URL('../.sites-runtime/child-safety-tests/',import.meta.url);
mkdirSync(out,{recursive:true});
let allowed=false;
const sqlite=new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('../drizzle/0000_lovely_titania.sql',import.meta.url),'utf8'));
const insert=sqlite.prepare('INSERT INTO reports VALUES (?, ?, ?, ?, ?, ?, ?)');
for(let i=0;i<105;i++)insert.run('routine-'+i,'reporter','target','Spam','','Pending',i+100);
insert.run('child-pending','reporter','target','Child sexual abuse or exploitation','','Pending',1);
insert.run('child-escalated','reporter','target','Underage Safety Concern','','Escalate',2);
insert.run('child-closed','reporter','target','Child sexual abuse or exploitation','','Dismiss',999);
globalThis.childSafetyTest={
 identity:async()=>({userId:'operator'}),adminAccess:()=>allowed,
 db:()=>({prepare:sql=>({all:async()=>({results:sqlite.prepare(sql).all()}),first:async()=>sqlite.prepare(sql).get()})})
};
const source=readFileSync(new URL('../app/api/admin/route.ts',import.meta.url),'utf8')
 .replace("import { db, identity, guard, failure, payload, adminAccess } from '@/lib/server';",
  'const {db,identity,adminAccess}=globalThis.childSafetyTest;const failure=e=>Response.json({error:e.message},{status:500});const guard=()=>{};const payload=()=>{};');
writeFileSync(new URL('route.mjs',out),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {GET}=await import(new URL('route.mjs',out));
assert.equal((await GET()).status,403,'Reports remain inaccessible to unauthorized identities');
allowed=true;
const response=await GET();assert.equal(response.status,200);
assert.equal(response.headers.get('Cache-Control'),'no-store');
const {reports}=await response.json();
assert.equal(reports.length,100);
assert.deepEqual(reports.slice(0,2).map(r=>r.id),['child-escalated','child-pending'],
 'Old pending/escalated child safety reports remain visible ahead of more than 100 newer routine reports');
assert.equal(reports[2].id,'child-closed','Closed child safety cases do not take urgent priority');
delete globalThis.childSafetyTest;sqlite.close();
console.log('Child safety queue: authorization, no-store and urgent case priority passed.');
