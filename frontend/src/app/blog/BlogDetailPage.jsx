import React from "react";
import { useParams } from "react-router-dom";
import Navbar from "../Navbar";
import BlogDetail from "../components/BlogDetail";
import Footer from "../components/Footer";

const BlogDetailPage = () => {
  const { slug } = useParams();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <BlogDetail slug={slug} />
      
    </div>
  );
};

export default BlogDetailPage;
