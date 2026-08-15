import { t, r } from '../../ui'

const IOS_STEPS = [
  { step: '1', text: 'Tap the Share button in your browser' },
  { step: '2', text: '"Add to Home Screen"' },
  { step: '3', text: 'Tap "Add" to confirm' },
] as const

const MANUAL_STEPS = [
  { step: '1', text: 'Open this site in Chrome or Safari on your phone' },
  { step: '2', text: 'Use the browser menu to install or add to Home Screen' },
  { step: '3', text: 'Open FamilyOS from your home screen' },
] as const

export function InstallStepsList({ variant }: { variant: 'ios' | 'manual' }) {
  const steps = variant === 'ios' ? IOS_STEPS : MANUAL_STEPS
  return (
    <div style={{ background: t.surfaceMuted, borderRadius: r.lg, border: `1px solid ${t.border}`, padding: '16px', textAlign: 'left' }}>
      {steps.map((s, i) => (
        <div
          key={s.step}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 0',
            borderTop: i > 0 ? `1px solid ${t.border}` : 'none',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 9999,
              background: t.primary,
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {s.step}
          </div>
          <span style={{ fontSize: 14, color: t.text }}>{s.text}</span>
        </div>
      ))}
    </div>
  )
}
