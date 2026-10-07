package com.yaaro.app;
import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
 @Override protected void onCreate(Bundle state){registerPlugin(YaaroChatPlugin.class);super.onCreate(state);}
 @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);String conversation=intent.getStringExtra("conversation");if(conversation!=null&&conversation.length()<=100&&bridge!=null){String account=intent.getStringExtra("account");String active=getSharedPreferences("yaaro_push",MODE_PRIVATE).getString("account","");if(account==null||!account.equals(active))return;String url=bridge.getWebView().getUrl();if(url!=null&&url.startsWith("https://autumn-lake-80feyaaro.haritre07.workers.dev/community")&&bridge.getWebView().getProgress()==100){try{org.json.JSONObject data=new org.json.JSONObject().put("conversation",conversation).put("account",account).put("kind",intent.getStringExtra("kind"));bridge.triggerWindowJSEvent("yaaro-native-open",data.toString());}catch(org.json.JSONException ignored){}}else bridge.getWebView().loadUrl("https://autumn-lake-80feyaaro.haritre07.workers.dev/community?conversation="+android.net.Uri.encode(conversation));}}
}
