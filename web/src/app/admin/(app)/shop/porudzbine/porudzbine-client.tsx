"use client";

import { useState, useTransition } from "react";
import { updateOrderStatus } from "./actions";

type Order = {
  id: string;
  total: number;
  status: string;
  pickup_note: string | null;
  items: { id?: string; name?: string; quantity?: number; price?: number }[];
  created_at: string;
  customers: { name: string | null; phone: string; email: string | null } | null;
};

const STATUSES = [
  { value: "pending", sr: "ЧЕКА", lat: "ČEKA" },
  { value: "ready", sr: "СПРЕМНО", lat: "SPREMNO" },
  { value: "picked_up", sr: "ПОДИГНУТО", lat: "PODIGNUTO" },
  { value: "cancelled", sr: "ОТКАЗАНО", lat: "OTKAZANO" },
] as const;

// L8: enforce a sane state machine on the buttons.
// pending → ready / cancelled
// ready → picked_up / cancelled
// picked_up → (terminal)
// cancelled → (terminal, allow re-pending via DB if needed)
const ALLOWED_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  pending: new Set(["ready", "cancelled"]),
  ready: new Set(["picked_up", "cancelled"]),
  picked_up: new Set([]),
  cancelled: new Set([]),
};

export function PorudzbineClient({ orders }: { orders: Order[] }) {
  const [selected, setSelected] = useState<Order | null>(null);

  const pending = orders.filter((o) => o.status === "pending").length;

  return (
    <>
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">
            <span data-sr>ПОРУЏБИНЕ</span><span data-lat>PORUDŽBINE</span>
          </div>
          <div className="adm-page-subtitle">
            <span data-sr>{pending} чека · {orders.length} укупно</span>
            <span data-lat>{pending} čeka · {orders.length} ukupno</span>
          </div>
        </div>
      </div>

      {orders.length === 0 && (
        <div className="adm-empty">
          <span data-sr>Нема поруџбина.</span>
          <span data-lat>Nema porudžbina.</span>
        </div>
      )}

      {orders.map((o) => {
        const status = STATUSES.find((s) => s.value === o.status);
        return (
          <div key={o.id} className="adm-card" onClick={() => setSelected(o)}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, fontWeight: 600, color: "var(--cream)" }}>
                {o.customers?.name ?? "—"}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(245,233,208,.4)" }}>
                {o.customers?.phone} · {new Date(o.created_at).toLocaleDateString("sr-RS")} · {(o.items ?? []).length} stavk.
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontStyle: "italic", color: "var(--mustard)" }}>{o.total} RSD</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "rgba(245,233,208,.5)", letterSpacing: ".06em" }}>
                <span data-sr>{status?.sr}</span><span data-lat>{status?.lat}</span>
              </div>
            </div>
          </div>
        );
      })}

      {selected && <OrderDetail order={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function OrderDetail({ order, onClose }: { order: Order; onClose: () => void }) {
  const [pending, start] = useTransition();
  return (
    <div className="adm-sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-sheet">
        <div className="adm-sheet-handle" />
        <div className="adm-sheet-title">
          <span data-sr>ПОРУЏБИНА</span>
          <span data-lat>PORUDŽBINA</span>
        </div>
        <div style={{ padding: "0 20px 16px" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontStyle: "italic", color: "var(--cream)", marginBottom: 4 }}>
            {order.customers?.name ?? "—"}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--mustard)", marginBottom: 16 }}>
            <a href={`tel:${order.customers?.phone}`} style={{ color: "inherit", textDecoration: "none" }}>{order.customers?.phone}</a>
          </div>

          {(order.items ?? []).map((it, i) => (
            <div key={i} className="adm-row">
              <span style={{ flex: 1, color: "var(--cream)", fontSize: 13 }}>{it.quantity} × {it.name}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--mustard)" }}>{(it.price ?? 0) * (it.quantity ?? 1)} RSD</span>
            </div>
          ))}

          <div className="adm-row">
            <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: "var(--cream)", letterSpacing: ".08em" }}>
              <span data-sr>УКУПНО</span><span data-lat>UKUPNO</span>
            </span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontStyle: "italic", color: "var(--mustard)" }}>{order.total} RSD</span>
          </div>

          {order.pickup_note && (
            <div className="adm-banner info" style={{ marginTop: 12 }}>
              <strong><span data-sr>Напомена:</span><span data-lat>Napomena:</span></strong> {order.pickup_note}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
            {STATUSES.map((s) => {
              const allowed = ALLOWED_TRANSITIONS[order.status]?.has(s.value);
              const isCurrent = order.status === s.value;
              const disabled = pending || isCurrent || !allowed;
              return (
                <button
                  key={s.value}
                  className={`adm-btn ${isCurrent ? "" : "adm-btn-secondary"}`}
                  disabled={disabled}
                  style={!allowed && !isCurrent ? { opacity: 0.3 } : undefined}
                  onClick={() => start(async () => { await updateOrderStatus(order.id, s.value); onClose(); })}
                >
                  <span data-sr>{s.sr}</span><span data-lat>{s.lat}</span>
                </button>
              );
            })}
          </div>
          {(order.status === "picked_up" || order.status === "cancelled") && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(245,233,208,.4)", marginTop: 8, textAlign: "center" }}>
              <span data-sr>Поруџбина је затворена.</span>
              <span data-lat>Porudžbina je zatvorena.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
