import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FormField, SelectInput } from '@/components/ui/FormField'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Stepper } from '@/components/ui/Stepper'
import { SelfEvalSectionForm } from '@/components/self-evaluation/SelfEvalSectionForm'
import { SelfEvalScoreSummary } from '@/components/self-evaluation/SelfEvalScoreSummary'
import { useAuth } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import { env } from '@/config/env'
import { bilingualPrimary, splitBilingualText } from '@/lib/self-eval-text'
import { resolveCenterId } from '@/lib/resolve-center-id'
import { getTodayDate } from '@/lib/nutrition-utils'
import {
  createDraftId,
  loadSelfEvalDraft,
  saveSelfEvalDraft,
} from '@/features/self-evaluation/draft-storage'
import { facilityTypeLabel } from '@/features/self-evaluation/facility-labels'
import {
  loadChecklistCatalog,
  scoreSelfEvaluation,
} from '@/features/self-evaluation/scoring'
import { submitLocalSelfEvalDraft } from '@/features/self-evaluation/submit-draft'
import type { SelfEvalItemAnswers } from '@/features/self-evaluation/types'

export function SelfEvalWizardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const centerId = resolveCenterId(user?.centerId) ?? ''
  const catalog = useMemo(() => loadChecklistCatalog(), [])

  const existingDraft = useMemo(
    () => (centerId ? loadSelfEvalDraft(centerId) : null),
    [centerId],
  )

  const [facilityTypeId, setFacilityTypeId] = useState(
    () => existingDraft?.facilityTypeId ?? '',
  )
  const [assessmentDate, setAssessmentDate] = useState(
    () => existingDraft?.assessmentDate ?? getTodayDate(),
  )
  const [answers, setAnswers] = useState<SelfEvalItemAnswers>(
    () => existingDraft?.answers ?? {},
  )
  const [sectionIndex, setSectionIndex] = useState(() =>
    existingDraft?.facilityTypeId ? 0 : -1,
  )
  const [submitting, setSubmitting] = useState(false)

  const checklist = useMemo(
    () => catalog.facilityTypes.find((f) => f.id === facilityTypeId) ?? null,
    [catalog.facilityTypes, facilityTypeId],
  )

  const steps = useMemo(() => {
    if (!checklist) {
      return [{ title: caretaker.selfEval.stepSetup }]
    }
    return [
      { title: caretaker.selfEval.stepSetup },
      ...checklist.sections.map((section, index) => ({
        title: caretaker.selfEval.sectionStep.replace('{n}', String(index + 1)),
        description: bilingualPrimary(section.title),
      })),
      { title: caretaker.selfEval.stepReview },
    ]
  }, [checklist])

  const inSetup = sectionIndex < 0
  const currentStep = inSetup ? 1 : sectionIndex + 2
  const isReview = checklist != null && sectionIndex >= checklist.sections.length
  const isSectionStep =
    checklist != null && sectionIndex >= 0 && sectionIndex < checklist.sections.length

  const liveScore = useMemo(() => {
    if (!checklist) return null
    return scoreSelfEvaluation(checklist, answers, catalog.ranks)
  }, [answers, catalog.ranks, checklist])

  const facilityOptions = catalog.facilityTypes.map((f) => ({
    value: f.id,
    label: facilityTypeLabel(f.id),
  }))

  const draftId = existingDraft?.id ?? createDraftId()

  const persistDraft = () => {
    if (!centerId || !facilityTypeId) return
    saveSelfEvalDraft({
      id: draftId,
      centerId,
      facilityTypeId,
      assessmentDate,
      answers,
      updatedAt: new Date().toISOString(),
    })
  }

  const handleNext = () => {
    if (!checklist) return
    persistDraft()
    setSectionIndex((prev) => Math.min(prev + 1, checklist.sections.length))
  }

  const handleBack = () => {
    if (sectionIndex <= 0) {
      setSectionIndex(-1)
      return
    }
    setSectionIndex((prev) => prev - 1)
  }

  const handleStart = () => {
    if (!facilityTypeId) return
    setSectionIndex(0)
  }

  const handleSaveDraft = () => {
    persistDraft()
    showSuccess(caretaker.selfEval.savedDraft)
    navigate('/caretaker/isuzuma')
  }

  const handleSubmit = async () => {
    if (!checklist || !liveScore || !centerId) return
    persistDraft()

    if (!env.isLive) {
      showError(caretaker.selfEval.submitRequiresLive)
      return
    }

    setSubmitting(true)
    try {
      await submitLocalSelfEvalDraft({
        draft: {
          id: draftId,
          centerId,
          facilityTypeId,
          assessmentDate,
          answers,
          updatedAt: new Date().toISOString(),
        },
        score: liveScore,
        standardsVersion: checklist.version,
      })
      showSuccess(caretaker.selfEval.submittedSuccess)
      navigate('/caretaker/isuzuma')
    } catch {
      showError(caretaker.selfEval.submitError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CaretakerLayout>
      <PageContainer>
        <PageHeader
          title={caretaker.selfEval.wizardTitle}
          description={caretaker.selfEval.wizardSubtitle}
        />
        <PageContent>
          <Stepper steps={steps} currentStep={currentStep} />

          {inSetup && (
            <Card className="space-y-4 p-4">
              <FormField label={caretaker.selfEval.facilityTypeLabel}>
                <SelectInput
                  value={facilityTypeId}
                  onChange={(e) => setFacilityTypeId(e.target.value)}
                  placeholder={caretaker.selfEval.chooseFacilityType}
                >
                  {facilityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
              <FormField label={caretaker.selfEval.assessmentDateLabel}>
                <input
                  type="date"
                  className="input-field w-full"
                  value={assessmentDate}
                  onChange={(e) => setAssessmentDate(e.target.value)}
                />
              </FormField>
              <p className="text-caption text-text-muted">{caretaker.selfEval.setupHint}</p>
              <Button onClick={handleStart} disabled={!facilityTypeId}>
                {caretaker.selfEval.beginChecklist}
              </Button>
            </Card>
          )}

          {isSectionStep && checklist && (
            <div className="space-y-4">
              <Card className="p-4">
                {(() => {
                  const sectionLabels = splitBilingualText(
                    checklist.sections[sectionIndex].title,
                  )
                  return (
                    <>
                      {sectionLabels.rw && (
                        <p className="text-title font-semibold">{sectionLabels.rw}</p>
                      )}
                      {sectionLabels.en && sectionLabels.en !== sectionLabels.rw && (
                        <p className="text-caption text-text-muted mt-1">{sectionLabels.en}</p>
                      )}
                    </>
                  )
                })()}
                <p className="text-caption text-text-muted mt-2">
                  {caretaker.selfEval.sectionProgress
                    .replace('{current}', String(sectionIndex + 1))
                    .replace('{total}', String(checklist.sections.length))}
                </p>
              </Card>
              <SelfEvalSectionForm
                items={checklist.sections[sectionIndex].items}
                answers={answers}
                onChange={setAnswers}
              />
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="secondary" onClick={handleBack}>
                  {common.back}
                </Button>
                <Button onClick={handleNext}>{common.next}</Button>
              </div>
            </div>
          )}

          {isReview && liveScore && (
            <div className="space-y-4">
              <SelfEvalScoreSummary score={liveScore} />
              <Card className="p-4 space-y-2">
                <p className="text-body text-text">{caretaker.selfEval.reviewHint}</p>
                <p className="text-caption text-text-muted">{caretaker.selfEval.apiHint}</p>
              </Card>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={handleBack} disabled={submitting}>
                  {common.back}
                </Button>
                <Button variant="secondary" onClick={handleSaveDraft} disabled={submitting}>
                  {caretaker.selfEval.saveDraft}
                </Button>
                <Button onClick={() => void handleSubmit()} disabled={submitting}>
                  {submitting
                    ? caretaker.selfEval.submitting
                    : caretaker.selfEval.submitToServer}
                </Button>
              </div>
            </div>
          )}
        </PageContent>
      </PageContainer>
    </CaretakerLayout>
  )
}
