class YaaroVoiceRecorder extends AudioWorkletProcessor {
 constructor(){super();this.buffer=new Float32Array(2048);this.offset=0;this.port.onmessage=event=>{if(event.data==='flush'){if(this.offset)this.port.postMessage(this.buffer.slice(0,this.offset));this.offset=0;this.port.postMessage('done');}};}
 process(inputs,outputs){const channel=inputs[0]?.[0];if(channel)for(const sample of channel){this.buffer[this.offset++]=sample;if(this.offset===this.buffer.length){this.port.postMessage(this.buffer.slice());this.offset=0;}}for(const output of outputs)for(const channel of output)channel.fill(0);return true;}
}
registerProcessor('yaaro-voice-recorder',YaaroVoiceRecorder);
