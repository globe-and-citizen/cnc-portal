import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import MarkdownEditor from '@/components/MarkdownEditor.vue'

// The real UEditor is a TipTap/ProseMirror WYSIWYG editor that is heavy and
// unstable under jsdom, so we stub it (and its toolbar) to a plain element that
// still forwards attrs and exposes the slotted editor. UTextarea is stubbed to
// a bare <textarea> so we can drive the raw-Markdown round-trip deterministically.
vi.mock('@nuxt/ui/components/Editor.vue', () => ({
  default: {
    name: 'UEditor',
    props: ['modelValue', 'contentType', 'placeholder'],
    emits: ['update:modelValue'],
    template: '<div><slot :editor="{}" /></div>'
  }
}))

vi.mock('@nuxt/ui/components/EditorToolbar.vue', () => ({
  default: {
    name: 'UEditorToolbar',
    props: ['editor', 'items'],
    template: '<div data-test="editor-toolbar" />'
  }
}))

vi.mock('@nuxt/ui/components/Textarea.vue', () => ({
  default: {
    name: 'UTextarea',
    props: ['modelValue', 'placeholder', 'rows', 'autoresize', 'ui'],
    emits: ['update:modelValue'],
    template:
      '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  }
}))

const factory = (modelValue = '') => mount(MarkdownEditor, { props: { modelValue } })

describe('MarkdownEditor', () => {
  it('starts in Write mode showing the WYSIWYG editor, not the raw source', () => {
    const wrapper = factory('# hi')

    expect(wrapper.find('[data-test="markdown-editor-wysiwyg"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="markdown-editor-source"]').exists()).toBe(false)
  })

  it('switches to the raw Markdown source when the Markdown tab is clicked', async () => {
    const wrapper = factory('# hi')

    await wrapper.find('[data-test="markdown-editor-tab-markdown"]').trigger('click')

    expect(wrapper.find('[data-test="markdown-editor-source"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="markdown-editor-wysiwyg"]').exists()).toBe(false)
  })

  it('shows the current value in the source view and round-trips edits back out', async () => {
    const wrapper = factory('- a\n- b')

    await wrapper.find('[data-test="markdown-editor-tab-markdown"]').trigger('click')
    const textarea = wrapper.find('textarea')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('- a\n- b')

    await textarea.setValue('## new goals')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['## new goals'])
  })
})
