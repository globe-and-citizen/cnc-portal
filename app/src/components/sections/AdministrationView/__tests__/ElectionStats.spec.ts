import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ElectionStats from '../ElectionStats.vue'

// Lightweight stub to capture props passed to the child cards
const CardStub = {
  name: 'ElectionStatsCard',
  props: ['data', 'icon', 'bgColor', 'textColor', 'title', 'color'],
  template: '<div data-test="card" :data-title="title" :data-data="String(data)"></div>'
}

describe('ElectionStats', () => {
  const formattedElection = {
    id: 1,
    title: 'Test Election',
    description: 'desc',
    createdBy: '0xabc',
    startDate: new Date('2025-12-01T10:30:00Z'),
    endDate: new Date('2025-12-02T15:45:00Z'),
    seatCount: 3,
    resultsPublished: false,
    votesCast: 10,
    candidates: 5,
    voters: 20
  }

  it('renders four stat cards with correct data and titles', () => {
    const wrapper = mount(ElectionStats, {
      props: { formattedElection },
      global: {
        stubs: {
          ElectionStatsCard: CardStub
        }
      }
    })

    const cards = wrapper.findAll('[data-test="card"]')
    expect(cards).toHaveLength(4)

    // Seat / Candidates (first card)
    const seatData = cards[0].attributes('data-data')
    expect(seatData).toBe(`${formattedElection.seatCount} / ${formattedElection.candidates}`)

    // Start Date (second card)
    const formatDate = (date: Date) =>
      date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

    const startData = cards[1].attributes('data-data')
    expect(startData).toBe(formatDate(formattedElection.startDate))

    // End Date (third card)
    const endData = cards[2].attributes('data-data')
    expect(endData).toBe(formatDate(formattedElection.endDate))

    // Votes Cast / Voters (fourth card)
    const votesData = cards[3].attributes('data-data')
    expect(votesData).toBe(`${formattedElection.votesCast} / ${formattedElection.voters}`)

    // Titles order
    const titles = cards.map((c) => c.attributes('data-title'))
    expect(titles).toEqual(['Seat/Candidates', 'Start Date', 'End Date', 'Votes Cast/Voters'])
  })
})
