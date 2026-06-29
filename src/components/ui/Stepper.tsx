import { Check } from 'lucide-react'
import { common } from '@/locales/rw/common'

interface Step {
  title: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
}

export function Stepper({ steps, currentStep }: StepperProps) {
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100

  return (
    <nav aria-label={common.ui.stepper} className="mb-8">
      <div className="bg-surface rounded-xl border border-border shadow-card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-label text-primary">
            {common.ui.stepProgress.replace('{current}', String(currentStep)).replace('{total}', String(steps.length))}
          </p>
          <p className="text-caption hidden sm:block">{steps[currentStep - 1]?.title}</p>
        </div>

        <div className="h-2 bg-background-subtle rounded-full overflow-hidden mb-6" aria-hidden="true">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ol className="hidden sm:flex items-center justify-between gap-2">
          {steps.map((step, index) => {
            const stepNum = index + 1
            const isActive = stepNum === currentStep
            const isComplete = stepNum < currentStep

            return (
              <li
                key={step.title}
                className="flex flex-col items-center flex-1 text-center"
                aria-current={isActive ? 'step' : undefined}
              >
                <div
                  className={`
                    flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold mb-2
                    ${isComplete ? 'bg-success text-white' : ''}
                    ${isActive ? 'bg-primary text-white ring-4 ring-primary-light' : ''}
                    ${!isComplete && !isActive ? 'bg-background-subtle text-text-muted border border-border' : ''}
                  `}
                  aria-hidden="true"
                >
                  {isComplete ? <Check size={16} strokeWidth={3} /> : stepNum}
                </div>
                <p className={`text-caption leading-tight max-w-[100px] ${isActive ? 'font-semibold text-primary' : 'text-text-muted'}`}>
                  {step.title}
                </p>
              </li>
            )
          })}
        </ol>

        <div className="sm:hidden">
          <p className="text-subheading text-text">{steps[currentStep - 1]?.title}</p>
          {steps[currentStep - 1]?.description && (
            <p className="text-body text-text-secondary mt-1">{steps[currentStep - 1].description}</p>
          )}
        </div>
      </div>
    </nav>
  )
}
