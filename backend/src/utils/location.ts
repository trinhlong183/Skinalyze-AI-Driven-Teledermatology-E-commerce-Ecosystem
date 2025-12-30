/**
 * Haversine formula để tính khoảng cách giữa 2 tọa độ
 * @param lat1 Latitude điểm 1
 * @param lon1 Longitude điểm 1
 * @param lat2 Latitude điểm 2
 * @param lon2 Longitude điểm 2
 * @returns Khoảng cách tính bằng kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Mock shop data với tọa độ (tạm thời)
 * TODO: Thay bằng query từ DB khi có bảng shops
 */
export const SHOP_LOCATIONS: Record<
  string,
  { name: string; lat: number; lon: number }
> = {
  '550e8400-e29b-41d4-a716-446655440000': {
    name: 'Shop District 1 - HCM',
    lat: 10.7769, // Đường Nguyễn Huệ, Q1
    lon: 106.7009,
  },
  '550e8400-e29b-41d4-a716-446655440010': {
    name: 'Shop District 3 - HCM',
    lat: 10.7831, // Võ Văn Tần, Q3
    lon: 106.6899,
  },
  '550e8400-e29b-41d4-a716-446655440020': {
    name: 'Shop Binh Thanh - HCM',
    lat: 10.8142, // Xô Viết Nghệ Tĩnh
    lon: 106.7073,
  },
  '550e8400-e29b-41d4-a716-446655440030': {
    name: 'Shop Thu Duc - HCM',
    lat: 10.8505, // Khu phố 6, Linh Trung
    lon: 106.7718,
  },
};

/**
 * Geocode địa chỉ thành tọa độ (simplified - mock)
 * TODO: Integrate với Google Maps API hoặc Nominatim
 */
export function geocodeAddress(address: { district: string; city: string }): {
  lat: number;
  lon: number;
} {
  // Mock geocoding based on district
  const districtMap: Record<string, { lat: number; lon: number }> = {
    'District 1': { lat: 10.7769, lon: 106.7009 },
    'Quận 1': { lat: 10.7769, lon: 106.7009 },
    'District 3': { lat: 10.7831, lon: 106.6899 },
    'Quận 3': { lat: 10.7831, lon: 106.6899 },
    'Binh Thanh': { lat: 10.8142, lon: 106.7073 },
    'Bình Thạnh': { lat: 10.8142, lon: 106.7073 },
    'Thu Duc': { lat: 10.8505, lon: 106.7718 },
    'Thủ Đức': { lat: 10.8505, lon: 106.7718 },
  };

  return (
    districtMap[address.district] || { lat: 10.7769, lon: 106.7009 } // Default: Q1
  );
}
