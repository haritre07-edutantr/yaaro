import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
const dir=new URL('../.sites-runtime/sound-tests/',import.meta.url);mkdirSync(dir,{recursive:true});
writeFileSync(new URL('engine.mjs',dir),ts.transpileModule(readFileSync(new URL('../lib/sound-engine.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {SoundEngine}=await import(new URL('engine.mjs',dir));
let starts=0,stops=0,closed=0,contexts=0;
const parameter={setValueAtTime(){},exponentialRampToValueAtTime(value){assert.ok(value>0);}};
const context={state:'suspended',currentTime:0,destination:{},async resume(){this.state='running';},async close(){closed++;},createGain:()=>({gain:parameter,connect(){},disconnect(){}}),createOscillator:()=>({frequency:parameter,connect(){},disconnect(){},start(){starts++;},stop(){stops++;},onended:null})};
const engine=new SoundEngine(()=>{contexts++;return context;});
assert.equal(engine.play('sent'),false);assert.equal(starts,0,'Sound never starts before audio is unlocked');assert.equal(await engine.unlock(),true);assert.equal(contexts,1);await engine.unlock();assert.equal(contexts,1,'Reuse one audio context');
for(const kind of ['sent','received','notification','incoming','outgoing'])assert.equal(engine.play(kind),true);
assert.equal(starts,15);let scheduled=0,cancelled=0;const originalSet=globalThis.setInterval,originalClear=globalThis.clearInterval;
globalThis.setInterval=()=>{scheduled++;return 77;};globalThis.clearInterval=()=>{cancelled++;};
try{const stop=engine.ring('incoming');assert.equal(scheduled,1);stop();const before=starts;engine.ring('outgoing');assert.ok(starts>before);engine.stop();assert.ok(cancelled>=4);assert.ok(stops>starts,'Cancellation stops scheduled oscillators');}finally{globalThis.setInterval=originalSet;globalThis.clearInterval=originalClear;}
context.state='suspended';assert.equal(engine.play('received'),false);engine.dispose();assert.equal(closed,1);
const unavailable=new SoundEngine(()=>{throw Error('Audio unavailable');});assert.equal(await unavailable.unlock(),false);assert.equal(unavailable.play('incoming'),false);unavailable.dispose();
console.log('Sound unlock, distinct tones, context reuse, ring cancellation and unsupported-audio checks passed');
