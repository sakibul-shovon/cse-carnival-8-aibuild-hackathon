import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SendIcon, ChatBubbleLeftRightIcon } from '../components/Icons';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function ChatPage() {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content:
                'Hello! I\'m your CampusOS AI assistant. I can help you with questions about courses, assignments, schedules, and more. What would you like to know?',
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading || !user) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // In a real implementation, this would call your agent endpoint
            // For now, we simulate a response
            const response = await simulateAgentResponse(userMessage.content, user);

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content:
                    'Sorry, I encountered an error. Please try again later.',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    // Simulated agent response - in production, replace with actual API call
    const simulateAgentResponse = async (query: string, user: any): Promise<string> => {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 600));

        const q = query.toLowerCase();
        const name = user?.name || 'there';

        if (q.includes('assignment') || q.includes('homework') || q.includes('submit')) {
            return `Hey ${name}! You can view all your assignments in the Assignments tab. If you're a student, click "Submit" on any assignment to submit it. Make sure to check the deadline — assignments submitted after the deadline may not be accepted. Need help with a specific assignment? Let me know the course code!`;
        }

        if (q.includes('schedule') || q.includes('timetable') || q.includes('class') || q.includes('time')) {
            return `Your class schedule is available in the Schedule tab. You'll see all your courses organized by day. If you're a teacher or admin, you can add new classes using the "Add Class" button. Need to check a specific day or time? I can help you find that!`;
        }

        if (q.includes('announcement') || q.includes('notice') || q.includes('news')) {
            return `You can find all campus announcements in the Announcements tab. Teachers and admins can create new announcements — just click "New Announcement". Announcements are ordered by date, and you can see priority levels (Low, Medium, High) to know what's most important.`;
        }

        if (q.includes('user') || q.includes('student') || q.includes('teacher') || q.includes('admin')) {
            return `The Users tab shows everyone in the CampusOS community. You can see each person's role (student, teacher, or admin). The user switcher in the top-right corner lets you switch between different users to test the system from different perspectives!`;
        }

        if (q.includes('help') || q.includes('what can you do')) {
            return `I'm here to help you navigate CampusOS! I can answer questions about:
            • 📋 Assignments — view, submit, and track your work
            • 📅 Schedule — check your weekly timetable
            • 📢 Announcements — stay updated with campus news
            • 👥 Users — see who's in the community
            • 🔑 Role switching — test different user views

            Just ask me anything about these topics!`;
        }

        // Default response
        return `Hi ${name}! I'm your CampusOS assistant. I can help with questions about assignments, schedules, announcements, and users. For example, try asking "How do I submit an assignment?" or "What's on my schedule?" What would you like to know?`;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-12rem)]">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        AI Assistant
                    </h1>
                    <p className="text-sm text-slate-500">
                        Ask me anything about CampusOS
                    </p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-xs text-primary-700">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
                    </span>
                    Online
                </div>
            </div>

            <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
                <div className="space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex items-start gap-3 ${
                                msg.role === 'user' ? 'flex-row-reverse' : ''
                            }`}
                        >
                            <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                                    msg.role === 'user'
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-slate-100 text-slate-600'
                                }`}
                            >
                                {msg.role === 'user'
                                    ? user?.name
                                          ?.split(' ')
                                          .map((n) => n[0])
                                          .join('')
                                          .toUpperCase()
                                          .slice(0, 2) || 'U'
                                    : 'AI'}
                            </div>
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                                    msg.role === 'user'
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-slate-100 text-slate-800'
                                }`}
                            >
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                <p
                                    className={`mt-1 text-[10px] ${
                                        msg.role === 'user'
                                            ? 'text-primary-200'
                                            : 'text-slate-400'
                                    }`}
                                >
                                    {msg.timestamp.toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                                AI
                            </div>
                            <div className="max-w-[80%] rounded-2xl bg-slate-100 px-4 py-2.5">
                                <div className="flex items-center gap-1">
                                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div className="mt-4 flex gap-2">
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything..."
                    rows={1}
                    className="flex-1 resize-none rounded-lg border border-slate-300 px-4 py-2.5 text-sm placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                    disabled={isLoading}
                />
                <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="btn btn-primary shrink-0 px-4"
                >
                    <SendIcon className="h-5 w-5" />
                </button>
            </div>
            <p className="mt-2 text-xs text-slate-400 text-center">
                This is a simulated AI assistant. In production, it would connect to a backend agent endpoint.
            </p>
        </div>
    );
}