import GoongService from "@/services/goong.service";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

interface Marker {
  lat: number;
  lng: number;
  label: string;
  color?: string;
}

interface SearchSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  distance_meters?: number;
}

interface RouteInfo {
  distance: string;
  duration: string;
  steps: Array<{
    instruction: string;
    distance: string;
    duration: string;
  }>;
}

export default function MapScreen() {
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [mapCenter, setMapCenter] = useState({
    lat: 10.762622,
    lng: 106.660172,
  });
  const [zoom, setZoom] = useState(13);
  const [routePolyline, setRoutePolyline] = useState<string>("");
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Lỗi", "Cần cấp quyền truy cập vị trí để sử dụng bản đồ");
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const currentPos = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      setCurrentLocation(currentPos);
      setMapCenter(currentPos);
      setMarkers([
        {
          lat: currentPos.lat,
          lng: currentPos.lng,
          label: "Vị trí của bạn",
          color: "#4CAF50",
        },
      ]);
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Lỗi", "Không thể lấy vị trí hiện tại");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = async (text: string) => {
    setSearchQuery(text);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (text.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await GoongService.autocomplete(
          text,
          currentLocation || undefined,
          { limit: 10, radius: 50 }
        );
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Autocomplete error:", error);
      }
    }, 300);
  };

  const handleSelectSuggestion = async (suggestion: SearchSuggestion) => {
    try {
      setLoading(true);
      setShowSuggestions(false);
      setSearchQuery(suggestion.description);
      Keyboard.dismiss();

      // Get place detail
      const placeDetail = await GoongService.getPlaceDetail(
        suggestion.place_id
      );
      const destination = placeDetail.result.geometry.location;

      // Update markers
      const newMarkers = currentLocation
        ? [
            {
              lat: currentLocation.lat,
              lng: currentLocation.lng,
              label: "Vị trí của bạn",
              color: "#4CAF50",
            },
            {
              lat: destination.lat,
              lng: destination.lng,
              label: suggestion.structured_formatting.main_text,
              color: "#EF5350",
            },
          ]
        : [
            {
              lat: destination.lat,
              lng: destination.lng,
              label: suggestion.structured_formatting.main_text,
              color: "#EF5350",
            },
          ];

      setMarkers(newMarkers);
      setMapCenter(destination);
      setZoom(15);

      // Get directions if current location exists
      if (currentLocation) {
        const directions = await GoongService.getDirections(
          currentLocation,
          destination,
          "bike"
        );

        if (directions.routes.length > 0) {
          const route = directions.routes[0];
          const leg = route.legs[0];

          // Set polyline for map
          setRoutePolyline(route.overview_polyline.points);

          // Prepare route info
          const steps = leg.steps.map((step) => ({
            instruction: step.html_instructions
              .replace(/<[^>]*>/g, "")
              .replace(/&nbsp;/g, " "),
            distance: step.distance.text,
            duration: step.duration.text,
          }));

          setRouteInfo({
            distance: leg.distance.text,
            duration: leg.duration.text,
            steps,
          });

          setShowRouteModal(true);
        }
      }
    } catch (error) {
      console.error("Error selecting suggestion:", error);
      Alert.alert("Lỗi", "Không thể lấy thông tin địa điểm");
    } finally {
      setLoading(false);
    }
  };

  const handleClearRoute = () => {
    setRoutePolyline("");
    setRouteInfo(null);
    setShowRouteModal(false);
    if (currentLocation) {
      setMarkers([
        {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          label: "Vị trí của bạn",
          color: "#4CAF50",
        },
      ]);
      setMapCenter(currentLocation);
    }
  };

  const handleCenterToCurrentLocation = () => {
    if (currentLocation) {
      setMapCenter(currentLocation);
      setZoom(15);
    } else {
      Alert.alert("Thông báo", "Chưa có thông tin vị trí hiện tại");
    }
  };

  // Generate HTML for WebView with Goong Maps
  const generateMapHTML = () => {
    const mapKey = GoongService.getMapKey();
    const markersHTML = markers
      .map(
        (marker) => `
      new goongjs.Marker({ color: '${marker.color || "#42A5F5"}' })
        .setLngLat([${marker.lng}, ${marker.lat}])
        .setPopup(new goongjs.Popup().setHTML('<div style="padding: 8px; font-family: sans-serif;"><strong>${marker.label}</strong></div>'))
        .addTo(map);
    `
      )
      .join("");

    const polylineHTML = routePolyline
      ? `
      // Decode and draw polyline
      const polyline = '${routePolyline}';
      const coordinates = decodePolyline(polyline);

      map.on('load', function() {
        map.addSource('route', {
          'type': 'geojson',
          'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': {
              'type': 'LineString',
              'coordinates': coordinates
            }
          }
        });

        map.addLayer({
          'id': 'route',
          'type': 'line',
          'source': 'route',
          'layout': {
            'line-join': 'round',
            'line-cap': 'round'
          },
          'paint': {
            'line-color': '#2196F3',
            'line-width': 5,
            'line-opacity': 0.8
          }
        });

        // Fit bounds to show entire route
        const bounds = coordinates.reduce(function(bounds, coord) {
          return bounds.extend(coord);
        }, new goongjs.LngLatBounds(coordinates[0], coordinates[0]));

        map.fitBounds(bounds, {
          padding: 60
        });
      });

      function decodePolyline(encoded) {
        const points = [];
        let index = 0, len = encoded.length;
        let lat = 0, lng = 0;

        while (index < len) {
          let b, shift = 0, result = 0;
          do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
          } while (b >= 0x20);
          const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
          lat += dlat;

          shift = 0;
          result = 0;
          do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
          } while (b >= 0x20);
          const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
          lng += dlng;

          points.push([lng / 1e5, lat / 1e5]);
        }
        return points;
      }
    `
      : "";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <title>Goong Map</title>
        <link href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css" rel="stylesheet" />
        <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { position: absolute; top: 0; bottom: 0; width: 100%; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          goongjs.accessToken = '${mapKey}';
          const map = new goongjs.Map({
            container: 'map',
            style: 'https://tiles.goong.io/assets/goong_map_web.json',
            center: [${mapCenter.lng}, ${mapCenter.lat}],
            zoom: ${zoom}
          });

          // Add navigation controls
          map.addControl(new goongjs.NavigationControl());

          // Add markers
          ${markersHTML}

          // Draw route polyline
          ${polylineHTML}
        </script>
      </body>
      </html>
    `;
  };

  if (loading && !currentLocation) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#42A5F5" />
          <Text style={styles.loadingText}>Đang tải bản đồ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bản đồ</Text>
        <TouchableOpacity
          onPress={getCurrentLocation}
          style={styles.refreshButton}
        >
          <Ionicons name="refresh-outline" size={24} color="#42A5F5" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color="#666"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm địa điểm..."
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
          />
          {(searchQuery.length > 0 || routePolyline) && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setSuggestions([]);
                setShowSuggestions(false);
                handleClearRoute();
              }}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSelectSuggestion(item)}
              >
                <View style={styles.suggestionIcon}>
                  <Ionicons name="location-outline" size={20} color="#666" />
                </View>
                <View style={styles.suggestionText}>
                  <Text style={styles.suggestionMain}>
                    {item.structured_formatting.main_text}
                  </Text>
                  <Text style={styles.suggestionSecondary}>
                    {item.structured_formatting.secondary_text}
                  </Text>
                </View>
                {item.distance_meters && (
                  <Text style={styles.suggestionDistance}>
                    {(item.distance_meters / 1000).toFixed(1)} km
                  </Text>
                )}
              </TouchableOpacity>
            )}
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {/* Map View */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: generateMapHTML() }}
          style={styles.map}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.mapLoadingContainer}>
              <ActivityIndicator size="large" color="#42A5F5" />
            </View>
          )}
        />

        {/* Location Button */}
        <TouchableOpacity
          style={styles.locationButton}
          onPress={handleCenterToCurrentLocation}
        >
          <Ionicons name="locate-outline" size={24} color="#42A5F5" />
        </TouchableOpacity>

        {/* Route Info Button */}
        {routeInfo && (
          <TouchableOpacity
            style={styles.routeInfoButton}
            onPress={() => setShowRouteModal(true)}
          >
            <Ionicons name="navigate-outline" size={20} color="#fff" />
            <Text style={styles.routeInfoButtonText}>
              {routeInfo.distance} • {routeInfo.duration}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Route Details Modal */}
      <Modal
        visible={showRouteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRouteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Chỉ đường</Text>
                {routeInfo && (
                  <Text style={styles.modalSubtitle}>
                    {routeInfo.distance} • {routeInfo.duration}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowRouteModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Steps List */}
            {routeInfo && (
              <FlatList
                data={routeInfo.steps}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item, index }) => (
                  <View style={styles.stepItem}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepInstruction}>
                        {item.instruction}
                      </Text>
                      <Text style={styles.stepMeta}>
                        {item.distance} • {item.duration}
                      </Text>
                    </View>
                  </View>
                )}
                style={styles.stepsList}
                contentContainerStyle={styles.stepsListContent}
              />
            )}

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowRouteModal(false)}
            >
              <Text style={styles.closeButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: "#333",
  },
  clearButton: {
    padding: 4,
  },
  suggestionsContainer: {
    backgroundColor: "#fff",
    maxHeight: 300,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  suggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionMain: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  suggestionSecondary: {
    fontSize: 13,
    color: "#999",
  },
  suggestionDistance: {
    fontSize: 12,
    color: "#42A5F5",
    fontWeight: "600",
    marginLeft: 8,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  mapLoadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  locationButton: {
    position: "absolute",
    right: 16,
    bottom: 100,
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
  routeInfoButton: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#2196F3",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  routeInfoButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#2196F3",
    marginTop: 4,
    fontWeight: "600",
  },
  stepsList: {
    flex: 1,
  },
  stepsListContent: {
    padding: 16,
  },
  stepItem: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2196F3",
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 15,
    color: "#333",
    marginBottom: 4,
    lineHeight: 20,
  },
  stepMeta: {
    fontSize: 13,
    color: "#999",
  },
  closeButton: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: "#f5f5f5",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
});
