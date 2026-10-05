import type {Friendship} from './community-model';
export function conversationGroups(friends:Friendship[],query:string,favoritesOnly=false){
 const term=query.trim().toLocaleLowerCase();
 const sorted=friends.filter(f=>(!favoritesOnly||f.favorite)&&(!term||f.person.name.toLocaleLowerCase().includes(term)||f.person.vibe.toLocaleLowerCase().includes(term))).sort((a,b)=>(b.lastMessage?.createdAt||b.updatedAt)-(a.lastMessage?.createdAt||a.updatedAt)||a.person.name.localeCompare(b.person.name));
 if(favoritesOnly)return [{title:'Favorites',items:sorted}];
 return [{title:'Pinned',items:sorted.filter(f=>f.pinned)},{title:'Favorites',items:sorted.filter(f=>!f.pinned&&f.favorite)},{title:'All conversations',items:sorted.filter(f=>!f.pinned&&!f.favorite)}];
}
