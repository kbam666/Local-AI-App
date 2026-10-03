import React, { useState } from 'react';
import { Copy, Check, Code, Terminal } from 'lucide-react';

interface CodeBlockProps {
  language?: string;
  code: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code to clipboard:', err);
    }
  };

  const cleanLang = (language || 'code').trim().toLowerCase();
  const isTerminal = ['bash', 'sh', 'shell', 'zsh', 'terminal', 'cmd'].includes(cleanLang);

  return (
    <div className="my-2.5 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-md text-left">
      {/* Top Header Bar: Clean separation so copy button NEVER overlaps code text */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-800/90 border-b border-slate-700/70 select-none">
        <div className="flex items-center gap-1.5">
          {isTerminal ? (
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Code className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold">
            {cleanLang || 'CODE'}
          </span>
        </div>

        {/* Dedicated Copy Button in top right header */}
        <button
          onClick={handleCopy}
          type="button"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition active:scale-95 ${
            copied
              ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
              : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600/50'
          }`}
          title="Copy code to clipboard"
          aria-label="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content Area with horizontal scrollbar if line is wide */}
      <pre className="p-3.5 overflow-x-auto text-[12px] sm:text-[13px] font-mono leading-relaxed text-emerald-200/90 bg-slate-950 selection:bg-emerald-800/60 selection:text-white">
        <code>{code}</code>
      </pre>
    </div>
  );
};
