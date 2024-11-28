export interface WageClaim {
  hoursWorked: number
  hourlyRate: number
  date: number
  employeeAddress: string
}

export interface ClaimResponse {
  createdAt: string | Date | number
  address: string
  id: number
  hoursWorked: number
  hourlyRate: number
  name: string
}
