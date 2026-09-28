"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";

type Hit = { title: string; slug: string; authorName: string | null };

export function SearchBox({ initial = "", labelledBy }: { initial?: string; labelledBy?: string }) {
  const [value, setValue] = useState(initial);
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const listId = useId();
  const router = useRouter();

  useEffect(() => {
    if ([...value.trim()].length < 2) {
      setHits([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(value.trim())}`, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error("fail");
          return response.json();
        })
        .then((data: { items?: Hit[] }) => {
          setHits(data.items || []);
          setError("");
          setOpen(true);
        })
        .catch((reason: unknown) => {
          if ((reason as { name?: string }).name === "AbortError") return;
          setError("تعذّر البحث. حاول مرة أخرى.");
        });
    }, 160);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [value]);

  return (
    <div className="search-field">
      <label className="sr" htmlFor={`${listId}-input`}>
        البحث في القصص
      </label>
      <input
        id={`${listId}-input`}
        name="q"
        value={value}
        placeholder="عنوان، مؤلف، تصنيف"
        aria-labelledby={labelledBy}
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      />
      <button type="submit">بحث</button>
      {error ? <p role="alert">{error}</p> : null}
      {open && hits.length > 0 ? (
        <ul id={listId} className="suggest" role="listbox">
          {hits.map((hit) => (
            <li key={hit.slug} role="option">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(`/stories/${hit.slug}`);
                }}
              >
                {hit.title}
                {hit.authorName ? <span className="muted"> · {hit.authorName}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
