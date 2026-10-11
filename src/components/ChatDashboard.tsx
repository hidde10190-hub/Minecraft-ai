import React, { useState, useRef, useEffect } from "react";
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Shield, 
  Sparkles, 
  Sliders, 
  Volume2, 
  VolumeX, 
  Ear, 
  EarOff, 
  Radio, 
  Check, 
  Search, 
  Download, 
  Trash2, 
  Terminal, 
  Zap, 
  Hammer, 
  Pickaxe, 
  Eye, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Clock,
  Compass
} from "lucide-react";
import { ChatMessage, AgentInstance, ChatDashboardSettings, ChatPerceptionIntent, AgentRole } from "../types";
import { playChatChime } from "../utils/audioChime";
import { evaluateMessageForSwarm } from "../utils/signAndMessageIntelligence";
import { VoiceCommand } from "./VoiceCommand";

interface ChatDashboardProps {
  chatMessages: ChatMessage[];
  onSendChatMessage: (text: string, sender?: string, channel?: "all" | "whisper" | "team") => void;
  onClearChat?: () => void;
  activeAgent: AgentInstance;
  allAgents: AgentInstance[];
  settings: ChatDashboardSettings;
  onUpdateSettings: (newSettings: Partial<ChatDashboardSettings>) => void;
  onSelectAgent: (agentId: string) => void;
  isVoiceListening: boolean;
  setIsVoiceListening: (val: boolean) => void;
  onVoiceTranscript: (text: string) => void;
}

