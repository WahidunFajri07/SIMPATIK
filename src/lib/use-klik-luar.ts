import { useEffect, useRef } from "react";

export function useKlikDiLuar<T extends HTMLElement>(
  terbuka: boolean,
  tutup: () => void,
) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!terbuka) return;
    function cek(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !ref.current?.contains(target)) tutup();
    }
    document.addEventListener("pointerdown", cek);
    return () => document.removeEventListener("pointerdown", cek);
  }, [terbuka, tutup]);
  return ref;
}
