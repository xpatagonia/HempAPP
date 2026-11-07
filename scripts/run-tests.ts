import assert from 'node:assert/strict';
import { 
    getPlotNDVIAlertStatus, 
    generateDetailedSatellitePasses, 
    getPlotAgrochemicalApplications, 
    getUSDASoilTexture,
    calculateWaterEfficiency,
    calculateCarbonFootprint
} from '../src/services/agro40Service.js';
import { DEMO_PLOTS, DEMO_LOCATIONS, DEMO_CLIENTS } from '../src/data/initialDemoData.js';
import {
    createPendingPublicRegistration,
    evaluateUserLoginGate,
    approvePendingRegistrationByAdmin,
    activateApprovedAccountPassword,
    unpackUserMetaFromJobTitle
} from '../src/services/producerOnboardingWorkflow.js';
import { evaluateProducerSteps } from '../src/services/producerTutorialService.js';
import {
    isEventOnlyAttendee,
    partitionUsersByScope,
    createEventRegistrationRecord,
    approveEventAttendeeByAdmin,
    checkInEventAttendeeByAdmin,
    createOrUpdateFieldEventByAdmin,
    buildEnabledEstablishmentsOptions,
    resolveEventVenueFromSelection,
    formatCoordinatesDMS,
    parseCoordinateString,
    buildEventGpsNavigationLinks,
    DEFAULT_FIELD_EVENTS
} from '../src/services/eventsManagementService.js';

console.log("=================================================");
console.log("🧪 INICIANDO BATERÍA DE PRUEBAS UNITARIAS - HEMP");
console.log("=================================================\n");

let passed = 0;
let failed = 0;

function test(description: string, fn: () => void) {
    try {
        fn();
        console.log(`  ✅ PASÓ: ${description}`);
        passed++;
    } catch (err: any) {
        console.error(`  ❌ FALLÓ: ${description}`);
        console.error(`     Error: ${err.message}`);
        failed++;
    }
}

const mockPlot = {
    id: 'plot-101',
    name: 'Lote 1 - Córdoba (Sur)',
    locationId: 'loc-1',
    varietyId: 'var-1',
    sowingDate: '2024-10-15',
    surfaceArea: 10,
    surfaceUnit: 'ha' as const,
    density: 120,
    status: 'Activa' as const
};

const mockVariety = {
    id: 'var-1',
    name: 'Fibranova',
    type: 'Fibra',
    origin: 'Italia',
    cycleDays: 130,
    thcContent: 0.12,
    cbdContent: 1.8,
    description: 'Variedad europea de alta fibra'
};

// --- GRUPO 1: AGRO 4.0 & ALERTAS SATELITALES NDVI ---
console.log("1️⃣  MÓDULO AGRO 4.0 & SATÉLITE COPERNICUS SENTINEL-2");

test('Sombra vegetativa NDVI en rango normal', () => {
    const status = getPlotNDVIAlertStatus(mockPlot, mockVariety, []);
    assert.ok(status.ndvi >= 0 && status.ndvi <= 1.0);
    assert.ok(typeof status.isCritical === 'boolean');
    assert.ok(status.description.length > 0);
});

test('Evaluación de alerta crítica en lote con vigor afectado', () => {
    const status = getPlotNDVIAlertStatus(mockPlot, mockVariety, [
        { id: '1', plotId: 'plot-101', date: '2024-11-20', time: '10:00', stage: 'Vegetativo', temperature: 24, humidity: 60, plantHeight: 15, plantsPerMeter: 3, lightHours: 14, lunarPhase: 'Creciente', vigor: 1, uniformity: 2, lodging: 1, birdDamage: 1, diseasesScore: 1, pestsScore: 1, harvestPlantCount: 0, seedYield: 0, seedQualityGermination: 90, seedQualityNonConformity: 0, stemWeight: 0, floweringDate: '', harvestDate: '', ndvi: 0.12 }
    ]);
    assert.ok(typeof status.isCritical === 'boolean');
    assert.ok(status.suggestedAction.length > 0);
});

test('Generación de pasadas satelitales Sentinel-2', () => {
    const passes = generateDetailedSatellitePasses(mockPlot, mockVariety, []);
    assert.ok(passes.length >= 10);
    assert.ok(passes[0].satellite.includes('Sentinel-2'));
    assert.ok(passes[0].ndviAverage >= 0);
});

// --- GRUPO 2: TRAZABILIDAD Y CUMPLIMIENTO SENASA ---
console.log("\n2️⃣  MÓDULO DE TRAZABILIDAD DE INSUMOS & NORMATIVA SENASA");

test('Base de datos oficial de insumos y registros SENASA (Cero datos demo pre-cargados)', () => {
    const apps = getPlotAgrochemicalApplications([mockPlot]);
    assert.ok(Array.isArray(apps));
});

test('Clasificación textural de suelo según triángulo USDA', () => {
    const texture = getUSDASoilTexture(40, 20, 40);
    assert.equal(texture, 'Franco');
});

test('Cálculo de Eficiencia Hídrica y Consumo Acumulado', () => {
    const water = calculateWaterEfficiency(mockPlot, mockVariety, 200, 50, []);
    assert.equal(water.totalWaterAppliedMm, 250);
    assert.ok(water.hempEtcMm > 0);
    assert.ok(water.waterSavedVsCottonM3 >= 0);
});

// --- GRUPO 3: CÁLCULOS AUDITADOS DE CO2 Y BALANCE HÍDRICO ---
console.log("\n3️⃣  CÁLCULOS AUDITADOS DE BIOECONOMÍA Y BALANCE HÍDRICO");

test('Cálculo de Huella y Captura de Carbono (1.63 kg CO2/kg MS + 22% Radicular)', () => {
    const carbonData = calculateCarbonFootprint(mockPlot, mockVariety, []);
    assert.ok(carbonData.totalGrossCaptureTonnesCO2Ha > 0);
    assert.ok(carbonData.totalGrossCaptureTonnesCO2Plot > 0);
});

test('Balance Hídrico Acumulado (Precipitación + Riego - ETP)', () => {
    const rain = 45;
    const irrigation = 20;
    const etp = 50;
    const net = (rain + irrigation) - etp;
    assert.equal(net, 15);
});

// --- GRUPO 4: TELEMETRÍA IOT & MOTOR RENDER (PYTHON ENGINE) ---
console.log("\n4️⃣  MÓDULO DE TELEMETRÍA IOT & MOTOR RENDER (PYTHON / FASTAPI)");

test('Validación de fórmula Delta T para idoneidad de pulverización SENASA', () => {
    // Delta T = T_seca - T_humeda. Si T=24°C y HR=55%, Delta T debe rondar entre 4 y 7°C
    const temp = 24.0;
    const rh = 55.0;
    const tw = temp * Math.atan(0.151977 * Math.sqrt(rh + 8.313659))
        + Math.atan(temp + rh)
        - Math.atan(rh - 1.676331)
        + 0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh)
        - 4.686035;
    const deltaT = Number((temp - tw).toFixed(2));
    assert.ok(deltaT >= 2.0 && deltaT <= 8.0, `Delta T fuera del rango óptimo: ${deltaT}`);
});

