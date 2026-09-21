'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useStore } from '@/lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Gamepad2,
  MessageCircle,
  Send,
  Users,
  Trophy,
  Clock,
  RotateCcw,
  Heart,
  Star,
} from 'lucide-react'

// ─── Tic-Tac-Toe (Jogo da Velha) ────────────────────────────────────────────

type TicTacToeValue = 'X' | 'O' | null
type TicTacToeResult = 'X' | 'O' | 'draw' | null

function checkWinner(board: TicTacToeValue[]): TicTacToeResult {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ]
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]
    }
  }
  if (board.every((cell) => cell !== null)) return 'draw'
  return null
}

function minimax(board: TicTacToeValue[], isMaximizing: boolean): number {
  const result = checkWinner(board)
  if (result === 'O') return 10
  if (result === 'X') return -10
  if (result === 'draw') return 0

  if (isMaximizing) {
    let best = -Infinity
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'O'
        best = Math.max(best, minimax(board, false))
        board[i] = null
      }
    }
    return best
  } else {
    let best = Infinity
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'X'
        best = Math.min(best, minimax(board, true))
        board[i] = null
      }
    }
    return best
  }
}

function getBestMove(board: TicTacToeValue[]): number {
  let bestScore = -Infinity
  let bestMove = -1
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'O'
      const score = minimax(board, false)
      board[i] = null
      if (score > bestScore) {
        bestScore = score
        bestMove = i
      }
    }
  }
  return bestMove
}

