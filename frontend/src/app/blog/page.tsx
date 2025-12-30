'use client'
import React from "react";
// import Footer from "../components/Footer";
import Navbar from "@/components/navbar/Navbar";
import BlogSection from "@/components/blogsection/BlogSection";

const BlogPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <BlogSection />
    </div>
  );
};

export default BlogPage;
