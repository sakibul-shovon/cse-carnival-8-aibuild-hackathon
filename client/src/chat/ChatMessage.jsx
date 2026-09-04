import React from 'react';
import { User, Sparkles, Bot, Wrench, CheckCircle2 } from 'lucide-react';
import ActionCard from './ActionCard';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const actionsTaken = message.actions_taken || [];
  const actionCard = message.action_card;

  // Simple Markdown-like formatting helper
  const renderFormattedText = (text) => {
    if (!text) return null;

    // Split paragraphs
    const paragraphs = text.split('\n\n');

    return (
      <div className="space-y-2 leading-relaxed">
        {paragraphs.map((p, pIdx) => {
          // Check for bullet lists
          if (p.startsWith('- ') || p.includes('\n- ')) {
            const items = p.split('\n').filter((l) => l.trim().startsWith('- '));
            return (
              <ul key={pIdx} className="space-y-1 my-2 list-none pl-1">
                {items.map((item, iIdx) => {
                  const content = item.replace(/^- /, '');
                  return (
                    <li key={iIdx} className="flex items-start gap-2 text-xs sm:text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0"></span>
                      <span dangerouslySetInnerHTML={{ __html: formatBoldAndCode(content) }} />
                    </li>
                  );
                })}
              </ul>
            );
          }

          // Check for blockquote
          if (p.startsWith('> ')) {
            return (
              <blockquote
                key={pIdx}
                className="p-2.5 rounded-xl bg-slate-900/80 border-l-4 border-indigo-500 text-xs text-slate-300 italic"
                dangerouslySetInnerHTML={{ __html: formatBoldAndCode(p.replace(/^>\s*/, '')) }}
              />
            );
          }

          return (
            <p
              key={pIdx}
              className="text-xs sm:text-sm whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: formatBoldAndCode(p) }}
            />
          );
        })}
      </div>
    );
  };

  const formatBoldAndCode = (str) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-indigo-300 font-mono text-xs">$1</code>');
  };

  return (
    <div
      className={`flex items-start gap-3.5 my-4 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      } animate-in fade-in duration-200`}
    >
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
          isUser
            ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-indigo-600/30'
            : 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-500 text-white shadow-purple-600/30'
        }`}
      >
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>

      {/* Message Bubble Container */}
      <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Author Label & Timestamp */}
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className="text-[11px] font-bold text-slate-400">
            {isUser ? 'You (Student)' : 'CampusOS Agent'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {message.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Bubble */}
        <div
          className={`p-4 sm:p-5 rounded-2xl shadow-md ${
            isUser
              ? 'bg-indigo-600 text-white rounded-tr-none'
              : 'glass-card border border-slate-800 text-slate-100 rounded-tl-none'
          }`}
        >
          {/* Tool Calls Inspector Badge (Agent only) */}
          {!isUser && actionsTaken.length > 0 && (
            <div className="mb-3 pb-2.5 border-b border-slate-800/80 flex flex-wrap gap-1.5">
              {actionsTaken.map((action, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-mono font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                >
                  <Wrench className="w-3 h-3 text-indigo-400" />
                  tool: {action.name || action.type}
                </span>
              ))}
            </div>
          )}

          {/* Formatted Text Content */}
          {renderFormattedText(message.content || message.reply)}

          {/* Action Card Rendering */}
          {actionCard && <ActionCard card={actionCard} />}
        </div>
      </div>
    </div>
  );
}
