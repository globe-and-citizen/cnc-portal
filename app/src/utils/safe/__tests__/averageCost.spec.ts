import { describe, expect, it } from 'vitest'
import {
  averageCost,
  enterPosition,
  exitAtAverageCost,
  realizeExit,
  type AverageCostPosition
} from '../averageCost'

const emptyPosition = (): AverageCostPosition => ({ quantity: 0, costUsd: 0, realizedUsd: 0 })

describe('average-cost position', () => {
  it('averages the cost of successive entries', () => {
    const position = emptyPosition()
    enterPosition(position, 0.5, 1000)
    enterPosition(position, 0.5, 1300)

    expect(averageCost(position)).toBe(2300)
  })

  it('takes an exit out at the average cost and fixes its result', () => {
    const position = emptyPosition()
    enterPosition(position, 1, 2000)

    const cost = exitAtAverageCost(position, 0.25)
    const pnl = realizeExit(position, 700, cost)

    expect({ cost, pnl, position }).toEqual({
      cost: 500,
      pnl: 200,
      position: { quantity: 0.75, costUsd: 1500, realizedUsd: 200 }
    })
  })

  it('stops valuing a token that leaves more than its history holds', () => {
    const position = emptyPosition()
    enterPosition(position, 0.5, 1000)

    expect(exitAtAverageCost(position, 1)).toBeNull()
    expect(position.realizedUsd).toBeNull()
  })

  it('starts again from the next entry once emptied', () => {
    const position = emptyPosition()
    enterPosition(position, 1, 2000)
    exitAtAverageCost(position, 1)
    enterPosition(position, 1, 3000)

    expect(averageCost(position)).toBe(3000)
  })
})