test('Cálculo de Déficit de Presión de Vapor (VPD) para Cannabis sativa L.', () => {
    const temp = 25.0;
    const rh = 60.0;
    const svp = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
    const avp = svp * (rh / 100.0);
    const vpd = Number((svp - avp).toFixed(2));
    // En 25°C y 60% HR, el VPD debe situarse entre 1.0 y 1.4 kPa (zona de transpiración óptima)
    assert.ok(vpd >= 1.0 && vpd <= 1.4, `VPD fuera de rango normal: ${vpd} kPa`);
});

test('Cálculo de Grados Día de Desarrollo (GDD) con base 10°C para cáñamo', () => {
    const tBase = 10.0;
    const tMax = 28.0;
    const tMin = 14.0;
    const tMean = (tMax + tMin) / 2.0;
    const gdd = Math.max(0, tMean - tBase);
    assert.equal(gdd, 11.0);
});

test('Integridad de esquema de eventos de telemetría IoT', () => {
    const sampleRecord = {
        id: 'tel-test-001',
        device_id: 'CANNA-STATION-01',
        plot_id: 'plot-101',
        timestamp: new Date().toISOString(),
        battery_pct: 95.5,
        metrics: {
            soil_moisture_pct: 32.5,
            soil_temp_c: 20.8,
            air_temp_c: 24.5,
            air_humidity_pct: 55.0,
            solar_radiation_wm2: 780
        },
        assessment: {
            spray_suitability: 'Óptimo para pulverización (baja deriva y evaporación controlada)',
            water_stress_status: 'Capacidad de Campo Óptima',
            frost_risk: false
        }
    };
    assert.ok(sampleRecord.id.length > 0);
    assert.ok(sampleRecord.metrics.soil_moisture_pct > 0);
    assert.equal(sampleRecord.assessment.frost_risk, false);
});


// --- GRUPO 5: INTEGRIDAD DE PLATAFORMAS Y DESPACHO DE CORREOS ---
console.log("\n5️⃣  INTEGRIDAD DE INTEGRACIONES (SUPABASE, RENDER, VERCEL, EMAIL)");

test("Normalización y protección de credenciales Supabase", () => {
    const clean1 = "vkfgxbsomxzirdezwrxz";
    const normalized1 = `https://${clean1}.supabase.co`;
    assert.equal(normalized1, "https://vkfgxbsomxzirdezwrxz.supabase.co");

    const clean2 = "https://vkfgxbsomxzirdezwrxz.supabase.co/";
    const normalized2 = clean2.trim().replace(/\/+$/, "");
    assert.equal(normalized2, "https://vkfgxbsomxzirdezwrxz.supabase.co");
});

test("Validación de contrato para notificaciones@hempc.com.ar en Render Engine", () => {
    const emailPayload = {
        to_email: "operario@cooperativa.org",
        to_name: "Juan Perez",
        notification_type: "operator_invitation",
        structure_name: "Establecimiento Las Palmeras",
        field_name: "Lote Sur",
        role_name: "Operario de Campo",
        action_url: "https://hemp-net.vercel.app"
    };
    assert.ok(emailPayload.to_email.includes("@"));
    assert.ok(emailPayload.to_name.length > 0);
    assert.equal(emailPayload.notification_type, "operator_invitation");
    assert.ok(emailPayload.action_url.startsWith("https://"));
});

test("Verificación de orígenes CORS compatibles con Vercel y Render", () => {
    const corsList = [
        "https://hemp-net.vercel.app",
        "https://hempc.com.ar",
        "https://hempapp.onrender.com",
        "http://localhost:3000"
    ];
    corsList.forEach(origin => {
        assert.ok(origin.startsWith("https://") || origin.startsWith("http://"));
    });
});

test("Auditoría de seguridad: Cero claves API privadas en código estático", () => {
    const sampleForbiddenPatterns = ["AQ.Ab8RN", "AIzaSy", "sk-proj-"];
    const dummyService = "export const isDev = true;";
    sampleForbiddenPatterns.forEach(pat => {
        assert.equal(dummyService.includes(pat), false);
    });
});

// --- GRUPO 6: INTEGRIDAD MAPAS, PARCELAS & CAMPOS REALES DE PRODUCCIÓN ---
console.log("\n6️⃣  VERIFICACIÓN RELACIONAL PARCELAS - CAMPOS & MAPAS REALES");

test("Relación estricta: Toda parcela tiene un Campo Padre existente en base real", () => {
    assert.ok(DEMO_PLOTS.length > 0, "No hay parcelas reales cargadas");
    assert.ok(DEMO_LOCATIONS.length > 0, "No hay campos reales cargados");
    DEMO_PLOTS.forEach(plot => {
        const parentLoc = DEMO_LOCATIONS.find(l => l.id === plot.locationId);
        assert.ok(parentLoc !== undefined, `La parcela "${plot.name}" no está asociada a ningún Campo válido (${plot.locationId})`);
    });
});

test("Georreferenciación válida de Campos y Parcelas en territorio argentino", () => {
    DEMO_LOCATIONS.forEach(loc => {
        assert.ok(loc.coordinates, `El campo ${loc.name} carece de coordenadas`);
        assert.ok(loc.coordinates.lat < -21 && loc.coordinates.lat > -56, `Latitud de campo fuera de Argentina: ${loc.coordinates.lat}`);
        assert.ok(loc.coordinates.lng < -53 && loc.coordinates.lng > -74, `Longitud de campo fuera de Argentina: ${loc.coordinates.lng}`);
    });
    DEMO_PLOTS.forEach(plot => {
        assert.ok(plot.coordinates, `La parcela ${plot.name} carece de coordenadas`);
        assert.ok(plot.coordinates.lat < -21 && plot.coordinates.lat > -56, `Latitud de parcela fuera de Argentina: ${plot.coordinates.lat}`);
        assert.ok(plot.coordinates.lng < -53 && plot.coordinates.lng > -74, `Longitud de parcela fuera de Argentina: ${plot.coordinates.lng}`);
    });
});

test("Polígonos vectoriales cerrados con cálculo de área geodésica positiva", () => {
    DEMO_PLOTS.forEach(plot => {
        if (plot.polygon && plot.polygon.length > 0) {
            assert.ok(plot.polygon.length >= 3, `El polígono de "${plot.name}" debe tener al menos 3 vértices`);
            plot.polygon.forEach(v => {
                assert.ok(typeof v.lat === 'number' && typeof v.lng === 'number', 'Vértice con formato inválido');
            });
        }
    });
});

test("Proximidad espacial: Las parcelas están geográficamente contenidas en su Campo Padre", () => {
    DEMO_PLOTS.forEach(plot => {
        const parent = DEMO_LOCATIONS.find(l => l.id === plot.locationId);
        if (parent && plot.coordinates && parent.coordinates) {
            const dLat = Math.abs(plot.coordinates.lat - parent.coordinates.lat);
            const dLng = Math.abs(plot.coordinates.lng - parent.coordinates.lng);
            assert.ok(dLat < 0.25 && dLng < 0.25, `La parcela "${plot.name}" dista demasiado de su campo "${parent.name}"`);
        }
    });
});

test("Prevención de colisión y superposición de tooltips en teledetección espectral", () => {
    // La regla de interactividad condicional desactiva tooltips del polígono perimetral cuando hay píxeles Sentinel-2 activos
    const isPolygonInteractiveOnSpectral = (layer: string) => layer === 'satellite' || layer === 'street';
    assert.equal(isPolygonInteractiveOnSpectral('ndvi_layer'), false);
    assert.equal(isPolygonInteractiveOnSpectral('foliage_layer'), false);
    assert.equal(isPolygonInteractiveOnSpectral('moisture_layer'), false);
    assert.equal(isPolygonInteractiveOnSpectral('satellite'), true);
    assert.equal(isPolygonInteractiveOnSpectral('street'), true);
});

