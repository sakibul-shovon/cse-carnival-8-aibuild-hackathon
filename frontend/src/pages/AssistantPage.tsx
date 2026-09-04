import { useState } from 'react'
import { Bot, Send, Sparkles, UserRound } from 'lucide-react'

type Message = { id: number; role: 'assistant' | 'user'; text: string; time: string }
type ChatResponse = { success: true; data: { message: string } } | { success: false; error: string }

const suggestions = [
  'When is my next class?',
  'What do I have due this week?',
  'What is happening on campus tomorrow?',
  'Find me a room for 5 people with a projector.',
  'Book Room 302 tomorrow from 3 to 5 PM.',
]

const backendUrl = 'http://localhost:4000'

function currentTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: 'assistant', text: 'Hello Sakibul. I can help you find your way around campus. What would you like to know?', time: '09:42 AM' },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)

  const send = async (text: string = input) => {
    const trimmedText = text.trim()
    if (!trimmedText || typing) return

    setMessages((current) => [...current, { id: current.length + 1, role: 'user', text: trimmedText, time: currentTime() }])
    setInput('')
    setTyping(true)

    try {
      const response = await fetch(`${backendUrl}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmedText }),
      })
      const payload = await response.json() as ChatResponse
      if (!response.ok || !payload.success) {
        throw new Error(payload.success ? `Request failed with status ${response.status}` : payload.error)
      }
      setMessages((current) => [...current, { id: current.length + 1, role: 'assistant', text: payload.data.message, time: currentTime() }])
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'The backend is unavailable.'
      setMessages((current) => [...current, { id: current.length + 1, role: 'assistant', text: `Sorry, I couldn't reach the CampusOS Assistant. ${reason}`, time: currentTime() }])
    } finally {
      setTyping(false)
    }
  }

  return <div className="assistant-page"><div className="assistant-heading"><div><span className="eyebrow">Your campus companion</span><h1>CampusOS Assistant</h1><p>Ask me about your classes, rooms, events, announcements and assignments.</p></div><div className="live-pill"><i /> Live campus data</div></div><section className="chat-card"><div className="chat-messages">{messages.map((message) => <div className={`message ${message.role}`} key={message.id}><div className="message-icon">{message.role === 'assistant' ? <Bot size={16} /> : <UserRound size={16} />}</div><div><p>{message.text}</p><time>{message.time}</time></div></div>)}{typing && <div className="message assistant"><div className="message-icon"><Bot size={16} /></div><div className="typing"><i /><i /><i /></div></div>}</div><div className="suggestions">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => send(suggestion)} disabled={typing}><Sparkles size={13} />{suggestion}</button>)}</div><form className="chat-input" onSubmit={(event) => { event.preventDefault(); void send() }}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask anything about campus..." aria-label="Message CampusOS Assistant" disabled={typing} /><button className="send-button" aria-label="Send message" disabled={typing}><Send size={17} /></button></form></section><div className="assistant-note"><Sparkles size={16} /><span><b>CampusOS has access to live campus data.</b><small>This preview uses local UI state only. Your conversation stays in this browser.</small></span></div></div>
}
