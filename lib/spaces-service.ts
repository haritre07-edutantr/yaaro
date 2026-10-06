import {CommunityService} from './community-service';
import type {SpaceAction,Space,SpaceDetail,SpacePost,SpaceNotice} from './spaces-model';
const uuidSQL="lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-'||lower(hex(randomblob(2)))||'-'||lower(hex(randomblob(2)))||'-'||lower(hex(randomblob(6)))";
export class SpacesService{
 private people:CommunityService;
 constructor(private db:D1Database,private owner:string){this.people=new CommunityService(db,owner);}
 private stmt(sql:string,...values:any[]){return this.db.prepare(sql).bind(...values);}
 private async me(){return this.people.memberId();}
 private excluded="NOT EXISTS(SELECT 1 FROM member_blocks b WHERE (b.blocker=? AND b.blocked=m.id) OR (b.blocker=m.id AND b.blocked=?))";
 private spaceSelect=`SELECT s.*,COALESCE(sm.status,'') AS myStatus,COALESCE(sm.role,'') AS myRole,COALESCE(sm.muted_until,0) AS mutedUntil,COALESCE(sm.notifications,1) AS notificationsEnabled,
 (SELECT COUNT(*) FROM space_members c JOIN members p ON p.id=c.member AND p.status='active' WHERE c.space=s.id AND c.status='active') AS memberCount,
 (SELECT COUNT(*) FROM space_posts p WHERE p.space=s.id AND p.parent IS NULL AND p.deleted=0) AS postCount
 FROM interest_spaces s LEFT JOIN space_members sm ON sm.space=s.id AND sm.member=?`;
 async list(filters:{q?:string;topic?:string;mine?:boolean;offset?:number}={}){
  const me=await this.me(),conditions=["EXISTS(SELECT 1 FROM members WHERE id=s.owner AND status='active')","COALESCE(sm.status,'')!='banned'","NOT EXISTS(SELECT 1 FROM member_blocks WHERE (blocker=? AND blocked=s.owner) OR (blocker=s.owner AND blocked=?))"],values:any[]=[me,me,me];
  if(filters.q){conditions.push('(s.name LIKE ? ESCAPE \'\\\' OR s.description LIKE ? ESCAPE \'\\\')');const q='%'+filters.q.replace(/[\\%_]/g,'\\$&')+'%';values.push(q,q);}
  if(filters.topic){conditions.push('s.topic=?');values.push(filters.topic);}if(filters.mine)conditions.push("sm.status IN ('active','pending')");
  const rows=await this.stmt(this.spaceSelect+' WHERE '+conditions.join(' AND ')+' ORDER BY s.updated_at DESC,s.id LIMIT 25 OFFSET ?',...values,filters.offset||0).all<Space>();
  return {spaces:rows.results.slice(0,24),hasMore:rows.results.length>24};
 }
 async access(id:string,joined=true){const me=await this.me();const space=await this.stmt(this.spaceSelect+' WHERE s.id=?',me,id).first<Space>();if(!space)throw Error('NOT_FOUND');const host=await this.stmt("SELECT id FROM members WHERE id=? AND status='active'",space.owner).first();const blocked=await this.stmt('SELECT id FROM member_blocks WHERE (blocker=? AND blocked=?) OR (blocker=? AND blocked=?)',me,space.owner,space.owner,me).first();if(!host||blocked||space.myStatus==='banned'||(joined&&space.myStatus!=='active'))throw Error('FORBIDDEN');return {me,space,staff:space.myRole==='owner'||space.myRole==='moderator'};}
 private writable(space:Space){if(space.mutedUntil>Date.now())throw Error('SPACE_MUTED');}
 async detail(id:string):Promise<SpaceDetail>{
  const {me,space,staff}=await this.access(id,false);
  const empty={space,channels:[],members:[],events:[],resources:[],reports:[]};if(space.myStatus!=='active')return empty;
  const [channels,members,events,resources,reports]=await Promise.all([
   this.stmt('SELECT id,name,description FROM space_channels WHERE space=? ORDER BY created_at,id LIMIT 12',id).all<any>(),
   this.stmt(`SELECT m.id,m.name,sm.role,sm.status,sm.muted_until AS mutedUntil FROM space_members sm JOIN members m ON m.id=sm.member AND m.status='active' WHERE sm.space=? AND ${staff?"sm.status IN ('active','pending','banned')":"sm.status='active'"} AND ${this.excluded} ORDER BY CASE sm.role WHEN 'owner' THEN 0 WHEN 'moderator' THEN 1 ELSE 2 END,m.name LIMIT 100`,id,me,me).all<any>(),
   this.stmt(`SELECT e.*,m.name AS hostName,(SELECT COUNT(*) FROM space_rsvps WHERE event=e.id AND response='going') AS going,(SELECT COUNT(*) FROM space_rsvps WHERE event=e.id AND response='interested') AS interested,(SELECT response FROM space_rsvps WHERE event=e.id AND member=?) AS myRsvp FROM space_events e JOIN members m ON m.id=e.host AND m.status='active' WHERE e.space=? AND ${this.excluded} AND NOT EXISTS(SELECT 1 FROM space_members WHERE space=e.space AND member=e.host AND status='banned') ORDER BY e.cancelled,e.starts_at>=? DESC,e.starts_at LIMIT 40`,me,id,me,me,Date.now()).all<any>(),
   this.stmt(`SELECT r.*,m.name AS authorName FROM space_resources r JOIN members m ON m.id=r.author AND m.status='active' WHERE r.space=? AND ${this.excluded} AND NOT EXISTS(SELECT 1 FROM space_members WHERE space=r.space AND member=r.author AND status='banned') ORDER BY r.created_at DESC,r.id LIMIT 60`,id,me,me).all<any>(),
   staff?this.stmt("SELECT id,target,post,resource,evidence,category,description,created_at FROM space_reports WHERE space=? AND status='pending' ORDER BY created_at LIMIT 50",id).all<any>():Promise.resolve({results:[]})
  ]);return {space,channels:channels.results,members:members.results,events:events.results,resources:resources.results,reports:reports.results};
 }
 async posts(id:string,filters:{channel?:string;parent?:string;saved?:boolean;before?:number;cursor?:string;post?:string}={}){
  const {me}=await this.access(id);const where=['p.space=?','p.deleted=0',"m.status='active'",this.excluded,"NOT EXISTS(SELECT 1 FROM space_members banned WHERE banned.space=p.space AND banned.member=p.author AND banned.status='banned')"],v:any[]=[me,me,id,me,me];
  if(filters.post){await this.readPost(id,filters.post,me);where.push('p.id=?');v.push(filters.post);}else if(filters.parent){const parent=await this.readPost(id,filters.parent,me);if(parent.parent)throw Error('INVALID');where.push('p.parent=?');v.push(filters.parent);}else if(!filters.saved)where.push('p.parent IS NULL');
  if(filters.channel){where.push('p.channel=?');v.push(filters.channel);}if(filters.saved){where.push('EXISTS(SELECT 1 FROM space_saves WHERE post=p.id AND member=?)');v.push(me);}if(filters.before){where.push('(p.created_at<? OR (p.created_at=? AND p.id<?))');v.push(filters.before,filters.before,filters.cursor||'');}
  const rows=await this.stmt(`SELECT p.*,m.name AS authorName,COALESCE(sm.role,'member') AS authorRole,
  (SELECT COUNT(*) FROM space_likes WHERE post=p.id) AS likes,EXISTS(SELECT 1 FROM space_likes WHERE post=p.id AND member=?) AS liked,
  EXISTS(SELECT 1 FROM space_saves WHERE post=p.id AND member=?) AS saved,
  (SELECT COUNT(*) FROM space_posts r JOIN members rm ON rm.id=r.author AND rm.status='active' WHERE r.parent=p.id AND r.deleted=0 AND NOT EXISTS(SELECT 1 FROM member_blocks WHERE (blocker=? AND blocked=r.author) OR (blocker=r.author AND blocked=?)) AND NOT EXISTS(SELECT 1 FROM space_members WHERE space=r.space AND member=r.author AND status='banned')) AS replies,
  (SELECT choice FROM space_votes WHERE post=p.id AND member=?) AS myVote
  FROM space_posts p JOIN members m ON m.id=p.author LEFT JOIN space_members sm ON sm.space=p.space AND sm.member=p.author
  WHERE ${where.join(' AND ')} ORDER BY ${filters.parent||filters.before?'p.created_at DESC':'p.pinned DESC,p.created_at DESC'},p.id DESC LIMIT 31`,me,me,me,me,me,...v.slice(2)).all<any>();
  const ids=rows.results.slice(0,30).filter(p=>p.kind==='poll').map(p=>p.id);
  const counts=ids.length?await this.stmt(`SELECT post,choice,COUNT(*) AS n FROM space_votes WHERE post IN (${ids.map(()=>'?').join(',')}) GROUP BY post,choice`,...ids).all<any>():{results:[]};
  const visibleRows=rows.results.slice(0,30);if(filters.parent)visibleRows.reverse();const posts:SpacePost[]=visibleRows.map(p=>{const options=p.options?JSON.parse(p.options):[];return {...p,options,liked:!!p.liked,saved:!!p.saved,votes:options.map((_:string,n:number)=>counts.results.find(c=>c.post===p.id&&c.choice===n)?.n||0),myVote:p.myVote??null};});return {posts,hasMore:rows.results.length>30};
 }
 async members(id:string,filters:{q?:string;status?:string;offset?:number}={}){
  const {me,staff}=await this.access(id);const status=staff?(filters.status||'active'):'active';
  const q='%'+(filters.q||'').replace(/[\\%_]/g,'\\$&')+'%';
  const rows=await this.stmt(`SELECT m.id,m.name,sm.role,sm.status,sm.muted_until AS mutedUntil FROM space_members sm JOIN members m ON m.id=sm.member AND m.status='active' WHERE sm.space=? AND sm.status=? AND m.name LIKE ? ESCAPE '\\' AND ${this.excluded} ORDER BY m.name,m.id LIMIT 31 OFFSET ?`,id,status,q,me,me,filters.offset||0).all<any>();return {members:rows.results.slice(0,30),hasMore:rows.results.length>30};
 }
 async resources(id:string,filters:{q?:string;offset?:number}={}){
  const {me}=await this.access(id);const q='%'+(filters.q||'').replace(/[\\%_]/g,'\\$&')+'%';
  const rows=await this.stmt(`SELECT r.*,m.name AS authorName FROM space_resources r JOIN members m ON m.id=r.author AND m.status='active' WHERE r.space=? AND (r.title LIKE ? ESCAPE '\\' OR r.description LIKE ? ESCAPE '\\') AND ${this.excluded} AND NOT EXISTS(SELECT 1 FROM space_members WHERE space=r.space AND member=r.author AND status='banned') ORDER BY r.created_at DESC,r.id LIMIT 21 OFFSET ?`,id,q,q,me,me,filters.offset||0).all<any>();return {resources:rows.results.slice(0,20),hasMore:rows.results.length>20};
 }
 private async readPost(space:string,id:string,me:string){const p=await this.stmt(`SELECT p.* FROM space_posts p JOIN members m ON m.id=p.author AND m.status='active' WHERE p.id=? AND p.space=? AND p.deleted=0 AND ${this.excluded} AND NOT EXISTS(SELECT 1 FROM space_members WHERE space=p.space AND member=p.author AND status='banned')`,id,space,me,me).first<any>();if(!p)throw Error('NOT_FOUND');return p;}
 private notify(space:string,title:string,body:string,recipient?:string){return this.stmt(`INSERT INTO space_notifications(id,recipient,space,title,body,created_at) SELECT ${uuidSQL},member,space,?,?,? FROM space_members WHERE space=? AND status='active' AND notifications=1 ${recipient?'AND member=?':''}`,title,body,Date.now(),space,...recipient?[recipient]:[]);}
 private async audit(me:string,action:string,target:string){await this.stmt('INSERT INTO audit_logs(id,actor,action,target,created_at) VALUES(?,?,?,?,?)',crypto.randomUUID(),me,'community:'+action,target,Date.now()).run();}
 async activity(){const me=await this.me();return {activity:(await this.stmt(`SELECT n.*,s.name AS spaceName FROM space_notifications n JOIN interest_spaces s ON s.id=n.space WHERE n.recipient=? AND EXISTS(SELECT 1 FROM space_members WHERE space=n.space AND member=n.recipient AND status='active') AND EXISTS(SELECT 1 FROM members WHERE id=s.owner AND status='active') AND NOT EXISTS(SELECT 1 FROM member_blocks WHERE (blocker=n.recipient AND blocked=s.owner) OR (blocker=s.owner AND blocked=n.recipient)) ORDER BY n.created_at DESC,n.id LIMIT 50`,me).all<SpaceNotice>()).results};}
 async act(a:SpaceAction){
  const me=await this.me(),now=Date.now();
  if(a.action==='readActivity'){await this.stmt(`UPDATE space_notifications SET seen=1 WHERE recipient=? AND id IN (${a.ids.map(()=>'?').join(',')})`,me,...a.ids).run();return {saved:true};}
  if(a.action==='create'){
   const prior=await this.stmt('SELECT owner FROM interest_spaces WHERE id=?',a.id).first<{owner:string}>();if(prior){if(prior.owner!==me)throw Error('FORBIDDEN');return {id:a.id};}
   const count=await this.stmt('SELECT COUNT(*) AS n FROM interest_spaces WHERE owner=?',me).first<{n:number}>();if((count?.n||0)>=10)throw Error('SPACE_LIMIT');
   const d=a.details;await this.db.batch([
    this.stmt('INSERT INTO interest_spaces(id,owner,name,description,topic,language,access,rules,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',a.id,me,d.name,d.description,d.topic,d.language,d.access,d.rules,now,now),
    this.stmt("INSERT INTO space_members(space,member,role,status,joined_at) VALUES(?,?,'owner','active',?)",a.id,me,now),
    ...[['General','The main conversation.'],['Introductions','Say hello and find common ground.'],['Ask & share','Questions, ideas and useful discoveries.']].map(([name,description],n)=>this.stmt('INSERT INTO space_channels(id,space,name,description,created_at) VALUES(?,?,?,?,?)',crypto.randomUUID(),a.id,name,description,now+n))
   ]);await this.audit(me,'created',a.id);return {id:a.id};
  }
  const {space,staff}=await this.access(a.space,!['join','leave'].includes(a.action));
  if(a.action==='join'){
   if(space.myStatus==='active'||space.myStatus==='pending')return {saved:true};
   await this.stmt("INSERT INTO space_members(space,member,role,status,joined_at) VALUES(?,?,'member',?,?) ON CONFLICT(space,member) DO UPDATE SET status=excluded.status,role='member',muted_until=0,notifications=1,joined_at=excluded.joined_at WHERE space_members.status IN ('left','declined')",space.id,me,space.access==='open'?'active':'pending',now).run();
   if(space.access==='approval')await this.notify(space.id,'New membership request','Someone wants to join your community. Review them in Members.',space.owner).run();return {saved:true};
  }
  if(a.action==='communityNotifications'){await this.stmt('UPDATE space_members SET notifications=? WHERE space=? AND member=?',a.enabled?1:0,space.id,me).run();return {saved:true};}
  if(a.action==='answer'){const p=await this.readPost(space.id,a.post,me);if(p.kind!=='question'||p.parent||(p.author!==me&&!staff))throw Error('FORBIDDEN');if(a.reply){const reply=await this.readPost(space.id,a.reply,me);if(reply.parent!==p.id)throw Error('INVALID');}await this.stmt('UPDATE space_posts SET accepted_reply=? WHERE id=?',a.reply,p.id).run();return {saved:true};}
  if(a.action==='leave'){if(!['active','pending'].includes(space.myStatus||''))throw Error('FORBIDDEN');if(space.myRole==='owner')throw Error('OWNER_TRANSFER');await this.stmt("UPDATE space_members SET status='left',role='member' WHERE space=? AND member=?",space.id,me).run();return {saved:true};}
  if(a.action==='edit'){if(space.myRole!=='owner')throw Error('FORBIDDEN');const d=a.details;await this.stmt('UPDATE interest_spaces SET name=?,description=?,topic=?,language=?,access=?,rules=?,updated_at=? WHERE id=? AND owner=?',d.name,d.description,d.topic,d.language,d.access,d.rules,now,space.id,me).run();await this.audit(me,'settings',space.id);return {saved:true};}
  if(a.action==='membership'){
   if(!staff||a.member===me||a.member===space.owner)throw Error('FORBIDDEN');const target=await this.stmt('SELECT role,status FROM space_members WHERE space=? AND member=?',space.id,a.member).first<{role:string;status:string}>();if(!target)throw Error('NOT_FOUND');
   const ownerOnly=['moderator','member','transfer'];if((ownerOnly.includes(a.decision)||target.role!=='member')&&space.myRole!=='owner')throw Error('FORBIDDEN');
   if(a.decision==='transfer'){
    if(target.status!=='active')throw Error('FORBIDDEN');await this.db.batch([
     this.stmt("UPDATE space_members SET role='moderator' WHERE space=? AND member=? AND role='owner'",space.id,me),
     this.stmt("UPDATE space_members SET role='owner' WHERE space=? AND member=? AND status='active' AND EXISTS(SELECT 1 FROM interest_spaces WHERE id=? AND owner=?)",space.id,a.member,space.id,me),
     this.stmt('UPDATE interest_spaces SET owner=?,updated_at=? WHERE id=? AND owner=?',a.member,now,space.id,me)]);
   }else if(a.decision==='moderator'||a.decision==='member'){if(target.status!=='active')throw Error('FORBIDDEN');await this.stmt('UPDATE space_members SET role=? WHERE space=? AND member=?',a.decision,space.id,a.member).run();
   }else if(a.decision==='mute'||a.decision==='unmute'){if(target.status!=='active')throw Error('FORBIDDEN');await this.stmt('UPDATE space_members SET muted_until=? WHERE space=? AND member=?',a.decision==='mute'?now+86400000:0,space.id,a.member).run();
   }else{const expected=a.decision==='approve'||a.decision==='decline'?'pending':a.decision==='unban'?'banned':target.status;if(a.decision==='ban'&&!['active','pending'].includes(target.status))throw Error('FORBIDDEN');const next=a.decision==='approve'?'active':a.decision==='unban'?'left':a.decision==='decline'?'declined':'banned';const result=await this.stmt("UPDATE space_members SET status=?,role='member',muted_until=0 WHERE space=? AND member=? AND status=?",next,space.id,a.member,expected).run();if(!result.meta.changes)throw Error('CONFLICT');if(a.decision==='approve')await this.notify(space.id,'You’re in!','Your membership request was accepted. Introduce yourself and join the conversation.',a.member).run();}
   await this.audit(me,a.decision,space.id+':'+a.member);return {saved:true};
  }
  if(a.action==='channel'){if(!staff)throw Error('FORBIDDEN');const count=await this.stmt('SELECT COUNT(*) AS n FROM space_channels WHERE space=?',space.id).first<{n:number}>();if((count?.n||0)>=12)throw Error('SPACE_LIMIT');const duplicate=await this.stmt('SELECT id FROM space_channels WHERE space=? AND lower(name)=lower(?)',space.id,a.name).first();if(duplicate)throw Error('CONFLICT');await this.stmt('INSERT INTO space_channels(id,space,name,description,created_at) VALUES(?,?,?,?,?)',crypto.randomUUID(),space.id,a.name,a.description,now).run();await this.audit(me,'channel',space.id);return {saved:true};}
  if(a.action==='post'){
   this.writable(space);const channel=await this.stmt('SELECT id FROM space_channels WHERE id=? AND space=?',a.channel,space.id).first();if(!channel)throw Error('INVALID');
   if(a.parent){const parent=await this.readPost(space.id,a.parent,me);if(parent.parent||parent.channel!==a.channel||a.kind!=='discussion'||a.options)throw Error('INVALID');}
   if(a.kind==='announcement'&&(!staff||a.parent))throw Error('FORBIDDEN');if(a.kind==='poll'&&(a.parent||!a.options)||a.kind!=='poll'&&a.options)throw Error('INVALID');
   const prior=await this.stmt('SELECT author,space FROM space_posts WHERE id=?',a.id).first<{author:string;space:string}>();if(prior){if(prior.author!==me||prior.space!==space.id)throw Error('FORBIDDEN');return {saved:true};}
   await this.stmt('INSERT INTO space_posts(id,space,channel,author,parent,kind,body,options,poll_ends,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',a.id,space.id,a.channel,me,a.parent||null,a.kind,a.body,a.options?JSON.stringify(a.options):null,a.kind==='poll'?now+7*86400000:null,now).run();
   if(a.parent){const p=await this.readPost(space.id,a.parent,me);if(p.author!==me)await this.notify(space.id,'A new reply','Someone replied to your community conversation.',p.author).run();}
   if(a.kind==='announcement')await this.notify(space.id,'Community announcement',a.body.slice(0,160)).run();
   await this.stmt('UPDATE interest_spaces SET updated_at=? WHERE id=?',now,space.id).run();return {saved:true};
  }
  if(a.action==='postAction'){
   const p=await this.readPost(space.id,a.post,me);
   if(a.kind==='delete'){if(p.author!==me&&!staff)throw Error('FORBIDDEN');await this.db.batch([this.stmt('UPDATE space_posts SET deleted=1,body=?,options=NULL,pinned=0 WHERE id=? OR parent=?','',p.id,p.id),this.stmt('UPDATE space_posts SET accepted_reply=NULL WHERE accepted_reply=?',p.id),this.stmt('DELETE FROM space_votes WHERE post=?',p.id),this.stmt('DELETE FROM space_likes WHERE post=?',p.id),this.stmt('DELETE FROM space_saves WHERE post=?',p.id)]);await this.audit(me,'deletePost',p.id);}
   else if(a.kind==='pin'){if(!staff||p.parent)throw Error('FORBIDDEN');if(a.enabled&&!p.pinned){const count=await this.stmt('SELECT COUNT(*) AS n FROM space_posts WHERE space=? AND pinned=1 AND deleted=0',space.id).first<{n:number}>();if((count?.n||0)>=3)throw Error('SPACE_PIN_LIMIT');}await this.stmt('UPDATE space_posts SET pinned=? WHERE id=?',a.enabled?1:0,p.id).run();await this.audit(me,'pin',p.id);}
   else{if(a.kind==='like')this.writable(space);const table=a.kind==='like'?'space_likes':'space_saves';await (a.enabled?this.stmt(`INSERT OR IGNORE INTO ${table}(post,member) VALUES(?,?)`,p.id,me):this.stmt(`DELETE FROM ${table} WHERE post=? AND member=?`,p.id,me)).run();}return {saved:true};
  }
  if(a.action==='vote'){this.writable(space);const p=await this.readPost(space.id,a.post,me);if(p.kind!=='poll'||!p.poll_ends||p.poll_ends<=now||a.choice>=JSON.parse(p.options).length)throw Error('INVALID');await this.stmt('INSERT INTO space_votes(post,member,choice) VALUES(?,?,?) ON CONFLICT(post,member) DO UPDATE SET choice=excluded.choice',p.id,me,a.choice).run();return {saved:true};}
  if(a.action==='resource'){this.writable(space);const prior=await this.stmt('SELECT space,author FROM space_resources WHERE id=?',a.id).first<{space:string;author:string}>();if(prior){if(prior.space!==space.id||prior.author!==me)throw Error('FORBIDDEN');return {saved:true};}await this.stmt('INSERT OR IGNORE INTO space_resources(id,space,author,title,description,url,created_at) VALUES(?,?,?,?,?,?,?)',a.id,space.id,me,a.title,a.description,a.url,now).run();return {saved:true};}
  if(a.action==='removeResource'){const r=await this.stmt('SELECT author FROM space_resources WHERE id=? AND space=?',a.id,space.id).first<{author:string}>();if(!r)throw Error('NOT_FOUND');if(r.author!==me&&!staff)throw Error('FORBIDDEN');await this.stmt('DELETE FROM space_resources WHERE id=? AND space=?',a.id,space.id).run();await this.audit(me,'removeResource',a.id);return {saved:true};}
  if(a.action==='event'){if(!staff)throw Error('FORBIDDEN');if(a.startsAt<now+60000||a.startsAt>now+366*86400000)throw Error('INVALID');const prior=await this.stmt('SELECT space,host FROM space_events WHERE id=?',a.id).first<{space:string;host:string}>();if(prior){if(prior.space!==space.id||prior.host!==me)throw Error('FORBIDDEN');return {saved:true};}await this.stmt('INSERT INTO space_events(id,space,host,title,description,starts_at,duration,url,created_at) VALUES(?,?,?,?,?,?,?,?,?)',a.id,space.id,me,a.title,a.description,a.startsAt,a.duration,a.url,now).run();await this.notify(space.id,'A meetup is on the calendar',a.title).run();return {saved:true};}
  if(a.action==='cancelEvent'){if(!staff)throw Error('FORBIDDEN');const r=await this.stmt('UPDATE space_events SET cancelled=1,url=? WHERE id=? AND space=?','',a.id,space.id).run();if(!r.meta.changes)throw Error('NOT_FOUND');await this.notify(space.id,'A meetup was cancelled','Check Events for the updated schedule.').run();await this.audit(me,'cancelEvent',a.id);return {saved:true};}
  if(a.action==='rsvp'){this.writable(space);const event=await this.stmt('SELECT id FROM space_events WHERE id=? AND space=? AND cancelled=0 AND starts_at+duration*60000>?',a.event,space.id,now).first();if(!event)throw Error('NOT_FOUND');await (a.response==='remove'?this.stmt('DELETE FROM space_rsvps WHERE event=? AND member=?',a.event,me):this.stmt('INSERT INTO space_rsvps(event,member,response) VALUES(?,?,?) ON CONFLICT(event,member) DO UPDATE SET response=excluded.response',a.event,me,a.response)).run();return {saved:true};}
  if(a.action==='report'){
   if(a.target===me||a.post&&a.resource)throw Error('INVALID');let evidence='';if(a.post){const post=await this.readPost(space.id,a.post,me);if(post.author!==a.target)throw Error('INVALID');evidence=post.body.slice(0,1000);}else if(a.resource){const resource=await this.stmt('SELECT author,title,description,url FROM space_resources WHERE id=? AND space=?',a.resource,space.id).first<{author:string;title:string;description:string;url:string}>();if(!resource||resource.author!==a.target)throw Error('INVALID');const blocked=await this.stmt('SELECT id FROM member_blocks WHERE (blocker=? AND blocked=?) OR (blocker=? AND blocked=?)',me,a.target,a.target,me).first();if(blocked)throw Error('FORBIDDEN');evidence=(resource.title+'\n'+resource.description+'\n'+resource.url).slice(0,1600);}else{const member=await this.stmt("SELECT member FROM space_members WHERE space=? AND member=? AND status='active'",space.id,a.target).first();if(!member)throw Error('NOT_FOUND');}
   const desc=`Community ${space.id}${a.post?' / Post '+a.post:a.resource?' / Resource '+a.resource:''}: ${a.description}`;const prior=await this.stmt('SELECT reporter FROM space_reports WHERE id=?',a.id).first<{reporter:string}>();if(prior){if(prior.reporter!==me)throw Error('FORBIDDEN');return {saved:true};}
   await this.db.batch([this.stmt('INSERT INTO reports(id,owner,target,category,description,status,created_at) VALUES(?,?,?,?,?,?,?)',a.id,this.owner,a.target,a.category,desc,'Pending',now),this.stmt('INSERT INTO space_reports(id,space,post,resource,evidence,reporter,target,category,description,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',a.id,space.id,a.post||null,a.resource||null,evidence,me,a.target,a.category,a.description,now)]);await this.notify(space.id,'A safety report needs review','Open Manage to review a community report.',space.owner).run();return {saved:true};
  }
  if(a.action==='resolveReport'){if(!staff)throw Error('FORBIDDEN');const r=await this.stmt("UPDATE space_reports SET status='reviewed' WHERE id=? AND space=?",a.id,space.id).run();if(!r.meta.changes)throw Error('NOT_FOUND');await this.audit(me,'reviewReport',a.id);return {saved:true};}
  throw Error('INVALID');
 }
}
