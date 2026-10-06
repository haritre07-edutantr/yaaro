// Broadcast invalidations, never private content. Reads remain permission-checked APIs.
import {env} from 'cloudflare:workers';
export async function publishSpaceChange(space:string){if(!env.SPACE_HUB)return;await env.SPACE_HUB.get(env.SPACE_HUB.idFromName(space)).fetch(new Request('https://hub/change',{method:'POST'}));}
