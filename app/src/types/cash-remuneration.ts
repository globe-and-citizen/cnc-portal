export interface WageClaim {
  hoursWorked: number
  hourlyRate: number | bigint
  date: number
  employeeAddress: string
}

export interface ClaimResponse {
  createdAt: string | Date | number
  address: string
  id: number
  hoursWorked: number
  hourlyRate: string
  name: string
}
