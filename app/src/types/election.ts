export type Election = {
  id: number
  title: string
  description: string
  createdBy: `0x${string}`
  startDate: Date
  endDate: Date
  seatCount: number
  resultsPublished: boolean
}
