import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormField, RadioGroup } from '@/components/ui/FormField'
import { StatusBadge } from '@/components/children/StatusBadge'
import { useData } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { resolveClassroomIdForGrade } from '@/api/resources/classrooms'
import { calculateAge } from '@/lib/mock-data'
import { GRADE_FILTER_OPTIONS } from '@/lib/child-filters'
import { caretaker } from '@/locales/rw/caretaker'
import { common, messages, gender } from '@/locales/rw/common'
import { messageForMutationFailure } from '@/offline/mutation-error-message'
import { networkState } from '@/network/network-state'
import type { Child, ClassroomGrade } from '@/types'

interface AssignClassroomDialogProps {
  open: boolean
  onClose: () => void
  child: Child
}

const GRADE_OPTIONS = GRADE_FILTER_OPTIONS.filter((o) => o.value !== 'all') as {
  value: ClassroomGrade
  label: string
}[]

export function AssignClassroomDialog({ open, onClose, child }: AssignClassroomDialogProps) {
  const { updateChild } = useData()
  const { showSuccess, showError } = useToast()
  const [grade, setGrade] = useState<ClassroomGrade | ''>(child.classroomGrade ?? '')
  const [error, setError] = useState<string | undefined>()
  const [submitting, setSubmitting] = useState(false)

  const handleClose = () => {
    setGrade(child.classroomGrade ?? '')
    setError(undefined)
    onClose()
  }

  const handleSubmit = async () => {
    if (!grade) {
      setError(common.required)
      return
    }
    if (networkState.getSnapshot().status === 'OFFLINE') {
      showError(common.sync.requiresInternetTitle)
      return
    }

    setSubmitting(true)
    try {
      const classroomId = await resolveClassroomIdForGrade(child.centerId, grade)
      if (!classroomId) {
        showError(messages.mutationFailed)
        return
      }
      await updateChild(child.id, { classroomGrade: grade, classroomId })
      showSuccess(caretaker.classrooms.assignSuccess)
      handleClose()
    } catch (err) {
      showError(messageForMutationFailure(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={caretaker.classrooms.assignClassroom}
      size="md"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Button variant="tertiary" onClick={handleClose} fullWidth className="sm:w-auto">
            {common.cancel}
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleSubmit()}
            fullWidth
            className="sm:w-auto"
            loading={submitting}
          >
            {caretaker.classrooms.assignConfirm}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-border bg-background-subtle/60 p-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-subheading text-text">{child.fullName}</p>
            <StatusBadge status={child.status} />
          </div>
          <p className="text-body text-text-secondary">
            {caretaker.children.age}: {calculateAge(child.dateOfBirth)} · {gender[child.gender]}
          </p>
        </div>

        <FormField label={caretaker.classrooms.schoolGradeLabel} required error={error}>
          <RadioGroup
            name="assign-classroom-grade"
            value={grade}
            onChange={(v) => {
              setGrade(v as ClassroomGrade)
              setError(undefined)
            }}
            options={GRADE_OPTIONS}
            error={!!error}
          />
        </FormField>
      </div>
    </Modal>
  )
}
