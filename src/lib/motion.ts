import { useRef } from 'react'

export const MOTION_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

export const MOTION_MS = {
  feedback: 150,
  state: 280,
  enter: 220,
  collapse: 280,
  focalMin: 280,
  focalMax: 700,
  heroMin: 900,
  heroMax: 1400,
} as const

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

type DurationRange = { min: number; max: number }

const TALLY_RANGE: DurationRange = { min: MOTION_MS.focalMin, max: MOTION_MS.focalMax }
const HERO_RANGE: DurationRange = { min: MOTION_MS.heroMin, max: MOTION_MS.heroMax }

export const durationForDelta = (
  prev: number,
  next: number,
  range: DurationRange = TALLY_RANGE,
): number => {
  if (prefersReducedMotion()) return 0
  const delta = Math.abs(next - prev)
  if (delta === 0) return 0
  const scaled = range.min + Math.log10(delta + 1) * 180
  return Math.min(range.max, Math.max(range.min, scaled))
}

export const useDeltaDuration = (value: number, kind: 'tally' | 'hero' = 'tally'): number => {
  const prevRef = useRef<number | null>(null)
  const durationRef = useRef(0)
  const range = kind === 'hero' ? HERO_RANGE : TALLY_RANGE
  const prev = prevRef.current
  if (prev === null) {
    durationRef.current = durationForDelta(0, value, range)
  } else if (prev !== value) {
    durationRef.current = durationForDelta(prev, value, range)
  }
  prevRef.current = value
  return durationRef.current
}