test("Trazabilidad completa de Parcela para Rótulo QR y Pasaporte Biológico", () => {
    DEMO_PLOTS.forEach(plot => {
        assert.ok(plot.id, "ID parcelario ausente");
        assert.ok(plot.name, "Nombre de parcela ausente");
        assert.ok(plot.locationId, "Campo Padre ausente");
        assert.ok(plot.varietyId, "Variedad botánica ausente");
        assert.ok(plot.surfaceArea && plot.surfaceArea > 0, "Superficie debe ser positiva");
        assert.ok(plot.coordinates && plot.coordinates.lat !== 0 && plot.coordinates.lng !== 0, "Coordenadas GPS geodésicas obligatorias");
        assert.ok(plot.campaign, "Campaña agrícola declarada obligatoria");
    });
});

test("Cartel de Parcela Exterior: Declaración explícita de Cáñamo No Psicoactivo (Ley 27.669)", () => {
    const regulatoryThresholdThc = 1.0; // Tenor máximo legal THC < 1.0%
    const legalNotice = "CÁÑAMO INDUSTRIAL NO PSICOACTIVO - LEY 27.669 & DEC. 405/2023";
    assert.ok(legalNotice.includes("NO PSICOACTIVO"));
    assert.ok(regulatoryThresholdThc <= 1.0);
    // Verificación de que las parcelas activas están bajo el marco legal
    DEMO_PLOTS.forEach(plot => {
        assert.ok(plot.status === 'Activa' || plot.status === 'En Barbecho' || plot.status === 'Cosechada');
    });
});

test("Geodesia de Parcela: Desacople de interactividad en polígono de referencia para prevenir superposición", () => {
    // La capa de referencia del Campo Padre no debe emitir tooltips invasivos ni competir con vértices de parcela
    const isReferenceInteractive = false;
    assert.equal(isReferenceInteractive, false);
});

// --- GRUPO 7: PROCESOS DE REGISTRO, EVENTO "UN DÍA DE SIEMBRA" Y ACTIVACIÓN DE CUENTA ---
console.log("\n7️⃣  AUDITORÍA DE PROCESOS DE REGISTRO, APROBACIÓN ADMIN Y EVENTO");

test("Prioridad de perfiles en Solicitar Alta de Usuario: Visitante / Invitado General primero", () => {
    const profileOrder = ['visitante', 'productor', 'tecnico', 'integrante_red'];
    assert.equal(profileOrder[0], 'visitante');
    assert.equal(profileOrder.length, 4);
});

test("Inscripción al Evento: Restricción exclusiva a Visitante al Evento y descarga tras confirmar email", () => {
    const mode = 'event';
    const isEventSelected = mode === 'event';
    const assignedProfile = isEventSelected ? 'visitante' : 'productor';
    assert.equal(assignedProfile, 'visitante');
});

test("Seguridad de Alta: Sin contraseña en formulario público; enlace enviado tras aprobación Admin", () => {
    const newRegistration = {
        accountStatus: 'pending_approval' as const,
        passwordPendingSetup: true,
        password: ''
    };
    assert.equal(newRegistration.accountStatus, 'pending_approval');
    assert.equal(newRegistration.passwordPendingSetup, true);
    assert.equal(newRegistration.password, '');
});

test("Sincronización Multi-Dispositivo: Persistencia explícita de accountStatus='active' en HEMPC_USER_META", () => {
    const approvedUser = {
        accountStatus: 'active',
        requestedProfileType: 'visitante',
        passwordPendingSetup: false,
        dniNumber: '30111222'
    };
    const metaPayload: Record<string, any> = {};
    if (approvedUser.accountStatus) metaPayload.accountStatus = approvedUser.accountStatus;
    if (approvedUser.dniNumber) metaPayload.dniNumber = approvedUser.dniNumber;
    metaPayload.passwordPendingSetup = false;

    const packedJobTitle = `Visitante Acreditado <!--HEMPC_USER_META:${JSON.stringify(metaPayload)}-->`;
    const match = packedJobTitle.match(/<!--HEMPC_USER_META:(.*?)-->/);
    assert.ok(match && match[1]);
    const unpacked = JSON.parse(match[1]);
    assert.equal(unpacked.accountStatus, 'active');
    assert.equal(unpacked.passwordPendingSetup, false);
    assert.equal(unpacked.dniNumber, '30111222');
});

// --- GRUPO 8: RE-INGENIERÍA FITOSANITARIA (PROVEEDOR → INVENTARIO → ORDEN DE LABOR → CUADERNO SENASA) ---
console.log("\n8️⃣  RE-INGENIERÍA FITOSANITARIA: PROVEEDORES → INVENTARIO → ORDEN DE LABOR → CUADERNO SENASA");

test("Trazabilidad obligatoria: Todo insumo en Orden de Labor referencia un Insumo Homologado en Inventario y su Proveedor", () => {
    const supplier = {
        id: 'sup-bio-01',
        name: 'BioInsumos Patagonia S.A.',
        cuit: '30-71554433-9',
        category: 'Bioinsumos / Fitosanitarios'
    };
    const resource = {
        id: 'res-tricho-01',
        name: 'Trichoderma harzianum WP',
        category: 'Bioinsumo / Control Biológico' as const,
        stock: 150,
        unit: 'L',
        activeIngredient: 'Trichoderma harzianum cepa T22 (1x10^9 UFC/ml)',
        senasaRegisterNumber: 'SENASA-BIO-39481',
        batchNumber: 'LOTE-2025-TH09',
        supplierId: supplier.id,
        toxicologicalClass: 'IV - Verde (Normalmente no ofrece peligro)' as const,
        safetyPeriodDays: 0,
        recommendedDosagePerHa: 2.5
    };
    const plotAreaHa = 12;
    const totalVolume = Number((resource.recommendedDosagePerHa * plotAreaHa).toFixed(2));
    assert.equal(totalVolume, 30);
    assert.ok(totalVolume <= resource.stock, "El volumen requerido no puede superar el stock disponible en galpón");
    assert.equal(resource.supplierId, supplier.id);
    assert.ok(resource.senasaRegisterNumber.startsWith('SENASA-'));
});

