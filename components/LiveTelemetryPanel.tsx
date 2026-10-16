import React, { useState, useEffect } from 'react';
import { 
  Activity, Radio, Zap, Droplets, Thermometer, Sun, Wind, 
  CheckCircle2, AlertTriangle, RefreshCw, Send, Terminal, 
  BatteryCharging, Cpu, ShieldCheck, ArrowUpRight, Copy, Check
} from 'lucide-react';
import { Plot } from '../types';
import { 
  subscribePlotTelemetry, 
  triggerTelemetryPulse, 
  getTelemetryEngineUrl, 
  isTelemetryBackendConfigured 
} from '../src/services/telemetryStreamService';
import { LiveTelemetryRecord, TelemetryStreamStatus } from '../types';

interface LiveTelemetryPanelProps {
  plot: Plot;
}

export const LiveTelemetryPanel: React.FC<LiveTelemetryPanelProps> = ({ plot }) => {
  const [record, setRecord] = useState<LiveTelemetryRecord | null>(null);
  const [streamStatus, setStreamStatus] = useState<TelemetryStreamStatus>('connecting');
  const [statusMessage, setStatusMessage] = useState<string>('Iniciando suscripción a telemetría...');
  const [isPulsing, setIsPulsing] = useState<boolean>(false);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);
  const [showHardwareGuide, setShowHardwareGuide] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = subscribePlotTelemetry(
      plot.id,
      (newRecord) => {
        setRecord(newRecord);
      },
      (status, msg) => {
        setStreamStatus(status);
        if (msg) setStatusMessage(msg);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [plot.id]);

  const handleManualPulse = async () => {
    setIsPulsing(true);
    try {
      const pulsed = await triggerTelemetryPulse(plot.id);
      if (pulsed) {
        setRecord(pulsed);
      }
    } finally {
      setTimeout(() => setIsPulsing(false), 600);
    }
  };

  const engineUrl = getTelemetryEngineUrl();
  const isCustomBackend = isTelemetryBackendConfigured();

  const curlSnippet = `curl -X POST "${engineUrl}/api/v1/telemetry/ingest" \\
  -H "Content-Type: application/json" \\
  -H "X-Device-Api-Key: TU_CLAVE_DE_SENSOR_AQUI" \\
  -d '{
    "device_id": "STATION-${plot.id.slice(0, 8).toUpperCase()}",
    "plot_id": "${plot.id}",
    "battery_pct": 98.5,
    "metrics": {
      "soil_moisture_pct": 32.4,
      "soil_temp_c": 20.8,
      "soil_ec_ds_m": 1.45,
      "air_temp_c": 24.5,
      "air_humidity_pct": 56.0,
      "solar_radiation_wm2": 780.0,
      "wind_speed_kmh": 12.0
    }
  }'`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(curlSnippet);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const metrics = record?.metrics;
  const assessment = record?.assessment;

  return (
    <div className="space-y-6">
      {/* HEADER DE ESTADO DE LA CAPA TELEMETRÍA (RENDER / PYTHON) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className={`p-3 rounded-2xl relative ${
            streamStatus === 'connected' 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
              : streamStatus === 'simulated'
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          }`}>
            <Radio size={24} className={streamStatus === 'connected' || streamStatus === 'simulated' ? 'animate-pulse' : ''} />
            <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
              streamStatus === 'connected' ? 'bg-emerald-500' : streamStatus === 'simulated' ? 'bg-blue-500' : 'bg-amber-500'
            }`} />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Capa de Medición & Telemetría IoT en Vivo
              </h2>
              <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                streamStatus === 'connected'
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : streamStatus === 'simulated'
                  ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
              }`}>
                {streamStatus === 'connected' ? 'Render Backend Online' : streamStatus === 'simulated' ? 'Simulador Continuo' : 'Sincronizando'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {statusMessage}
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
          <button
            onClick={handleManualPulse}
            disabled={isPulsing}
            className="flex items-center space-x-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isPulsing ? 'animate-spin' : ''} />
            <span>{isPulsing ? 'Muestreando...' : 'Disparar Muestra'}</span>
          </button>

          <button
            onClick={() => setShowHardwareGuide(!showHardwareGuide)}
            className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all"
          >
            <Terminal size={14} />
            <span>{showHardwareGuide ? 'Ocultar API de Sensores' : 'Conectar Hardware'}</span>
          </button>
        </div>
      </div>

      {/* GUÍA DE CONEXIÓN DE HARDWARE (DESPLEGABLE) */}
      {showHardwareGuide && (
        <div className="bg-slate-950 text-slate-100 p-6 rounded-3xl border border-slate-800 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <Cpu size={18} />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Endpoint de Ingesta para Sensores (Python FastAPI en Render)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
              POST /api/v1/telemetry/ingest
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Puedes emitir datos desde estaciones meteorológicas (Davis, Atmos), microcontroladores (ESP32, Raspberry Pi Pico) o gateways LoRaWAN hacia tu backend en Render. El motor calcula automáticamente evapotranspiración (ET0), grados día (GDD), VPD y aptitud de pulverización.
          </p>

          <div className="relative bg-slate-900 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
            <button
              onClick={copyToClipboard}
              className="absolute top-3 right-3 flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-[11px] font-sans font-bold transition-all"
            >
              {copiedCurl ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedCurl ? '¡Copiado!' : 'Copiar cURL'}</span>
            </button>
            <pre className="pr-20 text-[11px] leading-relaxed whitespace-pre">{curlSnippet}</pre>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80 gap-2">
            <span>Servicio configurado: <strong className="text-slate-200 font-mono">{engineUrl}</strong></span>
            <span>Seguridad: <strong className="text-slate-200 font-mono">X-Device-Api-Key Header</strong></span>
          </div>
        </div>
      )}

      {/* TARJETAS DE SENSORES EN CAMPO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sensor 1: Humedad de Suelo & Tensión */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sonda de Suelo</span>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
              <Droplets size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {metrics?.soil_moisture_pct ?? '--'} <span className="text-sm font-bold text-slate-400">%</span>
            </div>
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">
              Humedad Volumétrica (VWC)
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Tensión / Matriz:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {metrics?.soil_matric_potential_kpa ? `${metrics.soil_matric_potential_kpa} kPa` : '-32 kPa'}
            </span>
          </div>
        </div>

        {/* Sensor 2: Temperatura Suelo vs Aire */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Térmico Diferencial</span>
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
              <Thermometer size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {metrics?.air_temp_c ?? '--'} <span className="text-sm font-bold text-slate-400">°C</span>
            </div>
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              Aire | Suelo: {metrics?.soil_temp_c ?? '--'} °C
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Punto de Rocío:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {assessment?.dew_point_c ? `${assessment.dew_point_c} °C` : '--'}
            </span>
          </div>
        </div>

        {/* Sensor 3: Radiación Solar & Evapotranspiración */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Irradiancia Solar</span>
            <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-xl">
              <Sun size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {metrics?.solar_radiation_wm2 ?? '--'} <span className="text-sm font-bold text-slate-400">W/m²</span>
            </div>
            <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400 mt-0.5">
              ET0 FAO-56: {assessment?.et0_fao56_mm_day ?? '--'} mm/día
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Déficit Vapor (VPD):</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {assessment?.vapor_pressure_deficit_kpa ? `${assessment.vapor_pressure_deficit_kpa} kPa` : '--'}
            </span>
          </div>
        </div>

        {/* Sensor 4: Viento, Humedad y Deriva (Delta T) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Viento & Microclima</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Wind size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {metrics?.wind_speed_kmh ?? '--'} <span className="text-sm font-bold text-slate-400">km/h</span>
            </div>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              Humedad Relativa: {metrics?.air_humidity_pct ?? '--'}%
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Delta T (Pulverización):</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {assessment?.delta_t_c ? `${assessment.delta_t_c} °C` : '--'}
            </span>
          </div>
        </div>
      </div>

      {/* EVALUACIÓN ECOFISIOLÓGICA & REGLAS DE NEGOCIO AGRONÓMICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Evaluación de Pulverización y Deriva */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Aptitud para Aplicación de Insumos (Delta T)
                </h3>
                <span className="text-[10px] font-bold text-slate-400">Estándar Internacional SENASA / FAO</span>
              </div>
            </div>
            <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-500/20">
              Delta T: {assessment?.delta_t_c ?? '--'} °C
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs space-y-2">
            <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-100 font-bold">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span>{assessment?.spray_suitability || 'Calculando parámetros en tiempo real...'}</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              El índice Delta T evalúa el balance entre riesgo de deriva por gotas finas evaporadas (cuando Delta T &gt; 8) y permanencia excesiva de gotas pesadas con lavado (cuando Delta T &lt; 2).
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold">Conductividad EC</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {metrics?.soil_ec_ds_m ? `${metrics.soil_ec_ds_m} dS/m` : '--'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold">GDD Acumulado</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {assessment?.gdd_accumulated ? `+${assessment.gdd_accumulated} °C` : '--'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block font-bold">Mojado Foliar</span>
              <span className="font-mono font-bold text-blue-500">
                {metrics?.leaf_wetness_pct ? `${metrics.leaf_wetness_pct}%` : '0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Diagnóstico Hídrico de Suelo y Nodo */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
                <Activity size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Balance de Tensión y Estado del Nodo
                </h3>
                <span className="text-[10px] font-bold text-slate-400">Identificador: {record?.device_id || 'STATION-DEFAULT'}</span>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
              <BatteryCharging size={14} className="text-emerald-500" />
              <span>{record?.battery_pct ? `${record.battery_pct}%` : '100%'}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs space-y-2">
            <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-100 font-bold">
              <Droplets size={16} className="text-blue-500 shrink-0" />
              <span>{assessment?.water_stress_status || 'Capacidad de Campo Normal'}</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              Las lecturas de humedad volumétrica se ajustan según la textura edáfica de la parcela para advertir puntos críticos de marchitez permanente o asfixia radicular en cáñamo.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400">
            <span>Último muestreo recibido:</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
              {record?.timestamp ? new Date(record.timestamp).toLocaleTimeString() : 'En espera'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTelemetryPanel;
