import { useEffect, useState } from 'react';

/** Tiny shared store for the "compare up to 3 plans" selection. */
let selected: string[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const compareStore = {
  get: () => selected,
  toggle(id: string): boolean { // returns false when the limit blocks adding
    if (selected.includes(id)) selected = selected.filter((x) => x !== id);
    else if (selected.length >= 3) return false;
    else selected = [...selected, id];
    emit(); return true;
  },
  set(ids: string[]) { selected = ids.slice(0, 3); emit(); },
  clear() { selected = []; emit(); },
};
export function useCompare() {
  const [, force] = useState(0);
  useEffect(() => { const l = () => force((n) => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  return { selected, ...compareStore };
}
