// Modal accessible via @headlessui/react Dialog — fermeture overlay/Escape, slots titre/corps/footer

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X } from 'lucide-react'

/**
 * Modal accessible, animée, responsive.
 * Sur mobile : slide depuis le bas. Sur desktop (sm+) : centré.
 *
 * @param {{
 *   ouvert:      boolean,
 *   onClose:     () => void,
 *   titre?:      string,
 *   children:    React.ReactNode,
 *   footer?:     React.ReactNode,
 *   taille?:     'sm'|'md'|'lg',
 *   fermetureDesactive?: boolean,  // empêche la fermeture par overlay/Escape
 * }} props
 */

const TAILLES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export default function Modal({
  ouvert,
  onClose,
  titre,
  children,
  footer,
  taille = 'md',
  fermetureDesactive = false,
}) {
  function handleClose() {
    if (!fermetureDesactive) onClose()
  }

  return (
    <Transition appear show={ouvert} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>

        {/* ── Overlay flouté ────────────────────────────── */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        {/* ── Conteneur centré ──────────────────────────── */}
        <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-full sm:translate-y-4 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-full sm:translate-y-4 sm:scale-95"
          >
            <Dialog.Panel
              className={`
                relative bg-white w-full ${TAILLES[taille] ?? TAILLES.md}
                rounded-t-3xl sm:rounded-2xl shadow-2xl
                flex flex-col max-h-[92dvh]
              `}
            >
              {/* ── En-tête ──────────────────────────────── */}
              {titre && (
                <div className="flex items-center justify-between
                                px-5 py-4 border-b border-gray-100 shrink-0">
                  <Dialog.Title
                    as="h2"
                    className="text-base font-bold text-gray-900"
                  >
                    {titre}
                  </Dialog.Title>

                  {!fermetureDesactive && (
                    <button
                      onClick={handleClose}
                      className="p-2 rounded-xl hover:bg-gray-100 transition-colors
                                 text-gray-400 hover:text-gray-600"
                      aria-label="Fermer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}

              {/* ── Corps scrollable ─────────────────────── */}
              <div className="overflow-y-auto flex-1 px-5 py-4">
                {children}
              </div>

              {/* ── Pied de page optionnel ───────────────── */}
              {footer && (
                <div className="px-5 py-4 border-t border-gray-100 shrink-0">
                  {footer}
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
