import type {CapacitorConfig} from '@capacitor/cli';
const config:CapacitorConfig={
 appId:'com.yaaro.app',appName:'YAARO',webDir:'native/web',
 server:{url:'https://autumn-lake-80feyaaro.haritre07.workers.dev/community',cleartext:false,errorPath:'index.html'},
 android:{allowMixedContent:false},ios:{contentInset:'automatic'},
 plugins:{SystemBars:{insetsHandling:'native',initialViewportFitValueHint:'contain'},PushNotifications:{presentationOptions:['badge','sound','banner','list']}}
};
export default config;
