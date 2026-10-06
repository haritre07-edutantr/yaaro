import {z} from 'zod';
import {CommunityService} from './community-service';
import {exploreAction,type ExploreState} from './explore-model';
type Queue={member:string;ticket:string;session_id:string|null};
type Session={id:string;member_a:string;member_b:string;mode:'text'|'voice'|'video';state:'active'|'ended';decision_a:'pending'|'request'|'skip';decision_b:'pending'|'request'|'skip'};
export class ExploreService{
 private community:CommunityService;
 constructor(private db:D1Database,owner:string){this.community=new CommunityService(db,owner);}
 private stmt(sql:string,...values:any[]){return this.db.prepare(sql).bind(...values);}
 async cleanup(){const now=Date.now();await this.db.batch([
  this.stmt("UPDATE explore_sessions SET state='ended',ended_at=? WHERE state='active' AND (created_at<? OR NOT EXISTS(SELECT 1 FROM explore_queue WHERE member=member_a AND session_id=explore_sessions.id AND touched_at>?) OR NOT EXISTS(SELECT 1 FROM explore_queue WHERE member=member_b AND session_id=explore_sessions.id AND touched_at>?))",now,now-3600000,now-45000,now-45000),
  this.stmt("DELETE FROM explore_queue WHERE session_id IS NULL AND touched_at<?",now-45000),
  this.stmt("DELETE FROM explore_sessions WHERE state='ended' AND (ended_at<? OR (decision_a!='pending' AND decision_b!='pending'))",now-900000)
 ]);}
 private async queue(ticket:string){const me=await this.community.memberId();const q=await this.stmt('SELECT * FROM explore_queue WHERE member=? AND ticket=?',me,ticket).first<Queue>();if(!q)throw new Error('NOT_FOUND');return q;}
 private async match(q:Queue){
  // One atomic INSERT claims both queue rows via a trigger. Concurrent searches
  // cannot pair a member twice, even when they are the other side of a pair.
  const modeAllowed="((q.mode='text' AND json_extract(m.privacy,'$.messages')!='Nobody') OR (q.mode!='text' AND json_extract(m.privacy,'$.calls')!='Nobody'))";
  const peerAllowed="((p.mode='text' AND json_extract(n.privacy,'$.messages')!='Nobody') OR (p.mode!='text' AND json_extract(n.privacy,'$.calls')!='Nobody'))";
  const filter=(queue:string,member:string)=>`(${queue}.language='' OR EXISTS(SELECT 1 FROM json_each(${member}.languages) WHERE value=${queue}.language)) AND (${queue}.vibe='' OR ${queue}.vibe=${member}.vibe) AND (${queue}.interest='' OR EXISTS(SELECT 1 FROM json_each(${member}.interests) WHERE value=${queue}.interest)) AND (${queue}.region='' OR (${member}.region NOT IN ('Prefer not to say','Other region','') AND instr(lower(${member}.region),lower(${queue}.region))>0))`;
  const now=Date.now();await this.stmt(`INSERT INTO explore_sessions(id,member_a,member_b,mode,created_at)
   SELECT ?,q.member,p.member,q.mode,? FROM explore_queue q JOIN members m ON m.id=q.member JOIN explore_queue p ON p.mode=q.mode AND p.member!=q.member JOIN members n ON n.id=p.member
   WHERE q.member=? AND q.ticket=? AND q.session_id IS NULL AND p.session_id IS NULL AND q.touched_at>? AND p.touched_at>?
   AND m.status='active' AND n.status='active' AND m.published=1 AND n.published=1 AND json_extract(m.privacy,'$.discover')='Everyone' AND json_extract(n.privacy,'$.discover')='Everyone'
   AND ${modeAllowed} AND ${peerAllowed} AND ${filter('q','n')} AND ${filter('p','m')}
   AND NOT EXISTS(SELECT 1 FROM member_blocks WHERE (blocker=q.member AND blocked=p.member) OR (blocker=p.member AND blocked=q.member))
   AND NOT EXISTS(SELECT 1 FROM call_sessions WHERE state IN ('ringing','connecting','active') AND (caller IN(q.member,p.member) OR callee IN(q.member,p.member)))
   ORDER BY EXISTS(SELECT 1 FROM friendships WHERE status='accepted' AND ((member_a=q.member AND member_b=p.member) OR (member_b=q.member AND member_a=p.member))),p.joined_at,p.member LIMIT 1`, 'explore:'+crypto.randomUUID(),now,q.member,q.ticket,now-45000,now-45000).run();
 }
 async state(ticket:string):Promise<ExploreState>{await this.cleanup();const me=await this.community.memberId();const q=await this.stmt('SELECT * FROM explore_queue WHERE member=? AND ticket=?',me,ticket).first<Queue>();if(!q)return {waiting:false,expired:true};if(!q.session_id)return {ticket,waiting:true};const s=await this.stmt('SELECT * FROM explore_sessions WHERE id=? AND (member_a=? OR member_b=?)',q.session_id,me,me).first<Session>();if(!s)return {waiting:false,expired:true};
  if(s.state==='active'){try{await this.community.conversationAccess(s.id,s.mode!=='text');}catch{await this.stmt("UPDATE explore_sessions SET state='ended',ended_at=? WHERE id=?",Date.now(),s.id).run();s.state='ended';}}
  const rows=s.state==='active'?await this.stmt('SELECT id,author,body,created_at AS createdAt FROM explore_messages WHERE session_id=? ORDER BY created_at,rowid LIMIT 30',s.id).all<any>():{results:[]};
  return {ticket,waiting:false,session:{id:s.id,mode:s.mode,state:s.state,peer:await this.community.publicMember(s.member_a===me?s.member_b:s.member_a,false),caller:s.member_a===me,decision:s.member_a===me?s.decision_a:s.decision_b,messages:rows.results}};
 }
 async act(a:z.infer<typeof exploreAction>):Promise<ExploreState|{saved:true}>{await this.cleanup();const me=await this.community.memberId(),now=Date.now();
  if(a.action==='join'){const own=await this.stmt('SELECT published,status,privacy FROM members WHERE id=?',me).first<any>();if(!own?.published||own.status!=='active'||JSON.parse(own.privacy).discover!=='Everyone'||JSON.parse(own.privacy)[a.filters.mode==='text'?'messages':'calls']==='Nobody')throw new Error('FORBIDDEN');if(await this.stmt("SELECT id FROM explore_sessions WHERE state='active' AND (member_a=? OR member_b=?) UNION ALL SELECT id FROM call_sessions WHERE state IN ('ringing','connecting','active') AND (caller=? OR callee=?) LIMIT 1",me,me,me,me).first())throw new Error('BUSY');const ticket=crypto.randomUUID();const inserted=await this.stmt('INSERT INTO explore_queue(member,ticket,mode,language,vibe,interest,region,joined_at,touched_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(member) DO UPDATE SET ticket=excluded.ticket,mode=excluded.mode,language=excluded.language,vibe=excluded.vibe,interest=excluded.interest,region=excluded.region,session_id=NULL,joined_at=excluded.joined_at,touched_at=excluded.touched_at WHERE NOT EXISTS(SELECT 1 FROM explore_sessions WHERE state=\'active\' AND (member_a=excluded.member OR member_b=excluded.member))',me,ticket,a.filters.mode,a.filters.language,a.filters.vibe,a.filters.interest,a.filters.region,now,now).run();if(!inserted.meta.changes)throw new Error('BUSY');await this.match({member:me,ticket,session_id:null});return this.state(ticket);}
  const q=await this.queue(a.ticket);
  if(a.action==='pulse'){await this.stmt('UPDATE explore_queue SET touched_at=? WHERE member=? AND ticket=?',now,me,a.ticket).run();if(!q.session_id)await this.match(q);return this.state(a.ticket);}
  if(a.action==='cancel'){if(q.session_id)await this.stmt("UPDATE explore_sessions SET state='ended',ended_at=COALESCE(ended_at,?) WHERE id=? AND state='active'",now,q.session_id).run();await this.stmt('DELETE FROM explore_queue WHERE member=? AND ticket=?',me,a.ticket).run();return {saved:true};}
  if(q.session_id!==a.session)throw new Error('FORBIDDEN');
  if(a.action==='message'){await this.community.conversationAccess(a.session);const r=await this.stmt("INSERT INTO explore_messages(id,session_id,author,body,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM explore_sessions WHERE id=? AND state='active' AND mode='text' AND (member_a=? OR member_b=?)) AND EXISTS(SELECT 1 FROM explore_queue WHERE member=? AND ticket=? AND session_id=?) ON CONFLICT(id) DO NOTHING",a.id,a.session,me,a.body,now,a.session,me,me,me,a.ticket,a.session).run();if(!r.meta.changes){const existing=await this.stmt('SELECT id FROM explore_messages WHERE id=? AND author=? AND session_id=?',a.id,me,a.session).first();if(!existing)throw new Error('FORBIDDEN');}return {saved:true};}
  await this.stmt("UPDATE explore_sessions SET state='ended',ended_at=COALESCE(ended_at,?) WHERE id=? AND state='active'",now,a.session).run();
  if(a.action==='decision'){const s=await this.stmt('SELECT * FROM explore_sessions WHERE id=?',a.session).first<Session>();if(!s)throw new Error('NOT_FOUND');const column=s.member_a===me?'decision_a':'decision_b';if(s[column]!=='pending')return {saved:true};if(a.decision==='request'){const peer=s.member_a===me?s.member_b:s.member_a,pair=[me,peer].sort().join(':');const f=await this.stmt('SELECT status,requester FROM friendships WHERE id=?',pair).first<any>();if(f?.status==='pending'&&f.requester!==me)await this.community.act({action:'connection',id:pair,decision:'accept'});else {await this.community.act({action:'request',target:peer});const latest=await this.stmt('SELECT status,requester FROM friendships WHERE id=?',pair).first<any>();if(latest?.status==='pending'&&latest.requester!==me)await this.community.act({action:'connection',id:pair,decision:'accept'});}}await this.stmt(`UPDATE explore_sessions SET ${column}=? WHERE id=? AND ${column}='pending'`,a.decision,a.session).run();await this.cleanup();}
  return {saved:true};
 }
}
