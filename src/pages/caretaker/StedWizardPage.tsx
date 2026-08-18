import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Stepper } from '@/components/ui/Stepper'
import { FormField } from '@/components/ui/FormField'
import { Alert } from '@/components/ui/Alert'
import { SelectTile } from '@/components/feeding/SelectTile'
import { ChildPicker } from '@/components/children/ChildPicker'
import { StedAgeRoutingStep } from '@/components/sted/StedAgeRoutingStep'
import { StedPhysicalStep } from '@/components/sted/StedPhysicalStep'
import { StedMilestonesStep } from '@/components/sted/StedMilestonesStep'
import { StedReviewStep } from '@/components/sted/StedReviewStep'
import { useAuth, useData } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import { findChildByRouteKey } from '@/lib/child-routes'
import { messageForMutationFailure } from '@/offline/mutation-error-message'
import { calculateAge } from '@/lib/mock-data'
import { resolveCenterId } from '@/lib/resolve-center-id'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import {
  getAssessmentDueStatus,
  getLatestAssessment,
  getLatestMeasurement,
  getTodayDate,
} from '@/lib/nutrition-utils'
import type { ChildPickerMeta } from '@/lib/child-picker'
import {
  buildDefaultOutcome,
  emptyPhysicalCheck,
  getChildrenDueForStedFollowUp,
  getEligibleStedChildren,
  getMilestoneCodes,
  getStedAgeBand,
  isPhysicalClear,
  markAllPhysicalNormal,
  setPhysicalPart,
} from '@/lib/sted-utils'
import type {
  StedAnswer,
  StedBodyPartStatus,
  StedPhysicalCheck,
  StedPhysicalPart,
} from '@/types'

const STEPS = [
  { title: caretaker.sted.stepChild },
  { title: caretaker.sted.stepConsent },
  { title: caretaker.sted.stepAgeRouting },
  { title: caretaker.sted.stepPhysical },
  { title: caretaker.sted.stepMilestones },
  { title: caretaker.sted.stepReview },
]

const STEP_CHILD = 1
const STEP_CONSENT = 2
const STEP_AGE_ROUTING = 3
const STEP_PHYSICAL = 4
const STEP_MILESTONES = 5
const STEP_REVIEW = 6

