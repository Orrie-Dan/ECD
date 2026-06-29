import { splitHighlight } from '@/lib/district-children-utils'

interface SearchHighlightProps {
  text: string
  query: string
  className?: string
}

export function SearchHighlight({ text, query, className = '' }: SearchHighlightProps) {
  const parts = splitHighlight(text, query)

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.match ? (
          <mark
            key={index}
            className="bg-accent-light text-text font-semibold rounded px-0.5 not-italic"
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </span>
  )
}
