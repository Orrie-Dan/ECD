import { Stepper } from '@/components/ui/Stepper'
import { FormField, TextInput, TextArea, SelectInput, RadioGroup } from '@/components/ui/FormField'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { Button } from '@/components/ui/Button'
import { FormSection } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { caretaker } from '@/locales/rw/caretaker'
import { gender, location, GUARDIAN_RELATION_OPTIONS, getGuardianRelationLabel, common } from '@/locales/rw/common'
import {
  PROVINCES,
  getDistricts,
  getSectors,
  getCells,
  getVillages,
  getProvinceDisplayName,
  toLocationOptions,
} from '@/lib/rwanda-admin'
import { GRADE_FILTER_OPTIONS } from '@/lib/child-filters'
import type { ChildRegistrationForm, ClassroomGrade, Gender, GuardianRelation } from '@/types'

export const CHILD_FORM_STEPS = [
  { title: caretaker.registration.step1Title, description: caretaker.registration.step1Desc },
  { title: caretaker.registration.step2Title, description: caretaker.registration.step2Desc },
  { title: caretaker.registration.step3Title, description: caretaker.registration.step3Desc },
  { title: caretaker.registration.step4Title, description: caretaker.registration.step4Desc },
]

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4 text-body">
      <dt className="text-text-secondary shrink-0">{label}</dt>
      <dd className="font-semibold text-text sm:text-right break-words">{value}</dd>
    </div>
  )
}

interface ChildFormWizardProps {
  step: number
  form: ChildRegistrationForm
  errors: Partial<Record<keyof ChildRegistrationForm, string>>
  onUpdateField: <K extends keyof ChildRegistrationForm>(key: K, value: ChildRegistrationForm[K]) => void
  onBack: () => void
  onNext: () => void
  onSubmit: () => void
  onCancel?: () => void
  submitLabel: string
  showCancel?: boolean
  /**
   * When true (offline edit), DOB / gender / location are locked.
   * Sync CAS cannot apply those fields — caretaker must reconnect to change them.
   */
  lockDemographics?: boolean
}

