import { Check, Milk, Soup, UtensilsCrossed } from 'lucide-react'
import { FormField, TextInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { BalancedMealChecklist } from '@/components/feeding/BalancedMealChecklist'
import { caretaker } from '@/locales/rw/caretaker'
import { isBalancedComposition } from '@/lib/feeding-utils'
import type { BalancedMealComposition } from '@/types'
import type { ReactNode } from 'react'

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

function ToggleRow({
  label,
  checked,
  onChange,
  icon,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  icon: ReactNode
}) {
  return (
    <label
      className={`flex items-center justify-between gap-3 rounded-xl border p-4 min-h-[3.5rem] cursor-pointer transition-colors ${
        checked
          ? 'border-success/40 bg-success-light/30'
          : 'border-border bg-surface hover:bg-background-subtle/80'
      }`}
    >
      <span className="flex items-center gap-3 min-w-0">
        <span
          className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${
            checked ? 'bg-success-light text-success' : 'bg-background-subtle text-text-muted'
          }`}
          aria-hidden
        >
          {icon}
        </span>
        <span className="text-body font-semibold text-text">{label}</span>
      </span>
      <span className="inline-flex items-center gap-2 shrink-0">
        {checked && (
          <Check size={16} className="text-success" strokeWidth={2.5} aria-hidden />
        )}
        <input
          type="checkbox"
          className="h-6 w-6 accent-primary touch-target"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
      </span>
    </label>
  )
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
      <ToggleRow
        label={caretaker.imirire.milk}
        checked={milkServed}
        onChange={onMilkChange}
        icon={<Milk size={20} />}
      />
      <ToggleRow
        label={caretaker.imirire.porridge}
        checked={porridgeServed}
        onChange={onPorridgeChange}
        icon={<Soup size={20} />}
      />
      <ToggleRow
        label={caretaker.imirire.balancedMeal}
        checked={balancedMealServed}
        onChange={onBalancedChange}
        icon={<UtensilsCrossed size={20} />}
      />
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
