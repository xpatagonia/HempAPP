import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Navigation,
  Copy,
  Check,
  Calendar,
  Compass,
  Phone,
  ExternalLink,
  Camera,
  FileText,
  Download,
  Loader2,
  Crosshair
} from 'lucide-react';
import { FieldEvent, User } from '../types';
import {
  buildEventGpsNavigationLinks,
  downloadEventCalendarICS,
  captureEventRouteMapSnapshotDataUrl,
  renderSyncEventMapSnapshotDataUrl,
  downloadEventMapSnapshotPNG,
  downloadEventHowToArriveGuidePDF
} from '../src/services/eventsManagementService';

interface EventRouteMapPreviewProps {
  event: Partial<FieldEvent>;
  attendee?: Partial<User>;
  compact?: boolean;
  editable?: boolean;
  onCoordinatesChange?: (coords: { lat: number; lng: number }) => void;
}

function MapClickGeoreferenceHandler({
  enabled,
  onPick
}: {
  enabled: boolean;
  onPick?: (coords: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      if (!enabled || !onPick) return;
      onPick({
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6))
      });
    }
  });
  return null;
}

export default function EventRouteMapPreview({
  event,
  attendee,
  compact = false,
  editable = false,
  onCoordinatesChange
}: EventRouteMapPreviewProps) {
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [mapMode, setMapMode] = useState<'satellite' | 'street'>('street');
  const [capturedSnapshotUrl, setCapturedSnapshotUrl] = useState<string | undefined>(() =>
    renderSyncEventMapSnapshotDataUrl(event)
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const [showSnapshotPreview, setShowSnapshotPreview] = useState(!compact);

  const nav = buildEventGpsNavigationLinks(event);

  useEffect(() => {
    let active = true;
    const syncPreview = renderSyncEventMapSnapshotDataUrl(event);
    if (syncPreview) setCapturedSnapshotUrl(syncPreview);

    captureEventRouteMapSnapshotDataUrl(event, mapMode).then(url => {
      if (active && url) {
        setCapturedSnapshotUrl(url);
      }
    });

    return () => {
      active = false;
    };
  }, [
    event.id,
    event.venueName,
    event.locality,
    event.address,
    event.routeInstructions,
    nav.lat,
    nav.lng,
    mapMode
  ]);

  const waypoints =
    event.routeWaypoints && event.routeWaypoints.length >= 2
      ? event.routeWaypoints
      : [
          {
            lat: Number((nav.lat + 0.024).toFixed(6)),
            lng: Number((nav.lng - 0.018).toFixed(6)),
            label: `1. Referencia Urbana / Ruta Principal (${event.locality || 'Ciudad'})`
          },
          {
            lat: Number((nav.lat + 0.006).toFixed(6)),
            lng: Number((nav.lng - 0.007).toFixed(6)),
            label: `2. Desvío Señalizado (${nav.address})`
          },
          {
            lat: nav.lat,
            lng: nav.lng,
            label: `3. Tranquera de Acreditación • ${event.venueName || 'Sede Oficial'}`
          }
        ];

  const polylinePositions: [number, number][] = waypoints.map(wp => [wp.lat, wp.lng]);
  const mapCenterLat =
    (Math.min(...waypoints.map(w => w.lat)) + Math.max(...waypoints.map(w => w.lat))) / 2;
  const mapCenterLng =
    (Math.min(...waypoints.map(w => w.lng)) + Math.max(...waypoints.map(w => w.lng))) / 2;

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(nav.decimalLabel);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2200);
  };

  const handleDownloadMapPng = async () => {
    setIsCapturing(true);
    try {
      await downloadEventMapSnapshotPNG(event, mapMode);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownloadHowToArrivePdf = async () => {
    setIsCapturing(true);
    try {
      await downloadEventHowToArriveGuidePDF(event, attendee, capturedSnapshotUrl);
    } finally {
      setIsCapturing(false);
    }
  };

  const gatePhone = (event.gatekeeperPhone || '+5492804697193').replace(/[^0-9]/g, '');
  const whatsappGateUrl = `https://wa.me/${gatePhone}?text=${encodeURIComponent(
    `Hola Guardia de Evento HempC, soy ${
      attendee?.name || 'Visitante Acreditado'
    } (Pase: ${attendee?.eventTicketCode || event.ticketPrefix || 'SIEMBRA-21N'}). Estoy en camino hacia ${
      event.venueName || 'la sede del evento'
    } (${nav.decimalLabel}).`
  )}`;

  return (
    <div className="rounded-2xl border-2 border-[#006633]/40 bg-slate-50 dark:bg-slate-950 overflow-hidden shadow-md space-y-3 p-3.5 text-left">
      {/* Encabezado Cartográfico */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#006633] text-[#DDDB00] flex items-center justify-center shrink-0">
            <Compass size={17} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-black uppercase tracking-wider text-[#006633] dark:text-emerald-400 block">
              MAPA REGIONAL CON REFERENCIAS, CAPTURA DE RUTA E INSTRUCTIVO DE CÓMO LLEGAR
            </span>
            <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white">
              {event.venueName || 'Establecimiento Oficial'} • Referencia: {event.locality || 'VIRCH – Chubut'}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setMapMode('street')}
            className={`px-2.5 py-1 rounded-lg uppercase cursor-pointer transition ${
              mapMode === 'street'
                ? 'bg-[#006633] text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Mapa Vial Claro (Con Referencias)
          </button>
          <button
            type="button"
            onClick={() => setMapMode('satellite')}
            className={`px-2.5 py-1 rounded-lg uppercase cursor-pointer transition ${
              mapMode === 'satellite'
                ? 'bg-[#006633] text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Vista Satélite
          </button>
        </div>
      </div>

      {/* Mapa Interactivo con Vista Regional Alejada (Zoom 12) para ver Ciudad + Rutas + Establecimiento */}
      {editable && onCoordinatesChange && (
        <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-[#006633]/40 flex items-center justify-between gap-2 text-[11px] font-bold text-[#006633] dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <Crosshair size={14} className="shrink-0 text-[#006633] dark:text-emerald-400" />
            <span>
              GEORREFERENCIA INTERACTIVA: Hacé clic en cualquier punto del mapa para fijar la ubicación exacta de la tranquera o sede del evento.
            </span>
          </div>
          <span className="font-mono text-[10px] font-black bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 shrink-0">
            {nav.lat.toFixed(6)}, {nav.lng.toFixed(6)}
          </span>
        </div>
      )}

      <div
        className={`relative w-full ${
          compact ? 'h-56' : 'h-64'
        } rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 z-0 ${
          editable ? 'cursor-crosshair ring-2 ring-[#006633]/30' : ''
        }`}
      >
        <MapContainer
          key={`${mapCenterLat}-${mapCenterLng}-${mapMode}`}
          center={[mapCenterLat, mapCenterLng]}
          zoom={12}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <MapClickGeoreferenceHandler
            enabled={Boolean(editable && onCoordinatesChange)}
            onPick={onCoordinatesChange}
          />
          {mapMode === 'street' ? (
            <TileLayer
              attribution="&copy; OpenStreetMap / Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
            />
          ) : (
            <>
              <TileLayer
                attribution="Esri World Imagery"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
              <TileLayer
                url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              />
            </>
          )}

          {/* Polilínea Exterior Blanca para contraste sobre mapa claro */}
          <Polyline
            positions={polylinePositions}
            pathOptions={{ color: '#ffffff', weight: 10, opacity: 0.95 }}
          />
          {/* Polilínea Intermedia Verde Institucional */}
          <Polyline
            positions={polylinePositions}
            pathOptions={{ color: '#006633', weight: 6, opacity: 0.95 }}
          />
          {/* Polilínea Principal: RUTA DESTACADA */}
          <Polyline
            positions={polylinePositions}
            pathOptions={{
              color: '#DDDB00',
              weight: 3.5,
              opacity: 1,
              dashArray: '8, 6'
            }}
          />

          {/* Nodos de Aproximación y Tranquera */}
          {waypoints.map((wp, idx) => {
            const isDestination = idx === waypoints.length - 1;
            return (
              <CircleMarker
                key={`${wp.lat}-${wp.lng}-${idx}`}
                center={[wp.lat, wp.lng]}
                radius={isDestination ? 10 : 7}
                pathOptions={{
                  color: '#ffffff',
                  weight: 3,
                  fillColor: isDestination ? '#006633' : idx === 0 ? '#0284c7' : '#d97706',
                  fillOpacity: 1
                }}
              >
                <Tooltip
                  direction={idx === 1 ? 'bottom' : 'top'}
                  offset={[0, idx === 1 ? 8 : -8]}
                  permanent={isDestination || idx === 0}
                >
                  <span className="font-mono text-[10px] font-bold">
                    {wp.label || (isDestination ? 'Tranquera de Acreditación' : `Hito Vial ${idx + 1}`)}
                  </span>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Coordenadas GPS e Instructivo Paso a Paso de Cómo Llegar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[9px] font-mono uppercase text-slate-400 block">
              Coordenadas Oficiales para GPS
            </span>
            <span className="font-mono text-xs font-black text-[#006633] dark:text-emerald-400">
              {nav.decimalLabel}
            </span>
            <span className="font-mono text-[10px] text-slate-500 ml-2">({nav.dmsLabel})</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowSnapshotPreview(v => !v)}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-[#006633] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
            >
              <Camera size={12} />
              <span>{showSnapshotPreview ? 'Ocultar Captura' : 'Ver Captura Mapa'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyCoords}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
            >
              {copiedCoords ? (
                <>
                  <Check size={12} className="text-emerald-600" />
                  <span>GPS Copiado</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copiar GPS</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Vista Previa de la Captura Cartográfica Oficial CLARA que se adjunta al Instructivo */}
        {showSnapshotPreview && capturedSnapshotUrl && (
          <div className="rounded-xl overflow-hidden border-2 border-[#006633] bg-white space-y-2 p-2.5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="text-[10px] font-mono font-black uppercase text-[#006633] flex items-center gap-1.5">
                <Camera size={13} />
                <span>Captura Vial Regional Clara (Con Referencia de Ciudad y Rutas)</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={isCapturing}
                  onClick={handleDownloadMapPng}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                >
                  <Download size={11} />
                  <span>Guardar PNG</span>
                </button>
                <button
                  type="button"
                  disabled={isCapturing}
                  onClick={handleDownloadHowToArrivePdf}
                  className="px-2.5 py-1 rounded-lg bg-[#006633] hover:bg-[#004d26] text-white text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
                >
                  {isCapturing ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />}
                  <span>Instructivo PDF</span>
                </button>
              </div>
            </div>
            <img
              src={capturedSnapshotUrl}
              alt={`Captura del mapa regional de cómo llegar a ${event.venueName || 'la sede'}`}
              className="w-full h-auto rounded-lg border border-slate-200 bg-slate-50 block"
            />
          </div>
        )}

        {/* Instructivo Paso a Paso de Cómo Llegar (3 Tramos Viales) */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 space-y-2">
          <div className="text-[10px] font-mono font-black uppercase tracking-wider text-[#006633] dark:text-emerald-400">
            INSTRUCTIVO VIAL PASO A PASO DE CÓMO LLEGAR ({nav.address}):
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {nav.routeSteps.map(step => (
              <div
                key={step.stepNumber}
                className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-[11px]"
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 mt-0.5 ${
                    step.stepNumber === 3
                      ? 'bg-[#006633]'
                      : step.stepNumber === 1
                        ? 'bg-sky-600'
                        : 'bg-amber-600'
                  }`}
                >
                  {step.stepNumber}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <strong className="text-slate-900 dark:text-white font-black text-[11px]">
                      {step.title}
                    </strong>
                    <span className="font-mono text-[10px] font-bold text-[#006633] dark:text-emerald-400">
                      GPS: {step.coordinatesLabel}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-snug mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Botonera Directa para Vincular el GPS del Celular + Descargar Instructivo con Captura de Mapa */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <a
          href={nav.googleMapsDirectionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition"
        >
          <Navigation size={14} />
          <span>Abrir GPS Celular (Google Maps)</span>
          <ExternalLink size={11} />
        </a>

        <a
          href={nav.wazeNavigateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-[#DDDB00] font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition"
        >
          <MapPin size={14} />
          <span>Iniciar Ruta en Waze GPS</span>
          <ExternalLink size={11} />
        </a>

        <button
          type="button"
          disabled={isCapturing}
          onClick={handleDownloadHowToArrivePdf}
          className="py-2.5 px-3 rounded-xl bg-[#006633] hover:bg-[#004d26] text-white font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition"
        >
          {isCapturing ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
          <span>Descargar Instructivo Cómo Llegar + Mapa (PDF)</span>
        </button>

        <button
          type="button"
          disabled={isCapturing}
          onClick={handleDownloadMapPng}
          className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-[#DDDB00] font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition"
        >
          <Camera size={13} />
          <span>Descargar Captura del Mapa (PNG)</span>
        </button>

        {!compact && (
          <>
            <button
              type="button"
              onClick={() => downloadEventCalendarICS(event as FieldEvent, attendee)}
              className="py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-[#006633] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Calendar size={13} />
              <span>Agendar en Celular (.ICS + Alarma GPS)</span>
            </button>

            <a
              href={whatsappGateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              <Phone size={13} />
              <span>Asistencia Vial / Guardia en Tranquera</span>
            </a>
          </>
        )}
      </div>
    </div>
  );
}
