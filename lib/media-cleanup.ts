export async function cleanupQueuedMedia(database:D1Database,bucket:R2Bucket){
 const rows=await database.prepare('SELECT storage_key FROM media_cleanup LIMIT 30').all<{storage_key:string}>();
 await Promise.allSettled(rows.results.map(async row=>{
  await bucket.delete(row.storage_key);
  await database.prepare('DELETE FROM media_cleanup WHERE storage_key=?').bind(row.storage_key).run();
 }));
}
