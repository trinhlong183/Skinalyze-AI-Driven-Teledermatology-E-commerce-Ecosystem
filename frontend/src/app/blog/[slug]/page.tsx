"use client";
import React, { use } from "react";
import Navbar from "@/components/navbar/Navbar";
import BlogDetail from "@/components/blogdetail/BlogDetail";

interface BlogDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

const BlogDetailPage = ({ params }: BlogDetailPageProps) => {
  const { slug } = use(params);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <BlogDetail slug={slug} />
    </div>
  );
};

export default BlogDetailPage;