export function ChildFormWizard({
  step,
  form,
  errors,
  onUpdateField,
  onBack,
  onNext,
  onSubmit,
  onCancel,
  submitLabel,
  showCancel = false,
  lockDemographics = false,
}: ChildFormWizardProps) {
  const districts = form.province ? getDistricts(form.province) : []
  const sectors = form.province && form.district ? getSectors(form.province, form.district) : []
  const cells =
    form.province && form.district && form.sector
      ? getCells(form.province, form.district, form.sector)
      : []
  const villages =
    form.province && form.district && form.sector && form.cell
      ? getVillages(form.province, form.district, form.sector, form.cell)
      : []

  return (
    <>
      <Stepper steps={CHILD_FORM_STEPS} currentStep={step} />

      {lockDemographics && (
        <Alert variant="warning" className="mb-4" role="status">
          <p className="font-semibold text-text">{common.sync.childEditOfflineTitle}</p>
          <p className="text-body text-text-secondary mt-1">{common.sync.childEditNeedsOnline}</p>
        </Alert>
      )}

      {step === 1 && (
        <FormSection title={CHILD_FORM_STEPS[0].title} description={CHILD_FORM_STEPS[0].description}>
          <FormField label={caretaker.registration.fullName} required error={errors.fullName}>
            <TextInput
              value={form.fullName}
              onChange={(e) => onUpdateField('fullName', e.target.value)}
              placeholder={caretaker.registration.fullNamePlaceholder}
              error={!!errors.fullName}
              autoComplete="name"
            />
          </FormField>
          <FormField label={caretaker.registration.dateOfBirth} required error={errors.dateOfBirth}>
            <TextInput
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => onUpdateField('dateOfBirth', e.target.value)}
              error={!!errors.dateOfBirth}
              disabled={lockDemographics}
              readOnly={lockDemographics}
            />
          </FormField>
          <FormField label={caretaker.registration.gender} required error={errors.gender}>
            <RadioGroup
              name="gender"
              value={form.gender}
              onChange={(v) => onUpdateField('gender', v as Gender)}
              options={[
                { value: 'Umuhungu', label: gender.Umuhungu },
                { value: 'Umukobwa', label: gender.Umukobwa },
              ]}
              error={!!errors.gender}
              disabled={lockDemographics}
            />
          </FormField>
          <FormField label={caretaker.registration.nationalId} required error={errors.nationalId}>
            <TextInput
              value={form.nationalId}
              onChange={(e) => onUpdateField('nationalId', e.target.value)}
              placeholder={caretaker.registration.nationalIdPlaceholder}
              error={!!errors.nationalId}
              inputMode="numeric"
            />
          </FormField>
          <FormField label={caretaker.registration.specialNeeds}>
            <TextArea
              value={form.specialNeeds}
              onChange={(e) => onUpdateField('specialNeeds', e.target.value)}
              placeholder={caretaker.registration.specialNeedsPlaceholder}
            />
          </FormField>
          <FormField label={caretaker.classrooms.schoolGradeLabel} required error={errors.classroomGrade}>
            <RadioGroup
              name="classroomGrade"
              value={form.classroomGrade}
              onChange={(v) => onUpdateField('classroomGrade', v as ClassroomGrade)}
              options={GRADE_FILTER_OPTIONS.filter((o) => o.value !== 'all')}
              error={!!errors.classroomGrade}
            />
          </FormField>
        </FormSection>
      )}

      {step === 2 && (
        <FormSection title={CHILD_FORM_STEPS[1].title} description={CHILD_FORM_STEPS[1].description}>
          <h3 className="text-label text-primary">{caretaker.registration.guardian1Section}</h3>
          <FormField label={caretaker.registration.guardianName} required error={errors.guardianName}>
            <TextInput
              value={form.guardianName}
              onChange={(e) => onUpdateField('guardianName', e.target.value)}
              placeholder={caretaker.registration.guardianNamePlaceholder}
              error={!!errors.guardianName}
            />
          </FormField>
          <FormField label={caretaker.registration.guardianPhone} required error={errors.guardianPhone}>
            <TextInput
              type="tel"
              value={form.guardianPhone}
              onChange={(e) => onUpdateField('guardianPhone', e.target.value)}
              placeholder={caretaker.registration.guardianPhonePlaceholder}
              error={!!errors.guardianPhone}
              inputMode="tel"
            />
          </FormField>
          <FormField label={caretaker.registration.guardianRelation} required error={errors.guardianRelation}>
            <SearchableSelect
              value={form.guardianRelation}
              onChange={(v) => onUpdateField('guardianRelation', v as GuardianRelation)}
              options={GUARDIAN_RELATION_OPTIONS}
              placeholder={caretaker.registration.guardianRelationPlaceholder}
              error={!!errors.guardianRelation}
              aria-label={caretaker.registration.guardianRelation}
            />
          </FormField>

          <div className="pt-4 mt-2 border-t border-border space-y-4">
            <h3 className="text-label text-primary">{caretaker.registration.guardian2Section}</h3>
            <p className="text-caption text-text-secondary -mt-2">{caretaker.registration.guardian2Hint}</p>
            <FormField label={caretaker.registration.guardianName} error={errors.guardian2Name}>
              <TextInput
                value={form.guardian2Name}
                onChange={(e) => onUpdateField('guardian2Name', e.target.value)}
                placeholder={caretaker.registration.guardianNamePlaceholder}
                error={!!errors.guardian2Name}
              />
            </FormField>
            <FormField label={caretaker.registration.guardianPhone} error={errors.guardian2Phone}>
              <TextInput
                type="tel"
                value={form.guardian2Phone}
                onChange={(e) => onUpdateField('guardian2Phone', e.target.value)}
                placeholder={caretaker.registration.guardianPhonePlaceholder}
                error={!!errors.guardian2Phone}
                inputMode="tel"
              />
            </FormField>
            <FormField label={caretaker.registration.guardianRelation} error={errors.guardian2Relation}>
              <SearchableSelect
                value={form.guardian2Relation}
                onChange={(v) => onUpdateField('guardian2Relation', v as GuardianRelation)}
                options={GUARDIAN_RELATION_OPTIONS}
                placeholder={caretaker.registration.guardianRelationPlaceholder}
                error={!!errors.guardian2Relation}
                aria-label={caretaker.registration.guardianRelation}
              />
            </FormField>
          </div>
        </FormSection>
      )}

      {step === 3 && (
        <FormSection title={CHILD_FORM_STEPS[2].title} description={CHILD_FORM_STEPS[2].description}>
          <FormField label={location.province} required error={errors.province}>
            <SelectInput
              value={form.province}
              onChange={(e) => onUpdateField('province', e.target.value)}
              placeholder={location.selectProvince}
              error={!!errors.province}
              disabled={lockDemographics}
            >
              {PROVINCES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <FormField label={location.district} required error={errors.district}>
            <SearchableSelect
              value={form.district}
              onChange={(v) => onUpdateField('district', v)}
              options={toLocationOptions(districts)}
              placeholder={location.selectDistrict}
              disabled={lockDemographics || !form.province}
              error={!!errors.district}
              aria-label={location.district}
            />
          </FormField>
          <FormField label={location.sector} required error={errors.sector}>
            <SearchableSelect
              value={form.sector}
              onChange={(v) => onUpdateField('sector', v)}
              options={toLocationOptions(sectors)}
              placeholder={location.selectSector}
              disabled={lockDemographics || !form.district}
              error={!!errors.sector}
              aria-label={location.sector}
            />
          </FormField>
          <FormField label={location.cell} required error={errors.cell}>
            <SearchableSelect
              value={form.cell}
              onChange={(v) => onUpdateField('cell', v)}
              options={toLocationOptions(cells)}
              placeholder={location.selectCell}
              disabled={lockDemographics || !form.sector}
              error={!!errors.cell}
              aria-label={location.cell}
            />
          </FormField>
          <FormField label={location.village} required error={errors.village}>
            <SearchableSelect
              value={form.village}
              onChange={(v) => onUpdateField('village', v)}
              options={toLocationOptions(villages)}
              placeholder={location.selectVillage}
              disabled={lockDemographics || !form.cell}
              error={!!errors.village}
              aria-label={location.village}
            />
          </FormField>
        </FormSection>
      )}

      {step === 4 && (
        <FormSection title={CHILD_FORM_STEPS[3].title} description={CHILD_FORM_STEPS[3].description}>
          <section className="space-y-3">
            <h3 className="text-label text-primary">{caretaker.registration.reviewChild}</h3>
            <dl className="space-y-2.5 bg-background-subtle rounded-xl p-4">
              <ReviewRow label={caretaker.registration.fullName} value={form.fullName} />
              <ReviewRow label={caretaker.registration.dateOfBirth} value={form.dateOfBirth} />
              <ReviewRow
                label={caretaker.registration.gender}
                value={form.gender ? gender[form.gender as Gender] : ''}
              />
              <ReviewRow
                label={caretaker.registration.nationalId}
                value={form.nationalId.trim() || caretaker.registration.notProvided}
              />
              <ReviewRow
                label={caretaker.registration.reviewSpecialNeeds}
                value={form.specialNeeds.trim() || caretaker.registration.notProvided}
              />
              <ReviewRow
                label={caretaker.classrooms.schoolGradeLabel}
                value={
                  form.classroomGrade
                    ? GRADE_FILTER_OPTIONS.find((o) => o.value === form.classroomGrade)?.label ?? ''
                    : caretaker.classrooms.noClassroom
                }
              />
            </dl>
          </section>
          <section className="space-y-3">
            <h3 className="text-label text-primary">{caretaker.registration.guardian1Section}</h3>
            <dl className="space-y-2.5 bg-background-subtle rounded-xl p-4">
              <ReviewRow label={caretaker.registration.guardianName} value={form.guardianName} />
              <ReviewRow label={caretaker.registration.guardianPhone} value={form.guardianPhone} />
              <ReviewRow
                label={caretaker.registration.guardianRelation}
                value={form.guardianRelation ? getGuardianRelationLabel(form.guardianRelation) : ''}
              />
            </dl>
          </section>
          {(form.guardian2Name.trim() || form.guardian2Phone.trim() || form.guardian2Relation) && (
            <section className="space-y-3">
              <h3 className="text-label text-primary">{caretaker.registration.guardian2Section}</h3>
              <dl className="space-y-2.5 bg-background-subtle rounded-xl p-4">
                <ReviewRow label={caretaker.registration.guardianName} value={form.guardian2Name} />
                <ReviewRow label={caretaker.registration.guardianPhone} value={form.guardian2Phone} />
                <ReviewRow
                  label={caretaker.registration.guardianRelation}
                  value={form.guardian2Relation ? getGuardianRelationLabel(form.guardian2Relation) : ''}
                />
              </dl>
            </section>
          )}
          <section className="space-y-3">
            <h3 className="text-label text-primary">{caretaker.registration.reviewLocation}</h3>
            <dl className="space-y-2.5 bg-background-subtle rounded-xl p-4">
              <ReviewRow label={location.province} value={getProvinceDisplayName(form.province)} />
              <ReviewRow label={location.district} value={form.district} />
              <ReviewRow label={location.sector} value={form.sector} />
              <ReviewRow label={location.cell} value={form.cell} />
              <ReviewRow label={location.village} value={form.village} />
            </dl>
          </section>
        </FormSection>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 mt-8 pt-6 border-t border-border">
        {showCancel && onCancel && step === 1 && (
          <Button variant="tertiary" size="lg" onClick={onCancel} className="w-full sm:w-auto">
            {common.cancel}
          </Button>
        )}
        {step > 1 && (
          <Button variant="secondary" size="lg" onClick={onBack} className="w-full sm:w-auto">
            {common.back}
          </Button>
        )}
        {step < 4 ? (
          <Button variant="primary" size="lg" fullWidth onClick={onNext}>
            {common.next}
          </Button>
        ) : (
          <Button variant="primary" size="lg" fullWidth onClick={onSubmit}>
            {submitLabel}
          </Button>
        )}
      </div>
    </>
  )
}
