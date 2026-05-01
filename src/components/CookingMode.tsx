import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  CheckCircle2,
  ChefHat,
} from "lucide-react";
import { Recipe } from "../types";
import { cn } from "../lib/utils";

interface CookingModeProps {
  recipe: Recipe;
  onClose: () => void;
  onFinish: () => void;
}

export default function CookingMode({
  recipe,
  onClose,
  onFinish,
}: CookingModeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const stepRef = React.useRef(0);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = React.useRef<any>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Sync ref with state
  useEffect(() => {
    stepRef.current = currentStep;
  }, [currentStep]);

  const speakStep = useCallback(
    (index: number) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        recipe.instructions[index],
      );
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    },
    [recipe.instructions],
  );

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = false;
        recog.lang = "en-US";

        recog.onresult = (event: any) => {
          const command =
            event.results[event.results.length - 1][0].transcript.toLowerCase();
          console.log("Voice command:", command);

          if (command.includes("next")) {
            setCurrentStep((prev) => {
              const next = Math.min(prev + 1, recipe.instructions.length - 1);
              if (next !== prev) speakStep(next);
              return next;
            });
          } else if (command.includes("previous") || command.includes("back")) {
            setCurrentStep((prev) => {
              const next = Math.max(prev - 1, 0);
              if (next !== prev) speakStep(next);
              return next;
            });
          } else if (command.includes("repeat") || command.includes("read")) {
            speakStep(stepRef.current);
          } else if (command.includes("stop") || command.includes("finish")) {
            onClose();
          }
        };

        recog.onerror = (err: any) => {
          console.error("Speech recognition error:", err);
          if (err.error === "not-allowed") {
            setVoiceError("Microphone access denied");
          } else {
            setVoiceError("Voice control error");
          }
          setIsListening(false);
        };

        recog.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recog;
      } catch (e) {
        console.error("Failed to init speech recognition", e);
        setVoiceError("Voice control not supported");
      }
    } else {
      setVoiceError("Voice control not supported");
    }

    return () => {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [recipe.instructions.length, speakStep, onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    setVoiceError(null);

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Start listening failed", e);
        setVoiceError("Failed to start listening");
      }
    }
  };

  const handleNext = () => {
    if (currentStep < recipe.instructions.length - 1) {
      setCurrentStep((prev) => prev + 1);
      speakStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      speakStep(currentStep - 1);
    }
  };

  useEffect(() => {
    speakStep(0);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-stone-900 flex flex-col"
    >
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-stone-800">
        <div className="flex items-center gap-4">
          <div className="bg-orange-500 p-2 rounded-xl">
            <ChefHat className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-white font-bold text-xl">{recipe.title}</h2>
            <p className="text-stone-500 text-sm">
              Step {currentStep + 1} of {recipe.instructions.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <button
              onClick={toggleListening}
              disabled={!!voiceError && voiceError.includes("not supported")}
              className={cn(
                "p-4 rounded-2xl transition-all flex items-center gap-2 font-bold",
                isListening
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-stone-800 text-stone-400 hover:bg-stone-700",
                voiceError && "border-2 border-red-500/50",
              )}
            >
              {isListening ? <Mic size={24} /> : <MicOff size={24} />}
              <span className="hidden md:inline">
                {isListening ? "Listening..." : "Voice Control"}
              </span>
            </button>
            {voiceError && (
              <span className="text-[10px] text-red-500 font-bold uppercase mt-1">
                {voiceError}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-4 bg-stone-800 text-stone-400 rounded-2xl hover:bg-stone-700 transition-all"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center max-w-5xl mx-auto w-full">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="space-y-12"
        >
          <div className="inline-block bg-orange-500/10 text-orange-500 px-6 py-2 rounded-full font-bold text-lg uppercase tracking-widest">
            Step {currentStep + 1}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
            {recipe.instructions[currentStep]}
          </h1>

          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => speakStep(currentStep)}
              className="bg-stone-800 text-white p-6 rounded-3xl hover:bg-stone-700 transition-all"
            >
              {isSpeaking ? (
                <Volume2 size={40} className="text-orange-500" />
              ) : (
                <VolumeX size={40} />
              )}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Footer Controls */}
      <div className="p-10 border-t border-stone-800 bg-stone-900/50 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex-1 flex items-center justify-center gap-3 bg-stone-800 text-white py-6 rounded-[2rem] font-bold text-xl disabled:opacity-30 hover:bg-stone-700 transition-all"
          >
            <ChevronLeft size={32} />
            Previous
          </button>

          {currentStep === recipe.instructions.length - 1 ? (
            <button
              onClick={onFinish}
              className="flex-[2] flex items-center justify-center gap-3 bg-green-500 text-white py-6 rounded-[2rem] font-bold text-2xl shadow-2xl shadow-green-500/20 hover:bg-green-600 transition-all"
            >
              <CheckCircle2 size={32} />
              Finish Cooking
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex-[2] flex items-center justify-center gap-3 bg-orange-500 text-white py-6 rounded-[2rem] font-bold text-2xl shadow-2xl shadow-orange-500/20 hover:bg-orange-600 transition-all"
            >
              Next Step
              <ChevronRight size={32} />
            </button>
          )}
        </div>

        <div className="mt-8 flex justify-center gap-2">
          {recipe.instructions.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 rounded-full transition-all",
                i === currentStep ? "w-12 bg-orange-500" : "w-2 bg-stone-800",
              )}
            />
          ))}
        </div>
      </div>

      {/* Voice Commands Help */}
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 text-stone-600 text-sm font-medium bg-stone-800/30 px-6 py-2 rounded-full backdrop-blur-sm">
        Try saying: "Next", "Previous", "Repeat", or "Finish"
      </div>
    </motion.div>
  );
}
