import { describe, it, expect } from 'vitest'
import { ref, nextTick } from 'vue'
import { useFacetFilter } from '@/composables/useFacetFilter'

interface Item {
  tag: string
}

const item = (tag: string): Item => ({ tag })

const tagsOf = (items: readonly Item[]) => [...new Set(items.map((i) => i.tag))].sort()
const byTag = (items: readonly Item[], tags: readonly string[]) =>
  items.filter((i) => tags.includes(i.tag))

function setup(initial: Item[]) {
  const feed = ref<Item[]>(initial)
  return { feed, filter: useFacetFilter(() => feed.value, tagsOf, byTag) }
}

describe('useFacetFilter', () => {
  it('derives the options from the feed and starts with everything selected', () => {
    const { filter } = setup([item('a'), item('b'), item('a')])
    expect(filter.available.value).toEqual(['a', 'b'])
    expect(filter.selected.value).toEqual(['a', 'b'])
  })

  it('hides the selector until there are two options to choose between', () => {
    expect(setup([item('a'), item('a')]).filter.show.value).toBe(false)
    expect(setup([item('a'), item('b')]).filter.show.value).toBe(true)
  })

  it('narrows nothing while every option is selected', () => {
    const { feed, filter } = setup([item('a'), item('b')])
    expect(filter.active.value).toBeNull()
    // Passed through by reference — no needless copy of the feed.
    expect(filter.result.value).toBe(feed.value)
  })

  it('narrows the feed to a subset of the options', async () => {
    const { filter } = setup([item('a'), item('b')])
    filter.selected.value = ['b']
    await nextTick()
    expect(filter.active.value).toEqual(['b'])
    expect(filter.result.value).toEqual([item('b')])
  })

  it('stays on "all" as new options stream in', async () => {
    const { feed, filter } = setup([item('a'), item('b')])
    feed.value = [...feed.value, item('c')]
    await nextTick()
    expect(filter.selected.value).toEqual(['a', 'b', 'c'])
    expect(filter.active.value).toBeNull()
  })

  it('keeps a partial selection that is still present in the feed', async () => {
    const { feed, filter } = setup([item('a'), item('b'), item('c')])
    filter.selected.value = ['a', 'b']
    feed.value = [item('a'), item('c')]
    await nextTick()
    expect(filter.selected.value).toEqual(['a'])
  })

  it('falls back to everything when the selection is no longer in the feed', async () => {
    const { feed, filter } = setup([item('a'), item('b'), item('c')])
    filter.selected.value = ['a']
    feed.value = [item('b'), item('c')]
    await nextTick()
    expect(filter.selected.value).toEqual(['b', 'c'])
    expect(filter.active.value).toBeNull()
  })
})
