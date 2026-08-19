import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, PlayCircle } from 'lucide-react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { ActionCard, Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { SelfEvalScoreSummary } from '@/components/self-evaluation/SelfEvalScoreSummary'
import { useAuth } from '@/contexts/AppContext'
import { caretaker } from '@/locales/rw/caretaker'
import { resolveCenterId } from '@/lib/resolve-center-id'
import { clearSelfEvalDraft, loadSelfEvalDraft } from '@/features/self-evaluation/draft-storage'
import { facilityTypeLabel } from '@/features/self-evaluation/facility-labels'
import {
  loadChecklistCatalog,
  scoreSelfEvaluation,
} from '@/features/self-evaluation/scoring'

export function SelfEvalPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const centerId = resolveCenterId(user?.centerId)
  const catalog = useMemo(() => loadChecklistCatalog(), [])
  const draft = useMemo(
    () => (centerId ? loadSelfEvalDraft(centerId) : null),
    [centerId],
  )

  const draftScore = useMemo(() => {
    if (!draft) return null
    const checklist = catalog.facilityTypes.find((f) => f.id === draft.facilityTypeId)
    if (!checklist) return null
    return scoreSelfEvaluation(checklist, draft.answers, catalog.ranks)
  }, [catalog, draft])

  const handleClearDraft = () => {
    if (!centerId) return
    clearSelfEvalDraft(centerId)
    window.location.reload()
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
                </div>
              </div>
              <SelfEvalScoreSummary score={draftScore} compact />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => navigate('/caretaker/isuzuma/new')}>
                  {caretaker.selfEval.continueDraft}
                </Button>
                <Button variant="secondary" onClick={handleClearDraft}>
                  {caretaker.selfEval.clearDraft}
                </Button>
              </div>
            </Card>
          )}

          <Card className="p-4 space-y-2">
            <p className="text-label text-text-muted">{caretaker.selfEval.rankLegendTitle}</p>
            <ul className="space-y-1 text-caption text-text-muted">
              {catalog.ranks.map((rank) => (
                <li key={rank.id}>{rank.labelRw}</li>
              ))}
            </ul>
          </Card>
        </PageContent>
      </PageContainer>
    </CaretakerLayout>
  )
}
