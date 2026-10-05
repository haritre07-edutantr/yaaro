export function validateVoice(bytes:Uint8Array){
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),text=(at:number,size:number)=>String.fromCharCode(...bytes.subarray(at,at+size));
 if(bytes.length<46||bytes.length>1920044||text(0,4)!=='RIFF'||text(8,4)!=='WAVE'||text(12,4)!=='fmt '||text(36,4)!=='data')throw new Error('INVALID');
 if(v.getUint32(4,true)!==bytes.length-8||v.getUint32(16,true)!==16||v.getUint16(20,true)!==1||v.getUint16(22,true)!==1||v.getUint32(24,true)!==16000||v.getUint32(28,true)!==32000||v.getUint16(32,true)!==2||v.getUint16(34,true)!==16||v.getUint32(40,true)!==bytes.length-44||(bytes.length-44)%2)throw new Error('INVALID');
 return {duration:(bytes.length-44)/32000};
}
export function encodeVoice(chunks:Float32Array[],sampleRate:number){
 const input=new Float32Array(chunks.reduce((n,c)=>n+c.length,0));let at=0;for(const c of chunks){input.set(c,at);at+=c.length;}
 const count=Math.min(960000,Math.floor(input.length*16000/sampleRate)),bytes=new Uint8Array(44+count*2),view=new DataView(bytes.buffer);
 const text=(at:number,value:string)=>{for(let i=0;i<value.length;i++)bytes[at+i]=value.charCodeAt(i);};text(0,'RIFF');view.setUint32(4,bytes.length-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,count*2,true);
 for(let i=0;i<count;i++){const from=Math.floor(i*sampleRate/16000),to=Math.min(input.length,Math.max(from+1,Math.floor((i+1)*sampleRate/16000)));let total=0;for(let n=from;n<to;n++)total+=input[n];const x=Math.max(-1,Math.min(1,total/(to-from)));view.setInt16(44+i*2,x<0?x*32768:x*32767,true);}return bytes;
}
