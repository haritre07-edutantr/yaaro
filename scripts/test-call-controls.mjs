import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
const dir=new URL('../.sites-runtime/control-tests/',import.meta.url);mkdirSync(dir,{recursive:true});
for(const name of ['call-candidates','video-controls'])writeFileSync(new URL(name+'.mjs',dir),ts.transpileModule(readFileSync(new URL('../lib/'+name+'.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {relayCandidate,relaySessionSdp,applyRelayCandidates}=await import(new URL('call-candidates.mjs',dir));
const {supportsTorch,setTorch,replaceVideoCamera}=await import(new URL('video-controls.mjs',dir));
const value='candidate:1 1 udp 100 203.0.113.1 5000 typ relay raddr 192.168.1.3 rport 9876';
assert.equal(relayCandidate({candidate:value}).candidate,value.replace('192.168.1.3','0.0.0.0').replace('9876','0'));
assert.equal(relayCandidate({candidate:value.replace('typ relay','typ srflx')}),null);
assert.equal(relayCandidate({candidate:value+'\r\na=bad'}),null);
assert.equal(relaySessionSdp('v=0\r\na='+value+'\r\n'),'v=0\r\na='+relayCandidate({candidate:value}).candidate+'\r\n');
assert.throws(()=>relaySessionSdp('a='+value.replace('typ relay','typ host')));
const seen=new Set(),applied=[],peer={remoteDescription:null,connectionState:'new',addIceCandidate:async c=>applied.push(c)};
const candidates=[{id:'one',candidate:value,sdpMid:'0',sdpMLineIndex:0}];
await applyRelayCandidates(peer,candidates,seen);assert.equal(applied.length,0,'Never add ICE before the remote description');
peer.remoteDescription={type:'offer'};await applyRelayCandidates(peer,candidates,seen);await applyRelayCandidates(peer,candidates,seen);assert.equal(applied.length,1,'Poll retries apply ICE once');
peer.addIceCandidate=async()=>{throw Error('Transient');};await assert.rejects(()=>applyRelayCandidates(peer,[{...candidates[0],id:'two'}],seen));assert.equal(seen.has('two'),false,'Failed candidate remains retryable');
function track(torch=false){let flash=false;return {kind:'video',enabled:true,readyState:'live',getCapabilities:()=>({torch}),getSettings:()=>({torch:flash}),applyConstraints:async c=>{flash=c.advanced[0].torch;},stop(){this.readyState='ended';}};}
assert.equal(supportsTorch(),false);assert.equal(supportsTorch(track()),false);await assert.rejects(()=>setTorch(track(),true));const rear=track(true);await setTorch(rear,true);assert.equal(rear.getSettings().torch,true);await setTorch(rear,false);assert.equal(rear.getSettings().torch,false);
function stream(t){const tracks=[t];return {getTracks:()=>tracks,getVideoTracks:()=>tracks.filter(x=>x.kind==='video'),removeTrack:t=>tracks.splice(tracks.indexOf(t),1),addTrack:t=>tracks.push(t)};}
const old=track(),fresh=track(true),media=stream(old);old.enabled=false;let replaced;const sender={replaceTrack:async t=>{replaced=t;}};
const result=await replaceVideoCamera({sender,stream:media,front:false,isCurrent:()=>true,acquire:async f=>{assert.equal(f,false);return stream(fresh);}});
assert.equal(result.front,false);assert.equal(replaced,fresh);assert.equal(old.readyState,'ended');assert.equal(fresh.enabled,false,'Flip preserves the camera-off state');assert.equal(media.getVideoTracks()[0],fresh);
const cancelled=track();await assert.rejects(()=>replaceVideoCamera({sender,stream:media,front:true,isCurrent:()=>false,acquire:async()=>stream(cancelled)}));assert.equal(cancelled.readyState,'ended','Cancelled acquisition releases the new camera');assert.equal(media.getVideoTracks()[0],fresh);
const failed=track(),kept=track(),keptMedia=stream(kept);await assert.rejects(()=>replaceVideoCamera({sender:{replaceTrack:async()=>{throw Error('Codec mismatch');}},stream:keptMedia,front:true,isCurrent:()=>true,acquire:async()=>stream(failed)}));assert.equal(failed.readyState,'ended');assert.equal(kept.readyState,'live','Replacement failure preserves the original live camera');
const exclusive=track(),restored=track();let attempts=0;const fallback=await replaceVideoCamera({sender,stream:stream(exclusive),front:false,isCurrent:()=>true,acquire:async f=>{attempts++;if(attempts===1)throw Object.assign(Error('Busy'),{name:'NotReadableError'});if(attempts===2)throw Error('Rear unavailable');assert.equal(f,true);return stream(restored);}});assert.equal(fallback.restored,true);assert.equal(fallback.front,true);
console.log('Trickle ICE privacy, ordered delivery, deduplication, flashlight capability and camera replacement checks passed');
