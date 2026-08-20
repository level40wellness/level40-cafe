import { BlogManager } from "@/components/admin/blog-manager";
import { getAdminBlogPosts } from "@/server/queries/blog";

export default async function AdminBlogPage() {
  const posts = await getAdminBlogPosts();

  return <BlogManager items={posts} />;
}
