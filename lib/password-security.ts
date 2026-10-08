export function passwordFields(body:Record<string,unknown>){
 if(typeof body.password!=='string'||body.password.length<12||body.password.length>128||body.password!==body.confirmation)throw Error('PASSWORD_INVALID');
 return body.password;
}
export async function recoveryHash(ticket:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ticket))),v=>v.toString(16).padStart(2,'0')).join('');}
export const RECOVERY_COOKIE='__Host-yaaro-password-recovery';
