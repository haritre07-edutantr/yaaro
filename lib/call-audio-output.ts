import {Capacitor,registerPlugin} from '@capacitor/core';
export type CallAudioOutput={id:string;kind:'earpiece'|'speaker'|'bluetooth'|'headphones';label:string};
export type CallAudioRoutes={options:CallAudioOutput[];selected:string;requested:string;session:string};
export const NativeCallAudio=registerPlugin<{
 beginCall(options:{session:string;video:boolean}):Promise<CallAudioRoutes>;
 getRoutes(options:{session:string}):Promise<CallAudioRoutes>;
 selectRoute(options:{session:string;id:string}):Promise<CallAudioRoutes>;
 endCall(options:{session:string}):Promise<void>;
}>('YaaroAudio');
export function supportsNativeCallAudio(){return Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android'&&Capacitor.isPluginAvailable('YaaroAudio');}
