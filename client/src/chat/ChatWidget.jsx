import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  Send,
  Sparkles,
  Bot,
  RotateCcw,
  Zap,
  HelpCircle,
  Clock,
  Building2,
  PartyPopper,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import ChatMessage from './ChatMessage';
import { useToast } from '../components/Toast';

const SAMPLE_QUERIES = [
  {
    category: 'Lookups',
    text: 'When is my next class?',
    icon: Calendar,
  },
  {
    category: 'Lookups',
    text: 'What classes do I have on Wednesday?',
    icon: Calendar,
  },
  {
    category: 'Lookups',
    text: 'What assignments do I have due this week?',
    icon: Clock,
  },
  {
    category: 'Lookups',
    text: 'Show me all high priority announcements.',
    icon: Zap,
  },
  {
    category: 'Multi-Source',
    text: "I'm free until 2 PM — is there anything on campus I could drop into?",
    icon: Sparkles,
  },
  {
    category: 'Multi-Source',
    text: 'Which labs have a projector and can fit at least 30 people?',
    icon: Building2,
  },
  {
    category: 'Action',
    text: 'Book Room 7A02 tomorrow from 3 PM to 5 PM.',
    icon: Building2,
  },
  {
    category: 'Action',
    text: 'Register me for the Guest Lecture on Deep Learning.',
    icon: PartyPopper,
  },
  {
    category: 'Vague Trap',
    text: 'Just book me any room tomorrow afternoon.',
    icon: HelpCircle,
  },
];

const INITIAL_GREETING = {
  role: 'assistant',
  content:
    "👋 Hello! I'm your **CampusOS AI Assistant**. I can look up live schedules, find free labs with projectors, list pending assignments, announce campus advisories, and book rooms or register you for events in real time.\n\n*What would you like to explore today?*",
  timestamp: 'Just now',
};

export default function ChatWidget({ isFullPage = false }) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('campusos_chat_history_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [INITIAL_GREETING];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Save history
  useEffect(() => {
    try {
      localStorage.setItem('campusos_chat_history_v1', JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (messageText = input) => {
    const query = messageText.trim();
    if (!query || isLoading) return;

    setInput('');

    const userMsg = {
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Build lightweight conversation history for the agent
      const historyPayload = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content || m.reply,
      }));

      const response = await api.chat({
        message: query,
        history: historyPayload,
      });

      const agentMsg = {
        role: 'assistant',
        content: response.reply,
        actions_taken: response.actions_taken || [],
        action_card: response.action_card,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, agentMsg]);

      // If the agent performed any data mutations, invalidate all dashboard queries!
      if (response.action_card || (response.actions_taken && response.actions_taken.length > 0)) {
        queryClient.invalidateQueries();
      }
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        content: `⚠️ **Agent Error:** ${err.message || 'Unable to communicate with agent service.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([INITIAL_GREETING]);
    localStorage.removeItem('campusos_chat_history_v1');
    addToast({
      type: 'info',
      title: 'Chat Cleared',
      message: 'Conversation history reset.',
    });
  };

  return (
    <div
      className={`flex flex-col h-full w-full ${
        isFullPage
          ? 'glass-card rounded-3xl border border-slate-800 shadow-2xl overflow-hidden'
          : 'h-[600px] glass-card rounded-2xl border border-slate-800 shadow-xl overflow-hidden'
      }`}
    >
      {/* Chat Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">CampusOS AI Agent</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                Function Calling Live
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Direct access to live Express backend & Supabase tables
            </p>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          title="Reset conversation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Clear Chat</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-2">
        {messages.map((msg, index) => (
          <ChatMessage key={index} message={msg} />
        ))}

        {/* Typing Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3.5 my-3 animate-in fade-in">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-5 h-5 animate-spin" />
            </div>
            <div className="p-4 rounded-2xl rounded-tl-none glass-card border border-slate-800 flex items-center gap-2">
              <span className="text-xs text-indigo-300 font-medium font-mono">
                Agent reasoning & executing tools...
              </span>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sample Query Prompts Bar */}
      <div className="px-4 py-2.5 bg-slate-950/90 border-t border-slate-800/80">
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          <span className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap pl-1">
            Judging Queries:
          </span>
          {SAMPLE_QUERIES.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q.text)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap bg-slate-900 hover:bg-indigo-950 text-slate-300 hover:text-indigo-200 border border-slate-800 hover:border-indigo-500/40 transition shrink-0"
            >
              <q.icon className="w-3 h-3 text-indigo-400" />
              <span>{q.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Message Form */}
      <div className="p-4 bg-slate-900/90 border-t border-slate-800">
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
            placeholder="Ask anything about schedules, rooms, assignments, or ask to book..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.03]"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
