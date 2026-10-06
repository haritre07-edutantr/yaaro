// Upload canonical PNG bytes, and never treat an HTML/empty response as saved.
export async function readPhotoSaveResponse(response:Response){
 let data:{saved?:boolean;error?:string}|undefined;
 try{const text=await response.text();const parsed:unknown=JSON.parse(text);if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))data=parsed as typeof data;}catch{}
 const fallback=response.status===401?'Your session expired. Sign in again, then retry saving your photo.':response.status===429?'Please wait a minute before trying to save your photo again.':`Your photo save could not be confirmed (HTTP ${response.status}). The selected photo is still here; please try saving again.`;
 if(!response.ok||data?.saved!==true)throw Object.assign(new Error(typeof data?.error==='string'?data.error:fallback),{status:response.status});
}
export async function saveProfilePhoto(photo:Blob|null){
 let response:Response;
 try{response=await fetch('/api/photo',{method:photo?'POST':'DELETE',credentials:'same-origin',cache:'no-store',headers:photo?{'Content-Type':'image/png'}:undefined,body:photo?await photo.arrayBuffer():undefined});}
 catch{throw new Error('Your photo could not reach YAARO. Check your connection and retry; your selected photo is still here.');}
 await readPhotoSaveResponse(response);
}
