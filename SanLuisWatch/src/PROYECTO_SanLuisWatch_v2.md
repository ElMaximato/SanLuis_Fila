# SanLuisWatch — resumen del proyecto y estado actual

Última actualización: 18-oct-2026. Documento para retomar el trabajo en un chat nuevo.

## 1. Qué es

App para **Wear OS** hecha con **React Native (JavaScript)** que muestra el tiempo de espera de la fila para cruzar de **San Luis Río Colorado, Sonora → San Luis, Arizona** (garita San Luis I). Pensada para quien cruza de madrugada: pantalla negra, minimalista, estilo Apple Watch.

Pantallas del reloj (deslizar vertical, estilo TikTok):
- **Autos:** sentri, normal, ready (con flecha de tendencia ↑ ↓ →).
- **Peatones:** normal, ready.

## 2. Decisiones tomadas

- Se queda en **JavaScript / React Native** (no Kotlin), aunque no tendrá Tile, complicación ni modo ambiente (eso solo es posible en nativo).
- **Backend propio** (Node + Express) entre la app y CBP, con caché y seguridad.
- **No** se implementa "rise to wake" en la app (lo hace el sistema del reloj). Solo se refresca al volver a primer plano (`AppState`) y al tocar la pantalla.
- **Vibración:** solo funcionaría con la app abierta. Con la app cerrada haría falta notificaciones push (Firebase), que se dejan para después.
- **Shake:** se probará primero en un **celular Android por APK**, no en el emulador.
- La versión web (`frontend/`) ya no se usa para el reloj; se conserva como respaldo.

## 3. Fuente de datos (CBP)

- `GET https://bwt.cbp.gov/api/waittimes` → JSON con todos los puertos. Sin API key ni autenticación. CORS abierto. `Cache-Control: no-store`.
- San Luis I = `port_number: "260801"` (San Luis II es `260802`, otro cruce).
- Trae solo tiempos, estado, carriles abiertos y un aviso de texto. **No** trae longitud de fila ni calle donde termina.
- **No hay documentación oficial** del endpoint ni términos de uso publicados. Confirmar antes de publicar la app.
- `update_time` ("At 11:00 pm MST") no sirve como indicador de frescura. El campo `time` va 1 hora adelantado. Usar `fetchedAt` del backend.
- `delay_minutes` y `lanes_open` vienen como texto, vacío si el carril está cerrado.

## 4. Estructura de carpetas

```
app_fila/
├── backend/                      (Node 20+, Express 5)
│   ├── .env                      (se crea copiando env.example; NO existe por defecto)
│   ├── env.example
│   ├── package.json
│   └── src/
│       ├── server.js             helmet, CORS con lista de orígenes, rate limit
│       ├── config.js             variables de entorno
│       ├── cbp.js                pide a CBP, normaliza, caché 5 min, tendencia, peatones
│       └── routes.js             /api/health y /api/wait-times
├── frontend/                     (React + Vite, versión web; ya no se usa para el reloj)
└── SanLuisWatch/                 (React Native CLI 0.88, paquete com.sanluiswatch)
    ├── index.js
    ├── App.js                    FlatList vertical paginada: Autos / Peatones + puntitos
    ├── android/app/src/main/AndroidManifest.xml   (editado, ver §6)
    ├── android/local.properties  (sdk.dir; una línea, sin espacio al final)
    └── src/
        ├── config.js             API_URL (hoy apunta al dominio de ngrok)
        ├── api/waitTimes.js      fetch con timeout de 10 s
        ├── hooks/useWaitTimes.js refresco cada 5 min + AppState + tap (tiene console.log de prueba)
        └── components/LaneRow.js número, "min", flecha de tendencia, punto de color, etiqueta
```

Respuesta del backend (`/api/wait-times`):
```
{ crossing, portStatus,
  lanes:       { sentri, normal, ready },
  pedestrians: { normal, ready },     // cada carril: { state, delayMin, lanesOpen, trend }
  notice, fetchedAt, stale }
```
`state`: open | closed | pending | na. `trend`: up | down | flat | null.
La tendencia compara con la lectura anterior; si el número no cambia, **conserva la última dirección**. Se pierde al reiniciar el backend.

## 5. Entorno

