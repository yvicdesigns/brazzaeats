import { Component } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

/**
 * Filet de sécurité contre les écrans blancs — une erreur de rendu
 * n'importe où dans l'app affiche cet écran de récupération au lieu de
 * planter silencieusement toute l'application sans aucune indication.
 *
 * Doit rester un composant classe : c'est la seule API React permettant
 * de capturer une erreur de rendu (getDerivedStateFromError/componentDidCatch
 * n'ont pas d'équivalent hook).
 */
export default class ErrorBoundary extends Component {
  state = { aPlante: false }

  static getDerivedStateFromError() {
    return { aPlante: true }
  }

  componentDidCatch(error, info) {
    console.error('[Zandofood] Erreur non interceptée :', error, info)
  }

  handleReessayer = () => {
    this.setState({ aPlante: false })
    window.location.reload()
  }

  render() {
    if (!this.state.aPlante) return this.props.children

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-5">
          <AlertTriangle className="w-8 h-8 text-red-500" strokeWidth={1.8} />
        </div>
        <h1 className="text-lg font-black text-gray-900">Une erreur est survenue</h1>
        <p className="text-sm text-gray-500 mt-2 max-w-xs leading-relaxed">
          Quelque chose s'est mal passé. Rechargez la page — si le problème persiste,
          contactez le support.
        </p>
        <button
          onClick={this.handleReessayer}
          className="mt-6 flex items-center justify-center gap-2 bg-brand-500 text-white
                     rounded-xl px-6 py-3.5 text-sm font-bold hover:bg-brand-600
                     transition-colors min-h-[48px]"
        >
          <RotateCcw className="w-4 h-4" />
          Recharger la page
        </button>
      </div>
    )
  }
}
