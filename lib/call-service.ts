import {z} from 'zod';
import {CommunityService} from './community-service';
const id=z.string().uuid();
const sdp=z.string().min(20).max(24000).refine(v=>v.startsWith('v=0')&&v.includes('m=audio')&&v.includes('a=fingerprint:')&&v.split(/\r?\n/).filter(x=>x.startsWith('a=candidate:')).every(x=>x.includes('typ relay')), 'Relay-only session required');
export const callAction=z.discriminatedUnion('action',[
 z.object({action:z.literal('start'),id,conversation:z.string().max(100),mode:z.enum(['voice','video'])}),
 z.object({action:z.literal('offer'),id,sdp}),
 z.object({action:z.literal('candidates'),id,candidates:z.array(z.object({id:z.string().uuid(),candidate:z.string().min(20).max(1500).refine(v=>!/[\r\n]/.test(v)&&/^candidate:\S+ \d+ (udp|tcp) \d+ \S+ \d+ typ relay\b/i.test(v)&&!(/\braddr (?!0\.0\.0\.0(?: |$))/.test(v))),sdpMid:z.string().max(100).nullable(),sdpMLineIndex:z.number().int().min(0).max(16).nullable()})).min(1).max(8)}),
 z.object({action:z.literal('accept'),id}),
 z.object({action:z.literal('answer'),id,sdp}),
 z.object({action:z.literal('connected'),id}),z.object({action:z.literal('pulse'),id}),
 z.object({action:z.literal('end'),id}),z.object({action:z.literal('decline'),id})]);
