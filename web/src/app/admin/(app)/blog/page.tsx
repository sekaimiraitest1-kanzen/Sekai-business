import { getBlogPosts } from "./actions";
import { BlogAdminClient } from "./blog-client";

export default async function BlogAdminPage() {
  const posts = await getBlogPosts();
  return <BlogAdminClient posts={posts} />;
}
