'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Loader2, Send, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const GREETING: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  content:
    "Hi! I'm your ecommerce growth assistant. Ask me about today's revenue, orders, ad performance, courier delivery, or what to do next — I'll answer using your connected dashboard data.",
}

const MAX_LENGTH = 500

export function AIAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open, loading])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    if (text.length > MAX_LENGTH) {
      setError(`Message is too long (max ${MAX_LENGTH} characters).`)
      return
    }

    const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || 'Something went wrong. Please try again.')
      } else {
        setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: data.answer }])
      }
    } catch {
      setError('Could not reach the assistant. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        className={cn(
          'fixed bottom-5 right-5 z-[60] flex h-13 w-13 items-center justify-center rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] text-white shadow-[0_8px_24px_rgba(139,92,246,0.45)] transition-transform hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6',
          open && 'scale-95'
        )}
        style={{ height: 52, width: 52 }}
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-5.5 w-5.5" />}
      </button>

      {/* Chat panel */}
      {open && (
        <>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 z-[55] bg-black/40 sm:hidden" onClick={() => setOpen(false)} />

          <div
            className={cn(
              'fixed z-[58] flex flex-col bg-[#1c1642] shadow-2xl',
              // Mobile: bottom sheet
              'inset-x-0 bottom-0 max-h-[80vh] rounded-t-2xl border-t border-white/10',
              // Desktop: small panel bottom-right
              'sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[520px] sm:max-h-[70vh] sm:w-[380px] sm:rounded-2xl sm:border sm:border-white/10'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#ec4899]">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Growth Assistant</p>
                  <p className="text-xs text-white/50">Uses your dashboard data</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn('max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap', m.role === 'user'
                    ? 'ml-auto bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] text-white'
                    : 'mr-auto bg-white/[0.07] text-white/90')}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl bg-white/[0.07] px-3.5 py-2.5 text-sm text-white/60">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking…
                </div>
              )}
              {error && (
                <div className="mr-auto max-w-[85%] rounded-2xl bg-red-500/15 px-3.5 py-2.5 text-sm text-red-300">
                  {error}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-white/10 p-3">
              <div className="flex items-end gap-2 rounded-xl bg-white/[0.07] p-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_LENGTH))}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about revenue, ads, courier, stock…"
                  rows={1}
                  maxLength={MAX_LENGTH}
                  className="max-h-24 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-white placeholder:text-white/40 outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  aria-label="Send message"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] text-white transition-opacity disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
