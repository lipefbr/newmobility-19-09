'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 300)
    }
    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={scrollToTop}
          className="fixed bottom-20 right-4 z-40 md:bottom-6 md:right-6 h-10 w-10 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 transition-colors flex items-center justify-center"
          aria-label="Voltar ao topo"
        >
          <ArrowUp className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

// Last Updated timestamp
export function LastUpdated({ className }: { className?: string }) {
  const now = new Date()
  const formatted = now.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`flex items-center gap-1.5 text-[10px] text-muted-foreground ${className || ''}`}>
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
      <span>Atualizado: {formatted}</span>
    </div>
  )
}
