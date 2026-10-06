import {z} from 'zod';
export const spaceTopics=['Music','Gaming','Career','Study','Technology','Movies','Travel','Art & creativity','Wellbeing','Entrepreneurship','Other'] as const;
const id=z.string().uuid(),body=z.string().trim().min(1).max(3000);
const safeUrl=z.string().trim().max(1200).refine(v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}},'Use an HTTPS link without embedded credentials');
export const spaceFeedFilter=z.enum(['all','unanswered','polls','announcements','pinned']);
export type SpaceFeedFilter=z.infer<typeof spaceFeedFilter>;
export const spaceDetails=z.object({name:z.string().trim().min(3).max(60),description:z.string().trim().min(20).max(700),topic:z.enum(spaceTopics),language:z.string().trim().min(2).max(40),access:z.enum(['open','approval']),rules:z.string().trim().min(20).max(2000)});
export const spaceAction=z.discriminatedUnion('action',[
 z.object({action:z.literal('create'),id,details:spaceDetails}),
 z.object({action:z.literal('communityNotifications'),space:id,enabled:z.boolean()}),
 z.object({action:z.literal('answer'),space:id,post:id,reply:id.nullable()}),
 z.object({action:z.literal('edit'),space:id,details:spaceDetails}),
 z.object({action:z.literal('join'),space:id}),z.object({action:z.literal('leave'),space:id}),
 z.object({action:z.literal('membership'),space:id,member:id,decision:z.enum(['approve','decline','ban','unban','moderator','member','transfer','mute','unmute'])}),
 z.object({action:z.literal('channel'),space:id,name:z.string().trim().min(2).max(30),description:z.string().trim().max(150)}),
 z.object({action:z.literal('post'),space:id,id,channel:id,kind:z.enum(['discussion','question','announcement','poll']),body,options:z.array(z.string().trim().min(1).max(80)).min(2).max(4).refine(v=>new Set(v).size===v.length).optional(),parent:id.optional()}),
 z.object({action:z.literal('postAction'),space:id,post:id,kind:z.enum(['like','save','pin','delete']),enabled:z.boolean()}),
 z.object({action:z.literal('vote'),space:id,post:id,choice:z.number().int().min(0).max(3)}),
 z.object({action:z.literal('resource'),space:id,id,title:z.string().trim().min(3).max(100),description:z.string().trim().max(400),url:safeUrl}),
 z.object({action:z.literal('removeResource'),space:id,id}),
 z.object({action:z.literal('event'),space:id,id,title:z.string().trim().min(3).max(100),description:z.string().trim().min(10).max(1000),startsAt:z.number().int().min(0),duration:z.number().int().min(15).max(240),url:z.union([safeUrl,z.literal('')])}),
 z.object({action:z.literal('cancelEvent'),space:id,id}),
 z.object({action:z.literal('rsvp'),space:id,event:id,response:z.enum(['going','interested','remove'])}),
 z.object({action:z.literal('report'),space:id,id,post:id.optional(),resource:id.optional(),target:id,category:z.enum(['Harassment','Spam','Scam/Fraud','Sexual Content','Threats','Fake Profile','Impersonation','Underage Safety Concern','Other']),description:z.string().trim().max(2000)}),
 z.object({action:z.literal('resolveReport'),space:id,id}),
 z.object({action:z.literal('readActivity'),ids:z.array(id).min(1).max(50)})
]);
export type SpaceAction=z.infer<typeof spaceAction>;
export type Space={id:string;owner:string;name:string;description:string;topic:string;language:string;access:'open'|'approval';rules:string;created_at:number;updated_at:number;memberCount:number;postCount:number;myStatus:string|null;myRole:string|null;mutedUntil:number;notificationsEnabled:number;};
export type SpacePerson={id:string;name:string;role:string;status:string;mutedUntil:number};
export type SpacePost={id:string;channel:string;author:string;authorName:string;authorRole:string;parent:string|null;accepted_reply:string|null;kind:string;body:string;options:string[];poll_ends:number|null;pinned:number;created_at:number;likes:number;liked:boolean;saved:boolean;replies:number;votes:number[];myVote:number|null;};
export type SpaceEvent={id:string;host:string;hostName:string;title:string;description:string;starts_at:number;duration:number;url:string;cancelled:number;going:number;interested:number;myRsvp:string|null;};
export type SpaceResource={id:string;author:string;authorName:string;title:string;description:string;url:string;created_at:number;};
export type SpaceNotice={id:string;space:string;spaceName:string;title:string;body:string;seen:number;created_at:number;};
export type SpaceDetail={space:Space;channels:{id:string;name:string;description:string}[];members:SpacePerson[];events:SpaceEvent[];resources:SpaceResource[];reports:{id:string;target:string;post:string|null;resource:string|null;evidence:string;category:string;description:string;created_at:number}[];};
