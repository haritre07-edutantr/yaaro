import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
const output=new URL('../.sites-runtime/auth-tests/',import.meta.url);mkdirSync(output,{recursive:true});
writeFileSync(new URL('security.mjs',output),ts.transpileModule(readFileSync(new URL('../lib/auth-security.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {safeReturnPath,isSuperAdmin}=await import(new URL('security.mjs',output));
let checks=0;
for(const malicious of ['https://attacker.example','//attacker.example','/\\attacker.example','/auth/callback','/\n/attacker.example','/auth/signout',null,'']){assert.equal(safeReturnPath(malicious),'/community');checks++;}
assert.equal(safeReturnPath('/admin?tab=reports'),'/admin?tab=reports');checks++;
const user={userId:'verified-user',email:'haritre07@gmail.com',emailVerified:true};
for(const [candidate,id] of [[null,'verified-user'],[user,undefined],[user,'other-user'],[{...user,emailVerified:false},'verified-user'],[{...user,email:'someone@example.com'},'verified-user'],[{...user,userId:'other-user'},'verified-user']]){assert.equal(isSuperAdmin(candidate,id),false);checks++;}
assert.equal(isSuperAdmin(user,'verified-user'),true);checks++;
console.log(`${checks} authentication security checks passed`);
