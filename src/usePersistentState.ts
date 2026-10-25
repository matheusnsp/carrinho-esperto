import { useEffect, useState } from "react";

/** useState que fica salvo no navegador (localStorage). */
export function usePersistentState<T>(
  key: string,
  initial: T,
  { serialize = JSON.stringify, deserialize = JSON.parse }: { serialize?: (v: T) => string; deserialize?: (s: string) => T } = {},
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : deserialize(raw);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, serialize(value));
    } catch {
      // navegação privada ou armazenamento cheio: segue sem salvar
    }
  }, [key, value, serialize]);
  return [value, setValue] as const;
}

export const setCodec = {
  serialize: (s: Set<string>) => JSON.stringify([...s]),
  deserialize: (raw: string) => new Set<string>(JSON.parse(raw)),
};
