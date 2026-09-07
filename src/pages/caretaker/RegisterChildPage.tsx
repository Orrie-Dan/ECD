import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { ChildFormWizard } from '@/components/children/ChildFormWizard'
import { useAuth, useData } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { caretaker } from '@/locales/rw/caretaker'
import { messages } from '@/locales/rw/common'
import { messageForMutationFailure } from '@/offline/mutation-error-message'
import {
  EMPTY_CHILD_FORM,
  applyLocationCascade,
  formToChildPayload,
  firstChildFormStepWithErrors,
  validateChildForm,
  validateChildFormStep,
} from '@/lib/child-form'
import { env } from '@/config/env'
import { productionMockWriteBlockedMessage } from '@/lib/live-api-guard'
import { getLocalStore } from '@/storage'
import { getChildCreateOutboxStatus } from '@/features/children/local-children'
import type { ChildRegistrationForm } from '@/types'

export function RegisterChildPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<ChildRegistrationForm>(EMPTY_CHILD_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof ChildRegistrationForm, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const { user } = useAuth()
  const { addChild } = useData()
  const { showSuccess, showError } = useToast()
  const navigate = useNavigate()

  const updateField = <K extends keyof ChildRegistrationForm>(key: K, value: ChildRegistrationForm[K]) => {
    setForm((prev) => applyLocationCascade(prev, key, value))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const handleNext = () => {
    const newErrors = validateChildFormStep(form, step)
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      showError(messages.formIncomplete)
      return
    }
    if (step < 4) setStep(step + 1)
  }

  const handleSubmit = async () => {
    if (env.isProductionMock) {
      showError(productionMockWriteBlockedMessage)
      return
    }

    const newErrors = validateChildForm(form)
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      const errorStep = firstChildFormStepWithErrors(form)
      if (errorStep) setStep(errorStep)
      showError(messages.formIncomplete)
      return
    }

    if (env.isLive && !user?.centerId) {
      showError(messages.childRegisterNoCenter)
      return
    }

    setSubmitting(true)
    try {
      const created = await addChild({
        ...formToChildPayload(form),
        centerId: user?.centerId,
        centerName: user?.centerName,
        _form: form,
      })
      if (env.isLive) {
        const outboxStatus = await getChildCreateOutboxStatus(getLocalStore(), created.id)
        if (outboxStatus === 'blocked') {
          showError(messages.childRegisteredVillageBlocked)
        } else {
          showSuccess(
            outboxStatus === 'pending'
              ? messages.childRegisteredLocal
              : messages.childRegistered,
          )
        }
      } else {
        showSuccess(messages.childRegistered)
      }
      navigate('/caretaker/abana')
    } catch (err) {
      showError(messageForMutationFailure(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CaretakerLayout pageTitle={caretaker.registration.title}>
      <ChildFormWizard
        step={step}
        form={form}
        errors={errors}
        onUpdateField={updateField}
        onBack={() => setStep(step - 1)}
        onNext={handleNext}
        onSubmit={() => {
          void handleSubmit()
        }}
        submitLabel={submitting ? '…' : caretaker.registration.submit}
      />
    </CaretakerLayout>
  )
}
