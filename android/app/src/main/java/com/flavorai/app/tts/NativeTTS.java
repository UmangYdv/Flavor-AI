package com.flavorai.app.tts;

import android.content.Context;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.util.Locale;

@CapacitorPlugin(name = "NativeTTS")
public class NativeTTS extends Plugin {
    private static final String TAG = "NativeTTS";
    private TextToSpeech tts = null;
    private boolean isInitialized = false;
    private JSObject lastResult = new JSObject();

    @PluginMethod
    public void initialize(PluginCall call) {
        Context context = getContext();
        
        if (tts == null) {
            tts = new TextToSpeech(context, new TextToSpeech.OnInitListener() {
                @Override
                public void onInit(int status) {
                    if (status == TextToSpeech.SUCCESS) {
                        int result = tts.setLanguage(Locale.US);
                        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                            Log.e(TAG, "Language not supported");
                            isInitialized = false;
                        } else {
                            isInitialized = true;
                            Log.d(TAG, "TTS initialized successfully");
                            
                            // Set up utterance listener
                            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                                @Override
                                public void onStart(String utteranceId) {
                                    notifyListeners("onStart", createResult("started", true));
                                }

                                @Override
                                public void onDone(String utteranceId) {
                                    notifyListeners("onDone", createResult("completed", true));
                                }

                                @Override
                                public void onError(String utteranceId) {
                                    notifyListeners("onError", createResult("error", true));
                                }
                            });
                        }
                    } else {
                        Log.e(TAG, "TTS initialization failed");
                        isInitialized = false;
                    }
                }
            });
        }
        
        JSObject result = new JSObject();
        result.put("success", isInitialized);
        call.resolve(result);
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text");
        if (text == null || text.isEmpty()) {
            call.reject("Text is required");
            return;
        }

        if (tts == null || !isInitialized) {
            call.reject("TTS not initialized");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "flavorai_utterance");
        } else {
            tts.speak(text, TextToSpeech.QUEUE_FLUSH);
        }
        
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (tts != null) {
            tts.stop();
        }
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod
    public void pause(PluginCall call) {
        if (tts != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                tts.stop();
            }
        }
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", isInitialized);
        call.resolve(result);
    }

    private JSObject createResult(String key, Object value) {
        JSObject obj = new JSObject();
        try {
            obj.put(key, value);
        } catch (JSONException e) {
            Log.e(TAG, "Error creating result", e);
        }
        return obj;
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        isInitialized = false;
    }
}