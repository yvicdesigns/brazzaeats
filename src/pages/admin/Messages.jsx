import { useState, useEffect } from 'react'
import { MessageSquare, Loader2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { getSupportConversations } from '@/services/chatService'
import ChatModal from '@/components/shared/ChatModal'

// ── Carte conversation ───────────────────────────────────────
function CarteConversation({ conv, onOpen }) {
  const nonLu = conv.nonLus > 0
  return (
    <button
      onClick={() => onOpen(conv)}
      className="w-full text-left border-t border-gray-50 first:border-0 px-4 py-4
                 flex items-start gap-3 hover:bg-gray-50 transition-colors"
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0
                      ${nonLu ? 'bg-brand-50 text-brand-600' : 'bg-gray-100 text-gray-400'}`}>
        <MessageSquare className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="font-semibold text-sm text-gray-800 truncate">
            {conv.client?.nom ?? 'Client'}
            {conv.client?.telephone && (
              <span className="text-gray-400 font-normal"> · {conv.client.telephone}</span>
            )}
          </p>
          <span className="text-xs text-gray-400 shrink-0">
            {new Date(conv.dernierDate).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </span>
        </div>
        <p className="text-xs text-brand-500 font-medium mt-0.5">
          Commande #{conv.orderId.slice(0, 8).toUpperCase()}
        </p>
        <p className={`text-xs mt-1.5 truncate ${nonLu ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
          {conv.dernierRole === 'admin' ? 'Vous : ' : ''}{conv.dernierMessage}
        </p>
      </div>

      {nonLu && (
        <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-brand-500
                         text-white text-[11px] font-bold grid place-items-center">
          {conv.nonLus}
        </span>
      )}
    </button>
  )
}

// ══════════════════════════════════════════════════════════
// Page Messagerie support — inbox admin (canal 'support')
// ══════════════════════════════════════════════════════════
export default function AdminMessages() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [chatOuvert,    setChatOuvert]    = useState(null)

  async function charger() {
    setLoading(true)
    const { data, error } = await getSupportConversations()
    if (error) toast.error('Impossible de charger les conversations')
    else setConversations(data)
    setLoading(false)
  }

  useEffect(() => { charger() }, [])

  function handleCloseChat() {
    setChatOuvert(null)
    charger() // rafraîchit les compteurs non-lus après lecture
  }

  const nbNonLus = conversations.filter(c => c.nonLus > 0).length

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── En-tête ─────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 pt-12 pb-5 md:pt-8">
        <p className="text-xs text-gray-400 font-medium">Administration</p>
        <h1 className="text-xl font-black text-gray-900 mt-0.5">Messagerie support</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {conversations.length} conversation{conversations.length > 1 ? 's' : ''}
          {nbNonLus > 0 && (
            <span className="ml-2 text-brand-600 font-semibold">{nbNonLus} non lue{nbNonLus > 1 ? 's' : ''}</span>
          )}
        </p>
      </header>

      <div className="px-4 pt-4 space-y-4">

        <button
          onClick={charger}
          disabled={loading}
          className="w-10 h-10 flex items-center justify-center rounded-xl
                     bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 ml-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-card text-center text-gray-400">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" strokeWidth={1.5} />
            <p className="text-sm font-medium">Aucune conversation pour le moment</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            {conversations.map(c => (
              <CarteConversation key={c.orderId} conv={c} onOpen={setChatOuvert} />
            ))}
          </div>
        )}
      </div>

      {chatOuvert && user && (
        <ChatModal
          orderId={chatOuvert.orderId}
          canal="support"
          monRole="admin"
          monId={user.id}
          titreChat={chatOuvert.client?.nom ?? 'Client'}
          onClose={handleCloseChat}
        />
      )}
    </div>
  )
}
