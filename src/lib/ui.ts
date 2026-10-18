import { create } from 'zustand';

export interface MenuItem { label: string; onSelect: () => void; danger?: boolean }
export type MenuEntry = MenuItem | 'sep';
export interface Field { name: string; label: string; value?: string; placeholder?: string; required?: boolean }
export interface ListOption { id: string; label: string; sub?: string }
type Modal =
  | { kind: 'form'; title: string; fields: Field[]; ok: string; resolve: (v: Record<string, string> | null) => void }
  | { kind: 'list'; title: string; options: ListOption[]; resolve: (id: string | null) => void }
  | { kind: 'confirm'; title: string; body: string; ok: string; danger?: boolean; resolve: (v: boolean) => void };

interface UI {
  toast: string; toastKey: number; say: (m: string) => void;
  menu: { items: MenuEntry[]; x: number; y: number; w: number } | null;
  openMenu: (e: { currentTarget: Element } | { clientX: number; clientY: number }, items: MenuEntry[]) => void; closeMenu: () => void;
  modal: Modal | null;
  form: (title: string, fields: Field[], ok?: string) => Promise<Record<string, string> | null>;
  pick: (title: string, options: ListOption[]) => Promise<string | null>;
  confirm: (title: string, body: string, ok?: string, danger?: boolean) => Promise<boolean>;
  closeModal: () => void;
  sheet: boolean; tab: 'now' | 'fx' | 'queue'; openSheet: (tab?: 'now' | 'fx' | 'queue') => void; closeSheet: () => void;
}

export const useUI = create<UI>((set, get) => ({
  toast: '', toastKey: 0,
  say: m => { set({ toast: m, toastKey: Date.now() }); },
  menu: null,
  openMenu: (e, items) => {
    let x: number, y: number, w = 0;
    if ('currentTarget' in e) { const r = e.currentTarget.getBoundingClientRect(); x = r.right; y = r.bottom; w = r.width; } else { x = e.clientX; y = e.clientY; }
    set({ menu: { items, x, y, w } });
  },
  closeMenu: () => set({ menu: null }),
  modal: null,
  form: (title, fields, ok = 'Save') => new Promise(resolve => set({ modal: { kind: 'form', title, fields, ok, resolve } })),
  pick: (title, options) => new Promise(resolve => set({ modal: { kind: 'list', title, options, resolve } })),
  confirm: (title, body, ok = 'Confirm', danger = false) => new Promise(resolve => set({ modal: { kind: 'confirm', title, body, ok, danger, resolve } })),
  closeModal: () => set({ modal: null }),
  sheet: false, tab: 'now',
  openSheet: tab => set({ sheet: true, tab: tab ?? get().tab }),
  closeSheet: () => set({ sheet: false }),
}));
