package com.sanluiswatch

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.SystemClock
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.sqrt

/**
 * Detecta una sacudida con el acelerómetro y avisa a JS con el evento "onShake".
 * Solo escucha el sensor mientras la app está en primer plano (ahorra batería).
 *
 * Una sacudida = dos golpes de aceleración por encima del umbral, separados por
 * entre MIN_GAP_MS y WINDOW_MS. Después hay un enfriamiento (COOLDOWN_MS).
 */
class ShakeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), SensorEventListener, LifecycleEventListener {

  private val sensorManager =
      reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
  private val accelerometer: Sensor? = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

  private var enabled = false
  private var listening = false
  private var thresholdG = DEFAULT_THRESHOLD_G
  private var firstJoltAt = 0L
  private var lastShakeAt = 0L

  init {
    reactContext.addLifecycleEventListener(this)
  }

  override fun getName() = NAME

  @ReactMethod
  fun enable(threshold: Double) {
    thresholdG = if (threshold > 1.0) threshold.toFloat() else DEFAULT_THRESHOLD_G
    enabled = true
    startListening()
  }

  @ReactMethod
  fun disable() {
    enabled = false
    stopListening()
  }

  // Requeridos por NativeEventEmitter (evitan avisos en JS).
  @ReactMethod fun addListener(eventName: String) {}

  @ReactMethod fun removeListeners(count: Int) {}

  private fun startListening() {
    if (listening || !enabled || accelerometer == null) return
    sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_GAME)
    listening = true
  }

  private fun stopListening() {
    if (!listening) return
    sensorManager.unregisterListener(this)
    listening = false
    firstJoltAt = 0L
  }

  override fun onSensorChanged(event: SensorEvent) {
    val x = event.values[0]
    val y = event.values[1]
    val z = event.values[2]
    val gForce = sqrt(x * x + y * y + z * z) / SensorManager.GRAVITY_EARTH
    if (gForce < thresholdG) return

    val now = SystemClock.elapsedRealtime()
    if (now - lastShakeAt < COOLDOWN_MS) return

    // Primer golpe, o el anterior ya caducó.
    if (firstJoltAt == 0L || now - firstJoltAt > WINDOW_MS) {
      firstJoltAt = now
      return
    }
    // Sigue siendo el mismo golpe: aún no cuenta como el segundo.
    if (now - firstJoltAt < MIN_GAP_MS) return

    firstJoltAt = 0L
    lastShakeAt = now
    if (reactContext.hasActiveReactInstance()) {
      reactContext
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit(EVENT, null)
    }
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

  override fun onHostResume() = startListening()

  override fun onHostPause() = stopListening()

  override fun onHostDestroy() = stopListening()

  companion object {
    const val NAME = "ShakeModule"
    const val EVENT = "onShake"
    const val DEFAULT_THRESHOLD_G = 2.7f
    const val MIN_GAP_MS = 120L
    const val WINDOW_MS = 1000L
    const val COOLDOWN_MS = 2000L
  }
}
