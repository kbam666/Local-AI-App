import React from 'react';
import { CodeBlock } from './CodeBlock';

interface FormattedMessageProps {
  content: string;
  isStreaming?: boolean;
}

interface ContentPart {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({ content, isStreaming }) => {
  // Parse message into text segments and code blocks
  const parts: ContentPart[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9_\-+]*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Text before the code block
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, match.index),
      });
    }

    // Code block itself
    parts.push({
      type: 'code',
      language: match[1]?.trim() || 'code',
      content: match[2]?.replace(/\n$/, '') || '',
    });

    lastIndex = codeBlockRegex.lastIndex;
  }

  // Handle remaining text (or an unclosed code block during live streaming)
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);
    const unclosedMatch = remaining.match(/```([a-zA-Z0-9_\-+]*)\n?([\s\S]*)$/);

    if (unclosedMatch && isStreaming) {
      const textBefore = remaining.slice(0, unclosedMatch.index);
      if (textBefore) {
        parts.push({
          type: 'text',
          content: textBefore,
        });
      }
      parts.push({
        type: 'code',
        language: unclosedMatch[1]?.trim() || 'code',
        content: unclosedMatch[2] || '',
      });
    } else {
      parts.push({
        type: 'text',
        content: remaining,
      });
    }
  }

  // Helper to format text with inline code (single backtick) and bold
  const renderTextSegment = (text: string, partIdx: number) => {
    const lines = text.split('\n');

    return (
      <div key={partIdx} className="space-y-1.5 leading-relaxed">
        {lines.map((line, lineIdx) => {
          // Empty lines
          if (line.trim() === '') {
            return <div key={lineIdx} className="h-2" />;
          }

          // Headers
          if (line.startsWith('### ')) {
            return (
              <h4 key={lineIdx} className="text-sm font-bold text-emerald-400 mt-2 mb-1">
                {renderInlineTokens(line.slice(4))}
              </h4>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h3 key={lineIdx} className="text-base font-bold text-slate-100 mt-2 mb-1">
                {renderInlineTokens(line.slice(3))}
              </h3>
            );
          }

          // Bullet points
          if (line.match(/^[\*\-]\s+/)) {
            return (
              <div key={lineIdx} className="flex items-start gap-2 pl-1 my-0.5">
                <span className="text-emerald-400 mt-1 text-xs">•</span>
                <span className="flex-1">{renderInlineTokens(line.replace(/^[\*\-]\s+/, ''))}</span>
              </div>
            );
          }

          // Numbered lists
          const numMatch = line.match(/^(\d+\.)\s+(.*)/);
          if (numMatch) {
            return (
              <div key={lineIdx} className="flex items-start gap-2 pl-1 my-0.5">
                <span className="text-emerald-400 font-mono text-xs">{numMatch[1]}</span>
                <span className="flex-1">{renderInlineTokens(numMatch[2])}</span>
              </div>
            );
          }

          return (
            <p key={lineIdx} className="break-words">
              {renderInlineTokens(line)}
            </p>
          );
        })}
      </div>
    );
  };

  // Helper to render inline code `var` and bold **text**
  const renderInlineTokens = (str: string) => {
    const tokens: React.ReactNode[] = [];
    const inlineRegex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = inlineRegex.exec(str)) !== null) {
      if (match.index > lastIdx) {
        tokens.push(str.slice(lastIdx, match.index));
      }

      const matchText = match[0];
      if (matchText.startsWith('`') && matchText.endsWith('`')) {
        // Inline code
        tokens.push(
          <code
            key={`inline-${match.index}`}
            className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-800 text-emerald-300 font-mono text-[11px] sm:text-[12px] border border-slate-700/60 font-medium"
          >
            {matchText.slice(1, -1)}
          </code>
        );
      } else if (matchText.startsWith('**') && matchText.endsWith('**')) {
        // Bold
        tokens.push(
          <strong key={`bold-${match.index}`} className="font-semibold text-slate-100">
            {matchText.slice(2, -2)}
          </strong>
        );
      }

      lastIdx = inlineRegex.lastIndex;
    }

    if (lastIdx < str.length) {
      tokens.push(str.slice(lastIdx));
    }

    return tokens.length > 0 ? tokens : str;
  };

  return (
    <div className="text-xs md:text-sm leading-relaxed">
      {parts.map((part, idx) => {
        if (part.type === 'code') {
          return <CodeBlock key={`block-${idx}`} language={part.language} code={part.content} />;
        }
        return renderTextSegment(part.content, idx);
      })}
    </div>
  );
};
