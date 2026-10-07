package com.yaaro.app;
import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
 @Override protected void onCreate(Bundle state){registerPlugin(YaaroChatPlugin.class);registerPlugin(YaaroAudioPlugin.class);super.onCreate(state);if(!handleAuthIntent(getIntent()))handleConversationLaunch(getIntent());}
 private boolean handleAuthIntent(Intent intent){
  android.net.Uri uri=intent.getData();
  if(uri==null||!"com.yaaro.app".equals(uri.getScheme())||!"auth".equals(uri.getHost())||!"/callback".equals(uri.getPath()))return false;
  String state=uri.getQueryParameter("state"),code=uri.getQueryParameter("code");
  if(state==null||!state.matches("[0-9a-fA-F-]{36}")||(code!=null&&code.length()>=4096)||bridge==null)return true;
  String target="https://autumn-lake-80feyaaro.haritre07.workers.dev/auth/native-return?state="+android.net.Uri.encode(state)+(code==null?"":"&code="+android.net.Uri.encode(code));
  bridge.getWebView().post(()->bridge.getWebView().loadUrl(target));return true;
 }
 private void handleConversationLaunch(Intent intent){
  String conversation=intent.getStringExtra("conversation"),account=intent.getStringExtra("account");
  if(conversation==null||conversation.length()>100||account==null||bridge==null||!account.equals(getSharedPreferences("yaaro_push",MODE_PRIVATE).getString("account","")))return;
  String target="https://autumn-lake-80feyaaro.haritre07.workers.dev/community?conversation="+android.net.Uri.encode(conversation);
  bridge.getWebView().post(()->bridge.getWebView().loadUrl(target));
 }
 @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);if(handleAuthIntent(intent))return;String conversation=intent.getStringExtra("conversation");if(conversation!=null&&conversation.length()<=100&&bridge!=null){String account=intent.getStringExtra("account");String active=getSharedPreferences("yaaro_push",MODE_PRIVATE).getString("account","");if(account==null||!account.equals(active))return;String url=bridge.getWebView().getUrl();if(url!=null&&url.startsWith("https://autumn-lake-80feyaaro.haritre07.workers.dev/community")&&bridge.getWebView().getProgress()==100){try{org.json.JSONObject data=new org.json.JSONObject().put("conversation",conversation).put("account",account).put("kind",intent.getStringExtra("kind"));bridge.triggerWindowJSEvent("yaaro-native-open",data.toString());}catch(org.json.JSONException ignored){}}else bridge.getWebView().loadUrl("https://autumn-lake-80feyaaro.haritre07.workers.dev/community?conversation="+android.net.Uri.encode(conversation));}}
}
