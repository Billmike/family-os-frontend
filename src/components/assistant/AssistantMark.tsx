import { Sparkles } from 'lucide-react'
import { t } from '../../ui'

interface Props {
  size?: number
}

export const AssistantMark = ({ size = 32 }: Props) => {
  const iconSize = Math.round(size * 0.5)
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        background: t.primary,
        color: t.onPrimary,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Sparkles size={iconSize} color={t.onPrimary} strokeWidth={2} />
    </span>
  )
}
