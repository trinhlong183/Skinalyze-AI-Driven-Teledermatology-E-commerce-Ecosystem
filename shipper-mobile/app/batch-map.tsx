import { GOONG_API_KEY, GOONG_MAP_KEY } from "@/config/env";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

interface DeliveryLocation {
  orderId: string;
  address: string;
  status: string;
  customerName: string;
}

const statusColors: Record<string, string> = {
  PENDING: "#FFA726",
  ASSIGNED: "#42A5F5",
  PICKED_UP: "#AB47BC",
  IN_TRANSIT: "#9C27B0",
  OUT_FOR_DELIVERY: "#66BB6A",
  DELIVERED: "#4CAF50",
  FAILED: "#EF5350",
  RETURNED: "#FF6F00",
};

export default function BatchMapScreen() {
  const { batchCode, locations: locationsParam } = useLocalSearchParams<{
    batchCode: string;
    locations: string;
  }>();

  const [locations, setLocations] = useState<DeliveryLocation[]>([]);
  const [currentLocation, setCurrentLocation] =
    useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] =
    useState<DeliveryLocation | null>(null);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (locationsParam) {
      try {
        const parsed = JSON.parse(locationsParam);
        setLocations(parsed);
      } catch (error) {
        console.error("Error parsing locations:", error);
        Alert.alert("Lỗi", "Không thể tải thông tin địa chỉ");
      }
    }
    initializeMap();
  }, [locationsParam]);

  const initializeMap = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Lỗi", "Cần cấp quyền truy cập vị trí");
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location);
      setLoading(false);
    } catch (error) {
      console.error("Error getting location:", error);
      setLoading(false);
    }
  };

  const refreshLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location);
      Alert.alert("Thành công", "Đã cập nhật vị trí");
    } catch (error) {
      console.error("Error refreshing location:", error);
      Alert.alert("Lỗi", "Không thể cập nhật vị trí");
    }
  };

  const showRouteToLocation = (location: DeliveryLocation) => {
    setSelectedLocation(location);
    // Trigger route drawing in WebView
    if (currentLocation) {
      const address = location.address.replace(/'/g, "\\'");
      const customerName = location.customerName
        ? location.customerName.replace(/'/g, "\\'")
        : "";
      const script = `
        if (window.drawRouteToAddress) {
          window.drawRouteToAddress('${address}', '${customerName}');
        }
        true;
      `;
      webViewRef.current?.injectJavaScript(script);
    }
  };

  const goToLocation = (lat: number, lng: number) => {
    const script = `
      if (window.goToLocation) {
        window.goToLocation(${lat}, ${lng});
      }
      true;
    `;
    webViewRef.current?.injectJavaScript(script);
  };

  const generateMapHTML = () => {
    const deliveredCount = locations.filter(
      (l) => l.status === "DELIVERED"
    ).length;
    const inProgressCount = locations.filter(
      (l) => l.status === "IN_TRANSIT" || l.status === "OUT_FOR_DELIVERY"
    ).length;

    const currentLat = currentLocation?.coords.latitude || 10.762622;
    const currentLng = currentLocation?.coords.longitude || 106.660172;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
  <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css" rel="stylesheet" />
  <style>
    body { margin: 0; padding: 0; }
    #map { position: absolute; top: 0; bottom: 0; width: 100%; }
    .batch-info {
      position: absolute;
      top: 110px;
      left: 10px;
      right: 10px;
      background: white;
      padding: 14px;
      border-radius: 12px;
      box-shadow: 0 3px 12px rgba(0,0,0,0.2);
      z-index: 1;
    }
    .batch-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e0e0e0;
    }
    .batch-code { 
      font-weight: bold; 
      font-size: 16px;
      color: #2196F3;
    }
    .batch-title {
      font-size: 11px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .batch-stats { 
      display: flex; 
      gap: 16px; 
      font-size: 12px;
      color: #666;
    }
    .stat-item { 
      display: flex; 
      align-items: center; 
      gap: 6px;
      flex: 1;
    }
    .stat-icon {
      font-size: 16px;
    }
    .stat-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .stat-label {
      font-size: 10px;
      color: #999;
    }
    .stat-value {
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }
    .marker-current {
      background-color: #2196F3;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 0 5px rgba(33, 150, 243, 0.3);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.7);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(33, 150, 243, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(33, 150, 243, 0);
      }
    }
  </style>
</head>
<body>
  <div class="batch-info">
    <div class="batch-header">
      <div>
        <div class="batch-title">BATCH DELIVERY</div>
        <div class="batch-code">${batchCode}</div>
      </div>
    </div>
    <div class="batch-stats">
      <div class="stat-item">
        <span class="stat-icon">📦</span>
        <div class="stat-text">
          <div class="stat-label">Tổng đơn</div>
          <div class="stat-value">${locations.length}</div>
        </div>
      </div>
      <div class="stat-item">
        <span class="stat-icon">✅</span>
        <div class="stat-text">
          <div class="stat-label">Đã giao</div>
          <div class="stat-value">${deliveredCount}</div>
        </div>
      </div>
      <div class="stat-item">
        <span class="stat-icon">🚚</span>
        <div class="stat-text">
          <div class="stat-label">Đang giao</div>
          <div class="stat-value">${inProgressCount}</div>
        </div>
      </div>
    </div>
  </div>
  <div id='map'></div>
  <script>
    goongjs.accessToken = '${GOONG_MAP_KEY}';
    
    const map = new goongjs.Map({
      container: 'map',
      style: 'https://tiles.goong.io/assets/goong_map_web.json',
      center: [${currentLng}, ${currentLat}],
      zoom: 13
    });

    const locations = ${JSON.stringify(locations)};
    const statusColors = ${JSON.stringify(statusColors)};
    let currentMarker = null;

    map.on('load', function() {
      // Add current location marker
      const currentEl = document.createElement('div');
      currentEl.className = 'marker-current';
      currentMarker = new goongjs.Marker(currentEl)
        .setLngLat([${currentLng}, ${currentLat}])
        .setPopup(new goongjs.Popup({ offset: 25 }).setHTML('<p style="margin:4px;"><strong>Vị trí hiện tại</strong></p>'))
        .addTo(map);

      // Note: In production, you would geocode addresses to get coordinates
      // Then plot markers and draw routes using Goong Directions API
      // For now, we show current location and list addresses below

      // Auto-draw routes to all locations
      const bounds = new goongjs.LngLatBounds();
      bounds.extend([${currentLng}, ${currentLat}]);
      
      let routesDrawn = 0;
      const totalLocations = locations.length;

      locations.forEach((loc, index) => {
        const color = statusColors[loc.status] || '#999';
        
        // Geocode and draw route for each location
        fetch('https://rsapi.goong.io/geocode?address=' + encodeURIComponent(loc.address) + '&api_key=${GOONG_API_KEY}')
          .then(res => res.json())
          .then(data => {
            if (data.results && data.results.length > 0) {
              const destLat = data.results[0].geometry.location.lat;
              const destLng = data.results[0].geometry.location.lng;
              
              // Add marker for this location
              const el = document.createElement('div');
              el.style.cssText = \`
                width: 30px;
                height: 30px;
                border-radius: 50%;
                background: \${color};
                border: 3px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 12px;
              \`;
              el.textContent = index + 1;
              
              new goongjs.Marker(el)
                .setLngLat([destLng, destLat])
                .setPopup(new goongjs.Popup({ offset: 25 })
                  .setHTML('<p style="margin:4px;"><strong>' + loc.customerName + '</strong><br/>' + loc.address + '</p>'))
                .addTo(map);

              // Extend bounds to include this location
              bounds.extend([destLng, destLat]);
              
              // Get route from current location to this destination
              return fetch('https://rsapi.goong.io/Direction?origin=${currentLat},${currentLng}&destination=' + 
                           destLat + ',' + destLng + '&vehicle=bike&api_key=${GOONG_API_KEY}');
            }
          })
          .then(res => res ? res.json() : null)
          .then(data => {
            if (data && data.routes && data.routes.length > 0) {
              const route = data.routes[0];
              const coordinates = decodePolyline(route.overview_polyline.points);
              
              // Add route layer with unique ID
              const layerId = 'route-' + index;
              const sourceId = 'route-source-' + index;
              
              map.addSource(sourceId, {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: coordinates
                  }
                }
              });

              map.addLayer({
                id: layerId,
                type: 'line',
                source: sourceId,
                layout: {
                  'line-join': 'round',
                  'line-cap': 'round'
                },
                paint: {
                  'line-color': color,
                  'line-width': 3,
                  'line-opacity': 0.7
                }
              });

              routesDrawn++;
              
              // After all routes drawn, fit bounds
              if (routesDrawn === totalLocations) {
                map.fitBounds(bounds, { padding: 50 });
              }
            }
          })
          .catch(err => console.error('Route error for location', index, ':', err));
      });
    });

    // Function to update current location from React Native
    window.updateCurrentLocation = function(lat, lng) {
      if (currentMarker) {
        currentMarker.setLngLat([lng, lat]);
        map.flyTo({ center: [lng, lat] });
      }
    };

    // Function to draw route to specific address
    window.drawRouteToAddress = function(address, customerName) {
      // Remove existing route layer if any
      if (map.getLayer('route')) {
        map.removeLayer('route');
        map.removeSource('route');
      }

      // In production, geocode the address first
      // For demo, show alert that route would be drawn
      const currentLat = ${currentLat};
      const currentLng = ${currentLng};
      
      // TODO: 
      // 1. Geocode address to get destination lat/lng using Goong Geocoding API
      // 2. Call Goong Directions API to get route
      // 3. Decode polyline and draw on map
      
      // Example implementation (requires geocoding):
      /*
      fetch('https://rsapi.goong.io/geocode?address=' + encodeURIComponent(address) + '&api_key=${
        process.env.GOONG_API_KEY
      }')r
        .then(res => res.json())
        .then(data => {
          if (data.results && data.results.length > 0) {
            const destLat = data.results[0].geometry.location.lat;
            const destLng = data.results[0].geometry.location.lng;
            
            return fetch('https://rsapi.goong.io/Direction?origin=' + currentLat + ',' + currentLng + 
                         '&destination=' + destLat + ',' + destLng + 
                         '&vehicle=bike&api_key=${GOONG_API_KEY}');
          }
        })
        .then(res => res.json())
        .then(data => {
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const coordinates = decodePolyline(route.overview_polyline.points);
            
            map.addSource('route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: coordinates
                }
              }
            });

            map.addLayer({
              id: 'route',
              type: 'line',
              source: 'route',
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': '#42A5F5',
                'line-width': 4
              }
            });

            // Fit map to show route
            const bounds = new goongjs.LngLatBounds();
            coordinates.forEach(coord => bounds.extend(coord));
            map.fitBounds(bounds, { padding: 50 });
          }
        })
        .catch(err => console.error('Route error:', err));
      */

      console.log('Drawing route to:', address, customerName);
    };

    // Function to go to specific location
    window.goToLocation = function(lat, lng) {
      map.flyTo({
        center: [lng, lat],
        zoom: 15
      });
    };

    // Decode polyline helper function
    function decodePolyline(encoded) {
      var points = [];
      var index = 0, len = encoded.length;
      var lat = 0, lng = 0;

      while (index < len) {
        var b, shift = 0, result = 0;
        do {
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);
        var dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;
        do {
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);
        var dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        points.push([lng / 1e5, lat / 1e5]);
      }
      return points;
    }
  </script>
</body>
</html>
    `;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Đang tải bản đồ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fullscreen Map */}
      <WebView
        ref={webViewRef}
        source={{ html: generateMapHTML() }}
        style={styles.mapFullscreen}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />

      {/* Floating Back Button */}
      <TouchableOpacity
        style={styles.floatingBackButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      {/* Floating Refresh Location Button */}
      <TouchableOpacity
        style={styles.floatingRefreshButton}
        onPress={refreshLocation}
      >
        <Ionicons name="locate" size={24} color="#2196F3" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
  },
  mapFullscreen: {
    flex: 1,
  },
  floatingBackButton: {
    position: "absolute",
    top: 50,
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingRefreshButton: {
    position: "absolute",
    top: 50,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
