
import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudDrizzle,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Sun,
  Wind,
  Droplets,
  Loader2,
  AlertTriangle,
  ThermometerSnowflake,
  ThermometerSun,
  Umbrella,
  CheckCircle2
} from 'lucide-react';

interface WeatherProps {
  lat: number;
  lng: number;
  compact?: boolean;
  showForecast?: boolean;
}

const getWeatherIcon = (code: number, size = 24) => {
  if (code === 0) return <Sun className="text-amber-500" size={size} />;
  if (code >= 1 && code <= 3) return <Cloud className="text-slate-400 dark:text-slate-300" size={size} />;
  if (code >= 45 && code <= 48) return <Cloud className="text-slate-500" size={size} />;
  if (code >= 51 && code <= 57) return <CloudDrizzle className="text-sky-400" size={size} />;
  if (code >= 61 && code <= 67) return <CloudRain className="text-sky-500" size={size} />;
  if (code >= 71 && code <= 77) return <CloudSnow className="text-cyan-300" size={size} />;
  if (code >= 80 && code <= 82) return <CloudRain className="text-sky-600" size={size} />;
  if (code >= 95 && code <= 99) return <CloudLightning className="text-purple-500" size={size} />;
  return <Sun className="text-amber-500" size={size} />;
};

const getWeatherLabel = (code: number) => {
  if (code === 0) return 'Despejado';
  if (code >= 1 && code <= 3) return 'Parcialmente Nublado';
  if (code >= 45 && code <= 48) return 'Neblina';
  if (code >= 51 && code <= 57) return 'Llovizna';
  if (code >= 61 && code <= 67) return 'Lluvia';
  if (code >= 71 && code <= 77) return 'Nieve / Helada';
  if (code >= 80 && code <= 82) return 'Chaparrones';
  if (code >= 95 && code <= 99) return 'Tormenta Eléctrica';
  return 'Estable';
};

