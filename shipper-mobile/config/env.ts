/**
 * Environment configuration
 * Đọc các biến môi trường từ .env file
 */

// Goong Maps API Keys
export const GOONG_MAP_KEY = process.env.EXPO_PUBLIC_GOONG_MAP_KEY || '';
export const GOONG_API_KEY = process.env.EXPO_PUBLIC_GOONG_API_KEY || '';

// Backend API URL
export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

// App Configuration
export const LOCATION_TRACKING_INTERVAL = parseInt(
  process.env.EXPO_PUBLIC_LOCATION_TRACKING_INTERVAL || '10000',
  10
);
export const GPS_ACCURACY_THRESHOLD = parseInt(
  process.env.EXPO_PUBLIC_GPS_ACCURACY_THRESHOLD || '50',
  10
);

// Validate required environment variables
const validateEnv = () => {
  const missingVars: string[] = [];

  if (!GOONG_MAP_KEY) {
    missingVars.push('EXPO_PUBLIC_GOONG_MAP_KEY');
  }
  if (!GOONG_API_KEY) {
    missingVars.push('EXPO_PUBLIC_GOONG_API_KEY');
  }
  if (!BACKEND_URL) {
    missingVars.push('EXPO_PUBLIC_BACKEND_URL');
  }

  if (missingVars.length > 0) {
    console.warn(
      `⚠️  Missing environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env file and make sure all required variables are set.'
    );
  }
};

// Run validation on import
validateEnv();

export default {
  GOONG_MAP_KEY,
  GOONG_API_KEY,
  BACKEND_URL,
  LOCATION_TRACKING_INTERVAL,
  GPS_ACCURACY_THRESHOLD,
};
