import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { FormField, TextArea } from '@/components/ui/FormField'
import { caretaker } from '@/locales/rw/caretaker'
import { formatDate } from '@/lib/mock-data'
import { getTodayDate } from '@/lib/nutrition-utils'
import { isReferralFollowUpOverdue } from '@/lib/referral-utils'
import type { Child, Referral } from '@/types'

interface ReferralCardProps {
  referral: Referral
  child?: Child
  onMarkImplemented?: () => void
  onCompleteFollowUp?: (notes?: string) => void
  onSaveNotes?: (notes: string) => void
}

export function ReferralCard({
  referral,
  child,
  onMarkImplemented,
  onCompleteFollowUp,
  onSaveNotes,
}: ReferralCardProps) {
  const [notesOpen, setNotesOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [notesDraft, setNotesDraft] = useState(referral.notes ?? '')

  const statusLabel =
    referral.status === 'pending'
      ? caretaker.referral.pending
      : referral.status === 'completed'
        ? caretaker.referral.completed
        : caretaker.referral.cancelled

  const isPending = referral.status === 'pending'
  const isImplemented = !!referral.implementedAt
  const canAct = !!(onMarkImplemented || onCompleteFollowUp || onSaveNotes)
  const overdue = isPending && isReferralFollowUpOverdue(referral)
  const sourceLabel =
    referral.sourceType === 'sted'
      ? caretaker.referral.sourceSted
      : caretaker.referral.sourceNutrition

  return (
    <>
      <Card
        className={`p-4 space-y-4 border-l-4 ${
          overdue
            ? 'border-l-error bg-error-light/15'
            : referral.status === 'completed'
              ? 'border-l-success'
              : referral.status === 'pending'
                ? 'border-l-warning'
                : 'border-l-border'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
              {caretaker.referral.child}
            </p>
            <p className="text-body font-semibold text-text truncate">
              {child?.fullName ?? referral.childId}
            </p>
            <p className="text-caption text-text-secondary">{sourceLabel}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption font-semibold ${
                overdue
                  ? 'bg-error-light text-error'
                  : referral.status === 'pending'
                    ? 'bg-warning-light text-warning'
                    : referral.status === 'completed'
                      ? 'bg-success-light text-success'
                      : 'bg-background-subtle text-text-secondary'
              }`}
              role="status"
            >
              {overdue ? (
                <AlertTriangle size={12} aria-hidden />
              ) : referral.status === 'completed' ? (
                <CheckCircle2 size={12} aria-hidden />
              ) : (
                <Clock size={12} aria-hidden />
              )}
              {overdue ? caretaker.referral.overdue : statusLabel}
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
              {caretaker.referral.reason}
            </p>
            <p className="text-body text-text mt-0.5">{referral.reason}</p>
          </div>
          <div>
            <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
              {caretaker.referral.dateCreated}
            </p>
            <p className="text-body text-text mt-0.5">{formatDate(referral.date)}</p>
          </div>
          <div>
            <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
              {caretaker.referral.destination}
            </p>
            <p className="text-body text-text mt-0.5">{referral.destination}</p>
          </div>
          <div>
            <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
              {caretaker.referral.status}
            </p>
            <p className="text-body text-text mt-0.5">{statusLabel}</p>
          </div>
        </div>

        {overdue && (
          <p className="rounded-lg bg-error-light/50 px-3 py-2 text-caption font-semibold text-error">
            {caretaker.referral.overdueHint}
          </p>
        )}

        {referral.implementedAt && (
          <p className="text-caption text-text-secondary">
            <span className="font-medium text-text">{caretaker.referral.implementedAt}:</span>{' '}
            {formatDate(referral.implementedAt)}
          </p>
        )}
        {referral.notes && (
          <p className="text-caption text-text-secondary border-t border-border pt-3">
            <span className="font-medium text-text">{caretaker.referral.notes}:</span>{' '}
            {referral.notes}
          </p>
        )}

        {isPending && canAct && (
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-1 border-t border-border">
            {!isImplemented && onMarkImplemented && (
              <Button variant="secondary" size="sm" onClick={onMarkImplemented} className="w-full sm:w-auto">
                {caretaker.referral.markImplemented}
              </Button>
            )}
            {onSaveNotes && (
              <Button
                variant="tertiary"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => {
                  setNotesDraft(referral.notes ?? '')
                  setNotesOpen(true)
                }}
              >
                {caretaker.referral.addNotes}
              </Button>
            )}
            {onCompleteFollowUp && (
              <Button
                variant="primary"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => {
                  setNotesDraft(referral.notes ?? '')
                  setCompleteOpen(true)
                }}
              >
                {caretaker.referral.completeFollowUp}
              </Button>
            )}
          </div>
        )}

        {!isPending && onSaveNotes && (
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => {
              setNotesDraft(referral.notes ?? '')
              setNotesOpen(true)
            }}
          >
            {caretaker.referral.addNotes}
          </Button>
        )}
      </Card>

      <Modal
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        title={caretaker.referral.addNotes}
        size="sm"
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <Button variant="tertiary" onClick={() => setNotesOpen(false)}>
              {caretaker.attendance.close}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onSaveNotes?.(notesDraft.trim())
                setNotesOpen(false)
              }}
            >
              {caretaker.referral.saveNotes}
            </Button>
          </div>
        }
      >
        <FormField label={caretaker.referral.notes}>
          <TextArea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            rows={4}
            placeholder={caretaker.referral.notesPlaceholder}
          />
        </FormField>
      </Modal>

      <Modal
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        title={caretaker.referral.completeFollowUp}
        size="sm"
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <Button variant="tertiary" onClick={() => setCompleteOpen(false)}>
              {caretaker.attendance.close}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onCompleteFollowUp?.(notesDraft.trim() || undefined)
                setCompleteOpen(false)
              }}
            >
              {caretaker.referral.completeFollowUp}
            </Button>
          </div>
        }
      >
        <p className="text-body text-text-secondary mb-4">
          {caretaker.referral.completeFollowUpHint}
        </p>
        <FormField label={caretaker.referral.notes}>
          <TextArea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            rows={3}
            placeholder={caretaker.referral.notesPlaceholder}
          />
        </FormField>
        <p className="text-caption text-text-muted mt-2">
          {caretaker.referral.implementedAt}: {formatDate(referral.implementedAt ?? getTodayDate())}
        </p>
      </Modal>
    </>
  )
}
