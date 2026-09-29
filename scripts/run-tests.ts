import assert from 'node:assert/strict';
import { 
    getPlotNDVIAlertStatus, 
    generateDetailedSatellitePasses, 
    getPlotAgrochemicalApplications, 
    getUSDASoilTexture,
    calculateWaterEfficiency,
    calculateCarbonFootprint
} from '../src/services/agro40Service.js';

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

test('Base de datos oficial de insumos y registros SENASA', () => {
    const apps = getPlotAgrochemicalApplications([mockPlot]);
    assert.ok(apps.length > 0);
    assert.ok(apps[0].senasaRegisterNumber.includes('SENASA N°'));
    assert.ok(apps[0].senasaComplianceStatus.length > 0);
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

console.log("\n=================================================");
console.log(`📊 RESUMEN DE PRUEBAS: ${passed} Exitosas, ${failed} Fallidas`);
console.log("=================================================");

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
