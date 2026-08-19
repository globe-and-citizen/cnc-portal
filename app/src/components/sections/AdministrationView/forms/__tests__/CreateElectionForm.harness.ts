import { mount } from '@vue/test-utils'
import CreateElectionForm from '../CreateElectionForm.vue'

export interface CreateElectionFormVm {
  state: {
    title: string
    description: string
    winnerCount: string | number
    startDay: Date | null
    startTime: string
    endDay: Date | null
    endTime: string
  }
  errors: {
    startDate?: string
    endDate?: string
    candidates?: string
  }
  formData: Array<{ address: string; name: string }>
  newProposalInput: { isElection?: boolean }
  startDateOpen: boolean
  endDateOpen: boolean
  openingHelp: string
  pickStartDay: (day: Date) => void
  formRef: { contains: (node: Node) => boolean } | null
  showDropdown: boolean
  handleClickOutside: (event: MouseEvent) => void
  submitForm: () => void
  schema: {
    safeParse: (data: unknown) => { success: boolean }
  }
}

export const mountComponent = (isLoading = false) =>
  mount(CreateElectionForm, {
    props: { isLoading }
  })

export const getVm = (wrapper: ReturnType<typeof mountComponent>) =>
  Reflect.get(wrapper, 'vm') as unknown as CreateElectionFormVm

/** Local midnight, `days` from today — the shape a calendar hands back. */
export const inDays = (days: number) => {
  const day = new Date()
  day.setDate(day.getDate() + days)
  day.setHours(0, 0, 0, 0)
  return day
}

export const tomorrow = () => inDays(1)

/** `hh:mm`, the shape the time fields hold. */
export const clockTime = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

export const emittedPayload = (wrapper: ReturnType<typeof mountComponent>) =>
  wrapper.emitted('createProposal')?.[0]?.[0] as {
    startDate: Date
    endDate: Date
    candidates: Array<{ name: string; candidateAddress: string }>
  }
