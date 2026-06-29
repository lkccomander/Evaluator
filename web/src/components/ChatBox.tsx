import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getChatMessages, postChatMessage } from '../api/chat'
import type { ChatMessage } from '../api/chat'
import { useAuth } from '../hooks/useAuth'

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('es-CR', {
    timeZone: 'America/Costa_Rica',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function displayName(msg: ChatMessage) {
  return msg.display_name || msg.username
}

export default function ChatBox() {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { data: messages = [] } = useQuery({
    queryKey: ['chat'],
    queryFn: getChatMessages,
    refetchInterval: 5_000,
    enabled: !!user,
  })

  const mutation = useMutation({
    mutationFn: postChatMessage,
    onSuccess: () => {
      setText('')
      queryClient.invalidateQueries({ queryKey: ['chat'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || mutation.isPending) return
    mutation.mutate(trimmed)
  }

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  if (!user) return null

  return (
    <div className="border-b border-surface-border">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
          <div
            ref={listRef}
            className="overflow-y-auto px-3 py-2 space-y-1"
            style={{ maxHeight: '10.5rem', minHeight: '10.5rem' }}
          >
            {messages.length === 0 && (
              <p className="text-muted text-xs text-center pt-4">No hay mensajes aún</p>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className="text-xs leading-relaxed">
                <span className="text-gold font-semibold mr-1.5">{displayName(msg)}</span>
                <span className="text-muted mr-1">{formatTime(msg.created_at)}</span>
                <span className="text-white/90">{msg.message}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-surface-border px-3 py-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe un mensaje..."
              maxLength={500}
              className="flex-1 bg-surface text-white border border-surface-border rounded px-3 py-1.5 text-xs outline-none focus:border-gold transition-colors placeholder:text-muted"
            />
            <button
              type="submit"
              disabled={mutation.isPending || !text.trim()}
              className="px-4 py-1.5 text-xs bg-gold text-black font-semibold rounded hover:brightness-110 transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {mutation.isPending ? '...' : 'Enviar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
