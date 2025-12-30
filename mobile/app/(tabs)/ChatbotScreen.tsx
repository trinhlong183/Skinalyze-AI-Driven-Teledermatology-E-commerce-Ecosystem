import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Image,
  SafeAreaView,
} from "react-native";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import chatbotService, {
  ChatMessage,
  ChatSession,
} from "@/services/chatbotService";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import { useProducts } from "@/hooks/useProducts";
import Markdown from "react-native-markdown-display";
import CustomAlert from "@/components/CustomAlert"; // Import CustomAlert

export default function ChatbotScreen() {
  const { user } = useAuth();
  const { primaryColor } = useThemeColor();
  const { products } = useProducts();
  const router = useRouter();
  const params = useLocalSearchParams();

  // --- State Management ---
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Input State
  const [inputMessage, setInputMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showChatList, setShowChatList] = useState(false);

  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    type: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    type: "info",
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const hasLoadedRef = useRef(false);
  const hasPrefillAppliedRef = useRef(false);

  // --- Effects ---

  useEffect(() => {
    if (user?.userId && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadChatSessions();
    }
  }, [user]);

  useEffect(() => {
    if (currentChatId) {
      loadMessages(currentChatId);
    }
  }, [currentChatId]);

  // Handle prefilled data
  useEffect(() => {
    const handlePrefill = async () => {
      if (!hasPrefillAppliedRef.current && user?.userId) {
        const prefillText = params.prefillText;
        const prefillImage = params.prefillImage;
        const hasData = prefillText || prefillImage;

        if (hasData) {
          await createNewChatForAnalysis();
          hasPrefillAppliedRef.current = true;

          if (prefillText && typeof prefillText === "string") {
            setInputMessage(prefillText);
          }

          if (prefillImage && typeof prefillImage === "string") {
            setSelectedImage(prefillImage);
          }
        }
      }
    };

    handlePrefill();
  }, [params.prefillText, params.prefillImage, user?.userId]);

  // Auto-scroll when keyboard opens
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    return () => keyboardDidShowListener.remove();
  }, []);

  // --- Data Loading ---

  const loadChatSessions = async () => {
    if (!user?.userId) return;
    try {
      setIsLoading(true);
      const sessions = await chatbotService.getChatSessionsByUserId(
        user.userId
      );
      setChatSessions(sessions);

      if (sessions.length > 0 && !params.prefillText && !params.prefillImage) {
        const mostRecent = sessions.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0];
        setCurrentChatId(mostRecent.chatId);
      } else if (
        sessions.length === 0 &&
        !params.prefillText &&
        !params.prefillImage
      ) {
        await createNewChat();
      }
    } catch (error) {
      console.error("Error loading chats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const chatMessages = await chatbotService.getMessagesByChatId(chatId);
      setMessages(chatMessages);
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: false }),
        100
      );
      console.log("Message: ", chatMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  // --- Actions ---

  const createNewChat = async () => {
    if (!user?.userId) return;
    try {
      setIsLoading(true);
      const newChat = await chatbotService.createChatSession(user.userId);
      setChatSessions([newChat, ...chatSessions]);
      setCurrentChatId(newChat.chatId);
      setMessages(newChat.messages || []);
      setShowChatList(false);
      hasPrefillAppliedRef.current = false;
    } catch (error) {
      setAlertConfig({
        type: "error",
        title: "Error",
        message: "Failed to start new chat",
        confirmText: "OK",
        onConfirm: () => setAlertVisible(false),
      });
      setAlertVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChatForAnalysis = async () => {
    if (!user?.userId) return;
    try {
      setIsLoading(true);
      const newChat = await chatbotService.createChatSession(user.userId);
      setChatSessions((prev) => [newChat, ...prev]);
      setCurrentChatId(newChat.chatId);
      setMessages(newChat.messages || []);
      setShowChatList(false);
    } catch (error) {
      setAlertConfig({
        type: "error",
        title: "Error",
        message: "Failed to start new chat for analysis",
        confirmText: "OK",
        onConfirm: () => setAlertVisible(false),
      });
      setAlertVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = async (chatId: string) => {
    setAlertConfig({
      type: "warning",
      title: "Delete Chat",
      message: "Are you sure you want to delete this chat?",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        setAlertVisible(false); // Close alert first
        try {
          await chatbotService.deleteChatSession(chatId);
          const updated = chatSessions.filter((c) => c.chatId !== chatId);
          setChatSessions(updated);
          if (currentChatId === chatId) {
            updated.length > 0
              ? setCurrentChatId(updated[0].chatId)
              : createNewChat();
          }
        } catch (e) {
          console.error(e);
        }
      },
      onCancel: () => setAlertVisible(false),
    });
    setAlertVisible(true);
  };

  const selectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    setShowChatList(false);
  };

  // --- Image Handling ---

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled) setSelectedImage(result.assets[0].uri);
    } catch (error) {
      setAlertConfig({
        type: "error",
        title: "Error",
        message: "Could not select image",
        confirmText: "OK",
        onConfirm: () => setAlertVisible(false),
      });
      setAlertVisible(true);
    }
  };

  const clearInput = () => {
    setInputMessage("");
    setSelectedImage(null);
  };

  // --- Sending Message ---

  const sendMessage = async () => {
    if (
      (!inputMessage.trim() && !selectedImage) ||
      !currentChatId ||
      isSending
    )
      return;

    const textToSend = inputMessage.trim();
    const imageToSend = selectedImage;
    const tempId = `temp-${Date.now()}`;

    console.log("🚀 [ChatbotScreen] Starting to send message:", {
      chatId: currentChatId,
      hasText: !!textToSend,
      textLength: textToSend.length,
      hasImage: !!imageToSend,
      tempId,
    });

    setInputMessage("");
    setSelectedImage(null);
    setIsSending(true);
    Keyboard.dismiss();

    const optimisticMessage: ChatMessage = {
      messageId: tempId,
      chatId: currentChatId,
      sender: "user",
      messageContent: textToSend,
      imageUrl: imageToSend,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setTimeout(
      () => flatListRef.current?.scrollToEnd({ animated: true }),
      100
    );

    try {
      console.log(
        "📞 [ChatbotScreen] Calling chatbotService.sendMessage..."
      );

      const { userMessage, aiMessage } = await chatbotService.sendMessage(
        currentChatId,
        textToSend,
        imageToSend
      );

      console.log(
        "✅ [ChatbotScreen] Response received from chatbotService:"
      );
      console.log("👤 User Message:", {
        id: userMessage.messageId,
        content: userMessage.messageContent?.substring(0, 100),
        createdAt: userMessage.createdAt,
      });
      console.log("🤖 AI Message:", {
        id: aiMessage.messageId,
        contentLength: aiMessage.messageContent?.length,
        contentPreview: aiMessage.messageContent?.substring(0, 200),
        createdAt: aiMessage.createdAt,
      });
      console.log(
        "📝 Full AI Message Content:",
        aiMessage.messageContent
      );

      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.messageId !== tempId);
        const updatedMessages = [...filtered, userMessage, aiMessage];
        console.log(
          "💬 [ChatbotScreen] Messages state updated. Total messages:",
          updatedMessages.length
        );
        return updatedMessages;
      });

      const session = chatSessions.find((s) => s.chatId === currentChatId);
      if (session?.title === "New chat") {
        console.log(
          "🔄 [ChatbotScreen] Refreshing chat sessions (title was 'New chat')"
        );
        chatbotService
          .getChatSessionsByUserId(user!.userId)
          .then((sessions) => {
            console.log(
              "📋 [ChatbotScreen] Chat sessions refreshed:",
              sessions.length
            );
            setChatSessions(sessions);
          });
      }
    } catch (error) {
      console.error("❌ [ChatbotScreen] Error in sendMessage:");
      console.error(error);
      setAlertConfig({
        type: "error",
        title: "Error",
        message: "Failed to send message",
        confirmText: "OK",
        onConfirm: () => setAlertVisible(false),
      });
      setAlertVisible(true);
      setMessages((prev) => prev.filter((msg) => msg.messageId !== tempId));
      setInputMessage(textToSend);
      setSelectedImage(imageToSend);
    } finally {
      console.log("🏁 [ChatbotScreen] sendMessage completed");
      setIsSending(false);
    }
  };

  // --- Product Matching Helper ---
  const findProductByName = useCallback(
    (productName: string) => {
      if (!products || products.length === 0) {
        console.log("⚠️ No products available for matching");
        return null;
      }

      // Clean up the product name for matching
      const cleanName = productName.trim().toLowerCase();
      console.log("🔍 Searching for product:", cleanName);

      // 1. Try exact match first
      let found = products.find(
        (p) => p.productName.toLowerCase() === cleanName
      );
      if (found) {
        console.log("✅ Exact match found:", found.productName);
        return found;
      }

      // 2. Try if product name contains the search term
      found = products.find((p) =>
        p.productName.toLowerCase().includes(cleanName)
      );
      if (found) {
        console.log("✅ Contains match found:", found.productName);
        return found;
      }

      // 3. Try if search term contains the product name
      found = products.find((p) =>
        cleanName.includes(p.productName.toLowerCase())
      );
      if (found) {
        console.log("✅ Reverse contains match found:", found.productName);
        return found;
      }

      // 4. Try matching by significant keywords (words with 4+ chars)
      const searchWords = cleanName
        .split(/[\s\-_]+/)
        .filter((w) => w.length >= 4)
        .map((w) => w.toLowerCase());

      console.log("🔤 Search keywords:", searchWords);

      if (searchWords.length > 0) {
        // Find product with most keyword matches
        let bestMatch: { product: any; score: number } | null = null;

        for (const product of products) {
          const productNameLower = product.productName.toLowerCase();
          const productWords = productNameLower.split(/[\s\-_]+/);

          // Count matching keywords
          let matchScore = 0;
          for (const searchWord of searchWords) {
            // Check if any product word contains the search word or vice versa
            const hasMatch = productWords.some(
              (pw: string) =>
                pw.includes(searchWord) || searchWord.includes(pw)
            );
            if (hasMatch) matchScore++;

            // Also check if product name contains the search word directly
            if (productNameLower.includes(searchWord)) matchScore += 0.5;
          }

          // Also check brand match
          if (
            product.brand &&
            cleanName.includes(product.brand.toLowerCase())
          ) {
            matchScore += 1;
          }

          if (matchScore > 0 && (!bestMatch || matchScore > bestMatch.score)) {
            bestMatch = { product, score: matchScore };
          }
        }

        if (bestMatch && bestMatch.score >= 1) {
          console.log(
            "✅ Keyword match found:",
            bestMatch.product.productName,
            "Score:",
            bestMatch.score
          );
          return bestMatch.product;
        }
      }

      // 5. Try fuzzy matching - check each word separately
      for (const product of products) {
        const productNameLower = product.productName.toLowerCase();

        // Check if at least 2 significant words from search match product name
        const matchingWords = searchWords.filter((word) =>
          productNameLower.includes(word)
        );

        if (matchingWords.length >= 2) {
          console.log("✅ Multi-word match found:", product.productName);
          return product;
        }

        // Check first word match (usually product line name)
        if (
          searchWords.length > 0 &&
          productNameLower.startsWith(searchWords[0])
        ) {
          console.log("✅ First word match found:", product.productName);
          return product;
        }
      }

      console.log("❌ No product found for:", productName);
      return null;
    },
    [products]
  );

  const navigateToProduct = useCallback(
    (productName: string) => {
      console.log("🛒 Attempting to navigate to product:", productName);
      const product = findProductByName(productName);

      if (product) {
        console.log(
          "✅ Navigating to:",
          product.productId,
          product.productName
        );
        router.push({
          pathname: "/(stacks)/ProductDetailScreen",
          params: { productId: product.productId },
        });
      } else {
        console.log("❌ Product not found, searching instead:", productName);
        // Navigate to search screen with the product name as query
        router.push({
          pathname: "/(stacks)/SearchScreen",
          params: { query: productName },
        });
      }
    },
    [findProductByName, router]
  );

  // --- Render Helpers ---

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === "user";

    // Markdown styles for AI messages - with proper TypeScript types
    const markdownStyles: any = {
      body: {
        color: "#333",
        fontSize: 15,
        lineHeight: 22,
      },
      paragraph: {
        marginTop: 0,
        marginBottom: 8,
      },
      strong: {
        fontWeight: "700" as const,
        color: primaryColor,
        textDecorationLine: "underline" as const,
      },
      em: {
        fontStyle: "italic" as const,
      },
      code_inline: {
        backgroundColor: "#F0F0F0",
        color: "#E74C3C",
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
        fontSize: 14,
      },
      code_block: {
        backgroundColor: "#2D2D2D",
        color: "#F8F8F2",
        padding: 12,
        borderRadius: 8,
        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
        fontSize: 13,
        marginVertical: 8,
      },
      fence: {
        backgroundColor: "#2D2D2D",
        color: "#F8F8F2",
        padding: 12,
        borderRadius: 8,
        fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
        fontSize: 13,
        marginVertical: 8,
      },
      heading1: {
        fontSize: 22,
        fontWeight: "700" as const,
        color: "#1A1A1A",
        marginTop: 8,
        marginBottom: 8,
      },
      heading2: {
        fontSize: 20,
        fontWeight: "700" as const,
        color: "#1A1A1A",
        marginTop: 6,
        marginBottom: 6,
      },
      heading3: {
        fontSize: 18,
        fontWeight: "600" as const,
        color: "#1A1A1A",
        marginTop: 4,
        marginBottom: 4,
      },
      bullet_list: {
        marginVertical: 4,
      },
      ordered_list: {
        marginVertical: 4,
      },
      list_item: {
        marginVertical: 2,
      },
      blockquote: {
        backgroundColor: "#F5F5F5",
        borderLeftWidth: 4,
        borderLeftColor: primaryColor,
        paddingLeft: 12,
        paddingVertical: 8,
        marginVertical: 8,
        fontStyle: "italic" as const,
      },
      link: {
        color: primaryColor,
        textDecorationLine: "underline" as const,
      },
      hr: {
        backgroundColor: "#E0E0E0",
        height: 1,
        marginVertical: 12,
      },
    };

    // Custom rules for handling product name clicks
    const markdownRules = {
      strong: (node: any, children: any, parent: any, styles: any) => {
        const text = node.children?.[0]?.content || "";

        // Check if this looks like a product name (contains "của" or brand pattern)
        const isProductName =
          text.includes(" của ") ||
          text.includes(" by ") ||
          /^[A-Z]/.test(text); // Starts with uppercase

        if (isProductName && !isUser) {
          // Extract just the product name (before "của" or "by")
          let productName = text;
          if (text.includes(" của ")) {
            productName = text.split(" của ")[0].trim();
          } else if (text.includes(" by ")) {
            productName = text.split(" by ")[0].trim();
          }

          return (
            <Text
              key={node.key}
              style={[
                styles.strong,
                {
                  color: primaryColor,
                  textDecorationLine: "underline",
                },
              ]}
              onPress={() => navigateToProduct(productName)}
            >
              {children}
              <Text style={{ fontSize: 12 }}> 🛒</Text>
            </Text>
          );
        }

        return (
          <Text key={node.key} style={styles.strong}>
            {children}
          </Text>
        );
      },
    };

    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.messageRowUser : styles.messageRowAi,
        ]}
      >
        {!isUser && (
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: "#fff",
                borderColor: primaryColor,
                borderWidth: 1,
              },
            ]}
          >
            <Ionicons name="sparkles" size={14} color={primaryColor} />
          </View>
        )}

        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.bubbleUser, { backgroundColor: primaryColor }]
              : styles.bubbleAi,
          ]}
        >
          {item.imageUrl && (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}

          {item.messageContent ? (
            isUser ? (
              <Text style={[styles.messageText, styles.messageTextUser]}>
                {item.messageContent}
              </Text>
            ) : (
              <Markdown style={markdownStyles} rules={markdownRules}>
                {item.messageContent}
              </Markdown>
            )
          ) : null}

          <Text
            style={[
              styles.timestamp,
              isUser ? { color: "rgba(255,255,255,0.7)" } : { color: "#999" },
            ]}
          >
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isSending) return <View style={{ height: 20 }} />;
    return (
      <View
        style={[styles.messageRow, styles.messageRowAi, { marginBottom: 20 }]}
      >
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: "#fff",
              borderColor: primaryColor,
              borderWidth: 1,
            },
          ]}
        >
          <Ionicons name="sparkles" size={14} color={primaryColor} />
        </View>
        <View
          style={[
            styles.bubble,
            styles.bubbleAi,
            { flexDirection: "row", alignItems: "center", gap: 8 },
          ]}
        >
          <ActivityIndicator size="small" color={primaryColor} />
          <Text style={{ color: "#999", fontSize: 13, fontStyle: "italic" }}>
            Thinking...
          </Text>
        </View>
      </View>
    );
  };

  const renderChatItem = ({ item }: { item: ChatSession }) => {
    const isActive = item.chatId === currentChatId;
    return (
      <TouchableOpacity
        style={[
          styles.chatItem,
          isActive && {
            backgroundColor: `${primaryColor}15`,
            borderColor: primaryColor,
          },
        ]}
        onPress={() => {
          setCurrentChatId(item.chatId);
          setShowChatList(false);
          hasPrefillAppliedRef.current = false;
        }}
      >
        <View style={styles.chatItemIcon}>
          <Ionicons
            name="chatbubble-ellipses"
            size={24}
            color={isActive ? primaryColor : "#666"}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.chatItemTitle, isActive && { color: primaryColor }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.chatItemDate}>
            {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => deleteChat(item.chatId)}
          style={{ padding: 8 }}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // --- Views ---

  if (!user)
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: "#666" }}>Please log in to use the chatbot.</Text>
      </View>
    );

  if (showChatList) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setShowChatList(false)}
            style={styles.iconButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>History</Text>
          <TouchableOpacity onPress={createNewChat} style={styles.iconButton}>
            <Ionicons name="add" size={24} color={primaryColor} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={chatSessions}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.chatId}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: "#999", marginTop: 40 }}>
                No chat history
              </Text>
            </View>
          }
        />
        {/* Custom Alert Integration */}
        <CustomAlert
          visible={alertVisible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          confirmText={alertConfig.confirmText}
          cancelText={alertConfig.cancelText}
          onConfirm={alertConfig.onConfirm}
          onCancel={alertConfig.onCancel}
        />
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={styles.flex1}>
        {/* Header - Fixed at top */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setShowChatList(true)}
            style={styles.iconButton}
          >
            <Ionicons name="menu" size={24} color="#333" />
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="sparkles" size={18} color={primaryColor} />
            <Text style={styles.headerTitle}>Assistant</Text>
          </View>
          <TouchableOpacity onPress={createNewChat} style={styles.iconButton}>
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={primaryColor}
            />
          </TouchableOpacity>
        </View>

        {/* Chat Area */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.messageId}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={[styles.center, { marginTop: 100 }]}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ddd" />
              <Text style={{ color: "#999", marginTop: 16 }}>
                {params.prefillText
                  ? "Ready to ask about your analysis..."
                  : "Start a new conversation"}
              </Text>
            </View>
          }
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          {/* Image Preview Card */}
          {selectedImage && (
            <View style={styles.imagePreviewCard}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.previewThumb}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.previewLabel}>Image Attached</Text>
                <Text style={styles.previewSub}>Ready to send</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedImage(null)}
                style={styles.closePreview}
              >
                <Ionicons name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          {/* Input Row */}
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={pickImage} style={styles.attachBtn}>
              <Ionicons name="image-outline" size={24} color={primaryColor} />
            </TouchableOpacity>

            <View style={styles.textInputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder={
                  selectedImage ? "Hỏi về ảnh này..." : "Nhập tin nhắn..."
                }
                placeholderTextColor="#999"
                multiline
                value={inputMessage}
                onChangeText={setInputMessage}
                maxLength={1000}
                autoCorrect={true}
                autoCapitalize="sentences"
                keyboardType="default"
                returnKeyType="default"
                blurOnSubmit={false}
                enablesReturnKeyAutomatically={false}
                textContentType="none"
              />
              {(inputMessage.length > 0 || selectedImage) && (
                <TouchableOpacity onPress={clearInput} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={20} color="#ccc" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={sendMessage}
              disabled={(!inputMessage.trim() && !selectedImage) || isSending}
              style={[
                styles.sendBtn,
                {
                  backgroundColor:
                    (!inputMessage.trim() && !selectedImage) || isSending
                      ? "#E0E0E0"
                      : primaryColor,
                },
              ]}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="arrow-up" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom Alert Integration */}
        <CustomAlert
          visible={alertVisible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          confirmText={alertConfig.confirmText}
          cancelText={alertConfig.cancelText}
          onConfirm={alertConfig.onConfirm}
          onCancel={alertConfig.onCancel}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  flex1: {
    flex: 1,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#333",
  },
  iconButton: {
    padding: 8,
  },

  // Chat List
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  chatItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  chatItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  chatItemDate: {
    fontSize: 12,
    color: "#999",
  },

  // Messages
  chatContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-end",
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowAi: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#f0f0f0",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
  },
  messageTextUser: {
    color: "#fff",
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    textAlign: "right",
  },

  // Input Area
  inputContainer: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  imagePreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 8,
    marginBottom: 10,
  },
  previewThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "#ddd",
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  previewSub: {
    fontSize: 12,
    color: "#666",
  },
  closePreview: {
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  attachBtn: {
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  textInputWrapper: {
    flex: 1,
    backgroundColor: "#F2F2F2",
    borderRadius: 20,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 12,
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 8,
  },
  clearBtn: {
    padding: 4,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});