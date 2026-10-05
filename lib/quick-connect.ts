import type {Member,Self} from './community-model';
export type QuickFilters={language:string;vibe:string;interest?:string};
// Only consider profiles already authorized and returned by the community API.
export function nextQuickCandidate(people:Member[],self:Self,filters:QuickFilters,skipped:ReadonlySet<string>):Member|null{
 const score=(person:Member)=>(person.vibe===self.vibe?3:0)+person.languages.filter(language=>self.languages.includes(language)).length+person.interests.filter(interest=>self.interests.includes(interest)).length;
 return people.filter(person=>person.id!==self.id&&person.online&&!skipped.has(person.id)&&(!filters.language||person.languages.includes(filters.language))&&(!filters.vibe||person.vibe===filters.vibe)&&(!filters.interest||person.interests.includes(filters.interest))).sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id))[0]||null;
}
