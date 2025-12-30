import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import config from '@/config/env';

interface Location {
  lat: number;
  lng: number;
}

interface GoongMapProps {
  shipperLocation?: Location | null;
  customerLocation?: Location | null;
  polyline?: string | null;
  style?: any;
}

export default function GoongMap({
  shipperLocation,
  customerLocation,
  polyline,
  style,
}: GoongMapProps) {
  const webViewRef = useRef<WebView>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Update map when locations change (only after map is ready)
  useEffect(() => {
    ('🗺️ GoongMap update:', {
      hasShipperLocation: !!shipperLocation,
      shipperLocation,
      hasCustomerLocation: !!customerLocation,
      customerLocation,
      hasPolyline: !!polyline,
      polylineLength: polyline?.length || 0,
      isMapReady,
    });

    if (!isMapReady) {
      ('⏳ Map not ready yet, skipping update');
      return;
    }

    if (webViewRef.current && (shipperLocation || customerLocation)) {
      // Small delay to ensure map is fully initialized
      setTimeout(() => {
        const updateScript = `
          if (typeof updateLocations === 'function') {
            ('📍 Updating map with:', {
              shipper: ${shipperLocation ? JSON.stringify(shipperLocation) : 'null'},
              customer: ${customerLocation ? JSON.stringify(customerLocation) : 'null'},
              hasPolyline: ${!!polyline}
            });
            updateLocations(
              ${shipperLocation ? JSON.stringify(shipperLocation) : 'null'},
              ${customerLocation ? JSON.stringify(customerLocation) : 'null'},
              ${polyline ? JSON.stringify(polyline) : 'null'}
            );
          } else {
            console.error('❌ updateLocations function not found');
          }
          true; // Required for Android
        `;
        webViewRef.current?.injectJavaScript(updateScript);
      }, 300);
    }
  }, [shipperLocation, customerLocation, polyline, isMapReady]);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <title>Goong Maps Tracking</title>
      <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"></script>
      <link href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css" rel="stylesheet" />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { overflow: hidden; }
        #map { position: absolute; top: 0; bottom: 0; left: 0; right: 0; }
        .marker {
          background-size: contain;
          background-repeat: no-repeat;
          width: 30px;
          height: 30px;
        }
        .shipper-marker {
          background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%234CAF50"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>');
        }
        .customer-marker {
          background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FF5722"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>');
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        // Initialize Goong Maps
        goongjs.accessToken = '${config.GOONG_MAP_KEY}';
        
        var map = new goongjs.Map({
          container: 'map',
          style: 'https://tiles.goong.io/assets/goong_map_web.json',
          center: [105.83991, 21.028], // Default: Hanoi
          zoom: 13
        });

        var shipperMarker = null;
        var customerMarker = null;
        var routeLayer = null;

        // Function to decode polyline
        function decodePolyline(encoded) {
          if (!encoded) return [];
          
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

            points.push([lng * 1e-5, lat * 1e-5]);
          }

          return points;
        }

        // Update locations function
        window.updateLocations = function(shipper, customer, polylineStr) {
          ('🗺️ updateLocations called with:', { 
            shipper, 
            customer, 
            hasPolyline: !!polylineStr,
            polylineLength: polylineStr?.length || 0
          });

          // Remove old markers
          if (shipperMarker) shipperMarker.remove();
          if (customerMarker) customerMarker.remove();

          // Remove old route
          if (map.getLayer('route')) {
            map.removeLayer('route');
            map.removeSource('route');
          }

          var bounds = null;

          // Add shipper marker
          if (shipper && shipper.lat && shipper.lng) {
            ('📍 Adding shipper marker at:', shipper.lat, shipper.lng);
            var shipperEl = document.createElement('div');
            shipperEl.className = 'marker shipper-marker';
            
            shipperMarker = new goongjs.Marker(shipperEl)
              .setLngLat([shipper.lng, shipper.lat])
              .setPopup(new goongjs.Popup().setHTML('<strong>Shipper</strong><br>Đang giao hàng'))
              .addTo(map);

            bounds = new goongjs.LngLatBounds([shipper.lng, shipper.lat], [shipper.lng, shipper.lat]);
            ('✅ Shipper marker added');
          }

          // Add customer marker
          if (customer && customer.lat && customer.lng) {
            ('📍 Adding customer marker at:', customer.lat, customer.lng);
            var customerEl = document.createElement('div');
            customerEl.className = 'marker customer-marker';
            
            customerMarker = new goongjs.Marker(customerEl)
              .setLngLat([customer.lng, customer.lat])
              .setPopup(new goongjs.Popup().setHTML('<strong>Địa chỉ giao hàng</strong>'))
              .addTo(map);

            if (!bounds) {
              bounds = new goongjs.LngLatBounds([customer.lng, customer.lat], [customer.lng, customer.lat]);
            } else {
              bounds.extend([customer.lng, customer.lat]);
            }
            ('✅ Customer marker added');
          }

          // Draw route
          if (polylineStr) {
            ('🛣️ Drawing route, polyline length:', polylineStr.length);
            var coordinates = decodePolyline(polylineStr);
            ('🛣️ Decoded coordinates:', coordinates.length, 'points');
            
            if (coordinates.length > 0) {
              ('🛣️ First point:', coordinates[0], 'Last point:', coordinates[coordinates.length - 1]);
              
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
                  'line-color': '#2196F3',
                  'line-width': 4,
                  'line-opacity': 0.8
                }
              });

              // Extend bounds to include route
              coordinates.forEach(coord => {
                if (bounds) bounds.extend(coord);
              });
              
              ('✅ Route drawn successfully');
            } else {
              console.warn('⚠️ No coordinates after decode');
            }
          } else {
            ('ℹ️ No polyline provided');
          }

          // Fit map to bounds
          if (bounds) {
            ('📏 Fitting map to bounds...');
            map.fitBounds(bounds, {
              padding: { top: 50, bottom: 50, left: 50, right: 50 },
              maxZoom: 15,
              duration: 1000
            });
            ('✅ Map fitted to bounds');
          } else {
            console.warn('⚠️ No bounds calculated, using default center');
          }
        };

        // Wait for map to load
        map.on('load', function() {
          ('Goong Map loaded successfully');
          window.ReactNativeWebView?.postMessage('MAP_READY');
        });

        // Handle errors
        map.on('error', function(e) {
          console.error('Map error:', e);
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
          </View>
        )}
        onMessage={(event) => {
          if (event.nativeEvent.data === 'MAP_READY') {
            ('✅ Goong Map ready, enabling updates');
            setIsMapReady(true);
          }
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('❌ WebView error:', nativeEvent);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E9',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
  },
});
