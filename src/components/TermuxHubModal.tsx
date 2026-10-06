import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Play,
  Copy,
  Check,
  Download,
  Server,
  RefreshCw,
  Cpu,
  Wifi,
  ExternalLink,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
  HelpCircle,
  X,
  ChevronRight,
  Code,
} from 'lucide-react';
import {
  checkTermuxServer,
  downloadFile,
  executeLocalCode,
  CODE_SNIPPETS_PRESETS,
  TERMUX_COMMANDS,
  TermuxServerStatus,
  CodeExecutionResult,
} from '../services/termuxService';

interface TermuxHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermuxHubModal: React.FC<TermuxHubModalProps> = ({ isOpen, onClose }) => {
  const [serverStatus, setServerStatus] = useState<TermuxServerStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Code runner state
  const [selectedSnippetIdx, setSelectedSnippetIdx] = useState(0);
  const [customCode, setCustomCode] = useState(CODE_SNIPPETS_PRESETS[0].code);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<CodeExecutionResult | null>(null);

  // Active tab inside modal
  const [activeSubTab, setActiveSubTab] = useState<'quickstart' | 'coderunner' | 'status' | 'guide'>('quickstart');

  // Check server status on mount and when modal opens
  const refreshStatus = async () => {
    setIsChecking(true);
    const status = await checkTermuxServer();
    setServerStatus(status);
    setIsChecking(false);
  };

