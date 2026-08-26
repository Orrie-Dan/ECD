import { SelectTile } from '@/components/feeding/SelectTile'
import { Card } from '@/components/ui/Card'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import { splitBilingualText } from '@/lib/self-eval-text'
import type { SelfEvalItem, SelfEvalItemAnswers } from '@/features/self-evaluation/types'

interface SelfEvalSectionFormProps {
  items: SelfEvalItem[]
  answers: SelfEvalItemAnswers
  onChange: (answers: SelfEvalItemAnswers) => void
}

export function SelfEvalSectionForm({ items, answers, onChange }: SelfEvalSectionFormProps) {
  const setAnswer = (id: string, met: boolean) => {
    onChange({ ...answers, [id]: met })
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const labels = splitBilingualText(item.text)
        return (
          <Card key={item.id} className="p-4 space-y-3">
            <div>
              <p className="text-caption text-text-muted">
                {caretaker.selfEval.itemLabel.replace('{n}', String(item.number))}
                {' · '}
                {caretaker.selfEval.weightLabel.replace('{w}', String(item.maxScore))}
              </p>
              {labels.rw && <p className="text-body font-medium text-text">{labels.rw}</p>}
              {labels.en && labels.en !== labels.rw && (
                <p className="text-caption text-text-muted mt-1">{labels.en}</p>
              )}
            </div>

            {item.indicators.length === 0 ? (
              <div className="grid grid-cols-2 gap-2">
                <SelectTile
                  label={common.yes}
                  selected={answers[item.id] === true}
                  onChange={() => setAnswer(item.id, true)}
                />
                <SelectTile
                  label={common.no}
                  selected={answers[item.id] === false}
                  onChange={() => setAnswer(item.id, false)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-caption text-text-muted">
                  {item.selectionMode === 'any'
                    ? caretaker.selfEval.indicatorAnyHint
                    : caretaker.selfEval.indicatorAllHint}
                </p>
                {item.indicators.map((indicator) => {
                  const indLabels = splitBilingualText(indicator.label)
                  return (
                    <SelectTile
                      key={indicator.id}
                      label={indLabels.rw ?? indicator.label}
                      selected={answers[indicator.id] === true}
                      onChange={(selected) => setAnswer(indicator.id, selected)}
                    />
                  )
                })}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
