"use client";

import { useState } from "react";

type Item = { id: string; alt: string };

export function MediaPicker({
  name,
  label,
  selected,
  items,
}: {
  name: string;
  label: string;
  selected?: string | null;
  items: Item[];
}) {
  const [current, setCurrent] = useState(selected || "");
  const [list, setList] = useState(items);
  const [alt, setAlt] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");

  function upload(file: File | undefined) {
    if (!file) return;
    if (!alt.trim()) {
      setError("أضف وصفًا مختصرًا للصورة قبل الرفع.");
      return;
    }
    const data = new FormData();
    data.set("file", file);
    data.set("alt", alt.trim());
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/media");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      setProgress(null);
      let body: { id?: string; alt?: string; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText || "{}");
      } catch {
        body = {};
      }
      if (xhr.status >= 400 || !body.id) {
        setError(body.error || "تعذّر رفع الصورة.");
        return;
      }
      setList((prev) => [{ id: body.id!, alt: body.alt || alt.trim() }, ...prev]);
      setCurrent(body.id);
      setError("");
      setAlt("");
    };
    xhr.onerror = () => {
      setProgress(null);
      setError("تعذّر الاتصال أثناء الرفع.");
    };
    xhr.send(data);
  }

  return (
    <div className="stack">
      <span>{label}</span>
      <input type="hidden" name={name} value={current} />
      <div className="picker-grid">
        <button type="button" aria-checked={current === ""} onClick={() => setCurrent("")}>
          بدون صورة
        </button>
        {list.slice(0, 16).map((item) => (
          <button key={item.id} type="button" aria-checked={current === item.id} onClick={() => setCurrent(item.id)}>
            <img src={`/api/media/${item.id}`} alt={item.alt} />
          </button>
        ))}
      </div>
      <label>
        وصف الصورة
        <input value={alt} onChange={(event) => setAlt(event.target.value)} placeholder="مثال: غلاف قصة النهر" />
      </label>
      <label>
        رفع صورة
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => upload(event.target.files?.[0])}
        />
      </label>
      {progress !== null ? <progress value={progress} max={100}>{progress}٪</progress> : null}
      {error ? <p className="notice error" role="alert">{error}</p> : null}
    </div>
  );
}
