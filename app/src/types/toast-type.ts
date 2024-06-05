export enum ToastType {
  Success = 'success',
  Info = 'info',
  Warning = 'warning',
  Error = 'error'
}

export interface Toast {
  id?: number
  message: string
  timeout: number
  type: ToastType
}
