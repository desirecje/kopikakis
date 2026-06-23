import { useState, useRef, useEffect } from "react";
import { NUS_COURSES } from "@/lib/nus-courses";

// A searchable course dropdown. Type to filter NUS courses, click to select.
export function CourseSelect({
  value,
  onChange,
  placeholder = "Search your course...",
}: {
  value: string;
  onChange: (course: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Keep the input text in sync when value changes from outside (e.g. pre-fill)
  useEffect(() => { setQuery(value); }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = NUS_COURSES.filter((c) =>
    c.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="w-full rounded-xl border border-[rgba(92,51,23,0.2)] bg-[#EDE8DC] px-4 py-2.5 text-sm text-[#3A2410] placeholder:text-[#7A6A55] outline-none focus:ring-2 focus:ring-[#5C3317]/30"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-[rgba(92,51,23,0.2)] bg-[#FAF6EF] shadow-lg">
          {filtered.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { onChange(c); setQuery(c); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm text-[#3A2410] hover:bg-[#E0D9C8] border-b border-[rgba(92,51,23,0.08)] last:border-0"
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
