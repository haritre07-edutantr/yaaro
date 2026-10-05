// Signalling carries the gathered SDP (no trickle ICE). A stalled relay URL
// must not discard candidates gathered successfully through another URL.
export function gatherRelaySdp(peer:RTCPeerConnection,{timeoutMs=30000,settleMs=750}:{timeoutMs?:number;settleMs?:number}={}):Promise<string>{
 return new Promise((resolve,reject)=>{
  let done=false,settle:ReturnType<typeof setTimeout>|undefined;
  const codes=new Set<number>();
  function relaySdp(){const sdp=peer.localDescription?.sdp;return sdp&&/^a=candidate:.*\btyp relay\b/m.test(sdp)?sdp:null;}
  function finish(error?:Error){if(done)return;done=true;clearTimeout(timeout);clearTimeout(settle);peer.removeEventListener('icecandidate',candidate);peer.removeEventListener('icegatheringstatechange',change);peer.removeEventListener('connectionstatechange',change);peer.removeEventListener('icecandidateerror',relayError);const sdp=relaySdp();if(error)reject(error);else if(sdp)resolve(sdp);else reject(new Error('No private relay connection was available. Try another network and retry.'+(codes.size?' (ICE '+[...codes].join(', ')+')':'')));}
  function change(){if(peer.connectionState==='closed'){finish(new Error('Call cancelled.'));return;}if(peer.iceGatheringState==='complete'){finish();return;}if(relaySdp()&&!settle)settle=setTimeout(()=>finish(),settleMs);}
  function candidate(){change();}
  function relayError(event:Event){const code=(event as RTCPeerConnectionIceErrorEvent).errorCode;if(Number.isInteger(code)&&code>=300&&code<=799)codes.add(code);}
  const timeout=setTimeout(()=>finish(),timeoutMs);
  peer.addEventListener('icecandidate',candidate);peer.addEventListener('icegatheringstatechange',change);peer.addEventListener('connectionstatechange',change);peer.addEventListener('icecandidateerror',relayError);
  change();
 });
}
