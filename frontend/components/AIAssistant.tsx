'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  id: string
  text: string
  sender: 'ai' | 'user'
  timestamp: Date
}

const INITIAL_MESSAGE = "Halo! I'm your Rydex Oracle Assistant. How can I help you with your coverage today?"

const KNOWLEDGE_BASE = [
  { keywords: ['policy', 'coverage', 'shield'], response: "You are currently covered by the Rydex Standard Protection. In our Midnight Blue tier, you qualify for automated payouts during weather triggers like AQI spikes or heavy rainfall." },
  { keywords: ['payout', 'money', 'payment'], response: "Payouts are automated via UPI. Once a trigger is validated in your zone (like the recent disruption in Bandra), the system routes funds to your linked account within 120ms." },
  { keywords: ['weather', 'rain', 'heat', 'aqi'], response: "I'm monitoring the Rydex Oracle network. We see a potential AQI trigger forming in the Powai corridor. Stay safe, our 4-hour Flash Policy can augment your coverage if needed." },
  { keywords: ['help', 'oracle', 'what is'], response: "I am a decentralized support layer for Rydex workers. I track your risk, manage your digital policy, and ensure the blockchain ledger accurately reflects your disruptions." },
]

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: INITIAL_MESSAGE, sender: 'ai', timestamp: new Date() }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const handleSend = () => {
    if (!inputValue.trim()) return

    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsTyping(true)

    // Simulate AI thinking
    setTimeout(() => {
      const lowerInput = inputValue.toLowerCase()
      let reply = "I'm analyzing your request... For specific policy details, feel free to ask about 'coverage' or 'recent payouts'."
      
      for (const entry of KNOWLEDGE_BASE) {
        if (entry.keywords.some(k => lowerInput.includes(k))) {
          reply = entry.response
          break
        }
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: reply,
        sender: 'ai',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMsg])
      setIsTyping(false)
    }, 1200)
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-32 right-8 md:bottom-12 md:right-12 z-[60] w-16 h-16 rounded-full bg-[var(--color-accent)] text-[#022A1E] shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 group"
      >
        <span className="material-symbols-outlined text-3xl font-black group-hover:rotate-12 transition-transform">
          {isOpen ? 'close' : 'support_agent'}
        </span>
        <div className="absolute inset-x-0 -bottom-8 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-accent)] text-center">Oracle AI</p>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-52 right-8 md:bottom-32 md:right-12 z-[60] w-[calc(100vw-4rem)] md:w-96 h-[500px] bg-[#10162A]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-accent)]">
                  <span className="material-symbols-outlined text-xl">token</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tighter">Rydex Oracle</h4>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse"></span>
                    <p className="text-[9px] font-black text-[var(--color-accent)] uppercase tracking-widest">Active Node</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
            >
              {messages.map((m) => (
                <motion.div
                  initial={{ opacity: 0, x: m.sender === 'ai' ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={m.id}
                  className={`flex ${m.sender === 'ai' ? 'justify-start' : 'justify-end'}`}
                >
                  <div 
                    className={`max-w-[80%] p-4 rounded-2xl text-[13px] leading-relaxed font-medium ${
                      m.sender === 'ai' 
                      ? 'bg-white/5 text-white border border-white/5 rounded-bl-none' 
                      : 'bg-[var(--color-accent)] text-[#022A1E] rounded-br-none shadow-lg'
                    }`}
                  >
                    {m.text}
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/5 p-4 rounded-2xl flex gap-1 items-center">
                    <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce"></span>
                    <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-6 bg-black/20 border-t border-white/10">
              <div className="relative">
                <input 
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask the Oracle..."
                  className="w-full bg-[#0C1222] border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-all placeholder:text-white/20"
                />
                <button 
                  onClick={handleSend}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center hover:bg-[var(--color-accent)] hover:text-[#022A1E] transition-all"
                >
                  <span className="material-symbols-outlined text-xl">send</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
