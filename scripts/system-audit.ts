import { 
  DEMO_LOCATIONS, DEMO_PLOTS, DEMO_PROJECTS, DEMO_VARIETIES, 
  DEMO_USERS_LIST, DEMO_TRIALS, DEMO_TASKS, DEMO_STORAGE_POINTS, 
  DEMO_SUPPLIERS, DEMO_HYDRIC 
} from '../src/data/initialDemoData';

interface AuditResult {
  category: string;
  check: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  details?: string;
}

const results: AuditResult[] = [];

function check(category: string, name: string, condition: boolean, failMsg?: string, isWarning = false) {
  if (condition) {
    results.push({ category, check: name, status: 'PASS' });
  } else {
    results.push({ 
      category, 
      check: name, 
      status: isWarning ? 'WARN' : 'FAIL', 
      details: failMsg 
    });
  }
}

console.log('======================================================');
console.log('🔍 INICIANDO AUDITORÍA INTEGRAL DEL SISTEMA HEMP-NET');
console.log('======================================================\n');

// 1. INTEGRIDAD DE ESTABLECIMIENTOS & SITIOS (LOCATIONS)
DEMO_LOCATIONS.forEach(loc => {
  check(
    'Establecimientos',
    `Coordenadas válidas en "${loc.name}"`,
    Boolean(loc.coordinates && !isNaN(loc.coordinates.lat) && !isNaN(loc.coordinates.lng) && loc.coordinates.lat < 0),
    `Lat/Lng inválidas o fuera de hemisferio sur: ${JSON.stringify(loc.coordinates)}`
  );

  if (loc.polygon && loc.polygon.length > 0) {
    check(
      'Geodesia Predio',
      `Polígono perimetral de predio "${loc.name}"`,
      loc.polygon.length >= 3 && loc.polygon.every(pt => !isNaN(pt.lat) && !isNaN(pt.lng)),
      `El polígono tiene menos de 3 vértices o contiene NaN`
    );
  }

  if (loc.sowingDeclarationPolygon && loc.sowingDeclarationPolygon.length > 0) {
    check(
      'Geodesia DDJJ',
      `Polígono DDJJ Siembra de "${loc.name}"`,
      loc.sowingDeclarationPolygon.length >= 3 && loc.sowingDeclarationPolygon.every(pt => !isNaN(pt.lat) && !isNaN(pt.lng)),
      `El polígono DDJJ contiene vértices inválidos`
    );
  }
});

// 2. INTEGRIDAD RELACIONAL DE UNIDADES PRODUCTIVAS (PLOTS)
const locationIds = new Set(DEMO_LOCATIONS.map(l => l.id));
const varietyIds = new Set(DEMO_VARIETIES.map(v => v.id));
const projectIds = new Set(DEMO_PROJECTS.map(p => p.id));

DEMO_PLOTS.forEach(plot => {
  check(
    'Parcelas / Lotes',
    `Vínculo con Campo existente en "${plot.name}"`,
    locationIds.has(plot.locationId),
    `LocationId "${plot.locationId}" no existe en DEMO_LOCATIONS`
  );

  check(
    'Parcelas / Lotes',
    `Vínculo con Variedad genética en "${plot.name}"`,
    varietyIds.has(plot.varietyId),
    `VarietyId "${plot.varietyId}" no existe en DEMO_VARIETIES`
  );

  if (plot.projectId) {
    check(
      'Parcelas / Lotes',
      `Vínculo con Proyecto / Programa en "${plot.name}" (${plot.projectId})`,
      projectIds.has(plot.projectId),
      `ProjectId "${plot.projectId}" no está dado de alta en DEMO_PROJECTS`,
      true
    );
  }

  check(
    'Superficie y Densidad',
    `Área positiva en "${plot.name}"`,
    typeof plot.surfaceArea === 'number' && plot.surfaceArea > 0,
    `Superficie <= 0 o nula: ${plot.surfaceArea}`
  );

  if (plot.polygon && plot.polygon.length > 0) {
    check(
      'Geodesia Parcelas',
      `Vértices del lote "${plot.name}"`,
      plot.polygon.length >= 3 && plot.polygon.every(pt => !isNaN(pt.lat) && !isNaN(pt.lng)),
      `El polígono del lote tiene menos de 3 vértices o contiene NaN`
    );
  }
});

// 3. ENSAYOS Y REGISTROS DE MONITOREO (TRIALS)
const plotIds = new Set(DEMO_PLOTS.map(p => p.id));
DEMO_TRIALS.forEach(trial => {
  check(
    'Ensayos I+D',
    `Trial "${trial.id}" vinculado a Parcela existente`,
    plotIds.has(trial.plotId),
    `PlotId "${trial.plotId}" no existe`
  );

  if (trial.plantHeight) {
    check(
      'Outliers de Campo',
      `Altura biológicamente plausible en "${trial.id}" (${trial.plantHeight} cm)`,
      trial.plantHeight > 0 && trial.plantHeight <= 500,
      `Altura anómala: ${trial.plantHeight} cm`,
      true
    );
  }
});

// 4. REGISTROS HÍDRICOS (HYDRIC)
DEMO_HYDRIC.forEach(rec => {
  check(
    'Manejo Hídrico',
    `Registro hídrico "${rec.id}" vinculado a Parcela existente`,
    plotIds.has(rec.plotId),
    `PlotId "${rec.plotId}" no existe`
  );
});

// 5. LABORES AGRONÓMICAS (TASKS)
DEMO_TASKS.forEach(task => {
  if (task.plotId) {
    check(
      'Labores',
      `Labor "${task.title}" vinculada a Parcela`,
      plotIds.has(task.plotId),
      `PlotId "${task.plotId}" no existe`,
      true
    );
  }
});

// 6. CAMPAÑAS Y COBERTURA TEMPORAL
const validCampaigns = ['2024/2025', '2025/2026', '2026/2027', '2027/2028'];
DEMO_LOCATIONS.forEach(loc => {
  if (loc.activeCampaigns) {
    const allValid = loc.activeCampaigns.every(c => validCampaigns.includes(c));
    check(
      'Campañas',
      `Campañas asignadas a "${loc.name}" dentro del estándar`,
      allValid,
      `Campañas no estándar: ${loc.activeCampaigns?.join(', ')}`
    );
  }
});

// IMPRIMIR RESULTADOS
const passCount = results.filter(r => r.status === 'PASS').length;
const warnCount = results.filter(r => r.status === 'WARN').length;
const failCount = results.filter(r => r.status === 'FAIL').length;

results.forEach(r => {
  const icon = r.status === 'PASS' ? '✅' : (r.status === 'WARN' ? '⚠️ ' : '❌');
  if (r.status !== 'PASS') {
    console.log(`${icon} [${r.category}] ${r.check}: ${r.details || 'Fallo detectado'}`);
  }
});

console.log('\n======================================================');
console.log(`📊 TOTAL AUDITORÍAS: ${results.length}`);
console.log(`   ✅ Correctas: ${passCount}`);
console.log(`   ⚠️  Advertencias menores: ${warnCount}`);
console.log(`   ❌ Inconsistencias críticas: ${failCount}`);
console.log('======================================================');
