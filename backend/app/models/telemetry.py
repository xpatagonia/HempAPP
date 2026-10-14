from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class SensorMetrics(BaseModel):
    # Soil Sensors (e.g., Teros 12, Decagon, capacitive probes)
    soil_moisture_pct: Optional[float] = Field(None, description="Volumetric water content (%)", ge=0, le=100)
    soil_temp_c: Optional[float] = Field(None, description="Soil temperature at 15-30cm (°C)")
    soil_ec_ds_m: Optional[float] = Field(None, description="Electrical Conductivity bulk/pore water (dS/m)", ge=0)
    soil_matric_potential_kpa: Optional[float] = Field(None, description="Matric potential / water tension (kPa)")

    # Atmospheric / Microclimate Sensors (e.g., Davis Vantage, Atmos 41, LoRaWAN weather nodes)
    air_temp_c: Optional[float] = Field(None, description="Ambient air temperature (°C)")
    air_humidity_pct: Optional[float] = Field(None, description="Relative humidity (%)", ge=0, le=100)
    solar_radiation_wm2: Optional[float] = Field(None, description="Solar irradiance (W/m²)", ge=0)
    rain_mm: Optional[float] = Field(0.0, description="Precipitation accumulated in interval (mm)", ge=0)
    wind_speed_kmh: Optional[float] = Field(None, description="Wind velocity (km/h)", ge=0)
    wind_gust_kmh: Optional[float] = Field(None, description="Wind gust peak (km/h)", ge=0)
    wind_direction_deg: Optional[float] = Field(None, description="Wind direction (degrees 0-360)", ge=0, le=360)
    atmospheric_pressure_hpa: Optional[float] = Field(None, description="Barometric pressure (hPa)")
    leaf_wetness_pct: Optional[float] = Field(None, description="Leaf wetness sensor (%)", ge=0, le=100)
    par_umol_m2s: Optional[float] = Field(None, description="Photosynthetically Active Radiation (µmol/m²/s)")

class DeviceTelemetryPayload(BaseModel):
    device_id: str = Field(..., description="Unique hardware identifier or LoRaWAN DevEUI")
    plot_id: str = Field(..., description="Target plot identifier in HempC")
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow, description="Sampling UTC timestamp")
    battery_pct: Optional[float] = Field(None, description="Device battery level percentage", ge=0, le=100)
    signal_rssi_dbm: Optional[int] = Field(None, description="Signal strength RSSI (dBm)")
    metrics: SensorMetrics
    extra_metadata: Optional[Dict[str, Any]] = None

class AgronomicAssessment(BaseModel):
    # Calculated scientific indices
    et0_fao56_mm_day: Optional[float] = Field(None, description="Reference Evapotranspiration FAO-56 (mm/day)")
    gdd_accumulated: Optional[float] = Field(None, description="Growing Degree Days (base 10°C) today")
    delta_t_c: Optional[float] = Field(None, description="Delta T for spray suitability (°C)")
    spray_suitability: str = Field("Óptimo", description="Apto / Precaución / No Apto para pulverización")
    water_stress_status: str = Field("Normal", description="Déficit hídrico / Óptimo / Encharcamiento")
    vapor_pressure_deficit_kpa: Optional[float] = Field(None, description="Vapor Pressure Deficit (VPD in kPa)")
    dew_point_c: Optional[float] = Field(None, description="Punto de rocío (°C)")
    frost_risk: bool = Field(False, description="Alerta de riesgo de helada inminente")

class ProcessedTelemetryRecord(BaseModel):
    id: str
    device_id: str
    plot_id: str
    timestamp: datetime
    metrics: SensorMetrics
    assessment: AgronomicAssessment
    battery_pct: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SimulationRequest(BaseModel):
    plot_id: str = "plot-demo-01"
    device_id: str = "SIM-CANNA-NODE-01"
    temp_variation: Optional[float] = 0.0
    moisture_variation: Optional[float] = 0.0
