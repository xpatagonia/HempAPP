# HempC Telemetry Engine (FastAPI + Python)

Motor backend de telemetría de alta velocidad, ingesta IoT y modelado agronómico ecofisiológico para la plataforma **HempC | Red Cooperativa Nucleus**.

Diseñado para desplegarse de manera independiente y continua en **Render** (o cualquier proveedor de contenedores) en convivencia con el frontend en **Vercel** y la base de datos en **Supabase**.

---

## 🚀 Despliegue en Render en 3 Pasos

### Opción A: Despliegue Automático con Render Blueprint (`render.yaml`)
1. Sube tu repositorio a GitHub / GitLab.
2. Ingresa a [dashboard.render.com](https://dashboard.render.com).
3. Haz clic en **New +** > **Blueprint**.
4. Selecciona tu repositorio. Render detectará automáticamente el archivo `backend/render.yaml` y creará el Web Service configurado con:
   - Entorno Python 3.11
   - Comando de compilación: `pip install -r requirements.txt`
   - Comando de inicio: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Clave aleatoria autogenerada para `DEVICE_INGEST_API_KEY`.

### Opción B: Despliegue Manual como Web Service
1. En Render: **New +** > **Web Service**.
2. Conecta tu repositorio y configura:
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free o Starter.
3. Agrega las variables de entorno:
   - `DEVICE_INGEST_API_KEY`: Tu clave secreta para los sensores de campo.
   - `SUPABASE_URL`: URL de tu proyecto Supabase.
   - `SUPABASE_KEY`: Clave de servicio o anon de Supabase.
   - `CORS_ORIGINS`: Dominio de tu frontend en Vercel (ej: `https://hempc-nucleus.vercel.app`).

---

## 📡 Endpoints Principales

| Método | Endpoint | Descripción | Autenticación |
|---|---|---|---|
| `POST` | `/api/v1/telemetry/ingest` | Ingesta masiva desde dataloggers, sensores y gateways | `X-Device-Api-Key` |
| `GET` | `/api/v1/telemetry/latest/{plot_id}` | Última lectura y evaluación agronómica | Pública / Frontend |
| `GET` | `/api/v1/telemetry/stream/{plot_id}` | Streaming en vivo mediante Server-Sent Events (SSE) | Pública / Frontend |
| `WS` | `/ws/telemetry/{plot_id}` | Conexión WebSocket bidireccional en tiempo real | Pública / Frontend |
| `POST` | `/api/v1/telemetry/simulate` | Disparo de telemetría simulada para pruebas interactivas | Opcional |
| `GET` | `/healthz` | Health check del servicio para monitoreo | Ninguna |
| `GET` | `/docs` | Documentación interactiva Swagger / OpenAPI | Ninguna |

---

## 🔬 Modelos Agronómicos Integrados (Ecofisiología de Cannabis sativa L.)

1. **Evapotranspiración de Referencia (ET0 - FAO 56):** Estimación diaria en mm/día a partir de radiación solar, temperatura, humedad relativa y velocidad del viento.
2. **Déficit de Presión de Vapor (VPD):** Presión de vapor de saturación vs actual en kPa para evaluar estrés estomático.
3. **Delta T (°C):** Temperatura de bulbo seco menos bulbo húmedo para determinar idoneidad de pulverización según normativas SENASA/FAO.
4. **Grados Día de Desarrollo (GDD):** Acumulación térmica con base $10^\circ\text{C}$ ajustada al ciclo fenológico del cáñamo.
5. **Riesgo de Heladas:** Detección predictiva de heladas por punto de rocío y temperatura crítica.

---

## 🗄️ Esquema Supabase (Opcional para persistencia histórica)

Ejecuta el siguiente script en el **SQL Editor** de Supabase para almacenar el histórico de telemetría:

```sql
CREATE TABLE IF NOT EXISTS telemetry_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,
    plot_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    battery_pct NUMERIC,
    metrics JSONB NOT NULL,
    assessment JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_plot_time ON telemetry_logs (plot_id, timestamp DESC);
```

---

## 🔌 Ejemplo de Envío desde Dispositivo / Microcontrolador (ESP32 / Python / cURL)

```bash
curl -X POST "https://tu-servicio-en-render.onrender.com/api/v1/telemetry/ingest" \
     -H "Content-Type: application/json" \
     -H "X-Device-Api-Key: hempc-device-secret-key-2026" \
     -d '{
       "device_id": "EST-METEO-LOTE-4",
       "plot_id": "plot-norte-01",
       "battery_pct": 98.4,
       "metrics": {
         "soil_moisture_pct": 32.5,
         "soil_temp_c": 19.8,
         "soil_ec_ds_m": 1.4,
         "air_temp_c": 24.2,
         "air_humidity_pct": 54.0,
         "solar_radiation_wm2": 780.0,
         "rain_mm": 0.0,
         "wind_speed_kmh": 12.3
       }
     }'
```
