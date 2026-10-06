import {z} from 'zod';
import {languages,interests,vibes} from './data';
import {profileRegionSchema,type Member} from './community-model';
export const exploreFilters=z.object({mode:z.enum(['text','voice','video']),language:z.string().refine(v=>!v||languages.includes(v)).default(''),vibe:z.string().refine(v=>!v||vibes.some(x=>x[1]===v)).default(''),interest:z.string().refine(v=>!v||interests.includes(v)).default(''),region:profileRegionSchema.transform(v=>v==='Prefer not to say'?'':v).default('')});
const ticket=z.string().uuid(),session=z.string().regex(/^explore:[a-f0-9-]{36}$/);
export const exploreAction=z.discriminatedUnion('action',[
 z.object({action:z.literal('join'),filters:exploreFilters}),
 z.object({action:z.literal('pulse'),ticket}),
 z.object({action:z.literal('cancel'),ticket}),
 z.object({action:z.literal('end'),ticket,session}),
 z.object({action:z.literal('decision'),ticket,session,decision:z.enum(['request','skip'])}),
 z.object({action:z.literal('message'),ticket,session,id:z.string().uuid(),body:z.string().trim().min(1).max(2000)})
]);
export type ExploreState={ticket?:string;waiting:boolean;session?:{id:string;mode:'text'|'voice'|'video';state:'active'|'ended';peer:Member;caller:boolean;decision:'pending'|'request'|'skip';messages:{id:string;author:string;body:string;createdAt:number}[]};expired?:boolean};
