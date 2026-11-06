import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Bot, Sparkles } from 'lucide-react';

interface Props {
  logs: string[];
  isStreaming?: boolean;
}

export const AgentTerminal: React.FC<Props> = ({ logs, isStreaming }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (logs.length === 0) return null;

  return (
    <div className="bg-slate-900 text-slate-200 rounded-2xl overflow-hidden border border-slate-800 shadow-lg">
      {/* Terminal Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-slate-950 flex items-center justify-between border-b border-slate-800 cursor-pointer hover:bg-slate-900/80 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <div className="h-4 w-px bg-slate-800 mx-1" />
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-mono font-semibold text-slate-300">
              agent_runtime.log
            </span>
            {isStreaming && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse">
                <Sparkles className="w-2.5 h-2.5" /> Reasoning
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <span>{logs.length} events</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Terminal Body */}
      {isOpen && (
        <div className="p-4 font-mono text-xs space-y-2 max-h-56 overflow-y-auto bg-slate-950/60 leading-relaxed">
          {logs.map((log, index) => {
            const isGuardrail = log.includes('🛡️');
            const isLLM = log.includes('🧠');
            const isPick = log.includes('🎯');
            const isWarning = log.includes('⚠️');

            return (
              <div
                key={index}
                className={`flex items-start gap-2 ${
                  isGuardrail
                    ? 'text-amber-300 font-semibold'
                    : isPick
                    ? 'text-emerald-400 font-semibold'
                    : isLLM
                    ? 'text-purple-300'
                    : isWarning
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}
              >
                <span className="text-slate-600 select-none text-[11px] shrink-0">
                  [{new Date().toLocaleTimeString()}]
                </span>
                <span>{log}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};