import { LiveTelemetryRecord, TelemetryStreamStatus } from '../../types';

// URL de producción activa en Render
const DEFAULT_RENDER_URL = 'https://hempapp.onrender.com';

// Obtener URL de backend de telemetría (Render o local)
const getApiBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_TELEMETRY_API_URL as string | undefined)?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  return DEFAULT_RENDER_URL;
};

const getWsBaseUrl = (): string => {
  const envWs = (import.meta.env.VITE_TELEMETRY_WS_URL as string | undefined)?.trim();
  if (envWs) {
    return envWs.replace(/\/+$/, '');
  }
  const apiBase = getApiBaseUrl();
  return apiBase.replace(/^http/, 'ws');
};

export const isTelemetryBackendConfigured = (): boolean => {
  return true;
};

export const getTelemetryEngineUrl = (): string => {
  return getApiBaseUrl();
};

let lastWakeUpAttempt = 0;

/**
 * Envía un pulso ligero no bloqueante a /healthz en Render al iniciar la sesión
 * para despertar el contenedor Python (IoT / IA / Resend Dispatcher) antes de que el usuario envíe alertas.
 */
export const wakeUpRenderEngine = async (): Promise<boolean> => {
  const now = Date.now();
  if (now - lastWakeUpAttempt < 60000) return true;
  lastWakeUpAttempt = now;

  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/healthz`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store'
    });
    return res.ok;
  } catch {
    return false;
  }
};

/**
 * Suscribe la vista a telemetría en tiempo real de una parcela específica.
 * Utiliza Server-Sent Events (SSE) con reconexión automática.
 * Si el backend en Render no responde o no está disponible, conmuta limpiamente a simulación local continua.
 */
export const subscribePlotTelemetry = (
  plotId: string,
  onRecord: (record: LiveTelemetryRecord) => void,
  onStatusChange?: (status: TelemetryStreamStatus, message?: string) => void
): (() => void) => {
  let eventSource: EventSource | null = null;
  let simulationInterval: any = null;
  let isCleanedUp = false;

  const startLocalSimulation = () => {
    if (isCleanedUp) return;
    onStatusChange?.('simulated', 'Modo Simulación Activo (Sin backend Render conectado aún)');

    // Emitir lectura inicial simulada
    const generateLocalRecord = (): LiveTelemetryRecord => {
      const now = new Date();
      const baseTemp = 23.5 + Math.sin(now.getTime() / 60000) * 2.2;
      const baseMoisture = 33.2 + Math.cos(now.getTime() / 80000) * 1.8;
      const baseRh = 58.0 - Math.sin(now.getTime() / 60000) * 4.0;
      const deltaT = 4.2;

      return {
        id: `sim-${Date.now()}`,
        device_id: 'CANNA-STATION-SIM-01',
        plot_id: plotId,
        timestamp: now.toISOString(),
        battery_pct: 97.4,
        metrics: {
          soil_moisture_pct: Number(baseMoisture.toFixed(1)),
          soil_temp_c: Number((baseTemp - 2.8).toFixed(1)),
          soil_ec_ds_m: 1.38,
          soil_matric_potential_kpa: -32.5,
          air_temp_c: Number(baseTemp.toFixed(1)),
          air_humidity_pct: Number(baseRh.toFixed(1)),
          solar_radiation_wm2: Math.max(0, Math.round(740 + Math.random() * 40)),
          rain_mm: 0.0,
          wind_speed_kmh: Number((11.2 + Math.random() * 2.5).toFixed(1)),
          leaf_wetness_pct: 6.5,
          atmospheric_pressure_hpa: 1013.8
        },
        assessment: {
          et0_fao56_mm_day: 4.85,
          gdd_accumulated: Number(Math.max(0, baseTemp - 10.0).toFixed(2)),
          delta_t_c: deltaT,
          spray_suitability: 'Óptimo para pulverización (baja deriva y evaporación controlada)',
          water_stress_status: 'Capacidad de Campo Óptima',
          vapor_pressure_deficit_kpa: 1.15,
          dew_point_c: 14.8,
          frost_risk: false
        }
      };
    };

    onRecord(generateLocalRecord());

    // Actualizar cada 6 segundos en modo demostración/laboratorio
    simulationInterval = setInterval(() => {
      if (isCleanedUp) return;
      onRecord(generateLocalRecord());
    }, 6000);
  };

  // Intentar conectar con el backend si hay URL configurada o local
  const baseUrl = getApiBaseUrl();
  const sseUrl = `${baseUrl}/api/v1/telemetry/stream/${encodeURIComponent(plotId)}`;

  onStatusChange?.('connecting', `Conectando con motor de telemetría (${baseUrl})...`);

  try {
    eventSource = new EventSource(sseUrl);

    eventSource.onopen = () => {
      if (isCleanedUp) return;
      onStatusChange?.('connected', 'Conectado en vivo al backend Render (SSE Stream)');
    };

    eventSource.onmessage = (event) => {
      if (isCleanedUp) return;
      try {
        const data = JSON.parse(event.data);
        if (data && data.metrics) {
          onRecord(data as LiveTelemetryRecord);
        }
      } catch (err) {
        console.warn('Error decodificando frame de telemetría:', err);
      }
    };

    eventSource.onerror = () => {
      if (isCleanedUp) return;
      // Si el backend aún no está encendido o no responde, caer con elegancia a simulación
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      startLocalSimulation();
    };
  } catch (e) {
    startLocalSimulation();
  }

  // Cleanup al desmontar el componente
  return () => {
    isCleanedUp = true;
    if (eventSource) {
      eventSource.close();
    }
    if (simulationInterval) {
      clearInterval(simulationInterval);
    }
    onStatusChange?.('disconnected', 'Desconectado');
  };
};

/**
 * Dispara una muestra forzada / pulso de telemetría al backend o localmente
 */
export const triggerTelemetryPulse = async (plotId: string): Promise<LiveTelemetryRecord | null> => {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/v1/telemetry/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plot_id: plotId, device_id: 'MANUAL-TRIGGER-UI' })
    });
    if (res.ok) {
      return (await res.json()) as LiveTelemetryRecord;
    }
  } catch (err) {
    console.debug('Backend offline para trigger, retornando lectura generada.');
  }

  // Fallback si no está online
  return {
    id: `pulse-${Date.now()}`,
    device_id: 'PULSE-SIMULATOR',
    plot_id: plotId,
    timestamp: new Date().toISOString(),
    battery_pct: 99.0,
    metrics: {
      soil_moisture_pct: 34.1,
      soil_temp_c: 20.4,
      soil_ec_ds_m: 1.42,
      air_temp_c: 24.6,
      air_humidity_pct: 54.0,
      solar_radiation_wm2: 810.0,
      rain_mm: 0.0,
      wind_speed_kmh: 13.1,
      leaf_wetness_pct: 4.0
    },
    assessment: {
      et0_fao56_mm_day: 5.1,
      gdd_accumulated: 14.6,
      delta_t_c: 4.8,
      spray_suitability: 'Óptimo para pulverización (baja deriva y evaporación controlada)',
      water_stress_status: 'Capacidad de Campo Óptima',
      vapor_pressure_deficit_kpa: 1.38,
      dew_point_c: 14.2,
      frost_risk: false
    }
  };
};
