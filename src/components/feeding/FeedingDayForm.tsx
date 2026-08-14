import { Milk, Soup, UtensilsCrossed } from 'lucide-react'
import { FormField, TextInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { BalancedMealChecklist } from '@/components/feeding/BalancedMealChecklist'
import { SelectTile } from '@/components/feeding/SelectTile'
import { caretaker } from '@/locales/rw/caretaker'
import { isBalancedComposition } from '@/lib/feeding-utils'
import type { BalancedMealComposition } from '@/types'

interface FeedingDayFormProps {
  date: string
  onDateChange: (date: string) => void
  milkServed: boolean
  porridgeServed: boolean
  balancedMealServed: boolean
  composition: BalancedMealComposition
  onMilkChange: (v: boolean) => void
  onPorridgeChange: (v: boolean) => void
  onBalancedChange: (v: boolean) => void
  onCompositionChange: (v: BalancedMealComposition) => void
  onSave: () => void
  error?: string
  /** When true, date field is shown read-only (edit from month grid). */
  dateLocked?: boolean
  /** Highlight incomplete food groups after a blocked save attempt. */
  showBalancedValidation?: boolean
}

export function FeedingDayForm({
  date,
  onDateChange,
  milkServed,
  porridgeServed,
  balancedMealServed,
  composition,
  onMilkChange,
  onPorridgeChange,
  onBalancedChange,
  onCompositionChange,
  onSave,
  error,
  dateLocked = false,
  showBalancedValidation = false,
}: FeedingDayFormProps) {
  return (
    <div className="space-y-4">
      <FormField label={caretaker.imirire.date}>
        <TextInput
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          disabled={dateLocked}
        />
      </FormField>
      <div className="space-y-2" role="group" aria-label={caretaker.imirire.dailyLog}>
        <SelectTile
          label={caretaker.imirire.milk}
          selected={milkServed}
          onChange={onMilkChange}
          icon={<Milk size={20} />}
        />
        <SelectTile
          label={caretaker.imirire.porridge}
          selected={porridgeServed}
          onChange={onPorridgeChange}
          icon={<Soup size={20} />}
        />
        <SelectTile
          label={caretaker.imirire.balancedMeal}
          selected={balancedMealServed}
          onChange={onBalancedChange}
          icon={<UtensilsCrossed size={20} />}
        />
      </div>
      {balancedMealServed && (
        <BalancedMealChecklist
          value={composition}
          onChange={onCompositionChange}
          showValidation={
            showBalancedValidation && !isBalancedComposition(composition)
          }
        />
      )}
      {error &&
        !(
          showBalancedValidation &&
          balancedMealServed &&
          !isBalancedComposition(composition)
        ) && (
          <p className="text-caption text-error font-semibold" role="alert">
            {error}
          </p>
        )}
      <Button variant="primary" size="md" className="w-full sm:w-auto" onClick={onSave}>
        {caretaker.imirire.saveDay}
      </Button>
    </div>
  )
}
