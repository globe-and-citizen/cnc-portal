import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AvatarGroup from '@/components/sections/CompaniesView/AvatarGroup.vue'

describe('AvatarGroup', () => {
  const members = [
    { name: 'Alice', address: '0x1', imageUrl: 'https://example.com/a.png' },
    { name: 'Bob', address: '0x2' },
    { name: 'Carol', address: '0x3' },
    { name: 'Dave', address: '0x4' },
    { name: 'Erin', address: '0x5' }
  ]

  const avatars = (wrapper: ReturnType<typeof mount>) =>
    wrapper.findAll('[data-test="avatar-group-item"]')

  it('renders the root with a data-test attribute', () => {
    const wrapper = mount(AvatarGroup, { props: { members } })
    expect(wrapper.find('[data-test="avatar-group"]').exists()).toBe(true)
  })

  it('renders at most `max` avatars (default 3)', () => {
    const wrapper = mount(AvatarGroup, { props: { members } })
    expect(avatars(wrapper)).toHaveLength(3)
  })

  it('honors a custom max', () => {
    const wrapper = mount(AvatarGroup, { props: { members, max: 4 } })
    expect(avatars(wrapper)).toHaveLength(4)
  })

  it('renders every avatar when count is at or below max', () => {
    const wrapper = mount(AvatarGroup, { props: { members: members.slice(0, 2) } })
    expect(avatars(wrapper)).toHaveLength(2)
    expect(wrapper.find('[data-test="avatar-overflow"]').exists()).toBe(false)
  })

  it('shows a +N overflow chip when members exceed max', () => {
    const wrapper = mount(AvatarGroup, { props: { members, max: 3 } })
    const overflow = wrapper.find('[data-test="avatar-overflow"]')
    expect(overflow.exists()).toBe(true)
    expect(overflow.text()).toBe('+2')
  })

  it('uses imageUrl as the avatar image source when present', () => {
    const wrapper = mount(AvatarGroup, { props: { members } })
    expect(avatars(wrapper)[0].attributes('src')).toBe('https://example.com/a.png')
    expect(avatars(wrapper)[0].attributes('alt')).toBe('Alice')
  })

  it('derives initials for members without an image', () => {
    const wrapper = mount(AvatarGroup, { props: { members } })
    expect(avatars(wrapper)[1].attributes('src')).toBeUndefined()
    expect(avatars(wrapper)[1].text()).toBe('BO')
  })

  it('forwards the size prop to the avatars', () => {
    const sm = mount(AvatarGroup, { props: { members, size: 'sm' } })
    const md = mount(AvatarGroup, { props: { members, size: 'md' } })
    const smWidth = avatars(sm)[0].attributes('width')
    const mdWidth = avatars(md)[0].attributes('width')
    expect(smWidth).toBeDefined()
    expect(mdWidth).toBeDefined()
    expect(Number(mdWidth)).toBeGreaterThan(Number(smWidth))
  })

  it('handles an empty member list', () => {
    const wrapper = mount(AvatarGroup, { props: { members: [] } })
    expect(avatars(wrapper)).toHaveLength(0)
    expect(wrapper.find('[data-test="avatar-overflow"]').exists()).toBe(false)
  })
})