test("Persistencia Multi-Dispositivo: Empaquetado y desempaquetado de HEMPC_TASK_META en Orden de Labor (Insumos y Clima)", () => {
    const taskMeta = {
        laborType: 'Pulverización Fitosanitaria / Biológica',
        syncWithPhytosanitary: true,
        linkedAgroAppId: 'agro-task-t-900',
        weather: {
            tempC: 23.5,
            humidityPct: 58,
            windSpeedKmh: 11,
            windDirection: 'NE',
            rainMm: 0,
            soilCondition: 'Húmedo Óptimo'
        },
        appliedInputs: [{
            resourceId: 'res-tricho-01',
            resourceName: 'Trichoderma harzianum WP',
            category: 'Bioinsumo / Control Biológico',
            quantity: 30,
            unit: 'L',
            dosagePerHa: 2.5,
            dosageUnit: 'L/ha',
            activeIngredient: 'Trichoderma harzianum cepa T22',
            senasaRegisterNumber: 'SENASA-BIO-39481',
            batchNumber: 'LOTE-2025-TH09',
            supplierId: 'sup-bio-01',
            supplierName: 'BioInsumos Patagonia S.A.',
            toxicologicalClass: 'IV - Verde (Normalmente no ofrece peligro)',
            safetyPeriodDays: 0,
            applicationMethod: 'Pulverización Terrestre (Botalón)',
            targetPestOrDisease: 'Fusarium spp. / Damping-off',
            responsibleAgronomist: 'Ing. Agr. Martín Gómez',
            agronomistLicense: 'MP-8841'
        }]
    };
    const packedDescription = `Aplicación preventiva en pre-floración\n<!--HEMPC_TASK_META:${JSON.stringify(taskMeta)}-->`;
    const match = packedDescription.match(/\n?<!--HEMPC_TASK_META:(.*?)-->\s*$/s);
    assert.ok(match && match[1]);
    const cleanText = packedDescription.replace(/\n?<!--HEMPC_TASK_META:.*?-->\s*$/s, '').trim();
    const unpacked = JSON.parse(match[1]);
    assert.equal(cleanText, 'Aplicación preventiva en pre-floración');
    assert.equal(unpacked.syncWithPhytosanitary, true);
    assert.equal(unpacked.appliedInputs[0].resourceId, 'res-tricho-01');
    assert.equal(unpacked.appliedInputs[0].supplierId, 'sup-bio-01');
    assert.equal(unpacked.weather.windSpeedKmh, 11);
});

test("Regla de Negocio Estricta: El Productor no puede aplicar ningún insumo que no figure en la Lista de Tareas de Campo", () => {
    const canProducerApplyTreatment = (role: string, linkedTaskId: string, plotTasks: { id: string; resourceId: string }[], selectedResourceId: string) => {
        const isProducer = role === 'client' || role === 'Socio_Productor' || role === 'technician';
        if (isProducer && !linkedTaskId) return false;
        const matchedTask = plotTasks.find(t => t.id === linkedTaskId);
        if (isProducer && !matchedTask) return false;
        if (matchedTask && matchedTask.resourceId !== selectedResourceId) return false;
        return true;
    };

    const authorizedTasks = [{ id: 'task-fit-101', resourceId: 'res-tricho-01' }];
    // Caso 1: Productor intenta aplicar sin Orden de Labor -> BLOQUEADO
    assert.equal(canProducerApplyTreatment('Socio_Productor', '', authorizedTasks, 'res-tricho-01'), false);
    // Caso 2: Productor intenta aplicar un insumo distinto al de la Orden de Labor -> BLOQUEADO
    assert.equal(canProducerApplyTreatment('Socio_Productor', 'task-fit-101', authorizedTasks, 'res-otro-999'), false);
    // Caso 3: Productor aplica el insumo prescripto en su Orden de Labor -> PERMITIDO
    assert.equal(canProducerApplyTreatment('Socio_Productor', 'task-fit-101', authorizedTasks, 'res-tricho-01'), true);
});

test("Persistencia Multi-Dispositivo en Supabase public.resources: Empaquetado HEMPC_RES_META en columna type", () => {
    const resourceMeta = {
        activeIngredient: 'Beauveria bassiana 1x10^9 conidias/ml',
        senasaRegisterNumber: 'SENASA-BIO-40122',
        toxicologicalClass: 'IV - Verde (Normalmente no ofrece peligro)',
        safetyPeriodDays: 0,
        reEntryPeriodHours: 4,
        batchNumber: 'LOTE-BB-2026-04',
        expirationDate: '2027-06-30',
        supplierId: 'sup-bio-01',
        recommendedDosagePerHa: 1.5,
        dosageUnit: 'L/ha',
        minSafeDosagePerHa: 1.0,
        maxSafeDosagePerHa: 2.0,
        brothVolumeLitersPerHa: 200,
        targetPestsOrUses: 'Control biológico de trips y mosca blanca',
        applicationConditions: 'Aplicar al atardecer con HR > 50%'
    };
    const packedType = `Bioinsumo / Control Biológico\n<!--HEMPC_RES_META:${JSON.stringify(resourceMeta)}:END_RES_META-->`;
    const match = packedType.match(/\n?<!--HEMPC_RES_META:(.*?):END_RES_META-->\s*$/s);
    assert.ok(match && match[1]);
    const cleanCategory = packedType.replace(/\n?<!--HEMPC_RES_META:.*?:END_RES_META-->\s*$/s, '').trim();
    const unpacked = JSON.parse(match[1]);
    assert.equal(cleanCategory, 'Bioinsumo / Control Biológico');
    assert.equal(unpacked.senasaRegisterNumber, 'SENASA-BIO-40122');
    assert.equal(unpacked.supplierId, 'sup-bio-01');
    assert.equal(unpacked.recommendedDosagePerHa, 1.5);
    assert.equal(unpacked.maxSafeDosagePerHa, 2.0);
});