export type CallRow={id:string;conversation:string;caller:string;callee:string;mode:'voice'|'video';state:string;offer:string|null;answer:string|null;created_at:number;updated_at:number};
export class CallService{
 private community:CommunityService;constructor(private db:D1Database,owner:string){this.community=new CommunityService(db,owner);}
 private stmt(sql:string,...v:any[]){return this.db.prepare(sql).bind(...v);}
 async self(){return this.community.publicMember(await this.community.memberId());}
 async expire(){await this.stmt("UPDATE call_sessions SET state = 'ended', offer = NULL, answer = NULL WHERE state IN ('ringing','connecting','active') AND ((state = 'active' AND updated_at < ?) OR (state IN ('ringing','connecting') AND updated_at < ?) OR created_at < ?)",Date.now()-65000,Date.now()-120000,Date.now()-3600000).run();}
 async access(id:string){const me=await this.community.memberId();const c=await this.stmt('SELECT * FROM call_sessions WHERE id = ? AND (caller = ? OR callee = ?)',id,me,me).first<CallRow>();if(!c)throw new Error('FORBIDDEN');await this.community.conversationAccess(c.conversation,true);return {c,me};}
 async get(id?:string){await this.expire();const me=await this.community.memberId();const c=id?(await this.access(id)).c:await this.stmt("SELECT * FROM call_sessions WHERE callee = ? AND state = 'ringing' AND offer IS NOT NULL ORDER BY created_at DESC LIMIT 1",me).first<CallRow>();if(!c)return null;if(!id)await this.community.conversationAccess(c.conversation,true);const candidates=await this.stmt('SELECT id,candidate,sdp_mid AS sdpMid,sdp_mline AS sdpMLineIndex FROM call_candidates WHERE call_id=? AND author!=? ORDER BY created_at,id LIMIT 64',c.id,me).all();return {...c,candidates:candidates.results,peer:await this.community.publicMember(c.caller===me?c.callee:c.caller)};}
 async act(a:z.infer<typeof callAction>){await this.expire();const me=await this.community.memberId(),now=Date.now();
 if(a.action==='start'){const {peer}=await this.community.conversationAccess(a.conversation,true);const existing=await this.stmt('SELECT * FROM call_sessions WHERE id = ?',a.id).first<CallRow>();if(existing){if(existing.caller!==me||existing.conversation!==a.conversation)throw new Error('FORBIDDEN');return {id:a.id};}
 const r=await this.stmt("INSERT INTO call_sessions (id, conversation, caller, callee, mode, state, created_at, updated_at) SELECT ?, ?, ?, ?, ?, 'ringing', ?, ? WHERE NOT EXISTS (SELECT 1 FROM call_sessions WHERE state IN ('ringing','connecting','active') AND (caller IN (?, ?) OR callee IN (?, ?))) AND EXISTS (SELECT 1 FROM friendships WHERE id = ? AND status = 'accepted') AND NOT EXISTS (SELECT 1 FROM member_blocks WHERE (blocker = ? AND blocked = ?) OR (blocker = ? AND blocked = ?)) AND EXISTS (SELECT 1 FROM members WHERE id = ? AND status = 'active' AND COALESCE(json_extract(privacy, '$.calls'), 'Connections only') != 'Nobody') AND EXISTS (SELECT 1 FROM members WHERE id = ? AND status = 'active' AND COALESCE(json_extract(privacy, '$.calls'), 'Connections only') != 'Nobody')",a.id,a.conversation,me,peer.id,a.mode,now,now,me,peer.id,me,peer.id,a.conversation,me,peer.id,peer.id,me,me,peer.id).run();if(!r.meta.changes)throw new Error('BUSY');return {id:a.id};}
 // Hang up stays available when the connection/privacy changes.
 if(a.action==='end'||a.action==='decline'){const c=await this.stmt('SELECT * FROM call_sessions WHERE id = ? AND (caller = ? OR callee = ?)',a.id,me,me).first<CallRow>();if(!c||a.action==='decline'&&(c.callee!==me||c.state!=='ringing'))throw new Error('FORBIDDEN');await this.stmt("UPDATE call_sessions SET state = ?, offer = NULL, answer = NULL, updated_at = ? WHERE id = ?",a.action==='decline'?'declined':'ended',now,a.id).run();return {saved:true};}
 const {c}=await this.access(a.id);let result;
 if(a.action==='candidates'){if(!['ringing','connecting','active'].includes(c.state)||(c.callee===me&&c.state==='ringing'))throw new Error('FORBIDDEN');await this.db.batch(a.candidates.map(candidate=>this.stmt("INSERT OR IGNORE INTO call_candidates(id,call_id,author,candidate,sdp_mid,sdp_mline,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM call_sessions WHERE id=? AND state IN ('ringing','connecting','active')) AND (SELECT COUNT(*) FROM call_candidates WHERE call_id=? AND author=?)<64",candidate.id,c.id,me,candidate.candidate,candidate.sdpMid,candidate.sdpMLineIndex,now,c.id,c.id,me)));return {saved:true};}

 if(a.action==='offer'){if(c.caller!==me||c.state!=='ringing'||c.offer)throw new Error('FORBIDDEN');result=await this.stmt("UPDATE call_sessions SET offer = ?, updated_at = ? WHERE id = ? AND state = 'ringing' AND offer IS NULL",a.sdp,now,c.id).run();}
 if(a.action==='accept'){if(c.callee!==me||c.state!=='ringing'||!c.offer)throw new Error('FORBIDDEN');result=await this.stmt("UPDATE call_sessions SET state = 'connecting', updated_at = ? WHERE id = ? AND state = 'ringing'",now,c.id).run();}
 if(a.action==='answer'){if(c.callee!==me||c.state!=='connecting'||c.answer)throw new Error('FORBIDDEN');result=await this.stmt("UPDATE call_sessions SET answer = ?, updated_at = ? WHERE id = ? AND state = 'connecting' AND answer IS NULL",a.sdp,now,c.id).run();}
 if(a.action==='connected'){if(!c.answer||!['connecting','active'].includes(c.state))throw new Error('FORBIDDEN');result=await this.stmt("UPDATE call_sessions SET state = 'active', updated_at = ? WHERE id = ? AND state IN ('connecting','active')",now,c.id).run();}
 if(a.action==='pulse'){if(c.state!=='active')throw new Error('FORBIDDEN');result=await this.stmt("UPDATE call_sessions SET updated_at = ? WHERE id = ? AND state = 'active'",now,c.id).run();}
 if(!result?.meta.changes)throw new Error('CONFLICT');return {saved:true};
 }
}
