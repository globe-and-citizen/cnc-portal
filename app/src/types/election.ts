export type Election = {
  id: number
  title: string
  description: string
  createdBy: string
  startDate: Date
  endDate: Date
  seatCount: number
  resultsPublished: boolean
  votesCast?: number
  candidates?: number
  voters?: number
}
