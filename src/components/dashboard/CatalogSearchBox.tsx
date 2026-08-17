"use client";

import { useEffect, useRef, useState, useTransition } from "react";

type CatalogSearchBoxProps<T> = {
  placeholder: string;
  searchUrl: (query: string) => string;
  getKey: (item: T) => string;
  renderResult: (item: T) => { label: string; sublabel?: string; imageUrl: string | null };
  onSelect: (item: T) => Promise<void>;
};

/** Generic debounced "search external catalog, click a result to add it" box. */
export function CatalogSearchBox<T>({
  placeholder,
  searchUrl,
  getKey,
  renderResult,
  onSelect,
}: CatalogSearchBoxProps<T>) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    const requestId = ++requestIdRef.current;

    // Every state update below runs inside the (async) timer callback,
    // never synchronously in the effect body itself — deferring it this
    // way is what keeps this a genuine side effect rather than the
    // derived-state-in-an-effect anti-pattern React's linter flags.
    const timer = setTimeout(async () => {
      if (trimmed.length < 2) {
        setResults([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(searchUrl(trimmed));
        if (requestId !== requestIdRef.current) return; // a newer keystroke superseded this
        if (!res.ok) throw new Error("Search failed");
        const data = (await res.json()) as { results: T[] };
        setResults(data.results);
        setError(null);
      } catch {
        if (requestId === requestIdRef.current) setError("Search failed — try again.");
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchUrl]);

  async function handleSelect(item: T) {
    setOpen(false);
    setQuery("");
    setResults([]);
    startTransition(async () => {
      await onSelect(item);
    });
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // Delay closing so a click on a result registers before the blur hides it.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={`w-full rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent ${
          isPending ? "opacity-60" : ""
        }`}
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-black/10 bg-background shadow-lg dark:border-white/20">
          {loading && (
            <p className="px-3 py-2 text-sm text-black/40 dark:text-white/40">Searching…</p>
          )}
          {!loading && error && <p className="px-3 py-2 text-sm text-red-600">{error}</p>}
          {!loading && !error && results.length === 0 && (
            <p className="px-3 py-2 text-sm text-black/40 dark:text-white/40">No results.</p>
          )}
          {!loading &&
            !error &&
            results.map((item) => {
              const { label, sublabel, imageUrl } = renderResult(item);
              return (
                <button
                  key={getKey(item)}
                  type="button"
                  // onMouseDown fires before the input's onBlur, so the click
                  // isn't lost to the dropdown closing first.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(item);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                >
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                  ) : (
                    <span className="h-8 w-8 shrink-0 rounded bg-black/10 dark:bg-white/10" />
                  )}
                  <span className="flex-1 truncate">
                    {label}
                    {sublabel && (
                      <span className="ml-2 text-black/50 dark:text-white/50">{sublabel}</span>
                    )}
                  </span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
