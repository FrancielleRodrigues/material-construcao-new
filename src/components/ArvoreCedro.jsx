// A árvore da marca Cedro (a mesma do favicon em public/favicon.svg), preenchida com a cor do texto.
export function ArvoreCedro({ size = 20, className = "" }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} fill="currentColor" aria-hidden="true">
      <path d="M32 9 L45 26 H38 L48 39 H36 V51 H28 V39 H16 L26 27 H19 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
