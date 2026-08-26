import type { ComponentType } from 'react'
import {
  HandCoins,
  MessagesSquare,
  UsersRound,
  UserCog,
  HeartHandshake,
  DoorOpen,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react'
import { caretaker } from '@/locales/rw/caretaker'
import { ContributionList } from './ContributionList'
import { ParentingSessionList } from './ParentingSessionList'
import { CommitteeMemberList } from './CommitteeMemberList'
import { EducatorsRegisterList } from './EducatorsRegisterList'
import { CenterSupportList } from './CenterSupportList'
import { CenterVisitorsList } from './CenterVisitorsList'
import { StaffTrainingList } from './StaffTrainingList'
import type { RegisterListScope } from './types'

export type SupervisoryRegisterSectionId =
  | 'contributions'
  | 'parentingSessions'
  | 'committee'
  | 'educators'
  | 'support'
  | 'visitors'
  | 'training'

export interface SupervisoryRegisterSection {
  id: SupervisoryRegisterSectionId
  pathSegment: string
  paperSection: string
  icon: LucideIcon
  title: string
  subtitle: string
  List: ComponentType<{ scope: RegisterListScope }>
  educatorsVariant?: 'district' | 'ncda'
}

function EducatorsDistrictList({ scope }: { scope: RegisterListScope }) {
  return (
    <EducatorsRegisterList
      scope={scope}
      variant="district"
      detailPath={(id) => `/district/abakoresha/${id}`}
    />
  )
}

function EducatorsNcdaList({ scope }: { scope: RegisterListScope }) {
  return (
    <EducatorsRegisterList
      scope={scope}
      variant="ncda"
      detailPath={(id) => `/ncda/users/${id}`}
    />
  )
}

function SupervisoryContributionList({ scope }: { scope: RegisterListScope }) {
  return <ContributionList mode="readOnly" scope={scope} />
}

const book = caretaker.director.book.sections

export const DISTRICT_REGISTER_SECTIONS: SupervisoryRegisterSection[] = [
  {
    id: 'contributions',
    pathSegment: 'umusanzu',
    paperSection: 'VIII',
    icon: HandCoins,
    title: book.parentContributions.title,
    subtitle: book.parentContributions.description,
    List: SupervisoryContributionList,
  },
  {
    id: 'parentingSessions',
    pathSegment: 'ibiganiro',
    paperSection: 'IX',
    icon: MessagesSquare,
    title: book.environmentTalks.title,
    subtitle: book.environmentTalks.description,
    List: ParentingSessionList,
  },
  {
    id: 'committee',
    pathSegment: 'komite',
    paperSection: 'X',
    icon: UsersRound,
    title: book.committee.title,
    subtitle: book.committee.description,
    List: CommitteeMemberList,
  },
  {
    id: 'educators',
    pathSegment: 'abarezi',
    paperSection: 'XI',
    icon: UserCog,
    title: book.staff.title,
    subtitle: book.staff.description,
    List: EducatorsDistrictList,
  },
  {
    id: 'support',
    pathSegment: 'ubufasha',
    paperSection: 'XII',
    icon: HeartHandshake,
    title: book.support.title,
    subtitle: book.support.description,
    List: CenterSupportList,
  },
  {
    id: 'visitors',
    pathSegment: 'abashyitsi',
    paperSection: 'XIII',
    icon: DoorOpen,
    title: book.visitors.title,
    subtitle: book.visitors.description,
    List: CenterVisitorsList,
  },
  {
    id: 'training',
    pathSegment: 'amahugurwa',
    paperSection: 'XIV',
    icon: GraduationCap,
    title: book.training.title,
    subtitle: book.training.description,
    List: StaffTrainingList,
  },
]

export const NCDA_REGISTER_SECTIONS: SupervisoryRegisterSection[] = [
  ...DISTRICT_REGISTER_SECTIONS.map((section) =>
    section.id === 'educators'
      ? { ...section, List: EducatorsNcdaList }
      : section,
  ),
]

export function findSupervisoryRegisterSection(
  sections: SupervisoryRegisterSection[],
  pathSegment: string,
): SupervisoryRegisterSection | undefined {
  return sections.find((section) => section.pathSegment === pathSegment)
}
