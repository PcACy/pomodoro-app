import { memo } from 'react'

export interface MechanicalSwitchProps {
  checked: boolean
  onChange: () => void
  label: string
}

export const MechanicalSwitch = memo(function MechanicalSwitch({
  checked,
  onChange,
  label,
}: MechanicalSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      /* Generous hit area via a pseudo-element so the 36px visual control
         still satisfies the 44px touch-target guideline on Android. */
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-pill border p-0.5 transition-colors duration-150 before:absolute before:-inset-2 before:content-[''] ${
        checked ? 'border-accent/50 bg-accent-subtle' : 'border-line bg-track'
      }`}
    >
      <span
        className={`pointer-events-none absolute left-2 font-mono text-[9px] font-bold leading-none transition-opacity ${
          checked ? 'text-accent opacity-90' : 'opacity-0'
        }`}
        aria-hidden="true"
      >
        I
      </span>
      <span
        className={`pointer-events-none absolute right-2 font-mono text-[9px] leading-none transition-opacity ${
          checked ? 'opacity-0' : 'text-muted opacity-70'
        }`}
        aria-hidden="true"
      >
        O
      </span>
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-pill transition-transform duration-200 ease-out ${
          checked ? 'translate-x-5 bg-accent' : 'translate-x-0 bg-muted/60'
        }`}
      />
    </button>
  )
})
