// Non-fragmented, self-contained MP4. Check both declared and sample-table time.
export const MAX_MOMENT_VIDEO_BYTES=12*1024*1024;
type Box={type:string;start:number;end:number};
export function validateMomentVideo(bytes:Uint8Array){
 const invalid=()=>{throw new Error('VIDEO_INVALID');};
 if(bytes.length>MAX_MOMENT_VIDEO_BYTES||bytes.length<64)invalid();
 const data=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const text=(p:number,n=4)=>String.fromCharCode(...bytes.subarray(p,p+n));
 const u32=(p:number)=>data.getUint32(p);
 let count=0;
 function boxes(start:number,end:number):Box[]{const out:Box[]=[];while(start<end){if(++count>10000||end-start<8)invalid();let size=u32(start),header=8;if(size===1){if(end-start<16)invalid();const big=data.getBigUint64(start+8);if(big>BigInt(bytes.length))invalid();size=Number(big);header=16;}else if(size===0)size=end-start;if(size<header||size>end-start)invalid();out.push({type:text(start+4),start:start+header,end:start+size});start+=size;}return out;}
 function only(list:Box[],type:string){const found=list.filter(b=>b.type===type);if(found.length!==1)invalid();return found[0];}
 function timing(box:Box){const version=bytes[box.start];if(version!==0&&version!==1)invalid();const offset=box.start+(version===1?20:12);if(offset+(version===1?12:8)>box.end)invalid();const scale=u32(offset),duration=version===1?Number(data.getBigUint64(offset+4)):u32(offset+4);if(!scale||!Number.isSafeInteger(duration)||duration<=0)invalid();if(duration/scale>10)throw new Error('VIDEO_TOO_LONG');return {scale,duration};}
 const root=boxes(0,bytes.length),ftyp=only(root,'ftyp');if(ftyp.end-ftyp.start<8||!['isom','iso2','mp41','mp42','avc1','M4V '].some(brand=>{for(let p=ftyp.start;p+4<=ftyp.end;p+=4)if(text(p)===brand)return true;return false;}))invalid();
 if(root.some(b=>!['ftyp','moov','mdat','free','skip','wide'].includes(b.type)))invalid();
 const mdats=root.filter(b=>b.type==='mdat');if(!mdats.length||!mdats.some(b=>b.end>b.start))invalid();
 const movie=boxes(only(root,'moov').start,only(root,'moov').end);timing(only(movie,'mvhd'));if(movie.some(b=>b.type==='mvex'))invalid();
 const tracks=movie.filter(b=>b.type==='trak');if(!tracks.length||tracks.length>2)invalid();let video=false;
 for(const track of tracks){const trackBoxes=boxes(track.start,track.end),mdia=only(trackBoxes,'mdia'),media=boxes(mdia.start,mdia.end),time=timing(only(media,'mdhd')),handler=only(media,'hdlr');if(handler.end-handler.start<12)invalid();const kind=text(handler.start+8);if(!['vide','soun'].includes(kind))invalid();video ||= kind==='vide';
 const minf=only(media,'minf'),minfBoxes=boxes(minf.start,minf.end),dinf=only(minfBoxes,'dinf'),dref=only(boxes(dinf.start,dinf.end),'dref');if(dref.end-dref.start<8||u32(dref.start+4)!==1)invalid();const ref=only(boxes(dref.start+8,dref.end),'url ');if(ref.end-ref.start!==4||u32(ref.start)!==1)invalid(); // reject external URLs
 const stbl=only(minfBoxes,'stbl'),tables=boxes(stbl.start,stbl.end),stts=only(tables,'stts');if(stts.end-stts.start<8)invalid();const entries=u32(stts.start+4);if(!entries||entries>10000||stts.end-stts.start!==8+entries*8)invalid();let ticks=0,samples=0;for(let p=stts.start+8;p<stts.end;p+=8){const n=u32(p),delta=u32(p+4);if(!n||!delta)invalid();ticks+=n*delta;samples+=n;}if(!Number.isSafeInteger(ticks)||ticks/time.scale>10)throw new Error('VIDEO_TOO_LONG');if(ticks!==time.duration)invalid();
 const ctts=tables.filter(b=>b.type==='ctts');if(ctts.length>1)invalid();if(ctts.length){const box=ctts[0];if(box.end-box.start<8||![0,1].includes(bytes[box.start]))invalid();const n=u32(box.start+4);if(n>10000||box.end-box.start!==8+n*8)invalid();let remaining=0;for(let p=box.start+8;p<box.end;p+=8){remaining+=u32(p);const offset=bytes[box.start]===1?data.getInt32(p+4):u32(p+4);if(Math.abs(offset)>time.scale*10)throw new Error('VIDEO_TOO_LONG');}if(remaining!==samples)invalid();}
 const stsc=only(tables,'stsc');if(stsc.end-stsc.start<8)invalid();const mappings=u32(stsc.start+4);if(!mappings||mappings>10000||stsc.end-stsc.start!==8+mappings*12)invalid();let previous=0;for(let p=stsc.start+8;p<stsc.end;p+=12){const first=u32(p);if(first<=previous||!u32(p+4)||u32(p+8)!==1)invalid();previous=first;}
 const stsd=only(tables,'stsd');if(stsd.end-stsd.start<8||u32(stsd.start+4)!==1)invalid();const codecs=boxes(stsd.start+8,stsd.end);if(codecs.length!==1||!(kind==='vide'?['avc1','avc3']:['mp4a']).includes(codecs[0].type))invalid();const codec=codecs[0];if(codec.end-codec.start<(kind==='vide'?78:28)||data.getUint16(codec.start+6)!==1)invalid();if(kind==='vide'&&(!data.getUint16(codec.start+24)||!data.getUint16(codec.start+26)||data.getUint16(codec.start+24)>4096||data.getUint16(codec.start+26)>4096))invalid();
 const config=boxes(codec.start+(kind==='vide'?78:28),codec.end);if(kind==='vide'){const avcc=only(config,'avcC');if(avcc.end-avcc.start<7||bytes[avcc.start]!==1)invalid();}else only(config,'esds');
 const stsz=only(tables,'stsz');if(stsz.end-stsz.start<12||u32(stsz.start+8)!==samples)invalid();const fixed=u32(stsz.start+4);if(stsz.end-stsz.start!==12+(fixed?0:samples*4))invalid();let sampleBytes=fixed*samples;if(!fixed)for(let p=stsz.start+12;p<stsz.end;p+=4){const size=u32(p);if(!size)invalid();sampleBytes+=size;}if(!sampleBytes||sampleBytes>mdats.reduce((n,b)=>n+b.end-b.start,0))invalid();
 const offsetTables=tables.filter(b=>b.type==='stco'||b.type==='co64');if(offsetTables.length!==1)invalid();const offsets=offsetTables[0],width=offsets.type==='co64'?8:4;if(offsets.end-offsets.start<8)invalid();const n=u32(offsets.start+4);if(!n||offsets.end-offsets.start!==8+n*width)invalid();for(let p=offsets.start+8;p<offsets.end;p+=width){const offset=width===8?Number(data.getBigUint64(p)):u32(p);if(!mdats.some(b=>offset>=b.start&&offset<b.end))invalid();}
 }
 if(!video)invalid();return true;
}

// Remove metadata (including location) without moving any media/sample offsets.
export function sanitizeMomentVideo(bytes:Uint8Array){
 const data=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 function walk(start:number,end:number){while(start<end){let size=data.getUint32(start),header=8;if(size===1){size=Number(data.getBigUint64(start+8));header=16;}else if(size===0)size=end-start;const type=String.fromCharCode(...bytes.subarray(start+4,start+8)),next=start+size;
 if(['udta','meta','uuid'].includes(type)){bytes.set([102,114,101,101],start+4);bytes.fill(0,start+header,next);}else if(['moov','trak','mdia','minf','stbl','edts'].includes(type))walk(start+header,next);start=next;}}
 validateMomentVideo(bytes);walk(0,bytes.length);return bytes;
}
