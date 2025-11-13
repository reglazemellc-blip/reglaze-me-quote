export type SectionConfig = { title: string; hidden?: boolean }
export type PageLayout = { sections: Record<string, SectionConfig> }
export type LayoutState = { editMode: boolean; pages: Record<string, PageLayout> }

const KEY = 'layout-state-v1'

function read(): LayoutState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { editMode: false, pages: {} }
}

function write(state: LayoutState) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function getLayoutState(): LayoutState { return read() }

export function setEditMode(on: boolean) {
  const s = read(); s.editMode = on; write(s); return s
}

export function ensurePage(page: string) {
  const s = read(); if (!s.pages[page]) s.pages[page] = { sections: {} }; write(s); return s
}

export function renameSection(page: string, key: string, title: string) {
  const s = ensurePage(page)
  s.pages[page].sections[key] = { ...(s.pages[page].sections[key] || { title }), title }
  write(s)
  return s.pages[page].sections[key]
}

export function removeSection(page: string, key: string) {
  const s = ensurePage(page)
  const prev = s.pages[page].sections[key] || { title: key }
  s.pages[page].sections[key] = { ...prev, hidden: true }
  write(s)
  return s.pages[page].sections[key]
}

export function restoreSection(page: string, key: string) {
  const s = ensurePage(page)
  if (s.pages[page].sections[key]) { s.pages[page].sections[key].hidden = false; write(s) }
}

export function addSection(page: string, title: string) {
  const s = ensurePage(page)
  const key = `custom-${crypto.randomUUID()}`
  s.pages[page].sections[key] = { title }
  write(s)
  return key
}

export function getSectionConfig(page: string, key: string, fallbackTitle: string): SectionConfig {
  const s = read()
  return s.pages[page]?.sections?.[key] || { title: fallbackTitle }
}

