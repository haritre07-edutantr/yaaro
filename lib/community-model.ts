import {z} from 'zod';
import {vibes,languages,interests} from './data';
export const avatars=['😌','🎧','🌻','🎮','☕','💡','🌊','✨'] as const;
export const regions=['Prefer not to say','Bengaluru','Chennai','Coimbatore','Hyderabad','Kochi','Mumbai','Delhi','Pune','Other region'];
const preference=z.enum(['Everyone','Connections only','Nobody']);
export const privacySchema=z.object({messages:z.enum(['Connections only','Nobody']).default('Connections only'),calls:z.enum(['Connections only','Nobody']).default('Connections only'),requests:preference.default('Everyone'),discover:preference.default('Everyone'),online:preference.default('Connections only')});
export const defaults=privacySchema.parse({});
export const profileSchema=z.object({name:z.string().trim().min(1).max(40),dob:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),languages:z.array(z.string().refine(x=>languages.includes(x))).min(1).max(10).refine(x=>new Set(x).size===x.length),interests:z.array(z.string().refine(x=>interests.includes(x))).min(3).max(16).refine(x=>new Set(x).size===x.length),bio:z.string().trim().max(250),vibe:z.string().refine(x=>vibes.some(v=>v[1]===x)),avatar:z.enum(avatars),region:z.string().refine(x=>regions.includes(x))});
export type CommunityProfile=z.infer<typeof profileSchema>;
export type Privacy=z.infer<typeof privacySchema>;
export type Member={id:string;name:string;age:number;languages:string[];interests:string[];bio:string;vibe:string;avatar:CommunityProfile['avatar'];region:string;online:boolean;photoUrl?:string};
export type Self=Member&{dob:string;privacy:Privacy;published:boolean;status:string};
export type Friendship={id:string;status:string;requester:string;updatedAt:number;person:Member};
export type ChatMessage={id:string;author:string;body:string;replyId:string|null;deleted:number;createdAt:number;reactions:{emoji:string;count:number;mine:boolean}[];read:boolean};
export type Snapshot={me:Self|null;people:Member[];connections:Friendship[];blocked:Member[];hasMore:boolean};
export const actionSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('profile'),profile:profileSchema,consent:z.literal(true)}),
 z.object({action:z.literal('privacy'),privacy:privacySchema,published:z.boolean()}),
 z.object({action:z.literal('request'),target:z.string().uuid()}),
 z.object({action:z.literal('connection'),id:z.string().max(100),decision:z.enum(['accept','decline','cancel','remove'])}),
 z.object({action:z.literal('message'),conversation:z.string().max(100),body:z.string().trim().min(1).max(2000),replyId:z.string().uuid().optional(),clientId:z.string().uuid()}),
 z.object({action:z.literal('delete'),id:z.string().uuid()}),
 z.object({action:z.literal('reaction'),id:z.string().uuid(),emoji:z.enum(['💙','😂','🎉','👍'])}),
 z.object({action:z.literal('read'),conversation:z.string().max(100)}),
 z.object({action:z.literal('block'),target:z.string().uuid()}),
 z.object({action:z.literal('unblock'),target:z.string().uuid()}),
 z.object({action:z.literal('report'),target:z.string().uuid(),category:z.enum(['Harassment','Spam','Scam/Fraud','Sexual Content','Threats','Fake Profile','Impersonation','Underage Safety Concern','Other']),description:z.string().max(2000)}),
 z.object({action:z.literal('presence')})
]);
export type Action=z.infer<typeof actionSchema>;
export function adultAge(dob:string,now=Date.now()){const d=new Date(`${dob}T00:00:00Z`),t=new Date(now);if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==dob)throw new Error('INVALID');let age=t.getUTCFullYear()-d.getUTCFullYear();if(t.getUTCMonth()<d.getUTCMonth()||(t.getUTCMonth()===d.getUTCMonth()&&t.getUTCDate()<d.getUTCDate()))age--;if(age<18||age>110)throw new Error('AGE');return age;}
