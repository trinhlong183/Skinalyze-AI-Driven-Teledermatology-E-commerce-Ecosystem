import apiService from "./apiService";
import tokenService from "./tokenService";

// Adjust this if your API URL is different
const BASE_URL = process.env.EXPO_PUBLIC_BASE_API_URL || "https://api.nhatlonh.id.vn/api/v1";

export interface ChatMessage {
  messageId: string;
  chatId: string;
  sender: "user" | "ai";
  messageContent: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSession {
  chatId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

interface CreateChatPayload {
  userId: string;
}

interface SendMessageResponse {
  userMessage: ChatMessage;
  aiMessage: ChatMessage;
}

interface DeleteResponse {
  message: string;
}

class ChatbotService {
  async createChatSession(userId: string): Promise<ChatSession> {
    try {
      const token = await tokenService.getToken();
      if (!token) throw new Error("Authentication is required");

      const payload: CreateChatPayload = { userId };
      const response = await apiService.post<ChatSession>(
        "/chat-sessions",
        payload
      );
      return response;
    } catch (error) {
      console.error("❌ Error creating chat session:", error);
      throw new Error("Failed to create chat session");
    }
  }

  async getChatSessionsByUserId(userId: string): Promise<ChatSession[]> {
    try {
      const token = await tokenService.getToken();
      if (!token) throw new Error("Authentication is required");

      const response = await apiService.get<ChatSession[]>(
        `/chat-sessions/user/${userId}`
      );
      return response;
    } catch (error) {
      console.error("❌ Error fetching chat sessions:", error);
      throw new Error("Failed to fetch chat sessions");
    }
  }

  async getChatSessionById(chatId: string): Promise<ChatSession> {
    try {
      const token = await tokenService.getToken();
      if (!token) throw new Error("Authentication is required");

      const response = await apiService.get<ChatSession>(
        `/chat-sessions/${chatId}`
      );
      return response;
    } catch (error) {
      console.error("❌ Error fetching chat session:", error);
      throw new Error("Failed to fetch chat session");
    }
  }

  async deleteChatSession(chatId: string): Promise<void> {
    try {
      const token = await tokenService.getToken();
      if (!token) throw new Error("Authentication is required");

      const response = await apiService.delete<DeleteResponse>(
        `/chat-sessions/${chatId}`
      );
      console.log("✅ Chat session deleted:", response.message);
    } catch (error: any) {
      console.error("❌ Error deleting chat session:", error);
      if (
        error?.message?.includes("not found") ||
        error?.message?.includes("404")
      ) {
        return;
      }
      throw new Error("Failed to delete chat session");
    }
  }

  async getMessagesByChatId(chatId: string): Promise<ChatMessage[]> {
    try {
      const token = await tokenService.getToken();
      if (!token) throw new Error("Authentication is required");
      const response = await apiService.get<ChatMessage[]>(
        `/chat-messages/chat/${chatId}`
      );
      return response;
    } catch (error) {
      console.error("❌ Error fetching messages:", error);
      throw new Error("Failed to fetch messages");
    }
  }

  async sendMessage(
    chatId: string,
    messageContent: string,
    imageUri?: string | null
  ): Promise<SendMessageResponse> {
    try {
      console.log("🤖 Sending message...");
      console.log("📤 Request details:", {
        chatId,
        messageContent: messageContent ? `${messageContent.substring(0, 50)}...` : "No text",
        hasImage: !!imageUri
      });

      const token = await tokenService.getToken();
      if (!token) throw new Error("Authentication is required");

      const formData = new FormData();
      formData.append("chatId", chatId);

      // Only append text if it exists
      if (messageContent) {
        formData.append("messageContent", messageContent);
      }

      // Append Image
      if (imageUri) {
        const filename = imageUri.split("/").pop() || "photo.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : "image/jpeg";

        // @ts-ignore: React Native FormData
        formData.append("image", {
          uri: imageUri,
          name: filename,
          type: type,
        });
        console.log("🖼️ Image attached:", filename);
      }

      const response = await fetch(`${BASE_URL}/chat-messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Do not set Content-Type, fetch sets it automatically for FormData
        },
        body: formData,
      });

      console.log("📡 Response status:", response.status, response.statusText);

      const responseData = await response.json();

      if (!response.ok) {
        console.error("❌ API Error Response:", responseData);
        throw new Error(responseData.message || "Failed to send message");
      }

      console.log("✅ AI Response received:");
      console.log("📨 User Message:", {
        messageId: responseData.userMessage?.messageId,
        sender: responseData.userMessage?.sender,
        content: responseData.userMessage?.messageContent?.substring(0, 100),
        hasImage: !!responseData.userMessage?.imageUrl
      });
      console.log("🤖 AI Message:", {
        messageId: responseData.aiMessage?.messageId,
        sender: responseData.aiMessage?.sender,
        contentLength: responseData.aiMessage?.messageContent?.length || 0,
        contentPreview: responseData.aiMessage?.messageContent?.substring(0, 200) + "...",
        hasImage: !!responseData.aiMessage?.imageUrl
      });
      console.log("📄 Full AI Response:", JSON.stringify(responseData, null, 2));

      return responseData as SendMessageResponse;
    } catch (error) {
      console.error("❌ Error sending message:", error);
      if (error instanceof Error) {
        console.error("❌ Error details:", error.message);
        console.error("❌ Error stack:", error.stack);
      }
      throw error instanceof Error
        ? error
        : new Error("Failed to send message");
    }
  }
}

export const chatbotService = new ChatbotService();
export default chatbotService;
