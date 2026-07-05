import { forwardRef, useImperativeHandle, useRef, useEffect, useCallback, RefObject } from "react";
import { StyleSheet } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import type { Coordenada } from "../types/geo";
import { colors } from "../theme/colors";

export type TipoMapa = "standard" | "satellite";

export type LeafletMapHandle = {
  recentrar: () => void;
};

type Props = {
  userLocation: Coordenada | null;
  accuracyMeters: number;
  destination: Coordenada | null;
  routePoints: Coordenada[];
  mapType: TipoMapa;
  onMapTap?: (coord: Coordenada) => void;
};

const HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #E4EBF2; }
    .orientago-user-dot {
      width: 18px; height: 18px; border-radius: 9px;
      background: #0C447C; border: 3px solid #FFFFFF;
      box-shadow: 0 0 4px rgba(0,0,0,0.4);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([-0.1807, -78.4678], 15);

    var capaEstandar = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
    var capaSatelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 });
    capaEstandar.addTo(map);
    var capaActual = 'standard';

    var userMarker = null;
    var accuracyCircle = null;
    var destMarker = null;
    var routeLine = null;

    var userIcon = L.divIcon({ className: '', html: '<div class="orientago-user-dot"></div>', iconSize: [18, 18] });
    var pinSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30"><path fill="#3B6D11" d="M12 2C7.6 2 4 5.6 4 10c0 5.2 6.6 11.2 7.3 11.8.4.4 1 .4 1.4 0C13.4 21.2 20 15.2 20 10c0-4.4-3.6-8-8-8z"/><circle cx="12" cy="10" r="3" fill="#FFFFFF"/></svg>';
    var destIcon = L.divIcon({ className: '', html: pinSvg, iconSize: [30, 30], iconAnchor: [15, 28] });

    function post(msg) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }

    map.on('click', function(e) {
      post({ type: 'tap', lat: e.latlng.lat, lon: e.latlng.lng });
    });

    window.__setUser = function(lat, lon, accuracy) {
      var latlng = [lat, lon];
      if (!userMarker) {
        userMarker = L.marker(latlng, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
        accuracyCircle = L.circle(latlng, { radius: accuracy, color: '#0C447C', fillColor: '#0C447C', fillOpacity: 0.12, weight: 1 }).addTo(map);
        map.setView(latlng, 16);
      } else {
        userMarker.setLatLng(latlng);
        accuracyCircle.setLatLng(latlng);
        accuracyCircle.setRadius(accuracy);
      }
    };

    window.__setDestination = function(lat, lon) {
      var latlng = [lat, lon];
      if (!destMarker) {
        destMarker = L.marker(latlng, { icon: destIcon }).addTo(map);
      } else {
        destMarker.setLatLng(latlng);
      }
    };

    window.__clearDestination = function() {
      if (destMarker) { map.removeLayer(destMarker); destMarker = null; }
      window.__clearRoute();
    };

    window.__setRoute = function(pointsJson) {
      var points = JSON.parse(pointsJson);
      if (routeLine) map.removeLayer(routeLine);
      routeLine = L.polyline(points, { color: '#0C447C', weight: 5, opacity: 0.85 }).addTo(map);
      map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
    };

    window.__clearRoute = function() {
      if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
    };

    window.__recentrar = function() {
      if (userMarker) map.setView(userMarker.getLatLng(), 16);
    };

    window.__setMapType = function(tipo) {
      if (tipo === capaActual) return;
      if (tipo === 'satellite') { map.removeLayer(capaEstandar); capaSatelite.addTo(map); }
      else { map.removeLayer(capaSatelite); capaEstandar.addTo(map); }
      capaActual = tipo;
    };

    post({ type: 'ready' });
  </script>
</body>
</html>
`;

function ejecutar(webviewRef: RefObject<WebView>, script: string) {
  webviewRef.current?.injectJavaScript(`${script}; true;`);
}

const LeafletMapView = forwardRef<LeafletMapHandle, Props>(function LeafletMapView(
  { userLocation, accuracyMeters, destination, routePoints, mapType, onMapTap },
  ref
) {
  const webviewRef = useRef<WebView>(null);
  const listoRef = useRef(false);

  useImperativeHandle(ref, () => ({
    recentrar: () => ejecutar(webviewRef, "window.__recentrar()"),
  }));

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === "ready") {
          listoRef.current = true;
          if (userLocation) {
            ejecutar(webviewRef, `window.__setUser(${userLocation.latitud}, ${userLocation.longitud}, ${accuracyMeters})`);
          }
        } else if (data.type === "tap" && onMapTap) {
          onMapTap({ latitud: data.lat, longitud: data.lon });
        }
      } catch {
        // Ignorar mensajes no válidos
      }
    },
    [onMapTap, userLocation, accuracyMeters]
  );

  useEffect(() => {
    if (!listoRef.current || !userLocation) return;
    ejecutar(webviewRef, `window.__setUser(${userLocation.latitud}, ${userLocation.longitud}, ${accuracyMeters})`);
  }, [userLocation, accuracyMeters]);

  useEffect(() => {
    if (!listoRef.current) return;
    if (destination) {
      ejecutar(webviewRef, `window.__setDestination(${destination.latitud}, ${destination.longitud})`);
    } else {
      ejecutar(webviewRef, "window.__clearDestination()");
    }
  }, [destination]);

  useEffect(() => {
    if (!listoRef.current) return;
    if (routePoints.length > 1) {
      const puntos = routePoints.map((p) => [p.latitud, p.longitud]);
      ejecutar(webviewRef, `window.__setRoute('${JSON.stringify(puntos)}')`);
    } else {
      ejecutar(webviewRef, "window.__clearRoute()");
    }
  }, [routePoints]);

  useEffect(() => {
    if (!listoRef.current) return;
    ejecutar(webviewRef, `window.__setMapType('${mapType}')`);
  }, [mapType]);

  return (
    <WebView
      ref={webviewRef}
      style={styles.webview}
      originWhitelist={["*"]}
      source={{ html: HTML }}
      onMessage={onMessage}
      javaScriptEnabled
      domStorageEnabled
      geolocationEnabled
      startInLoadingState
      accessibilityLabel="Mapa interactivo"
      renderLoading={() => null}
    />
  );
});

export default LeafletMapView;

const styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
});
