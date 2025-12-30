// Configuration for external services
export const config = {
  // API Base URL - Use environment variable or fallback to production
  API_BASE_URL:
    process.env.EXPO_PUBLIC_BASE_API_URL || "https://api.nhatlonh.id.vn/api/v1",

  // WebSocket Base URL (without /api/v1)
  WEBSOCKET_URL:
    process.env.EXPO_PUBLIC_BASE_URL || "https://skinalyze-be.nhatlonh.id.vn",

  // Goong Maps API Keys
  GOONG_API_KEY:
    process.env.EXPO_PUBLIC_GOONG_API_KEY ||
    "Ny4yDb3an9eOyZarpwVwEBZgfJ1vYfCqM30pQtqX",
  GOONG_MAP_KEY:
    process.env.EXPO_PUBLIC_GOONG_MAP_KEY ||
    "9GnzoyZnBcqEx4HUjPcRi48BzFQSNtPTVBqh0R8d",

  // GHN (Giao Hàng Nhanh) API
  GHN_TOKEN:
    process.env.EXPO_PUBLIC_GHN_TOKEN || "3ea563c2-a47c-11ef-8e53-0a00184fe694",
  GHN_SHOP_ID: process.env.EXPO_PUBLIC_GHN_SHOP_ID || "5381948",
  GHN_API_URL:
    process.env.EXPO_PUBLIC_GHN_API_URL ||
    "https://dev-online-gateway.ghn.vn/shiip/public-api",

  // Goong API endpoints
  GOONG_BASE_URL: "https://rsapi.goong.io",

  // Tracking settings
  TRACKING_POLL_INTERVAL: 10000, // 10 seconds
  LOCATION_CACHE_DURATION: 300000, // 5 minutes
};

export default config;
