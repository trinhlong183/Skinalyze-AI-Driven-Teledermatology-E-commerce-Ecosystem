import { GOONG_API_KEY, GOONG_MAP_KEY } from '@/config/env';
import GoongService from '@/services/goong.service';
import LocationTrackingAPI from '@/services/location-tracking.api';
import LocationService from '@/services/location.service';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface DeliveryMapProps {
  pickupLocation: { latitude: number; longitude: number; address: string };
  deliveryLocation: { latitude: number; longitude: number; address: string };
  orderStatus?: 'pending' | 'accepted' | 'picking' | 'in_transit' | 'delivering' | 'completed' | 'failed' | 'returned';
  orderId?: string; // Add orderId for location tracking
  onNavigate?: () => void;
  showNavigation?: boolean;
}

export default function DeliveryMap({
  pickupLocation,
  deliveryLocation,
  orderStatus = 'pending',
  orderId,
  onNavigate,
  showNavigation = true,
}: DeliveryMapProps) {
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [isTracking, setIsTracking] = useState(false);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    initializeMap();
    return () => {
      LocationService.stopWatchingLocation();
    };
  }, []);

  const initializeMap = async () => {
    try {
      // Get current location first
      const location = await LocationService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
        // Reload directions with current location
        setTimeout(() => loadDirections(), 500);
      } else {
        // Fallback to pickup location
        await loadDirections();
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      Alert.alert('Lỗi', 'Không thể tải bản đồ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const loadDirections = async () => {
    try {
      // Use current location if available, otherwise use delivery location
      const currentLat = currentLocation?.coords.latitude || deliveryLocation.latitude;
      const currentLng = currentLocation?.coords.longitude || deliveryLocation.longitude;

      const origin = {
        lat: currentLat,
        lng: currentLng,
      };

      // Always go to delivery location
      const destination = {
        lat: deliveryLocation.latitude,
        lng: deliveryLocation.longitude,
      };

      const directions = await GoongService.getDirections(origin, destination, 'bike');

      if (directions.routes && directions.routes.length > 0) {
        const route = directions.routes[0];
        if (route.legs && route.legs.length > 0) {
          const leg = route.legs[0];
          setDistance(leg.distance.text);
          setDuration(leg.duration.text);
        }
      }
    } catch (error) {
      console.error('Error loading directions:', error);
    }
  };

  const startTracking = () => {
    setIsTracking(true);
    LocationService.watchLocation(
      (location) => {
        setCurrentLocation(location);
        // Update map with new location
        sendLocationToMap(location.coords.latitude, location.coords.longitude);
        
        // TODO: Send location to backend
        sendLocationToBackend(location.coords.latitude, location.coords.longitude);
      },
      (error) => {
        console.error('Location tracking error:', error);
        Alert.alert('Lỗi', 'Không thể theo dõi vị trí của bạn.');
        setIsTracking(false);
      }
    );
  };

  const stopTracking = () => {
    setIsTracking(false);
    LocationService.stopWatchingLocation();
  };

  const sendLocationToMap = (lat: number, lng: number) => {
    const script = `
      if (window.updateCurrentLocation) {
        window.updateCurrentLocation(${lat}, ${lng});
      }
      true;
    `;
    webViewRef.current?.injectJavaScript(script);
  };

  const sendLocationToBackend = async (lat: number, lng: number) => {
    try {
      if (!orderId) {
        console.warn('No orderId provided, skipping location update');
        return;
      }

      await LocationTrackingAPI.sendLocation({
        orderId,
        lat,
        lng,
        timestamp: new Date().toISOString(),
      });
      
      console.log('✅ Location sent to backend:', { orderId, lat, lng });
    } catch (error) {
      console.error('❌ Error sending location to backend:', error);
      // Don't show alert to avoid interrupting user experience
    }
  };

  const centerMap = () => {
    const script = `
      if (window.centerMapOnRoute) {
        window.centerMapOnRoute();
      }
      true;
    `;
    webViewRef.current?.injectJavaScript(script);
  };

  const goToCurrentLocation = () => {
    if (currentLocation) {
      const script = `
        if (window.goToLocation) {
          window.goToLocation(${currentLocation.coords.latitude}, ${currentLocation.coords.longitude});
        }
        true;
      `;
      webViewRef.current?.injectJavaScript(script);
    }
  };

  // Generate HTML with Goong Maps
  const generateMapHTML = () => {
    const currentLat = currentLocation?.coords.latitude || deliveryLocation.latitude;
    const currentLng = currentLocation?.coords.longitude || deliveryLocation.longitude;

    // Always target delivery location (removed pickup routing)
    const targetLat = deliveryLocation.latitude;
    const targetLng = deliveryLocation.longitude;
    
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
    .marker-pickup {
      background-color: #66BB6A;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    .marker-delivery {
      background-color: #EF5350;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
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
  <div id="map"></div>
  <script>
    goongjs.accessToken = '${GOONG_MAP_KEY}';
    
    // Initialize map
    var map = new goongjs.Map({
      container: 'map',
      style: 'https://tiles.goong.io/assets/goong_map_web.json',
      center: [${(pickupLocation.longitude + deliveryLocation.longitude) / 2}, ${(pickupLocation.latitude + deliveryLocation.latitude) / 2}],
      zoom: 13
    });

    var currentMarker = null;
    var routeLayer = null;

    // Only add delivery marker (removed pickup marker)
    var deliveryEl = document.createElement('div');
    deliveryEl.className = 'marker-delivery';
    new goongjs.Marker(deliveryEl)
      .setLngLat([${deliveryLocation.longitude}, ${deliveryLocation.latitude}])
      .setPopup(new goongjs.Popup().setHTML('<h3>Điểm giao hàng</h3><p>${deliveryLocation.address}</p>'))
      .addTo(map);

    // Add current location marker
    var currentEl = document.createElement('div');
    currentEl.className = 'marker-current';
    currentMarker = new goongjs.Marker(currentEl)
      .setLngLat([${currentLng}, ${currentLat}])
      .addTo(map);

    // Load and display route
    map.on('load', function() {
      // Use current location (shipper) as origin
      // Target is pickup location if picking, delivery location if delivering
      fetch('https://rsapi.goong.io/Direction?origin=${currentLat},${currentLng}&destination=${targetLat},${targetLng}&vehicle=bike&api_key=${GOONG_API_KEY}')
        .then(response => response.json())
        .then(data => {
          if (data.routes && data.routes.length > 0) {
            var route = data.routes[0];
            var coordinates = decodePolyline(route.overview_polyline.points);
            
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

            routeLayer = 'route';
            
            // Fit bounds to show entire route
            var bounds = new goongjs.LngLatBounds();
            coordinates.forEach(coord => bounds.extend(coord));
            bounds.extend([${currentLng}, ${currentLat}]);
            bounds.extend([${targetLng}, ${targetLat}]);
            map.fitBounds(bounds, { padding: 50 });
          }
        })
        .catch(error => console.error('Error loading route:', error));
    });

    // Decode polyline function
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

    // Functions to be called from React Native
    window.updateCurrentLocation = function(lat, lng) {
      if (currentMarker) {
        currentMarker.setLngLat([lng, lat]);
      }
    };

    window.goToLocation = function(lat, lng) {
      map.flyTo({
        center: [lng, lat],
        zoom: 15
      });
    };

    window.centerMapOnRoute = function() {
      // Center on delivery location only
      map.flyTo({
        center: [${deliveryLocation.longitude}, ${deliveryLocation.latitude}],
        zoom: 15
      });
    };
  </script>
</body>
</html>
    `;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#42A5F5" />
        <Text style={styles.loadingText}>Đang tải bản đồ...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: generateMapHTML() }}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
        }}
      />

      {/* Distance & Duration Info */}
      {(distance || duration) && (
        <View style={styles.infoCard}>
          {distance && (
            <View style={styles.infoItem}>
              <Ionicons name="navigate" size={20} color="#42A5F5" />
              <Text style={styles.infoText}>{distance}</Text>
            </View>
          )}
          {duration && (
            <View style={styles.infoItem}>
              <Ionicons name="time" size={20} color="#42A5F5" />
              <Text style={styles.infoText}>{duration}</Text>
            </View>
          )}
        </View>
      )}

      {/* Map Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={centerMap}>
          <Ionicons name="scan-outline" size={24} color="#333" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={goToCurrentLocation}>
          <Ionicons name="locate" size={24} color="#333" />
        </TouchableOpacity>

        {showNavigation && (
          <TouchableOpacity
            style={[styles.controlButton, isTracking && styles.trackingButton]}
            onPress={isTracking ? stopTracking : startTracking}
          >
            <Ionicons
              name={isTracking ? 'stop' : 'play'}
              size={24}
              color={isTracking ? '#fff' : '#333'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Navigate Button */}
      {showNavigation && onNavigate && (
        <TouchableOpacity style={styles.navigateButton} onPress={onNavigate}>
          <Ionicons name="navigate" size={24} color="#fff" />
          <Text style={styles.navigateText}>Bắt đầu điều hướng</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  infoCard: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  controls: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    gap: 12,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  trackingButton: {
    backgroundColor: '#66BB6A',
  },
  navigateButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#42A5F5',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  navigateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
