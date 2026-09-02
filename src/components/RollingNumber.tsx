import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { formatMoney } from '../api/adapters'
import { MOTION_EASE, durationForDelta, prefersReducedMotion } from '../lib/motion'

type Token =
  | { key: string; type: 'digit'; digit: number }
  | { key: string; type: 'char'; char: string }

interface Props {
  value: number
  currency?: string
  format?: 'money' | 'integer'
  variant?: 'odometer' | 'count'
  durationMs?: number
  className?: string
  style?: CSSProperties
}

const tokenize = (formatted: string): Token[] => {
  const dot = formatted.lastIndexOf('.')
  const tokens: Token[] = []
  for (let i = 0; i < formatted.length; i++) {
    const ch = formatted[i]
    if (/\d/.test(ch)) {
      const place = dot === -1
        ? formatted.length - 1 - i
        : i < dot
          ? dot - 1 - i
          : -(i - dot)
      tokens.push({ key: `d${place}`, type: 'digit', digit: Number(ch) })
      continue
    }
    tokens.push({ key: `c${i}-${ch}`, type: 'char', char: ch })
  }
  return tokens
}

const formatValue = (value: number, format: 'money' | 'integer', currency: string): string => {
  if (format === 'integer') return String(Math.round(value))
  return formatMoney(value, currency)
}

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3

const DigitColumn = ({ digit, durationMs }: { digit: number; durationMs: number }) => {
  const reduced = prefersReducedMotion()
  const [shown, setShown] = useState(reduced ? digit : 0)
  const didMount = useRef(false)

  useLayoutEffect(() => {
    if (reduced) {
      setShown(digit)
      didMount.current = true
      return
    }
    if (!didMount.current) {
      didMount.current = true
      const id = requestAnimationFrame(() => setShown(digit))
      return () => cancelAnimationFrame(id)
    }
    setShown(digit)
  }, [digit, reduced])

  return (
    <span aria-hidden className="rolling-digit">
      <span
        className="rolling-digit-strip"
        style={{
          transform: `translateY(${-shown}em)`,
          transition: durationMs > 0 ? `transform ${durationMs}ms ${MOTION_EASE}` : 'none',
        }}
      >
        {'0123456789'.split('').map(d => (
          <span key={d}>{d}</span>
        ))}
      </span>
    </span>
  )
}

export const RollingNumber = ({
  value,
  currency = 'EUR',
  format = 'money',
  variant = 'count',
  durationMs,
  className,
  style,
}: Props) => {
  const label = formatValue(value, format, currency)

  if (variant === 'odometer') {
    const reduced = prefersReducedMotion()
    const ms = durationMs ?? durationForDelta(0, value)
    const tokens = tokenize(label)
    return (
      <span className={['rolling-number', className].filter(Boolean).join(' ')} style={style}>
        <span className="visually-hidden">{label}</span>
        <span aria-hidden className="rolling-number-visual">
          {tokens.map(token => (
            token.type === 'digit' ? (
              <DigitColumn key={token.key} digit={token.digit} durationMs={reduced ? 0 : ms} />
            ) : (
              <span key={token.key}>{token.char}</span>
            )
          ))}
        </span>
      </span>
    )
  }

  return (
    <CountNumber
      value={value}
      format={format}
      currency={currency}
      durationMs={durationMs}
      className={className}
      style={style}
      label={label}
    />
  )
}

const CountNumber = ({
  value,
  format,
  currency,
  durationMs,
  className,
  style,
  label,
}: {
  value: number
  format: 'money' | 'integer'
  currency: string
  durationMs?: number
  className?: string
  style?: CSSProperties
  label: string
}) => {
  const displayed = useRef(0)
  const [text, setText] = useState(() => (
    prefersReducedMotion() ? formatValue(value, format, currency) : formatValue(0, format, currency)
  ))

  useEffect(() => {
    if (prefersReducedMotion()) {
      displayed.current = value
      setText(formatValue(value, format, currency))
      return
    }

    const from = displayed.current
    const to = value
    const dur = durationMs ?? durationForDelta(from, to)
    if (dur === 0 || from === to) {
      displayed.current = to
      setText(formatValue(to, format, currency))
      return
    }

    let start: number | null = null
    let frame = 0
    const tick = (now: number) => {
      if (start === null) start = now
      const t = Math.min(1, (now - start) / dur)
      const current = from + (to - from) * easeOutCubic(t)
      displayed.current = current
      setText(formatValue(current, format, currency))
      if (t < 1) {
        frame = requestAnimationFrame(tick)
        return
      }
      displayed.current = to
      setText(formatValue(to, format, currency))
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, format, currency, durationMs])

  return (
    <span className={['rolling-number', className].filter(Boolean).join(' ')} style={style}>
      <span className="visually-hidden">{label}</span>
      <span aria-hidden className="rolling-number-visual">{text}</span>
    </span>
  )
}
