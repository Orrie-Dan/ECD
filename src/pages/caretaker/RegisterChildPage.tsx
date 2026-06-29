import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { Stepper } from '@/components/ui/Stepper'
import { FormField, TextInput, TextArea, SelectInput, RadioGroup } from '@/components/ui/FormField'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { Button } from '@/components/ui/Button'
import { FormSection } from '@/components/ui/Card'
import { useData } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { caretaker } from '@/locales/rw/caretaker'
import { gender, location, messages, GUARDIAN_RELATION_OPTIONS, getGuardianRelationLabel } from '@/locales/rw/common'
import {
  PROVINCES,
  getDistricts,
  getSectors,
  getCells,
  getVillages,
  getProvinceDisplayName,
  toLocationOptions,
} from '@/lib/rwanda-admin'
import type { ChildRegistrationForm, Gender, GuardianRelation } from '@/types'
import { common } from '@/locales/rw/common'

const STEPS = [
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

const initialForm: ChildRegistrationForm = {
  fullName: '',
  dateOfBirth: '',
  gender: '',
  specialNeeds: '',
  guardianName: '',
  guardianPhone: '',
  guardianRelation: '',
  guardian2Name: '',
  guardian2Phone: '',
  guardian2Relation: '',
  province: '',
  district: '',
  sector: '',
  cell: '',
  village: '',
}

export function RegisterChildPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<ChildRegistrationForm>(initialForm)
  const [errors, setErrors] = useState<Partial<Record<keyof ChildRegistrationForm, string>>>({})
  const { addChild } = useData()
  const { showSuccess, showError } = useToast()
  const navigate = useNavigate()

  const updateField = <K extends keyof ChildRegistrationForm>(key: K, value: ChildRegistrationForm[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'province') {
        next.district = ''
        next.sector = ''
        next.cell = ''
        next.village = ''
      }
      if (key === 'district') {
        next.sector = ''
        next.cell = ''
        next.village = ''
      }
      if (key === 'sector') {
        next.cell = ''
        next.village = ''
      }
      if (key === 'cell') {
        next.village = ''
      }
      return next
    })
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Partial<Record<keyof ChildRegistrationForm, string>> = {}

    if (currentStep === 1) {
      if (!form.fullName.trim()) newErrors.fullName = common.required
      if (!form.dateOfBirth) newErrors.dateOfBirth = common.required
      if (!form.gender) newErrors.gender = common.required
    }
    if (currentStep === 2) {
      if (!form.guardianName.trim()) newErrors.guardianName = common.required
      if (!form.guardianPhone.trim()) newErrors.guardianPhone = common.required
      if (!form.guardianRelation) newErrors.guardianRelation = caretaker.registration.guardianRelationRequired

      const hasGuardian2 =
        form.guardian2Name.trim() || form.guardian2Phone.trim() || form.guardian2Relation
      if (hasGuardian2) {
        if (!form.guardian2Name.trim()) newErrors.guardian2Name = common.required
        if (!form.guardian2Phone.trim()) newErrors.guardian2Phone = common.required
        if (!form.guardian2Relation) newErrors.guardian2Relation = caretaker.registration.guardianRelationRequired
      }
    }
    if (currentStep === 3) {
      if (!form.province) newErrors.province = common.required
      if (!form.district) newErrors.district = common.required
      if (!form.sector) newErrors.sector = common.required
      if (!form.cell) newErrors.cell = common.required
      if (!form.village) newErrors.village = common.required
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (!validateStep(step)) {
      showError(messages.formIncomplete)
      return
    }
    if (step < 4) setStep(step + 1)
  }

  const handleSubmit = () => {
    if (!validateStep(3)) {
      showError(messages.formIncomplete)
      return
    }

    addChild({
      fullName: form.fullName.trim(),
      dateOfBirth: form.dateOfBirth,
      gender: form.gender as Gender,
      ...(form.specialNeeds.trim() ? { specialNeeds: form.specialNeeds.trim() } : {}),
      guardianName: form.guardianName.trim(),
      guardianPhone: form.guardianPhone.trim(),
      guardianRelation: form.guardianRelation as GuardianRelation,
      ...(form.guardian2Name.trim()
        ? {
            guardian2Name: form.guardian2Name.trim(),
            guardian2Phone: form.guardian2Phone.trim(),
            guardian2Relation: form.guardian2Relation as GuardianRelation,
          }
        : {}),
      province: getProvinceDisplayName(form.province),
      district: form.district,
      sector: form.sector,
      cell: form.cell,
      village: form.village,
    })

    showSuccess(messages.childRegistered)
    navigate('/caretaker/abana')
  }

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
    <CaretakerLayout pageTitle={caretaker.registration.title}>
      <Stepper steps={STEPS} currentStep={step} />

      {step === 1 && (
        <FormSection title={STEPS[0].title} description={STEPS[0].description}>
          <FormField label={caretaker.registration.fullName} required error={errors.fullName}>
            <TextInput
              value={form.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              placeholder={caretaker.registration.fullNamePlaceholder}
              error={!!errors.fullName}
            />
          </FormField>
          <FormField label={caretaker.registration.dateOfBirth} required error={errors.dateOfBirth}>
            <TextInput
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => updateField('dateOfBirth', e.target.value)}
              error={!!errors.dateOfBirth}
            />
          </FormField>
          <FormField label={caretaker.registration.gender} required error={errors.gender}>
            <RadioGroup
              name="gender"
              value={form.gender}
              onChange={(v) => updateField('gender', v as Gender)}
              options={[
                { value: 'Umuhungu', label: gender.Umuhungu },
                { value: 'Umukobwa', label: gender.Umukobwa },
              ]}
              error={!!errors.gender}
            />
          </FormField>
          <FormField label={caretaker.registration.specialNeeds}>
            <TextArea
              value={form.specialNeeds}
              onChange={(e) => updateField('specialNeeds', e.target.value)}
              placeholder={caretaker.registration.specialNeedsPlaceholder}
            />
          </FormField>
        </FormSection>
      )}

      {step === 2 && (
        <FormSection title={STEPS[1].title} description={STEPS[1].description}>
          <h3 className="text-label text-primary">{caretaker.registration.guardian1Section}</h3>
          <FormField label={caretaker.registration.guardianName} required error={errors.guardianName}>
            <TextInput
              value={form.guardianName}
              onChange={(e) => updateField('guardianName', e.target.value)}
              placeholder={caretaker.registration.guardianNamePlaceholder}
              error={!!errors.guardianName}
            />
          </FormField>
          <FormField label={caretaker.registration.guardianPhone} required error={errors.guardianPhone}>
            <TextInput
              type="tel"
              value={form.guardianPhone}
              onChange={(e) => updateField('guardianPhone', e.target.value)}
              placeholder={caretaker.registration.guardianPhonePlaceholder}
              error={!!errors.guardianPhone}
            />
          </FormField>
          <FormField label={caretaker.registration.guardianRelation} required error={errors.guardianRelation}>
            <SearchableSelect
              value={form.guardianRelation}
              onChange={(v) => updateField('guardianRelation', v as GuardianRelation)}
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
                onChange={(e) => updateField('guardian2Name', e.target.value)}
                placeholder={caretaker.registration.guardianNamePlaceholder}
                error={!!errors.guardian2Name}
              />
            </FormField>
            <FormField label={caretaker.registration.guardianPhone} error={errors.guardian2Phone}>
              <TextInput
                type="tel"
                value={form.guardian2Phone}
                onChange={(e) => updateField('guardian2Phone', e.target.value)}
                placeholder={caretaker.registration.guardianPhonePlaceholder}
                error={!!errors.guardian2Phone}
              />
            </FormField>
            <FormField label={caretaker.registration.guardianRelation} error={errors.guardian2Relation}>
              <SearchableSelect
                value={form.guardian2Relation}
                onChange={(v) => updateField('guardian2Relation', v as GuardianRelation)}
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
        <FormSection title={STEPS[2].title} description={STEPS[2].description}>
          <FormField label={location.province} required error={errors.province}>
            <SelectInput
              value={form.province}
              onChange={(e) => updateField('province', e.target.value)}
              placeholder={location.selectProvince}
              error={!!errors.province}
            >
              {PROVINCES.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </SelectInput>
          </FormField>
          <FormField label={location.district} required error={errors.district}>
            <SearchableSelect
              value={form.district}
              onChange={(v) => updateField('district', v)}
              options={toLocationOptions(districts)}
              placeholder={location.selectDistrict}
              disabled={!form.province}
              error={!!errors.district}
              aria-label={location.district}
            />
          </FormField>
          <FormField label={location.sector} required error={errors.sector}>
            <SearchableSelect
              value={form.sector}
              onChange={(v) => updateField('sector', v)}
              options={toLocationOptions(sectors)}
              placeholder={location.selectSector}
              disabled={!form.district}
              error={!!errors.sector}
              aria-label={location.sector}
            />
          </FormField>
          <FormField label={location.cell} required error={errors.cell}>
            <SearchableSelect
              value={form.cell}
              onChange={(v) => updateField('cell', v)}
              options={toLocationOptions(cells)}
              placeholder={location.selectCell}
              disabled={!form.sector}
              error={!!errors.cell}
              aria-label={location.cell}
            />
          </FormField>
          <FormField label={location.village} required error={errors.village}>
            <SearchableSelect
              value={form.village}
              onChange={(v) => updateField('village', v)}
              options={toLocationOptions(villages)}
              placeholder={location.selectVillage}
              disabled={!form.cell}
              error={!!errors.village}
              aria-label={location.village}
            />
          </FormField>
        </FormSection>
      )}

      {step === 4 && (
        <FormSection title={STEPS[3].title} description={STEPS[3].description}>
          <section className="space-y-3">
            <h3 className="text-label text-primary">{caretaker.registration.reviewChild}</h3>
            <dl className="space-y-2.5 bg-background-subtle rounded-xl p-4">
              <ReviewRow label={caretaker.registration.fullName} value={form.fullName} />
              <ReviewRow label={caretaker.registration.dateOfBirth} value={form.dateOfBirth} />
              <ReviewRow label={caretaker.registration.gender} value={form.gender ? gender[form.gender as Gender] : ''} />
              <ReviewRow
                label={caretaker.registration.reviewSpecialNeeds}
                value={form.specialNeeds.trim() || caretaker.registration.notProvided}
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
        {step > 1 && (
          <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)} className="w-full sm:w-auto">
            {common.back}
          </Button>
        )}
        {step < 4 ? (
          <Button variant="primary" size="lg" fullWidth onClick={handleNext}>
            {common.next}
          </Button>
        ) : (
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit}>
            {caretaker.registration.submit}
          </Button>
        )}
      </div>
    </CaretakerLayout>
  )
}
