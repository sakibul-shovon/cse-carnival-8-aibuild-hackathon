import React, { useState, useRef, useEffect } from 'react';
import { agentService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Wrench, 
  CheckCircle, 
  Loader2
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
  const { user } = useAuth();
  const userName = user?.name ? user.name.split(' ')[0] : 'there';
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello ${userName}! I am CampusOS AI Agent. I can check live class schedules, find available rooms, execute room bookings, register you for campus events, and look up assignment deadlines from our database. How can I help you today?`,
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
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              CampusOS Intelligent Assistant
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                Live DB Connected
              </span>
            </h1>
            <p className="text-xs text-slate-500">
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
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5 shadow-2xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-2xl space-y-2.5 ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-br-xs shadow-md shadow-indigo-600/20 font-medium'
                      : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-xs shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>

                {/* Tool actions log */}
                {!isUser && msg.actions && msg.actions.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <Wrench className="w-3.5 h-3.5 text-amber-500" />
                      <span>Database Actions Executed:</span>
                    </div>
                    {msg.actions.map((act, aIdx) => (
                      <div key={aIdx} className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                        <div className="flex items-center justify-between text-indigo-700 font-mono font-bold">
                          <span>🔧 {act.tool}</span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-600" /> SUCCESS
                          </span>
                        </div>
                        {act.args && Object.keys(act.args).length > 0 && (
                          <p className="text-[11px] text-slate-500 mt-1 font-mono">
                            Params: {JSON.stringify(act.args)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs shadow-xs">
                  ST
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3.5 items-center text-slate-500 text-sm">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center gap-2 shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span className="text-slate-700 font-medium text-xs">Querying live database & computing action...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested queries */}
      <div className="py-2.5 overflow-x-auto flex items-center gap-2 border-t border-slate-200 no-scrollbar">
        <span className="text-xs text-slate-400 font-semibold flex items-center gap-1 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Suggested:
        </span>
        {SUGGESTIONS.map((sug, i) => (
          <button
            key={i}
            onClick={() => handleSend(sug)}
            className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-600 hover:text-slate-900 font-medium transition whitespace-nowrap shrink-0 shadow-2xs"
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
          className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 focus-within:border-indigo-500 transition shadow-sm"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything (e.g. 'What classes do I have today?' or 'Book Room 7A02 tomorrow from 3 to 5 PM')..."
            className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className={`p-2.5 rounded-xl transition ${
              input.trim() && !loading
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
