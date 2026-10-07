import {spawnSync} from 'node:child_process';
const platform=process.argv[2],release=process.argv.includes('--release');
function run(cmd,args,cwd){const result=spawnSync(cmd,args,{cwd,stdio:'inherit',env:process.env});if(result.status!==0)process.exit(result.status||1);}
if(!['android','ios'].includes(platform))throw Error('Choose android or ios');
run(process.execPath,['scripts/native-doctor.mjs',platform,...(release?['--release']:[])]);
run('pnpm',['exec','cap','sync',platform]);
if(platform==='android')run('./gradlew',[release?'bundleRelease':'assembleDebug'],'android');
else run('xcodebuild',['-project','App/App.xcodeproj','-scheme','App','-configuration',release?'Release':'Debug','-destination',release?'generic/platform=iOS':'generic/platform=iOS Simulator',...(release?['-archivePath','App/output/YAARO.xcarchive','archive',`DEVELOPMENT_TEAM=${process.env.YAARO_APPLE_TEAM_ID}`]:['CODE_SIGNING_ALLOWED=NO','build'])],'ios');
