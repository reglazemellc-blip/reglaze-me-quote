import { create } from 'zustand'
import type { LayoutState, SectionConfig } from '@utils/layoutManager'
import { getLayoutState, setEditMode, renameSection, removeSection, restoreSection, addSection, getSectionConfig } from '@utils/layoutManager'

type LayoutStore = LayoutState & {
  toggle: () => void
  rename: (page: string, key: string, title: string) => SectionConfig
  remove: (page: string, key: string) => SectionConfig
  restore: (page: string, key: string) => void
  add: (page: string, title: string) => string
  section: (page: string, key: string, fallback: string) => SectionConfig
}

export const useLayoutStore = create<LayoutStore>((set, get) => ({
  ...getLayoutState(),
  toggle: () => {
    const on = !get().editMode
    const s = setEditMode(on)
    set({ editMode: s.editMode, pages: s.pages })
  },
  rename: (page, key, title) => {
    const res = renameSection(page, key, title)
    set({ ...getLayoutState() })
    return res
  },
  remove: (page, key) => {
    const res = removeSection(page, key)
    set({ ...getLayoutState() })
    return res
  },
  restore: (page, key) => {
    restoreSection(page, key)
    set({ ...getLayoutState() })
  },
  add: (page, title) => {
    const id = addSection(page, title)
    set({ ...getLayoutState() })
    return id
  },
  section: (page, key, fallback) => getSectionConfig(page, key, fallback)
}))

