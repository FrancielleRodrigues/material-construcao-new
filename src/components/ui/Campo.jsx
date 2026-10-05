export function Campo({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-stone-600 mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
