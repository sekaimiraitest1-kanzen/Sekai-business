"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwner } from "@/lib/auth/with-admin";
import { uploadImage, deleteFromStorage } from "@/lib/storage/upload";
import { pathFromUrl } from "@/lib/storage/url";

export type BlogPost = {
  id: string;
  slug: string;
  title_sr: string;
  title_lat: string;
  excerpt_sr: string | null;
  excerpt_lat: string | null;
  body_sr: string;
  body_lat: string;
  cover_image_url: string | null;
  published: boolean;
  published_at: string | null;
  sort_order: number;
};

export async function getBlogPosts(): Promise<BlogPost[]> {
  const session = await requireOwner();
  const sb = createAdminClient();
  const { data } = await sb
    .from("blog_posts")
    .select("id, slug, title_sr, title_lat, excerpt_sr, excerpt_lat, body_sr, body_lat, cover_image_url, published, published_at, sort_order")
    .eq("salon_id", session.salonId)
    .order("sort_order", { ascending: true });
  return (data as BlogPost[]) ?? [];
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function upsertBlogPost(input: {
  id?: string;
  title_sr: string;
  title_lat: string;
  excerpt_sr: string;
  excerpt_lat: string;
  body_sr: string;
  body_lat: string;
  published: boolean;
}) {
  const session = await requireOwner();
  const sb = createAdminClient();

  if (input.id) {
    await sb
      .from("blog_posts")
      .update({
        title_sr: input.title_sr,
        title_lat: input.title_lat,
        excerpt_sr: input.excerpt_sr,
        excerpt_lat: input.excerpt_lat,
        body_sr: input.body_sr,
        body_lat: input.body_lat,
        published: input.published,
        published_at: input.published ? new Date().toISOString() : null,
      })
      .eq("id", input.id)
      .eq("salon_id", session.salonId);
    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    revalidatePath("/");
    return { ok: true as const, id: input.id };
  }

  const slug = slugify(input.title_lat);
  const { data: maxRow } = await sb
    .from("blog_posts")
    .select("sort_order")
    .eq("salon_id", session.salonId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data: created, error } = await sb
    .from("blog_posts")
    .insert({
      salon_id: session.salonId,
      slug,
      title_sr: input.title_sr,
      title_lat: input.title_lat,
      excerpt_sr: input.excerpt_sr,
      excerpt_lat: input.excerpt_lat,
      body_sr: input.body_sr,
      body_lat: input.body_lat,
      published: input.published,
      published_at: input.published ? new Date().toISOString() : null,
      sort_order: nextOrder,
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false as const, error: error?.message ?? "INSERT_FAILED" };

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/");
  return { ok: true as const, id: created.id as string };
}

export async function deleteBlogPost(id: string) {
  const session = await requireOwner();
  const sb = createAdminClient();
  const { data: row } = await sb.from("blog_posts").select("cover_image_url").eq("id", id).eq("salon_id", session.salonId).single();
  if (row?.cover_image_url) {
    const path = pathFromUrl(row.cover_image_url, "gallery");
    if (path) await deleteFromStorage("gallery", path);
  }
  await sb.from("blog_posts").delete().eq("id", id).eq("salon_id", session.salonId);
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/");
  return { ok: true as const };
}

export async function uploadBlogCover(id: string, formData: FormData) {
  const session = await requireOwner();
  const file = formData.get("file");
  const filename = formData.get("filename");
  if (!(file instanceof Blob)) return { ok: false as const, error: "MISSING_FILE" };
  if (typeof filename !== "string" || !filename) return { ok: false as const, error: "MISSING_FILENAME" };

  const upload = await uploadImage("gallery", file, filename);
  if (!upload.ok) return { ok: false as const, error: upload.error };

  const sb = createAdminClient();
  await sb.from("blog_posts").update({ cover_image_url: upload.url }).eq("id", id).eq("salon_id", session.salonId);
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return { ok: true as const, url: upload.url };
}
