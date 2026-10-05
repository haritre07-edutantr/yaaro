export type RelayCandidate={id:string;candidate:string;sdpMid:string|null;sdpMLineIndex:number|null};
export function relayCandidate(candidate:RTCIceCandidateInit):RTCIceCandidateInit|null{
 const value=candidate.candidate;if(!value||/[\r\n]/.test(value)||!/^candidate:\S+ \d+ (udp|tcp) \d+ \S+ \d+ typ relay\b/i.test(value))return null;
 return {...candidate,candidate:value.replace(/\braddr \S+/g,'raddr 0.0.0.0').replace(/\brport \d+/g,'rport 0')};
}
export async function applyRelayCandidates(peer:RTCPeerConnection,items:RelayCandidate[],seen:Set<string>){
 if(!peer.remoteDescription||peer.connectionState==='closed')return;
 for(const item of items){if(seen.has(item.id))continue;const candidate=relayCandidate(item);if(!candidate)continue;await peer.addIceCandidate(candidate);seen.add(item.id);}
}

export function relaySessionSdp(sdp:string){return sdp.replace(/^a=candidate:.*$/gm,line=>{const candidate=relayCandidate({candidate:line.slice(2).trim()});if(!candidate)throw Error("Direct-address signaling is unavailable.");return "a="+candidate.candidate+(line.endsWith("\r")?"\r":"");});}