export function StedWizardPage() {
  const { user } = useAuth()
  const {
    children,
    createStedAssessment,
    growthMeasurements,
    nutritionAssessments,
    stedAssessments,
  } = useData()
  const { showSuccess, showError } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const centerId = resolveCenterId(user?.centerId)
  const eligible = useMemo(
    () =>
      centerId
        ? getEligibleStedChildren(
            children.filter((c) => c.status === 'active' && c.centerId === centerId),
          )
        : [],
    [children, centerId],
  )

  const dueFollowUpIds = useMemo(() => {
    if (!centerId) return new Set<string>()
    const due = getChildrenDueForStedFollowUp(
      children.filter((c) => c.status === 'active' && c.centerId === centerId),
      stedAssessments,
    )
    return new Set(due.map((d) => d.child.id))
  }, [children, centerId, stedAssessments])

  const getChildMeta = useMemo(() => {
    return (child: { id: string; dateOfBirth: string }): ChildPickerMeta => {
      const latest = getLatestMeasurement(growthMeasurements, child.id)
      const assessment = getLatestAssessment(nutritionAssessments, child.id)
      const dueStatus = getAssessmentDueStatus(latest?.date)
      return {
        lastGrowthDate: latest?.date,
        overdueGrowth: dueStatus === 'overdue' || dueStatus === 'never',
        atNutritionalRisk:
          assessment?.status === 'at_risk' ||
          assessment?.status === 'moderate' ||
          assessment?.status === 'severe',
        needsFollowUp: dueFollowUpIds.has(child.id),
        ageBand: getStedAgeBand(child.dateOfBirth),
      }
    }
  }, [growthMeasurements, nutritionAssessments, dueFollowUpIds])

  const initialChildId = useMemo(() => {
    const routeKey = searchParams.get('child') ?? searchParams.get('childId') ?? ''
    return eligible.find((child) => child.id === routeKey)?.id ?? findChildByRouteKey(eligible, routeKey)?.id ?? ''
  }, [eligible, searchParams])

  const [step, setStep] = useState(STEP_CHILD)
  const [childId, setChildId] = useState(initialChildId)
  const [consent, setConsent] = useState(false)
  const [physical, setPhysical] = useState<StedPhysicalCheck>(emptyPhysicalCheck())
  const [milestones, setMilestones] = useState<Record<string, StedAnswer>>({})
  const [milestonesShowIncomplete, setMilestonesShowIncomplete] = useState(false)

  const child = eligible.find((c) => c.id === childId)
  const ageBand = child ? getStedAgeBand(child.dateOfBirth) : null
  const noProblem = isPhysicalClear(physical)

  const milestonesComplete =
    !!ageBand &&
    getMilestoneCodes(ageBand).every(
      (code) => milestones[code] === 'yego' || milestones[code] === 'oya',
    )

  const handlePhysicalChange = (part: StedPhysicalPart, status: StedBodyPartStatus) => {
    setPhysical((prev) => setPhysicalPart(prev, part, status))
  }

  const goNext = () => {
    if (step === STEP_CHILD) {
      if (!childId) {
        showError(caretaker.sted.childRequired)
        return
      }
      if (!ageBand) {
        showError(caretaker.sted.ageNotEligible)
        return
      }
      setStep(STEP_CONSENT)
      return
    }
    if (step === STEP_CONSENT) {
      if (!consent) {
        showError(caretaker.sted.consentRequired)
        return
      }
      setStep(STEP_AGE_ROUTING)
      return
    }
    if (step === STEP_AGE_ROUTING) {
      setStep(STEP_PHYSICAL)
      return
    }
    if (step === STEP_PHYSICAL) {
      setStep(STEP_MILESTONES)
      return
    }
    if (step === STEP_MILESTONES) {
      if (!milestonesComplete) {
        setMilestonesShowIncomplete(true)
        showError(caretaker.sted.milestonesIncomplete)
        return
      }
      setMilestonesShowIncomplete(false)
      setStep(STEP_REVIEW)
    }
  }

  const handleSave = async () => {
    if (!child || !ageBand || !centerId) return
    if (!milestonesComplete) {
      setMilestonesShowIncomplete(true)
      showError(caretaker.sted.milestonesIncomplete)
      setStep(STEP_MILESTONES)
      return
    }

    const date = getTodayDate()
    const outcome = buildDefaultOutcome(physical, milestones, date)

    try {
      await createStedAssessment({
        childId: child.id,
        centerId,
        assessmentDate: date,
        ageBand,
        consentObtained: consent,
        physical,
        noProblem,
        milestones,
        outcome,
        assessedBy: user?.name,
        referralReason: outcome.referred ? caretaker.sted.referralReasonDefault : undefined,
        referralDestination: outcome.referred ? 'Ikigo nderabuzima' : undefined,
      })
      showSuccess(common.sync.savedOnDevice)
      navigate('/caretaker/sted')
    } catch (err) {
      showError(messageForMutationFailure(err))
    }
  }

  return (
    <CaretakerLayout backTo="/caretaker/sted" backLabel={caretaker.nav.sted}>
      {!centerId ? (
        <LiveUnavailableState
          title={common.live.missingCenterId}
          description={common.live.unavailableDesc}
        />
      ) : (
      <>
      <div className="space-y-5 pb-24 sm:pb-0">
        <div>
          <h1 className="text-heading text-text">{caretaker.sted.startAssessment}</h1>
          <p className="text-body text-text-secondary mt-1">{caretaker.sted.subtitle}</p>
        </div>

        <Stepper steps={STEPS} currentStep={step} />

        {child && step > STEP_CHILD && (
          <div
            className="rounded-xl border border-primary/20 bg-primary-light/35 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            role="status"
          >
            <div className="min-w-0">
              <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
                {caretaker.sted.assessingChild}
              </p>
              <p className="text-body font-semibold text-text truncate">{child.fullName}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-caption">
              <span className="rounded-full bg-surface border border-border px-2.5 py-1 font-medium text-text-secondary">
                {calculateAge(child.dateOfBirth)} {caretaker.sted.years}
              </span>
              {ageBand && (
                <span className="rounded-full bg-primary/15 text-primary px-2.5 py-1 font-semibold">
                  {ageBand === '1_3' ? caretaker.sted.ageBand1_3 : caretaker.sted.ageBand4_6}
                </span>
              )}
            </div>
          </div>
        )}

        <Card className="p-4 sm:p-6 space-y-5">
          <div className="border-b border-border pb-3">
            <p className="text-caption font-semibold uppercase tracking-wide text-primary">
              {common.ui.stepProgress
                .replace('{current}', String(step))
                .replace('{total}', String(STEPS.length))}
            </p>
            <h2 className="text-subheading text-text mt-1">{STEPS[step - 1]?.title}</h2>
          </div>

          {step === STEP_CHILD && (
            <div className="space-y-4">
              <FormField label={caretaker.sted.childName} required>
                <ChildPicker
                  childrenList={eligible}
                  value={childId}
                  onChange={(id) => {
                    setChildId(id)
                    setMilestones({})
                    setMilestonesShowIncomplete(false)
                  }}
                  placeholder={caretaker.sted.selectChild}
                  searchPlaceholder={caretaker.childPicker.searchPlaceholder}
                  recentScope={`sted:${centerId}`}
                  getMeta={getChildMeta}
                  availableFilters={[
                    'all',
                    'age_1_3',
                    'age_4_6',
                    'needs_follow_up',
                    'overdue_growth',
                    'at_nutritional_risk',
                  ]}
                  emptyMessage={caretaker.sted.ageNotEligible}
                  aria-label={caretaker.sted.selectChild}
                />
              </FormField>
              {child && !ageBand && (
                <Alert variant="error">{caretaker.sted.ageNotEligible}</Alert>
              )}
              {child && ageBand && (
                <Alert variant="success" icon={null}>
                  <p className="font-semibold text-text">{child.fullName}</p>
                  <p className="text-caption text-text-secondary mt-1">
                    {caretaker.sted.ageBand}:{' '}
                    <span className="font-semibold text-text">
                      {ageBand === '1_3' ? caretaker.sted.ageBand1_3 : caretaker.sted.ageBand4_6}
                    </span>
                    <span className="text-text-muted"> · {caretaker.sted.ageBandAuto}</span>
                  </p>
                </Alert>
              )}
            </div>
          )}

          {step === STEP_CONSENT && (
            <div className="space-y-3">
              <SelectTile
                label={caretaker.sted.consentLabel}
                selected={consent}
                onChange={setConsent}
                icon={<ShieldCheck size={20} />}
              />
              <p className="text-caption text-text-secondary">{caretaker.sted.consentRequired}</p>
            </div>
          )}

          {step === STEP_AGE_ROUTING && ageBand && (
            <StedAgeRoutingStep ageBand={ageBand} />
          )}

          {step === STEP_PHYSICAL && (
            <StedPhysicalStep
              physical={physical}
              onChange={handlePhysicalChange}
              onMarkAllNormal={() => setPhysical(markAllPhysicalNormal())}
              noProblem={noProblem}
            />
          )}

          {step === STEP_MILESTONES && ageBand && (
            <StedMilestonesStep
              ageBand={ageBand}
              milestones={milestones}
              showIncomplete={milestonesShowIncomplete}
              onChange={(code, answer) =>
                setMilestones((prev) => ({
                  ...prev,
                  [code]: answer,
                }))
              }
            />
          )}

          {step === STEP_REVIEW && child && ageBand && (
            <StedReviewStep
              child={child}
              ageBand={ageBand}
              physical={physical}
              milestones={milestones}
              onEditPhysical={() => setStep(STEP_PHYSICAL)}
              onEditMilestones={() => setStep(STEP_MILESTONES)}
            />
          )}

          <div className="hidden sm:flex flex-wrap gap-2 pt-2 border-t border-border">
            {step > STEP_CHILD && (
              <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
                {common.back}
              </Button>
            )}
            {step < STEP_REVIEW ? (
              <Button variant="primary" onClick={goNext}>
                {common.next}
              </Button>
            ) : (
              <Button variant="primary" onClick={handleSave}>
                {caretaker.sted.submitAssessment}
              </Button>
            )}
          </div>
        </Card>
      </div>

      <div className="sm:hidden fixed bottom-[4.5rem] inset-x-0 z-30 border-t border-border bg-surface/95 backdrop-blur-sm px-3 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="max-w-7xl mx-auto flex gap-2">
          {step > STEP_CHILD && (
            <Button variant="secondary" className="flex-1" onClick={() => setStep((s) => s - 1)}>
              {common.back}
            </Button>
          )}
          {step < STEP_REVIEW ? (
            <Button variant="primary" className="flex-[1.4]" onClick={goNext}>
              {common.next}
            </Button>
          ) : (
            <Button variant="primary" className="flex-[1.4]" onClick={handleSave}>
              {caretaker.sted.submitAssessment}
            </Button>
          )}
        </div>
      </div>
      </>
      )}
    </CaretakerLayout>
  )
}
