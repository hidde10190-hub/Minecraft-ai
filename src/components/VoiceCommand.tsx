import React, { useState, useEffect, useCallback } from "react";
import { Mic, MicOff, Volume2, MessageSquare, Sparkles, Layers } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface VoiceCommandProps {
  onTranscript: (text: string) => void;
  isListening: boolean;
  setIsListening: (val: boolean) => void;
}

export const VoiceCommand: React.FC<VoiceCommandProps> = ({ 
  onTranscript, 
  isListening, 
  setIsListening 
}) => {
  const [transcript, setTranscript] = useState("");
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Check for Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = "en-US";

      recog.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);
        if (finalTranscript) {
          onTranscript(finalTranscript);
          setTranscript("");
        }
      };

      recog.onend = () => {
        if (isListening) recog.start();
      };

      setRecognition(recog);
    }
  }, [onTranscript]);

  useEffect(() => {
    if (!recognition) return;
    if (isListening) {
      try {
        recognition.start();
      } catch (e) {
        console.error("Speech recognition start error", e);
      }
    } else {
      recognition.stop();
    }
  }, [isListening, recognition]);

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isListening ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"}`}>
            <Mic className={`h-5 w-5 ${isListening ? "animate-pulse" : ""}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">SimpleVC Support: AI Voice Perception</h3>
            <p className="text-xs text-slate-400">Talk to the bot - it will respond in-game chat.</p>
          </div>
        </div>
        <button
          onClick={() => setIsListening(!isListening)}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            isListening 
              ? "bg-rose-600 hover:bg-rose-500 text-white" 
              : "bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
          }`}
        >
          {isListening ? "Mute Ear" : "Start Listening"}
        </button>
      </div>

      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex flex-col gap-2"
          >
            <div className="relative h-12 bg-slate-950 rounded-lg border border-slate-800 flex items-center px-4 overflow-hidden">
              <div className="flex items-center gap-1 absolute left-4 opacity-50">
                {[1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [8, 20, 8] }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                    className="w-1 bg-emerald-400 rounded-full"
                  />
                ))}
              </div>
              <p className="ml-10 text-sm text-slate-300 italic truncate">
                {transcript || "Listening for your voice command..."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-2 mt-1">
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono bg-slate-950/50 p-2 rounded-md border border-slate-800/50">
          <Sparkles className="h-3 w-3 text-cyan-400" />
          <span>Sodium & Lithium: Active</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono bg-slate-950/50 p-2 rounded-md border border-slate-800/50">
          <Layers className="h-3 w-3 text-amber-400" />
          <span>Syncmatica: Monitoring</span>
        </div>
      </div>
    </div>
  );
};
