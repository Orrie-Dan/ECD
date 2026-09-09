import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, PlayCircle } from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { ActionCard, Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { SelfEvalScoreSummary } from '@/components/self-evaluation/SelfEvalScoreSummary'
import { useAuth } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { caretaker } from '@/locales/rw/caretaker'
import { env } from '@/config/env'
import { resolveCenterId } from '@/lib/resolve-center-id'
import { clearSelfEvalDraft, loadSelfEvalDraft } from '@/features/self-evaluation/draft-storage'
import { facilityTypeLabel } from '@/features/self-evaluation/facility-labels'
import {
  loadChecklistCatalog,
  RANK_CHART_COLORS,
  RANK_COLORS,
  scoreSelfEvaluation,
} from '@/features/self-evaluation/scoring'
import { submitLocalSelfEvalDraft } from '@/features/self-evaluation/submit-draft'

export function SelfEvalPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const centerId = resolveCenterId(user?.centerId)
  const catalog = useMemo(() => loadChecklistCatalog(), [])
  const [draftTick, setDraftTick] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const draft = useMemo(() => {
    void draftTick
    return centerId ? loadSelfEvalDraft(centerId) : null
  }, [centerId, draftTick])

  const draftScore = useMemo(() => {
    if (!draft) return null
    const checklist = catalog.facilityTypes.find((f) => f.id === draft.facilityTypeId)
    if (!checklist) return null
    return scoreSelfEvaluation(checklist, draft.answers, catalog.ranks)
  }, [catalog, draft])

  const handleClearDraft = () => {
    if (!centerId) return
    clearSelfEvalDraft(centerId)
    setDraftTick((n) => n + 1)
  }

  const handleSubmitDraft = async () => {
    if (!draft || !draftScore) return
    const checklist = catalog.facilityTypes.find((f) => f.id === draft.facilityTypeId)
    if (!checklist) return

    if (!env.isLive) {
      showError(caretaker.selfEval.submitRequiresLive)
      return
    }

    setSubmitting(true)
    try {
      await submitLocalSelfEvalDraft({
        draft,
        score: draftScore,
        standardsVersion: checklist.version,
      })
      showSuccess(caretaker.selfEval.submittedSuccess)
      setDraftTick((n) => n + 1)
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
          title={caretaker.selfEval.title}
          description={caretaker.selfEval.subtitle}
        />
        <PageContent className="space-y-4">
          <ActionCard
            icon={<PlayCircle size={24} strokeWidth={2.25} aria-hidden="true" />}
            title={caretaker.selfEval.startTitle}
            description={caretaker.selfEval.startDesc}
            accent="green"
            onClick={() => navigate('/caretaker/isuzuma/new')}
          />

          {draft && draftScore && (
            <Card className="space-y-4 p-4">
              <div className="flex items-start gap-3">
                <ClipboardCheck className="mt-0.5 shrink-0 text-primary" size={20} />
                <div className="min-w-0 flex-1">
                  <p className="text-title font-semibold">{caretaker.selfEval.draftTitle}</p>
                  <p className="text-caption text-text-muted">
                    {facilityTypeLabel(draft.facilityTypeId)} · {draft.assessmentDate}
                  </p>
                  <p className="mt-1 text-caption text-text-muted">
                    {caretaker.selfEval.draftPendingSubmit}
                  </p>
                </div>
              </div>
              <SelfEvalScoreSummary score={draftScore} compact />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void handleSubmitDraft()} disabled={submitting}>
                  {submitting
                    ? caretaker.selfEval.submitting
                    : caretaker.selfEval.submitToServer}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/caretaker/isuzuma/new')}
                  disabled={submitting}
                >
                  {caretaker.selfEval.continueDraft}
                </Button>
                <Button variant="secondary" onClick={handleClearDraft} disabled={submitting}>
                  {caretaker.selfEval.clearDraft}
                </Button>
              </div>
            </Card>
          )}

          <Card className="p-4 space-y-2">
            <p className="text-label text-text-muted">{caretaker.selfEval.rankLegendTitle}</p>
            <ul className="space-y-2 text-caption">
              {catalog.ranks.map((rank) => {
                const style = RANK_COLORS[rank.id]
                return (
                  <li key={rank.id} className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: RANK_CHART_COLORS[rank.id] }}
                      aria-hidden
                    />
                    <span className={style.text}>{rank.labelRw}</span>
                  </li>
                )
              })}
            </ul>
          </Card>
        </PageContent>
      </PageContainer>
    </CaretakerLayout>
  )
}
