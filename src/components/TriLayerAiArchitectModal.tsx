import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cpu, 
  Layers, 
  Briefcase, 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  Play, 
  Workflow, 
  FileCode, 
  ShieldCheck, 
  HelpCircle,
  Database,
  Server,
  Zap,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { runTriLayerOrchestrator, fetchN8nWorkflowTemplates, TriLayerAgentResponse } from '../services/aiArchitectService';
import { MediaSpot } from '../types/ooh';

interface TriLayerAiArchitectModalProps {
  isOpen: boolean;
  onClose: () => void;
  spots: MediaSpot[];
  isAdmin?: boolean;
}

type AgentLayerMode = 'orchestrated_full' | 'chief_architect' | 'business_agent' | 'automation_agent' | 'n8n_hub';

export const TriLayerAiArchitectModal: React.FC<TriLayerAiArchitectModalProps> = ({
  isOpen,
  onClose,
  spots,
  isAdmin = false
}) => {
  const [activeLayer, setActiveLayer] = useState<AgentLayerMode>('orchestrated_full');
  const [promptInput, setPromptInput] = useState<string>(
    'Rancang arsitektur sistem enterprise OOH & DOOH Bandung lengkap dengan evaluasi 15 bagian, topologi sistem, database schema, otorisasi RBAC, otomasi n8n playlog, dan optimasi yield videotron.'
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [responseResult, setResponseResult] = useState<TriLayerAgentResponse | null>(null);
  const [n8nTemplates, setN8nTemplates] = useState<Record<string, any>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeOutputTab, setActiveOutputTab] = useState<'architecture' | 'diagram' | 'n8n' | 'rules'>('architecture');

  const totalSpots = spots.length;
  const doohSpots = spots.filter(s => s.category === 'DOOH_DIGITAL').length;
  const availableSpots = spots.filter(s => s.isAvailable).length;

  useEffect(() => {
    if (isOpen) {
      // Pre-fetch n8n workflow templates
      fetchN8nWorkflowTemplates()
        .then(res => {
          if (res?.templates) setN8nTemplates(res.templates);
        })
        .catch(err => console.warn('Could not load n8n templates:', err));

      // Auto-run baseline if no result yet
      if (!responseResult) {
        handleExecuteAgent('orchestrated_full');
      }
    }
  }, [isOpen]);

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDownloadJson = (data: any, filename: string) => {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExecuteAgent = async (layerToRun: AgentLayerMode = activeLayer) => {
    if (layerToRun === 'n8n_hub') {
      setActiveOutputTab('n8n');
      return;
    }

    setIsLoading(true);
    try {
      const res = await runTriLayerOrchestrator(
        promptInput, 
        layerToRun, 
        { totalSpots, doohSpots, availableSpots }
      );
      setResponseResult(res);
      setActiveOutputTab('architecture');
    } catch (err: any) {
      console.error('Execution error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const setPresetPrompt = (preset: string, layer: AgentLayerMode = 'orchestrated_full') => {
    setPromptInput(preset);
    setActiveLayer(layer);
    handleExecuteAgent(layer);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/70 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-indigo-950/60 border border-white/10">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Tri-Layer AI Architecture Center
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  CTO + DOOH Business + Automation
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Sistem AI 3-Lapis: Senior AI Architect, Business Planner, & Automation Engineer Production-Ready
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role & Layer Selector Tabs */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar flex-shrink-0">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Lapis Agen:
          </span>

          <button
            type="button"
            onClick={() => {
              setActiveLayer('orchestrated_full');
              handleExecuteAgent('orchestrated_full');
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all select-none cursor-pointer whitespace-nowrap ${
              activeLayer === 'orchestrated_full'
                ? 'bg-gradient-to-r from-indigo-600 to-emerald-600 text-white shadow-md shadow-indigo-950/50 border border-indigo-400/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Tri-Agent Consensus (15 Bagian)
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveLayer('chief_architect');
              handleExecuteAgent('chief_architect');
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all select-none cursor-pointer whitespace-nowrap ${
              activeLayer === 'chief_architect'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50 border border-indigo-400/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-300" />
            AI Chief Architect (CTO)
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveLayer('business_agent');
              handleExecuteAgent('business_agent');
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all select-none cursor-pointer whitespace-nowrap ${
              activeLayer === 'business_agent'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 border border-emerald-400/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-emerald-300" />
            AI OOH/DOOH Business Agent
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveLayer('automation_agent');
              handleExecuteAgent('automation_agent');
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all select-none cursor-pointer whitespace-nowrap ${
              activeLayer === 'automation_agent'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50 border border-amber-400/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-amber-300" />
            AI Developer & Automation Agent
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveLayer('n8n_hub');
              setActiveOutputTab('n8n');
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all select-none cursor-pointer whitespace-nowrap ${
              activeLayer === 'n8n_hub'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50 border border-rose-400/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <Workflow className="w-3.5 h-3.5 text-rose-300" />
            n8n Workflow Hub
          </button>
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* Preset Prompts Chips */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Skenario Arsitektur & Otomasi Cepat:</span>
              <span className="text-[11px] text-slate-500 font-mono">
                {totalSpots} Titik Aktif ({doohSpots} Videotron)
              </span>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPresetPrompt('Rancang blueprint sistem enterprise OOH & DOOH Jawa Barat 15 bagian lengkap dengan diagram ASCII, database Firestore, dan otorisasi Superadmin.')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors text-left"
              >
                🏛️ Blueprint 15 Bagian Produksi
              </button>

              <button
                type="button"
                onClick={() => setPresetPrompt('Bagaimana strategi optimasi yield DOOH Videotron di Bandung (10 slot/loop, rate card prime time, dan playlog reconciliation SLA 95%)?', 'business_agent')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors text-left"
              >
                📊 Yield & Slotting DOOH Videotron
              </button>

              <button
                type="button"
                onClick={() => setPresetPrompt('Rancang workflow n8n otomatisasi dari lead prospek WhatsApp, validasi geofence, proposal AI, hingga insert ke collection clients di Firestore.', 'automation_agent')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors text-left"
              >
                ⚙️ Otomasi Lead-to-WhatsApp n8n
              </button>

              <button
                type="button"
                onClick={() => setPresetPrompt('Audit keamanan arsitektur sistem: pencegahan XSS injection, aturan Firestore RBAC, least privilege, dan penanganan rate limiting.', 'chief_architect')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors text-left"
              >
                🛡️ Audit RBAC & Geofence Security
              </button>
            </div>
          </div>

          {/* Prompt Input Box */}
          <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <label htmlFor="agent-prompt-input" className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                Instruksi Arsitektur / Kebutuhan Bisnis / Workflow:
              </label>
              <span className="font-mono text-[11px] text-slate-500">
                Mode: {activeLayer}
              </span>
            </div>

            <div className="flex gap-2">
              <textarea
                id="agent-prompt-input"
                rows={2}
                value={promptInput}
                onChange={e => setPromptInput(e.target.value)}
                placeholder="Tuliskan kebutuhan sistem, pertanyaan arsitektur, kalkulasi bisnis DOOH, atau integrasi otomasi..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-sans"
              />
              <button
                type="button"
                disabled={isLoading || !promptInput.trim()}
                onClick={() => handleExecuteAgent()}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 disabled:opacity-50 text-white rounded-lg font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1 shadow-lg shadow-indigo-950/60 transition-all cursor-pointer flex-shrink-0 min-w-[100px]"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px]">Memproses...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Eksekusi</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Artifact Output Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
              <button
                type="button"
                onClick={() => setActiveOutputTab('architecture')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeOutputTab === 'architecture'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                Blueprint Arsitektur (15 Bagian)
              </button>

              <button
                type="button"
                onClick={() => setActiveOutputTab('diagram')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeOutputTab === 'diagram'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                Diagram ASCII Sistem
              </button>

              <button
                type="button"
                onClick={() => setActiveOutputTab('n8n')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeOutputTab === 'n8n'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Workflow className="w-3.5 h-3.5 text-rose-400" />
                Workflow n8n (Import JSON)
              </button>

              <button
                type="button"
                onClick={() => setActiveOutputTab('rules')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeOutputTab === 'rules'
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Firestore Rules & Schema
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {activeOutputTab === 'architecture' && responseResult?.unifiedArchitecture && (
                <button
                  type="button"
                  onClick={() => handleCopyText(responseResult.unifiedArchitecture, 'arch')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedKey === 'arch' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedKey === 'arch' ? 'Tersalin' : 'Salin Dokumen'}
                </button>
              )}

              {activeOutputTab === 'n8n' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleCopyText(JSON.stringify(responseResult?.n8nWorkflowJson || n8nTemplates.ooh_lead_to_crm_whatsapp, null, 2), 'n8n')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'n8n' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === 'n8n' ? 'Tersalin' : 'Salin JSON'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadJson(responseResult?.n8nWorkflowJson || n8nTemplates.ooh_lead_to_crm_whatsapp, 'ooh-pipeline-n8n.json')}
                    className="px-2.5 py-1 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 hover:text-white border border-indigo-700/60 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    Unduh .json
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tab 1: Architecture Blueprint (15 Standard Sections) */}
          {activeOutputTab === 'architecture' && (
            <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 sm:p-6 text-slate-200 text-xs sm:text-sm leading-relaxed overflow-x-auto space-y-4">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-mono">AI Chief Architect & Tim 3-Lapis sedang menyusun arsitektur sistem...</p>
                </div>
              ) : responseResult?.unifiedArchitecture ? (
                <div className="prose prose-invert max-w-none space-y-3 font-sans">
                  {responseResult.unifiedArchitecture.split('\n\n').map((paragraph, idx) => {
                    if (paragraph.startsWith('### ')) {
                      return (
                        <div key={idx} className="pt-3 border-t border-slate-800/80 first:border-none first:pt-0">
                          <h3 className="text-sm sm:text-base font-bold text-emerald-400 flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-emerald-500 rounded-full inline-block" />
                            {paragraph.replace('### ', '')}
                          </h3>
                        </div>
                      );
                    }
                    if (paragraph.startsWith('```')) {
                      return (
                        <pre key={idx} className="p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-xs text-indigo-200 overflow-x-auto">
                          {paragraph.replace(/```[a-z]*/gi, '')}
                        </pre>
                      );
                    }
                    if (paragraph.startsWith('|')) {
                      return (
                        <div key={idx} className="overflow-x-auto py-1">
                          <pre className="font-mono text-[11px] sm:text-xs text-slate-300 leading-tight bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                            {paragraph}
                          </pre>
                        </div>
                      );
                    }
                    return (
                      <p key={idx} className="text-slate-300 whitespace-pre-line text-xs sm:text-sm">
                        {paragraph}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-slate-400">
                  <p>Belum ada eksekusi blueprint. Klik tombol "Eksekusi" di atas.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Diagram ASCII Sistem */}
          {activeOutputTab === 'diagram' && (
            <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 sm:p-5 overflow-x-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-400">
                <span className="font-mono font-semibold text-emerald-400">
                  ASCII Architecture Topology: Clean Modular Monolith & Tri-Agent Orchestration
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(`[ Public Visitor ]          [ Superadmin ]
       │                          │
       ▼ (Read Only)              ▼ (Auth Bearer)
┌─────────────────────────────────────────────────────────┐
│               Frontend Single Page App                  │
│       (Interactive Heatmap & Public Catalog)            │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS / REST
┌──────────────────────────▼──────────────────────────────┐
│            Express Backend & Security Gateway           │
│   ├── Geofence Validator (Jawa Barat Bounds)            │
│   ├── Input Sanitizer (Anti-XSS & Payload Protection)   │
│   └── RBAC Auth Guard (Superadmin Verification)         │
└────────────┬─────────────────────────────┬──────────────┘
             │                             │
    ┌────────▼────────┐           ┌────────▼────────┐
    │  Tri-Layer AI   │           │   Automation    │
    │  Orchestrator   │           │  (n8n Engine)   │
    │ (Gemini Flash)  │           │ Webhooks & Cron │
    └─────────────────┘           └────────┬────────┘
             │                             │
┌────────────▼─────────────────────────────▼──────────────┐
│           Cloud Firestore Persistent Storage            │
│   ├── /spots (Public Read, Admin Write)                 │
│   ├── /clients (CRM Pipeline Leads)                     │
│   └── /sync_logs & /notifications (Audit Trail)         │
└─────────────────────────────────────────────────────────┘`, 'ascii')}
                  className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                >
                  {copiedKey === 'ascii' ? 'Tersalin' : 'Salin Diagram'}
                </button>
              </div>

              <pre className="font-mono text-xs sm:text-sm text-indigo-300 leading-snug pt-3 overflow-x-auto select-all">
{`[ Public Visitor ]          [ Superadmin ]
       │                          │
       ▼ (Read Only)              ▼ (Auth Bearer)
┌─────────────────────────────────────────────────────────┐
│               Frontend Single Page App                  │
│       (Interactive Heatmap & Public Catalog)            │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS / REST
┌──────────────────────────▼──────────────────────────────┐
│            Express Backend & Security Gateway           │
│   ├── Geofence Validator (Jawa Barat Bounds)            │
│   ├── Input Sanitizer (Anti-XSS & Payload Protection)   │
│   └── RBAC Auth Guard (Superadmin Verification)         │
└────────────┬─────────────────────────────┬──────────────┘
             │                             │
    ┌────────▼────────┐           ┌────────▼────────┐
    │  Tri-Layer AI   │           │   Automation    │
    │  Orchestrator   │           │  (n8n Engine)   │
    │ (Gemini Flash)  │           │ Webhooks & Cron │
    └─────────────────┘           └────────┬────────┘
             │                             │
┌────────────▼─────────────────────────────▼──────────────┐
│           Cloud Firestore Persistent Storage            │
│   ├── /spots (Public Read, Admin Write)                 │
│   ├── /clients (CRM Pipeline Leads)                     │
│   └── /sync_logs & /notifications (Audit Trail)         │
└─────────────────────────────────────────────────────────┘`}
              </pre>
            </div>
          )}

          {/* Tab 3: n8n Workflow JSON Artifacts */}
          {activeOutputTab === 'n8n' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
                <Workflow className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white">Cara Import Workflow ke n8n:</h4>
                  <p className="text-slate-400 mt-0.5">
                    1. Buka instance n8n Anda (self-hosted / cloud) &rarr; Masuk ke menu Workflows &rarr; Klik tombol menu (tiga titik di kanan atas) &rarr; Pilih <strong>"Import from JSON"</strong>.<br />
                    2. Salin atau unduh JSON di bawah ini, lalu paste ke n8n. Seluruh node, triggers, if-condition, dan webhook akan langsung terbentuk otomatis!
                  </p>
                </div>
              </div>

              {/* Template Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div 
                  onClick={() => handleCopyText(JSON.stringify(n8nTemplates.ooh_lead_to_crm_whatsapp || responseResult?.n8nWorkflowJson, null, 2), 'n8n_card1')}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 cursor-pointer transition-all space-y-1.5 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white group-hover:text-rose-300 transition-colors">
                      1. Lead Intake &rarr; WhatsApp AI &rarr; Firestore
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Webhook Trigger
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Menerima lead dari form publik, memanggil endpoint AI Proposal, kirim draf WA ke pengiklan, dan sinkronisasi ke collection CRM Firestore.
                  </p>
                  <div className="text-[10px] text-slate-500 font-mono pt-1">
                    6 Nodes terintegrasi &bull; Click to copy JSON
                  </div>
                </div>

                <div 
                  onClick={() => handleCopyText(JSON.stringify(n8nTemplates.dooh_playlog_audit_alert, null, 2), 'n8n_card2')}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all space-y-1.5 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white group-hover:text-amber-300 transition-colors">
                      2. DOOH Playlog SLA Audit &rarr; Telegram Alert
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Cron 1 Jam
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Memeriksa play count pemutar videotron DOOH tiap jam. Jika pencapaian tayang di bawah 95%, bot Telegram langsung memberi alert teknisi.
                  </p>
                  <div className="text-[10px] text-slate-500 font-mono pt-1">
                    5 Nodes terintegrasi &bull; Click to copy JSON
                  </div>
                </div>
              </div>

              {/* Raw JSON Box */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 overflow-x-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                  <span className="font-mono text-slate-400">n8n_workflow_production.json</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(JSON.stringify(responseResult?.n8nWorkflowJson || n8nTemplates.ooh_lead_to_crm_whatsapp, null, 2), 'raw_json')}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                  >
                    {copiedKey === 'raw_json' ? 'Tersalin!' : 'Salin JSON Lengkap'}
                  </button>
                </div>
                <pre className="font-mono text-[11px] sm:text-xs text-rose-300/90 leading-snug pt-3 max-h-80 overflow-y-auto select-all">
                  {JSON.stringify(responseResult?.n8nWorkflowJson || n8nTemplates.ooh_lead_to_crm_whatsapp, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Tab 4: Firestore Rules & Schema */}
          {activeOutputTab === 'rules' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white">Prinsip Keamanan Cloud Firestore (RBAC):</h4>
                  <p className="text-slate-400 mt-0.5">
                    1. <strong>Katalog Publik Read-Only</strong>: Publik dan calon pengiklan dapat melihat seluruh titik reklame tanpa hambatan login.<br />
                    2. <strong>Admin Write Only</strong>: Menambah, mengubah, menghapus titik, atau mengupdate ketersediaan hanya diizinkan untuk akun Superadmin terotentikasi (<code className="text-amber-300 font-mono">suherman.reklame2012@gmail.com</code>).
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 overflow-x-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                  <span className="font-mono text-emerald-400">firestore.rules (Production Validated)</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(responseResult?.firestoreRulesArtifact || `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSuperAdmin() {
      return request.auth != null && (
        request.auth.token.email.lower() == "suherman.reklame2012@gmail.com" ||
        request.auth.token.role == "admin"
      );
    }
    match /spots/{spotId} {
      allow read: if true;
      allow write: if isSuperAdmin();
    }
    match /clients/{clientId} {
      allow read, write: if isSuperAdmin();
    }
  }
}`, 'rules')}
                    className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                  >
                    {copiedKey === 'rules' ? 'Tersalin!' : 'Salin Rules'}
                  </button>
                </div>
                <pre className="font-mono text-xs text-emerald-300/90 leading-relaxed pt-3 overflow-x-auto select-all">
{responseResult?.firestoreRulesArtifact || `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }
    function isSuperAdmin() {
      return isSignedIn() && (
        request.auth.token.email.lower() == "suherman.reklame2012@gmail.com" ||
        request.auth.token.role == "admin"
      );
    }

    // Katalog Publik: Siapapun dapat melihat titik, hanya Admin yang boleh menambah/mengubah
    match /spots/{spotId} {
      allow read: if true;
      allow write: if isSuperAdmin();
    }

    // Data CRM Klien: Hanya Admin yang dapat mengelola
    match /clients/{clientId} {
      allow read, write: if isSuperAdmin();
    }

    // Notifikasi & Log Audit
    match /notifications/{notifId} {
      allow read: if true;
      allow write: if isSuperAdmin();
    }
    match /sync_logs/{logId} {
      allow read: if true;
      allow write: if isSuperAdmin();
    }
  }
}`}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px] text-slate-300">
              Orchestrator Model: Gemini 3.8 Flash &bull; Server-Side Guard
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
