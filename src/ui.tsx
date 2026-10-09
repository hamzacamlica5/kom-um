import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { tl, STATUS_LABEL } from "./lib/format";

// ---------- Toast ----------
const ToastCtx = createContext<(msg: string, kind?: "ok" | "err") => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastHost({ children }: { children: React.ReactNode }) {
  const [t, setT] = useState<{ msg: string; kind: string; id: number } | null>(null);
  const show = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    const id = Date.now(); setT({ msg, kind, id });
    setTimeout(() => setT((cur) => (cur && cur.id === id ? null : cur)), kind === "err" ? 5000 : 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {t && <div className={"toast toast-" + t.kind} role="status" onClick={() => setT(null)}>{t.msg}</div>}
    </ToastCtx.Provider>
  );
}

// ---------- Veri yükleme ----------
export function useLoad<T>(fn: () => Promise<T>, deps: any[]) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const seq = useRef(0);
  const reload = useCallback(() => {
    const my = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    fn().then(
      (data) => my === seq.current && setState({ data, loading: false }),
      (e) => my === seq.current && setState((s) => ({ ...s, loading: false, error: e?.message || "Yüklenemedi" }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

// Bir işlemi çalıştırır; hata olursa toast gösterir.
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn: () => Promise<any>, okMsg?: string) => {
    setBusy(true);
    try { const r = await fn(); if (okMsg) toast(okMsg); return r ?? true; }
    catch (e: any) { toast(e?.message || "Bir şeyler ters gitti.", "err"); return undefined; }
    finally { setBusy(false); }
  }, [toast]);
  return { busy, run };
}

// ---------- Parçalar ----------
export function Money({ v, sign, className = "" }: { v: number | string | null | undefined; sign?: "in" | "out"; className?: string }) {
  return <span className={"money " + (sign ? "money-" + sign + " " : "") + className}>{sign === "in" ? "+" : sign === "out" ? "−" : ""}{tl(v)}</span>;
}

export function Badge({ s }: { s: string }) {
  return <span className={"badge badge-" + s}>{STATUS_LABEL[s] || s}</span>;
}

export function Loading() { return <div className="loading" aria-label="Yükleniyor"><span /><span /><span /></div>; }

export function ErrorBox({ msg, retry }: { msg: string; retry?: () => void }) {
  return <div className="errorbox"><p>{msg}</p>{retry && <button className="btn btn-ghost btn-sm" onClick={retry}>Tekrar dene</button>}</div>;
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return <div className="empty"><b>{title}</b>{children && <p>{children}</p>}</div>;
}

export function PageHead({ title, sub, action }: { title: string; sub?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <header className="pagehead">
      <div className="pagehead-text"><h1>{title}</h1>{sub && <p className="muted">{sub}</p>}</div>
      {action}
    </header>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return <label className="field"><span className="field-label">{label}</span>{children}{hint && <span className="field-hint">{hint}</span>}</label>;
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    document.body.classList.add("noscroll");
    return () => { document.removeEventListener("keydown", k); document.body.classList.remove("noscroll"); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head"><h2>{title}</h2><button className="iconbtn" onClick={onClose} aria-label="Kapat">✕</button></div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

// Gerekçe isteyen onay penceresi (iptal, ret, arşiv işlemleri)
export function ReasonSheet({ open, title, desc, confirm, onClose, onSubmit }: {
  open: boolean; title: string; desc?: React.ReactNode; confirm: string; onClose: () => void; onSubmit: (reason: string) => Promise<any>;
}) {
  const [r, setR] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setR(""); }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <form className="stack" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const ok = await onSubmit(r.trim()); setBusy(false); if (ok) onClose(); }}>
        {desc && <p className="muted">{desc}</p>}
        <Field label="Gerekçe" hint="Bu açıklama kayıt geçmişinde görünür.">
          <textarea id="reason" value={r} onChange={(e) => setR(e.target.value)} required minLength={3} rows={3} placeholder="Örn. Tutar yanlış girildi" />
        </Field>
        <button className="btn btn-danger" disabled={busy || r.trim().length < 3}>{busy ? "İşleniyor…" : confirm}</button>
      </form>
    </Sheet>
  );
}

export function FilePick({ id, file, onFile, label = "Dosya seç" }: { id: string; file: File | null; onFile: (f: File | null) => void; label?: string }) {
  return (
    <div className="filepick">
      <input id={id} type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => onFile(e.target.files?.[0] || null)} />
      <label htmlFor={id} className="btn btn-ghost btn-sm">{file ? "Değiştir" : label}</label>
      <span className="filepick-name">{file ? file.name : "PDF, JPG veya PNG · en fazla 5 MB"}</span>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="tablist">
      {options.map(([v, l]) => (
        <button key={v} type="button" role="tab" aria-selected={v === value} className={v === value ? "on" : ""} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}
