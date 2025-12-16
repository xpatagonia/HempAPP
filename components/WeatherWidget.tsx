
import React, { useState, useEffect } from 'react';
import { Cloud, CloudDrizzle, CloudLightning, CloudRain, CloudSnow, Sun, Wind, Droplets, Loader2, RefreshCw, AlertTriangle, ThermometerSnowflake, ThermometerSun, Umbrella } from 'lucide-react';

interface WeatherProps {
    lat: number;
    lng: number;
    compact?: boolean;
    showForecast?: boolean;
}

// Helper: Get Icon
const getWeatherIcon = (code: number, size = 24) => {
    if (code === 0) return <Sun className="text-orange-500" size={size} />;
    if (code >= 1 && code <= 3) return <Cloud className="text-gray-400" size={size} />;
    if (code >= 45 && code <= 48) return <Cloud className="text-gray-500" size={size} />;
    if (code >= 51 && code <= 57) return <CloudDrizzle className="text-blue-400" size={size} />;
    if (code >= 61 && code <= 67) return <CloudRain className="text-blue-600" size={size} />;
    if (code >= 71 && code <= 77) return <CloudSnow className="text-cyan-200" size={size} />;
    if (code >= 80 && code <= 82) return <CloudRain className="text-blue-700" size={size} />;
    if (code >= 95 && code <= 99) return <CloudLightning className="text-purple-500" size={size} />;
    return <Sun className="text-yellow-500" size={size} />;
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
            // Fetch Current + Daily Forecast for Alerts
            const res = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto`
            );
            if (!res.ok) throw new Error("API Error");
            const data = await res.json();
            setCurrent(data.current);
            setDaily(data.daily);
        } catch (err) {
            console.error("Weather fetch error:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWeather();
    }, [lat, lng]);

    // --- ALERTS LOGIC ---
    const getAlerts = () => {
        if (!daily) return [];
        const alerts = [];
        
        // Check next 24h (Index 0 is today)
        const minTemp = daily.temperature_2m_min[0];
        const maxTemp = daily.temperature_2m_max[0];
        const maxWind = daily.wind_speed_10m_max[0];
        const rainProb = daily.precipitation_probability_max[0];

        if (minTemp <= 3) alerts.push({ type: 'frost', label: 'Riesgo Helada', icon: ThermometerSnowflake, color: 'bg-blue-100 text-blue-700' });
        if (maxTemp >= 35) alerts.push({ type: 'heat', label: 'Calor Extremo', icon: ThermometerSun, color: 'bg-orange-100 text-orange-700' });
        if (maxWind >= 40) alerts.push({ type: 'wind', label: 'Viento Fuerte', icon: Wind, color: 'bg-gray-200 text-gray-700' });
        if (rainProb >= 80) alerts.push({ type: 'rain', label: 'Lluvia Probable', icon: Umbrella, color: 'bg-indigo-100 text-indigo-700' });

        return alerts;
    };

    const alerts = getAlerts();

    if (error) {
        return compact ? (
            <div className="bg-red-50 text-red-400 text-[10px] p-1 rounded border border-red-100 flex items-center">
                <AlertTriangle size={12} className="mr-1"/> Error Clima
            </div>
        ) : (
            <div className="bg-white p-4 rounded-xl border border-red-100 text-center">
                <p className="text-red-500 text-sm mb-2">No se pudo cargar el clima.</p>
                <button onClick={fetchWeather} className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded hover:bg-red-100">Reintentar</button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={`flex items-center justify-center text-blue-400 ${compact ? 'scale-75' : 'p-6 bg-white rounded-xl border border-gray-100'}`}>
                <Loader2 className="animate-spin" size={24} />
            </div>
        );
    }

    if (!current) return null;

    // --- COMPACT VIEW (For Cards) ---
    if (compact) {
        return (
            <div className="flex flex-col gap-1 items-start">
                <div className="flex items-center space-x-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg border border-gray-200 shadow-sm text-xs font-bold text-gray-700">
                    {getWeatherIcon(current.weather_code, 16)}
                    <span>{Math.round(current.temperature_2m)}°C</span>
                </div>
                {alerts.length > 0 && (
                    <div className={`flex items-center px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm animate-pulse ${alerts[0].color}`}>
                        {React.createElement(alerts[0].icon, { size: 12, className: 'mr-1' })}
                        {alerts[0].label}
                    </div>
                )}
            </div>
        );
    }

    // --- FULL VIEW (For Details Page) ---
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Header: Current Weather */}
            <div className="p-5 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
                <div className="flex items-center">
                    <div className="mr-4">
                        {getWeatherIcon(current.weather_code, 48)}
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-gray-800 flex items-start">
                            {Math.round(current.temperature_2m)}
                            <span className="text-lg text-gray-500 font-medium ml-1">°C</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500 font-medium mt-1">
                            <Droplets size={14} className="mr-1 text-blue-500"/> {current.relative_humidity_2m}%
                            <span className="mx-2">•</span>
                            <Wind size={14} className="mr-1 text-gray-500"/> {current.wind_speed_10m} km/h
                        </div>
                    </div>
                </div>
                
                {/* Active Alerts Badge */}
                <div className="flex flex-col gap-2 items-end">
                    {alerts.length === 0 ? (
                        <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold flex items-center">
                            <Sun size={12} className="mr-1"/> Condiciones Normales
                        </span>
                    ) : (
                        alerts.map((alert, idx) => (
                            <span key={idx} className={`text-xs px-3 py-1 rounded-full font-bold flex items-center shadow-sm ${alert.color}`}>
                                {React.createElement(alert.icon, { size: 14, className: 'mr-1' })}
                                {alert.label}
                            </span>
                        ))
                    )}
                </div>
            </div>

            {/* Forecast Row */}
            {showForecast && daily && (
                <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 bg-white">
                    {[0, 1, 2].map((i) => {
                        const date = new Date();
                        date.setDate(date.getDate() + i);
                        const dayName = i === 0 ? 'Hoy' : date.toLocaleDateString('es-ES', { weekday: 'short' });
                        
                        return (
                            <div key={i} className="p-3 text-center hover:bg-gray-50 transition">
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-2">{dayName}</p>
                                <div className="flex justify-center mb-2">
                                    {getWeatherIcon(daily.weather_code ? daily.weather_code[i] : 0, 20)}
                                </div>
                                <div className="flex justify-center items-center text-xs font-bold text-gray-700 space-x-2">
                                    <span>{Math.round(daily.temperature_2m_max[i])}°</span>
                                    <span className="text-gray-400">{Math.round(daily.temperature_2m_min[i])}°</span>
                                </div>
                                <div className="mt-1 text-[10px] text-blue-500 font-medium">
                                    {daily.precipitation_probability_max[i] > 0 && (
                                        <span className="flex items-center justify-center">
                                            <Umbrella size={10} className="mr-1"/> {daily.precipitation_probability_max[i]}%
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
