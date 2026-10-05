export type SoundKind='sent'|'received'|'notification'|'incoming'|'outgoing';
// Original synthesized YAARO tones; no downloaded audio or third-party recording.
const tones:Record<SoundKind,number[][]>={sent:[[740,0,.07,.07],[1110,.055,.11,.055]],received:[[880,0,.09,.065],[660,.095,.15,.05]],notification:[[660,0,.13,.06],[990,.13,.17,.055]],incoming:[[660,0,.16,.07],[880,.2,.16,.07],[990,.4,.23,.065],[880,.78,.16,.07],[990,.98,.25,.065]],outgoing:[[440,0,.38,.035],[480,0,.38,.03],[440,.55,.38,.035],[480,.55,.38,.03]]};
export class SoundEngine{
 private context:AudioContext|null=null;private voices=new Set<OscillatorNode>();private loop:ReturnType<typeof setInterval>|undefined;
 constructor(private makeContext:()=>AudioContext){}
 async unlock(){try{if(!this.context||this.context.state==='closed')this.context=this.makeContext();if(this.context.state!=='running')await this.context.resume();return this.context.state==='running';}catch{return false;}}
 get ready(){return this.context?.state==='running';}
 play(kind:SoundKind){const context=this.context;if(!context||context.state!=='running')return false;try{for(const [frequency,delay,duration,volume] of tones[kind]){const oscillator=context.createOscillator(),gain=context.createGain(),start=context.currentTime+delay;oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,start);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);oscillator.connect(gain);gain.connect(context.destination);this.voices.add(oscillator);oscillator.onended=()=>{this.voices.delete(oscillator);oscillator.disconnect();gain.disconnect();};oscillator.start(start);oscillator.stop(start+duration+.03);}return true;}catch{return false;}}
 ring(kind:'incoming'|'outgoing'){this.stop();this.play(kind);this.loop=setInterval(()=>this.play(kind),kind==='incoming'?3200:3000);return()=>this.stop();}
 stop(){clearInterval(this.loop);this.loop=undefined;for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();}
 dispose(){this.stop();void this.context?.close().catch(()=>{});this.context=null;}
}
