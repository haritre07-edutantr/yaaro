import {readFileSync} from 'node:fs';
const config=JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
const problems=[];
if(config.d1_databases?.some(d=>d.database_id==='00000000-0000-4000-8000-000000000000'))problems.push('Create your own Cloudflare D1 database and put its database_id in wrangler.jsonc.');
if(!config.vars?.PUBLIC_APP_ORIGIN?.startsWith('https://'))problems.push('Set PUBLIC_APP_ORIGIN to your exact HTTPS deployment origin.');
if(!config.vars?.SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_'))problems.push('Set SUPABASE_PUBLISHABLE_KEY to the Supabase publishable key (never a secret/service-role key).');
if(problems.length){console.error(problems.join('\n'));process.exit(1);}
console.log('Deployment configuration passed. Ensure D1 migrations and the R2 bucket are provisioned before publishing.');
