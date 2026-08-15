/** Chrome/Edge/Android install prompt event (not in all TS DOM libs). */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type InstallListener = () => void

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<InstallListener>()

function notify() {
  for (const listener of listeners) listener()
}

function onBeforeInstallPrompt(event: Event) {
  event.preventDefault()
  deferredPrompt = event as BeforeInstallPromptEvent
  notify()
}

function onAppInstalled() {
  deferredPrompt = null
  notify()
}

let listening = false

/** Start capturing `beforeinstallprompt` (safe to call multiple times). */
export function initPwaInstallListeners() {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.addEventListener('appinstalled', onAppInstalled)
}

export function subscribePwaInstall(listener: InstallListener): () => void {
  initPwaInstallListeners()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return true
  return window.matchMedia('(display-mode: standalone)').matches
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const iOSDevice = /iPad|iPhone|iPod/.test(ua)
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return iOSDevice || iPadOs
}

export function canPromptInstall(): boolean {
  return deferredPrompt !== null
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

export async function promptInstall(): Promise<InstallOutcome> {
  if (!deferredPrompt) return 'unavailable'
  const promptEvent = deferredPrompt
  deferredPrompt = null
  notify()
  try {
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    return choice.outcome
  } catch {
    return 'unavailable'
  }
}

export type InstallMode = 'installed' | 'prompt' | 'ios' | 'manual'

export function getInstallMode(): InstallMode {
  if (isStandalone()) return 'installed'
  if (canPromptInstall()) return 'prompt'
  if (isIos()) return 'ios'
  return 'manual'
}

export function isInstallAvailable(): boolean {
  const mode = getInstallMode()
  return mode === 'prompt' || mode === 'ios' || mode === 'manual'
}
