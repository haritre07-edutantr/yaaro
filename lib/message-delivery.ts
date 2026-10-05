import type {ChatMessage} from './community-model';
export type PendingMessage={conversation:string;message:ChatMessage&{delivery:'sending'|'sent'|'failed'}};
export function visibleMessages(messages:ChatMessage[],pending:PendingMessage[],conversation:string){const ids=new Set(messages.map(message=>message.id));return [...messages,...pending.filter(item=>item.conversation===conversation&&!ids.has(item.message.id)).map(item=>item.message)];}
