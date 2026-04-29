"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Customer = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  no_show_count: number | null;
  no_show_flag: boolean | null;
  last_visit_date: string | null;
  created_at: string;
};

export function MusterijeClient({ customers, initialSearch }: { customers: Customer[]; initialSearch: string }) {
  const [q, setQ] = useState(initialSearch);
  const router = useRouter();

  // L9: 250ms debounce so fast typers don't hammer the RSC fetch on every keystroke.
  useEffect(() => {
    if (q === initialSearch) return; // initial render — already on the URL
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      router.push(`/admin/musterije?${params.toString()}`);
    }, 250);
    return () => clearTimeout(t);
  }, [q, initialSearch, router]);

  function search(value: string) {
    setQ(value);
  }

  return (
    <>
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">
            <span data-sr>МУШТЕРИЈЕ</span>
            <span data-lat>MUŠTERIJE</span>
          </div>
          <div className="adm-page-subtitle">
            <span data-sr>{customers.length} укупно</span>
            <span data-lat>{customers.length} ukupno</span>
          </div>
        </div>
      </div>

      <input
        className="adm-input"
        placeholder="Pretraga po telefonu ili imenu…"
        value={q}
        onChange={(e) => search(e.target.value)}
        type="search"
        style={{ marginBottom: 16 }}
      />

      {customers.length === 0 && (
        <div className="adm-empty">
          {q ? (
            <>
              <span data-sr>Нема резултата за &ldquo;{q}&rdquo;</span>
              <span data-lat>Nema rezultata za &ldquo;{q}&rdquo;</span>
            </>
          ) : (
            <>
              <span data-sr>Још нема муштерија.</span>
              <span data-lat>Još nema mušterija.</span>
            </>
          )}
        </div>
      )}

      {customers.map((c) => {
        const initials = (c.name ?? "?")
          .split(" ")
          .map((p) => p[0])
          .filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase();
        const daysSince = c.last_visit_date
          ? Math.round((Date.now() - new Date(c.last_visit_date).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        return (
          <Link key={c.id} href={`/admin/musterije/${c.id}`} className="adm-card" style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", background: "var(--brown-700)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Oswald', sans-serif", fontSize: 13, color: "var(--cream)", flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--cream)", letterSpacing: ".04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.name ?? "(no name)"}
                {c.no_show_flag && <span style={{ color: "var(--danger)", marginLeft: 6, fontSize: 11 }}>⚠</span>}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(245,233,208,.5)" }}>
                {c.phone}
              </div>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(245,233,208,.4)", textAlign: "right" }}>
              {daysSince != null ? `${daysSince}d` : "—"}
              {c.no_show_count != null && c.no_show_count > 0 && (
                <div style={{ color: "var(--danger)", marginTop: 2 }}>
                  {c.no_show_count} no-show
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </>
  );
}
