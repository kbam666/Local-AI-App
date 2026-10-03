import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Sparkles,
  Trash2,
  ChevronDown,
  Cpu,
  Zap,
  Info,
  Layers,
  ArrowRight,
  Copy,
  Check,
} from 'lucide-react';
import { ChatMessage, GenerationParams, StoredModel } from '../types/gguf';
import { llmEngine } from '../services/llmEngine';
import { FormattedMessage } from './FormattedMessage';

interface Props {
  activeModel: StoredModel;
  models: StoredModel[];
  onSelectModel: (model: StoredModel) => void;
  onOpenModelsTab: () => void;
  onOpenInspectorTab: () => void;
  params: GenerationParams;
  isGenerating: boolean;
  setIsGenerating: (g: boolean) => void;
}

const STARTER_PROMPTS = [
  'What is GGUF and how does 4-bit quantization work?',
  'Why is local LLM inference better on mobile devices?',
  'Write a Python function to parse GGUF binary headers.',
  'How do Android CPU threads and WebGPU accelerate transformers?',
];

export const ChatView: React.FC<Props> = ({
  activeModel,
  models,
  onSelectModel,
  onOpenModelsTab,
  onOpenInspectorTab,
  params,
  isGenerating,
  setIsGenerating,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I am your local mobile AI running offline on your Android device via **${activeModel.name}**.\n\nAll GGUF tensor calculations and token samplings happen 100% on your device hardware with zero data leaving your phone. Ask me anything or select a prompt below!`,
      timestamp: Date.now(),
      modelUsed: activeModel.name,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [currentStreamText, setCurrentStreamText] = useState('');
  const [currentTokSec, setCurrentTokSec] = useState(0);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCopyMessage = async (id: string, text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamText]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isGenerating) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInputText('');
    setCurrentStreamText('');
    setCurrentTokSec(0);
    setIsGenerating(true);

    let streamBuffer = '';

    llmEngine.generate(text, newHistory, params, {
      onToken: (token, tokSec) => {
        streamBuffer += token;
        setCurrentStreamText(streamBuffer);
        setCurrentTokSec(tokSec);
      },
      onComplete: (stats) => {
        setIsGenerating(false);
        const assistantMessage: ChatMessage = {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: stats.fullText,
          timestamp: Date.now(),
          tokensGenerated: stats.totalTokens,
          tokensPerSec: stats.tokSec,
          timeToFirstTokenMs: stats.ttftMs,
          totalTimeMs: stats.elapsedMs,
          modelUsed: activeModel.name,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setCurrentStreamText('');
      },
      onError: (err) => {
        setIsGenerating(false);
        const errorMessage: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Inference Error: ${err}`,
          timestamp: Date.now(),
          modelUsed: activeModel.name,
        };
        setMessages((prev) => [...prev, errorMessage]);
        setCurrentStreamText('');
      },
    });
  };

  const handleStop = () => {
    llmEngine.stop();
    setIsGenerating(false);
    if (currentStreamText) {
      const stoppedMessage: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: `${currentStreamText} *(Generation stopped)*`,
        timestamp: Date.now(),
        modelUsed: activeModel.name,
      };
      setMessages((prev) => [...prev, stoppedMessage]);
      setCurrentStreamText('');
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Chat cleared. Ready for your next query on **${activeModel.name}**!`,
        timestamp: Date.now(),
        modelUsed: activeModel.name,
      },
    ]);
  };

  // Rough estimation of context tokens used
  const totalTokensEstimated = messages.reduce(
    (acc, m) => acc + Math.round(m.content.length / 3.8),
    0
  );
  const contextPct = Math.min(100, Math.round((totalTokensEstimated / params.contextLength) * 100));

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 relative bg-slate-950">
      {/* Top App Header with Model Switcher Pill */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 z-20">
        <button
          onClick={() => setShowModelPicker(!showModelPicker)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/90 border border-slate-700/80 hover:bg-slate-700/80 transition text-left group max-w-[240px] truncate"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-slate-100 truncate group-hover:text-emerald-300">
              {activeModel.name}
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              {activeModel.quantization} • {activeModel.parameterSize}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
        </button>

        <div className="flex items-center gap-1.5">
          {/* Privacy & Engine Badge */}
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
            <Cpu className="w-3 h-3" />
            Local SLM (No Cloud)
          </span>

          {/* Inspect model layers shortcut */}
          <button
            onClick={onOpenInspectorTab}
            className="p-2 rounded-full text-slate-400 hover:text-emerald-400 hover:bg-slate-800/60 transition"
            title="Inspect GGUF Model Header"
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Clear chat */}
          <button
            onClick={handleClearChat}
            className="p-2 rounded-full text-slate-400 hover:text-red-400 hover:bg-slate-800/60 transition"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Local Inference Verification Banner */}
      <div className="px-4 py-1.5 bg-emerald-950/30 border-b border-emerald-500/20 flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
          <span
            className={`w-2 h-2 rounded-full ${
              llmEngine.isRealModelLoaded()
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-amber-400'
            }`}
          />
          <span className="truncate max-w-[260px] sm:max-w-none">
            {llmEngine.isRealModelLoaded()
              ? `Real GGUF Model Active (llama.cpp WebAssembly)`
              : activeModel.isEmbedded
              ? `Starter Mode (Go to "Models" tab to download real weights)`
              : `Loading GGUF into memory...`}
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-400 shrink-0">
          <span>RAM: ~{activeModel.parseResult?.ramEstimateMB || 95} MB</span>
        </div>
      </div>

      {llmEngine.getModelLoadError() && (
        <div className="px-4 py-1 bg-red-950/40 border-b border-red-500/30 text-[10px] text-red-300 flex items-center gap-1">
          <Info className="w-3 h-3 text-red-400 shrink-0" />
          <span className="truncate">Model load notice: {llmEngine.getModelLoadError()}</span>
        </div>
      )}

      {/* Context Window Bar */}
      <div className="px-4 py-1 bg-slate-900/40 border-b border-slate-800/50 flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>Context: {totalTokensEstimated} / {params.contextLength} tokens</span>
        </div>
        <div className="w-24 bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              contextPct > 80 ? 'bg-red-500' : contextPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${contextPct}%` }}
          />
        </div>
      </div>

      {/* Model Selector Modal / Drawer */}
      {showModelPicker && (
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col justify-end p-2 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-4 shadow-2xl max-h-[80%] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Select Active Model
              </h3>
              <button
                onClick={() => setShowModelPicker(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>

            <div className="py-2 overflow-y-auto space-y-2 flex-1">
              {models.map((m) => {
                const isCurrent = m.id === activeModel.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      onSelectModel(m);
                      setShowModelPicker(false);
                    }}
                    className={`w-full text-left p-3 rounded-2xl border transition flex items-center justify-between ${
                      isCurrent
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                        : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold flex items-center gap-2">
                        {m.name}
                        {m.isEmbedded && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                            Instant
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {m.architecture} • {m.quantization} • {m.parameterSize}
                      </div>
                    </div>
                    {isCurrent && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setShowModelPicker(false);
                onOpenModelsTab();
              }}
              className="mt-3 w-full py-2.5 px-4 rounded-xl bg-slate-800 text-xs font-medium text-emerald-400 hover:bg-slate-700 transition flex items-center justify-center gap-2"
            >
              Browse & Download More GGUF Models
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          const isCopied = copiedId === m.id;

          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full group`}
            >
              <div
                className={`rounded-2xl px-4 py-2.5 max-w-[92%] sm:max-w-[85%] text-xs md:text-sm leading-relaxed shadow-md ${
                  isUser
                    ? 'bg-emerald-600 text-white rounded-br-none shadow-emerald-950'
                    : 'bg-slate-900 border border-slate-800/80 text-slate-100 rounded-bl-none'
                }`}
              >
                <FormattedMessage content={m.content} />

                {/* Assistant stats badge */}
                {!isUser && m.tokensGenerated !== undefined && (
                  <div className="mt-2 pt-2 border-t border-slate-800 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <Zap className="w-2.5 h-2.5" />
                      {m.tokensPerSec} tok/s
                    </span>
                    <span>{m.tokensGenerated} tokens</span>
                    {m.timeToFirstTokenMs && <span>TTFT: {m.timeToFirstTokenMs}ms</span>}
                  </div>
                )}
              </div>

              {/* Working Copy Icon and Timestamp Action Bar under message */}
              <div
                className={`flex items-center gap-1.5 mt-1 px-1 text-[11px] text-slate-400 ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                <button
                  onClick={() => handleCopyMessage(m.id, m.content)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition active:scale-95 ${
                    isCopied
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-medium'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800/60 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-800'
                  }`}
                  title="Copy message to clipboard"
                  aria-label="Copy message"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <span className="text-[10px] text-slate-500">
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}

        {/* Live Streaming Assistant Response */}
        {isGenerating && currentStreamText && (
          <div className="flex flex-col items-start max-w-full">
            <div className="rounded-2xl px-4 py-2.5 max-w-[92%] sm:max-w-[85%] text-xs md:text-sm leading-relaxed bg-slate-900 border border-emerald-500/40 text-slate-100 rounded-bl-none shadow-lg">
              <div>
                <FormattedMessage content={currentStreamText} isStreaming={true} />
                <span className="inline-block w-2 h-3.5 bg-emerald-400 ml-1 animate-pulse align-middle" />
              </div>
              <div className="mt-2 pt-2 border-t border-slate-800 flex items-center gap-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold animate-pulse">
                  <Sparkles className="w-2.5 h-2.5" />
                  Generating: {currentTokSec} tok/s
                </span>
                <span>Active Model: {activeModel.name}</span>
              </div>
            </div>

            {/* Live Copy Button */}
            <div className="flex items-center gap-1.5 mt-1 px-1 text-[11px] text-slate-400">
              <button
                onClick={() => handleCopyMessage('streaming', currentStreamText)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border transition active:scale-95 ${
                  copiedId === 'streaming'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-medium'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800/60 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-800'
                }`}
                title="Copy current streaming text"
              >
                {copiedId === 'streaming' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <span className="text-[10px] text-slate-500">Generating</span>
            </div>
          </div>
        )}

        {/* Quick Prompts when conversation is short */}
        {messages.length <= 2 && !isGenerating && (
          <div className="pt-2">
            <p className="text-[11px] font-medium text-slate-400 mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              Quick Prompts for Local Inference:
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {STARTER_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputText(prompt);
                    inputRef.current?.focus();
                  }}
                  className="text-left p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/40 hover:bg-slate-800/50 text-xs text-slate-300 transition flex items-center justify-between group"
                >
                  <span className="truncate">{prompt}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Stop Button during inference */}
      {isGenerating && (
        <div className="absolute bottom-16 left-0 right-0 flex justify-center pointer-events-none z-30">
          <button
            onClick={handleStop}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white font-medium text-xs shadow-xl transition active:scale-95 animate-bounce"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Stop Generating ({currentTokSec} tok/s)
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div className="p-3 bg-slate-900/90 backdrop-blur-md border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isGenerating
                ? 'Model is generating tokens...'
                : `Message ${activeModel.name}...`
            }
            disabled={isGenerating}
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isGenerating}
            className="w-11 h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 disabled:hover:bg-emerald-500 text-slate-950 flex items-center justify-center transition shadow-md shadow-emerald-950/40"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
