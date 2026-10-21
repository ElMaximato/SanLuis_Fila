# SanLuisWatch — resumen del proyecto y estado actual

Última actualización: 18-oct-2026. Documento hecho para retomar el trabajo en un chat nuevo.

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

- `GET https://bwt.cbp.gov/api/waittimes` → JSON con todos los puertos. Sin API key ni autenticación. CORS abierto (`Access-Control-Allow-Origin: *`). `Cache-Control: no-store`.
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
│   ├── env.example               (sin punto inicial en el zip)
│   ├── package.json
│   └── src/
│       ├── server.js             helmet, CORS con lista de orígenes, rate limit
│       ├── config.js             variables de entorno
│       ├── cbp.js                pide a CBP, normaliza, caché 5 min, tendencia, peatones
│       └── routes.js             /api/health y /api/wait-times
├── frontend/                     (React + Vite, versión web; ya no se usa para el reloj)
└── SanLuisWatch/                 (React Native CLI 0.88, paquete com.sanluiswatch)
    ├── index.js                  (de la plantilla, importa ./App)
    ├── App.js                    FlatList vertical paginada: Autos / Peatones + puntitos
    ├── android/app/src/main/AndroidManifest.xml   (editado, ver §6)
    ├── android/local.properties  (sdk.dir; debe ser UNA línea sin espacio final)
    └── src/
        ├── config.js             API_URL (hoy apunta al dominio de ngrok)
        ├── api/waitTimes.js      fetch con timeout de 10 s
        ├── hooks/useWaitTimes.js refresco cada 5 min + AppState + tap (tiene console.log de prueba)
        └── components/LaneRow.js número, "min", flecha de tendencia, punto de color, etiqueta
```

Archivos entregados en el chat: `cbp.js`, `App.js`, `LaneRow.js`, `config.js`, `waitTimes.js`, `useWaitTimes.js`. Se borró `App.tsx` de la plantilla.

Respuesta del backend (`/api/wait-times`):
```
{ crossing, portStatus,
  lanes:       { sentri, normal, ready },
  pedestrians: { normal, ready },     // cada carril: { state, delayMin, lanesOpen, trend }
  notice, fetchedAt, stale }