export const ChatDashboard: React.FC<ChatDashboardProps> = ({
  chatMessages,
  onSendChatMessage,
  onClearChat,
  activeAgent,
  allAgents,
  settings,
  onUpdateSettings,
  onSelectAgent,
  isVoiceListening,
  setIsVoiceListening,
  onVoiceTranscript
}) => {
  const [inputText, setInputText] = useState("");
  const [senderName, setSenderName] = useState("Steve");
  const [selectedChannel, setSelectedChannel] = useState<"all" | "whisper" | "team">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "commands" | "agents" | "players" | "whispers">("all");
  const [viewMode, setViewMode] = useState<"hud" | "terminal">("hud");
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [customMacros, setCustomMacros] = useState<Array<{ label: string; cmd: string }>>([
    { label: "!assist me", cmd: `!assist ${activeAgent.name}` },
    { label: "!build nether_portal", cmd: "!build nether_portal" },
    { label: "!guard spawn", cmd: "!guard spawn" },
    { label: "!mine cobblestone", cmd: "!mine cobblestone" },
    { label: "!status", cmd: `!status ${activeAgent.name}` },
    { label: "!follow me", cmd: "!follow Steve" },
  ]);
  const [newMacroLabel, setNewMacroLabel] = useState("");
  const [newMacroCmd, setNewMacroCmd] = useState("");
  const [showMacroModal, setShowMacroModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, activeFilter, searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (settings.soundAlerts) {
      playChatChime("incoming");
    }

    onSendChatMessage(inputText.trim(), senderName, selectedChannel);
    setInputText("");
  };

  const handleAddMacro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMacroLabel.trim() || !newMacroCmd.trim()) return;
    setCustomMacros((prev) => [...prev, { label: newMacroLabel.trim(), cmd: newMacroCmd.trim() }]);
    setNewMacroLabel("");
    setNewMacroCmd("");
    setShowMacroModal(false);
  };

  // Filter messages based on activeFilter and searchQuery
  const filteredMessages = chatMessages.filter((msg) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = msg.text.toLowerCase().includes(q) || msg.sender.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (activeFilter === "commands") {
      return msg.text.startsWith("!") || msg.text.startsWith("/");
    }
    if (activeFilter === "agents") {
      return msg.isAi || allAgents.some((ag) => ag.name.toLowerCase() === msg.sender.toLowerCase());
    }
    if (activeFilter === "players") {
      return !msg.isAi && msg.sender !== "Server";
    }
    if (activeFilter === "whispers") {
      return msg.channel === "whisper";
    }
    return true;
  });

  // Calculate Last Cognitive Intent
  const lastUserMessage = [...chatMessages].reverse().find((m) => !m.isAi && m.sender !== "Server");
  const lastCognitiveIntent: ChatPerceptionIntent | null = lastUserMessage
    ? {
        rawMessage: lastUserMessage.text,
        sender: lastUserMessage.sender,
        timestamp: lastUserMessage.timestamp,
        category: lastUserMessage.text.startsWith("!") ? "command" : "dialogue",
        intent: lastUserMessage.text.startsWith("!build")
          ? "EXECUTE_SCHEMATIC_BUILD"
          : lastUserMessage.text.startsWith("!mine")
          ? "RESOURCE_EXCAVATION"
          : lastUserMessage.text.startsWith("!guard")
          ? "PERIMETER_DEFENSE"
          : lastUserMessage.text.startsWith("!assist")
          ? "OMNI_ASSIST_DIRECTIVE"
          : "NATURAL_CONVERSATION",
        targetAgent: activeAgent.name,
        targetRole: activeAgent.role,
        distanceFromPlayer: 3.2,
        confidence: 0.96,
        plannedAction: activeAgent.lastThought || "Synthesizing next physical motor action",
      }
    : null;

  // Export Chat Logs
  const handleExportChat = () => {
    const textContent = chatMessages
      .map((m) => `[${new Date(m.timestamp).toISOString()}] [${m.channel || "all"}] <${m.sender}>: ${m.text}`)
      .join("\n");
    const blob = new Blob([textContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `minecraft-chat-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Master Listen-to-Chat & Settings Ribbon */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left info & Title */}
          <div className="flex items-start sm:items-center gap-4">
            <div className={`p-3 rounded-xl border transition-all ${
              settings.listenToChat
                ? "bg-emerald-950/80 border-emerald-700/80 text-emerald-400 shadow-lg shadow-emerald-500/10"
                : "bg-slate-950 border-slate-800 text-slate-500"
            }`}>
              {settings.listenToChat ? <Ear className="h-6 w-6 animate-pulse" /> : <EarOff className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                  In-Game Chat Perception Dashboard
                </h2>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1.5 ${
                  settings.listenToChat
                    ? "bg-emerald-950 text-emerald-300 border-emerald-700/80"
                    : "bg-rose-950 text-rose-300 border-rose-800/80"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${settings.listenToChat ? "bg-emerald-400 animate-ping" : "bg-rose-400"}`} />
                  {settings.listenToChat ? "LISTENER ACTIVE (Fabric 26.2)" : "LISTENER MUTED"}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Hook: ChatHudMixin.java
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Inspect live in-game chatter, dispatch Minecraft commands, configure autonomous AI auto-replies, and toggle perception filters.
              </p>
            </div>
          </div>

          {/* Right Action Controls: Master Toggle & Settings Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Master Listen-to-Chat Button */}
            <button
              onClick={() => onUpdateSettings({ listenToChat: !settings.listenToChat })}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-xs font-bold border transition-all shadow-md ${
                settings.listenToChat
                  ? "bg-emerald-600 hover:bg-emerald-500 text-slate-950 border-emerald-500"
                  : "bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700"
              }`}
            >
              {settings.listenToChat ? <Ear className="h-4 w-4" /> : <EarOff className="h-4 w-4" />}
              <span>{settings.listenToChat ? "Listen to Chat: ON" : "Listen to Chat: OFF"}</span>
            </button>

            {/* AI Auto-Reply Toggle */}
            <button
              onClick={() => onUpdateSettings({ autoReply: !settings.autoReply })}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-mono text-xs border transition-all ${
                settings.autoReply
                  ? "bg-indigo-950/80 text-indigo-300 border-indigo-700/80 shadow-sm"
                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-300"
              }`}
              title="Automatically formulate AI cognitive responses when players speak in-game"
            >
              <Bot className="h-3.5 w-3.5" />
              <span>Auto-Reply: {settings.autoReply ? "ON" : "OFF"}</span>
            </button>

            {/* Audio Ping Toggle */}
            <button
              onClick={() => {
                const nextSound = !settings.soundAlerts;
                onUpdateSettings({ soundAlerts: nextSound });
                if (nextSound) playChatChime("command");
              }}
              className={`p-2 rounded-xl border transition-all ${
                settings.soundAlerts
                  ? "bg-amber-950/70 text-amber-300 border-amber-700/80"
                  : "bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-400"
              }`}
              title={settings.soundAlerts ? "Sound chime enabled on chat events" : "Sound chime muted"}
            >
              {settings.soundAlerts ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            {/* Settings Drawer Button */}
            <button
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-mono text-xs border transition-all ${
                showSettingsDrawer
                  ? "bg-slate-800 text-emerald-400 border-emerald-500/50"
                  : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900"
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Options</span>
              {showSettingsDrawer ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
        </div>

        {/* Collapsible Options Drawer */}
        {showSettingsDrawer && (
          <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            {/* Setting 1: Command Prefix Mode */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  Require Command Prefix
                </span>
                <input
                  type="checkbox"
                  checked={settings.requirePrefix}
                  onChange={(e) => onUpdateSettings({ requirePrefix: e.target.checked })}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer h-4 w-4"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Only trigger AI actions on messages starting with <span className="text-amber-300">"{settings.prefix}"</span> vs all natural speech.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-slate-500 text-[10px]">Prefix Char:</span>
                <input
                  type="text"
                  value={settings.prefix}
                  maxLength={2}
                  onChange={(e) => onUpdateSettings({ prefix: e.target.value || "!" })}
                  className="w-12 bg-slate-900 border border-slate-750 rounded px-2 py-0.5 text-center text-xs text-amber-300 focus:outline-none"
                />
              </div>
            </div>

            {/* Setting 2: Swarm Loop Suppression */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5 text-cyan-400" />
                  Bot Loop Filter
                </span>
                <input
                  type="checkbox"
                  checked={settings.ignoreBots}
                  onChange={(e) => onUpdateSettings({ ignoreBots: e.target.checked })}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer h-4 w-4"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Ignore messages sent by other AI swarm units to prevent infinite conversational loops.
              </p>
              <span className={`text-[10px] px-2 py-0.5 rounded w-fit ${
                settings.ignoreBots ? "bg-cyan-950 text-cyan-300 border border-cyan-800" : "bg-slate-900 text-slate-500"
              }`}>
                {settings.ignoreBots ? "Anti-Loop Active" : "Unfiltered Swarm"}
              </span>
            </div>

            {/* Setting 3: Proactive Announcements */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5 text-emerald-400" />
                  Proactive Chat Broadcasts
                </span>
                <input
                  type="checkbox"
                  checked={settings.proactiveAnnounce}
                  onChange={(e) => onUpdateSettings({ proactiveAnnounce: e.target.checked })}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer h-4 w-4"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Agents announce milestones (schematic completion, hostile mob alerts, low food) to in-game chat.
              </p>
              <span className="text-[10px] text-slate-500">Auto-announcements: {settings.proactiveAnnounce ? "Enabled" : "Muted"}</span>
            </div>

            {/* Setting 4: Response Latency & Persona Tone */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
              <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                Humanize Typing Latency
              </span>
              <div className="grid grid-cols-3 gap-1">
                {(["instant", "natural", "deliberate"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => onUpdateSettings({ humanizeDelay: d })}
                    className={`py-1 rounded text-[10px] border capitalize transition-all ${
                      settings.humanizeDelay === d
                        ? "bg-indigo-950 text-indigo-300 border-indigo-700"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500 text-[10px]">Persona:</span>
                <select
                  value={settings.personaTone}
                  onChange={(e) => onUpdateSettings({ personaTone: e.target.value as any })}
                  className="bg-slate-900 border border-slate-750 rounded px-2 py-0.5 text-[10px] text-slate-200 focus:outline-none"
                >
                  <option value="assistant">Universal Assistant</option>
                  <option value="tactical">Tactical Ops</option>
                  <option value="casual">Casual Companion</option>
                  <option value="roleplay">Roleplay Sentry</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Chat Feed (Left 7 Cols) + Cognitive Perception & Control (Right 5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Chat Feed & Controls */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col h-[580px] overflow-hidden">
            {/* Feed Controls Header */}
            <div className="p-3.5 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
              {/* Channel Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none font-mono text-xs">
                {[
                  { id: "all", label: `All (${chatMessages.length})` },
                  { id: "commands", label: "Commands (!)" },
                  { id: "players", label: "Players" },
                  { id: "agents", label: "AI Swarm" },
                  { id: "whispers", label: "Whispers" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap text-[11px] ${
                      activeFilter === tab.id
                        ? "bg-emerald-600 text-slate-950 font-bold shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* View Mode & Actions */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode("hud")}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition-all ${
                      viewMode === "hud" ? "bg-slate-800 text-emerald-400 font-bold" : "text-slate-400 hover:text-slate-300"
                    }`}
                    title="Authentic Minecraft HUD Chat View"
                  >
                    HUD View
                  </button>
                  <button
                    onClick={() => setViewMode("terminal")}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition-all ${
                      viewMode === "terminal" ? "bg-slate-800 text-emerald-400 font-bold" : "text-slate-400 hover:text-slate-300"
                    }`}
                    title="Telemetry & Packet Terminal View"
                  >
                    Terminal
                  </button>
                </div>

                <button
                  onClick={handleExportChat}
                  className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Export Chat Log (.txt)"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>

                {onClearChat && (
                  <button
                    onClick={onClearChat}
                    className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-300 transition-colors"
                    title="Clear Chat Stream"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Search Bar */}
            <div className="px-3.5 py-1.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages or players..."
                className="w-full bg-transparent text-xs font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-[10px] font-mono text-slate-500 hover:text-slate-300">
                  clear
                </button>
              )}
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2 font-mono text-xs scrollbar-thin">
              {/* Voice Perception Ribbon */}
              <div className="mb-4">
                <VoiceCommand 
                  isListening={isVoiceListening} 
                  setIsListening={setIsVoiceListening} 
                  onTranscript={onVoiceTranscript} 
                />
              </div>

              {!settings.listenToChat && (
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-300 flex items-center gap-2.5 text-xs mb-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <div>
                    <span className="font-bold">Chat Perception is Muted:</span> Incoming messages are not analyzed by AI agents. Toggle <strong>Listen to Chat: ON</strong> above to resume active listening.
                  </div>
                </div>
              )}

              {filteredMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-6">
                  <MessageSquare className="h-10 w-10 text-slate-700 mb-2" />
                  <p className="font-bold text-slate-300">No Chat Messages Found</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    {searchQuery ? "No messages match your search filter." : "Send an in-game message below or trigger a quick command macro to test perception!"}
                  </p>
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isAiSender = msg.isAi || allAgents.some((a) => a.name.toLowerCase() === msg.sender.toLowerCase());
                  const isServer = msg.sender === "Server" || msg.channel === "system";
                  const isCommand = msg.text.startsWith("!") || msg.text.startsWith("/");
                  const matchedAgent = allAgents.find((a) => a.name.toLowerCase() === msg.sender.toLowerCase());

                  if (viewMode === "terminal") {
                    return (
                      <div
                        key={msg.id}
                        className="p-2 rounded bg-slate-950 border border-slate-850 hover:border-slate-750 transition-colors font-mono text-[11px]"
                      >
                        <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
                          <span className="text-slate-400">
                            PACKET:CHAT_EVENT [{new Date(msg.timestamp).toISOString()}]
                          </span>
                          <span className="text-slate-600">ID:{msg.id.slice(-6)}</span>
                        </div>
                        <div className="text-slate-300">
                          <span className={isAiSender ? "text-emerald-400 font-bold" : isServer ? "text-amber-400 font-bold" : "text-sky-400 font-bold"}>
                            &lt;{msg.sender}&gt;
                          </span>{" "}
                          <span className="text-slate-200">{msg.text}</span>
                        </div>
                        {msg.channel && (
                          <div className="text-[9px] text-slate-500 mt-1 flex items-center gap-2">
                            <span>SCOPE:{msg.channel.toUpperCase()}</span>
                            {isCommand && <span className="text-amber-400 font-semibold">FLAG:COMMAND_TRIGGER</span>}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Default HUD Mode (Authentic Minecraft feel)
                  return (
                    <div
                      key={msg.id}
                      className={`p-2.5 rounded-xl border transition-all ${
                        isAiSender
                          ? "bg-slate-950/80 border-emerald-900/60 shadow-sm shadow-emerald-950/20"
                          : isServer
                          ? "bg-amber-950/25 border-amber-800/40 text-amber-200"
                          : isCommand
                          ? "bg-slate-950/90 border-indigo-900/50"
                          : "bg-slate-950/70 border-slate-850 hover:border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                        <div className="flex items-center gap-2">
                          {isAiSender ? (
                            <span className="flex items-center gap-1 text-emerald-400 font-bold">
                              <Bot className="h-3 w-3" />
                              &lt;{msg.sender}&gt;
                            </span>
                          ) : isServer ? (
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              [Server Broadcast]
                            </span>
                          ) : (
                            <span className="text-sky-400 font-bold flex items-center gap-1">
                              <User className="h-3 w-3" />
                              &lt;{msg.sender}&gt;
                            </span>
                          )}

                          {matchedAgent && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                              {matchedAgent.role}
                            </span>
                          )}

                          {msg.channel === "whisper" && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                              /whisper
                            </span>
                          )}
                          {isCommand && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80">
                              command
                            </span>
                          )}
                        </div>

                        <span className="text-slate-500">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>

                      <div className="text-slate-200 pl-1 text-xs break-words leading-relaxed font-sans sm:font-mono">
                        {msg.text}
                      </div>

                      {/* Multi-Bot Intent Perception Badge */}
                      {!isAiSender && !isServer && (
                        (() => {
                          const evalRecord = evaluateMessageForSwarm(msg, allAgents);
                          const winningAgent = allAgents.find((a) => a.id === evalRecord.winningAgentId);
                          const bestEval = evalRecord.winningAgentId ? evalRecord.evaluations[evalRecord.winningAgentId] : null;

                          return (
                            <div className="mt-2 pt-1.5 border-t border-slate-900 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-500">Cognitive Routing:</span>
                                {winningAgent ? (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 font-bold">
                                    <Bot className="h-2.5 w-2.5" />
                                    <span>{winningAgent.name} ({winningAgent.role})</span>
                                    <span className="text-[9px] opacity-75">{Math.round((bestEval?.confidence || 0.9) * 100)}%</span>
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                                    Swarm Standby
                                  </span>
                                )}
                              </div>
                              {bestEval && (
                                <span className="text-slate-500 italic truncate max-w-[200px]" title={bestEval.reason}>
                                  {bestEval.reason}
                                </span>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Macro Bar */}
            <div className="p-2 border-t border-slate-800/80 bg-slate-950/70 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[10px] font-mono text-slate-500 shrink-0 flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-400" />
                Macros:
              </span>
              {customMacros.map((macro, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (settings.soundAlerts) playChatChime("command");
                    onSendChatMessage(macro.cmd, senderName, selectedChannel);
                  }}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-850 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors whitespace-nowrap shrink-0 hover:text-emerald-400 hover:border-emerald-500/50"
                >
                  {macro.label}
                </button>
              ))}
              <button
                onClick={() => setShowMacroModal(true)}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors shrink-0 flex items-center gap-1"
                title="Add custom command macro"
              >
                <Plus className="h-3 w-3" />
                <span>Add</span>
              </button>
            </div>

            {/* Input Composer Form */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-1.5">
                {/* Sender Impersonation */}
                <div className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl shrink-0">
                  <User className="h-3.5 w-3.5 text-sky-400" />
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-16 bg-transparent text-xs font-mono text-sky-300 focus:outline-none"
                    title="Player callsign / username"
                  />
                </div>

                {/* Scope selector: All or Whisper */}
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs font-mono text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="all">/all</option>
                  <option value="whisper">/whisper</option>
                  <option value="team">/team</option>
                </select>
              </div>

              {/* Text Input */}
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Send in-game message or !command to ${activeAgent.name}...`}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-bold text-xs font-mono transition-all shadow-md shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Live Cognitive Perception & Swarm Dispatch */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Listening Agent Card */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-400">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                    Perception Target
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Agent executing commands from chat
                  </p>
                </div>
              </div>

              {/* Agent Picker Dropdown */}
              <select
                value={activeAgent.id}
                onChange={(e) => onSelectAgent(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {allAgents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name} ({ag.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Target Agent Telemetry Snapshot */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-850">
                <span className="text-[10px] text-slate-500 block">Agent Status</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5 capitalize">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {activeAgent.status}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-850">
                <span className="text-[10px] text-slate-500 block">Current Role</span>
                <span className="text-indigo-300 font-bold flex items-center gap-1 mt-0.5">
                  {activeAgent.role === "Assistant" && <Sparkles className="h-3 w-3 text-indigo-400" />}
                  {activeAgent.role}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-850 font-mono text-[11px] space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Coordinates:</span>
                <span className="text-slate-200">
                  X: {activeAgent.player.x.toFixed(1)} Y: {activeAgent.player.y.toFixed(1)} Z: {activeAgent.player.z.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Health / Food:</span>
                <span className="text-rose-400">
                  {activeAgent.player.health} HP / {activeAgent.player.food} Food
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Selected Slot:</span>
                <span className="text-amber-400">
                  Slot #{activeAgent.player.selectedSlot} ({activeAgent.player.hotbar[activeAgent.player.selectedSlot]?.item.replace("minecraft:", "") || "empty"})
                </span>
              </div>
            </div>
          </div>

          {/* Live Cognitive Intent Breakdown */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                    Perceived Intent & Action
                  </h3>
                  <p className="text-[11px] text-slate-400">Real-time NLP reasoning</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-emerald-800/60 font-bold">
                Confidence 96%
              </span>
            </div>

            {lastCognitiveIntent ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-850 space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Last Speaker: &lt;{lastCognitiveIntent.sender}&gt;</span>
                    <span>Distance: ~{lastCognitiveIntent.distanceFromPlayer}m</span>
                  </div>
                  <div className="text-slate-200 font-sans italic">
                    "{lastCognitiveIntent.rawMessage}"
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-850 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Parsed Category:</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase font-bold text-[10px]">
                      {lastCognitiveIntent.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Primary Objective:</span>
                    <span className="text-slate-200 font-bold">{lastCognitiveIntent.intent}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Assigned Unit:</span>
                    <span className="text-indigo-300">{activeAgent.name} ({activeAgent.role})</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-850 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                    Agent Cognitive Output:
                  </span>
                  <p className="text-slate-300 font-sans text-xs leading-relaxed">
                    {activeAgent.lastThought || "Standing by in listen mode; monitoring chat channel for commands."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 text-center text-slate-500 text-xs">
                Send a message in the chat box to see live NLP extraction & intent parsing.
              </div>
            )}
          </div>

          {/* Quick Simulation Trigger Buttons */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-xl">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-2 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              Simulate In-Game Server Scenarios
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <button
                onClick={() => {
                  if (settings.soundAlerts) playChatChime("command");
                  onSendChatMessage(`!assist me with obsidian gathering`, "Steve", "all");
                }}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-left text-slate-300 hover:text-emerald-400 transition-colors"
              >
                <div className="font-bold text-[11px] text-emerald-400">!assist me</div>
                <div className="text-[10px] text-slate-500">Call omni-assistant to coordinate</div>
              </button>

              <button
                onClick={() => {
                  if (settings.soundAlerts) playChatChime("command");
                  onSendChatMessage(`!build nether_portal`, "Steve", "all");
                }}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-left text-slate-300 hover:text-cyan-400 transition-colors"
              >
                <div className="font-bold text-[11px] text-cyan-400">!build nether_portal</div>
                <div className="text-[10px] text-slate-500">Trigger Litematica auto-build</div>
              </button>

              <button
                onClick={() => {
                  if (settings.soundAlerts) playChatChime("command");
                  onSendChatMessage(`!guard spawn from creepers`, "Alex", "all");
                }}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-left text-slate-300 hover:text-amber-400 transition-colors"
              >
                <div className="font-bold text-[11px] text-amber-400">!guard spawn</div>
                <div className="text-[10px] text-slate-500">Deploy defensive combat patrol</div>
              </button>

              <button
                onClick={() => {
                  if (settings.soundAlerts) playChatChime("command");
                  onSendChatMessage(`[Server]: Zombie horde detected near coordinate [120, 64, 30]`, "Server", "system");
                }}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-left text-slate-300 hover:text-rose-400 transition-colors"
              >
                <div className="font-bold text-[11px] text-rose-400">Server Alert</div>
                <div className="text-[10px] text-slate-500">Hostile event broadcast</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Custom Macro Modal */}
      {showMacroModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-400" />
                Add In-Game Command Macro
              </h3>
              <button onClick={() => setShowMacroModal(false)} className="text-slate-400 hover:text-slate-200 text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMacro} className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Button Label</label>
                <input
                  type="text"
                  value={newMacroLabel}
                  onChange={(e) => setNewMacroLabel(e.target.value)}
                  placeholder="e.g., !harvest wheat"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">In-Game Command / Message</label>
                <input
                  type="text"
                  value={newMacroCmd}
                  onChange={(e) => setNewMacroCmd(e.target.value)}
                  placeholder="e.g., !mine cobblestone 64"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMacroModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newMacroLabel.trim() || !newMacroCmd.trim()}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-bold"
                >
                  Save Macro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
