package com.yaaro.app;

import android.content.Context;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.os.Build;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Arrays;
import java.util.List;

@CapacitorPlugin(name="YaaroAudio")
public class YaaroAudioPlugin extends Plugin {
 private AudioManager audio;
 private String session="", requested="";
 private int previousMode;
 private boolean previousSpeaker, scoStarted, video;
 private AudioManager manager(){if(audio==null)audio=(AudioManager)getContext().getSystemService(Context.AUDIO_SERVICE);return audio;}
 private List<AudioDeviceInfo> devices(){return Build.VERSION.SDK_INT>=31?manager().getAvailableCommunicationDevices():Arrays.asList(manager().getDevices(AudioManager.GET_DEVICES_OUTPUTS));}
 private String kind(AudioDeviceInfo device){switch(device.getType()){
  case AudioDeviceInfo.TYPE_BUILTIN_EARPIECE:return "earpiece";
  case AudioDeviceInfo.TYPE_BUILTIN_SPEAKER:return "speaker";
  case AudioDeviceInfo.TYPE_BLUETOOTH_SCO:return "bluetooth";
  case AudioDeviceInfo.TYPE_BLE_HEADSET:return Build.VERSION.SDK_INT>=31?"bluetooth":null;
  case AudioDeviceInfo.TYPE_WIRED_HEADSET:case AudioDeviceInfo.TYPE_WIRED_HEADPHONES:case AudioDeviceInfo.TYPE_USB_HEADSET:return "headphones";
  default:return null;
 }}
 private String id(AudioDeviceInfo device){return Integer.toString(device.getId());}
 private AudioDeviceInfo find(String value){for(AudioDeviceInfo device:devices())if(kind(device)!=null&&id(device).equals(value))return device;return null;}
 private AudioDeviceInfo preferred(){String[] order=video?new String[]{"bluetooth","headphones","speaker","earpiece"}:new String[]{"bluetooth","headphones","earpiece","speaker"};for(String k:order)for(AudioDeviceInfo d:devices())if(k.equals(kind(d)))return d;return null;}
 @SuppressWarnings("deprecation") private void route(AudioDeviceInfo device){
  if(Build.VERSION.SDK_INT>=31){if(!manager().setCommunicationDevice(device))throw new IllegalStateException("This audio output is unavailable. Try another output.");}
  else {boolean bluetooth="bluetooth".equals(kind(device));if(scoStarted&&!bluetooth){manager().stopBluetoothSco();manager().setBluetoothScoOn(false);scoStarted=false;}manager().setSpeakerphoneOn("speaker".equals(kind(device)));if(bluetooth&&!scoStarted){manager().startBluetoothSco();manager().setBluetoothScoOn(true);scoStarted=true;}}
  requested=id(device);
 }
 private JSObject status(){
  if(!session.isEmpty()&&find(requested)==null){AudioDeviceInfo fallback=preferred();if(fallback!=null)route(fallback);}
  JSArray options=new JSArray();for(AudioDeviceInfo device:devices()){String k=kind(device);if(k==null)continue;JSObject option=new JSObject();option.put("id",id(device));option.put("kind",k);option.put("label",k.equals("earpiece")?"Earpiece":k.equals("speaker")?"Speaker":k.equals("bluetooth")?"Bluetooth":"Headphones");options.put(option);}
  String selected=requested;if(Build.VERSION.SDK_INT>=31){AudioDeviceInfo current=manager().getCommunicationDevice();selected=current==null?"":id(current);}
  JSObject result=new JSObject();result.put("options",options);result.put("selected",selected);result.put("requested",requested);result.put("session",session);return result;
 }
 private boolean matches(PluginCall call){return !session.isEmpty()&&session.equals(call.getString("session",""));}
 @PluginMethod public void beginCall(PluginCall call){getActivity().runOnUiThread(()->{try{
  String next=call.getString("session","");if(!next.matches("[A-Za-z0-9-]{1,64}")){call.reject("Invalid call session");return;}
  if(!next.equals(session)){finish();previousMode=manager().getMode();if(previousMode==AudioManager.MODE_IN_COMMUNICATION)previousMode=AudioManager.MODE_NORMAL;previousSpeaker=manager().isSpeakerphoneOn();session=next;video=call.getBoolean("video",false);manager().setMode(AudioManager.MODE_IN_COMMUNICATION);AudioDeviceInfo device=preferred();if(device!=null)route(device);}
  call.resolve(status());
 }catch(Exception e){finish();call.reject("Unable to prepare call audio output.");}});}
 @PluginMethod public void getRoutes(PluginCall call){getActivity().runOnUiThread(()->{try{if(!matches(call)){call.reject("Call ended");return;}call.resolve(status());}catch(Exception e){call.reject("Unable to read call audio outputs.");}});}
 @PluginMethod public void selectRoute(PluginCall call){getActivity().runOnUiThread(()->{try{if(!matches(call)){call.reject("Call ended");return;}AudioDeviceInfo device=find(call.getString("id",""));if(device==null){call.reject("This audio output disconnected. Choose another output.");return;}route(device);call.resolve(status());}catch(Exception e){call.reject("Unable to switch audio output. Check that your headset supports calls.");}});}
 @PluginMethod public void endCall(PluginCall call){getActivity().runOnUiThread(()->{if(matches(call))finish();call.resolve();});}
 @SuppressWarnings("deprecation") private void finish(){if(session.isEmpty())return;try{if(Build.VERSION.SDK_INT>=31)manager().clearCommunicationDevice();else{if(scoStarted){manager().stopBluetoothSco();manager().setBluetoothScoOn(false);}manager().setSpeakerphoneOn(previousSpeaker);}manager().setMode(previousMode);}catch(RuntimeException ignored){}finally{session="";requested="";scoStarted=false;}}
 @Override protected void handleOnDestroy(){finish();super.handleOnDestroy();}
}