```
`state`: open | closed | pending | na. `trend`: up | down | flat | null.
La tendencia compara con la lectura anterior; si el número no cambia, **conserva la última dirección** (CBP no actualiza en cada consulta). Se pierde al reiniciar el backend.

## 5. Entorno del usuario

- Windows 11, Node **v26.7.0**, Java **17.0.12**, React Native **0.88.0**, Gradle 9.4.1 (avisos de AGP 9 son normales, no son el error).
- Android SDK: `C:\Users\ferba\AppData\Local\Android\Sdk`. `ANDROID_HOME` y `platform-tools` en el PATH (usuario). Las terminales ya abiertas no los ven hasta reiniciarlas (la de VS Code, hasta cerrar VS Code por completo).
- Emulador: **Wear_OS_Large_Round**, `emulator-5554`.
- Proyecto en `C:\Users\ferba\Documents\ProyectosUT\app_fila`.
- **ngrok** (plan Free): dominio fijo `finalist-that-willow.ngrok-free.dev`. Límites: 3 endpoints, 20 mil peticiones/mes, 1 GB/mes, sin timeout. La advertencia de ngrok solo afecta a navegadores, no a la app. El dominio ya lo usa otra APK del usuario (pendiente aclarar si pueden compartirlo).
- Comando del túnel: `ngrok http 8787 --url=finalist-that-willow.ngrok-free.dev` (si falla `--url`, probar `--domain=`).
- `backend\.env`: `TRUST_PROXY=1` (necesario detrás de ngrok para que el rate limit cuente por usuario).

## 6. Manifiesto de Android (ya editado)

Dentro de `<manifest>`: `<uses-feature android:name="android.hardware.type.watch" />`
Dentro de `<application>`, **después** de cerrar sus atributos: `<meta-data android:name="com.google.android.wearable.standalone" android:value="true" />`
Si al instalar en un celular sale `INSTALL_FAILED_MISSING_FEATURE`, poner `android:required="false"` en el `uses-feature` (no verificado).

## 7. Qué se comprobó que funciona

- Endpoint de CBP desde una máquina real, y backend con caché/estado obsoleto (probado con CBP simulado).
- React Native vacío corriendo en el emulador de Wear OS (Hito 1).
- App con los tres números (sentri/normal/ready) y semáforo (≤20 verde, ≤45 ámbar, >45 rojo) en el emulador, consumiendo el backend local por `10.0.2.2:8787` (Hito 2).
- Páginas Autos/Peatones con puntitos (se vio la de Autos en el emulador).
- Backend nuevo con `pedestrians` y `trend` (probado con CBP simulado; en vivo responde el JSON a través de ngrok, abierto desde el navegador).

## 8. Qué NO se ha comprobado

- Las flechas de tendencia en pantalla (el backend se reinició y todo salió `trend: null`).
- El reloj consumiendo el backend **a través de ngrok**.
- Que el texto no se desborde en el reloj con 3 dígitos o con flecha (si pasa: en `App.js` bajar `width * 0.18` a `0.16`).
- El APK de release, la instalación en celular y el shake.
- Los `console.log` de `useWaitTimes.js` y la prueba de palm/tilt con `adb logcat`.

## 9. PROBLEMA ACTUAL (sin resolver)

**Síntoma:** el reloj muestra pantalla roja: *"Unable to load script. Make sure you're running Metro or that your bundle 'index.android.bundle' is packaged correctly for release."* Metro dice *"No apps connected"* al recargar.

**Evidencia:**
- Metro corre en `localhost:8081` (un solo proceso, PID 12980 en ese momento; el del 8082 ya está cerrado).
- `adb devices` → `emulator-5554 device`.
- `adb reverse --list` → muestra **8082 y 8081**.
- Se reinició la app con `adb shell am force-stop com.sanluiswatch` + `am start -n com.sanluiswatch/.MainActivity`. Sigue el error.
- No aparecen líneas `BUNDLE` nuevas en Metro: la petición del reloj **no llega**.
- Antes (14:53) el log decía: `Cannot connect to Metro. URL: localhost:8081`.
- Funcionaba antes de este episodio (la app se vio con los números).

**Qué pasó antes de que fallara:** se cerraron todas las terminales y se reabrieron varias veces; aparecieron **dos Metro a la vez (8081 y 8082)** porque `npx react-native run-android` abre otro si el 8081 está ocupado; hubo un error de `local.properties` con espacio final (resuelto, el build ya da `BUILD SUCCESSFUL`).

**Hipótesis, en orden de probabilidad (ninguna confirmada):**

1. **El APK instalado quedó compilado para el puerto 8082.** `run-android` pasa `-PreactNativeDevServerPort=<puerto>` y ese puerto queda dentro del APK. Si se instaló mientras el 8081 estaba ocupado, la app busca el 8082 y no el 8081. Apoya: el episodio de los dos Metro, el 8082 en `adb reverse --list`, y el texto del reloj que se cortaba en "localhost:80…".
   - Prueba rápida: `cd SanLuisWatch` → `npx react-native start --port 8082` y tocar RELOAD en el reloj. Si carga, es esto.
   - Arreglo definitivo: con **un solo Metro** en el 8081 (iniciado desde `SanLuisWatch`), correr `npx react-native run-android --port 8081`.
2. **El host de depuración guardado en la app es otro.** Prueba: `adb shell pm clear com.sanluiswatch`, luego abrir la app. O abrir el menú de desarrollo con `adb shell input keyevent 82` → Settings → "Debug server host & port" → `10.0.2.2:8081` (esa IP es la PC vista desde el emulador y evita `adb reverse`).
3. **Metro escucha en una dirección a la que `adb reverse` no llega** (IPv6 vs IPv4). Prueba: `netstat -ano | findstr :8081`, y abrir en el navegador `http://localhost:8081/status` y `http://127.0.0.1:8081/status` (debe decir `packager-status:running`).
4. **Metro arrancó desde otra carpeta.** Iniciarlo siempre con `cd ...\SanLuisWatch` y `npx react-native start --reset-cache`. La ventana de Metro aparecía como `C:\WINDOWS\system32\cmd`.

