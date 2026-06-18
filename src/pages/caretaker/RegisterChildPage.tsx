import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { Stepper } from '@/components/ui/Stepper'
import { FormField, TextInput, SelectInput, RadioGroup } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { FormSection } from '@/components/ui/Card'
import { useData } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { caretaker } from '@/locales/rw/caretaker'
import { gender, relations, location, messages } from '@/locales/rw/common'
import {
  PROVINCES,
  getDistricts,
  getSectors,
  getCells,
  getVillages,
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
    <div className="flex justify-between gap-4 text-body">
      <dt className="text-text-secondary shrink-0">{label}</dt>
      <dd className="font-semibold text-text text-right">{value}</dd>
    </div>
  )
}

const initialForm: ChildRegistrationForm = {
  fullName: '',
  dateOfBirth: '',
  gender: '',
  guardianName: '',
  guardianPhone: '',
  guardianRelation: '',
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
      if (!form.guardianRelation) newErrors.guardianRelation = common.required
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

    const provinceName = PROVINCES.find((p) => p.id === form.province)?.name ?? form.province
    const districtName = getDistricts(form.province).find((d) => d.id === form.district)?.name ?? form.district

    addChild({
      fullName: form.fullName.trim(),
      dateOfBirth: form.dateOfBirth,
      gender: form.gender as Gender,
      guardianName: form.guardianName.trim(),
      guardianPhone: form.guardianPhone.trim(),
      guardianRelation: form.guardianRelation as GuardianRelation,
      province: provinceName,
      district: districtName,
      sector: form.sector,
      cell: form.cell,
      village: form.village,
    })

    showSuccess(messages.childRegistered)
    navigate('/caretaker/abana')
  }

  const districts = form.province ? getDistricts(form.province) : []
  const sectors = form.district ? getSectors(form.district) : []
  const cells = form.sector ? getCells(form.sector) : []
  const villages = form.cell ? getVillages(form.cell) : []

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
        </FormSection>
      )}

      {step === 2 && (
        <FormSection title={STEPS[1].title} description={STEPS[1].description}>
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
            <RadioGroup
              name="relation"
              value={form.guardianRelation}
              onChange={(v) => updateField('guardianRelation', v as GuardianRelation)}
              options={Object.entries(relations).map(([value, label]) => ({ value, label }))}
              error={!!errors.guardianRelation}
            />
          </FormField>
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
            <SelectInput
              value={form.district}
              onChange={(e) => updateField('district', e.target.value)}
              placeholder={location.selectDistrict}
              disabled={!form.province}
              error={!!errors.district}
            >
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </SelectInput>
          </FormField>
          <FormField label={location.sector} required error={errors.sector}>
            <SelectInput
              value={form.sector}
              onChange={(e) => updateField('sector', e.target.value)}
              placeholder={location.selectSector}
              disabled={!form.district}
              error={!!errors.sector}
            >
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </SelectInput>
          </FormField>
          <FormField label={location.cell} required error={errors.cell}>
            <SelectInput
              value={form.cell}
              onChange={(e) => updateField('cell', e.target.value)}
              placeholder={location.selectCell}
              disabled={!form.sector}
              error={!!errors.cell}
            >
              {cells.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </SelectInput>
          </FormField>
          <FormField label={location.village} required error={errors.village}>
            <SelectInput
              value={form.village}
              onChange={(e) => updateField('village', e.target.value)}
              placeholder={location.selectVillage}
              disabled={!form.cell}
              error={!!errors.village}
            >
              {villages.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </SelectInput>
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
            </dl>
          </section>
          <section className="space-y-3">
            <h3 className="text-label text-primary">{caretaker.registration.reviewGuardian}</h3>
            <dl className="space-y-2.5 bg-background-subtle rounded-xl p-4">
              <ReviewRow label={caretaker.registration.guardianName} value={form.guardianName} />
              <ReviewRow label={caretaker.registration.guardianPhone} value={form.guardianPhone} />
              <ReviewRow label={caretaker.registration.guardianRelation} value={form.guardianRelation ? relations[form.guardianRelation as GuardianRelation] : ''} />
            </dl>
          </section>
          <section className="space-y-3">
            <h3 className="text-label text-primary">{caretaker.registration.reviewLocation}</h3>
            <dl className="space-y-2.5 bg-background-subtle rounded-xl p-4">
              <ReviewRow label={location.province} value={PROVINCES.find((p) => p.id === form.province)?.name ?? ''} />
              <ReviewRow label={location.district} value={districts.find((d) => d.id === form.district)?.name ?? ''} />
              <ReviewRow label={location.sector} value={form.sector} />
              <ReviewRow label={location.cell} value={form.cell} />
              <ReviewRow label={location.village} value={form.village} />
            </dl>
          </section>
        </FormSection>
      )}

      <div className="flex gap-3 mt-8 pt-6 border-t border-border">
        {step > 1 && (
          <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)}>
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
