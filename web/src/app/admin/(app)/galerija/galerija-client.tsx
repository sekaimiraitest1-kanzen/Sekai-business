"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { compressToWebP } from "@/lib/storage/compress-client";
import { createGalleryImage, deleteGalleryImage, reorderGalleryImages, updateGalleryImage } from "./actions";

type Image = { id: string; url: string; alt_sr: string | null; alt_lat: string | null; sort_order: number; size: string };

export function GalerijaClient({ images: initialImages }: { images: Image[] }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<Image | null>(null);
  // Local copy for instant drag feedback; server-side revalidatePath catches up.
  const [images, setImages] = useState<Image[]>(initialImages);
  useEffect(() => setImages(initialImages), [initialImages]);

  // PointerSensor for desktop: 8px move before drag activates → tap-to-edit still works.
  // TouchSensor for mobile: 200ms long-press before drag → quick tap opens the editor.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = images.findIndex((img) => img.id === active.id);
    const newIdx = images.findIndex((img) => img.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(images, oldIdx, newIdx);
    setImages(next);
    start(() => {
      void reorderGalleryImages(next.map((img) => img.id));
    });
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setProgress({ done: 0, total: files.length });

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const { blob, filename } = await compressToWebP(f);
        const fd = new FormData();
        fd.append("filename", filename);
        fd.append("file", blob, filename);
        await createGalleryImage(fd);
        setProgress({ done: i + 1, total: files.length });
      } catch (err) {
        console.error("upload failed", f.name, err);
      }
    }

    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <>
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">
            <span data-sr>ГАЛЕРИЈА</span>
            <span data-lat>GALERIJA</span>
          </div>
          <div className="adm-page-subtitle">{images.length} slika</div>
        </div>
        <button className="adm-fab-btn" type="button" disabled={uploading} onClick={() => fileInput.current?.click()}>
          +
        </button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={onFileChange}
      />

      {uploading && (
        <div className="adm-banner info">
          <span data-sr>Учитавам {progress.done}/{progress.total}…</span>
          <span data-lat>Učitavam {progress.done}/{progress.total}…</span>
        </div>
      )}

      {pending && images.length > 0 && (
        <div className="adm-banner info" style={{ fontSize: 11 }}>
          <span data-sr>Чувам редослед…</span>
          <span data-lat>Čuvam redosled…</span>
        </div>
      )}

      {images.length === 0 && !uploading && (
        <div className="adm-empty">
          <span data-sr>Нема слика. Додај прву.</span>
          <span data-lat>Nema slika. Dodaj prvu.</span>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={images.map((img) => img.id)} strategy={rectSortingStrategy}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {images.map((img) => (
              <SortableGalleryTile key={img.id} image={img} onClick={() => setEditing(img)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {editing && (
        <ImageEditor
          image={editing}
          pending={pending}
          onClose={() => setEditing(null)}
          onSave={(patch) => start(async () => { await updateGalleryImage(editing.id, patch); setEditing(null); })}
          onDelete={() => start(async () => { if (confirm("Obrisi sliku?")) { await deleteGalleryImage(editing.id); setEditing(null); }})}
        />
      )}
    </>
  );
}

function SortableGalleryTile({ image: img, onClick }: { image: Image; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: "relative",
    aspectRatio: "1",
    overflow: "hidden",
    background: "var(--brown-900)",
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 2 : "auto",
    touchAction: "none",
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onClick}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img.url} alt={img.alt_sr ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
      {img.size === "large" && (
        <div style={{ position: "absolute", top: 6, left: 6, background: "var(--mustard)", color: "var(--brown-950)", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, padding: "2px 6px", letterSpacing: ".08em" }}>BIG</div>
      )}
    </div>
  );
}

function ImageEditor({ image, pending, onClose, onSave, onDelete }: {
  image: Image;
  pending: boolean;
  onClose: () => void;
  onSave: (patch: { alt_sr: string; alt_lat: string; size: "normal" | "large" }) => void;
  onDelete: () => void;
}) {
  const [altSr, setAltSr] = useState(image.alt_sr ?? "");
  const [altLat, setAltLat] = useState(image.alt_lat ?? "");
  const [size, setSize] = useState<"normal" | "large">((image.size as "normal" | "large") ?? "normal");

  return (
    <div className="adm-sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-sheet">
        <div className="adm-sheet-handle" />
        <div className="adm-sheet-title">
          <span data-sr>ИЗМЕНИ СЛИКУ</span>
          <span data-lat>IZMENI SLIKU</span>
        </div>
        <div style={{ padding: "0 20px 16px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt="" style={{ width: "100%", maxHeight: 240, objectFit: "cover", marginBottom: 12, background: "var(--brown-900)" }} />

          <label className="adm-form-label">ALT (ćir.)</label>
          <input className="adm-input" value={altSr} onChange={(e) => setAltSr(e.target.value)} placeholder="Шишање — Триша" style={{ marginBottom: 8 }} />

          <label className="adm-form-label">ALT (lat.)</label>
          <input className="adm-input" value={altLat} onChange={(e) => setAltLat(e.target.value)} placeholder="Šišanje — Vuk" style={{ marginBottom: 8 }} />

          <label className="adm-form-label">VELIČINA U GRID-U</label>
          <div className="adm-toggle" style={{ marginBottom: 12 }}>
            <button className={`adm-toggle-opt ${size === "normal" ? "active" : ""}`} onClick={() => setSize("normal")} type="button">NORMAL</button>
            <button className={`adm-toggle-opt ${size === "large" ? "active" : ""}`} onClick={() => setSize("large")} type="button">LARGE (2×2)</button>
          </div>

          <button className="adm-btn adm-btn-block" disabled={pending} onClick={() => onSave({ alt_sr: altSr, alt_lat: altLat, size })}>
            <span data-sr>САЧУВАЈ</span><span data-lat>SAČUVAJ</span>
          </button>
          <button className="adm-btn adm-btn-secondary adm-btn-block" style={{ marginTop: 8 }} onClick={onClose}>
            <span data-sr>ОТКАЖИ</span><span data-lat>OTKAŽI</span>
          </button>
          <button className="adm-btn adm-btn-danger adm-btn-block" style={{ marginTop: 8 }} disabled={pending} onClick={onDelete}>
            <span data-sr>ОБРИШИ</span><span data-lat>OBRIŠI</span>
          </button>
        </div>
      </div>
    </div>
  );
}
