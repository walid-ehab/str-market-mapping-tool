import { useState, type ReactNode } from 'react'

interface CollapsibleSectionProps {
  title: string
  children: ReactNode
  /** Whether the section starts open. Resets to this on every page load — not persisted. */
  defaultOpen?: boolean
}

/** A `.sidebar__section` whose body can be hidden behind a clickable header, for sections that take up space once set and aren't needed open all the time. */
export function CollapsibleSection({ title, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="sidebar__section">
      <button
        type="button"
        className="collapsible-section__header"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        <h2>{title}</h2>
        <span className="collapsible-section__chevron">{isOpen ? '▾' : '▸'}</span>
      </button>
      {isOpen && <div className="collapsible-section__body">{children}</div>}
    </div>
  )
}
