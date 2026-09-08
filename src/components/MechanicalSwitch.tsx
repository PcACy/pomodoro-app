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
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-150 p-0.5 ${
        checked ? 'border-accent bg-canvas' : 'border-line bg-canvas'
      }`}
    >
      <span
        className={`pointer-events-none absolute left-1.5 font-mono text-[8px] font-bold transition-opacity ${
          checked ? 'text-accent opacity-90' : 'opacity-0'
        }`}
      >
        I
      </span>
      <span
        className={`pointer-events-none absolute right-1.5 font-mono text-[8px] transition-opacity ${
          !checked ? 'text-muted/60 opacity-80' : 'opacity-0'
        }`}
      >
        O
      </span>
      <span
        className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full transition-transform duration-150 ease-out ${
          checked ? 'translate-x-4 bg-accent' : 'translate-x-0 bg-muted/60'
        }`}
      />
    </button>
  )
})