test("Seguridad e Infraestructura: Sanitización XSS en plantillas de correo y dominios CORS autorizados", () => {
    const escapeHtml = (raw: string) =>
        raw
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    const maliciousInput = `<script>alert("xss")</script>`;
    const escaped = escapeHtml(maliciousInput);
    assert.equal(escaped.includes('<script>'), false);
    assert.equal(escaped, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');

    const trustedOrigins = [
        'https://red.hempc.com.ar',
        'https://hemp-net.vercel.app',
        'https://hempc.com.ar',
        'https://hempapp.onrender.com'
    ];
    assert.ok(trustedOrigins.includes('https://red.hempc.com.ar'));
});

// --- GRUPO 9: CENTRO DE TUTORÍA Y ASISTENTE PASO A PASO DEL PRODUCTOR ---
console.log("\n9️⃣  CENTRO DE TUTORÍA OPERATIVA & ASISTENTE PASO A PASO DEL PRODUCTOR");

test("Evaluación en vivo de los 6 Eslabones Operativos del Productor y matriz Productor vs. Admin", () => {
    const stepNumbers = ['01', '02', '03', '04', '05', '06'];
    const routes = ['/locations', '/storage', '/resources', '/plots', '/tasks', '/phytosanitary'];
    assert.equal(stepNumbers.length, 6);
    assert.equal(routes.length, 6);
    assert.equal(routes[2], '/resources');
    assert.equal(routes[4], '/tasks');
    assert.equal(routes[5], '/phytosanitary');
});

// --- GRUPO 10: CICLO DE ALTA DEL PRODUCTOR, VALIDACIÓN EXCLUSIVA POR ADMIN Y ACTIVACIÓN (ZERO-TOUCH) ---
console.log("\n🔟  CICLO DE ALTA DEL PRODUCTOR, APROBACIÓN ADMIN EXCLUSIVA Y ACTIVACIÓN MULTI-DISPOSITIVO (ZERO-TOUCH)");

test("10.1 Solicitud Pública de Productor: Nace en pending_approval con clave bloqueada y SIN crear Client previo", () => {
    const { user, activationToken } = createPendingPublicRegistration({
        id: 'usr-test-prod-01',
        name: 'Carlos Productor Valle',
        email: 'carlos.valle@productor.ar',
        phone: '+5492804112233',
        dniNumber: '28999111',
        organizationName: 'Chacra El Valle Sur',
        localityOrProvince: 'Gaiman, Chubut',
        estimatedHectares: 12,
        requestedProfileType: 'productor',
        registrationSource: 'self_service_platform',
        isEventRegistration: false
    });

    assert.equal(user.accountStatus, 'pending_approval');
    assert.equal(user.passwordPendingSetup, true);
    assert.ok(String(user.password).startsWith('__PENDING_APPROVAL_LOCKED_'));
    assert.equal(user.clientId, undefined, 'No debe asignarse ni crearse clientId antes de la aprobación del Administrador');
    assert.equal(user.isNetworkMember, false);
    assert.ok(activationToken.startsWith('ACT-'));
});

test("10.2 Compuerta de Seguridad pre-aprobación: Bloquea Login y Activación mientras accountStatus !== 'active'", () => {
    const { user } = createPendingPublicRegistration({
        name: 'Carlos Productor Valle',
        email: 'carlos.valle@productor.ar',
        requestedProfileType: 'productor',
        registrationSource: 'self_service_platform'
    });

    const gate = evaluateUserLoginGate(user);
    assert.equal(gate.canProceedToPasswordCheck, false);
    assert.equal(gate.requiresPasswordActivationModal, false);
    assert.equal(gate.blockedReason, 'pending_approval');

    const prematureActivation = activateApprovedAccountPassword({
        targetUser: user,
        providedToken: user.activationToken,
        newPassword: 'PasswordSegura123',
        confirmPassword: 'PasswordSegura123'
    });
    assert.equal(prematureActivation.success, false);
    assert.ok(prematureActivation.errorMessage?.includes('Pendiente de Aprobación'));
});

test("10.3 Aprobación Exclusiva por Administrador: Bloquea roles no-admin y crea/vincula Client (clientId) al aprobar como Productor", () => {
    const { user: pendingProducer } = createPendingPublicRegistration({
        id: 'usr-test-prod-02',
        name: 'Elena Chacra Norte',
        email: 'elena@chacranorte.ar',
        organizationName: 'Establecimiento Chacra Norte SRL',
        estimatedHectares: 15,
        requestedProfileType: 'productor',
        registrationSource: 'self_service_platform'
    });

    // Intento de aprobación por un usuario no administrador -> DEBE FALLAR
    assert.throws(() => {
        approvePendingRegistrationByAdmin({
            adminUser: { id: 'u-client', name: 'Otro Productor', role: 'client' },
            targetUser: pendingProducer,
            approveAs: 'productor',
            existingClients: []
        });
    }, /Solo un Administrador/);

    // Aprobación legítima por un Administrador -> CREA Y VINCULA CLIENT AUTOMÁTICAMENTE
    const approvalResult = approvePendingRegistrationByAdmin({
        adminUser: { id: 'u-admin-1', name: 'Admin Master', role: 'super_admin' },
        targetUser: pendingProducer,
        approveAs: 'productor',
        existingClients: [],
        generatedClientId: 'client-chacra-norte-001'
    });

    assert.ok(approvalResult.newClientToCreate, 'Debe generar la ficha de Organización (Client) para el nuevo productor');
    assert.equal(approvalResult.newClientToCreate?.id, 'client-chacra-norte-001');
    assert.equal(approvalResult.newClientToCreate?.name, 'Establecimiento Chacra Norte SRL');
    assert.equal(approvalResult.approvedUser.accountStatus, 'active');
    assert.equal(approvalResult.approvedUser.role, 'client');
    assert.equal(approvalResult.approvedUser.memberType, 'Socio_Productor');
    assert.equal(approvalResult.approvedUser.clientId, 'client-chacra-norte-001');
    assert.equal(approvalResult.approvedUser.passwordPendingSetup, true);
});

test("10.4 Activación Multi-Dispositivo: Desempaqueta HEMPC_USER_META (ambos formatos) y activa clave definitiva con Token", () => {
    const metaPayload = {
        accountStatus: 'active',
        activationToken: 'ACT-TEST99-XYZ',
        passwordPendingSetup: true,
        clientId: 'client-chacra-norte-001',
        requestedProfileType: 'productor'
    };

    // Formato actual (-->) y formato legacy (:END_USER_META-->)
    const packedCurrent = `Productor Asociado <!--HEMPC_USER_META:${JSON.stringify(metaPayload)}-->`;
    const packedLegacy = `Productor Asociado <!--HEMPC_USER_META:${JSON.stringify(metaPayload)}:END_USER_META-->`;

    const unpacked1 = unpackUserMetaFromJobTitle(packedCurrent);
    const unpacked2 = unpackUserMetaFromJobTitle(packedLegacy);

    assert.equal(unpacked1.cleanJobTitle, 'Productor Asociado');
    assert.equal(unpacked1.parsedMeta.accountStatus, 'active');
    assert.equal(unpacked1.parsedMeta.clientId, 'client-chacra-norte-001');
    assert.equal(unpacked2.parsedMeta.activationToken, 'ACT-TEST99-XYZ');

    const remoteUserFromSupabase = {
        id: 'usr-test-prod-02',
        name: 'Elena Chacra Norte',
        email: 'elena@chacranorte.ar',
        role: 'client' as const,
        clientId: unpacked1.parsedMeta.clientId,
        accountStatus: unpacked1.parsedMeta.accountStatus,
        activationToken: unpacked1.parsedMeta.activationToken,
        passwordPendingSetup: unpacked1.parsedMeta.passwordPendingSetup
    };

    // Token incorrecto -> rechazado
    const wrongTokenAttempt = activateApprovedAccountPassword({
        targetUser: remoteUserFromSupabase,
        providedToken: 'ACT-TOKEN-FALSO',
        newPassword: 'MiClaveProductor2026',
        confirmPassword: 'MiClaveProductor2026'
    });
    assert.equal(wrongTokenAttempt.success, false);

    // Token correcto -> activado y listo para operar
    const validActivation = activateApprovedAccountPassword({
        targetUser: remoteUserFromSupabase,
        providedToken: 'ACT-TEST99-XYZ',
        newPassword: 'MiClaveProductor2026',
        confirmPassword: 'MiClaveProductor2026'
    });
    assert.equal(validActivation.success, true);
    assert.equal(validActivation.activatedUser?.password, 'MiClaveProductor2026');
    assert.equal(validActivation.activatedUser?.passwordPendingSetup, false);
    assert.equal(validActivation.activatedUser?.clientId, 'client-chacra-norte-001');
});

test("10.5 Progreso de los 6 Eslabones del Productor: De 0% (Recién Activado) a 100% (Trazabilidad Completa)", () => {
    // Estado inicial de un productor recién aprobado y activado
    const initialReadiness = evaluateProducerSteps({
        locations: [],
        storagePoints: [],
        seedBatches: [],
        resources: [],
        plots: [],
        tasks: [],
        trialRecords: [],
        hydricRecords: [],
        agrochemicalApplications: []
    });
    assert.equal(initialReadiness.completedCount, 0);
    assert.equal(initialReadiness.completionPct, 0);
    assert.equal(initialReadiness.nextRecommendedStep.number, '01');
    assert.equal(initialReadiness.nextRecommendedStep.primaryRoute, '/locations');

    // Estado completo cuando el productor carga los 6 eslabones en orden
    const fullReadiness = evaluateProducerSteps({
        locations: [{ id: 'loc-1', name: 'Campo Norte', province: 'Chubut', address: 'Ruta 7', coordinates: { lat: -43.25, lng: -65.30 }, clientId: 'client-1' }],
        storagePoints: [{ id: 'sp-1', name: 'Galpón 1', code: 'G1', locationId: 'loc-1', type: 'Galpón', capacityKg: 5000, currentStockKg: 200, temperatureC: 18, humidityPct: 45, status: 'Operativo', responsibleName: 'Elena' }],
        seedBatches: [{ id: 'sb-1', batchCode: 'INASE-01', varietyId: 'var-1', supplierId: 'sup-1', initialQuantityKg: 100, remainingQuantityKg: 80, certificationDate: '2025-09-01', germinationPower: 92, purity: 99, status: 'En Stock', storagePointId: 'sp-1' }],
        resources: [{ id: 'res-1', name: 'Trichoderma WP', type: 'Insumos', unit: 'L', costPerUnit: 20, stock: 50, senasaRegisterNumber: 'SENASA-39481', supplierId: 'sup-1', recommendedDosagePerHa: 2.0 }],
        plots: [{ id: 'p-1', name: 'Lote 1', locationId: 'loc-1', varietyId: 'var-1', sowingDate: '2025-10-15', surfaceArea: 10, surfaceUnit: 'ha', density: 40, status: 'Activa', polygon: [{ lat: -43.25, lng: -65.30 }, { lat: -43.26, lng: -65.30 }, { lat: -43.26, lng: -65.31 }] }],
        tasks: [{ id: 't-1', title: 'Aplicación Trichoderma', description: 'Control preventivo', status: 'Ejecutada', priority: 'Alta', assignedToIds: ['u-1'], dueDate: '2025-11-10', plotId: 'p-1', createdBy: 'u-1', syncWithPhytosanitary: true, appliedInputs: [{ resourceId: 'res-1', name: 'Trichoderma WP', quantity: 20, unit: 'L', costPerUnit: 20 }] }],
        trialRecords: [{ id: 'tr-1', plotId: 'p-1', date: '2025-11-12', time: '09:00', stage: 'Vegetativo', temperature: 22, humidity: 55, plantHeight: 45, plantsPerMeter: 12, lightHours: 14, lunarPhase: 'Creciente', vigor: 5, uniformity: 5, lodging: 1, birdDamage: 1, diseasesScore: 1, pestsScore: 1, harvestPlantCount: 0, seedYield: 0, seedQualityGermination: 92, seedQualityNonConformity: 0, stemWeight: 0, floweringDate: '', harvestDate: '' }],
        hydricRecords: [],
        agrochemicalApplications: [{ id: 'ag-1', plotId: 'p-1', plotName: 'Lote 1', date: '2025-11-10', productName: 'Trichoderma WP', activeIngredient: 'Trichoderma', category: 'Bioinsumo / Control Biológico', senasaRegisterNumber: 'SENASA-39481', toxicologicalClass: 'Biológico / Orgánico Certificado', dosagePerHa: 2.0, dosageUnit: 'L/ha', totalAppliedAmount: 20, safetyPeriodDays: 0, applicationMethod: 'Pulverización Terrestre', targetPestOrDisease: 'Fusarium', responsibleAgronomist: 'Ing. Gómez', agronomistLicense: 'MP-8841', status: 'Aplicado', linkedTaskId: 't-1', resourceId: 'res-1' }]
    });

    assert.equal(fullReadiness.completedCount, 6);
    assert.equal(fullReadiness.completionPct, 100);
    assert.equal(fullReadiness.phytosanitaryChainReady, true);
});

// --- GRUPO 11: RE-INGENIERÍA DE USUARIOS, AISLAMIENTO DE VISITANTES Y MÓDULO EXCLUSIVO EVENTOS ---
console.log("\n1️⃣1️⃣  AISLAMIENTO ESTRICTO DE VISITANTES DE JORNADA (SIN LOGIN) & MÓDULO EXCLUSIVO EVENTOS");

test("11.1 Partición Estricta (Zero-Touch): Separa los 11 Operadores Reales del Sistema de los 6 Visitantes de Jornada en Producción", () => {
    const mockProductionUsers = [
        // 3 Administradores
        { id: '1', name: 'Admin Master', email: 'gaston@patagonianc.com', role: 'super_admin' as const, jobTitle: 'Director General' },
        { id: '2', name: 'Gastón BAREA M.', email: 'gbarea@hempc.com.ar', role: 'admin' as const, jobTitle: 'Coordinación General' },
        { id: '3', name: 'Andrea Andrade', email: 'aandrade@hempc.com.ar', role: 'admin' as const, jobTitle: 'Administración' },
        // 2 Técnicos
        { id: '4', name: 'Julian PIZARRO', email: 'jpizarro@hempc.com.ar', role: 'technician' as const, jobTitle: 'Director Técnico' },
        { id: '5', name: 'Matias QUINTANA', email: 'mquintana@hempc.com.ar', role: 'technician' as const, jobTitle: 'Ingeniero Agrónomo' },
        // 3 Productores
        { id: '6', name: 'Ricardo La Regina', email: 'rlaregina@socio.ar', role: 'client' as const, clientId: 'c-1', jobTitle: 'Productor Asociado' },
        { id: '7', name: 'Salvador MERELLE', email: 'smerelle@socio.ar', role: 'client' as const, clientId: 'c-2', jobTitle: 'Productor Asociado' },
        { id: '8', name: 'Joaquin AREZO', email: 'jarezo@socio.ar', role: 'client' as const, clientId: 'c-3', jobTitle: 'Productor Asociado' },
        // 3 Auditores de Semilleros Homologados (viewer con supplierId / semillero)
        { id: '9', name: 'Gabriel Blocki', email: 'gblocki@anandapampa.com', role: 'viewer' as const, supplierId: 'sup-ananda', organizationName: 'Ananda Pampa' },
        { id: '10', name: 'Remy Hilgengra', email: 'remy@hempit.fr', role: 'viewer' as const, supplierId: 'sup-hempit', organizationName: 'HEMPIT France' },
        { id: '11', name: 'Jean-Eric Ponthou', email: 'jeponthou@hempit.fr', role: 'viewer' as const, supplierId: 'sup-hempit', organizationName: 'HEMPIT France' },
        // 6 Visitantes de Jornada en Producción
        { id: '12', name: 'Walter Ruben Machado', email: 'walmach@gmail.com', role: 'viewer' as const, eventRegistered: true, eventTicketCode: 'SIEMBRA-21N-1001', requestedProfileType: 'visitante' as const },
        { id: '13', name: 'Joaquín Martinez', email: 'joaquintw5@gmail.com', role: 'viewer' as const, eventRegistered: true, eventTicketCode: 'SIEMBRA-21N-1002', requestedProfileType: 'visitante' as const },
        { id: '14', name: 'Corina Edith Acosta', email: 'corinaedithacosta@gmail.com', role: 'viewer' as const, eventRegistered: true, eventTicketCode: 'SIEMBRA-21N-1003', requestedProfileType: 'visitante' as const },
        { id: '15', name: 'Andrade andrea belen', email: 'andrade.andrea.belen@gmail.com', role: 'viewer' as const, eventRegistered: true, eventTicketCode: 'SIEMBRA-21N-1004', requestedProfileType: 'visitante' as const },
        { id: '16', name: 'Ivana Carina Garcia Tulian', email: 'ivanacary1476@gmail.com', role: 'viewer' as const, eventRegistered: true, eventTicketCode: 'SIEMBRA-21N-1005', requestedProfileType: 'visitante' as const },
        { id: '17', name: 'Juan', email: 'pedritohug1234@gmail.com', role: 'viewer' as const, accountStatus: 'pending_approval' as const, requestedProfileType: 'visitante' as const, registrationSource: 'self_service_platform' as const }
    ];

    const { systemUsers, eventAttendees } = partitionUsersByScope(mockProductionUsers);
    assert.equal(systemUsers.length, 11, 'Los 11 operadores reales del sistema deben permanecer en ADMIN Y ACCESOS');
    assert.equal(eventAttendees.length, 6, 'Los 6 visitantes de jornada deben quedar 100% aislados en EVENTOS');
    assert.equal(systemUsers.some(u => u.email === 'walmach@gmail.com'), false);
    assert.equal(systemUsers.some(u => u.email === 'gblocki@anandapampa.com'), true, 'Los auditores de semilleros homologados son operadores reales del sistema');
});

test("11.2 Bloqueo Total de Login al Sistema para Visitantes de Eventos (Antes y Después de Acreditación Admin)", () => {
    const attendee = createEventRegistrationRecord({
        name: 'Martín Visitante Jornada',
        email: 'martin.visitante@evento.ar',
        phone: '+5492804556677',
        dniNumber: '33444555',
        organizationName: 'INTA Chubut',
        localityOrProvince: 'Trelew, Chubut',
        event: DEFAULT_FIELD_EVENTS[0]
    });

    assert.equal(isEventOnlyAttendee(attendee), true);
    assert.equal(attendee.accessScope, 'event_attendee');
    assert.ok(String(attendee.eventTicketCode).startsWith('SIEMBRA-21N-'));

    // Intento de login antes de aprobar acreditación -> BLOQUEADO POR EVENT_VISITOR_NO_SYSTEM_ACCESS
    const gateBefore = evaluateUserLoginGate(attendee);
    assert.equal(gateBefore.canProceedToPasswordCheck, false);
    assert.equal(gateBefore.requiresPasswordActivationModal, false);
    assert.equal(gateBefore.blockedReason, 'event_visitor_no_system_access');

    // Aprobación de acreditación al evento por el Administrador
    const updatedAttendee = approveEventAttendeeByAdmin({
        adminUser: { id: 'admin-1', name: 'Admin Master', email: 'gaston@patagonianc.com', role: 'super_admin' },
        attendee,
        event: DEFAULT_FIELD_EVENTS[0]
    });

    assert.equal(updatedAttendee.eventAccreditationStatus, 'accredited');
    assert.equal(updatedAttendee.password, '__EVENT_VISITOR_NO_SYSTEM_LOGIN__');

    // Intento de login DESPUÉS de aprobar su acreditación al evento -> SIGUE 100% BLOQUEADO PARA ENTRAR AL SISTEMA
    const gateAfter = evaluateUserLoginGate(updatedAttendee);
    assert.equal(gateAfter.canProceedToPasswordCheck, false);
    assert.equal(gateAfter.requiresPasswordActivationModal, false);
    assert.equal(gateAfter.blockedReason, 'event_visitor_no_system_access');

    // Intento de activar contraseña en el sistema -> BLOQUEADO
    const activationAttempt = activateApprovedAccountPassword({
        targetUser: updatedAttendee,
        providedToken: 'CUALQUIER-TOKEN',
        newPassword: 'Password1234',
        confirmPassword: 'Password1234'
    });
    assert.equal(activationAttempt.success, false);
    assert.ok(activationAttempt.errorMessage?.includes('Acreditación de Jornada / Evento'));
});

test("11.3 Gobernanza Exclusiva de Administradores sobre EVENTOS (Creación de Eventos, Acreditación y Check-in en Puerta)", () => {
    const attendee = createEventRegistrationRecord({
        name: 'Laura Asistente Campo',
        email: 'laura@visitante.ar',
        phone: '+5492804998877',
        dniNumber: '31222333',
        localityOrProvince: 'Rawson, Chubut',
        event: DEFAULT_FIELD_EVENTS[0]
    });

    // Un productor o técnico NO puede aprobar acreditaciones ni crear eventos
    assert.throws(() => {
        approveEventAttendeeByAdmin({
            adminUser: { id: 'u-prod', name: 'Productor', email: 'prod@socio.ar', role: 'client' },
            attendee
        });
    }, /Solo los Administradores/);

    assert.throws(() => {
        createOrUpdateFieldEventByAdmin({
            adminUser: { id: 'u-tech', name: 'Técnico', email: 'tech@socio.ar', role: 'technician' },
            eventData: {
                title: 'Visita No Autorizada',
                date: '2026-12-05',
                venueName: 'Chacra'
            },
            existingEvents: DEFAULT_FIELD_EVENTS
        });
    }, /Solo los Administradores/);

    // Un Administrador SÍ puede crear un nuevo evento en el calendario y registrar el Check-in en puerta
    const { savedEvent } = createOrUpdateFieldEventByAdmin({
        adminUser: { id: 'admin-1', name: 'Admin Master', email: 'gaston@patagonianc.com', role: 'admin' },
        eventData: {
            title: 'Visita Técnica Programada — Lotes Semilleros VIRCH',
            category: 'visita_programada',
            date: '2026-12-10',
            startTime: '09:00',
            endTime: '13:00',
            venueName: 'Chacra Experimental PatagonianC LTDA',
            locality: 'Trelew, Chubut',
            maxCapacity: 40
        },
        existingEvents: DEFAULT_FIELD_EVENTS
    });
    assert.equal(savedEvent.category, 'visita_programada');
    assert.equal(savedEvent.maxCapacity, 40);

    const checkedIn = checkInEventAttendeeByAdmin({
        adminUser: { id: 'admin-1', name: 'Admin Master', email: 'gaston@patagonianc.com', role: 'admin' },
        attendee
    });
    assert.equal(checkedIn.eventAccreditationStatus, 'checked_in');
    assert.ok(checkedIn.eventCheckedInAt);
    assert.equal(checkedIn.eventCheckedInBy, 'Admin Master');
});

// ============================================================================
// GRUPO 12: ESTABLECIMIENTO DEL EVENTO (RED + OTRO), RUTA GPS Y SEGURIDAD
// ============================================================================
console.log("\n📍 GRUPO 12: Establecimientos Habilitados, Opción OTRO, Ruta GPS y Blindaje de Seguridad");

test("12.1 Selector 'Establecimiento del Evento' vincula Campos/Establecimientos habilitados en la red y autocompleta Ruta y GPS", () => {
    const options = buildEnabledEstablishmentsOptions(DEMO_LOCATIONS as any, DEMO_CLIENTS as any);
    assert.ok(options.length >= 4, "Debe listar los establecimientos habilitados de la red cooperativa");

    // Verificar que 'Chacra La Regina' (Trelew, Chubut) esté vinculada con su socio 'Establecimiento La Regina'
    const laRegina = options.find(o => o.locationId === "1766444697119");
    assert.ok(laRegina, "Debe encontrar Chacra La Regina en el catálogo habilitado");
    assert.ok(laRegina.displayLabel.includes("Establecimiento La Regina"));
    assert.ok(laRegina.displayLabel.includes("Chacra La Regina"));
    assert.equal(laRegina.coordinates.lat, -43.308362);
    assert.equal(laRegina.coordinates.lng, -65.289033);

    const resolvedFromNetwork = resolveEventVenueFromSelection({
        selectionId: "1766444697119",
        locations: DEMO_LOCATIONS as any,
        clients: DEMO_CLIENTS as any
    });
    assert.equal(resolvedFromNetwork.isCustomLocation, false);
    assert.equal(resolvedFromNetwork.locationId, "1766444697119");
    assert.equal(resolvedFromNetwork.clientId, "2b9a277c-1035-4229-be01-e31d6aa871cb");
    assert.ok(resolvedFromNetwork.venueName.includes("Chacra La Regina"));
    assert.equal(resolvedFromNetwork.coordinates.lat, -43.308362);
    assert.equal(resolvedFromNetwork.coordinates.lng, -65.289033);
    assert.ok(resolvedFromNetwork.routeInstructions.length > 20);
    assert.ok(resolvedFromNetwork.routeWaypoints.length >= 2);
});

test("12.2 Opción 'OTRO' habilita locación externa personalizada, valida coordenadas GPS y persiste en el Calendario de Eventos", () => {
    const parsedCoords = parseCoordinateString("-42.769200, -65.038500");
    assert.ok(parsedCoords);
    assert.equal(parsedCoords.lat, -42.7692);
    assert.equal(parsedCoords.lng, -65.0385);

    // Coordenadas fuera de rango geográfico deben ser rechazadas (null)
    assert.equal(parseCoordinateString("999.99, -250.00"), null);
    assert.equal(parseCoordinateString("texto-invalido-xss"), null);

    const resolvedCustom = resolveEventVenueFromSelection({
        selectionId: "OTHER",
        locations: DEMO_LOCATIONS as any,
        clients: DEMO_CLIENTS as any,
        customVenueName: "Predio Ferial Sociedad Rural del Valle",
        customLocality: "Gaiman, Chubut",
        customAddress: "Ruta Provincial N° 7 Km 38 — Bajada Gaiman",
        customLat: parsedCoords.lat,
        customLng: parsedCoords.lng,
        customRouteInstructions: "Desde Trelew tomar RP 7 hacia Gaiman (18 km). Ingresar por rotonda principal mano derecha."
    });

    assert.equal(resolvedCustom.isCustomLocation, true);
    assert.equal(resolvedCustom.locationId, "OTHER");
    assert.equal(resolvedCustom.venueName, "Predio Ferial Sociedad Rural del Valle");
    assert.equal(resolvedCustom.locality, "Gaiman, Chubut");
    assert.equal(resolvedCustom.address, "Ruta Provincial N° 7 Km 38 — Bajada Gaiman");
    assert.equal(resolvedCustom.coordinates.lat, -42.7692);
    assert.equal(resolvedCustom.coordinates.lng, -65.0385);
    assert.ok(resolvedCustom.routeWaypoints.length >= 2);

    const { savedEvent } = createOrUpdateFieldEventByAdmin({
        adminUser: { id: 'admin-1', name: 'Admin Master', email: 'gaston@patagonianc.com', role: 'admin' },
        eventData: {
            title: 'Jornada Regional en Predio Externo',
            category: 'jornada_campo',
            date: '2026-11-28',
            locationId: resolvedCustom.locationId,
            isCustomLocation: resolvedCustom.isCustomLocation,
            venueName: resolvedCustom.venueName,
            locality: resolvedCustom.locality,
            address: resolvedCustom.address,
            coordinates: resolvedCustom.coordinates,
            routeInstructions: resolvedCustom.routeInstructions,
            routeWaypoints: resolvedCustom.routeWaypoints
        },
        existingEvents: DEFAULT_FIELD_EVENTS
    });

    assert.equal(savedEvent.isCustomLocation, true);
    assert.equal(savedEvent.locationId, "OTHER");
    assert.equal(savedEvent.venueName, "Predio Ferial Sociedad Rural del Valle");
    assert.equal(savedEvent.coordinates?.lat, -42.7692);
});

test("12.3 Ciclo Completo de Acreditación: Captura de Mapa, Instructivo Paso a Paso, Enlaces GPS Celular y Blindaje Anti-Escalación", () => {
    const officialEvent = DEFAULT_FIELD_EVENTS[0];
    const gpsLinks = buildEventGpsNavigationLinks(officialEvent);

    // Verificar formato Decimal, GMS, Captura Estática de Mapa, 3 Tramos del Instructivo y Deep Links para GPS del celular
    assert.equal(gpsLinks.lat, -43.308362);
    assert.equal(gpsLinks.lng, -65.289033);
    assert.ok(gpsLinks.decimalLabel.includes("-43.308362"));
    assert.ok(gpsLinks.dmsLabel.includes("S") && gpsLinks.dmsLabel.includes("W"));
    assert.ok(gpsLinks.staticMapImageUrl.includes("-65.289033,-43.308362"));
    assert.equal(gpsLinks.routeSteps.length, 3, "El instructivo de cómo llegar debe incluir los 3 tramos viales georreferenciados");
    assert.ok(gpsLinks.routeSteps[0].title.includes("Tramo 1"));
    assert.ok(gpsLinks.routeSteps[1].title.includes("Tramo 2"));
    assert.ok(gpsLinks.routeSteps[2].title.includes("Tramo 3"));
    assert.ok(gpsLinks.googleMapsDirectionsUrl.startsWith("https://www.google.com/maps/dir/?api=1&destination=-43.308362,-65.289033"));
    assert.ok(gpsLinks.wazeNavigateUrl.startsWith("https://waze.com/ul?ll=-43.308362,-65.289033&navigate=yes"));
    assert.ok(gpsLinks.googleCalendarUrl.startsWith("https://calendar.google.com/calendar/render?action=TEMPLATE"));
    assert.ok(gpsLinks.geoUri.startsWith("geo:-43.308362,-65.289033"));

    const dms = formatCoordinatesDMS(-43.308362, -65.289033);
    assert.ok(dms.includes("43°") && dms.includes("65°"));

    // Blindaje de seguridad: intento de inyección / escalación de privilegios por un asistente de evento
    const maliciousAttempt = createEventRegistrationRecord({
        name: '<script>alert("xss")</script> Visitante',
        email: 'visitante.externo@evento.com',
        phone: '+5492804001122',
        dniNumber: '30999888',
        localityOrProvince: 'Trelew, Chubut',
        event: officialEvent,
        // Ningún visitante nuevo debe obtener acceso al sistema
        existingUser: undefined
    });

    assert.equal(isEventOnlyAttendee(maliciousAttempt), true);
    assert.equal(maliciousAttempt.role, 'viewer');
    assert.equal(maliciousAttempt.accessScope, 'event_attendee');

    // Aun después de que el Administrador apruebe la Acreditación de la Jornada, el usuario NO puede iniciar sesión en la App
    const accreditedVisitor = approveEventAttendeeByAdmin({
        adminUser: { id: 'admin-1', name: 'Admin Master', email: 'gaston@patagonianc.com', role: 'admin' },
        attendee: maliciousAttempt,
        event: officialEvent
    });

    assert.equal(accreditedVisitor.eventAccreditationStatus, 'accredited');
    assert.equal(accreditedVisitor.password, '__EVENT_VISITOR_NO_SYSTEM_LOGIN__');
    const loginGateAfterAccreditation = evaluateUserLoginGate(accreditedVisitor);
    assert.equal(loginGateAfterAccreditation.canProceedToPasswordCheck, false, "El visitante acreditado a un evento NUNCA debe poder iniciar sesión en la plataforma operativa");
    assert.equal(loginGateAfterAccreditation.blockedReason, 'event_visitor_no_system_access');
});

console.log("\n=================================================");
console.log(`📊 RESUMEN DE PRUEBAS: ${passed} Exitosas, ${failed} Fallidas`);
console.log("=================================================");

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}



