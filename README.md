# Frontend - App Móvil (Expo + TypeScript)

## 1. Instalar dependencias

```bash
cd frontend
npm install
```

## 2. Configurar Clerk (login con Google)

1. Crea cuenta gratis en https://clerk.com
2. Crea una aplicación nueva
3. En "User & Authentication" → "Social Connections", activa **Google**
4. Copia la **Publishable Key** (empieza con `pk_test_...`)
5. Pégala en `src/config/env.ts` en `CLERK_PUBLISHABLE_KEY`
6. Instala también la dependencia extra necesaria para el OAuth:
   ```bash
   npx expo install expo-web-browser
   ```

## 3. Configurar la URL del backend

En `src/config/env.ts`, cambia `BACKEND_URL` por la IP local de la laptop
donde corre el servidor Python (ver backend/README.md paso 4). Ejemplo:

```ts
export const BACKEND_URL = "http://192.168.1.15:8000";
```

## 4. Correr la app

```bash
npx expo start
```

- Escanea el QR con la app **Expo Go** (Android/iOS) desde tu celular
- Asegúrate de que el celular esté en la **misma red WiFi** que la laptop
- Da permiso de cámara cuando la app lo solicite

## 5. Flujo de pantallas ya implementado

```
Splash → Login (Google) → Home → Modo Caminata (cámara + alertas de voz)
```

- **Modo Caminata**: activa la cámara, envía un frame cada 700ms al backend,
  y si detecta una persona cercana, avisa por voz ("Cuidado, persona a 4.8
  metros") + vibración.
- Los otros modos (Exploración, Lectura) están como botones deshabilitados,
  listos para implementarse en V2.

## Siguiente paso recomendado

Una vez que esto corra en tu celular y veas la alerta de voz funcionando
con una persona real frente a la cámara, ya tienes el MVP funcional para
la demo. A partir de ahí, sigue el roadmap del documento del proyecto
(sección 14) para las siguientes fases.
