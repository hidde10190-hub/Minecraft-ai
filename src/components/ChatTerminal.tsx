import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Bot, Shield, Terminal, Sparkles, User, Radio, RefreshCw, Check, Mic, MicOff } from "lucide-react";
import { ChatMessage, AgentInstance } from "../types";
import { VoiceCommand } from "./VoiceCommand";

interface ChatTerminalProps {
  chatMessages: ChatMessage[];
  onSendChatMessage: (text: string, sender?: string) => void;
  activeAgent: AgentInstance;
  allAgents: AgentInstance[];
  isAiAutoReply: boolean;
  onToggleAiAutoReply: () => void;
  isVoiceListening: boolean;
  setIsVoiceListening: (val: boolean) => void;
  onVoiceTranscript: (text: string) => void;
}

export const ChatTerminal: React.FC<ChatTerminalProps> = ({
  chatMessages,
  onSendChatMessage,
  activeAgent,
  allAgents,
  isAiAutoReply,
  onToggleAiAutoReply,
  isVoiceListening,
  setIsVoiceListening,
  onVoiceTranscript
}) => {
  const [inputText, setInputText] = useState("");
  const [senderName, setSenderName] = useState("Steve");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendChatMessage(inputText.trim(), senderName);
    setInputText("");
  };

  const quickCommands = [
    { label: "!assist me", cmd: `!assist ${activeAgent.name}` },
    { label: "!build nether_portal", cmd: "!build nether_portal" },
    { label: "!guard spawn", cmd: "!guard spawn" },
    { label: "!mine cobblestone", cmd: "!mine cobblestone" },
    { label: "!status", cmd: `!status ${activeAgent.name}` },
    { label: "What can you do?", cmd: `Hey ${activeAgent.name}, what tasks can you do?` },
  ];

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 shadow-lg flex flex-col h-[460px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-emerald-950/80 border border-emerald-800/80 text-emerald-400">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">In-Game Chat Perception</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                Fabric 26.2 ChatHud
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Captures live Minecraft chat events & enables bidirectional AI dialogue
            </p>
          </div>
        </div>

        {/* Auto-Reply & Channel Badge */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleAiAutoReply}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border transition-all ${
              isAiAutoReply
                ? "bg-emerald-950/90 text-emerald-400 border-emerald-700/80"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-300"
            }`}
            title="Automatically trigger AI brain decision loop when players speak in-game"
          >
            <Bot className="h-3 w-3" />
            <span>AI Auto-Listen: {isAiAutoReply ? "ON" : "OFF"}</span>
          </button>
        </div>
      </div>

      {/* Voice Integration */}
      <div className="mb-4">
        <VoiceCommand 
          isListening={isVoiceListening} 
          setIsListening={setIsVoiceListening} 
          onTranscript={onVoiceTranscript} 
        />
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs scrollbar-thin">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-4">
            <MessageSquare className="h-8 w-8 text-slate-700 mb-2" />
            <p className="font-semibold text-slate-400">Chat Stream Quiet</p>
            <p className="text-[11px] max-w-xs text-slate-500 mt-1">
              Send a message below or use a quick command. The AI perception system will read it and coordinate actions!
            </p>
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isSelfAi = msg.isAi;
            const isSystem = msg.channel === "system" || msg.sender === "Server";

            return (
              <div
                key={msg.id}
                className={`p-2 rounded-lg transition-colors border ${
                  isSelfAi
                    ? "bg-emerald-950/30 border-emerald-900/40 text-emerald-200"
                    : isSystem
                    ? "bg-amber-950/20 border-amber-900/30 text-amber-200"
                    : "bg-slate-950/80 border-slate-850 text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                  <div className="flex items-center gap-1.5">
                    {isSelfAi ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <Bot className="h-3 w-3" />
                        &lt;{msg.sender}&gt;
                      </span>
                    ) : isSystem ? (
                      <span className="text-amber-400 font-bold">[Server Broadcast]</span>
                    ) : (
                      <span className="text-sky-400 font-bold">&lt;{msg.sender}&gt;</span>
                    )}
                    {msg.channel === "whisper" && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                        whisper
                      </span>
                    )}
                  </div>
                  <span className="font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
                <div className="text-slate-200 break-words leading-relaxed pl-1">{msg.text}</div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Command Chips */}
      <div className="pt-2 pb-2 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-mono text-slate-500 shrink-0">Triggers:</span>
        {quickCommands.map((qc, i) => (
          <button
            key={i}
            onClick={() => onSendChatMessage(qc.cmd, senderName)}
            className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            {qc.label}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="pt-2 border-t border-slate-800 flex gap-2">
        <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg shrink-0">
          <User className="h-3.5 w-3.5 text-sky-400" />
          <input
            type="text"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            className="w-16 bg-transparent text-xs font-mono text-sky-300 focus:outline-none"
            title="Sender username"
          />
        </div>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Type in-game message or !command to ${activeAgent.name}...`}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-bold text-xs font-mono transition-all shadow-sm shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
