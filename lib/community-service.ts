import {adultAge,defaults,type Action,type Snapshot,type Member,type ChatMessage} from './community-model';
type Row={id:string;owner:string;name:string;dob:string;languages:string;interests:string;bio:string;vibe:string;avatar:string;photo_key:string|null;region:string;privacy:string;published:number;status:string;created_at:number;last_seen:number};
type FriendshipRow={id:string;member_a:string;member_b:string;requester:string;status:string;created_at:number;updated_at:number;read_a:number;read_b:number};
export class CommunityService{
 constructor(private db:D1Database,private owner:string){}
 private stmt(sql:string,...bind:any[]){return this.db.prepare(sql).bind(...bind);}
 private async member(){const m=await this.stmt('SELECT * FROM members WHERE owner = ?',this.owner).first<Row>();if(m&&m.status!=='active')throw new Error('SUSPENDED');return m;}
 private async requireMember(){const m=await this.member();if(!m)throw new Error('PROFILE');return m;}
 private async target(id:string){const t=await this.stmt('SELECT * FROM members WHERE id = ? AND status = ?',id,'active').first<Row>();if(!t)throw new Error('NOT_FOUND');return t;}
 private async blocked(a:string,b:string){return !!await this.stmt('SELECT id FROM member_blocks WHERE (blocker = ? AND blocked = ?) OR (blocker = ? AND blocked = ?) LIMIT 1',a,b,b,a).first();}
 private pair(a:string,b:string){return [a,b].sort().join(':');}
 private async friend(a:string,b:string){return this.stmt('SELECT * FROM friendships WHERE id = ?',this.pair(a,b)).first<FriendshipRow>();}
 private async readable(id:string,me:Row){const c=await this.stmt('SELECT * FROM friendships WHERE id = ? AND status = ? AND (member_a = ? OR member_b = ?)',id,'accepted',me.id,me.id).first<FriendshipRow>();if(!c)throw new Error('FORBIDDEN');const peer=await this.target(c.member_a===me.id?c.member_b:c.member_a);if(await this.blocked(me.id,peer.id))throw new Error('FORBIDDEN');return {c,peer};}
 private public(m:Row,connected=false):Member{const p=JSON.parse(m.privacy);return {id:m.id,name:m.name,age:adultAge(m.dob),languages:JSON.parse(m.languages),interests:JSON.parse(m.interests),bio:m.bio,vibe:m.vibe,avatar:m.avatar as Member['avatar'],photoUrl:m.photo_key?`/api/photo?member=${m.id}&v=${m.photo_key.split('/').at(-1)}`:undefined,region:m.region,online:m.last_seen>Date.now()-45000&&(p.online==='Everyone'||(p.online==='Connections only'&&connected))};}
 async ownPhoto(){const m=await this.requireMember();return {id:m.id,key:m.photo_key};}
 async savePhoto(key:string|null){const m=await this.requireMember();const r=await this.stmt("UPDATE members SET photo_key = ? WHERE id = ? AND status = 'active'",key,m.id).run();if(!r.meta.changes)throw new Error('FORBIDDEN');}
 async photo(id:string){const me=await this.requireMember();const t=id===me.id?me:await this.target(id);if(id!==me.id){if(await this.blocked(me.id,id))throw new Error('FORBIDDEN');const connected=(await this.friend(me.id,id))?.status==='accepted';const p=JSON.parse(t.privacy);if(!connected&&(!t.published||p.discover!=='Everyone'))throw new Error('FORBIDDEN');}return t.photo_key;}
 async conversationAccess(id:string,call=false){const me=await this.requireMember();if(id.startsWith('explore:')){const c=await this.stmt("SELECT s.* FROM explore_sessions s WHERE s.id=? AND s.state='active' AND (s.member_a=? OR s.member_b=?) AND s.created_at>? AND EXISTS(SELECT 1 FROM explore_queue WHERE member=s.member_a AND session_id=s.id AND touched_at>?) AND EXISTS(SELECT 1 FROM explore_queue WHERE member=s.member_b AND session_id=s.id AND touched_at>?)",id,me.id,me.id,Date.now()-3600000,Date.now()-45000,Date.now()-45000).first<FriendshipRow&{mode:string}>();if(!c)throw new Error('FORBIDDEN');const peer=await this.target(c.member_a===me.id?c.member_b:c.member_a);if(await this.blocked(me.id,peer.id)||!me.published||!peer.published)throw new Error('FORBIDDEN');for(const member of [me,peer]){const p=JSON.parse(member.privacy);if(p.discover!=='Everyone'||p[call?'calls':'messages']==='Nobody')throw new Error('FORBIDDEN');}if(call&&c.mode==='text')throw new Error('FORBIDDEN');return {me,peer,c};}const {c,peer}=await this.readable(id,me);if(call&&(JSON.parse(me.privacy).calls==='Nobody'||JSON.parse(peer.privacy).calls==='Nobody'))throw new Error('FORBIDDEN');return {me,peer,c};}
 async memberId(){return (await this.requireMember()).id;}
 async publicMember(id:string,connected=true){return this.public(await this.target(id),connected);}
 async snapshot(filters:{q?:string;vibe?:string;language?:string;interest?:string;region?:string;offset?:number}={}):Promise<Snapshot>{
  const me=await this.member();if(!me)return {me:null,people:[],connections:[],blocked:[],hasMore:false};
  const relationships=await this.stmt(`SELECT f.id AS connection_id, f.status AS connection_status, f.requester, f.updated_at, m.*,
   COALESCE(cp.pinned,0) AS chat_pinned, COALESCE(cp.favorite,0) AS chat_favorite, COALESCE(cp.disappearing,0) AS chat_disappearing,
   lm.id AS last_id, lm.body AS last_body, lm.deleted AS last_deleted, lm.author AS last_author, lm.created_at AS last_created,
   (SELECT COUNT(*) FROM chat_messages cm WHERE cm.conversation=f.id AND cm.author!=? AND cm.deleted=0 AND cm.receiver_read_at IS NULL AND ? IS NOT NULL) AS unread_count
   FROM friendships f JOIN members m ON m.id=CASE WHEN f.member_a=? THEN f.member_b ELSE f.member_a END
   LEFT JOIN chat_preferences cp ON cp.member=? AND cp.target=m.id
   LEFT JOIN chat_messages lm ON f.status='accepted' AND lm.id=(SELECT id FROM chat_messages WHERE conversation=f.id ORDER BY created_at DESC,id DESC LIMIT 1)
   WHERE (f.member_a=? OR f.member_b=?) AND f.status IN ('accepted','pending') AND m.status='active'
   AND NOT EXISTS (SELECT 1 FROM member_blocks b WHERE (b.blocker=? AND b.blocked=m.id) OR (b.blocker=m.id AND b.blocked=?))
   ORDER BY f.updated_at DESC LIMIT 100`,me.id,me.id,me.id,me.id,me.id,me.id,me.id,me.id).all<Row&{connection_id:string;connection_status:string;requester:string;updated_at:number;chat_pinned:number;chat_favorite:number;chat_disappearing:number;last_id:string|null;last_body:string;last_deleted:number;last_author:string;last_created:number;unread_count:number}>();
  const connections=relationships.results.map(r=>({id:r.connection_id,status:r.connection_status,requester:r.requester,updatedAt:r.updated_at,person:this.public(r,r.connection_status==='accepted'),pinned:r.connection_status==='accepted'&&!!r.chat_pinned,disappearing:!!r.chat_disappearing,favorite:r.connection_status==='accepted'&&!!r.chat_favorite,unreadCount:r.connection_status==='accepted'?r.unread_count:0,lastMessage:r.connection_status==='accepted'&&r.last_id?{id:r.last_id,body:r.last_deleted?'':r.last_body,createdAt:r.last_created,own:r.last_author===me.id,deleted:!!r.last_deleted}:undefined}));
  const exclusions='NOT EXISTS (SELECT 1 FROM member_blocks b WHERE (b.blocker = ? AND b.blocked = m.id) OR (b.blocker = m.id AND b.blocked = ?))';
  const visible="(json_extract(m.privacy, '$.discover') = 'Everyone' OR (json_extract(m.privacy, '$.discover') = 'Connections only' AND EXISTS (SELECT 1 FROM friendships f WHERE f.status = 'accepted' AND ((f.member_a = m.id AND f.member_b = ?) OR (f.member_b = m.id AND f.member_a = ?)))))";
  const terms=['m.published = 1',"m.status = 'active'",'m.id != ?',exclusions,visible];const params:any[]=[me.id,me.id,me.id,me.id,me.id];
  if(filters.q?.trim()){terms.push("(m.name LIKE ? ESCAPE '\\' OR m.bio LIKE ? ESCAPE '\\' OR (m.region!='Prefer not to say' AND m.region LIKE ? ESCAPE '\\'))");const q='%'+filters.q.trim().replace(/[\\%_]/g,'\\$&')+'%';params.push(q,q,q);}
  if(filters.region?.trim()){terms.push("m.region!='Prefer not to say' AND m.region!='Other region' AND m.region LIKE ? ESCAPE '\\'");params.push('%'+filters.region.trim().replace(/[\\%_]/g,'\\$&')+'%');}
  if(filters.vibe){terms.push('m.vibe = ?');params.push(filters.vibe);}if(filters.language){terms.push('EXISTS (SELECT 1 FROM json_each(m.languages) WHERE value = ?)');params.push(filters.language);}if(filters.interest){terms.push('EXISTS (SELECT 1 FROM json_each(m.interests) WHERE value = ?)');params.push(filters.interest);}
  const rows=await this.stmt(`SELECT m.* FROM members m WHERE ${terms.join(' AND ')} ORDER BY m.created_at DESC, m.id LIMIT 25 OFFSET ?`,...params,filters.offset||0).all<Row>();
  const blocks=await this.stmt('SELECT m.* FROM members m JOIN member_blocks b ON b.blocked = m.id WHERE b.blocker = ? LIMIT 100',me.id).all<Row>();
  return {me:{...this.public(me,true),dob:me.dob,privacy:{...defaults,...JSON.parse(me.privacy)},published:!!me.published,status:me.status},people:rows.results.slice(0,24).map(p=>this.public(p,connections.some(c=>c.status==='accepted'&&c.person.id===p.id))),connections,blocked:blocks.results.map(p=>this.public(p)),hasMore:rows.results.length>24};
 }
 async cleanupChat(id:string){
  await this.stmt(`DELETE FROM chat_messages WHERE conversation=? AND (
   id IN (SELECT message FROM chat_media_views WHERE opened_at<?)
   OR (disappearing=1 AND receiver_read_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM chat_presence p JOIN friendships f ON f.id=p.conversation WHERE p.conversation=chat_messages.conversation AND p.member=CASE WHEN f.member_a=chat_messages.author THEN f.member_b ELSE f.member_a END AND p.touched_at>?))
  )`,id,Date.now()-30000,Date.now()-30000).run();
 }
 async messages(id:string,before?:number):Promise<ChatMessage[]>{const me=await this.requireMember();await this.readable(id,me);await this.cleanupChat(id);const rows=await this.stmt('SELECT m.id, m.author, m.body, m.reply_id, m.deleted, m.created_at, m.disappearing,m.receiver_read_at, EXISTS(SELECT 1 FROM chat_media_views v WHERE v.message=m.id) AS media_opened, cm.kind AS media_kind FROM chat_messages m LEFT JOIN chat_media cm ON cm.message=m.id WHERE m.conversation = ? AND m.created_at < ? ORDER BY m.created_at DESC, m.rowid DESC LIMIT 30',id,before||Date.now()+1).all<any>();const ids=rows.results.map(m=>m.id);const allReactions=ids.length?await this.stmt(`SELECT message, emoji, COUNT(*) AS count, MAX(CASE WHEN member = ? THEN 1 ELSE 0 END) AS mine FROM chat_reactions WHERE message IN (${ids.map(()=>'?').join(',')}) GROUP BY message, emoji`,me.id,...ids).all<any>():{results:[]};const result=rows.results.reverse().map(m=>({id:m.id,author:m.author,body:m.deleted?'':m.body,attachment:!m.deleted&&m.media_kind?{id:m.id,kind:m.media_kind}:undefined,replyId:m.reply_id,deleted:m.deleted,createdAt:m.created_at,reactions:allReactions.results.filter(r=>r.message===m.id).map(r=>({emoji:r.emoji,count:r.count,mine:!!r.mine})),read:!!m.receiver_read_at,disappearing:!!m.disappearing,opened:!!m.media_opened}));return result;}
 async act(action:Action){
  if(action.action==='profile'){adultAge(action.profile.dob);const existing=await this.member();const p=action.profile;const now=Date.now();await this.stmt('INSERT INTO members (id, owner, name, dob, languages, interests, bio, vibe, avatar, region, privacy, published, status, created_at, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(owner) DO UPDATE SET name = excluded.name, dob = excluded.dob, languages = excluded.languages, interests = excluded.interests, bio = excluded.bio, vibe = excluded.vibe, avatar = excluded.avatar, region = excluded.region',existing?.id||crypto.randomUUID(),this.owner,p.name,p.dob,JSON.stringify([...new Set(p.languages)]),JSON.stringify([...new Set(p.interests)]),p.bio,p.vibe,p.avatar,p.region,JSON.stringify(defaults),1,'active',now,now).run();return {saved:true};}
  const me=await this.requireMember();const now=Date.now();
  if(action.action==='presence'){await this.stmt('UPDATE members SET last_seen = ? WHERE id = ?',now,me.id).run();return {saved:true};}
  if(action.action==='chatPreference'){
   await this.readable(this.pair(me.id,action.target),me);
   const column=action.kind==='pin'?'pinned':'favorite',limit=action.kind==='pin'?2:3;
   if(action.enabled){
    const result=await this.stmt(`INSERT INTO chat_preferences (member,target,pinned,favorite,updated_at)
     SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM friendships WHERE id=? AND status='accepted')
     AND NOT EXISTS (SELECT 1 FROM member_blocks WHERE (blocker=? AND blocked=?) OR (blocker=? AND blocked=?))
     AND EXISTS (SELECT 1 FROM members WHERE id=? AND status='active')
     AND ((SELECT COUNT(*) FROM chat_preferences p JOIN members t ON t.id=p.target AND t.status='active' WHERE p.member=? AND p.${column}=1 AND EXISTS (SELECT 1 FROM friendships f WHERE f.status='accepted' AND ((f.member_a=p.member AND f.member_b=p.target) OR (f.member_b=p.member AND f.member_a=p.target))))<?
     OR EXISTS (SELECT 1 FROM chat_preferences WHERE member=? AND target=? AND ${column}=1))
     ON CONFLICT(member,target) DO UPDATE SET ${column}=excluded.${column},updated_at=excluded.updated_at`,me.id,action.target,column==='pinned'?1:0,column==='favorite'?1:0,now,this.pair(me.id,action.target),me.id,action.target,action.target,me.id,action.target,me.id,limit,me.id,action.target).run();
    if(!result.meta.changes){await this.readable(this.pair(me.id,action.target),me);throw new Error(action.kind==='pin'?'PIN_LIMIT':'FAVORITE_LIMIT');}
   }else{await this.stmt(`UPDATE chat_preferences SET ${column}=0,updated_at=? WHERE member=? AND target=?`,now,me.id,action.target).run();await this.stmt('DELETE FROM chat_preferences WHERE member=? AND target=? AND pinned=0 AND favorite=0 AND disappearing=0',me.id,action.target).run();}
   return {saved:true};
  }
  if(action.action==='privacy'){await this.stmt('UPDATE members SET privacy = ?, published = ? WHERE id = ?',JSON.stringify(action.privacy),action.published?1:0,me.id).run();return {saved:true};}
  if(action.action==='request'){
   if(action.target===me.id)throw new Error('INVALID');const t=await this.target(action.target);if(await this.blocked(me.id,t.id))throw new Error('FORBIDDEN');const p=JSON.parse(t.privacy),f=await this.friend(me.id,t.id);if(!t.published||p.discover==='Nobody'||p.requests!=='Everyone')throw new Error('FORBIDDEN');if(p.discover==='Connections only'&&f?.status!=='accepted')throw new Error('FORBIDDEN');if(f?.status==='declined'&&now-f.updated_at<86400000)throw new Error('COOLDOWN');if(f?.status==='pending'||f?.status==='accepted')return {saved:true};
   const [a,b]=[me.id,t.id].sort();await this.stmt("INSERT INTO friendships (id, member_a, member_b, requester, status, created_at, updated_at, read_a, read_b) VALUES (?, ?, ?, ?, 'pending', ?, ?, 0, 0) ON CONFLICT(id) DO UPDATE SET status = 'pending', requester = excluded.requester, updated_at = excluded.updated_at WHERE friendships.status IN ('declined', 'removed', 'cancelled')",this.pair(a,b),a,b,me.id,now,now).run();return {saved:true};
  }
  if(action.action==='connection'){
   const c=await this.stmt('SELECT * FROM friendships WHERE id = ? AND (member_a = ? OR member_b = ?)',action.id,me.id,me.id).first<FriendshipRow>();if(!c)throw new Error('FORBIDDEN');const other=c.member_a===me.id?c.member_b:c.member_a;await this.target(other);if(await this.blocked(me.id,other))throw new Error('FORBIDDEN');const statuses={accept:'accepted',decline:'declined',cancel:'cancelled',remove:'removed'};
   if(['accept','decline'].includes(action.decision)&&(c.status!=='pending'||c.requester===me.id))throw new Error('FORBIDDEN');if(action.decision==='cancel'&&(c.status!=='pending'||c.requester!==me.id))throw new Error('FORBIDDEN');if(action.decision==='remove'&&c.status!=='accepted')throw new Error('FORBIDDEN');const result=await this.stmt('UPDATE friendships SET status = ?, updated_at = ? WHERE id = ? AND status = ?',statuses[action.decision],now,c.id,c.status).run();if(!result.meta.changes)throw new Error('CONFLICT');if(action.decision==='remove')await this.stmt('DELETE FROM chat_preferences WHERE (member=? AND target=?) OR (member=? AND target=?)',me.id,other,other,me.id).run();return {saved:true};
  }
  if(action.action==='message'){
   const {peer}=await this.readable(action.conversation,me);if(JSON.parse(peer.privacy).messages==='Nobody')throw new Error('FORBIDDEN');if(action.replyId){const reply=await this.stmt('SELECT id FROM chat_messages WHERE id = ? AND conversation = ? AND deleted = 0',action.replyId,action.conversation).first();if(!reply)throw new Error('INVALID');}
   const exists=await this.stmt('SELECT id, author, conversation FROM chat_messages WHERE id = ?',action.clientId).first<{id:string;author:string;conversation:string}>();if(exists){if(exists.author!==me.id||exists.conversation!==action.conversation)throw new Error('FORBIDDEN');return {saved:true};}
   // INSERT SELECT rechecks mutual connection, restrictions and blocks in the same statement as the write.
   const r=await this.stmt("INSERT INTO chat_messages (id, conversation, author, body, reply_id, deleted, created_at) SELECT ?, ?, ?, ?, ?, 0, ? WHERE EXISTS (SELECT 1 FROM friendships f WHERE f.id = ? AND f.status = 'accepted' AND (f.member_a = ? OR f.member_b = ?)) AND EXISTS (SELECT 1 FROM members m WHERE m.id = ? AND m.status = 'active' AND json_extract(m.privacy, '$.messages') != 'Nobody') AND EXISTS (SELECT 1 FROM members m WHERE m.id = ? AND m.status = 'active') AND NOT EXISTS (SELECT 1 FROM member_blocks b WHERE (b.blocker = ? AND b.blocked = ?) OR (b.blocker = ? AND b.blocked = ?))",action.clientId,action.conversation,me.id,action.body,action.replyId||null,now,action.conversation,me.id,me.id,peer.id,me.id,me.id,peer.id,peer.id,me.id).run();if(!r.meta.changes)throw new Error('FORBIDDEN');return {saved:true};
  }
  if(action.action==='disappearing'){
   const {peer}=await this.readable(action.conversation,me);
   await this.stmt('INSERT INTO chat_preferences(member,target,pinned,favorite,disappearing,updated_at) VALUES(?,?,0,0,?,?) ON CONFLICT(member,target) DO UPDATE SET disappearing=excluded.disappearing,updated_at=excluded.updated_at',me.id,peer.id,action.enabled?1:0,now).run();return {saved:true};
  }
  if(action.action==='read'){
   await this.readable(action.conversation,me);const ids=action.ids;
   const where=ids?(ids.length?` AND id IN (${ids.map(()=>'?').join(',')})`:' AND 0'):'';
   await this.db.batch([
    this.stmt('INSERT INTO chat_presence(member,conversation,touched_at) VALUES(?,?,?) ON CONFLICT(member,conversation) DO UPDATE SET touched_at=excluded.touched_at',me.id,action.conversation,now),
    this.stmt('UPDATE chat_messages SET receiver_read_at=COALESCE(receiver_read_at,?) WHERE conversation=? AND author!=?'+where,now,action.conversation,me.id,...(ids||[])),
    this.stmt('UPDATE friendships SET read_a=CASE WHEN member_a=? THEN ? ELSE read_a END,read_b=CASE WHEN member_b=? THEN ? ELSE read_b END WHERE id=?',me.id,now,me.id,now,action.conversation)
   ]);return {saved:true};
  }
  if(action.action==='leaveChat'){
   await this.readable(action.conversation,me);await this.db.batch([
    this.stmt('UPDATE chat_messages SET receiver_read_at=COALESCE(receiver_read_at,?) WHERE conversation=? AND author!=? AND id IN ('+(action.ids?.length?action.ids.map(()=>'?').join(','):'NULL')+')',now,action.conversation,me.id,...(action.ids||[])),
    this.stmt('DELETE FROM chat_presence WHERE member=? AND conversation=?',me.id,action.conversation),
    this.stmt('DELETE FROM chat_messages WHERE conversation=? AND author!=? AND disappearing=1 AND receiver_read_at IS NOT NULL',action.conversation,me.id)
   ]);return {saved:true};
  }
  if(action.action==='delete'||action.action==='reaction'){
   const m=await this.stmt('SELECT * FROM chat_messages WHERE id = ?',action.id).first<any>();if(!m)throw new Error('NOT_FOUND');await this.readable(m.conversation,me);
   if(action.action==='delete'){if(m.author!==me.id)throw new Error('FORBIDDEN');await this.db.batch([this.stmt("UPDATE chat_messages SET body = '', deleted = 1 WHERE id = ? AND author = ?",m.id,me.id),this.stmt('DELETE FROM chat_reactions WHERE message = ?',m.id)]);}
   else {if(m.deleted)throw new Error('INVALID');const id=m.id+':'+me.id,old=await this.stmt('SELECT emoji FROM chat_reactions WHERE id = ?',id).first<{emoji:string}>();if(old?.emoji===action.emoji)await this.stmt('DELETE FROM chat_reactions WHERE id = ?',id).run();else await this.stmt('INSERT INTO chat_reactions (id, message, member, emoji) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET emoji = excluded.emoji',id,m.id,me.id,action.emoji).run();}return {saved:true};
  }
  if(action.action==='block'){if(action.target===me.id)throw new Error('INVALID');await this.target(action.target);await this.db.batch([this.stmt('INSERT INTO member_blocks (id, blocker, blocked, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',me.id+':'+action.target,me.id,action.target,now),this.stmt("UPDATE friendships SET status = 'removed', updated_at = ? WHERE id = ?",now,this.pair(me.id,action.target)),this.stmt('DELETE FROM chat_preferences WHERE (member=? AND target=?) OR (member=? AND target=?)',me.id,action.target,action.target,me.id)]);return {saved:true};}
  if(action.action==='unblock'){await this.stmt('DELETE FROM member_blocks WHERE blocker = ? AND blocked = ?',me.id,action.target).run();return {saved:true};}
  if(action.action==='report'){await this.target(action.target);if(me.id===action.target)throw new Error('INVALID');const id=crypto.randomUUID();await this.stmt('INSERT INTO reports (id, owner, target, category, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',id,this.owner,action.target,action.category,action.description,'Pending',now).run();return {saved:true,id};}
  throw new Error('INVALID');
 }
}
