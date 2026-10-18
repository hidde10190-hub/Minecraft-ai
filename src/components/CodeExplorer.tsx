import React, { useState } from "react";
import { PROJECT_SOURCE_FILES, SourceFile } from "../data/sourceFiles";
import { 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  Search, 
  FolderTree, 
  ExternalLink,
  Code2
} from "lucide-react";

export const CodeExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<SourceFile>(PROJECT_SOURCE_FILES[2]); // AiInputController by default
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const filteredFiles = PROJECT_SOURCE_FILES.filter((file) => {
    const matchesSearch = file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          file.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          file.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = () => {
    const blob = new Blob([selectedFile.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = selectedFile.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-emerald-400" />
          <h2 className="text-base font-bold text-slate-100">Project Source Code & Mixins</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-750 text-slate-200 text-xs font-mono rounded px-3 py-1.5 focus:outline-none focus:border-emerald-400"
          >
            <option value="ALL">All Categories ({PROJECT_SOURCE_FILES.length})</option>
            <option value="Standalone Launcher">Standalone Launcher</option>
            <option value="Java Fabric Mod">Java Fabric Mod</option>
            <option value="Python Brain">Python Brain</option>
            <option value="Configuration">Configuration</option>
          </select>

          {/* Search Input */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-750 text-slate-200 text-xs font-mono rounded pl-8 pr-3 py-1.5 focus:outline-none focus:border-emerald-400 w-44 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Main IDE Layout: File Sidebar + Code View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Sidebar: File Tree */}
        <div className="lg:col-span-1 rounded-xl bg-slate-900 border border-slate-800 p-3 shadow-lg max-h-[640px] overflow-y-auto scrollbar-thin">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 px-2 py-1.5 border-b border-slate-800 mb-2">
            <FolderTree className="h-4 w-4 text-emerald-400" />
            <span>Workspace Files</span>
          </div>

          <div className="space-y-1">
            {filteredFiles.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left p-2 rounded-lg text-xs font-mono transition-all flex flex-col ${
                    isSelected
                      ? "bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm"
                      : "text-slate-300 hover:bg-slate-850/60 hover:text-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium truncate">
                    <FileCode className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-emerald-400" : "text-slate-400"}`} />
                    <span className="truncate">{file.filename}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 truncate mt-0.5 ml-5">
                    {file.path}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Code Display Area */}
        <div className="lg:col-span-3 rounded-xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col overflow-hidden max-h-[640px]">
          {/* File Tab Info & Actions */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/90 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-200">
                  {selectedFile.filename}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-850 text-slate-400 border border-slate-750">
                  {selectedFile.category}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-lg">
                {selectedFile.description}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-mono transition-colors"
                title="Copy to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadSingle}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-mono transition-colors"
                title="Download this file"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Save</span>
              </button>
            </div>
          </div>

          {/* Code Viewer with Line Numbers */}
          <div className="flex-1 overflow-auto bg-[#090d16] p-4 text-xs font-mono scrollbar-thin">
            <pre className="text-slate-200 leading-relaxed">
              <code>
                {selectedFile.content.split("\n").map((line, idx) => (
                  <div key={idx} className="table-row hover:bg-slate-900/60">
                    <span className="table-cell pr-4 text-right select-none text-slate-600 font-mono text-[11px] w-10">
                      {idx + 1}
                    </span>
                    <span className="table-cell whitespace-pre">{line}</span>
                  </div>
                ))}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
