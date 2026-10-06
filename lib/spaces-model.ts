import {z} from 'zod';
export const spaceTopics=['Music','Gaming','Career','Study','Technology','Movies','Travel','Art & creativity','Wellbeing','Entrepreneurship','Other'] as const;
const id=z.string().uuid(),body=z.string().trim().min(1).max(3000);
const safeUrl=z.string().trim().max(1200).refine(v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}},'Use an HTTPS link without embedded credentials');
export const spaceEventView=z.enum(['upcoming','plans','past','cancelled']);
export type SpaceEventView=z.infer<typeof spaceEventView>;
export function spaceEventState(event:Pick<SpaceEvent,'starts_at'|'duration'|'cancelled'>,now=Date.now()){return event.cancelled?'cancelled':event.starts_at+event.duration*60000<=now?'past':event.starts_at<=now?'live':'upcoming';}
export const spaceFeedFilter=z.enum(['all','unanswered','answered','following','polls','announcements','pinned']);
export type SpaceFeedFilter=z.infer<typeof spaceFeedFilter>;
export const spacePurposes=['Friendship','Networking','Learning','Entertainment','Gaming','Technology','Business','Startups','Career','Jobs','College','Local community','Sports','Fitness','Travel','Photography','Music','Movies','Creators','Professional networking','Support','Hobbies','Other'] as const;
export const spaceCapabilities=(role:string,status='active')=>({manage:status==='active'&&['owner','moderator'].includes(role),settings:status==='active'&&role==='owner',participate:status==='active'});
export const spaceDetails=z.object({name:z.string().trim().min(3).max(60),description:z.string().trim().min(20).max(700),topic:z.enum(spaceTopics),language:z.string().trim().min(2).max(40),access:z.enum(['open','approval']),visibility:z.enum(['public','private','secret']).optional(),handle:z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{2,39}$/,'Use 3–40 lowercase letters, numbers, or hyphens').optional(),purpose:z.enum(spacePurposes).default('Friendship'),subcategory:z.string().trim().max(60).default(''),rules:z.string().trim().min(20).max(2000)});
export const spaceAction=z.discriminatedUnion('action',[
 z.object({action:z.literal('redeemInvite'),token:id}),
 z.object({action:z.literal('invite'),space:id,hours:z.number().int().min(1).max(168),maxUses:z.number().int().min(1).max(100)}),
 z.object({action:z.literal('revokeInvite'),space:id,hash:z.string().regex(/^[a-f0-9]{64}$/)}),
 z.object({action:z.literal('archive'),space:id}),
 z.object({action:z.literal('deleteCommunity'),space:id,confirmation:z.literal('DELETE')}),
 z.object({action:z.literal('channelControl'),space:id,channel:id,name:z.string().trim().min(2).max(30),description:z.string().trim().max(150),readOnly:z.boolean(),archived:z.boolean(),position:z.number().int().min(0).max(12)}),
 z.object({action:z.literal('followChannel'),space:id,channel:id,enabled:z.boolean()}),
 z.object({action:z.literal('followDiscussion'),space:id,post:id,enabled:z.boolean()}),
 z.object({action:z.literal('editPost'),space:id,post:id,body}),
 z.object({action:z.literal('lockPost'),space:id,post:id,enabled:z.boolean()}),
 z.object({action:z.literal('message'),space:id,channel:id,id,body,reply:id.optional()}),
 z.object({action:z.literal('editMessage'),space:id,message:id,body}),
 z.object({action:z.literal('deleteMessage'),space:id,message:id}),
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
 z.object({action:z.literal('report'),space:id,id,post:id.optional(),resource:id.optional(),message:id.optional(),target:id,category:z.enum(['Harassment','Spam','Scam/Fraud','Sexual Content','Threats','Fake Profile','Impersonation','Underage Safety Concern','Other']),description:z.string().trim().max(2000)}),
 z.object({action:z.literal('resolveReport'),space:id,id}),
 z.object({action:z.literal('readActivity'),ids:z.array(id).min(1).max(50)})
]);
export type SpaceAction=z.infer<typeof spaceAction>;
export type Space={id:string;owner:string;name:string;description:string;topic:string;language:string;access:'open'|'approval';visibility:'public'|'private'|'secret';handle:string;purpose:string;subcategory:string;logoUrl:string|null;coverUrl:string|null;archived:number;rules:string;created_at:number;updated_at:number;memberCount:number;postCount:number;myStatus:string|null;myRole:string|null;mutedUntil:number;notificationsEnabled:number;};
export type SpacePerson={id:string;name:string;role:string;status:string;mutedUntil:number};
export type SpacePost={id:string;channel:string;author:string;authorName:string;authorRole:string;parent:string|null;accepted_reply:string|null;kind:string;body:string;options:string[];poll_ends:number|null;pinned:number;locked:number;edited_at:number|null;followed:boolean;created_at:number;likes:number;liked:boolean;saved:boolean;replies:number;votes:number[];myVote:number|null;};
export type SpaceEvent={id:string;host:string;hostName:string;title:string;description:string;starts_at:number;duration:number;url:string;cancelled:number;going:number;interested:number;myRsvp:string|null;};
export type SpaceResource={id:string;author:string;authorName:string;title:string;description:string;url:string;created_at:number;};
export type SpaceNotice={id:string;space:string;spaceName:string;title:string;body:string;seen:number;created_at:number;};
export type SpaceDetail={space:Space;channels:{id:string;name:string;description:string;read_only:number;archived:number;position:number;followed:boolean}[];members:SpacePerson[];events:SpaceEvent[];resources:SpaceResource[];reports:{id:string;target:string;post:string|null;resource:string|null;message:string|null;evidence:string;category:string;description:string;created_at:number}[];};

export type SpaceMessage={id:string;space:string;channel:string;author:string;authorName:string;body:string;reply_id:string|null;edited_at:number|null;created_at:number};
export type SpaceInvite={token_hash:string;expires_at:number;max_uses:number;uses:number;revoked:number;created_at:number};
