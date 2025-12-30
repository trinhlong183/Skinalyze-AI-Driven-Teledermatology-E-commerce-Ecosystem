import { GraphQLClient, gql } from "graphql-request";

// 1. Định nghĩa kiểu dữ liệu thô từ Hygraph (API)
interface HygraphAuthor {
  userId: string;
  name: string;
  avatar?: {
    id: string;
  };
}

interface HygraphPost {
  id: string;
  title: string;
  postDate: string;
  slug: string;
  category: string;
  content: {
    html: string;
  };
  author?: HygraphAuthor;
  coverPhoto: string;
  stage: string;
}

// 2. Định nghĩa kiểu dữ liệu chuẩn dùng trong App (Export để tái sử dụng ở file khác)
export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  author: string;
  authorId?: string;
  authorAvatar?: string;
  date: string;
  readTime: string;
  featured: boolean;
  slug: string;
  content: string; // HTML content
  stage?: string;
}

class APIError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const initializeClient = () => {
  return new GraphQLClient(process.env.NEXT_PUBLIC_HYGRAPH_API_ENDPOINT as string);
};

const getAllPosts = async (): Promise<BlogPost[]> => {
  try {
    const graphqlClient = initializeClient();
    const getAllPostsQuery = gql`
      {
        posts {
          id
          title
          postDate
          slug
          category
          content {
            html
          }
          author {
            userId
            name
            avatar {
              id
            }
          }
          coverPhoto
          stage
        }
      }
    `;

    // Ép kiểu kết quả trả về từ API
    const response = await graphqlClient.request<{ posts: HygraphPost[] }>(
      getAllPostsQuery
    );

    // Transform and filter published posts
    const transformedPosts: BlogPost[] = response.posts
      .filter((post) => post.stage === "PUBLISHED")
      .map((post, index) => ({
        id: post.id,
        title: post.title,
        excerpt:
          post.content.html
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 150) + "...",
        image:
          post.coverPhoto ||
          `https://images.unsplash.com/photo-${
            1559757148 + index
          }-5c350d0d3c56?w=600&h=400&fit=crop`,
        category: post.category || "news",
        author: post.author?.name || "Skinalyze Team",
        authorId: post.author?.userId,
        authorAvatar: post.author?.avatar?.id,
        date: new Date(post.postDate).toLocaleDateString("vi-VN", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        readTime: `${Math.ceil(
          post.content.html.split(" ").length / 200
        )} phút đọc`,
        featured: index < 2,
        slug: post.slug,
        content: post.content.html,
        stage: post.stage,
      }));

    return transformedPosts.reverse();
  } catch (error) {
    console.error("Error fetching posts:", error);
    throw new APIError(500, "Failed to fetch blog posts");
  }
};

const getPostBySlug = async (slug: string): Promise<BlogPost> => {
  try {
    const graphqlClient = initializeClient();
    const getPostQuery = gql`
      query GetPostBySlug($slug: String!) {
        posts(where: { slug: $slug }) {
          id
          title
          postDate
          slug
          category
          content {
            html
          }
          author {
            userId
            name
            avatar {
              id
            }
          }
          coverPhoto
          stage
        }
      }
    `;

    // Ép kiểu
    const response = await graphqlClient.request<{ posts: HygraphPost[] }>(
      getPostQuery,
      { slug }
    );

    if (!response.posts || response.posts.length === 0) {
      throw new APIError(404, "Blog post not found");
    }

    const post = response.posts[0];

    // Transform data
    return {
      id: post.id,
      title: post.title,
      excerpt: "", // Chi tiết bài viết có thể không cần excerpt
      content: post.content.html,
      image:
        post.coverPhoto ||
        "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop",
      category: post.category || "news",
      author: post.author?.name || "Skinalyze Team",
      authorId: post.author?.userId,
      authorAvatar: post.author?.avatar?.id,
      date: new Date(post.postDate).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      readTime: `${Math.ceil(
        post.content.html.split(" ").length / 200
      )} phút đọc`,
      slug: post.slug,
      featured: false,
    };
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    console.error("Error fetching post by slug:", error);
    throw new APIError(500, "Failed to fetch blog post");
  }
};

const getPostsByCategory = async (category: string): Promise<BlogPost[]> => {
  try {
    const allPosts = await getAllPosts();
    return category === "all"
      ? allPosts
      : allPosts.filter((post) => post.category === category);
  } catch (error) {
    throw new APIError(500, "Failed to fetch posts by category");
  }
};

const getRelatedPosts = async (
  currentSlug: string,
  category: string,
  limit: number = 3
): Promise<BlogPost[]> => {
  try {
    const allPosts = await getAllPosts();
    return allPosts
      .filter((post) => post.slug !== currentSlug && post.category === category)
      .slice(0, limit);
  } catch (error) {
    throw new APIError(500, "Failed to fetch related posts");
  }
};

export {
  getAllPosts,
  getPostBySlug,
  getPostsByCategory,
  getRelatedPosts,
  APIError,
};