- Windows 11, Node v26.7.0, Java 17.0.12, React Native 0.88.0, Gradle 9.4.1 (los avisos de AGP 9 son normales).
- Android SDK: `C:\Users\ferba\AppData\Local\Android\Sdk`. `ANDROID_HOME` y `platform-tools` en el PATH. Las terminales abiertas antes de cambiar variables no las ven.
- Emulador: **Wear_OS_Large_Round**, `emulator-5554`.
- Proyecto en `C:\Users\ferba\Documents\ProyectosUT\app_fila`.
- **ngrok** (plan Free): dominio fijo `finalist-that-willow.ngrok-free.dev`. Límites: 3 endpoints, 20 mil peticiones/mes, 1 GB/mes. La advertencia de ngrok solo afecta a navegadores. El dominio ya lo usa otra APK del usuario (pendiente aclarar si pueden compartirlo).
- Comando del túnel: `ngrok http 8787 --url=finalist-that-willow.ngrok-free.dev` (si falla `--url`, probar `--domain=`).
- `backend\.env`: `TRUST_PROXY=1` (necesario detrás de ngrok para que el rate limit cuente por usuario).

## 6. Manifiesto de Android (ya editado)

Dentro de `<manifest>`: `<uses-feature android:name="android.hardware.type.watch" />`
Dentro de `<application>`, **después** de sus atributos: `<meta-data android:name="com.google.android.wearable.standalone" android:value="true" />`
Si al instalar en un celular sale `INSTALL_FAILED_MISSING_FEATURE`, poner `android:required="false"` en el `uses-feature` (no verificado).

## 7. Cómo se arranca todo (receta que funciona)

Se necesitan **tres cosas abiertas, cada una en su propia ventana**: backend (8787), ngrok y Metro (8081). Al cerrar todas las terminales se caen las tres.

1. **Metro** (terminal 1, no escribir nada más ahí):
   ```powershell
   cd C:\Users\ferba\Documents\ProyectosUT\app_fila\SanLuisWatch
   npx react-native start --reset-cache
   ```
2. **Instalar/abrir la app** (terminal 2):
   ```powershell
   adb devices                      # debe decir: emulator-5554   device
   adb reverse tcp:8081 tcp:8081
   cd C:\Users\ferba\Documents\ProyectosUT\app_fila\SanLuisWatch
   npx react-native run-android --port 8081
   ```
   Si pregunta *"Use port 8082 instead?"*, responder **No**.
3. Backend y ngrok en sus propias ventanas (ver §5) cuando se quiera probar con datos reales.

Para verificar Metro: `curl.exe http://localhost:8081/status` (con `.exe`; `curl` a secas es un alias de PowerShell que pregunta por seguridad). Debe responder `packager-status:running`.

## 8. Problema resuelto: pantalla roja "Unable to load script"

**Síntoma:** el reloj mostraba *"Unable to load script. Make sure you're running Metro or that your bundle 'index.android.bundle' is packaged correctly for release."* Metro decía *"No apps connected"*. No llegaba ninguna petición `BUNDLE` a Metro.

**Qué lo provocó:** se cerraron y reabrieron terminales varias veces y llegaron a existir **dos Metro a la vez (8081 y 8082)**, porque `run-android` ofrece abrir otro Metro en el 8082 cuando el 8081 está ocupado. Con eso, la app instalada en el emulador quedó apuntando a un puerto/host distinto del Metro que sí estaba corriendo.

**Lo que se revisó y estaba bien** (no era el código): `AndroidManifest.xml`, `build.gradle`, `gradle.properties`, `MainApplication.kt`, `index.js`, `metro.config.js`; `local.properties` (el final de línea de Windows no molesta); Metro en 8081 y `adb reverse` activo.

**Cómo se solucionó:**
1. **Wipe Data del emulador** (arranque desde cero). Con eso `adb uninstall` y `pm clear` ya no tenían nada que borrar (por eso fallaban con `DELETE_FAILED_INTERNAL_ERROR` / `Failed`: la app no estaba instalada).
2. **Un solo Metro** en el 8081, iniciado desde `SanLuisWatch`.
3. `adb reverse tcp:8081 tcp:8081`.
4. `npx react-native run-android --port 8081`, contestando **No** al aviso del 8082. Esto compila e instala la app con el puerto 8081.

**Causa más probable:** el APK viejo tenía el puerto de desarrollo 8082 compilado (o un host de depuración guardado). Reinstalar desde cero con `--port 8081` lo corrigió. No se aisló cuál de las dos fue exactamente, porque el wipe limpió ambas a la vez; si vuelve a pasar, probar primero `adb shell pm clear com.sanluiswatch` y, si no, reinstalar con `--port 8081`.

**Regla para no repetirlo:** nunca dejar dos Metro abiertos y, si `run-android` pregunta por el 8082, decir No y averiguar quién ocupa el 8081 (`netstat -ano | findstr :8081`, luego `tasklist /FI "PID eq <PID>"`).

