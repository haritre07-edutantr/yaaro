// A repeated request keeps the same draft id. The server confirms existing
// posts before writing, so a lost response cannot create a duplicate Moment.
export async function uploadMoment(form:FormData){
 for(let attempt=0;attempt<2;attempt++){
  let response:Response;
  try{response=await fetch('/api/moments',{method:'POST',body:form});}
  catch{if(!attempt){await new Promise(resolve=>setTimeout(resolve,600));continue;}throw new Error('The upload connection was interrupted. Your selected file is still here; please try sharing again.');}
  if([502,503,504].includes(response.status)&&!attempt){await response.body?.cancel().catch(()=>{});await new Promise(resolve=>setTimeout(resolve,600));continue;}
  let data:{saved?:boolean;error?:string}={};try{data=await response.json();}catch{throw new Error(`Moment upload could not be confirmed (HTTP ${response.status}). Your selected file is still here; please try again.`);}
  if(!response.ok||data.saved!==true)throw new Error(data.error||`Moment upload could not be confirmed (HTTP ${response.status}). Your selected file is still here; please try again.`);
  return;
 }
}
