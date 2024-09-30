import { ref } from 'vue'
import { BoDService } from '@/services/bodService'
import type { Action, Team } from '@/types'
import { useCustomFetch } from './useCustomFetch'

const bodService = new BoDService()

export function useGetBoardOfDirectors() {
  const boardOfDirectors = ref<string[] | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function getBoardOfDirectors(bodAddress: string) {
    try {
      loading.value = true
      boardOfDirectors.value = await bodService.getBoardOfDirectors(bodAddress)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: getBoardOfDirectors, isLoading: loading, isSuccess, error, boardOfDirectors }
}

export function useGetActionCount() {
  const actionCount = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)

  async function getActionCount(bodAddress: string) {
    try {
      loading.value = true
      actionCount.value = await bodService.getActionCount(bodAddress)
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: getActionCount, isLoading: loading, error, data: actionCount }
}

export function useAddAction() {
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(true)

  async function addAction(team: Partial<Team>, action: Partial<Action>) {
    try {
      isSuccess.value = false
      loading.value = true
      const actionCount = await bodService.getActionCount(team.boardOfDirectorsAddress!)
      await bodService.addAction(team.boardOfDirectorsAddress!, action)

      useCustomFetch(`actions`, {
        immediate: true
      }).post({
        teamId: team.id?.toString(),
        actionId: parseInt((actionCount ?? 0).toString()),
        targetAddress: action.targetAddress,
        description: action.description,
        data: action.data
      })
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: addAction, isLoading: loading, error, isSuccess }
}

export function useApproveAction() {
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function approve(bodAddress: string, actionId: number) {
    try {
      loading.value = true
      await bodService.approve(actionId, bodAddress)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: approve, isLoading: loading, error, isSuccess }
}

export function useRevokeAction() {
  const loading = ref(false)
  const error = ref<unknown>(null)
  const isSuccess = ref(false)

  async function revoke(bodAddress: string, actionId: number) {
    try {
      loading.value = true
      await bodService.revoke(actionId, bodAddress)
      isSuccess.value = true
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: revoke, isLoading: loading, error, isSuccess }
}

export function useIsActionApproved() {
  const data = ref<boolean | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)

  async function isApproved(bodAddress: string, actionId: number, address: string) {
    try {
      loading.value = true
      data.value = await bodService.isApproved(actionId, bodAddress, address)
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: isApproved, isLoading: loading, error, data }
}

export function useApprovalCount() {
  const data = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)

  async function getApprovalCount(bodAddress: string, actionId: number) {
    try {
      loading.value = true
      data.value = await bodService.getApprovalCount(actionId, bodAddress)
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: getApprovalCount, isLoading: loading, error, data }
}

export function useActionExecuted() {
  const data = ref<boolean | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)

  async function isExecuted(bodAddress: string, actionId: number) {
    try {
      loading.value = true
      data.value = await bodService.isExecuted(actionId, bodAddress)
    } catch (err) {
      error.value = err
    } finally {
      loading.value = false
    }
  }

  return { execute: isExecuted, isLoading: loading, error, data }
}