  useEffect(() => {
    if (isOpen) {
      refreshStatus();
    }
  }, [isOpen]);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // fallback
    }
  };

  const handleSnippetSelect = (idx: number) => {
    setSelectedSnippetIdx(idx);
    setCustomCode(CODE_SNIPPETS_PRESETS[idx].code);
    setExecutionResult(null);
  };

  const handleRunCode = async () => {
    if (!customCode.trim()) return;
    setIsExecuting(true);
    const res = await executeLocalCode(customCode, 'javascript');
    setExecutionResult(res);
    setIsExecuting(false);
  };

  const handleDownloadSetupScript = () => {
    const scriptContent = `#!/data/data/com.termux/files/usr/bin/bash
# DroidLLM Termux Setup Script
set -e
echo "Installing Node.js and dependencies in Termux..."
pkg update -y && pkg install -y nodejs-lts git clang termux-api
termux-setup-storage || true
termux-wake-lock || true
echo "Ready! Running: npm install && npm start"
npm install
npm start
`;
    downloadFile('termux-setup.sh', scriptContent);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Termux & Local Server Studio
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  Android CLI
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Run local Node.js server & on-device GGUF execution directly in Termux
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Server Connection Banner */}
        <div className="px-4 py-2 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${serverStatus?.status === 'online' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            <span className="text-slate-300">
              {serverStatus?.status === 'online' ? (
                <>
                  <strong className="text-emerald-400">Server Connected:</strong> {serverStatus.environmentName}
                  {serverStatus.pingLatencyMs && <span className="text-slate-400 ml-1">({serverStatus.pingLatencyMs}ms)</span>}
                </>
              ) : (
                <span className="text-amber-300">Local Standby / Ready for Termux launch</span>
              )}
            </span>
          </div>

          <button
            onClick={refreshStatus}
            disabled={isChecking}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-400 transition"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
            Ping
          </button>
        </div>

        {/* Segmented Subtab Navigation */}
        <div className="flex gap-1 p-2 bg-slate-950/60 border-b border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('quickstart')}
            className={`flex-1 py-1.5 px-2 rounded-xl transition ${
              activeSubTab === 'quickstart' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ Quickstart
          </button>
          <button
            onClick={() => setActiveSubTab('coderunner')}
            className={`flex-1 py-1.5 px-2 rounded-xl transition ${
              activeSubTab === 'coderunner' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            💻 Code Runner
          </button>
          <button
            onClick={() => setActiveSubTab('status')}
            className={`flex-1 py-1.5 px-2 rounded-xl transition ${
              activeSubTab === 'status' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 Diagnostics
          </button>
          <button
            onClick={() => setActiveSubTab('guide')}
            className={`flex-1 py-1.5 px-2 rounded-xl transition ${
              activeSubTab === 'guide' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📖 Termux Guide
          </button>
        </div>

        {/* Body Container (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          
          {/* TAB 1: QUICKSTART COMMANDS */}
          {activeSubTab === 'quickstart' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    1-Line Complete Termux Setup & Server Boot
                  </span>
                  <button
                    onClick={() => copyToClipboard(TERMUX_COMMANDS.oneLinerInstall, 'oneLiner')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[10px] transition active:scale-95"
                  >
                    {copiedKey === 'oneLiner' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === 'oneLiner' ? 'Copied!' : 'Copy Command'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-300">
                  Installs Node.js LTS, git, activates wake lock (prevents sleep), installs packages, and launches local server:
                </p>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400 break-all select-all">
                  {TERMUX_COMMANDS.oneLinerInstall}
                </div>
              </div>

              {/* Daily Run with WakeLock */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    Daily Server Launcher (with CPU Wake Lock)
                  </span>
                  <button
                    onClick={() => copyToClipboard(TERMUX_COMMANDS.dailyRun, 'dailyRun')}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono transition"
                  >
                    {copiedKey === 'dailyRun' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    Copy
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Ensures Android Doze won't pause the server when the phone screen is turned off:
                </p>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-cyan-300 text-[11px]">
                  {TERMUX_COMMANDS.dailyRun}
                </div>
              </div>

              {/* cURL API Test */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-amber-400" />
                    Test Local Server from Termux Terminal (cURL)
                  </span>
                  <button
                    onClick={() => copyToClipboard(TERMUX_COMMANDS.curlTest, 'curlTest')}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono transition"
                  >
                    {copiedKey === 'curlTest' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    Copy
                  </button>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-amber-300 text-[11px]">
                  {TERMUX_COMMANDS.curlTest}
                </div>
              </div>

              {/* Direct Download Scripts to Android Device */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-200 block">Download Termux Scripts to Phone</span>
                  <span className="text-[11px] text-slate-400 block">
                    Save <code className="text-emerald-400">termux-setup.sh</code> directly to your Android device
                  </span>
                </div>
                <button
                  onClick={handleDownloadSetupScript}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition active:scale-95 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download .sh
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE CODE RUNNER */}
          {activeSubTab === 'coderunner' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-emerald-400" />
                  Select Test Snippet:
                </span>
                <select
                  value={selectedSnippetIdx}
                  onChange={(e) => handleSnippetSelect(parseInt(e.target.value, 10))}
                  className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  {CODE_SNIPPETS_PRESETS.map((preset, idx) => (
                    <option key={idx} value={idx}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] text-slate-400">
                {CODE_SNIPPETS_PRESETS[selectedSnippetIdx].description}
              </p>

              {/* Code Editor Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>JavaScript / Node.js Engine</span>
                  <button
                    onClick={() => setCustomCode(CODE_SNIPPETS_PRESETS[selectedSnippetIdx].code)}
                    className="hover:text-emerald-400 text-[10px]"
                  >
                    Reset Snippet
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl font-mono text-[11px] text-emerald-300 focus:outline-none focus:border-emerald-500/80 leading-relaxed"
                />
              </div>

              {/* Execute Button */}
              <button
                onClick={handleRunCode}
                disabled={isExecuting}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98 shadow-md shadow-emerald-950/40"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isExecuting ? 'Running Code...' : 'Execute Locally on Device'}
              </button>

              {/* Execution Result Box */}
              {executionResult && (
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-[11px] font-mono border-b border-slate-800/80 pb-1.5">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <Terminal className="w-3.5 h-3.5" />
                      Output ({executionResult.executedIn})
                    </span>
                    <span className="text-slate-400">{executionResult.elapsedMs} ms</span>
                  </div>
                  <pre className="font-mono text-[11px] text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {executionResult.output}
                  </pre>
                  {executionResult.error && (
                    <div className="p-2 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-[11px]">
                      {executionResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SERVER STATUS & HARDWARE DIAGNOSTICS */}
          {activeSubTab === 'status' && (
            <div className="space-y-3">
              {serverStatus ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="font-bold text-slate-200 block text-xs">Device & Node Environment</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                        <span className="text-slate-400 block text-[10px]">Environment</span>
                        <strong className="text-emerald-400">{serverStatus.environmentName}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                        <span className="text-slate-400 block text-[10px]">Architecture</span>
                        <strong className="text-teal-300">{serverStatus.arch} ({serverStatus.platform})</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                        <span className="text-slate-400 block text-[10px]">Node Version</span>
                        <strong className="text-slate-200 font-mono">{serverStatus.nodeVersion}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                        <span className="text-slate-400 block text-[10px]">CPU Threads</span>
                        <strong className="text-slate-200">{serverStatus.cpuCores} Cores</strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="font-bold text-slate-200 block text-xs">Memory & Process Health</span>
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                      <div className="p-2 rounded-xl bg-slate-900">
                        <span className="text-[10px] text-slate-400 block">RSS Memory</span>
                        <strong className="text-emerald-400">{serverStatus.memoryUsageMB.rss} MB</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900">
                        <span className="text-[10px] text-slate-400 block">Heap Used</span>
                        <strong className="text-teal-300">{serverStatus.memoryUsageMB.heapUsed} MB</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900">
                        <span className="text-[10px] text-slate-400 block">Server Uptime</span>
                        <strong className="text-slate-200">{Math.round(serverStatus.uptimeSeconds / 60)} min</strong>
                      </div>
                    </div>
                  </div>

                  {/* Network URLs */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="font-bold text-slate-200 block text-xs">Active Network Access Points</span>
                    <div className="space-y-1 font-mono text-[11px]">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900">
                        <span className="text-slate-400">Localhost:</span>
                        <span className="text-emerald-400">{serverStatus.urls.localhost}</span>
                      </div>
                      {serverStatus.urls.lan.map((lanUrl, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-900">
                          <span className="text-slate-400">Wi-Fi LAN (Other Devices):</span>
                          <span className="text-cyan-300">{lanUrl}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                  <Server className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-slate-300 font-semibold">Local Termux server not yet responding on port 3000</p>
                  <p className="text-[11px] text-slate-400">
                    Run <code className="text-emerald-400 font-mono">npm start</code> in Termux, then tap Refresh.
                  </p>
                  <button
                    onClick={refreshStatus}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                  >
                    Check Again
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: STEP-BY-STEP TERMUX GUIDE */}
          {activeSubTab === 'guide' && (
            <div className="space-y-3">
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200">Install Termux on Android</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Download Termux from <strong>F-Droid</strong> or GitHub Releases (do not use Google Play Store, as that version is deprecated).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200">Grant Storage & Acquire Wake Lock</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Run <code className="text-emerald-400 font-mono">termux-setup-storage</code> to allow saving models to external storage, and <code className="text-emerald-400 font-mono">termux-wake-lock</code> so Android battery saver doesn't terminate the process.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200">Start the Server</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Run <code className="text-emerald-400 font-mono">npm start</code>. The server will bind to port 3000 on <code className="text-emerald-400 font-mono">0.0.0.0</code>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0 text-xs">
                    4
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200">Open in Mobile Browser or PC</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Navigate to <code className="text-emerald-400 font-mono">http://localhost:3000</code> in Chrome/Kiwi, or use your phone's Wi-Fi IP from a laptop on the same network!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400">
            Node.js & GGUF Local Environment
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
