
import React, { useState, useEffect } from 'react';
import { Cloud, CloudDrizzle, CloudLightning, CloudRain, CloudSnow, Sun, Wind, Droplets, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

interface WeatherProps {
    lat: number;
    lng: number;
    compact?: boolean;
}

// WMO Weather interpretation codes (https://open-meteo.com/en/docs)
const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="text-orange-500" size={24} />;
    if (code >= 1 && code <= 3) return <Cloud className="text-gray-400" size={24} />;
    if (code >= 45 && code <= 48) return <Cloud className="text-gray-500" size={24} />;
    if (code >= 51 && code <= 57) return <CloudDrizzle className="text-blue-400" size={24} />;
    if (code >= 61 && code <= 67) return <CloudRain className="text-blue-600" size={24} />;
    if (code >= 71 && code <= 77) return <CloudSnow className="text-cyan-200" size={24} />;
    if (code >= 80 && code <= 82) return <CloudRain className="text-blue-700" size={24} />;
    if (code >= 95 && code <= 99) return <CloudLightning className="text-purple-500" size={24} />;
    return <Sun className="text-yellow-500" size={24} />;
};

export default function WeatherWidget({ lat, lng, compact = false }: WeatherProps) {
    const [weather, setWeather] = useState<any>(null);
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
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`
            );
            if (!res.ok) throw new Error("API Error");
            const data = await res.json();
            setWeather(data.current);
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

    if (error) {
        return (
            <div className={`flex items-center text-gray-400 text-xs ${compact ? '' : 'bg-red-50 p-2 rounded border border-red-100'}`}>
                {compact ? <AlertCircle size={14}/> : (
                    <button onClick={fetchWeather} className="flex items-center hover:text-red-500 transition">
                        <RefreshCw size={14} className="mr-1"/> Reintentar
                    </button>
                )}
            </div>
        );
    }

    if (loading) {
        return (
            <div className={`flex items-center justify-center text-blue-400 ${compact ? '' : 'p-2'}`}>
                <Loader2 className="animate-spin" size={compact ? 16 : 20} />
            </div>
        );
    }

    if (!weather) return null;

    if (compact) {
        return (
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur px-2 py-1 rounded-lg border border-gray-200 shadow-sm text-xs font-bold text-gray-700">
                {getWeatherIcon(weather.weather_code)}
                <span>{Math.round(weather.temperature_2m)}°C</span>
            </div>
        );
    }

    return (
        <div className="flex items-center bg-gradient-to-br from-blue-50 to-white px-3 py-2 rounded-xl border border-blue-100 shadow-sm">
            <div className="flex flex-col items-center mr-3">
                {getWeatherIcon(weather.weather_code)}
                <span className="text-lg font-black text-gray-800 leading-none mt-1">{Math.round(weather.temperature_2m)}°</span>
            </div>
            <div className="h-8 w-px bg-blue-200 mr-3"></div>
            <div className="flex flex-col text-[10px] text-gray-600 font-medium space-y-1">
                <div className="flex items-center"><Droplets size={10} className="mr-1 text-blue-500"/> {weather.relative_humidity_2m}% Hum</div>
                <div className="flex items-center"><Wind size={10} className="mr-1 text-gray-500"/> {weather.wind_speed_10m} km/h</div>
            </div>
        </div>
    );
}
