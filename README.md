# OrientaGo — App Móvil

App móvil de accesibilidad para personas con discapacidad visual, construida con **React Native + Expo**. Ayuda a la persona a moverse con más seguridad combinando:

- **Analizar Entorno**: detección de obstáculos en tiempo real usando la cámara (avisa por voz y vibración)
- **Navegación Asistida**: mapa interactivo con búsqueda de destino, cálculo de ruta y guía por voz usando GPS + brújula
- **Autenticación** con Google o correo electrónico (Clerk)

---

## Índice

- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Configuración obligatoria antes de correr la app](#configuración-obligatoria-antes-de-correr-la-app)
- [Ejecución](#ejecución)
- [Arquitectura del proyecto](#arquitectura-del-proyecto)
- [Flujo de pantallas](#flujo-de-pantallas)
- [Permisos que pide la app](#permisos-que-pide-la-app)
- [Accesibilidad](#accesibilidad)
- [Solución de problemas](#solución-de-problemas)
- [Limitaciones conocidas](#limitaciones-conocidas)

---

## Requisitos

- **Node.js 18 o superior** y `npm`
- La app **Expo Go** instalada en tu celular (Android o iOS) — [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) / [App Store](https://apps.apple.com/app/expo-go/id982107779)
- El [backend](../backend/README.md) corriendo y accesible en la misma red WiFi que el celular
- Cuenta gratuita en [Clerk](https://clerk.com) (para el login)

## Instalación

```bash
cd frontend
npm install
```

> Este proyecto incluye un archivo `.npmrc` con `legacy-peer-deps=true`, necesario porque Clerk todavía depende de una versión de React distinta a la del resto del proyecto. Sin este archivo, `npm install` falla con errores de `ERESOLVE`.

## Configuración obligatoria antes de correr la app

Toda la configuración vive en **`src/config/env.ts`**:

```ts
export const CLERK_PUBLISHABLE_KEY = "pk_test_...";
export const BACKEND_URL = "http://192.168.1.XX:8000";
```

| Variable | Qué es | Dónde conseguirla |
|---|---|---|
| `CLERK_PUBLISHABLE_KEY` | Clave pública de tu proyecto de Clerk | [dashboard.clerk.com](https://dashboard.clerk.com) → tu app → API Keys |
| `BACKEND_URL` | IP local de la laptop donde corre el backend + puerto | `ipconfig` (Windows) o `ifconfig` (Mac/Linux) — **nunca uses `localhost`**, el celular no lo reconoce |

**En el dashboard de Clerk**, además:
- Activa **Google** en *User & Authentication → Social Connections*
- Activa **Email address + Password** en *User & Authentication → Email, Phone, Username* (necesario para el login por correo)

## Ejecución

Con el [backend ya corriendo](../backend/README.md#ejecución) en otra terminal:

```bash
npx expo start
```

Escanea el código QR con la app **Expo Go** desde tu celular (misma red WiFi que la laptop).

## Arquitectura del proyecto

```
frontend/
├── App.tsx                        # Punto de entrada: carga fuentes, envuelve todo con Clerk
├── app.json                        # Configuración de Expo (permisos, ícono, plugins)
├── assets/
│   └── logo-icon.png                # Ícono real de OrientaGo (recortado del diseño de Figma)
└── src/
    ├── types/
    │   └── geo.ts                    # Tipos compartidos (Coordenada, RutaCalculada, etc.)
    ├── theme/
    │   └── colors.ts                  # Paleta de colores y tipografía (extraídas de Figma)
    ├── config/
    │   ├── env.ts                     # Claves y URLs configurables (ver arriba)
    │   └── tokenCache.ts              # Cache seguro de tokens de sesión (Clerk + SecureStore)
    ├── services/                     # Lógica pura, sin UI — reutilizable desde cualquier pantalla
    │   ├── locationService.ts         # GPS, permisos, brújula (envuelve expo-location)
    │   ├── routeService.ts            # Autocompletado de lugares + cálculo de ruta (OSM/OSRM)
    │   ├── detectionService.ts        # Envía fotogramas al backend, recibe detecciones
    │   └── speechService.ts           # Voz con dos niveles de prioridad (alertas vs. avisos)
    ├── context/
    │   └── NavigationGuideContext.tsx # Estado global de navegación (persiste entre pestañas)
    ├── components/
    │   ├── Logo.tsx                    # Ícono + nombre de la app, reutilizable
    │   ├── LeafletMapView.tsx          # Mapa interactivo (Leaflet + OpenStreetMap en WebView)
    │   ├── GuideStatusBar.tsx          # Barra flotante de navegación, visible en cualquier pestaña
    │   └── SessionGuard.tsx            # Cierra sesión sola tras 30 min de inactividad
    ├── navigation/
    │   ├── AppNavigator.tsx            # Splash → Login → MainTabs (reacciona sola al login/logout)
    │   └── MainTabs.tsx                 # Pestañas inferiores: Home / Explore / Guide
    └── screens/
        ├── SplashScreen.tsx             # Pantalla de bienvenida animada
        ├── LoginScreen.tsx              # Login con Google o correo (Clerk)
        ├── HomeScreen.tsx               # Menú principal
        ├── AnalizarEntornoScreen.tsx    # Cámara + detección de obstáculos en tiempo real
        └── NavegacionAsistidaScreen.tsx # Mapa, búsqueda de destino y guía por voz
```

**Por qué está organizado así:** cada capa tiene una sola responsabilidad, siguiendo separación de lógica de negocio (`services`), estado compartido (`context`), UI reutilizable (`components`) y pantallas (`screens`). Por ejemplo, `locationService.ts` no sabe nada de React ni de pantallas — solo envuelve el GPS. Eso permite reutilizar la misma lógica desde `NavegacionAsistidaScreen` o desde cualquier otra pantalla futura sin duplicar código.

## Flujo de pantallas

```
Splash (animación del logo)
   ↓
Login (Google o correo, vía Clerk)
   ↓
MainTabs
   ├── Home     → menú principal (Analizar entorno / Navegación / Emergencia / Configuración)
   ├── Explore  → Analizar Entorno (cámara + detección de obstáculos)
   └── Guide    → Navegación Asistida (mapa + búsqueda + guía por voz)
```

- Cerrar sesión (desde el ícono de perfil en Home) o 30 minutos de inactividad → regresa sola al Login.
- La guía de navegación, una vez iniciada, **sigue activa aunque cambies de pestaña** (vive en `NavigationGuideContext`, por encima de las pestañas) — una barra flotante (`GuideStatusBar`) te deja repetir la instrucción o detenerla desde cualquier pantalla.
- El análisis de la cámara, en cambio, **se pausa automáticamente** al salir de la pestaña "Explore", porque es pesado en batería y red.

## Permisos que pide la app

| Permiso | Para qué | Dónde se declara |
|---|---|---|
| Cámara | Detectar obstáculos en Analizar Entorno | `app.json` → `expo-camera` plugin |
| Ubicación (mientras se usa la app) | Mostrar posición y calcular rutas | `app.json` → `expo-location` plugin |
| Vibración | Alertas hápticas al detectar un obstáculo cercano | `app.json` → `android.permissions` |

## Accesibilidad

Pensada para uso por personas no videntes, sin ayuda visual una vez en la calle:

- Todos los botones tienen `accessibilityLabel`/`accessibilityRole`, compatibles con **TalkBack** (Android) y **VoiceOver** (iOS) — el usuario puede navegar toda la app por gestos, sin ver la pantalla.
- Las alertas de obstáculos (`hablarPrioridad`) **interrumpen** cualquier otra voz — la seguridad tiene prioridad sobre las instrucciones de ruta (`hablarEnCola`, que se turnan sin atropellarse).
- El campo de búsqueda de destino admite **dictado por voz** usando el micrófono nativo del teclado de Android/iOS (no requiere reconocimiento de voz personalizado).
- La guía de navegación funciona en segundo plano mientras se usan otras partes de la app, con controles siempre accesibles vía la barra flotante.

## Solución de problemas

**`ERESOLVE unable to resolve dependency tree` al hacer `npm install`**
Asegúrate de tener el archivo `.npmrc` con `legacy-peer-deps=true` en la carpeta `frontend`. Si `npx expo install <paquete>` vuelve a fallar igual, el `.npmrc` ya debería solucionarlo automáticamente en instalaciones futuras.

**`Unable to resolve "expo-auth-session"` o `"react-dom"` al bundlear**
Son dependencias internas que usa Clerk aunque la app no las use directamente. Ya están declaradas en `package.json` — si aparece este error es porque falta correr `npm install` después de actualizar el proyecto.

**`Project is incompatible with this version of Expo Go` (SDK distinto)**
Tu Expo Go instalada es más nueva/vieja que la versión de Expo declarada en `package.json`. Actualiza el campo `"expo"` en `package.json` a la versión de SDK que indique el error, corre `npm install` de nuevo.

**`TypeError: Network request failed` al analizar el entorno**
Ya solucionado: no se debe fijar manualmente el header `Content-Type` al enviar `FormData` con una imagen — React Native necesita generar el `boundary` automáticamente. Ver `src/services/detectionService.ts`.

**`Error: Failed to capture image` repetido**
Pasa si la cámara intenta capturar un nuevo fotograma antes de terminar el anterior. Ya hay protección contra esto (`isCapturingRef`) en `AnalizarEntornoScreen.tsx`.

**Al cerrar sesión no pasa nada / no regresa al login**
Ya solucionado: `AppNavigator.tsx` reacciona automáticamente al estado `isSignedIn` de Clerk, así que cualquier cierre de sesión (manual o por inactividad) cambia de pantalla solo, sin necesitar navegación manual desde cada pantalla.

**La guía de navegación sigue hablando después de presionar "Detener"**
Ya solucionado: detener la guía ahora también llama a `detenerVoz()` (que limpia toda la cola de voz pendiente), no solo apaga el sensor de brújula.

**El mapa no carga / aparece en blanco**
El mapa (`LeafletMapView`) es un `WebView` que carga Leaflet desde internet (`unpkg.com`) — necesita conexión a internet en el celular, no solo WiFi local al backend.

## Limitaciones conocidas

- El login por Google/correo usa las **claves de desarrollo de Clerk** — tienen límites de uso y muestran un aviso en consola; no son para producción real, pero son perfectas para la demo y el desarrollo.
- La navegación usa **OpenStreetMap + OSRM** (gratis, sin API key) en vez de Google Maps — no incluye tráfico en tiempo real. Ver el detalle de esta decisión más abajo.
- El reconocimiento de voz para buscar destino se apoya en el **dictado nativo del teclado** (Android/iOS), no en un motor de voz propio — un reconocimiento de voz siempre activo requeriría un build personalizado (fuera de Expo Go).
- El sonido del obturador de la cámara está desactivado, pero en **iOS, Apple puede forzarlo** en ciertas regiones (Japón/Corea) por regulación local — no hay forma de evitarlo desde el código en esos casos.

### ¿Por qué OpenStreetMap y no Google Maps?

Se evaluó usar el SDK nativo de Google Maps (`react-native-maps` + Places + Directions API), pero implica dos requisitos que no encajaban con el tiempo disponible: una cuenta de Google Cloud con facturación activada, y migrar de Expo Go a un build de desarrollo personalizado (EAS Build). La alternativa con Leaflet + OpenStreetMap + OSRM da una experiencia equivalente (mapa interactivo, búsqueda, rutas reales, satélite) sin esas dos barreras.
