package com.yaaro.app;
import android.app.NotificationManager;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.provider.Settings;
import android.util.Base64;
import com.getcapacitor.Plugin;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
@CapacitorPlugin(name="YaaroChat")
public class YaaroChatPlugin extends Plugin {
 @PluginMethod public void setAccount(PluginCall call){String account=call.getString("account","");boolean enabled=call.getBoolean("enabled",false);if(!account.matches("[A-Za-z0-9_-]{0,100}")){call.reject("Invalid account");return;}var prefs=getContext().getSharedPreferences("yaaro_push",0);if(!account.equals(prefs.getString("account",""))||!enabled){((NotificationManager)getContext().getSystemService(android.content.Context.NOTIFICATION_SERVICE)).cancelAll();androidx.core.content.pm.ShortcutManagerCompat.removeAllDynamicShortcuts(getContext());if(Build.VERSION.SDK_INT>=30){var manager=getContext().getSystemService(android.content.pm.ShortcutManager.class);var ids=new java.util.ArrayList<String>();for(var shortcut:manager.getShortcuts(android.content.pm.ShortcutManager.FLAG_MATCH_CACHED|android.content.pm.ShortcutManager.FLAG_MATCH_DYNAMIC|android.content.pm.ShortcutManager.FLAG_MATCH_PINNED))ids.add(shortcut.getId());manager.removeLongLivedShortcuts(ids);}File dir=new File(getContext().getFilesDir(),"avatars");File[] files=dir.listFiles();if(files!=null)for(File f:files)f.delete();}prefs.edit().putString("account",account).putBoolean("enabled",enabled).apply();call.resolve();}
 @PluginMethod public void cacheAvatar(PluginCall call){if(!call.getString("account","").equals(getContext().getSharedPreferences("yaaro_push",0).getString("account",""))){call.reject("Account changed");return;}String member=call.getString("member",""),data=call.getString("data","");if(!member.matches("[A-Za-z0-9_-]{1,100}")||data.length()>100000){call.reject("Invalid avatar");return;}try{byte[] bytes=Base64.decode(data,Base64.DEFAULT);BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(bytes,0,bytes.length,bounds);if(bounds.outWidth<1||bounds.outWidth>192||bounds.outHeight>192)throw new Exception();Bitmap image=BitmapFactory.decodeByteArray(bytes,0,bytes.length);File dir=new File(getContext().getFilesDir(),"avatars");dir.mkdirs();try(FileOutputStream file=new FileOutputStream(new File(dir,member+".png"))){image.compress(Bitmap.CompressFormat.PNG,100,file);}image.recycle();call.resolve();}catch(Exception e){call.reject("Unable to cache avatar");}}
 @PluginMethod public void openBubbleSettings(PluginCall call){Intent intent=new Intent(Build.VERSION.SDK_INT>=29?Settings.ACTION_APP_NOTIFICATION_BUBBLE_SETTINGS:Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getContext().getPackageName());getActivity().startActivity(intent);call.resolve();}
 @PluginMethod public void openNotificationSettings(PluginCall call){getActivity().startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getContext().getPackageName()));call.resolve();}
 @PluginMethod public void getNotificationStatus(PluginCall call){
  NotificationManager manager=getContext().getSystemService(NotificationManager.class);JSObject result=new JSObject();
  result.put("notificationsAllowed",androidx.core.app.NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
  result.put("bubblesSupported",Build.VERSION.SDK_INT>=29);
  String bubbles="none";if(Build.VERSION.SDK_INT>=31){int preference=manager.getBubblePreference();bubbles=preference==NotificationManager.BUBBLE_PREFERENCE_ALL?"all":preference==NotificationManager.BUBBLE_PREFERENCE_SELECTED?"selected":"none";}else if(Build.VERSION.SDK_INT>=29&&manager.areBubblesAllowed())bubbles="all";
  result.put("bubblePreference",bubbles);
  for(String kind:new String[]{"messages","calls"}){android.app.NotificationChannel channel=Build.VERSION.SDK_INT>=26?manager.getNotificationChannel("yaaro_"+kind):null;result.put(kind+"Allowed",channel==null||channel.getImportance()!=NotificationManager.IMPORTANCE_NONE);}
  call.resolve(result);
 }
}
