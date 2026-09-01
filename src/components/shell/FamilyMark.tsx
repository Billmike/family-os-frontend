import { t, fonts } from '../../ui'

export const FamilyMark = ({ size = 28 }: { size?: number }) => {
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: t.primary,
        color: t.onPrimary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: fonts.display,
        fontSize: size * 0.52,
        fontWeight: 600,
        lineHeight: 1,
        flexShrink: 0,
        fontStyle: 'italic',
      }}
    >
      F
    </div>
  )
}
