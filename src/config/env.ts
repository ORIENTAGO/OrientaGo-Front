/**
 * Configuración central del proyecto.
 *
 * IMPORTANTE:
 * 1. CLERK_PUBLISHABLE_KEY: crea una cuenta gratis en https://clerk.com,
 *    crea una aplicación, activa "Google" como método de acceso, y copia
 *    la "Publishable key" (empieza con pk_test_...).
 * 2. BACKEND_URL: la IP local de la laptop que corre el servidor Python
 *    (ver backend/README.md, paso 4). Ejemplo: "http://192.168.1.15:8000"
 *    NUNCA uses "localhost" aquí: el celular no vería la laptop.
 */

export const CLERK_PUBLISHABLE_KEY = "pk_test_dHJ1ZS1tZWVya2F0LTUxLmNsZXJrLmFjY291bnRzLmRldiQ";

export const BACKEND_URL = "http://192.168.100.4:8000";
