# OrientaGo - Frontend Móvil 📱👋

Frontend móvil de **OrientaGo**, una aplicación de asistencia visual en tiempo real diseñada para personas ciegas. Utiliza la cámara del dispositivo móvil para detectar personas y obstáculos en el entorno, notificando al usuario mediante alertas por voz (Text-to-Speech) y retroalimentación háptica (vibración).

Este proyecto fue desarrollado bajo la estructura de **Clean Architecture** (Arquitectura Limpia) y utiliza **Expo Router** para la gestión de navegación.

---

## 🏗️ Arquitectura del Proyecto

El código está organizado en tres capas desacopladas que garantizan modularidad, testabilidad y facilidad para cambiar de tecnologías (por ejemplo, migrar de un servidor externo a un modelo local TFLite sin tocar la interfaz):

```text
OrientaGo-Front/
├── app/                     # Capa de Enrutamiento (Expo Router)
│   ├── _layout.tsx          # Inicialización global (Clerk, fuentes, pila de navegación)
│   ├── index.tsx            # Ruta inicial (Splash)
│   ├── login.tsx            # Ruta de Login
│   ├── home.tsx             # Ruta del menú principal
│   └── walk.tsx             # Ruta del modo caminata
│
├── src/
│   ├── domain/              # Capa de Dominio (Modelos de negocio e interfaces puras)
│   │   ├── entities/        # Definiciones de tipos (ej. Detection)
│   │   ├── repositories/    # Interfaces de repositorios (ej. IDetectionRepository)
│   │   └── services/        # Interfaces de servicios de hardware (ej. ISpeechService)
│   │
│   ├── data/                # Capa de Datos (Implementaciones de repositorios y APIs físicas)
│   │   ├── config/          # Variables de entorno y tokenCache para Clerk
│   │   ├── repositories/    # Llamadas a la API del modelo YOLO
│   │   └── services/        # Envolturas de hardware (expo-speech, expo-haptics)
│   │
│   └── presentation/        # Capa de Presentación (Vistas y lógica visual)
│       └── screens/         # Componentes de las pantallas (Splash, Login, Home, WalkMode)
```

---

## 🛠️ Tecnologías Utilizadas

- **React Native** (Expo SDK 54)
- **TypeScript** (Tipado estático)
- **Expo Router** (Enrutamiento basado en archivos)
- **Clerk** (Autenticación segura con Google)
- **Expo Camera** (Captura de fotogramas de la cámara)
- **Expo Speech** (Alertas auditivas mediante Text-to-Speech offline)
- **Expo Haptics** (Alertas físicas mediante vibraciones hápticas)
- **Expo Secure Store** (Almacenamiento seguro del token de sesión de Clerk)

---

## 🚀 Inicio Rápido

Sigue estos pasos para ejecutar el proyecto en tu entorno local:

### 1. Clonar e Instalar Dependencias
Asegúrate de estar en el directorio de la aplicación móvil y ejecuta:
```bash
pnpm install
```

### 2. Configurar Variables de Entorno
Abre el archivo [src/data/config/env.ts](src/data/config/env.ts) y edita los siguientes valores:
- **`CLERK_PUBLISHABLE_KEY`**: Llave pública obtenida desde tu panel de Clerk (debe comenzar con `pk_test_...`).
- **`BACKEND_URL`**: La dirección IP local y puerto de la laptop que ejecuta el backend Python (ej. `http://192.168.100.4:8000`). *Nota: No uses "localhost" porque el celular físico no resolverá esa dirección.*

### 3. Ejecutar el Servidor Metro

#### Opción A: Conexión Local (Misma red Wi-Fi sin bloqueos de Firewall)
```bash
pnpm start
```

#### Opción B: Conexión mediante Túnel (Recomendada para redes públicas o bloqueos de Firewall)
Crea una dirección URL de túnel público para conectar el celular sin problemas de cortafuegos de Windows:
```bash
pnpm start -- --tunnel
```

---

## 📱 Probar en Dispositivo Físico

1. Descarga la aplicación **Expo Go** desde Google Play Store (Android) o App Store (iOS).
2. Asegúrate de tener tu teléfono conectado a internet (o a la misma red Wi-Fi de tu computadora si utilizas la opción de inicio local).
3. Escanea el código QR que se genera en tu terminal de desarrollo con la cámara (en iOS) o desde la app de Expo Go (en Android).
4. Si el código QR de consola no carga o da error de conexión en Android, abre la app Expo Go e ingresa manualmente la dirección en la barra de búsqueda (por ejemplo: `exp://192.168.100.4:8081`).
