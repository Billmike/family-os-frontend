import { useCallback, useEffect, useState } from 'react'
import {
  canPromptInstall,
  getInstallMode,
  initPwaInstallListeners,
  isInstallAvailable,
  isIos,
  isStandalone,
  promptInstall,
  subscribePwaInstall,
  type InstallMode,
  type InstallOutcome,
} from './install'

export interface PwaInstallState {
  mode: InstallMode
  isStandalone: boolean
  isIos: boolean
  canPrompt: boolean
  isInstallAvailable: boolean
  promptInstall: () => Promise<InstallOutcome>
}

function readState(): Omit<PwaInstallState, 'promptInstall'> {
  return {
    mode: getInstallMode(),
    isStandalone: isStandalone(),
    isIos: isIos(),
    canPrompt: canPromptInstall(),
    isInstallAvailable: isInstallAvailable(),
  }
}

export function usePwaInstall(): PwaInstallState {
  const [state, setState] = useState(readState)

  useEffect(() => {
    initPwaInstallListeners()
    setState(readState())
    return subscribePwaInstall(() => setState(readState()))
  }, [])

  const runPrompt = useCallback(async () => {
    const outcome = await promptInstall()
    setState(readState())
    return outcome
  }, [])

  return {
    ...state,
    promptInstall: runPrompt,
  }
}
