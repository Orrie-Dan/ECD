import { useState, useSyncExternalStore } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChildFormWizard } from '@/components/children/ChildFormWizard'
import { useData } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { useChildDetail } from '@/features/children'
import { env } from '@/config/env'
import { caretaker } from '@/locales/rw/caretaker'
import { common, messages } from '@/locales/rw/common'
import { messageForMutationFailure } from '@/offline/mutation-error-message'
import { networkState } from '@/network/network-state'
import {
  applyLocationCascade,
  childToForm,
  firstChildFormStepWithErrors,
  formToChildPayload,
  validateChildFormStep,
} from '@/lib/child-form'
import type { ChildRegistrationForm } from '@/types'
import { SkeletonCard } from '@/components/ui/Skeleton'
import {
  buildChildDetailPath,
  findChildByRouteKey,
  isUuidLike,
} from '@/lib/child-routes'

export function EditChildPage() {
  const { id: routeKey } = useParams<{ id: string }>()
  const { children, childrenLoading, updateChild } = useData()
  const childFromList = findChildByRouteKey(children, routeKey)
  const childId = childFromList?.id ?? (isUuidLike(routeKey) ? routeKey : undefined)
  const detailQuery = useChildDetail(childId, env.isLive && !!childId)
  const child = env.isLive ? (detailQuery.data ?? childFromList) : childFromList
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const isOnline = useSyncExternalStore(
    (onStoreChange) => networkState.subscribe(() => onStoreChange()),
    () => networkState.getSnapshot().isOnline,
    () => true,
  )
  const lockDemographics = env.isLive && !isOnline

  const [step, setStep] = useState(1)
  const [form, setForm] = useState<ChildRegistrationForm | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof ChildRegistrationForm, string>>>({})
  const [submitting, setSubmitting] = useState(false)

  if (env.isLive && (childrenLoading || detailQuery.isLoading) && !child) {
    return (
      <CaretakerLayout
        pageTitle={caretaker.registration.editTitle}
        backTo="/caretaker/abana"
        backLabel={common.back}
      >
        <SkeletonCard lines={6} />
      </CaretakerLayout>
    )
  }

  if (!child) {
    return (
      <CaretakerLayout
        pageTitle={caretaker.registration.editTitle}
        backTo="/caretaker/abana"
        backLabel={common.back}
      >
        <EmptyState title={caretaker.childDetail.notFound} description={caretaker.childDetail.notFoundDesc} />
      </CaretakerLayout>
    )
  }

  const activeForm = form ?? childToForm(child)

  const updateField = <K extends keyof ChildRegistrationForm>(key: K, value: ChildRegistrationForm[K]) => {
    if (
      lockDemographics &&
      (key === 'dateOfBirth' ||
        key === 'gender' ||
        key === 'province' ||
        key === 'district' ||
        key === 'sector' ||
        key === 'cell' ||
        key === 'village')
    ) {
      return
    }
    setForm((prev) => applyLocationCascade(prev ?? childToForm(child), key, value))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const handleNext = () => {
    const newErrors = validateChildFormStep(activeForm, step)
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      showError(messages.formIncomplete)
      return
    }
    if (step < 4) setStep(step + 1)
  }

  const handleSubmit = async () => {
    const newErrors = {
      ...validateChildFormStep(activeForm, 1),
      ...validateChildFormStep(activeForm, 2),
      ...validateChildFormStep(activeForm, 3),
    }
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      const errorStep = firstChildFormStepWithErrors(activeForm)
      if (errorStep) setStep(errorStep)
      showError(messages.formIncomplete)
      return
    }

    setSubmitting(true)
    try {
      await updateChild(child.id, {
        ...formToChildPayload(activeForm),
        _form: activeForm,
      })
      // Local-first offline saves → saved on device; online REST demographics → childUpdated.
      showSuccess(
        env.isLive && !isOnline ? common.sync.savedOnDevice : messages.childUpdated,
      )
      navigate(buildChildDetailPath('/caretaker/abana', child))
    } catch (err) {
      showError(messageForMutationFailure(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CaretakerLayout
      pageTitle={caretaker.registration.editTitle}
      backTo={buildChildDetailPath('/caretaker/abana', child)}
      backLabel={common.back}
    >
      <ChildFormWizard
        step={step}
        form={activeForm}
        errors={errors}
        onUpdateField={updateField}
        onBack={() => setStep(step - 1)}
        onNext={handleNext}
        onSubmit={() => {
          void handleSubmit()
        }}
        submitLabel={submitting ? '…' : caretaker.registration.submit}
        lockDemographics={lockDemographics}
      />
    </CaretakerLayout>
  )
}
