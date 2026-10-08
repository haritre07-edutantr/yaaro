// Keep only an anonymous member stub where shared threads or safety reports reference it.
export async function eraseAccountData(db:D1Database,owner:string){
 const pending=await db.prepare('SELECT member FROM account_deletions WHERE owner=?').bind(owner).first<{member:string|null}>();
 const person=await db.prepare('SELECT id FROM members WHERE owner=?').bind(owner).first<{id:string}>();
 const member=person?.id||pending?.member;
 if(member&&await db.prepare('SELECT id FROM interest_spaces WHERE owner=? LIMIT 1').bind(member).first())throw Error('OWNER_TRANSFER');
 const statements:D1PreparedStatement[]=[];
 const add=(sql:string,...values:unknown[])=>statements.push(db.prepare(sql).bind(...values));
 add('INSERT OR IGNORE INTO account_deletions(owner,member,requested_at) VALUES(?,?,?)',owner,member||null,Date.now());
 if(member){
  const conversations='SELECT id FROM friendships WHERE member_a=? OR member_b=?';
  add('INSERT OR IGNORE INTO media_cleanup SELECT photo_key FROM members WHERE id=? AND photo_key IS NOT NULL',member);
  add('INSERT OR IGNORE INTO media_cleanup SELECT photo_key FROM member_moments WHERE author=? AND photo_key IS NOT NULL',member);
  add(`INSERT OR IGNORE INTO media_cleanup SELECT storage_key FROM chat_media WHERE conversation IN (${conversations})`,member,member);
  add('DELETE FROM native_push_jobs WHERE sender=? OR recipient=?',member,member);
  add('DELETE FROM native_devices WHERE member=?',member);
  add('DELETE FROM explore_sessions WHERE member_a=? OR member_b=?',member,member);
  add('DELETE FROM explore_queue WHERE member=?',member);
  add('DELETE FROM call_sessions WHERE caller=? OR callee=?',member,member);
  add(`DELETE FROM chat_reactions WHERE member=? OR message IN(SELECT id FROM chat_messages WHERE conversation IN (${conversations}))`,member,member,member);
  add(`DELETE FROM chat_messages WHERE conversation IN (${conversations})`,member,member);
  add(`DELETE FROM chat_presence WHERE member=? OR conversation IN (${conversations})`,member,member,member);
  add('DELETE FROM friendships WHERE member_a=? OR member_b=?',member,member);
  for(const table of ['chat_preferences','member_blocks'])add(`DELETE FROM ${table} WHERE ${table==='chat_preferences'?'member=? OR target=?':'blocker=? OR blocked=?'}`,member,member);
  add('DELETE FROM member_moments WHERE author=?',member);
  for(const table of ['moment_recipients','moment_views','space_votes','space_likes','space_saves','space_rsvps','space_channel_follows','space_discussion_follows','space_invite_redemptions'])add(`DELETE FROM ${table} WHERE member=?`,member);
  add('DELETE FROM chat_media_views WHERE viewer=?',member);
  add('DELETE FROM space_invite_redemptions WHERE token_hash IN(SELECT token_hash FROM space_invites WHERE creator=?)',member);
  add('DELETE FROM space_invites WHERE creator=?',member);
  add("UPDATE space_posts SET body='',options=NULL,deleted=1,pinned=0,accepted_reply=NULL WHERE author=?",member);
  add("UPDATE space_messages SET body='',deleted=1 WHERE author=?",member);
  add('DELETE FROM space_resources WHERE author=?',member);
  add('DELETE FROM space_events WHERE host=?',member);
  add('DELETE FROM space_notifications WHERE recipient=?',member);
  add('DELETE FROM space_members WHERE member=?',member);
  add("UPDATE members SET owner=?,name='Deleted account',dob='',languages='[]',interests='[]',bio='',vibe='',avatar='',photo_key=NULL,region='Prefer not to say',privacy=?,published=0,status='deleted',last_seen=0 WHERE id=?",'deleted:'+member,JSON.stringify({messages:'Nobody',calls:'Nobody',requests:'Nobody',discover:'Nobody',online:'Nobody'}),member);
 }
 for(const table of ['demo_workspaces','business_waitlist','product_events'])add(`DELETE FROM ${table} WHERE owner=?`,owner);
 // Safety evidence remains for abuse investigations; remove authentication identifiers.
 add('UPDATE reports SET owner=? WHERE owner=?','deleted-account',owner);
 add('UPDATE audit_logs SET actor=? WHERE actor=?','deleted-account',owner);
 await db.batch(statements);
 return member;
}