**Comandos limpios para empezar de cero:**
```powershell
# 1) Matar lo que ocupe 8081/8082
Get-NetTCPConnection -LocalPort 8081,8082 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
# 2) Un solo Metro (terminal nueva, no escribir nada más ahí)
cd C:\Users\ferba\Documents\ProyectosUT\app_fila\SanLuisWatch
npx react-native start --reset-cache
# 3) En otra terminal: puente, limpiar la app y reinstalar apuntando al 8081
adb reverse tcp:8081 tcp:8081
adb shell pm clear com.sanluiswatch
cd C:\Users\ferba\Documents\ProyectosUT\app_fila\SanLuisWatch
npx react-native run-android --port 8081
```

## 10. Pendientes (en orden sugerido)

1. Resolver el problema del §9 y ver otra vez los números en el reloj.
2. Confirmar que el reloj funciona contra ngrok (`src/config.js` ya apunta a `https://finalist-that-willow.ngrok-free.dev`; backend y túnel deben estar abiertos). Si en el emulador solo se quiere el backend local, volver a `http://10.0.2.2:8787`.
3. **APK de release** para el celular: `cd SanLuisWatch\android` → `.\gradlew assembleRelease` → `android\app\build\outputs\apk\release\app-release.apk`; instalar con `adb -s <id> install -r ...`. Las llamadas `http://` se bloquean en release, por eso hace falta HTTPS (ngrok).
4. **Shake** en el celular: la librería elegida es **`expo-sensors`** (v58.0.4, publicada 15-oct-2026; el template de Expo SDK 58 usa React Native 0.88.0). Requiere `npx install-expo-modules@latest`, que modifica archivos nativos y **no está verificado** con este template: hacer copia de la carpeta antes y probar solo sobre una APK que ya funcione. Descartadas: `react-native-sensors` (última versión nov-2022, abandonada) y `react-native-accelerometer` (0.1.0, de un solo autor). En modo debug, sacudir el dispositivo abre el menú de desarrollo de React Native (puede estorbar).
5. Aviso del puerto (`notice`) como tercera página.
6. Guardar el último dato en el reloj (almacenamiento local) para abrir sin señal.
7. Backend fijo (VPS con PM2 + Nginx + dominio) en lugar de ngrok; historial y "mejor hora para cruzar".
8. Limpieza: quitar `console.log`, nombre e icono de la app.

## 11. Lecciones de errores ya resueltos (para no repetirlos)

- `cmd` no entiende `$env:` ni `Remove-Item`: usar **PowerShell**.
- `adb` no reconocido / `SDK location not found`: faltaban `ANDROID_HOME`, el PATH o `local.properties`. Las terminales abiertas antes de cambiar variables no las ven.
- `emulator-5554 unauthorized`: se arregló con **Stop → Wipe Data** del emulador y volver a arrancar (borrar las llaves de adb con el emulador abierto no basta).
- `Unable to resolve module ./src/components/LaneRow`: la carpeta se llamaba `componentes` en vez de `components` (y en otro momento faltaban archivos).
- Error 500 de Metro: reiniciar con `npx react-native start --reset-cache`.
- Manifiesto: el `meta-data` no puede ir entre los atributos de `<application>`.
- `InvalidPathException: Trailing char < >` en `local.properties`: había un espacio al final de la ruta.
- El backend lee `.env`, no `env.example`; hay que copiarlo (y reiniciar el backend al cambiarlo, `node --watch` no recarga `.env`).
- Al cerrar todas las terminales también se cierran el **backend (8787)**, **ngrok** y **Metro (8081)**: la app necesita los tres abiertos, cada uno en su ventana.

## 12. Cómo retomar en un chat nuevo

Adjuntar este archivo y decir, por ejemplo: *"Seguimos con SanLuisWatch. La app del reloj dice 'Unable to load script' aunque Metro corre en el 8081 y `adb reverse` existe. Empecemos por la hipótesis 1 del §9."* Pegar también la salida de `netstat -ano | findstr :8081` y lo que muestre el log (`adb logcat ReactNativeJS:V AndroidRuntime:E *:S`) después de reiniciar la app.
