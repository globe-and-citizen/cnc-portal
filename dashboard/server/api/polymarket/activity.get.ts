import { createError, defineEventHandler, getQuery } from 'h3'
import {
  buildPolymarketActivityRequestUrl,
  PolymarketUserQueryError
} from '../../utils/polymarketActivity'

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as Record<string, unknown>

  let upstreamUrl: string
  try {
    upstreamUrl = buildPolymarketActivityRequestUrl(query)
  } catch (err) {
    if (err instanceof PolymarketUserQueryError) {
      throw createError({
        statusCode: 400,
        statusMessage: err.message
      })
    }
    throw err
  }

  const res = await fetch(upstreamUrl, {
    headers: { Accept: 'application/json' }
  })

  const bodyText = await res.text()

  if (!res.ok) {
    let data: unknown = bodyText
    try {
      data = JSON.parse(bodyText)
    } catch {
      // keep raw text
    }
    throw createError({
      statusCode: res.status >= 400 && res.status < 500 ? res.status : 502,
      statusMessage: 'Polymarket activity request failed',
      data
    })
  }

  try {
    return JSON.parse(bodyText) as unknown
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'Invalid JSON response from Polymarket'
    })
  }
})
