// Only canonical raster PNGs are accepted. SVG, metadata, animation, malformed
// chunks, excessive dimensions, CRC failures and trailing/polyglot data fail closed.
export function validatePhoto(bytes:Uint8Array,limits={maxWidth:512,maxHeight:512}){
 if(bytes.length<57||bytes.length>1048576||![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))throw new Error('INVALID');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let offset=8,header=false,data=false,ended=false,width=0,height=0,chunks=0;
 const allowed=new Set(['IHDR','IDAT','IEND','sRGB','gAMA','cHRM','pHYs']);
 while(offset+12<=bytes.length){if(++chunks>128)throw new Error('INVALID');const length=view.getUint32(offset);if(length>1048576||offset+length+12>bytes.length)throw new Error('INVALID');const type=String.fromCharCode(...bytes.subarray(offset+4,offset+8));if(!allowed.has(type)||(!header&&type!=='IHDR')||ended)throw new Error('INVALID');
 let crc=0xffffffff;for(let i=offset+4;i<offset+8+length;i++){crc^=bytes[i];for(let n=0;n<8;n++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}if(((crc^0xffffffff)>>>0)!==view.getUint32(offset+8+length))throw new Error('INVALID');
 if(type==='IHDR'){if(header||length!==13)throw new Error('INVALID');width=view.getUint32(offset+8);height=view.getUint32(offset+12);if(!width||!height||width>limits.maxWidth||height>limits.maxHeight||bytes[offset+16]!==8||![2,6].includes(bytes[offset+17])||bytes[offset+18]||bytes[offset+19]||bytes[offset+20])throw new Error('INVALID');header=true;}
 if(type==='IDAT'){if(!length)throw new Error('INVALID');data=true;}if(type==='IEND'){if(length||!data)throw new Error('INVALID');ended=true;}
 offset+=length+12;
 }
 if(!ended||offset!==bytes.length)throw new Error('INVALID');return {width,height};
}
