import { AlertTriangle, Check } from 'lucide-react'
import { FormField, TextInput, TextArea } from '@/components/ui/FormField'
import { caretaker } from '@/locales/rw/caretaker'
import { formatDate } from '@/lib/mock-data'
import type { StedOutcome } from '@/types'
import type { ReactNode } from 'react'

interface StedOutcomeStepProps {
  outcome: StedOutcome
  referralSuggested: boolean
  referralReason: string
  referralDestination: string
  onChange: (next: StedOutcome) => void
  onReferralReasonChange: (v: string) => void
  onReferralDestinationChange: (v: string) => void
}

function CheckRow({
  label,
  checked,
  onChange,
  accent = 'default',
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  accent?: 'default' | 'success' | 'warning'
}) {
  const accentClass =
    accent === 'success'
      ? checked
        ? 'border-success/40 bg-success-light/30'
        : 'border-border'
      : accent === 'warning'
        ? checked
          ? 'border-warning/40 bg-warning-light/30'
          : 'border-border'
        : checked
          ? 'border-primary/30 bg-primary-light/25'
          : 'border-border'

  return (
    <label
      className={`flex items-center gap-3 rounded-xl border p-4 min-h-14 cursor-pointer transition-colors hover:bg-background-subtle/50 ${accentClass}`}
    >
      <span className="relative shrink-0">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-primary peer-focus-visible:outline-offset-2 ${
            checked ? 'border-primary bg-primary text-white' : 'border-border bg-surface'
          }`}
          aria-hidden
        >
          {checked && <Check size={14} strokeWidth={3} />}
        </span>
      </span>
      <span className="text-body font-medium text-text">{label}</span>
    </label>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-caption font-semibold uppercase tracking-wide text-text-muted pt-1">
      {children}
    </p>
  )
}

export function StedOutcomeStep({
  outcome,
  referralSuggested,
  referralReason,
  referralDestination,
  onChange,
  onReferralReasonChange,
  onReferralDestinationChange,
}: StedOutcomeStepProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-subheading text-text">{caretaker.sted.stepOutcome}</h2>
      </div>

      {referralSuggested && (
        <div
          className="flex items-start gap-3 rounded-xl border border-warning/35 bg-warning-light/40 px-4 py-3"
          role="status"
        >
          <AlertTriangle size={20} className="text-warning shrink-0 mt-0.5" aria-hidden />
          <p className="text-body font-semibold text-warning">
            {caretaker.sted.referralSuggested}
          </p>
        </div>
      )}

      <SectionLabel>{caretaker.sted.outcomeDecisionTaken}</SectionLabel>
      <CheckRow
        label={caretaker.sted.outcomeNormal}
        checked={outcome.normal}
        accent="success"
        onChange={(v) =>
          onChange({
            ...outcome,
            normal: v,
            referred: v ? false : outcome.referred,
          })
        }
      />
      <CheckRow
        label={caretaker.sted.outcomeReferred}
        checked={outcome.referred}
        accent="warning"
        onChange={(v) =>
          onChange({
            ...outcome,
            referred: v,
            normal: v ? false : outcome.normal,
          })
        }
      />
      <CheckRow
        label={caretaker.sted.outcomeCounseling}
        checked={outcome.counseling}
        onChange={(v) => onChange({ ...outcome, counseling: v })}
      />
      <CheckRow
        label={caretaker.sted.outcomeOther}
        checked={outcome.other}
        onChange={(v) => onChange({ ...outcome, other: v })}
      />
      {outcome.other && (
        <FormField label={caretaker.sted.outcomeOther}>
          <TextInput
            value={outcome.otherText ?? ''}
            placeholder={caretaker.sted.outcomeOtherPlaceholder}
            onChange={(e) => onChange({ ...outcome, otherText: e.target.value })}
          />
        </FormField>
      )}

      {outcome.referred && (
        <div className="space-y-3 rounded-xl border border-warning/40 bg-warning-light/25 p-4">
          <div>
            <p className="text-label text-text">{caretaker.sted.referralCreateTitle}</p>
            <p className="text-caption text-text-secondary mt-0.5">
              {caretaker.sted.referralCreateHint}
            </p>
          </div>
          <FormField label={caretaker.sted.referralReason} required>
            <TextArea
              value={referralReason}
              onChange={(e) => onReferralReasonChange(e.target.value)}
              rows={2}
              placeholder={caretaker.sted.referralReasonPlaceholder}
            />
          </FormField>
          <FormField label={caretaker.sted.referralDestination} required>
            <TextInput
              value={referralDestination}
              onChange={(e) => onReferralDestinationChange(e.target.value)}
              placeholder={caretaker.sted.referralDestinationPlaceholder}
            />
          </FormField>
        </div>
      )}

      <SectionLabel>{caretaker.sted.outcomeFollowUp}</SectionLabel>
      <CheckRow
        label={caretaker.sted.outcomeFollowUp}
        checked={outcome.followUpIn6Months}
        onChange={(v) => onChange({ ...outcome, followUpIn6Months: v })}
      />
      {outcome.followUpDueDate && (
        <p className="text-caption text-text-secondary rounded-lg bg-background-subtle px-3 py-2">
          {caretaker.sted.nextFollowUp}:{' '}
          <span className="font-semibold text-text">
            {formatDate(outcome.followUpDueDate)}
          </span>
        </p>
      )}
    </div>
  )
}
