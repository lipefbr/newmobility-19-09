'use client'

import { useState, useEffect, useCallback } from 'react'
import { useStore, type PageKey } from '@/lib/store'
import { SearchDialog } from '../search/search-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Keyboard,
  Search,
  PanelLeftClose,
  X,
} from 'lucide-react'

const shortcuts = [
  { keys: ['Ctrl', 'K'], description: 'Abrir busca', action: 'search' },
  { keys: ['Ctrl', 'B'], description: 'Alternar sidebar', action: 'sidebar' },
  { keys: ['Esc'], description: 'Fechar diálogos', action: 'close' },
  { keys: ['?'], description: 'Mostrar atalhos', action: 'shortcuts' },
]

export function KeyboardShortcuts() {
  const [showSearch, setShowSearch] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const { setSidebarCollapsed, sidebarCollapsed } = useStore()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isCtrl = e.ctrlKey || e.metaKey

    // Ctrl+K: Open search
    if (isCtrl && e.key === 'k') {
      e.preventDefault()
      setShowSearch(true)
    }

    // Ctrl+B: Toggle sidebar
    if (isCtrl && e.key === 'b') {
      e.preventDefault()
      setSidebarCollapsed(!sidebarCollapsed)
    }

    // ? key: Show shortcuts help (only when no input focused)
    if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
      e.preventDefault()
      setShowHelp(true)
    }

    // Esc: Close dialogs
    if (e.key === 'Escape') {
      setShowSearch(false)
      setShowHelp(false)
    }
  }, [sidebarCollapsed, setSidebarCollapsed])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <>
      <SearchDialog open={showSearch} onOpenChange={setShowSearch} />
      
      {/* Shortcuts Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-emerald-600" />
              Atalhos de Teclado
            </DialogTitle>
            <DialogDescription className="sr-only">Dialog showing keyboard shortcuts for quick navigation</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {shortcuts.map((shortcut) => (
              <div key={shortcut.action} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-foreground">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, i) => (
                    <span key={i}>
                      <kbd className="inline-flex items-center justify-center h-6 min-w-[28px] px-2 rounded-md border border-border bg-muted text-xs font-mono font-medium text-muted-foreground">
                        {key}
                      </kbd>
                      {i < shortcut.keys.length - 1 && (
                        <span className="text-xs text-muted-foreground mx-0.5">+</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 mt-2">
            <p className="text-xs text-muted-foreground text-center">
              Use atalhos para navegar mais rápido pelo sistema
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
