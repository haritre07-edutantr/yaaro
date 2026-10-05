import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
const dir=new URL('../.sites-runtime/ice-tests/',import.meta.url);mkdirSync(dir,{recursive:true});
writeFileSync(new URL('ice.mjs',dir),ts.transpileModule(readFileSync(new URL('../lib/call-ice.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {gatherRelaySdp}=await import(new URL('ice.mjs',dir));
const relay='v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=candidate:1 1 udp 1 203.0.113.1 12345 typ relay\r\n';
class Peer extends EventTarget{iceGatheringState='gathering';connectionState='new';localDescription={sdp:'v=0\r\n'};listeners=0;addEventListener(...args){this.listeners++;super.addEventListener(...args);}removeEventListener(...args){this.listeners--;super.removeEventListener(...args);}emit(type){this.dispatchEvent(new Event(type));}}
const options={timeoutMs:100,settleMs:5};
const partial=new Peer();const pending=gatherRelaySdp(partial,options);partial.localDescription.sdp=relay;partial.emit('icecandidate');
assert.equal(await pending,relay,'A valid relay survives another URL that never finishes gathering');assert.equal(partial.listeners,0);
const complete=new Peer();complete.iceGatheringState='complete';complete.localDescription.sdp=relay;
assert.equal(await gatherRelaySdp(complete,options),relay);assert.equal(complete.listeners,0);
const noRelay=new Peer();noRelay.localDescription.sdp='v=0\r\na=candidate:1 1 udp 1 192.0.2.1 1234 typ host\r\n';
await assert.rejects(gatherRelaySdp(noRelay,{timeoutMs:5,settleMs:1}),/No private relay/);assert.equal(noRelay.listeners,0);
const closed=new Peer();const cancelled=gatherRelaySdp(closed,options);closed.connectionState='closed';closed.emit('connectionstatechange');await assert.rejects(cancelled,/Call cancelled/);assert.equal(closed.listeners,0);
const errors=new Peer();const failed=gatherRelaySdp(errors,{timeoutMs:5,settleMs:1});const event=new Event('icecandidateerror');Object.assign(event,{errorCode:701,url:'sensitive-url',errorText:'sensitive-detail'});errors.dispatchEvent(event);await assert.rejects(failed,error=>error.message.includes('ICE 701')&&!error.message.includes('sensitive'));assert.equal(errors.listeners,0);
console.log('Partial relay gathering, completion, timeout, cancellation and safe error checks passed');
