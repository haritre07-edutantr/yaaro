// Only canonical raster PNGs are accepted. SVG, metadata, animation, malformed
// chunks, excessive dimensions, CRC failures and trailing/polyglot data fail closed.
const pngCrcTable=Uint32Array.from({length:256},(_,value)=>{let crc=value;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);return crc>>>0;});
function inspectPhoto(bytes:Uint8Array,limits:{maxWidth:number;maxHeight:number},normalize=false){
 if(bytes.length<57||bytes.length>1048576||![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))throw new Error('INVALID_PNG_HEADER');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let offset=8,header=false,data=false,ended=false,width=0,height=0,chunks=0;
 const allowed=new Set(['IHDR','IDAT','IEND','sRGB','gAMA','cHRM','pHYs']);
 // Browser encoders may include colour profiles or EXIF. Verify their CRCs,
 // then discard them; never store private metadata or accept animation.
 const removable=new Set(['iCCP','eXIf','tEXt','iTXt','zTXt','cICP','mDCV','cLLI']);
 const kept:Uint8Array[]=[bytes.subarray(0,8)];let keptSize=8;
 while(offset+12<=bytes.length){if(++chunks>128)throw new Error('INVALID_PNG_CHUNK_COUNT');const length=view.getUint32(offset);if(length>1048576||offset+length+12>bytes.length)throw new Error('INVALID_PNG_CHUNK_LENGTH');const type=String.fromCharCode(...bytes.subarray(offset+4,offset+8));if((!allowed.has(type)&&!(normalize&&removable.has(type)))||(!header&&type!=='IHDR')||ended)throw new Error('INVALID_PNG_CHUNK_TYPE');
 let crc=0xffffffff;for(let i=offset+4;i<offset+8+length;i++)crc=(crc>>>8)^pngCrcTable[(crc^bytes[i])&255];if(((crc^0xffffffff)>>>0)!==view.getUint32(offset+8+length))throw new Error('INVALID_PNG_CRC');
 if(type==='IHDR'){if(header||length!==13)throw new Error('INVALID_PNG_IHDR');width=view.getUint32(offset+8);height=view.getUint32(offset+12);if(!width||!height||width>limits.maxWidth||height>limits.maxHeight||bytes[offset+16]!==8||![2,6].includes(bytes[offset+17])||bytes[offset+18]||bytes[offset+19]||bytes[offset+20])throw new Error('INVALID_PNG_PIXEL_FORMAT');header=true;}
 if(type==='IDAT'){if(!length)throw new Error('INVALID_PNG_EMPTY_DATA');data=true;}if(type==='IEND'){if(length||!data)throw new Error('INVALID_PNG_END');ended=true;}
 if(!removable.has(type)){const chunk=bytes.subarray(offset,offset+length+12);kept.push(chunk);keptSize+=chunk.length;}
 offset+=length+12;
 }
 if(!ended||offset!==bytes.length)throw new Error('INVALID_PNG_TRAILING_DATA');
 let normalized=bytes;if(normalize&&keptSize!==bytes.length){normalized=new Uint8Array(keptSize);let at=0;for(const chunk of kept){normalized.set(chunk,at);at+=chunk.length;}}
 return {width,height,bytes:normalized};
}

export function validatePhoto(bytes:Uint8Array,limits={maxWidth:512,maxHeight:512}){const {width,height}=inspectPhoto(bytes,limits);return {width,height};}
export function normalizePhoto(bytes:Uint8Array,limits={maxWidth:512,maxHeight:512}){return inspectPhoto(bytes,limits,true).bytes;}
