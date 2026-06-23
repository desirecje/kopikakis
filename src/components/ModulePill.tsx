import { modulePillClass } from "@/lib/module-colors";

// A single colour-coded module pill (read-only)
export function ModulePill({ code }: { code: string }) {
  return <span className={modulePillClass(code)}>{code}</span>;
}

// A removable module pill (for editors)
export function ModulePillRemovable({ code, onRemove }: { code: string; onRemove: () => void }) {
  return (
    <span className={`${modulePillClass(code)} inline-flex items-center gap-1`}>
      {code}
      <button onClick={onRemove} type="button" className="opacity-70 hover:opacity-100">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </span>
  );
}
