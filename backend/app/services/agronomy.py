import math
from typing import Tuple
from app.models.telemetry import SensorMetrics, AgronomicAssessment

class AgronomyCalculator:
    # Parámetros ecofisiológicos de Cannabis sativa L. (Cáñamo Industrial)
    T_BASE = 10.0   # Temperatura base para Grados Día de Desarrollo (°C)
    T_OPT = 25.0    # Temperatura óptima vegetativa
    T_MAX = 38.0    # Temperatura máxima umbral

    @staticmethod
    def calculate_dew_point(temp_c: float, rh_pct: float) -> float:
        """Calcula el punto de rocío mediante la fórmula de Magnus-Tetens."""
        a = 17.27
        b = 237.7
        alpha = ((a * temp_c) / (b + temp_c)) + math.log(max(rh_pct, 1.0) / 100.0)
        return round((b * alpha) / (a - alpha), 2)

    @staticmethod
    def calculate_vpd(temp_c: float, rh_pct: float) -> float:
        """
        Calcula el Déficit de Presión de Vapor (VPD) en kPa.
        Esencial para regular la transpiración y apertura estomática en Cannabis sativa L.
        """
        # Presión de vapor de saturación (SVP) en kPa
        svp = 0.61078 * math.exp((17.27 * temp_c) / (temp_c + 237.3))
        # Presión de vapor actual (AVP)
        avp = svp * (rh_pct / 100.0)
        vpd = svp - avp
        return round(max(0.0, vpd), 2)

    @staticmethod
    def calculate_delta_t(temp_c: float, rh_pct: float) -> Tuple[float, str]:
        """
        Calcula Delta T (°C) = Temperatura de bulbo seco - Temperatura de bulbo húmedo.
        Indicador internacional estándar para calibración de pulverizaciones agrícolas (SENASA / FAO).
        Delta T óptimo: 2°C a 8°C.
        """
        # Estimación precisa de temperatura de bulbo húmedo (Stull, 2011)
        tw = (
            temp_c * math.atan(0.151977 * math.sqrt(rh_pct + 8.313659))
            + math.atan(temp_c + rh_pct)
            - math.atan(rh_pct - 1.676331)
            + 0.00391838 * (rh_pct ** 1.5) * math.atan(0.023101 * rh_pct)
            - 4.686035
        )
        delta_t = round(temp_c - tw, 2)

        if delta_t < 2.0:
            suitability = "Precaución: Humedad muy alta (riesgo de lavado y gotas pesadas)"
        elif 2.0 <= delta_t <= 8.0:
            suitability = "Óptimo para pulverización (baja deriva y evaporación controlada)"
        elif 8.0 < delta_t <= 10.0:
            suitability = "Alerta: Aire seco (mayor evaporación de gota, usar boquillas antideriva)"
        else:
            suitability = "No recomendado: Evaporación extrema de producto activo"

        return delta_t, suitability

    @staticmethod
    def calculate_et0_fao56_simplified(
        temp_c: float,
        rh_pct: float,
        solar_rad_wm2: float = 650.0,
        wind_speed_kmh: float = 12.0
    ) -> float:
        """
        Aproximación de Evapotranspiración de Referencia (ET0 mm/día)
        basada en radiación y temperatura (Hargreaves-Samani / FAO-56 Penman-Monteith).
        """
        # Conversión de radiación W/m² a MJ/m²/día aprox para fotoperíodo activo
        rad_mj = (solar_rad_wm2 * 0.0864) * 0.5  # Estimación diurna
        wind_m_s = wind_speed_kmh / 3.6
        
        # Pendiente de la curva de presión de saturación
        delta = (4098 * (0.6108 * math.exp((17.27 * temp_c) / (temp_c + 237.3)))) / ((temp_c + 237.3) ** 2)
        gamma = 0.067  # Constante psicrométrica media
        
        et0 = (0.408 * delta * rad_mj + gamma * (900 / (temp_c + 273)) * wind_m_s * 1.5) / (delta + gamma * (1 + 0.34 * wind_m_s))
        return round(max(0.5, min(14.0, et0)), 2)

    @staticmethod
    def calculate_gdd(temp_c: float, temp_min: float = None, temp_max: float = None) -> float:
        """Calcula Grados Día de Desarrollo acumulados diarios con base 10°C."""
        if temp_min is None or temp_max is None:
            t_mean = temp_c
        else:
            t_mean = (temp_min + temp_max) / 2.0
        gdd = max(0.0, t_mean - AgronomyCalculator.T_BASE)
        return round(gdd, 2)

    @classmethod
    def evaluate(cls, metrics: SensorMetrics) -> AgronomicAssessment:
        temp = metrics.air_temp_c if metrics.air_temp_c is not None else (metrics.soil_temp_c or 22.0)
        rh = metrics.air_humidity_pct if metrics.air_humidity_pct is not None else 60.0
        rad = metrics.solar_radiation_wm2 if metrics.solar_radiation_wm2 is not None else 600.0
        wind = metrics.wind_speed_kmh if metrics.wind_speed_kmh is not None else 10.0

        dew_point = cls.calculate_dew_point(temp, rh)
        vpd = cls.calculate_vpd(temp, rh)
        delta_t, spray_status = cls.calculate_delta_t(temp, rh)
        et0 = cls.calculate_et0_fao56_simplified(temp, rh, rad, wind)
        gdd = cls.calculate_gdd(temp)
        frost_risk = temp <= 3.0 or dew_point <= 1.0

        # Evaluación de estado de agua en suelo
        soil_moisture = metrics.soil_moisture_pct
        if soil_moisture is not None:
            if soil_moisture < 18.0:
                water_status = "Estrés Hídrico Severo (Bajo Punto de Marchitez)"
            elif 18.0 <= soil_moisture < 28.0:
                water_status = "Humedad Moderada (Apta pero en descenso)"
            elif 28.0 <= soil_moisture <= 45.0:
                water_status = "Capacidad de Campo Óptima"
            else:
                water_status = "Saturación / Riesgo de Anoxia Radicular"
        else:
            water_status = "Sin sensor de suelo conectado"

        return AgronomicAssessment(
            et0_fao56_mm_day=et0,
            gdd_accumulated=gdd,
            delta_t_c=delta_t,
            spray_suitability=spray_status,
            water_stress_status=water_status,
            vapor_pressure_deficit_kpa=vpd,
            dew_point_c=dew_point,
            frost_risk=frost_risk
        )