function TicTacToeGame() {
  const [board, setBoard] = useState<TicTacToeValue[]>(Array(9).fill(null))
  const [isPlayerTurn, setIsPlayerTurn] = useState(true)
  const [result, setResult] = useState<TicTacToeResult>(null)
  const [score, setScore] = useState({ wins: 0, losses: 0, draws: 0 })

  const handleCellClick = useCallback(
    (index: number) => {
      if (board[index] || !isPlayerTurn || result) return
      const newBoard = [...board]
      newBoard[index] = 'X'
      const playerResult = checkWinner(newBoard)
      if (playerResult) {
        setBoard(newBoard)
        setResult(playerResult)
        if (playerResult === 'X') setScore((s) => ({ ...s, wins: s.wins + 1 }))
        if (playerResult === 'draw') setScore((s) => ({ ...s, draws: s.draws + 1 }))
        return
      }
      setBoard(newBoard)
      setIsPlayerTurn(false)
    },
    [board, isPlayerTurn, result]
  )

  useEffect(() => {
    if (!isPlayerTurn && !result) {
      const timeout = setTimeout(() => {
        const newBoard = [...board]
        const move = getBestMove(newBoard)
        if (move !== -1) {
          newBoard[move] = 'O'
          const aiResult = checkWinner(newBoard)
          setBoard(newBoard)
          if (aiResult) {
            setResult(aiResult)
            if (aiResult === 'O') setScore((s) => ({ ...s, losses: s.losses + 1 }))
            if (aiResult === 'draw') setScore((s) => ({ ...s, draws: s.draws + 1 }))
          }
        }
        setIsPlayerTurn(true)
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [isPlayerTurn, result, board])

  const resetGame = () => {
    setBoard(Array(9).fill(null))
    setIsPlayerTurn(true)
    setResult(null)
  }

  const resultMessage = result
    ? result === 'draw'
      ? 'Empate!'
      : result === 'X'
      ? 'Você venceu!'
      : 'IA venceu!'
    : isPlayerTurn
    ? 'Sua vez (X)'
    : 'IA pensando...'

  return (
    <div className="space-y-3">
      {/* Score */}
      <div className="flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <Trophy className="h-3 w-3 text-emerald-500" />
          <span className="font-bold text-emerald-600">{score.wins}</span>
        </div>
        <span className="text-muted-foreground">-</span>
        <div className="flex items-center gap-1">
          <span className="font-bold text-red-500">{score.losses}</span>
          <span className="text-muted-foreground text-[10px]">IA</span>
        </div>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-1">
          <span className="font-bold text-amber-500">{score.draws}</span>
          <span className="text-muted-foreground text-[10px]">Emp</span>
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-3 gap-1.5 max-w-[200px] mx-auto">
        {board.map((cell, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: cell ? 1 : 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleCellClick(i)}
            disabled={!!cell || !isPlayerTurn || !!result}
            className={`w-[62px] h-[62px] rounded-lg text-2xl font-bold flex items-center justify-center transition-colors ${
              cell
                ? cell === 'X'
                  ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-300 dark:border-emerald-700'
                  : 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-2 border-red-300 dark:border-red-700'
                : 'bg-muted/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-2 border-border hover:border-emerald-300 dark:hover:border-emerald-700 cursor-pointer'
            }`}
          >
            {cell}
          </motion.button>
        ))}
      </div>

      {/* Result */}
      <AnimatePresence mode="wait">
        <motion.div
          key={resultMessage}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          className="text-center"
        >
          <p
            className={`text-sm font-semibold ${
              result === 'X'
                ? 'text-emerald-600'
                : result === 'O'
                ? 'text-red-500'
                : result === 'draw'
                ? 'text-amber-500'
                : 'text-muted-foreground'
            }`}
          >
            {resultMessage}
          </p>
        </motion.div>
      </AnimatePresence>

      {result && (
        <div className="flex justify-center">
          <Button size="sm" variant="outline" onClick={resetGame} className="gap-1.5 text-xs">
            <RotateCcw className="h-3 w-3" />
            Jogar Novamente
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Memory Game (Jogo da Memória) ──────────────────────────────────────────

const MEMORY_EMOJIS = ['🎮', '🎯', '🏆', '⭐', '🎪', '🎨', '🎭', '🎸']

interface MemoryCard {
  id: number
  emoji: string
  isFlipped: boolean
  isMatched: boolean
}

function createMemoryCards(): MemoryCard[] {
  const pairs = [...MEMORY_EMOJIS, ...MEMORY_EMOJIS]
  const shuffled = pairs
    .sort(() => Math.random() - 0.5)
    .map((emoji, index) => ({
      id: index,
      emoji,
      isFlipped: false,
      isMatched: false,
    }))
  return shuffled
}

function MemoryGame() {
  const [cards, setCards] = useState<MemoryCard[]>(createMemoryCards)
  const [flippedIds, setFlippedIds] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [matches, setMatches] = useState(0)
  const [isChecking, setIsChecking] = useState(false)
  const [bestScore, setBestScore] = useState<number | null>(null)

  const handleCardClick = useCallback(
    (id: number) => {
      if (isChecking) return
      const card = cards.find((c) => c.id === id)
      if (!card || card.isFlipped || card.isMatched) return
      if (flippedIds.length >= 2) return

      const newCards = cards.map((c) =>
        c.id === id ? { ...c, isFlipped: true } : c
      )
      setCards(newCards)
      const newFlipped = [...flippedIds, id]
      setFlippedIds(newFlipped)

      if (newFlipped.length === 2) {
        setMoves((m) => m + 1)
        setIsChecking(true)
        const [firstId, secondId] = newFlipped
        const firstCard = newCards.find((c) => c.id === firstId)!
        const secondCard = newCards.find((c) => c.id === secondId)!

        if (firstCard.emoji === secondCard.emoji) {
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === firstId || c.id === secondId
                  ? { ...c, isMatched: true }
                  : c
              )
            )
            setMatches((m) => {
              const newMatches = m + 1
              if (newMatches === MEMORY_EMOJIS.length) {
                setBestScore((prev) =>
                  prev === null ? moves + 1 : Math.min(prev, moves + 1)
                )
              }
              return newMatches
            })
            setFlippedIds([])
            setIsChecking(false)
          }, 600)
        } else {
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === firstId || c.id === secondId
                  ? { ...c, isFlipped: false }
                  : c
              )
            )
            setFlippedIds([])
            setIsChecking(false)
          }, 1000)
        }
      }
    },
    [cards, flippedIds, isChecking, moves]
  )

  const resetGame = () => {
    setCards(createMemoryCards())
    setFlippedIds([])
    setMoves(0)
    setMatches(0)
    setIsChecking(false)
  }

  const isComplete = matches === MEMORY_EMOJIS.length

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            Jogadas: <span className="font-bold text-foreground">{moves}</span>
          </span>
          <span className="text-muted-foreground">
            Pares: <span className="font-bold text-emerald-600">{matches}/{MEMORY_EMOJIS.length}</span>
          </span>
        </div>
        {bestScore !== null && (
          <Badge variant="secondary" className="text-[9px] gap-1">
            <Star className="h-2.5 w-2.5" />
            Recorde: {bestScore}
          </Badge>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 gap-1.5 max-w-[240px] mx-auto">
        {cards.map((card) => (
          <motion.button
            key={card.id}
            whileHover={{ scale: card.isFlipped || card.isMatched ? 1 : 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => handleCardClick(card.id)}
            disabled={card.isFlipped || card.isMatched || isChecking}
            className={`w-[54px] h-[54px] rounded-lg text-xl flex items-center justify-center transition-all duration-300 ${
              card.isMatched
                ? 'bg-emerald-100 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700 scale-95'
                : card.isFlipped
                ? 'bg-amber-100 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700'
                : 'bg-muted/60 border-2 border-border hover:border-emerald-300 dark:hover:border-emerald-700 cursor-pointer'
            }`}
          >
            {card.isFlipped || card.isMatched ? (
              <motion.span
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.3 }}
              >
                {card.emoji}
              </motion.span>
            ) : (
              <span className="text-muted-foreground/40 text-lg">?</span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Result */}
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-2"
        >
          <p className="text-sm font-bold text-emerald-600">
            Parabéns! 🎉 Completou em {moves} jogadas!
          </p>
          <Button size="sm" variant="outline" onClick={resetGame} className="gap-1.5 text-xs">
            <RotateCcw className="h-3 w-3" />
            Jogar Novamente
          </Button>
        </motion.div>
      )}
    </div>
  )
}

// ─── Number Guessing (Adivinhação) ──────────────────────────────────────────

function NumberGuessingGame() {
  const [secretNumber, setSecretNumber] = useState(() =>
    Math.floor(Math.random() * 100) + 1
  )
  const [guess, setGuess] = useState('')
  const [attempts, setAttempts] = useState<number[]>([])
  const [hint, setHint] = useState<string>('Tente adivinhar um número entre 1 e 100!')
  const [hintType, setHintType] = useState<'info' | 'higher' | 'lower' | 'correct' | 'hot' | 'cold'>('info')
  const [gameOver, setGameOver] = useState(false)
  const [bestAttempts, setBestAttempts] = useState<number | null>(null)

  const handleGuess = useCallback(() => {
    const num = parseInt(guess)
    if (isNaN(num) || num < 1 || num > 100) return

    const newAttempts = [...attempts, num]
    setAttempts(newAttempts)

    if (num === secretNumber) {
      setHint(`Acertou! O número era ${secretNumber}! 🎉`)
      setHintType('correct')
      setGameOver(true)
      setBestAttempts((prev) =>
        prev === null ? newAttempts.length : Math.min(prev, newAttempts.length)
      )
    } else {
      const diff = Math.abs(num - secretNumber)
      let temperature = ''
      if (diff <= 5) temperature = '🔥 Muito quente! '
      else if (diff <= 15) temperature = '🌡️ Quente! '
      else if (diff <= 30) temperature = '😐 Morno. '
      else if (diff <= 50) temperature = '❄️ Frio. '
      else temperature = '🧊 Congelante! '

      if (num < secretNumber) {
        setHint(`${temperature}O número é MAIOR!`)
        setHintType(diff <= 10 ? 'hot' : 'higher')
      } else {
        setHint(`${temperature}O número é MENOR!`)
        setHintType(diff <= 10 ? 'hot' : 'lower')
      }
    }
    setGuess('')
  }, [guess, secretNumber, attempts])

  const resetGame = () => {
    setSecretNumber(Math.floor(Math.random() * 100) + 1)
    setGuess('')
    setAttempts([])
    setHint('Tente adivinhar um número entre 1 e 100!')
    setHintType('info')
    setGameOver(false)
  }

  return (
    <div className="space-y-3">
      {/* Best Score */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Tentativas: <span className="font-bold text-foreground">{attempts.length}</span>
        </span>
        {bestAttempts !== null && (
          <Badge variant="secondary" className="text-[9px] gap-1">
            <Star className="h-2.5 w-2.5" />
            Melhor: {bestAttempts}
          </Badge>
        )}
      </div>

      {/* Hint */}
      <motion.div
        key={hint}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-3 rounded-lg text-center text-sm font-medium ${
          hintType === 'correct'
            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700'
            : hintType === 'hot'
            ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700'
            : hintType === 'higher' || hintType === 'lower'
            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700'
            : 'bg-muted/50 text-muted-foreground border border-border'
        }`}
      >
        {hint}
      </motion.div>

      {/* Input */}
      {!gameOver ? (
        <div className="flex gap-2">
          <Input
            type="number"
            min={1}
            max={100}
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGuess()}
            placeholder="1-100"
            className="text-center text-lg font-bold"
          />
          <Button
            onClick={handleGuess}
            disabled={!guess}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex justify-center">
          <Button size="sm" variant="outline" onClick={resetGame} className="gap-1.5 text-xs">
            <RotateCcw className="h-3 w-3" />
            Jogar Novamente
          </Button>
        </div>
      )}

      {/* Attempts History */}
      {attempts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
          {attempts.map((attempt, i) => (
            <Badge
              key={i}
              variant="secondary"
              className={`text-[10px] ${
                attempt === secretNumber
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : attempt < secretNumber
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
              }`}
            >
              {attempt} {attempt === secretNumber ? '✓' : attempt < secretNumber ? '↑' : '↓'}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Snake Game (Cobra) ─────────────────────────────────────────────────────

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
type Point = { x: number; y: number }

function SnakeGame() {
  const GRID_SIZE = 15
  const CELL_SIZE = 16
  const GAME_SPEED = 150

  const [snake, setSnake] = useState<Point[]>([{ x: 7, y: 7 }])
  const [food, setFood] = useState<Point>({ x: 5, y: 5 })
  const [direction, setDirection] = useState<Direction>('RIGHT')
  const [isRunning, setIsRunning] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)

  const directionRef = useRef<Direction>('RIGHT')
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null)
  const scoreRef = useRef(0)

  const generateFood = useCallback(
    (currentSnake: Point[]): Point => {
      let newFood: Point
      do {
        newFood = {
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE),
        }
      } while (currentSnake.some((s) => s.x === newFood.x && s.y === newFood.y))
      return newFood
    },
    [GRID_SIZE]
  )

  const resetGame = useCallback(() => {
    const initialSnake = [{ x: 7, y: 7 }]
    setSnake(initialSnake)
    setFood(generateFood(initialSnake))
    setDirection('RIGHT')
    directionRef.current = 'RIGHT'
    setGameOver(false)
    setScore(0)
    scoreRef.current = 0
    setIsRunning(false)
    if (gameLoopRef.current) clearInterval(gameLoopRef.current)
  }, [generateFood])

  const moveSnake = useCallback(() => {
    setSnake((prevSnake) => {
      const head = { ...prevSnake[0] }
      const dir = directionRef.current

      switch (dir) {
        case 'UP':
          head.y -= 1
          break
        case 'DOWN':
          head.y += 1
          break
        case 'LEFT':
          head.x -= 1
          break
        case 'RIGHT':
          head.x += 1
          break
      }

      // Check wall collision
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        setGameOver(true)
        setIsRunning(false)
        if (gameLoopRef.current) clearInterval(gameLoopRef.current)
        setHighScore((prev) => Math.max(prev, scoreRef.current))
        return prevSnake
      }

      // Check self collision
      if (prevSnake.some((s) => s.x === head.x && s.y === head.y)) {
        setGameOver(true)
        setIsRunning(false)
        if (gameLoopRef.current) clearInterval(gameLoopRef.current)
        setHighScore((prev) => Math.max(prev, scoreRef.current))
        return prevSnake
      }

      const newSnake = [head, ...prevSnake]

      // Check food
      setFood((prevFood) => {
        if (head.x === prevFood.x && head.y === prevFood.y) {
          setScore((s) => {
            const newScore = s + 10
            scoreRef.current = newScore
            setHighScore((prev) => Math.max(prev, newScore))
            return newScore
          })
          const newFood = generateFood(newSnake)
          return newFood
        } else {
          newSnake.pop()
          return prevFood
        }
      })

      return newSnake
    })
  }, [GRID_SIZE, generateFood])

  // Game loop
  useEffect(() => {
    if (isRunning && !gameOver) {
      gameLoopRef.current = setInterval(moveSnake, GAME_SPEED)
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current)
    }
  }, [isRunning, gameOver, moveSnake])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const dir = directionRef.current
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault()
          if (dir !== 'DOWN') {
            directionRef.current = 'UP'
            setDirection('UP')
          }
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault()
          if (dir !== 'UP') {
            directionRef.current = 'DOWN'
            setDirection('DOWN')
          }
          break
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault()
          if (dir !== 'RIGHT') {
            directionRef.current = 'LEFT'
            setDirection('LEFT')
          }
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault()
          if (dir !== 'LEFT') {
            directionRef.current = 'RIGHT'
            setDirection('RIGHT')
          }
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Touch/swipe controls for mobile
  const touchStartRef = useRef<Point | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStartRef.current.x
    const dy = touch.clientY - touchStartRef.current.y
    const dir = directionRef.current

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 20 && dir !== 'LEFT') {
        directionRef.current = 'RIGHT'
        setDirection('RIGHT')
      } else if (dx < -20 && dir !== 'RIGHT') {
        directionRef.current = 'LEFT'
        setDirection('LEFT')
      }
    } else {
      if (dy > 20 && dir !== 'UP') {
        directionRef.current = 'DOWN'
        setDirection('DOWN')
      } else if (dy < -20 && dir !== 'DOWN') {
        directionRef.current = 'UP'
        setDirection('UP')
      }
    }
    touchStartRef.current = null
  }

  // Render grid
  const renderGrid = () => {
    const grid: React.ReactNode[] = []
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isSnakeHead = snake[0]?.x === x && snake[0]?.y === y
        const isSnakeBody = snake.some((s, i) => i > 0 && s.x === x && s.y === y)
        const isFood = food.x === x && food.y === y

        let cellClass = 'bg-muted/30'
        if (isSnakeHead) {
          cellClass = 'bg-emerald-500 dark:bg-emerald-400 rounded-sm'
        } else if (isSnakeBody) {
          cellClass = 'bg-emerald-400 dark:bg-emerald-500 rounded-sm'
        } else if (isFood) {
          cellClass = 'bg-red-500 rounded-full'
        }

        grid.push(
          <div
            key={`${x}-${y}`}
            className={`${cellClass} transition-colors duration-75`}
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
            }}
          />
        )
      }
    }
    return grid
  }

  // Direction buttons for mobile
  const DirectionButton = ({
    dir,
    label,
    icon,
  }: {
    dir: Direction
    label: string
    icon: string
  }) => (
    <button
      onClick={() => {
        const currentDir = directionRef.current
        const opposites: Record<Direction, Direction> = {
          UP: 'DOWN',
          DOWN: 'UP',
          LEFT: 'RIGHT',
          RIGHT: 'LEFT',
        }
        if (opposites[dir] !== currentDir) {
          directionRef.current = dir
          setDirection(dir)
        }
      }}
      className="w-10 h-10 rounded-lg bg-muted/50 border border-border hover:bg-emerald-100 dark:hover:bg-emerald-950/30 hover:border-emerald-300 dark:hover:border-emerald-700 flex items-center justify-center text-sm font-bold transition-colors active:scale-90"
      aria-label={label}
    >
      {icon}
    </button>
  )

  return (
    <div className="space-y-3">
      {/* Score */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            Pontos: <span className="font-bold text-emerald-600">{score}</span>
          </span>
          <span className="text-muted-foreground">
            Tamanho: <span className="font-bold text-foreground">{snake.length}</span>
          </span>
        </div>
        {highScore > 0 && (
          <Badge variant="secondary" className="text-[9px] gap-1">
            <Star className="h-2.5 w-2.5" />
            Recorde: {highScore}
          </Badge>
        )}
      </div>

      {/* Game Board */}
      <div
        className="border-2 border-border rounded-lg overflow-hidden mx-auto inline-grid"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
          gap: '1px',
          background: 'hsl(var(--muted) / 0.1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {renderGrid()}
      </div>

      {/* Controls */}
      <div className="space-y-2">
        {/* Mobile direction pad */}
        <div className="flex flex-col items-center gap-1 md:hidden">
          <DirectionButton dir="UP" label="Cima" icon="↑" />
          <div className="flex gap-1">
            <DirectionButton dir="LEFT" label="Esquerda" icon="←" />
            <DirectionButton dir="DOWN" label="Baixo" icon="↓" />
            <DirectionButton dir="RIGHT" label="Direita" icon="→" />
          </div>
        </div>

        {/* Start/Reset buttons */}
        <div className="flex justify-center gap-2">
          {!isRunning && !gameOver && (
            <Button
              size="sm"
              onClick={() => setIsRunning(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              <Gamepad2 className="h-3 w-3" />
              Iniciar
            </Button>
          )}
          {isRunning && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsRunning(false)
                if (gameLoopRef.current) clearInterval(gameLoopRef.current)
              }}
              className="text-xs gap-1.5"
            >
              Pausar
            </Button>
          )}
          {(gameOver || snake.length > 1) && (
            <Button size="sm" variant="outline" onClick={resetGame} className="gap-1.5 text-xs">
              <RotateCcw className="h-3 w-3" />
              Reiniciar
            </Button>
          )}
        </div>

        {/* Game Over */}
        {gameOver && (
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center text-sm font-bold text-red-500"
          >
            Fim de jogo! Pontuação: {score}
          </motion.p>
        )}

        {/* Keyboard hint (desktop) */}
        <p className="text-[10px] text-muted-foreground text-center hidden md:block">
          Use as setas ↑↓←→ ou WASD para mover
        </p>
      </div>
    </div>
  )
}

// ─── Chat Component ─────────────────────────────────────────────────────────

interface ChatMessage {
  id: string
  username: string
  text: string
  timestamp: Date
  avatar: string
}

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    username: 'Maria Silva',
    text: 'Alguém já venceu o jogo da velha contra a IA? 😄',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    avatar: 'MS',
  },
  {
    id: '2',
    username: 'João Santos',
    text: 'Sim! É difícil mas não é impossível. A IA é muito boa!',
    timestamp: new Date(Date.now() - 12 * 60 * 1000),
    avatar: 'JS',
  },
  {
    id: '3',
    username: 'Ana Costa',
    text: 'O jogo da memória é viciante kkk meu recorde é 12 jogadas',
    timestamp: new Date(Date.now() - 8 * 60 * 1000),
    avatar: 'AC',
  },
  {
    id: '4',
    username: 'Pedro Oliveira',
    text: 'Alguém consegue fazer mais de 100 pontos na cobrinha?',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    avatar: 'PO',
  },
  {
    id: '5',
    username: 'Carlos Silva',
    text: 'Tentando o jogo de adivinhação... já vão 8 tentativas 😅',
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    avatar: 'CS',
  },
  {
    id: '6',
    username: 'Lucia Ferreira',
    text: 'Bom dia pessoal! Bora jogar! 🎮',
    timestamp: new Date(Date.now() - 1 * 60 * 1000),
    avatar: 'LF',
  },
]

function ChatSection() {
  const { user } = useStore()
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES)
  const [inputValue, setInputValue] = useState('')
  const [onlineUsers] = useState(24)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!inputValue.trim()) return

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      username: user?.name || 'Usuário',
      text: inputValue.trim(),
      timestamp: new Date(),
      avatar: user?.name
        ?.split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('') || 'U',
    }
    setMessages((prev) => [...prev, newMessage])
    setInputValue('')
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-emerald-600" />
            Bate-papo dos Jogadores
          </CardTitle>
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Users className="h-3 w-3" />
            {onlineUsers} online
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Online indicator */}
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-muted-foreground">
            {onlineUsers} jogadores online agora
          </span>
        </div>

        <Separator />

        {/* Messages */}
        <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex gap-2"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400">
                  {msg.avatar}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {msg.username}
                  </span>
                  <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground break-words">{msg.text}</p>
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <Separator />

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Digite sua mensagem..."
            className="text-xs h-9"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 h-9"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Games Page ────────────────────────────────────────────────────────

export function GamesPage() {
  const { user } = useStore()

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-emerald-600" />
              Jogos
            </h2>
            <p className="text-sm text-muted-foreground">
              Divirta-se com nossos mini jogos e converse com outros jogadores!
            </p>
          </div>
          <Badge className="bg-emerald-600 text-white gap-1">
            <Heart className="h-3 w-3" />
            {user?.name?.split(' ')[0] || 'Jogador'}
          </Badge>
        </div>
      </motion.div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tic-Tac-Toe */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="overflow-hidden h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-emerald-600" />
                  Jogo da Velha
                </CardTitle>
                <Badge variant="secondary" className="text-[9px]">vs IA</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Desafie a inteligência artificial! Você é o X.
              </p>
            </CardHeader>
            <CardContent>
              <TicTacToeGame />
            </CardContent>
          </Card>
        </motion.div>

        {/* Memory Game */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="overflow-hidden h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Star className="h-4 w-4 text-emerald-600" />
                  Jogo da Memória
                </CardTitle>
                <Badge variant="secondary" className="text-[9px]">16 cartas</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Encontre todos os pares de emojis!
              </p>
            </CardHeader>
            <CardContent>
              <MemoryGame />
            </CardContent>
          </Card>
        </motion.div>

        {/* Number Guessing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="overflow-hidden h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Heart className="h-4 w-4 text-emerald-600" />
                  Adivinhação
                </CardTitle>
                <Badge variant="secondary" className="text-[9px]">1-100</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Adivinhe o número secreto com dicas de temperatura!
              </p>
            </CardHeader>
            <CardContent>
              <NumberGuessingGame />
            </CardContent>
          </Card>
        </motion.div>

        {/* Snake Game */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card className="overflow-hidden h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4 text-emerald-600" />
                  Cobra
                </CardTitle>
                <Badge variant="secondary" className="text-[9px]">Clássico</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Controle a cobra e coma o máximo que puder!
              </p>
            </CardHeader>
            <CardContent>
              <SnakeGame />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Chat Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <ChatSection />
      </motion.div>
    </div>
  )
}
