import React, { useState, useRef, useEffect } from 'react';
import { agentService } from '../services/api';
import { 
  Bot, 
  Send, 
  User, 
  Sparkles, 
  Wrench, 
  CheckCircle, 
  HelpCircle, 
  Loader2, 
  CornerDownLeft,
  Calendar,
  DoorClosed,
  Megaphone,
  BookOpenCheck
} from 'lucide-react';

const SUGGESTIONS = [
  "What classes do I have on Sunday?",
  "Which labs have a projector and can fit at least 30 people?",
  "Book Room 7A02 tomorrow from 3 PM to 5 PM",
  "Register me for the Guest Lecture on Deep Learning",
  "What assignments do I have due this week?",
  "Show me all high priority announcements"
];

export default function Assistant() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello Sakibul! I am CampusOS AI Agent. I can check live class schedules, find available rooms, execute room bookings, register you for campus events, and look up assignment deadlines from our database. How can I help you today?',
      actions: [],
      source: 'live_agent'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (userMsg) => {
    const text = (userMsg || input).trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Send message along with recent conversation history
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const res = await agentService.chat(text, history);

      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: res.response,
          actions: res.actions || [],
          source: res.source || 'live_agent'
        }
      ]);
    } catch (err) {
      console.error(err);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an issue communicating with the CampusOS backend. Please ensure the Laravel API server is running properly.',
          actions: [],
          source: 'error'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              CampusOS Intelligent Assistant
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                Live DB Connected
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Natural Language queries & Autonomous Database Action Executions
            </p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto py-6 space-y-5 pr-2">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-2xl space-y-2.5 ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-br-xs shadow-md shadow-indigo-600/20'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-xs shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>

                {/* Tool actions log */}
                {!isUser && msg.actions && msg.actions.length > 0 && (
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <Wrench className="w-3.5 h-3.5 text-amber-400" />
                      <span>Database Actions Executed:</span>
                    </div>
                    {msg.actions.map((act, aIdx) => (
                      <div key={aIdx} className="bg-slate-900 p-2 rounded-lg border border-slate-800/80">
                        <div className="flex items-center justify-between text-indigo-300 font-mono font-medium">
                          <span>🔧 {act.tool}</span>
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> SUCCESS
                          </span>
                        </div>
                        {act.args && Object.keys(act.args).length > 0 && (
                          <p className="text-[11px] text-slate-400 mt-1 font-mono">
                            Params: {JSON.stringify(act.args)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5 font-bold text-xs">
                  ST
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3.5 items-center text-slate-400 text-sm">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Querying live database & computing action...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested queries */}
      <div className="py-2 overflow-x-auto flex items-center gap-2 border-t border-slate-800/60 no-scrollbar">
        <span className="text-xs text-slate-500 flex items-center gap-1 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Suggested:
        </span>
        {SUGGESTIONS.map((sug, i) => (
          <button
            key={i}
            onClick={() => handleSend(sug)}
            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-full text-xs text-slate-300 hover:text-white transition whitespace-nowrap shrink-0"
          >
            {sug}
          </button>
        ))}
      </div>

      {/* Input box */}
      <div className="pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800 focus-within:border-indigo-500 transition shadow-lg"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything (e.g. 'What classes do I have today?' or 'Book Room 7A02 tomorrow from 3 to 5 PM')..."
            className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className={`p-2.5 rounded-xl transition ${
              input.trim() && !loading
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