## 9. Otros errores ya resueltos (lecciones)

- `cmd` no entiende `$env:` ni `Remove-Item`: usar **PowerShell**.
- `adb` no reconocido / `SDK location not found`: faltaban `ANDROID_HOME`, el PATH o `local.properties`. Reiniciar terminales (VS Code, cerrarlo por completo).
- `emulator-5554 unauthorized`: se arregló con **Stop → Wipe Data** del emulador.
- `Unable to resolve module ./src/components/LaneRow`: la carpeta se llamaba `componentes` en vez de `components`.
- Error 500 de Metro: reiniciar con `npx react-native start --reset-cache`.
- Manifiesto: el `meta-data` no puede ir entre los atributos de `<application>`.
- `InvalidPathException: Trailing char < >` en `local.properties`: espacio al final de la ruta.
- El backend lee `.env`, no `env.example`; hay que copiarlo y reiniciar el backend al cambiarlo.
- Zip del proyecto de 2 GB: no borrar `android`. Excluir `node_modules`, `build`, `.gradle`, `.cxx`, `.git`, `.env` (queda en ~1 MB).

## 10. Qué se comprobó que funciona

- Endpoint de CBP desde una máquina real; backend con caché y estado obsoleto (probado con CBP simulado).
- React Native corriendo en el emulador de Wear OS.
- App con los tres números y semáforo (≤20 verde, ≤45 ámbar, >45 rojo) consumiendo el backend local por `10.0.2.2:8787`.
- Páginas Autos/Peatones con puntitos.
- Backend con `pedestrians` y `trend`; en vivo responde el JSON a través de ngrok desde el navegador.
- **Reloj cargando otra vez la app desde Metro (8081)** tras el arreglo del §8.

## 11. Qué NO se ha comprobado

- El reloj consumiendo el backend **a través de ngrok** con datos reales (`src/config.js` ya apunta a ngrok).
- Las flechas de tendencia en pantalla (el backend se reinició y todo salió `trend: null`).
- Que el texto no se desborde con 3 dígitos o con flecha (si pasa: en `App.js` bajar `width * 0.18` a `0.16`).
- APK de release, instalación en celular y shake.
- Los `console.log` de `useWaitTimes.js`.

## 12. Qué sigue (en orden sugerido)

1. **Ver datos reales en el reloj vía ngrok.** Backend (8787) + ngrok abiertos, recargar la app (R en Metro o reabrirla). Revisar que los números, el semáforo y las flechas se vean bien y que no se desborde el texto. Si solo se quiere probar en el emulador, `API_URL` puede volver a `http://10.0.2.2:8787`.
2. **Aclarar el dominio de ngrok** con la otra APK que ya lo usa (el plan Free permite un dominio fijo; si lo comparten, chocan).
3. **APK de release** (el JS va dentro, no depende de Metro):
   ```powershell
   cd C:\Users\ferba\Documents\ProyectosUT\app_fila\SanLuisWatch\android
   .\gradlew assembleRelease
   adb -s <id> install -r app\build\outputs\apk\release\app-release.apk
   ```
   Las llamadas `http://` se bloquean en release; por eso hace falta HTTPS (ngrok). Hoy firma con la llave de debug: sirve para pruebas, no para publicar.
4. **Shake en el celular** con `expo-sensors` (v58.0.4). Requiere `npx install-expo-modules@latest`, que modifica archivos nativos y **no está verificado** con este template: hacer copia de la carpeta antes y probar sobre una APK que ya funcione. En modo debug, sacudir abre el menú de desarrollo y estorba.
5. **Aviso del puerto** (`notice`) como tercera página.
6. **Guardar el último dato** en el reloj (almacenamiento local) para abrir sin señal.
7. **Backend fijo** (VPS con PM2 + Nginx + dominio) en lugar de ngrok; historial y "mejor hora para cruzar".
8. **Vibración / notificaciones push** (Firebase) para avisar con la app cerrada.
9. **Limpieza antes de publicar:** quitar `console.log`, nombre e icono de la app, llave de firma propia, y confirmar términos de uso del endpoint de CBP.

## 13. Cómo retomar en un chat nuevo

Adjuntar este archivo y decir, por ejemplo: *"Seguimos con SanLuisWatch. Ya carga en el emulador; sigo en el paso 1 del §12 (probar con ngrok)."* Si algo falla, pegar la salida del comando que falló y una captura del reloj.
