import React, { useState, useEffect } from "react";
import { getPostBySlug, getRelatedPosts } from "../../services/blogServices";
import Link from "next/link";

interface Post {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  image: string;
  category: string;
  authorAvatar?: string;
  author: string;
  date: string;
  readTime: string;
  slug: string;
}

const BlogDetail = ({ slug }: { slug: string }) => {
  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const postData = await getPostBySlug(slug);
        setPost(postData as unknown as Post);
        // Fetch related posts
        const related = await getRelatedPosts(
          slug,
          (postData as unknown as Post).category
        );
        setRelatedPosts(related);

        setError(null);
      } catch (err: unknown) {
        setError((err as Error).message || "Unable to load post");
        console.error("Error fetching post:", err);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPost();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
          <p className="mt-4 text-gray-400">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-center">
          <div className="glass-card border border-red-500/30 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-red-400 mb-4">Error</h2>
            <p className="text-red-400 mb-4">{error}</p>
            <Link
              href="/blog"
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-2 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-colors inline-block"
            >
              Back to Blog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Post Not Found</h2>
          <Link
            href="/blog"
            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-colors inline-block"
          >
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] pt-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Link href="/" className="hover:text-emerald-400 transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link
              href="/blog"
              className="hover:text-emerald-400 transition-colors"
            >
              Blog
            </Link>
            <span>/</span>
            <span className="text-gray-300">{post.title}</span>
          </div>
        </nav>

        {/* Article Header */}
        <article className="glass-card border border-white/10 rounded-2xl overflow-hidden">
          {/* Cover Image */}
          <div className="relative h-96 bg-gray-200">
            <img
              src={post.image}
              alt={post.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>

            {/* Article Info Overlay */}
            <div className="absolute bottom-6 left-6 right-6">
              <div className="inline-block bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-1 rounded-full text-sm font-medium mb-4">
                {post.category}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                {post.title}
              </h1>
              <div className="flex items-center text-white/90 text-sm">
                {post.authorAvatar ? (
                  <img
                    src={post.authorAvatar}
                    alt={post.author}
                    className="w-8 h-8 rounded-full mr-3"
                  />
                ) : (
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white font-medium text-sm">
                      {post.author.charAt(0)}
                    </span>
                  </div>
                )}
                <span className="mr-4">{post.author}</span>
                <span className="mr-4">•</span>
                <span className="mr-4">{post.date}</span>
                <span className="mr-4">•</span>
                <span>{post.readTime}</span>
              </div>
            </div>
          </div>

          {/* Article Content */}
          <div className="p-8 md:p-12">
            <div
              className="prose prose-lg max-w-none 
                prose-headings:text-white prose-headings:font-bold
                prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-8
                prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-6 
                prose-h3:text-xl prose-h3:mb-3 prose-h3:mt-5
                prose-h4:text-lg prose-h4:mb-2 prose-h4:mt-4
                prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4
                prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline prose-a:font-medium
                prose-strong:text-white prose-strong:font-semibold
                prose-em:text-gray-400 prose-em:italic
                prose-ul:text-gray-300 prose-ul:mb-4 prose-ul:list-disc prose-ul:pl-6
                prose-ol:text-gray-300 prose-ol:mb-4 prose-ol:list-decimal prose-ol:pl-6
                prose-li:mb-2 prose-li:leading-relaxed
                prose-blockquote:border-l-4 prose-blockquote:border-emerald-400 prose-blockquote:pl-6 prose-blockquote:py-4 prose-blockquote:my-6 prose-blockquote:bg-white/5 prose-blockquote:rounded-r-lg prose-blockquote:italic prose-blockquote:text-gray-300
                prose-code:bg-emerald-500/20 prose-code:text-emerald-400 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-code:font-mono
                prose-pre:bg-black/50 prose-pre:text-white prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-pre:my-6 prose-pre:border prose-pre:border-white/10
                prose-pre:code:bg-transparent prose-pre:code:text-white prose-pre:code:p-0
                prose-table:w-full prose-table:border-collapse prose-table:my-6
                prose-thead:bg-white/5 
                prose-th:border prose-th:border-white/10 prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-semibold prose-th:text-white
                prose-td:border prose-td:border-white/10 prose-td:px-4 prose-td:py-3 prose-td:text-gray-300
                prose-tbody:tr:hover:bg-white/5
                prose-img:rounded-lg prose-img:shadow-lg prose-img:my-6
                prose-hr:border-white/10 prose-hr:my-8"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </div>
        </article>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-white mb-8">
              Related Posts
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost: unknown) => (
                <Link
                  key={(relatedPost as unknown as Post).id}
                  href={`/blog/${(relatedPost as unknown as Post).slug}`}
                  className="block"
                >
                  <article className="glass-card border border-white/10 rounded-xl overflow-hidden hover:border-emerald-400/50 transition-all cursor-pointer">
                    <img
                      src={(relatedPost as unknown as Post).image}
                      alt={(relatedPost as unknown as Post).title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-6">
                      <div className="text-sm text-gray-400 mb-2">
                        {(relatedPost as unknown as Post).date}
                      </div>
                      <h4 className="font-bold text-white mb-3 line-clamp-2 hover:text-emerald-400 transition-colors">
                        {(relatedPost as unknown as Post).title}
                      </h4>
                      <p className="text-gray-400 text-sm line-clamp-3">
                        {(relatedPost as unknown as Post).excerpt}
                      </p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogDetail;
