import React, { useState, useEffect } from "react";
import { 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  RotateCcw, 
  FileText, 
  Sparkles, 
  Clock, 
  Wrench, 
  Shield, 
  Activity, 
  ChevronRight, 
  Info,
  Search,
  Check,
  X,
  Gauge,
  Cpu,
  Layers,
  HelpCircle,
  RefreshCw
} from "lucide-react";

export interface SkillItem {
  id: string;
  name: string;
  category: "mining" | "movement" | "interaction" | "combat" | "survival";
  target?: string;
  tool?: string;
  requiredDurationMs: number;
  recommendedDurationMs: number;
  key: string;
  description: string;
  rule: string;
  learnedFromMistake?: boolean;
  updatedAt: string;
}

export interface FailureItem {
  id: string;
  timestamp: string;
  target: string;
  attemptedKey: string;
  attemptedDurationMs: number;
  requiredDurationMs: number;
  tool: string;
  reason: string;
  correctionAdvice: string;
  resolved: boolean;
  resolvedInSkillId?: string;
}

interface SkillsAndFailuresStudioProps {
  ollamaModel?: string;
  onSelectOllamaModel?: (m: string) => void;
  onTriggerGoal?: (goal: string) => void;
}

export const SkillsAndFailuresStudio: React.FC<SkillsAndFailuresStudioProps> = ({
  ollamaModel = "llama3.2:3b",
  onSelectOllamaModel,
  onTriggerGoal
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"skills" | "failures" | "tester">("skills");
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [failures, setFailures] = useState<FailureItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [reflecting, setReflecting] = useState<boolean>(false);
  const [reflectMsg, setReflectMsg] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Editing / Creating State
  const [editingSkill, setEditingSkill] = useState<SkillItem | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // New Skill Form
  const [formName, setFormName] = useState<string>("");
  const [formCategory, setFormCategory] = useState<SkillItem["category"]>("mining");
  const [formTarget, setFormTarget] = useState<string>("oak_log");
  const [formTool, setFormTool] = useState<string>("bare_hand");
  const [formReqDuration, setFormReqDuration] = useState<number>(1500);
  const [formRecDuration, setFormRecDuration] = useState<number>(2000);
  const [formKey, setFormKey] = useState<string>("attack");
  const [formRule, setFormRule] = useState<string>("Hold attack key for at least 2000ms.");
  const [formDesc, setFormDesc] = useState<string>("Learned motor rule for Minecraft interaction.");

  // Interactive Tester State
  const [testBlock, setTestBlock] = useState<string>("oak_log");
  const [testTool, setTestTool] = useState<string>("bare_hand");
  const [testDuration, setTestDuration] = useState<number>(500);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    requiredMs: number;
    attemptedMs: number;
    autoLearned?: boolean;
  } | null>(null);

  const fetchSkillsAndFailures = async () => {
    setLoading(true);
    try {
      const [skillsRes, failuresRes] = await Promise.all([
        fetch("/api/ai/skills"),
        fetch("/api/ai/failures")
      ]);
      if (skillsRes.ok) {
        const sData = await skillsRes.json();
        if (sData.skills) setSkills(sData.skills);
      }
      if (failuresRes.ok) {
        const fData = await failuresRes.json();
        if (fData.failures) setFailures(fData.failures);
      }
    } catch (e) {
      console.error("Error fetching skills/failures:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkillsAndFailures();
  }, []);

  const handleSaveSkill = async () => {
    const payload: Partial<SkillItem> = {
      ...(editingSkill ? { id: editingSkill.id } : {}),
      name: formName || "New Skill",
      category: formCategory,
      target: formTarget,
      tool: formTool,
      requiredDurationMs: Number(formReqDuration) || 1500,
      recommendedDurationMs: Number(formRecDuration) || 2000,
      key: formKey || "attack",
      rule: formRule || "Execute action",
      description: formDesc || "Learned motor action.",
      learnedFromMistake: editingSkill ? editingSkill.learnedFromMistake : false
    };

    try {
      const res = await fetch("/api/ai/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchSkillsAndFailures();
        setEditingSkill(null);
        setIsCreating(false);
      }
    } catch (e) {
      console.error("Error saving skill:", e);
    }
  };

  const handleDeleteSkill = async (id: string) => {
    if (!confirm("Are you sure you want to delete this learned skill?")) return;
    try {
      const res = await fetch(`/api/ai/skills/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchSkillsAndFailures();
      }
    } catch (e) {
      console.error("Error deleting skill:", e);
    }
  };

  const handleClearFailures = async () => {
    if (!confirm("Clear all recorded failures from failures.json?")) return;
    try {
      const res = await fetch("/api/ai/failures/clear", { method: "POST" });
      if (res.ok) {
        await fetchSkillsAndFailures();
      }
    } catch (e) {
      console.error("Error clearing failures:", e);
    }
  };

  const handleTriggerReflection = async () => {
    setReflecting(true);
    setReflectMsg("Bot is reading failures.json and synthesizing permanent fixes into skills.json...");
    try {
      const res = await fetch("/api/ai/reflect", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setReflectMsg(data.message || "Reflection cycle complete.");
        await fetchSkillsAndFailures();
      }
    } catch (e) {
      setReflectMsg("Reflection request failed.");
    } finally {
      setReflecting(false);
    }
  };

  const handleRunSimulatorTest = async () => {
    // Standard Minecraft hardness reference
    let requiredMs = 1500;
    if (testBlock.includes("log") || testBlock.includes("wood")) {
      requiredMs = testTool.includes("axe") ? 800 : 1500;
    } else if (testBlock.includes("stone") || testBlock.includes("cobble")) {
      requiredMs = testTool.includes("pickaxe") ? 1150 : 7500;
    } else if (testBlock.includes("dirt") || testBlock.includes("grass")) {
      requiredMs = testTool.includes("shovel") ? 400 : 750;
    }

    if (testDuration < requiredMs * 0.85) {
      // Failure!
      const failReason = `Attack key held for only ${testDuration}ms. The '${testBlock}' block was NOT broken because it requires at least ${requiredMs}ms!`;
      const correction = `Hold attack for at least ${Math.round(requiredMs * 1.25)}ms. Update skills file.`;
      
      // Auto-log to server failures
      await fetch("/api/ai/failures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: testBlock,
          attemptedKey: "attack",
          attemptedDurationMs: testDuration,
          requiredDurationMs: requiredMs,
          tool: testTool,
          reason: failReason,
          correctionAdvice: correction,
          resolved: true
        })
      });

      // Auto update skills.json
      await fetch("/api/ai/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `skill_mine_${testBlock}`,
          name: `Mine ${testBlock.toUpperCase()}`,
          category: "mining",
          target: testBlock,
          tool: testTool,
          requiredDurationMs: requiredMs,
          recommendedDurationMs: Math.round(requiredMs * 1.25),
          key: "attack",
          description: `Self-learned: '${testBlock}' needs at least ${requiredMs}ms continuous attack hold.`,
          rule: `Hold attack for ${Math.round(requiredMs * 1.25)}ms when mining ${testBlock}.`,
          learnedFromMistake: true
        })
      });

      setTestResult({
        success: false,
        message: `The '${testBlock}' block was NOT broken! You did not press for long enough (${testDuration}ms vs required ${requiredMs}ms). Recorded mistake in failures.json and auto-updated skills.json!`,
        requiredMs,
        attemptedMs: testDuration,
        autoLearned: true
      });
      fetchSkillsAndFailures();
    } else {
      setTestResult({
        success: true,
        message: `Block successfully broken! You held attack for ${testDuration}ms (threshold: ${requiredMs}ms). 1x ${testBlock} item dropped into inventory!`,
        requiredMs,
        attemptedMs: testDuration
      });
    }
  };

  const filteredSkills = skills.filter(s => {
    const matchCat = categoryFilter === "all" || s.category === categoryFilter;
    const matchSearch = searchQuery === "" || 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rule.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.target && s.target.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Banner & Fast Model Indicator */}
      <div className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">Bot Self-Learning & Skills Engine</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Live Dynamic Learning
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Autonomous motor learning loop: If the bot doesn't press attack long enough, it detects the block is NOT broken, records it in failures.json, and writes the fix into skills.json.
            </p>
          </div>
        </div>

        {/* Quick Model Selector (Prioritizing 3B) */}
        <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-1.5">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Fast Inference Model</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">{ollamaModel}</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-500/20 text-cyan-300 font-mono">
                {ollamaModel.includes("3b") ? "⚡ Ultra Fast 3B" : "Standard"}
              </span>
            </div>
          </div>
          {onSelectOllamaModel && (
            <div className="flex gap-1 ml-2">
              <button
                onClick={() => onSelectOllamaModel("llama3.2:3b")}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                  ollamaModel === "llama3.2:3b"
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
                title="Llama 3.2 3B - Ultra fast 3B model (User Recommended)"
              >
                3B (Fast)
              </button>
              <button
                onClick={() => onSelectOllamaModel("qwen2.5:3b")}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                  ollamaModel === "qwen2.5:3b"
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
                title="Qwen 2.5 3B Coder"
              >
                Qwen 3B
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3 border-b border-slate-800/80 bg-slate-900/40 text-xs">
        <div className="flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-cyan-400" />
          <div>
            <span className="text-slate-400">Total Skills in File:</span>{" "}
            <span className="font-bold text-white">{skills.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <div>
            <span className="text-slate-400">Failures Logged:</span>{" "}
            <span className="font-bold text-amber-300">{failures.length}</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <div>
            <span className="text-slate-400">Mistakes Self-Corrected:</span>{" "}
            <span className="font-bold text-emerald-300">
              {skills.filter(s => s.learnedFromMistake).length}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2.5 justify-end">
          <button
            onClick={fetchSkillsAndFailures}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Sync Files
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-slate-800 px-6 bg-slate-900/30 gap-2 pt-2">
        <button
          onClick={() => setActiveSubTab("skills")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-semibold transition ${
            activeSubTab === "skills"
              ? "border-amber-400 text-amber-400 bg-amber-400/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Zap className="w-4 h-4" />
          skills.json ({skills.length})
        </button>

        <button
          onClick={() => setActiveSubTab("failures")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-semibold transition ${
            activeSubTab === "failures"
              ? "border-amber-400 text-amber-400 bg-amber-400/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          failures.json ({failures.length})
        </button>

        <button
          onClick={() => setActiveSubTab("tester")}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-semibold transition ${
            activeSubTab === "tester"
              ? "border-cyan-400 text-cyan-400 bg-cyan-400/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Gauge className="w-4 h-4 text-cyan-400" />
          Mining Timing Tester & Simulator
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ========================================================================= */}
        {/* SUBTAB 1: SKILLS LIBRARY */}
        {/* ========================================================================= */}
        {activeSubTab === "skills" && (
          <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search skills by name, block target, rule..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-0 text-xs text-white placeholder-slate-500 focus:outline-none w-full"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  <option value="mining">Mining</option>
                  <option value="movement">Movement</option>
                  <option value="interaction">Interaction</option>
                  <option value="combat">Combat</option>
                </select>

                <button
                  onClick={() => {
                    setIsCreating(true);
                    setEditingSkill(null);
                    setFormName("");
                    setFormTarget("oak_log");
                    setFormReqDuration(1500);
                    setFormRecDuration(2000);
                    setFormKey("attack");
                    setFormRule("Hold attack for >= 2000ms.");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Skill
                </button>
              </div>
            </div>

            {/* Create/Edit Modal or Drawer */}
            {(isCreating || editingSkill) && (
              <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-amber-400" />
                    <h2 className="font-bold text-sm text-white">
                      {editingSkill ? `Edit Skill: ${editingSkill.name}` : "Create New Learned Skill"}
                    </h2>
                  </div>
                  <button
                    onClick={() => { setIsCreating(false); setEditingSkill(null); }}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Skill Name</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Mine Oak Log Barehanded"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="mining">Mining</option>
                      <option value="movement">Movement</option>
                      <option value="interaction">Interaction</option>
                      <option value="combat">Combat</option>
                      <option value="survival">Survival</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Target Block / Entity</label>
                    <input
                      type="text"
                      value={formTarget}
                      onChange={(e) => setFormTarget(e.target.value)}
                      placeholder="e.g. oak_log, stone, dirt"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Min Required Duration (ms)</label>
                    <input
                      type="number"
                      value={formReqDuration}
                      onChange={(e) => setFormReqDuration(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Recommended Duration (ms)</label>
                    <input
                      type="number"
                      value={formRecDuration}
                      onChange={(e) => setFormRecDuration(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Key / Control</label>
                    <input
                      type="text"
                      value={formKey}
                      onChange={(e) => setFormKey(e.target.value)}
                      placeholder="attack, w, use, space"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="text-xs space-y-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Self-Learned Rule (Injected into Prompt)</label>
                    <input
                      type="text"
                      value={formRule}
                      onChange={(e) => setFormRule(e.target.value)}
                      placeholder="e.g. Always hold attack key for at least 2000ms if no axe is equipped."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Detailed Description</label>
                    <textarea
                      rows={2}
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => { setIsCreating(false); setEditingSkill(null); }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSkill}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save to skills.json
                  </button>
                </div>
              </div>
            )}

            {/* Skills Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSkills.map((s) => (
                <div
                  key={s.id}
                  className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between space-y-3 transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-white">{s.name}</h3>
                          {s.learnedFromMistake && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Learned From Mistake
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                          Category: {s.category} • Key: <span className="text-amber-400 font-bold">{s.key}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingSkill(s);
                            setIsCreating(false);
                            setFormName(s.name);
                            setFormCategory(s.category);
                            setFormTarget(s.target || "");
                            setFormTool(s.tool || "");
                            setFormReqDuration(s.requiredDurationMs);
                            setFormRecDuration(s.recommendedDurationMs);
                            setFormKey(s.key);
                            setFormRule(s.rule);
                            setFormDesc(s.description);
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                          title="Edit Skill"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSkill(s.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400"
                          title="Delete Skill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{s.description}</p>

                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-xs">
                      <span className="text-amber-400 font-semibold block mb-0.5">Prompt Rule:</span>
                      <code className="text-slate-300 font-mono text-[11px]">{s.rule}</code>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-3 font-mono">
                      <span>Min: <span className="text-white font-bold">{s.requiredDurationMs}ms</span></span>
                      <span>Rec: <span className="text-emerald-400 font-bold">{s.recommendedDurationMs}ms</span></span>
                    </div>
                    {onTriggerGoal && s.target && (
                      <button
                        onClick={() => onTriggerGoal(`Mine 3x ${s.target} using your learned skill`)}
                        className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
                      >
                        Deploy Goal <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBTAB 2: FAILURES LOG */}
        {/* ========================================================================= */}
        {activeSubTab === "failures" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm text-white">failures.json (Error & Mistake Memory)</h3>
                  <p className="text-xs text-slate-400">When the bot presses keys too short or fails actions, it records them here and writes the resolution to skills.json.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTriggerReflection}
                  disabled={reflecting || failures.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs disabled:opacity-50 transition"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${reflecting ? "animate-spin" : ""}`} />
                  {reflecting ? "Reflecting..." : "Trigger Bot Self-Reflection"}
                </button>
                <button
                  onClick={handleClearFailures}
                  disabled={failures.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  Clear Failures
                </button>
              </div>
            </div>

            {reflectMsg && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>{reflectMsg}</span>
              </div>
            )}

            {failures.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                <h4 className="font-bold text-sm text-white">No Failures Recorded!</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  The bot has executed actions within verified timing thresholds. When an action fails, it will appear here with root-cause analysis.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {failures.map((f) => (
                  <div
                    key={f.id}
                    className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded bg-red-500/20 text-red-400 font-mono text-[10px] font-bold">
                          FAILED ACTION
                        </span>
                        <h4 className="font-bold text-sm text-white">Target: {f.target}</h4>
                        <span className="text-xs text-slate-400 font-mono">({f.timestamp.slice(11, 19)})</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-red-400">Attempted: {f.attemptedDurationMs}ms</span>
                        <span className="text-slate-500">vs</span>
                        <span className="text-emerald-400">Required: {f.requiredDurationMs}ms</span>
                      </div>
                    </div>

                    {/* Progress Bar comparison */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>Press Duration Ratio</span>
                        <span>{Math.round((f.attemptedDurationMs / f.requiredDurationMs) * 100)}% of hardness</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                          className="bg-red-500 h-full"
                          style={{ width: `${Math.min(100, (f.attemptedDurationMs / f.requiredDurationMs) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-1.5 text-xs">
                      <div>
                        <span className="text-red-400 font-semibold">Root Cause: </span>
                        <span className="text-slate-300">{f.reason}</span>
                      </div>
                      <div>
                        <span className="text-emerald-400 font-semibold">Self-Learned Fix: </span>
                        <span className="text-slate-300">{f.correctionAdvice}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Tool Used: <strong className="text-white">{f.tool}</strong></span>
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Resolution written into skills.json
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBTAB 3: TIMING TESTER & SIMULATOR */}
        {/* ========================================================================= */}
        {activeSubTab === "tester" && (
          <div className="space-y-4">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-4">
              <div>
                <h3 className="font-bold text-sm text-white">Block Hardness & Break Duration Tester</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Test what happens when the bot presses attack for too short a time vs holding it for the required hardness time.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Target Block</label>
                  <select
                    value={testBlock}
                    onChange={(e) => setTestBlock(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="oak_log">Oak Log (Wood - Hardness 2.0)</option>
                    <option value="birch_log">Birch Log (Wood - Hardness 2.0)</option>
                    <option value="stone">Stone (Hardness 1.5 - Needs Pickaxe)</option>
                    <option value="cobblestone">Cobblestone (Hardness 2.0)</option>
                    <option value="dirt">Dirt (Hardness 0.5)</option>
                    <option value="iron_ore">Iron Ore (Hardness 3.0)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Held Item / Tool</label>
                  <select
                    value={testTool}
                    onChange={(e) => setTestTool(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="bare_hand">Bare Hand (No tool)</option>
                    <option value="wooden_axe">Wooden Axe</option>
                    <option value="iron_axe">Iron Axe</option>
                    <option value="wooden_pickaxe">Wooden Pickaxe</option>
                    <option value="iron_pickaxe">Iron Pickaxe</option>
                    <option value="wooden_shovel">Wooden Shovel</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-400">Attack Key Duration</label>
                    <span className="font-mono text-cyan-400 font-bold">{testDuration} ms</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="4000"
                    step="50"
                    value={testDuration}
                    onChange={(e) => setTestDuration(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                    <span>100ms (quick tap)</span>
                    <span>1500ms</span>
                    <span>4000ms (long hold)</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setTestDuration(400)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                >
                  Set Too Short (400ms)
                </button>
                <button
                  onClick={() => setTestDuration(2000)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                >
                  Set Full Duration (2000ms)
                </button>
                <button
                  onClick={handleRunSimulatorTest}
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
                >
                  Test Mine Action
                </button>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-4 rounded-xl border space-y-2 ${
                  testResult.success
                    ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                    : "bg-red-950/30 border-red-500/40 text-red-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  )}
                  <h4 className="font-bold text-sm">
                    {testResult.success ? "Block Broken Successfully" : "Failure Detected: Block Was NOT Broken!"}
                  </h4>
                </div>

                <p className="text-xs leading-relaxed">{testResult.message}</p>

                {testResult.autoLearned && (
                  <div className="bg-slate-950/80 p-3 rounded-lg border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>
                      Self-learning engine triggered: The mistake was automatically saved to <strong>failures.json</strong> and the required timing (<strong>{testResult.requiredMs}ms</strong>) was written into <strong>skills.json</strong>!
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
