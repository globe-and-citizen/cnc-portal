/**
 * The Safe Transaction Service answers HTTP 429 ("Too many requests per second") when several
 * reads arrive together, and a 429 costs a 30-second retry delay. Its reads therefore start one
 * after another, at most one per {@link SAFE_READ_SPACING_MS}.
 */
export const SAFE_READ_SPACING_MS = 500

let previousTurn: Promise<unknown> = Promise.resolve()

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Run `read` once the previous Safe read has settled and the spacing since its start has passed. */
export function queueSafeRead<T>(read: () => Promise<T>): Promise<T> {
  const turn = previousTurn.then(read)
  previousTurn = previousTurn.then(() => Promise.allSettled([turn, wait(SAFE_READ_SPACING_MS)]))
  return turn
}
