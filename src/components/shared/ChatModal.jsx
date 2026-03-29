/**
 * ChatModal — messagerie par commande (client ↔ restaurant)
 *
 * Props :
 *   orderId      — UUID de la commande
 *   monRole      — 'client' | 'restaurant'
 *   monId        — UUID de l'utilisateur connecté
 *   titreChat    — ex: "Restaurant Le Mami Wata" ou "Commande #A1B2C3D4"
 *   onClose      — callback fermeture
 */
import { useState, useEffect, useRef } from 'react'
import { X, Send, Loader2, MessageSquare } from 'lucide-react'
import { supabase } from '@/supabase/client'
import { getMessages, sendMessage, markMessagesAsRead } from '@/services/chatService'

export default function ChatModal({ orderId, monRole, monId, titreChat, onClose }) {
  const [messages, setMessages] = useState([])
  const [texte,    setTexte]    = useState('')
  const [loading,  setLoading]  = useState(true)
  const [sending,  setSending]  = useState(false)
  const basRef     = useRef(null)
  const inputRef   = useRef(null)

  // ── Chargement initial ──────────────────────────────────
  useEffect(() => {
    async function charger() {
      const { data } = await getMessages(orderId)
      setMessages(data)
      setLoading(false)
      await markMessagesAsRead(orderId, monRole)
    }
    charger()
  }, [orderId, monRole])

  // ── Subscription Realtime ───────────────────────────────
  useEffect(() => {
    const canal = supabase
      .channel(`chat:${orderId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages',
          filter: `order_id=eq.${orderId}` },
        async (payload) => {
          // Enrichir avec le nom de l'expéditeur
          const { data } = await supabase
            .from('messages')
            .select('*, sender:profiles!messages_sender_id_fkey(nom)')
            .eq('id', payload.new.id)
            .single()
          if (data) {
            setMessages(prev => {
              // Évite doublon si c'est notre propre message (déjà ajouté en optimistic)
              if (prev.find(m => m.id === data.id)) return prev
              return [...prev, data]
            })
          }
          // Marquer comme lu si ce n'est pas nous qui avons envoyé
          if (payload.new.sender_id !== monId) {
            await markMessagesAsRead(orderId, monRole)
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [orderId, monId, monRole])

  // ── Scroll automatique vers le bas ──────────────────────
  useEffect(() => {
    basRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Envoi ───────────────────────────────────────────────
  async function handleSend(e) {
    e?.preventDefault()
    const contenu = texte.trim()
    if (!contenu || sending) return

    setTexte('')
    setSending(true)

    // Ajout optimistic
    const temp = {
      id: `temp-${Date.now()}`, order_id: orderId,
      sender_id: monId, sender_role: monRole,
      contenu, lu: false, created_at: new Date().toISOString(),
      sender: null, _temp: true,
    }
    setMessages(prev => [...prev, temp])

    const { data, error } = await sendMessage(orderId, monId, monRole, contenu)
    setSending(false)

    if (error) {
      // Retirer le message optimistic en cas d'erreur
      setMessages(prev => prev.filter(m => m.id !== temp.id))
      setTexte(contenu)
    } else if (data) {
      // Remplacer le temp par le vrai
      setMessages(prev => prev.map(m => m.id === temp.id ? data : m))
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const heureStr = (iso) =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg
                      flex flex-col shadow-2xl"
           style={{ height: 'min(90vh, 600px)' }}>

        {/* ── Header ───────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 shrink-0">
          <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4 text-brand-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm truncate">{titreChat}</p>
            <p className="text-xs text-gray-400">Messagerie commande</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* ── Liste messages ───────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading ? (
            <div className="flex justify-center pt-8">
              <Loader2 className="w-6 h-6 text-brand-500 animate-spin" strokeWidth={1.5} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <MessageSquare className="w-10 h-10 text-gray-200 mb-3" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-gray-500">Aucun message</p>
              <p className="text-xs text-gray-400 mt-1">
                Démarrez la conversation ci-dessous.
              </p>
            </div>
          ) : (
            messages.map(msg => {
              const estMoi = msg.sender_id === monId
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${estMoi ? 'items-end' : 'items-start'}`}
                >
                  {/* Nom expéditeur (côté restaurant seulement pour identifier le client) */}
                  {!estMoi && msg.sender?.nom && (
                    <p className="text-[10px] text-gray-400 mb-0.5 px-1">
                      {msg.sender.nom}
                    </p>
                  )}
                  <div
                    className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
                      ${estMoi
                        ? 'bg-brand-500 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md'
                      }
                      ${msg._temp ? 'opacity-70' : ''}
                    `}
                  >
                    {msg.contenu}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5 px-1">
                    {heureStr(msg.created_at)}
                    {estMoi && !msg._temp && (
                      <span className={`ml-1 ${msg.lu ? 'text-brand-400' : 'text-gray-300'}`}>
                        {msg.lu ? '✓✓' : '✓'}
                      </span>
                    )}
                  </p>
                </div>
              )
            })
          )}
          <div ref={basRef} />
        </div>

        {/* ── Zone de saisie ───────────────────────────── */}
        <form
          onSubmit={handleSend}
          className="flex items-end gap-2 px-4 py-3 border-t border-gray-100 shrink-0"
        >
          <textarea
            ref={inputRef}
            value={texte}
            onChange={e => setTexte(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrire un message…"
            maxLength={1000}
            rows={1}
            className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none
                       max-h-28 overflow-y-auto"
            style={{ lineHeight: '1.4' }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 112) + 'px'
            }}
          />
          <button
            type="submit"
            disabled={!texte.trim() || sending}
            className="shrink-0 w-10 h-10 bg-brand-500 text-white rounded-full
                       flex items-center justify-center hover:bg-brand-600
                       disabled:opacity-40 transition-colors active:scale-95"
          >
            {sending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </form>
      </div>
    </div>
  )
}
