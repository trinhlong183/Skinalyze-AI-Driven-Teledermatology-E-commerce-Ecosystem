import React, { useState, useEffect } from "react";
import { getAllPosts } from "../../services/blogServices";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Activity, Stethoscope } from "lucide-react";
import GradientText from "@/components/ui/GradientText";

interface BlogPost {
  id: string;
  title: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
  excerpt: string;
  slug: string;
  author: string;
  featured?: boolean;
}

const BlogSection = () => {
  const [activeCategory, setActiveCategory] = useState("all");

  // 2. Sử dụng Interface vào useState
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { id: "all", name: "All", count: 0 },
    { id: "news", name: "News", count: 0 },
    { id: "ai-lab", name: "AI Lab", count: 0 },
    { id: "skincare", name: "Skincare Tips", count: 0 },
    { id: "for-doctors", name: "For MD's", count: 0 },
  ];

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const posts = await getAllPosts();
        setBlogPosts(posts);
        setError(null);
      } catch (err: unknown) {
        setError("Unable to load posts. Please try again later.");
        console.error("Error fetching posts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const filteredPosts =
    activeCategory === "all"
      ? blogPosts
      : blogPosts.filter((post: BlogPost) => post.category === activeCategory);

  const featuredPosts = blogPosts.filter((post: BlogPost) => post.featured);
  if (loading) {
    return (
      <section className="py-20 bg-[#0a0e1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
            <p className="mt-4 text-gray-400">Loading posts...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-20 bg-[#0a0e1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="glass-card border border-red-500/30 rounded-2xl p-6">
              <p className="text-red-400">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 bg-red-600/80 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition-colors backdrop-blur-xl"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="blog" className="relative z-10 py-20 md:py-32 overflow-hidden">
      {/* Cosmic space background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e1a] via-[#0f1629] to-[#0a0e1a] z-0" />

      {/* Animated stars layer 1 - small stars */}
      <div className="absolute inset-0 z-0">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={`star1-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.3 + Math.random() * 0.4,
            }}
            animate={{
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Animated stars layer 2 - medium stars */}
      <div className="absolute inset-0 z-0">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={`star2-${i}`}
            className="absolute w-1.5 h-1.5 bg-emerald-200 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.4,
            }}
            animate={{
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      {/* Nebula effects */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
        }}
      />
      <motion.div
        className="absolute top-1/2 right-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-[90px] pointer-events-none"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
        }}
      />

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-6">
        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-8">
              Featured Posts
            </h2>
            <div className="grid md:grid-cols-2 gap-6 md:gap-8">
              {featuredPosts.map((post: BlogPost, index: number) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group cursor-pointer bg-[#1a1b3b]/50 border border-white/10 hover:border-[#4fb7b3]/50 transition-colors duration-300 overflow-hidden flex flex-col h-full"
                  data-hover="true"
                >
                  <Link
                    href={`/blog/${post.slug}`}
                    className="flex flex-col h-full"
                  >
                    <div className="relative h-64 overflow-hidden">
                      <motion.img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1a1b3b] to-transparent opacity-60" />
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest bg-black/60 backdrop-blur-md text-white px-3 py-1 border border-white/10">
                          Featured
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest bg-black/60 backdrop-blur-md text-white px-3 py-1 border border-white/10">
                          {
                            categories.find((cat) => cat.id === post.category)
                              ?.name
                          }
                        </span>
                      </div>
                    </div>

                    <div className="p-8 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-4 text-[#4fb7b3] text-xs font-mono tracking-widest">
                        <span>{post.date}</span>
                        <span>•</span>
                        <span>{post.author}</span>
                      </div>

                      <h3 className="text-2xl font-heading font-bold leading-tight mb-4 group-hover:text-[#a8fbd3] transition-colors">
                        {post.title}
                      </h3>

                      <p className="text-gray-400 mb-8 line-clamp-3 text-sm leading-relaxed flex-1">
                        {post.excerpt}
                      </p>

                      <div className="flex items-center justify-between pt-6 border-t border-white/5">
                        <span className="text-xs font-bold uppercase tracking-widest text-white group-hover:text-[#4fb7b3] transition-colors">
                          Read Article
                        </span>
                        <ArrowUpRight className="w-5 h-5 text-white group-hover:text-[#4fb7b3] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}
        {/* Category Filter */}
        <div className="flex flex-wrap gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeCategory === category.id
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg glow-emerald"
                  : "glass-card text-gray-300 hover:border-emerald-400/50 border border-white/10"
              }`}
            >
              {category.name} (
              {
                blogPosts.filter(
                  (post: BlogPost) =>
                    category.id === "all" || post.category === category.id
                ).length
              }
              )
            </button>
          ))}
        </div>{" "}
        {/* All Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {filteredPosts.map((post: BlogPost, index: number) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group cursor-pointer bg-[#1a1b3b]/50 border border-white/10 hover:border-[#4fb7b3]/50 transition-colors duration-300 overflow-hidden flex flex-col h-full"
              data-hover="true"
            >
              <Link
                href={`/blog/${post.slug}`}
                className="flex flex-col h-full"
              >
                <div className="relative h-64 overflow-hidden">
                  <motion.img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a1b3b] to-transparent opacity-60" />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-black/60 backdrop-blur-md text-white px-3 py-1 border border-white/10">
                      {categories.find((cat) => cat.id === post.category)?.name}
                    </span>
                  </div>
                </div>

                <div className="p-8 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-4 text-[#4fb7b3] text-xs font-mono tracking-widest">
                    <span>{post.date}</span>
                    <span>•</span>
                    <span>{post.author}</span>
                  </div>

                  <h3 className="text-2xl font-heading font-bold leading-tight mb-4 group-hover:text-[#a8fbd3] transition-colors">
                    {post.title}
                  </h3>

                  <p className="text-gray-400 mb-8 line-clamp-3 text-sm leading-relaxed flex-1">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    <span className="text-xs font-bold uppercase tracking-widest text-white group-hover:text-[#4fb7b3] transition-colors">
                      Read Article
                    </span>
                    <ArrowUpRight className="w-5 h-5 text-white group-hover:text-[#4fb7b3] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
        {/* No posts message */}
        {filteredPosts.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-400">No posts in this category.</p>
          </div>
        )}
        {/* Load More Button */}
        {filteredPosts.length > 0 && (
          <div className="text-center mt-12">
            <button className="glass-card text-gray-300 border border-white/10 px-8 py-3 rounded-xl font-medium hover:border-emerald-400/50 transition-all duration-200">
              Load More Posts
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogSection;
