"use client";

import { useState, useTransition } from "react";
import { compressToWebP } from "@/lib/storage/compress-client";
import { upsertBlogPost, deleteBlogPost, uploadBlogCover, type BlogPost } from "./actions";

const EMPTY: Omit<BlogPost, "id" | "slug" | "sort_order" | "published_at" | "cover_image_url"> = {
  title_sr: "", title_lat: "", excerpt_sr: "", excerpt_lat: "", body_sr: "", body_lat: "", published: false,
};

export function BlogAdminClient({ posts: initial }: { posts: BlogPost[] }) {
  const [posts, setPosts] = useState(initial);
  const [editing, setEditing] = useState<BlogPost | "new" | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">
            <span data-sr>БЛОГ</span>
            <span data-lat>BLOG</span>
          </div>
          <div className="adm-page-subtitle">{posts.length} članaka</div>
        </div>
        <button className="adm-fab-btn" type="button" onClick={() => setEditing("new")}>+</button>
      </div>

      {posts.length === 0 && (
        <div className="adm-empty">
          <span data-sr>Нема чланака. Додај први.</span>
          <span data-lat>Nema članaka. Dodaj prvi.</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {posts.map((p) => (
          <button key={p.id} type="button" className="adm-list-row" onClick={() => setEditing(p)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left" }}>
            <div style={{ width: 56, height: 40, flexShrink: 0, background: "var(--brown-900)", overflow: "hidden" }}>
              {p.cover_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.cover_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{p.title_lat}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>/blog/{p.slug}</div>
            </div>
            <span style={{ fontSize: 10, letterSpacing: ".08em", padding: "3px 8px", background: p.published ? "var(--mustard)" : "transparent", border: p.published ? "none" : "1px solid rgba(239,233,221,.2)", color: p.published ? "var(--brown-950)" : "rgba(239,233,221,.5)" }}>
              {p.published ? "OBJAVLJEN" : "NACRT"}
            </span>
          </button>
        ))}
      </div>

      {editing && (
        <PostEditor
          post={editing === "new" ? { id: "", slug: "", sort_order: 0, published_at: null, cover_image_url: null, ...EMPTY } : editing}
          pending={pending}
          onClose={() => setEditing(null)}
          onSave={(input) => start(async () => {
            const res = await upsertBlogPost(input);
            if (res.ok) {
              const saved: BlogPost = { ...input, id: res.id, slug: editing === "new" ? "" : (editing as BlogPost).slug, sort_order: 0, published_at: input.published ? new Date().toISOString() : null, cover_image_url: editing === "new" ? null : (editing as BlogPost).cover_image_url };
              setPosts((prev) => editing === "new" ? [...prev, saved] : prev.map((p) => p.id === res.id ? { ...p, ...input } : p));
            }
            setEditing(null);
          })}
          onDelete={editing !== "new" ? () => start(async () => {
            if (confirm("Obriši članak?")) {
              await deleteBlogPost((editing as BlogPost).id);
              setPosts((prev) => prev.filter((p) => p.id !== (editing as BlogPost).id));
              setEditing(null);
            }
          }) : undefined}
          onUpload={editing !== "new" ? async (file) => {
            const { blob, filename } = await compressToWebP(file);
            const fd = new FormData();
            fd.append("filename", filename);
            fd.append("file", blob, filename);
            const res = await uploadBlogCover((editing as BlogPost).id, fd);
            if (res.ok) setPosts((prev) => prev.map((p) => p.id === (editing as BlogPost).id ? { ...p, cover_image_url: res.url } : p));
          } : undefined}
        />
      )}
    </>
  );
}

function PostEditor({ post, pending, onClose, onSave, onDelete, onUpload }: {
  post: BlogPost;
  pending: boolean;
  onClose: () => void;
  onSave: (input: { id?: string; title_sr: string; title_lat: string; excerpt_sr: string; excerpt_lat: string; body_sr: string; body_lat: string; published: boolean }) => void;
  onDelete?: () => void;
  onUpload?: (file: File) => void;
}) {
  const [titleLat, setTitleLat] = useState(post.title_lat);
  const [excerptLat, setExcerptLat] = useState(post.excerpt_lat ?? "");
  const [bodyLat, setBodyLat] = useState(post.body_lat);
  const [published, setPublished] = useState(post.published);

  return (
    <div className="adm-sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-sheet" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className="adm-sheet-handle" />
        <div className="adm-sheet-title">{post.id ? post.title_lat : "NOVI ČLANAK"}</div>
        <div style={{ padding: "0 20px 16px" }}>
          {post.id && onUpload && (
            <>
              <div style={{ width: "100%", height: 140, background: "var(--brown-900)", marginBottom: 8, overflow: "hidden" }}>
                {post.cover_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.cover_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </div>
              <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} style={{ marginBottom: 16 }} />
            </>
          )}

          <label className="adm-form-label">NASLOV</label>
          <input className="adm-input" value={titleLat} onChange={(e) => setTitleLat(e.target.value)} style={{ marginBottom: 8 }} />

          <label className="adm-form-label">KRATAK OPIS</label>
          <input className="adm-input" value={excerptLat} onChange={(e) => setExcerptLat(e.target.value)} style={{ marginBottom: 8 }} />

          <label className="adm-form-label">TEKST — prazan red = nov pasus</label>
          <textarea className="adm-input" value={bodyLat} onChange={(e) => setBodyLat(e.target.value)} rows={8} style={{ marginBottom: 12 }} />

          <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, cursor: "pointer" }}>
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            <span data-sr>Објављен</span>
            <span data-lat>Objavljen</span>
          </label>

          <button
            className="adm-btn adm-btn-block"
            disabled={pending || !titleLat.trim()}
            onClick={() => onSave({ id: post.id || undefined, title_sr: titleLat, title_lat: titleLat, excerpt_sr: excerptLat, excerpt_lat: excerptLat, body_sr: bodyLat, body_lat: bodyLat, published })}
          >
            <span data-sr>САЧУВАЈ</span><span data-lat>SAČUVAJ</span>
          </button>
          <button className="adm-btn adm-btn-secondary adm-btn-block" style={{ marginTop: 8 }} onClick={onClose}>
            <span data-sr>ОТКАЖИ</span><span data-lat>OTKAŽI</span>
          </button>
          {onDelete && (
            <button className="adm-btn adm-btn-danger adm-btn-block" style={{ marginTop: 8 }} disabled={pending} onClick={onDelete}>
              <span data-sr>ОБРИШИ</span><span data-lat>OBRIŠI</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
