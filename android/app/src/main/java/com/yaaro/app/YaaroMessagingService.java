package com.yaaro.app;
import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.*;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.Person;
import androidx.core.content.ContextCompat;
import androidx.core.content.pm.*;
import androidx.core.graphics.drawable.IconCompat;
import com.google.firebase.messaging.RemoteMessage;
import java.io.File;
import java.util.Map;
public class YaaroMessagingService extends com.capacitorjs.plugins.pushnotifications.MessagingService {
 @Override public void onMessageReceived(RemoteMessage message){
  Map<String,String> d=message.getData();var prefs=getSharedPreferences("yaaro_push",MODE_PRIVATE);String account=d.get("account"),conversation=d.get("conversation"),sender=d.get("sender"),kind=d.get("kind");if(!prefs.getBoolean("enabled",false)||account==null||!account.equals(prefs.getString("account",""))||conversation==null||conversation.length()>100||sender==null||!sender.matches("[A-Za-z0-9_-]{1,100}")||!("message".equals(kind)||"call".equals(kind)))return;
  super.onMessageReceived(message);if(Build.VERSION.SDK_INT>=33&&ContextCompat.checkSelfPermission(this,Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return;
  boolean call="call".equals(kind);NotificationManager manager=getSystemService(NotificationManager.class);String channel=call?"yaaro_calls":"yaaro_messages";if(Build.VERSION.SDK_INT>=26){NotificationChannel ch=new NotificationChannel(channel,call?"Incoming calls":"Messages",NotificationManager.IMPORTANCE_HIGH);ch.setDescription(call?"Open YAARO to answer voice and video calls":"New messages from your Yaaros");if(Build.VERSION.SDK_INT>=29&&!call)ch.setAllowBubbles(true);manager.createNotificationChannel(ch);}
  String name=d.getOrDefault("name","Your Yaaro"),body=d.getOrDefault("body","Open YAARO");IconCompat icon=avatar(sender,name);Person person=new Person.Builder().setName(name).setKey(sender).setIcon(icon).build();Intent open=new Intent(this,MainActivity.class).putExtra("conversation",conversation).putExtra("account",account).putExtra("kind",kind).setAction("yaaro."+conversation).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);int id=conversation.hashCode();PendingIntent content=PendingIntent.getActivity(this,id,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  NotificationCompat.Builder notification=new NotificationCompat.Builder(this,channel).setSmallIcon(R.drawable.ic_notification).setContentTitle(call?d.getOrDefault("title","Incoming call"):name).setContentText(body).setContentIntent(content).setAutoCancel(true).setCategory(call?NotificationCompat.CATEGORY_CALL:NotificationCompat.CATEGORY_MESSAGE).setPriority(NotificationCompat.PRIORITY_HIGH).setTimeoutAfter(call?90000:3600000).setVisibility(NotificationCompat.VISIBILITY_PRIVATE);
  if(!call){String shortcut="chat-"+java.util.UUID.nameUUIDFromBytes(conversation.getBytes(java.nio.charset.StandardCharsets.UTF_8));Intent bubble=new Intent(this,BubbleActivity.class).putExtra("conversation",conversation).putExtra("account",account).putExtra("kind",kind).setAction(Intent.ACTION_VIEW).setData(android.net.Uri.parse("yaaro://chat/"+android.net.Uri.encode(conversation)));ShortcutInfoCompat s=new ShortcutInfoCompat.Builder(this,shortcut).setShortLabel(name).setIcon(icon).setIntent(bubble).setCategories(java.util.Collections.singleton("com.yaaro.app.CHAT")).setLongLived(true).setPerson(person).build();ShortcutManagerCompat.pushDynamicShortcut(this,s);notification.setShortcutId(shortcut).addPerson(person).setStyle(new NotificationCompat.MessagingStyle(new Person.Builder().setName("You").setKey(account).build()).addMessage(body,System.currentTimeMillis(),person));if(Build.VERSION.SDK_INT>=30)notification.setBubbleMetadata(new NotificationCompat.BubbleMetadata.Builder(shortcut).setDesiredHeight(600).build());else if(Build.VERSION.SDK_INT>=29){PendingIntent intent=PendingIntent.getActivity(this,id,bubble,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_MUTABLE);notification.setBubbleMetadata(new NotificationCompat.BubbleMetadata.Builder(intent,icon).setDesiredHeight(600).build());}}
  manager.notify(conversation,id,notification.build());
 }
 private IconCompat avatar(String sender,String name){Bitmap source=BitmapFactory.decodeFile(new File(new File(getFilesDir(),"avatars"),sender+".png").getPath()),round=Bitmap.createBitmap(96,96,Bitmap.Config.ARGB_8888);Canvas canvas=new Canvas(round);Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);Path path=new Path();path.addCircle(48,48,48,Path.Direction.CW);canvas.clipPath(path);if(source!=null){canvas.drawBitmap(source,null,new Rect(0,0,96,96),paint);source.recycle();}else{canvas.drawColor(Color.rgb(10,125,156));paint.setColor(Color.WHITE);paint.setTextSize(44);paint.setTextAlign(Paint.Align.CENTER);canvas.drawText(name.isEmpty()?"Y":new String(Character.toChars(name.codePointAt(0))).toUpperCase(),48,64,paint);}return IconCompat.createWithBitmap(round);}
}
