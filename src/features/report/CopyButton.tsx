import { useState } from 'react'

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be denied (insecure context, permissions) — the text is still selectable by hand.
    }
  }

  return (
    <button type="button" className="copy-button" onClick={copy}>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}
