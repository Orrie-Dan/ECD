import {
  Apple,
  CheckCircle2,
  Droplets,
  Egg,
  Milk,
  Sprout,
  Wheat,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { BalancedMealComposition } from '@/types'
import { Button } from '@/components/ui/Button'
import { SelectTile } from '@/components/feeding/SelectTile'
import { caretaker } from '@/locales/rw/caretaker'
import { completeComposition, FOOD_GROUP_KEYS } from '@/lib/feeding-utils'

const LABELS: Record<keyof BalancedMealComposition, string> = {
  cerealsOrTubers: caretaker.imirire.cerealsOrTubers,
  legumes: caretaker.imirire.legumes,
  dairy: caretaker.imirire.dairy,
  animalProducts: caretaker.imirire.animalProducts,
  fruitsVegetables: caretaker.imirire.fruitsVegetables,
  addedFat: caretaker.imirire.addedFat,
}

const ICONS: Record<keyof BalancedMealComposition, ReactNode> = {
  cerealsOrTubers: <Wheat size={18} />,
  legumes: <Sprout size={18} />,
  dairy: <Milk size={18} />,
  animalProducts: <Egg size={18} />,
  fruitsVegetables: <Apple size={18} />,
  addedFat: <Droplets size={18} />,
}

interface BalancedMealChecklistProps {
  value: BalancedMealComposition
  onChange: (next: BalancedMealComposition) => void
  /** Highlight unchecked groups when save was blocked. */
  showValidation?: boolean
}

export function BalancedMealChecklist({
  value,
  onChange,
  showValidation = false,
}: BalancedMealChecklistProps) {
  const selectedCount = FOOD_GROUP_KEYS.filter((key) => value[key]).length
  const total = FOOD_GROUP_KEYS.length
  const complete = selectedCount === total
  const progressPct = Math.round((selectedCount / total) * 100)

  return (
    <div
      className={`space-y-4 rounded-xl border p-4 ${
        showValidation && !complete
          ? 'border-error bg-error-light/20'
          : complete
            ? 'border-success/40 bg-success-light/20'
            : 'border-border bg-background-subtle'
      }`}
      role="group"
      aria-label={caretaker.imirire.foodGroupsTitle}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label text-text">{caretaker.imirire.foodGroupsTitle}</p>
          <p className="text-caption text-text-secondary mt-0.5">
            {caretaker.imirire.foodGroupsHint}
          </p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1.5 text-caption font-semibold px-2.5 py-1 rounded-full ${
            complete
              ? 'bg-success-light text-success'
              : showValidation
                ? 'bg-error-light text-error'
                : 'bg-surface text-text-secondary border border-border'
          }`}
          role="status"
        >
          {complete && <CheckCircle2 size={14} aria-hidden />}
          {complete
            ? caretaker.imirire.groupsComplete
            : `${caretaker.imirire.foodGroupsProgress} ${selectedCount}/${total}`}
        </span>
      </div>

      <div
        className="h-2 rounded-full bg-surface border border-border overflow-hidden"
        role="progressbar"
        aria-valuenow={selectedCount}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${selectedCount}/${total}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            complete ? 'bg-success' : showValidation ? 'bg-error' : 'bg-primary'
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {!complete && (
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => onChange(completeComposition())}
        >
          {caretaker.imirire.selectAllGroups}
        </Button>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {FOOD_GROUP_KEYS.map((key) => {
          const checked = value[key]
          const missing = showValidation && !checked
          return (
            <SelectTile
              key={key}
              label={LABELS[key]}
              selected={checked}
              missing={missing}
              onChange={(next) => onChange({ ...value, [key]: next })}
              icon={ICONS[key]}
            />
          )
        })}
      </div>
      {showValidation && !complete && (
        <p className="text-caption text-error font-semibold" role="alert">
          {caretaker.imirire.balancedIncomplete}
        </p>
      )}
    </div>
  )
}
