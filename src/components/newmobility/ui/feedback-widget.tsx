'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useTranslation } from '@/lib/i18n'
import { MessageSquare, X, Send, Star, ThumbsUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

const STORAGE_KEY = 'newmobility-feedback'

const emojiRatings = [
  { value: 1, emoji: '😡', label: 'Péssimo' },
  { value: 2, emoji: '😐', label: 'Ruim' },
  { value: 3, emoji: '🙂', label: 'Ok' },
  { value: 4, emoji: '😊', label: 'Bom' },
  { value: 5, emoji: '🤩', label: 'Excelente' },
]

export function FeedbackWidget() {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // localStorage not available during SSR, need client-side init
    const initMount = () => {
      setIsMounted(true)
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const data = JSON.parse(stored)
          if (data.submitted) {
            setSubmitted(true)
          }
        }
      } catch {
        // ignore
      }
    }
    initMount()
  }, [])

  const handleSubmit = () => {
    const data = { rating, feedback, submitted: true, submittedAt: new Date().toISOString() }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // ignore
    }
    setSubmitted(true)
    toast.success(t('feedback.thankYou'))
  }

  const handleReset = () => {
    setRating(0)
    setFeedback('')
    setSubmitted(false)
    setIsOpen(false)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  if (!isMounted || submitted) return null

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-20 lg:bottom-6 right-4 z-30 p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg shadow-emerald-500/30 transition-colors"
            title={t('feedback.trigger')}
          >
            <MessageSquare className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Feedback panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-20 lg:bottom-6 right-4 z-30 w-80 max-w-[calc(100vw-2rem)]"
          >
            <Card className="shadow-xl border-border overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <Star className="h-4 w-4" />
                  <span className="text-sm font-semibold">{t('feedback.title')}</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <CardContent className="p-4 space-y-4">
                <p className="text-xs text-muted-foreground text-center">{t('feedback.question')}</p>

                {/* Emoji rating */}
                <div className="flex justify-center gap-2">
                  {emojiRatings.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRating(r.value)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                        rating === r.value
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 ring-2 ring-emerald-500 scale-110'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <span className="text-2xl">{r.emoji}</span>
                      <span className="text-[9px] text-muted-foreground">{r.label}</span>
                    </button>
                  ))}
                </div>

                {/* Text feedback */}
                {rating > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.2 }}
                  >
                    <Textarea
                      placeholder={t('feedback.placeholder')}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="text-xs min-h-[60px] resize-none"
                    />
                  </motion.div>
                )}

                {/* Submit */}
                {rating > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-2"
                  >
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs"
                      onClick={handleSubmit}
                      size="sm"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {t('feedback.submit')}
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