export default function WeatherWidget({ lat, lng, compact = false, showForecast = false }: WeatherProps) {
  const [current, setCurrent] = useState<any>(null);
  const [daily, setDaily] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchWeather = async () => {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      setError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max&timezone=auto`
      );
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      setCurrent(data.current);
      setDaily(data.daily);
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, [lat, lng]);

  const getAlerts = () => {
    if (!daily) return [];
    const alerts = [];

    const minTemp = daily.temperature_2m_min?.[0] ?? 10;
    const maxTemp = daily.temperature_2m_max?.[0] ?? 22;
    const maxWind = daily.wind_speed_10m_max?.[0] ?? 12;
    const rainProb = daily.precipitation_probability_max?.[0] ?? 0;

    if (minTemp <= 3)
      alerts.push({
        type: 'frost',
        label: 'Riesgo Helada',
        icon: ThermometerSnowflake,
        color: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30'
      });
    if (maxTemp >= 35)
      alerts.push({
        type: 'heat',
        label: 'Estrés Térmico',
        icon: ThermometerSun,
        color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
      });
    if (maxWind >= 35)
      alerts.push({
        type: 'wind',
        label: 'Alerta Viento / Deriva',
        icon: Wind,
        color: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
      });
    if (rainProb >= 75)
      alerts.push({
        type: 'rain',
        label: 'Precipitación Probable',
        icon: Umbrella,
        color: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
      });

    return alerts;
  };

  const alerts = getAlerts();

  if (error) {
    return compact ? (
      <div className="bg-slate-900/80 text-slate-300 text-[10px] font-mono px-2 py-1 rounded-lg border border-slate-700 flex items-center gap-1">
        <AlertTriangle size={11} className="text-amber-400" />
        <span>S/D Clima</span>
      </div>
    ) : (
      <div className="p-4 text-center font-mono">
        <p className="text-slate-500 dark:text-slate-400 text-xs mb-2">Sin señal satelital meteorológica.</p>
        <button
          type="button"
          onClick={fetchWeather}
          className="text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-slate-700 transition cursor-pointer"
        >
          Reintentar conexión
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center text-emerald-500 ${compact ? 'px-2 py-1' : 'p-6'}`}>
        <Loader2 className="animate-spin" size={compact ? 15 : 22} />
      </div>
    );
  }

  if (!current) return null;

  // --- COMPACT VIEW (For Cards) ---
  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 font-mono tabular-nums">
        <div className="flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-xs text-xs font-black text-slate-800 dark:text-slate-100">
          {getWeatherIcon(current.weather_code, 14)}
          <span>{Math.round(current.temperature_2m)}°C</span>
          <span className="text-[10px] font-normal text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-1.5 flex items-center gap-0.5">
            <Droplets size={10} className="text-sky-500" />
            {current.relative_humidity_2m}%
          </span>
          <span className="text-[10px] font-normal text-slate-400 hidden sm:flex items-center gap-0.5">
            · <Wind size={10} className="text-slate-400" />
            {Math.round(current.wind_speed_10m)}km/h
          </span>
        </div>
        {alerts.length > 0 && (
          <div className={`flex items-center px-2 py-0.5 rounded-md text-[9.5px] font-bold border ${alerts[0].color}`}>
            {React.createElement(alerts[0].icon, { size: 11, className: 'mr-1' })}
            {alerts[0].label}
          </div>
        )}
      </div>
    );
  }

  const windKmh = Math.round(current.wind_speed_10m || 0);
  const sprayOptimal = windKmh >= 3 && windKmh <= 18 && current.relative_humidity_2m >= 40;

  // --- FULL VIEW (For Establishment Details) ---
  return (
    <div className="font-mono tabular-nums">
      {/* Condición Actual */}
      <div className="p-4 sm:p-5 bg-gradient-to-br from-sky-50/70 via-white to-emerald-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/60">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 shadow-xs">
              {getWeatherIcon(current.weather_code, 34)}
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {Math.round(current.temperature_2m)}°C
                </span>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {getWeatherLabel(current.weather_code)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-bold mt-1">
                <span className="flex items-center gap-1">
                  <Droplets size={13} className="text-sky-500" />
                  HR: {current.relative_humidity_2m}%
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="flex items-center gap-1">
                  <Wind size={13} className="text-slate-400" />
                  Viento: {windKmh} km/h
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {alerts.length === 0 ? (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                <CheckCircle2 size={11} /> Clima Operativo
              </span>
            ) : (
              alerts.map((alert, idx) => (
                <span
                  key={idx}
                  className={`text-[10px] px-2.5 py-1 rounded-lg font-bold flex items-center border ${alert.color}`}
                >
                  {React.createElement(alert.icon, { size: 11, className: 'mr-1' })}
                  {alert.label}
                </span>
              ))
            )}
            <span
              className={`text-[9.5px] font-bold px-2 py-0.5 rounded ${
                sprayOptimal
                  ? 'text-teal-700 dark:text-teal-300 bg-teal-500/10'
                  : 'text-amber-700 dark:text-amber-300 bg-amber-500/10'
              }`}
            >
              {sprayOptimal ? '✓ Ventana Pulverización Óptima' : '⚠ Atención Deriva / Delta-T'}
            </span>
          </div>
        </div>
      </div>

      {/* Pronóstico Extendido 3 Días */}
      {showForecast && daily && (
        <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          {[0, 1, 2].map(i => {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dayName =
              i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : date.toLocaleDateString('es-AR', { weekday: 'short' });
            const rainProb = daily.precipitation_probability_max?.[i] ?? 0;
            const rainMm = daily.precipitation_sum?.[i] ?? 0;

            return (
              <div
                key={i}
                className="p-3 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition space-y-1.5"
              >
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">{dayName}</p>
                <div className="flex justify-center py-0.5">
                  {getWeatherIcon(daily.weather_code ? daily.weather_code[i] : 0, 20)}
                </div>
                <div className="flex justify-center items-baseline gap-1.5 text-xs font-black">
                  <span className="text-slate-900 dark:text-white">{Math.round(daily.temperature_2m_max[i])}°</span>
                  <span className="text-slate-400 font-normal text-[11px]">
                    {Math.round(daily.temperature_2m_min[i])}°
                  </span>
                </div>
                <div className="text-[9.5px] font-bold text-sky-600 dark:text-sky-400 flex items-center justify-center gap-1">
                  <Umbrella size={10} />
                  <span>{rainProb}%</span>
                  {rainMm > 0 && <span className="text-emerald-600 dark:text-emerald-400">({rainMm.toFixed(1)}mm)</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

