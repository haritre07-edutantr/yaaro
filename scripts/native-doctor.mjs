import {existsSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const platform=process.argv[2]||'all';let missing=0;
function check(name,pass){console.log(`${pass?'OK':'NEEDED'}: ${name}`);if(!pass)missing++;}
if(platform==='all'||platform==='android'){
 const java=spawnSync('java',['-version'],{encoding:'utf8'});const version=(java.stderr||'').match(/version "(\d+)/);check('JDK 21 or newer',!!version&&Number(version[1])>=21);
 check('Android SDK (ANDROID_HOME or ANDROID_SDK_ROOT)',existsSync(process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT||'/no-android-sdk'));
 check('Firebase Android configuration: android/app/google-services.json',existsSync('android/app/google-services.json'));
 if(existsSync('android/app/google-services.json')){let matches=false;try{const config=JSON.parse(readFileSync('android/app/google-services.json','utf8'));const id=readFileSync('android/app/build.gradle','utf8').match(/applicationId\s+"([^"]+)"/)?.[1];matches=!!id&&config.client?.some(client=>client.client_info?.android_client_info?.package_name===id);}catch{}check('Firebase configuration matches the Android application ID',matches);}

 if(process.argv.includes('--release'))for(const key of ['YAARO_ANDROID_KEYSTORE','YAARO_ANDROID_STORE_PASSWORD','YAARO_ANDROID_KEY_ALIAS','YAARO_ANDROID_KEY_PASSWORD'])check(key,!!process.env[key]);
}
if(platform==='all'||platform==='ios'){
 check('macOS with Xcode',process.platform==='darwin'&&spawnSync('xcodebuild',['-version']).status===0);
 if(process.argv.includes('--release'))check('Apple signing team: YAARO_APPLE_TEAM_ID',!!process.env.YAARO_APPLE_TEAM_ID);
}
console.log('Server push credentials are checked by /api/native-devices after sign-in; this command never prints credentials.');process.exitCode=missing?1:0;
