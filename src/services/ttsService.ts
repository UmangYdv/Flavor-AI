import { registerPlugin } from "@capacitor/core";

// Define the native TTS plugin interface
interface NativeTTSPlugin {
  initialize(): Promise<{ success: boolean }>;
  speak(params: { text: string }): Promise<{ success: boolean }>;
  stop(): Promise<{ success: boolean }>;
  pause(): Promise<{ success: boolean }>;
  isAvailable(): Promise<{ available: boolean }>;
}

// Register the native plugin
const NativeTTS = registerPlugin<NativeTTSPlugin>("NativeTTS");

// Check if we're on a native platform
const isNativePlatform = (): boolean => {
  return typeof window !== "undefined" && 
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) &&
    (window as any).Capactor !== undefined;
};

// TTS Service that works on both web and native
class TTSService {
  private isInitialized = false;
  private isSpeaking = false;
  private useNative = false;
  private onStartCallback?: () => void;
  private onEndCallback?: () => void;
  private onErrorCallback?: (error: string) => void;

  async initialize(): Promise<boolean> {
    // Check if native platform
    try {
      const result = await NativeTTS.isAvailable();
      if (result.available) {
        this.useNative = true;
        await NativeTTS.initialize();
        this.isInitialized = true;
        console.log("Using native TTS");
        return true;
      }
    } catch (e) {
      console.log("Native TTS not available, using web TTS");
    }
    
    // Fall back to web speech synthesis
    if (typeof window !== "undefined" && window.speechSynthesis) {
      this.useNative = false;
      this.isInitialized = true;
      console.log("Using web speech synthesis");
      return true;
    }
    
    return false;
  }

  setCallbacks(onStart?: () => void, onEnd?: () => void, onError?: (error: string) => void) {
    this.onStartCallback = onStart;
    this.onEndCallback = onEnd;
    this.onErrorCallback = onError;
  }

  async speak(text: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.useNative) {
      try {
        await NativeTTS.speak({ text });
        this.isSpeaking = true;
        this.onStartCallback?.();
        return true;
      } catch (e) {
        console.error("Native TTS error:", e);
        return false;
      }
    } else {
      // Use web speech synthesis
      return this.webSpeak(text);
    }
  }

  private webSpeak(text: string): boolean {
    if (!window.speechSynthesis) {
      console.warn("Web speech synthesis not available");
      return false;
    }

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => {
      this.isSpeaking = true;
      this.onStartCallback?.();
    };
    utterance.onend = () => {
      this.isSpeaking = false;
      this.onEndCallback?.();
    };
    utterance.onerror = (e) => {
      this.isSpeaking = false;
      this.onErrorCallback?.(String(e));
    };

    window.speechSynthesis.speak(utterance);
    return true;
  }

  async stop(): Promise<void> {
    if (this.useNative) {
      try {
        await NativeTTS.stop();
      } catch (e) {
        console.error("Native TTS stop error:", e);
      }
    } else {
      window.speechSynthesis?.cancel();
    }
    this.isSpeaking = false;
  }

  async pause(): Promise<void> {
    if (this.useNative) {
      try {
        await NativeTTS.pause();
      } catch (e) {
        console.error("Native TTS pause error:", e);
      }
    } else {
      window.speechSynthesis?.pause();
    }
    this.isSpeaking = false;
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

// Export singleton instance
export const ttsService = new TTSService();
export default ttsService;