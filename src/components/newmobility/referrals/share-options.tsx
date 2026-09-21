'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Share2, Copy, Check, QrCode, MessageCircle, Send, Twitter, Facebook } from 'lucide-react'
import { toast } from 'sonner'

interface ShareOptionsProps {
  referralLink: string
  referralCode: string
}

// Simple QR code generator (visual representation only)
function QRCodeDisplay({ referralLink }: { referralLink: string }) {
  const size = 160
  const cellSize = size / 25
  const cells: boolean[][] = []

  // Create a deterministic pattern from the URL
  let hash = 0
  for (let i = 0; i < referralLink.length; i++) {
    hash = ((hash << 5) - hash + referralLink.charCodeAt(i)) | 0
  }

  for (let y = 0; y < 25; y++) {
    cells[y] = []
    for (let x = 0; x < 25; x++) {
      // Finder patterns (3 corners)
      if ((x < 7 && y < 7) || (x >= 18 && y < 7) || (x < 7 && y >= 18)) {
        const fx = x < 7 ? x : (x >= 18 ? x - 18 : x)
        const fy = y < 7 ? y : (y >= 18 ? y - 18 : y)
        cells[y][x] = (fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4))
      } else {
        // Data pattern
        const seed = (hash + x * 7 + y * 13) & 0xFF
        cells[y][x] = seed < 120
      }
    }
  }

  return (
    <div className="bg-white p-3 rounded-xl inline-block">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {cells.map((row, y) =>
          row.map((cell, x) =>
            cell ? (
              <rect
                key={`${x}-${y}`}
                x={x * cellSize}
                y={y * cellSize}
                width={cellSize}
                height={cellSize}
                fill="#059669"
              />
            ) : null
          )
        )}
      </svg>
      <p className="text-[9px] text-gray-500 text-center mt-1 truncate max-w-[160px]">{referralLink}</p>
    </div>
  )
}

export function ShareOptions({ referralLink, referralCode }: ShareOptionsProps) {
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const shareText = `🚀 Junte-se à NewMobility e ganhe CashBack em até 9 níveis! Use meu código: ${referralCode}`
  const encodedText = encodeURIComponent(shareText)
  const encodedUrl = encodeURIComponent(referralLink)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast.success('Link copiado!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers / insecure contexts
      try {
        const textarea = document.createElement('textarea')
        textarea.value = referralLink
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        setCopied(true)
        toast.success('Link copiado!')
        setTimeout(() => setCopied(false), 2000)
      } catch {
        toast.error('Não foi possível copiar o link')
      }
    }
  }

  // Primary share button: uses Web Share API when available, falls back to clipboard copy
  const handleShare = async () => {
    setIsSharing(true)
    const shareData = {
      title: 'NewMobility - Indique e Ganhe',
      text: shareText,
      url: referralLink,
    }

    // Feature detection for Web Share API
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData)
        toast.success('Compartilhado com sucesso!')
      } catch (err: any) {
        // AbortError happens when user dismisses the share sheet — not a real error
        if (err?.name !== 'AbortError') {
          // Fallback to clipboard copy on non-abort errors
          try {
            await navigator.clipboard.writeText(`${shareText}\n\n${referralLink}`)
            toast.success('Link copiado para a área de transferência!')
          } catch {
            toast.error('Não foi possível compartilhar. Copie o link manualmente.')
          }
        }
      } finally {
        setIsSharing(false)
      }
      return
    }

    // Fallback: copy to clipboard with a friendly message
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${referralLink}`)
      toast.success('Link copiado! Cole onde quiser compartilhar.')
    } catch {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = `${shareText}\n\n${referralLink}`
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        toast.success('Link copiado! Cole onde quiser compartilhar.')
      } catch {
        toast.error('Não foi possível compartilhar. Copie o link manualmente.')
      }
    } finally {
      setIsSharing(false)
    }
  }

  const shareUrls = {
    whatsapp: `https://api.whatsapp.com/send?text=${encodedText}%0A%0A${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
  }

  const socialButtons = [
    { name: 'WhatsApp', icon: MessageCircle, url: shareUrls.whatsapp, color: 'bg-green-500 hover:bg-green-600 text-white' },
    { name: 'Telegram', icon: Send, url: shareUrls.telegram, color: 'bg-blue-500 hover:bg-blue-600 text-white' },
    { name: 'Twitter', icon: Twitter, url: shareUrls.twitter, color: 'bg-black hover:bg-gray-800 text-white dark:bg-gray-700 dark:hover:bg-gray-600' },
    { name: 'Facebook', icon: Facebook, url: shareUrls.facebook, color: 'bg-blue-600 hover:bg-blue-700 text-white' },
  ]

  return (
    <div className="space-y-3">
      {/* Primary Share Button — uses Web Share API with clipboard fallback */}
      <Button
        onClick={handleShare}
        disabled={isSharing}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
      >
        <Share2 className="h-4 w-4" />
        {isSharing ? 'Compartilhando...' : 'Compartilhar'}
      </Button>

      {/* Link copy section */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-sm font-mono text-gray-700 dark:text-gray-300 truncate">
          {referralLink}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1.5 shrink-0"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copiado!' : 'Copiar'}
        </Button>
      </div>

      {/* Social share buttons */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Compartilhar via</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {socialButtons.map((social) => {
            const Icon = social.icon
            return (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${social.color}`}
              >
                <Icon className="h-4 w-4" />
                {social.name}
              </a>
            )
          })}
        </div>
      </div>

      {/* QR Code */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Código: <strong className="text-emerald-700 dark:text-emerald-400">{referralCode}</strong></span>
        </div>
        <Popover open={showQR} onOpenChange={setShowQR}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <QrCode className="h-3.5 w-3.5" />
              QR Code
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="end">
            <div className="flex flex-col items-center gap-3">
              <QRCodeDisplay referralLink={referralLink} />
              <p className="text-xs text-muted-foreground text-center">
                Escaneie para acessar o link de indicação
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={handleCopy}
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copiar Link
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
