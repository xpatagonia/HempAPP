import { jsPDF } from 'jspdf';
import {
  Location,
  StoragePoint,
  SeedBatch,
  Resource,
  Plot,
  Task,
  TrialRecord,
  HydricRecord,
  AgrochemicalApplication,
  User
} from '../../types';

export interface ProducerStepFieldInstruction {
  field: string;
  rule: string;
  example: string;
}

export interface ProducerOperationalStep {
  id: string;
  number: string;
  shortTitle: string;
  title: string;
  subtitle: string;
  primaryRoute: string;
  primaryCtaLabel: string;
  secondaryRoute?: string;
  secondaryCtaLabel?: string;
  status: 'completed' | 'in_progress' | 'pending';
  metricsSummary: string;
  liveReadinessNote: string;
  prerequisiteRule: string;
  producerViewSummary: string;
  adminViewSummary: string;
  stepByStepChecklist: string[];
  requiredFields: ProducerStepFieldInstruction[];
  blockingErrorsToAvoid: string[];
}

export interface ProducerReadinessReport {
  steps: ProducerOperationalStep[];
  completedCount: number;
  totalSteps: number;
  completionPct: number;
  nextRecommendedStep: ProducerOperationalStep;
  phytosanitaryChainReady: boolean;
  phytosanitaryChainSummary: {
    homologatedResourcesCount: number;
    resourcesWithDosageCount: number;
    phytoTasksCount: number;
    senasaBookEntriesCount: number;
  };
}

export interface ProducerVsAdminRow {
  moduleName: string;
  route: string;
  producerCapability: string;
  adminCapability: string;
  regulatoryRule: string;
}

export const PRODUCER_VS_ADMIN_MATRIX: ProducerVsAdminRow[] = [
  {
    moduleName: 'Mi Organización / Socios de Red',
    route: '/clients',
    producerCapability: 'Visualiza únicamente su propia entidad productiva ("Mi Organización"), su CUIT, responsable técnico y legajo.',
    adminCapability: 'Visualiza y administra el padrón completo de Socios de Red, asigna establecimientos y audita membresías.',
    regulatoryRule: 'Aislamiento estricto por clientId: un productor jamás ve datos de otros establecimientos.'
  },
  {
    moduleName: 'Campos & Sitios Productivos',
    route: '/locations',
    producerCapability: 'Registra y edita los campos propios de su organización con coordenadas GPS y polígono perimetral.',
    adminCapability: 'Supervisa todos los establecimientos del país, reasigna campos entre socios y audita georreferenciación.',
    regulatoryRule: 'Todo lote o almacén exige estar contenido dentro de un Campo Padre georreferenciado.'
  },
  {
    moduleName: 'Almacenes & Semillas INASE',
    route: '/storage',
    producerCapability: 'Gestiona sus galpones de custodia y visualiza las bolsas/lotes de semilla fiscalizada remitidos a su campo.',
    adminCapability: 'Administra el stock central, emite remitos de despacho de semilla INASE hacia los socios y audita mermas.',
    regulatoryRule: 'Trazabilidad de Rótulo Amarillo INASE y custodia física por galpón habilitado.'
  },
  {
    moduleName: 'Insumos, Inventario y Dosificación',
    route: '/resources',
    producerCapability: 'Acceso restringido al Administrador Central. El productor selecciona los insumos homologados directamente en sus Órdenes de Labor (/tasks) y usa la Calculadora de Dosis (/tools).',
    adminCapability: 'Exclusivo Administradores: homologa proveedores globales, da de alta el catálogo de insumos SENASA, controla stock y costos por unidad.',
    regulatoryRule: 'Ningún usuario no-administrador puede acceder a /resources; solo la Administración Central gestiona el alta e inventario maestro.'
  },
  {
    moduleName: 'Integridad & Licencias',
    route: '/integrity',
    producerCapability: 'Oculto y restringido para el productor y demás roles operativos.',
    adminCapability: 'Exclusivo Administradores y Super Admin: auditoría de integridad de base de datos, licencias regulatorias INASE/SENASA y diagnósticos.',
    regulatoryRule: 'Acceso blindado exclusivamente para Administradores Centrales (admin / super_admin).'
  },
  {
    moduleName: 'Parcelas de Cultivo',
    route: '/plots',
    producerCapability: 'Abre lotes dentro de sus campos, traza polígonos vectoriales (mínimo 3 vértices) y declara fecha de siembra.',
    adminCapability: 'Monitorea las 44+ parcelas de la red, emite alertas satelitales globales y reabre ciclos cerrados si se solicita.',
    regulatoryRule: 'Superficie geodésica en hectáreas obligatoria para el cálculo automático de dosis (Dosis/ha × Superficie).'
  },
  {
    moduleName: 'Labores Agrícolas & Parte de Campo',
    route: '/tasks',
    producerCapability: 'Emite órdenes de trabajo en sus lotes, selecciona insumos en stock, controla dosis/ha y registra clima de aplicación.',
    adminCapability: 'Asigna tareas a cualquier equipo, verifica cumplimiento y firma la Homologación Técnica de la labor.',
    regulatoryRule: 'Al ejecutar una labor fitosanitaria o de fertirriego, se descuenta el stock del galpón y se vuelca al Cuaderno SENASA.'
  },
  {
    moduleName: 'Cuaderno Fitosanitario SENASA',
    route: '/phytosanitary',
    producerCapability: 'Certifica aplicaciones seleccionando obligatoriamente una Orden de Labor de su parcela (insumo y dosis bloqueados).',
    adminCapability: 'Audita el libro oficial de toda la red, verifica períodos de carencia pre-cosecha y exporta actas de inspección.',
    regulatoryRule: 'Regla Estricta: El productor NO puede cargar productos libres fuera de una Orden de Labor registrada.'
  },
  {
    moduleName: 'Equipo, Accesos y Admin Server',
    route: '/users',
    producerCapability: 'Oculto para el productor. Puede invitar operarios de campo desde su estructura si tiene permisos delegados.',
    adminCapability: 'Aprueba solicitudes de alta pendientes, envía enlaces de activación de contraseña y simula roles en vivo.',
    regulatoryRule: 'Seguridad de alta: las cuentas nuevas ingresan en pending_approval hasta la aprobación del Administrador.'
  }
];

export function evaluateProducerSteps(params: {
  locations: Location[];
  storagePoints: StoragePoint[];
  seedBatches: SeedBatch[];
  resources: Resource[];
  plots: Plot[];
  tasks: Task[];
  trialRecords: TrialRecord[];
  hydricRecords: HydricRecord[];
  agrochemicalApplications: AgrochemicalApplication[];
}): ProducerReadinessReport {
  const {
    locations = [],
    storagePoints = [],
    seedBatches = [],
    resources = [],
    plots = [],
    tasks = [],
    trialRecords = [],
    hydricRecords = [],
    agrochemicalApplications = []
  } = params;

  // Paso 1: Campos y Georreferenciación
  const validGeoLocations = locations.filter(
    l => l.coordinates && typeof l.coordinates.lat === 'number' && typeof l.coordinates.lng === 'number'
  );
  const step1Status: 'completed' | 'in_progress' | 'pending' =
    validGeoLocations.length > 0 ? 'completed' : locations.length > 0 ? 'in_progress' : 'pending';

  // Paso 2: Almacenes y Semillas INASE
  const step2Status: 'completed' | 'in_progress' | 'pending' =
    storagePoints.length > 0 && seedBatches.length > 0
      ? 'completed'
      : storagePoints.length > 0 || seedBatches.length > 0
      ? 'in_progress'
      : 'pending';

  // Paso 3: Insumos, Proveedores y Control de Dosificación SENASA
  const physicalResources = resources.filter(r => r.type !== 'Labor');
  const homologatedResources = physicalResources.filter(
    r => Boolean(r.senasaRegisterNumber && r.supplierId && r.stock > 0)
  );
  const resourcesWithDosage = physicalResources.filter(
    r => typeof r.recommendedDosagePerHa === 'number' && r.recommendedDosagePerHa > 0
  );
  const step3Status: 'completed' | 'in_progress' | 'pending' =
    homologatedResources.length > 0 && resourcesWithDosage.length > 0
      ? 'completed'
      : physicalResources.length > 0
      ? 'in_progress'
      : 'pending';

  // Paso 4: Parcelas de Cultivo y Polígonos
  const plotsWithPolygon = plots.filter(
    p => p.surfaceArea && p.surfaceArea > 0 && p.varietyId && (!p.polygon || p.polygon.length >= 3)
  );
  const step4Status: 'completed' | 'in_progress' | 'pending' =
    plotsWithPolygon.length > 0 ? 'completed' : plots.length > 0 ? 'in_progress' : 'pending';

  // Paso 5: Órdenes de Labor, Clima y Monitoreo BBCH
  const tasksWithInputsOrWeather = tasks.filter(
    t => (t.appliedInputs && t.appliedInputs.length > 0) || Boolean(t.weather)
  );
  const step5Status: 'completed' | 'in_progress' | 'pending' =
    tasks.length > 0 && (trialRecords.length > 0 || hydricRecords.length > 0)
      ? 'completed'
      : tasks.length > 0 || trialRecords.length > 0
      ? 'in_progress'
      : 'pending';

  // Paso 6: Cuaderno Fitosanitario SENASA y Cierre de Cosecha
  const phytoTasks = tasks.filter(
    t =>
      t.syncWithPhytosanitary ||
      t.laborType === 'FITOSANITARIO' ||
      t.laborType === 'FERTIRRIEGO' ||
      (t.appliedInputs && t.appliedInputs.length > 0)
  );
  const linkedSenasaEntries = agrochemicalApplications.filter(a => Boolean(a.linkedTaskId || a.resourceId));
  const step6Status: 'completed' | 'in_progress' | 'pending' =
    linkedSenasaEntries.length > 0
      ? 'completed'
      : agrochemicalApplications.length > 0 || phytoTasks.length > 0
      ? 'in_progress'
      : 'pending';

  const steps: ProducerOperationalStep[] = [
    {
      id: 'step-01-locations',
      number: '01',
      shortTitle: 'Campos y GPS',
      title: '01. Alta de Campo Padre y Georreferenciación',
      subtitle: 'Definición del predio productivo, provincia, coordenadas GPS y perímetro exterior',
      primaryRoute: '/locations',
      primaryCtaLabel: 'Ir a Campos y Sitios',
      secondaryRoute: '/clients',
      secondaryCtaLabel: 'Ver Mi Organización',
      status: step1Status,
      metricsSummary: `${locations.length} campos · ${validGeoLocations.length} georreferenciados`,
      liveReadinessNote:
        step1Status === 'completed'
          ? `Tu establecimiento cuenta con ${validGeoLocations.length} campo(s) correctamente georreferenciado(s).`
          : 'Debés registrar al menos un Campo Padre con coordenadas GPS válidas antes de crear parcelas o almacenes.',
      prerequisiteRule: 'Es el primer paso obligatorio: toda Parcela, Almacén y Pluviómetro Satelital hereda la ubicación del Campo Padre.',
      producerViewSummary: 'El productor solo ve y edita los campos pertenecientes a su organización.',
      adminViewSummary: 'El administrador visualiza todos los campos de la red cooperativa y asigna el Socio titular.',
      stepByStepChecklist: [
        'Ingresá al módulo "Campos & Sitios" (/locations) y pulsá el botón "Nuevo Campo".',
        'Completá el nombre del establecimiento, provincia, localidad y hectariaje total del predio.',
        'Seleccioná en el mapa interactivo el punto GPS central o trazá el perímetro exterior del establecimiento.',
        'Designá el Responsable Técnico / Agrónomo del sitio y guardá el registro.'
      ],
      requiredFields: [
        { field: 'Nombre del Campo', rule: 'Identificador oficial del predio rural', example: 'Chacra Experimental VIRCH Lote Norte' },
        { field: 'Coordenadas GPS (Lat / Lng)', rule: 'Ubicación dentro de territorio argentino (-21° a -55°)', example: '-43.2581, -65.3094' },
        { field: 'Capacidad Hídrica / Fuente de Agua', rule: 'Define la fuente para el balance hídrico', example: 'Canal Principal VIRCH / Riego por Manto' }
      ],
      blockingErrorsToAvoid: [
        'Intentar crear una Parcela de Cultivo sin haber dado de alta primero el Campo Padre.',
        'Dejar las coordenadas en 0,0: esto impide que el Pluviómetro Satelital Open-Meteo descargue las lluvias del campo.'
      ]
    },
    {
      id: 'step-02-storage-seeds',
      number: '02',
      shortTitle: 'Almacén y Semilla',
      title: '02. Almacenes de Custodia y Recepción de Semilla INASE',
      subtitle: 'Habilitación del galpón en el establecimiento y verificación de lotes de semilla fiscalizada',
      primaryRoute: '/storage',
      primaryCtaLabel: 'Configurar Almacenes',
      secondaryRoute: '/seed-batches',
      secondaryCtaLabel: 'Ver Semillas INASE',
      status: step2Status,
      metricsSummary: `${storagePoints.length} almacenes · ${seedBatches.length} lotes de semilla`,
      liveReadinessNote:
        step2Status === 'completed'
          ? `Custodia activa: ${storagePoints.length} almacén(es) y ${seedBatches.length} lote(s) de semilla fiscalizada.`
          : 'Registrá tu Galpón de Custodia en /storage y verificá tus lotes de semilla en /seed-batches.',
      prerequisiteRule: 'Requiere un Campo Padre activo. Para sembrar una parcela con trazabilidad completa, el lote de semilla debe figurar en custodia.',
      producerViewSummary: 'Ve únicamente sus almacenes y los lotes de semilla asignados o despachados a su establecimiento.',
      adminViewSummary: 'Gestiona la cámara central de semillas, carga certificados INASE y emite remitos de traslado hacia los productores.',
      stepByStepChecklist: [
        'Abrí "Almacenes & Custodia" (/storage) y registrá el Galpón o Depósito de tu campo indicando temperatura y humedad de guarda.',
        'Ingresá a "Semillas & Cosecha" (/seed-batches) para verificar los lotes de semilla fiscalizada INASE recepcionados.',
        'Comprobá el código de trazabilidad del lote, poder germinativo (%), pureza y kilogramos disponibles en stock.',
        'Descargá o imprimí el Rótulo QR de custodia si necesitás identificar las bolsas físicas en el galpón.'
      ],
      requiredFields: [
        { field: 'Punto de Almacenamiento', rule: 'Vinculado al Campo Padre del productor', example: 'Galpón Semillas #1 - Trelew' },
        { field: 'Código de Lote INASE', rule: 'Identificador único del lote fiscalizado', example: 'INASE-2025-FN-008' },
        { field: 'Stock Disponible (kg)', rule: 'Cantidad real disponible para siembra', example: '450 kg' }
      ],
      blockingErrorsToAvoid: [
        'No verificar los kilogramos disponibles del lote de semilla antes de declarar la densidad de siembra (kg/ha) en la parcela.'
      ]
    },
    {
      id: 'step-03-resources-senasa',
      number: '03',
      shortTitle: 'Insumos y Dosis',
      title: '03. Alta de Insumos, Proveedor y Control de Dosificación SENASA',
      subtitle: 'Registro previo obligatorio en galpón con Ficha Técnica SENASA y umbrales de dosis por hectárea',
      primaryRoute: '/resources',
      primaryCtaLabel: 'Cargar Insumos e Inventario',
      secondaryRoute: '/tools',
      secondaryCtaLabel: 'Calculadora de Dosis',
      status: step3Status,
      metricsSummary: `${physicalResources.length} insumos · ${resourcesWithDosage.length} con dosis/ha · ${homologatedResources.length} SENASA`,
      liveReadinessNote:
        step3Status === 'completed'
          ? `Inventario listo: ${homologatedResources.length} insumo(s) homologado(s) con Ficha SENASA y control de dosis/ha.`
          : 'ATENCIÓN: Debés dar de alta tus insumos en /resources con Proveedor, Registro SENASA y Dosis Recomendada antes de poder aplicarlos en campo.',
      prerequisiteRule: 'REGLA DE ORO: El productor NO puede aplicar ningún insumo en una Orden de Labor ni en el Cuaderno Fitosanitario si no fue dado de alta previamente aquí.',
      producerViewSummary: 'Carga el stock de insumos de su galpón, seleccionando el Proveedor y definiendo la Ficha Técnica SENASA y la Dosificación por ha.',
      adminViewSummary: 'Administra el padrón de Proveedores (/suppliers) y audita que todos los insumos cumplan con registros SENASA vigentes.',
      stepByStepChecklist: [
        'Ingresá a "Insumos & Inventario" (/resources) y hacé clic en "Nuevo Insumo / Stock".',
        'Elegí la categoría (Bioinsumo, Fertilizante Foliar/Edáfico, Herbicida, Fungicida, Insecticida) y el Proveedor Homologado.',
        'Completá el bloque "Ficha Técnica SENASA": Principio Activo, Nº Registro SENASA, Lote de Fabricación, Vencimiento, Banda Toxicológica y Días de Carencia.',
        'Completá el bloque "Control de Dosificación y Caldo por Hectárea": Dosis Recomendada (ej. 2.5 L/ha), Dosis Mínima y Máxima Segura de marbete y Volumen de Caldo (L agua/ha).'
      ],
      requiredFields: [
        { field: 'Proveedor Vinculado', rule: 'Todo insumo debe referenciar un proveedor registrado', example: 'BioInsumos Patagonia S.A.' },
        { field: 'Nº Registro SENASA + Lote', rule: 'Obligatorio para bioinsumos, fitosanitarios y fertilizantes', example: 'SENASA-BIO-39481 · Lote TH-2026' },
        { field: 'Dosis Recomendada y Rango Seguro', rule: 'Controla el cálculo automático en la Orden de Labor', example: 'Recomendada: 2.0 L/ha (Mín: 1.5 - Máx: 2.5 L/ha)' }
      ],
      blockingErrorsToAvoid: [
        'Intentar ir directo al Cuaderno Fitosanitario o a Labores Agrícolas sin haber creado el producto en Insumos e Inventario.',
        'Cargar stock 0: el formulario de Orden de Labor bloqueará el insumo si el volumen total requerido (Dosis × Hectáreas) supera el stock en galpón.'
      ]
    },
    {
      id: 'step-04-plots-geodesy',
      number: '04',
      shortTitle: 'Parcelas y Polígonos',
      title: '04. Apertura de Parcelas de Cultivo y Trazado Geodésico',
      subtitle: 'Delimitación satelital del lote, asignación de variedad genética, superficie en ha y fecha de siembra',
      primaryRoute: '/plots',
      primaryCtaLabel: 'Gestionar Parcelas',
      secondaryRoute: '/calendar',
      secondaryCtaLabel: 'Ver Ciclo BBCH',
      status: step4Status,
      metricsSummary: `${plots.length} parcelas · ${plotsWithPolygon.length} con polígono y variedad`,
      liveReadinessNote:
        step4Status === 'completed'
          ? `Tenés ${plotsWithPolygon.length} parcela(s) configurada(s) con superficie geodésica y variedad asignada.`
          : 'Creá tus Parcelas de Cultivo en /plots vinculadas a tu Campo Padre y trazá su polígono satelital.',
      prerequisiteRule: 'Requiere un Campo Padre (Paso 01) y una Variedad del Banco Genético. Su superficie en hectáreas multiplica la dosis de cada insumo.',
      producerViewSummary: 'Crea y administra exclusivamente las parcelas ubicadas dentro de los campos de su organización.',
      adminViewSummary: 'Visualiza la totalidad de lotes de la red en la Torre de Control y audita el cumplimiento de THC < 1.0% (Ley 27.669).',
      stepByStepChecklist: [
        'Entrá en "Parcelas de Cultivo" (/plots) y pulsá "Nueva Parcela".',
        'Seleccioná el Campo Padre, el nombre identificador del lote, la Campaña Agrícola (ej. 2025/2026) y el propósito (Grano, Fibra, Cañamiza).',
        'Elegí la Variedad Genética y declarala junto con la Fecha de Siembra y la Densidad (kg/ha o plantas/m²).',
        'En el mapa satelital, marcá al menos 3 vértices para cerrar el polígono del lote y verificar las hectáreas reales.'
      ],
      requiredFields: [
        { field: 'Campo Padre + Polígono (≥ 3 vértices)', rule: 'La parcela debe estar geográficamente dentro del Campo Padre', example: 'Lote 1 Sur · 12.5 ha' },
        { field: 'Variedad + Fecha de Siembra', rule: 'Activa el reloj fenológico BBCH y el pluviómetro continuo', example: 'Fibranova · Siembra: 15/10/2025' },
        { field: 'Superficie (ha)', rule: 'Base de cálculo para insumos, huella hídrica y captura de CO2', example: '12.5 ha' }
      ],
      blockingErrorsToAvoid: [
        'Declarar superficie 0 ha: sin superficie válida, la plataforma no podrá calcular el volumen total de insumo (Dosis/ha × ha) en las órdenes de labor.',
        'Ubicar el pin fuera del Campo Padre o fuera de territorio argentino.'
      ]
    },
    {
      id: 'step-05-tasks-monitoring',
      number: '05',
      shortTitle: 'Labores y Monitoreo',
      title: '05. Nueva Orden de Labor (Insumo y Clima) y Monitoreo de Campo',
      subtitle: 'Prescripción operativa con descuento de stock, control meteorológico de pulverización y seguimiento BBCH',
      primaryRoute: '/tasks',
      primaryCtaLabel: 'Abrir Labores Agrícolas',
      secondaryRoute: '/trials-lite',
      secondaryCtaLabel: 'Monitoreo Rápido BBCH',
      status: step5Status,
      metricsSummary: `${tasks.length} labores (${tasksWithInputsOrWeather.length} con insumo/clima) · ${trialRecords.length} monitoreos`,
      liveReadinessNote:
        step5Status === 'completed'
          ? `Operación activa: ${tasks.length} orden(es) de labor y ${trialRecords.length} registro(s) de monitoreo fenológico.`
          : 'Emití tus Órdenes de Labor en /tasks (vinculando insumos y clima) y registrá el avance del cultivo en /trials-lite.',
      prerequisiteRule: 'Para aplicar cualquier producto fitosanitario o fertilizante, primero debés crear la Orden de Labor seleccionando el insumo del Paso 03.',
      producerViewSummary: 'Crea y ejecuta Órdenes de Labor en sus lotes, carga telemetría climática y registra altura, vigor y riegos.',
      adminViewSummary: 'Supervisa el cronograma de labores de toda la red, audita desvíos de dosis y firma la Homologación Técnica.',
      stepByStepChecklist: [
        'Ingresá a "Labores Agrícolas" (/tasks) y pulsá "Nueva Orden de Labor & Parte de Campo".',
        'Seleccioná la Parcela de Cultivo, el Tipo de Labor (ej. Pulverización Fitosanitaria o Fertirriego), Fecha, Operario y Maquinaria.',
        'En la pestaña "Insumos y Condiciones Climáticas", elegí el Insumo Homologado de tu galpón: el sistema autocompletará la Dosis Recomendada por ha y calculará el Volumen Total (Dosis × Superficie del lote).',
        'Verificá el semáforo de dosificación (que no supere la Dosis Máxima Segura de marbete ni el stock disponible) y completá Temperatura (°C), Humedad (%) y Viento (km/h ≤ 15 km/h).',
        'Activá la casilla "Volcar al Cuaderno Fitosanitario SENASA" y guardá la labor. Luego, registrá el estado fenológico en "Monitoreo Rápido" (/trials-lite).'
      ],
      requiredFields: [
        { field: 'Insumo del Inventario + Dosis/ha', rule: 'Calcula automáticamente Cantidad Total = Dosis/ha × Superficie Lote', example: 'Trichoderma 2.5 L/ha × 10 ha = 25 L totales' },
        { field: 'Clima de Aplicación (Temp, HR, Viento)', rule: 'Viento > 15 km/h emite alerta de deriva SENASA', example: '23 °C · 58% HR · Viento 11 km/h NE (Apto)' },
        { field: 'Medición Fenológica / Riego', rule: 'Actualiza vigor NDVI, altura de planta y huella hídrica', example: 'Estadio Vegetativo · Altura 85 cm · Riego 25 mm' }
      ],
      blockingErrorsToAvoid: [
        'Querer cargar un tratamiento en el Cuaderno Fitosanitario sin haber creado antes esta Orden de Labor en /tasks.',
        'Superar la Dosis Máxima Segura configurada en la ficha del insumo o pulverizar con viento superior a 15 km/h.'
      ]
    },
    {
      id: 'step-06-phytosanitary-harvest',
      number: '06',
      shortTitle: 'SENASA y Cosecha',
      title: '06. Cuaderno Fitosanitario SENASA, Ficha Guiada de Cosecha y Etiquetado ARICCAME',
      subtitle: 'Auditoría de carencia SENASA, Ficha Paso a Paso del Productor (Doble Fecha + Rindes), Acta de Cosecha y Etiquetas QR/GS1 ARICCAME',
      primaryRoute: '/phytosanitary',
      primaryCtaLabel: 'Abrir Cuaderno SENASA',
      secondaryRoute: '/harvest',
      secondaryCtaLabel: 'Abrir Ficha de Cosecha (/harvest)',
      status: step6Status,
      metricsSummary: `${agrochemicalApplications.length} asientos SENASA (${linkedSenasaEntries.length} trazados a labor/insumo)`,
      liveReadinessNote:
        step6Status === 'completed'
          ? `Trazabilidad SENASA al día: ${linkedSenasaEntries.length} aplicación(es) vinculada(s). Podés avanzar a la Ficha Paso a Paso de Cosecha en /harvest.`
          : 'Revisá o certificá tus aplicaciones en /phytosanitary y luego completá la Ficha Guiada de Cosecha en /harvest.',
      prerequisiteRule: 'BLOQUEO NORMATIVO: El productor solo puede registrar en el Cuaderno Fitosanitario aplicaciones que provengan de una Orden de Labor de su lote.',
      producerViewSummary: 'Visualiza el libro SENASA de sus parcelas, y en Cosecha & Cadena de Valor (/harvest) gestiona su Ficha Guiada de 5 Pasos: Destino Heredado (Grano/Fibra/Flores), Fecha Final de Cosecha (Variable 2), Gráficas de Rinde Estimado vs. Real, Acta Oficial de Cosecha y Etiquetas QR ARICCAME.',
      adminViewSummary: 'Audita la cadena completa (Proveedor → Semilla INASE → Orden de Labor → Cuaderno SENASA → Acta de Cosecha → DDJJ ARICCAME) en todos los establecimientos.',
      stepByStepChecklist: [
        'Abrí el "Cuaderno Fitosanitario" (/phytosanitary) y controlá el indicador de "Días de Carencia Pre-Cosecha" antes de programar el corte del lote.',
        'Ingresá a "Cosecha & Cadena de Valor" (/harvest) para abrir la Ficha Paso a Paso del Productor: en el Paso 1 el sistema trae automáticamente de la parcela si se cosecha Grano, Fibra, Flores/Biomasa o Doble Propósito.',
        'En el Paso 2 y Paso 3 de /harvest, fijá la Fecha Final de Cosecha en Campo (Variable 2 del Productor), registrá el acondicionamiento/pesaje y contrastá las Gráficas de Rinde Estimado vs. Rinde Real Obtenido.',
        'En el Paso 4 y Paso 5 de /harvest, descargá el Acta Oficial de Cosecha (PDF A4), generá los lotes cosechados y emití las Etiquetas QR + GS1 y la Declaración Jurada exigida por ARICCAME (Ley 27.669).'
      ],
      requiredFields: [
        { field: 'Orden de Labor Vinculada (Obligatorio)', rule: 'Bloquea la edición libre de producto para garantizar trazabilidad', example: 'Orden #TASK-104 · Pulverización Preventiva' },
        { field: 'Variable 2: Fecha Final Productor (/harvest)', rule: 'El productor fija la fecha real de trilla/corte frente al ciclo genético', example: '18/02/2026 · Humedad grano 8.6%' },
        { field: 'Acta de Cosecha + Etiqueta QR ARICCAME', rule: 'Emite el código de lote cosechado, etiqueta GS1 y DDJJ Ley 27.669', example: 'ACTA-COSECHA-2526 · Lote COS-GRANO-26' }
      ],
      blockingErrorsToAvoid: [
        'Intentar dar de alta Grano Cosechado o Fibra en "Semillas & Logística INASE" (/seed-batches): esa sección es exclusiva para Semillas Fiscalizadas de Siembra administradas por Central.',
        'Cosechar un lote antes de que se cumplan los Días de Carencia estipulados en el Cuaderno Fitosanitario.'
      ]
    }
  ];

  const completedCount = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length;
  const completionPct = Math.round((completedCount / totalSteps) * 100);
  const nextRecommendedStep =
    steps.find(s => s.status !== 'completed') || steps[steps.length - 1];

  const phytosanitaryChainReady =
    homologatedResources.length > 0 &&
    resourcesWithDosage.length > 0 &&
    (phytoTasks.length > 0 || linkedSenasaEntries.length > 0);

  return {
    steps,
    completedCount,
    totalSteps,
    completionPct,
    nextRecommendedStep,
    phytosanitaryChainReady,
    phytosanitaryChainSummary: {
      homologatedResourcesCount: homologatedResources.length,
      resourcesWithDosageCount: resourcesWithDosage.length,
      phytoTasksCount: phytoTasks.length,
      senasaBookEntriesCount: linkedSenasaEntries.length
    }
  };
}

export function getContextualScreenGuide(
  pathname: string,
  report: ProducerReadinessReport
): ProducerOperationalStep {
  const clean = pathname.toLowerCase();
  if (clean.startsWith('/locations') || clean.startsWith('/clients')) {
    return report.steps[0];
  }
  if (clean.startsWith('/storage') || clean.startsWith('/seed-batches')) {
    return report.steps[1];
  }
  if (clean.startsWith('/resources') || clean.startsWith('/suppliers') || clean.startsWith('/tools')) {
    return report.steps[2];
  }
  if (clean.startsWith('/plots') || clean.startsWith('/campaigns') || clean.startsWith('/varieties')) {
    return report.steps[3];
  }
  if (clean.startsWith('/tasks') || clean.startsWith('/trials-lite') || clean.startsWith('/calendar')) {
    return report.steps[4];
  }
  if (clean.startsWith('/phytosanitary') || clean.startsWith('/integrity') || clean.startsWith('/documents')) {
    return report.steps[5];
  }
  return report.nextRecommendedStep;
}

export function exportProducerManualPDF(params: {
  user: User | null;
  organizationName: string;
  report: ProducerReadinessReport;
}): void {
  const { user, organizationName, report } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 16;

  const addHeader = (pageNumber: number) => {
    doc.setFillColor(12, 45, 30);
    doc.rect(0, 0, pageWidth, 26, 'F');
    doc.setTextColor(221, 219, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('PATAGONIANC LTDA COOPERATIVA DE TRABAJO · CUIT 30-71816113-0 · HEMPC NUCLEUS', margin, 9);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.text('MANUAL OFICIAL DE PROCEDIMIENTOS Y CARGA DEL PRODUCTOR', margin, 17);
    doc.setFontSize(8);
    doc.setTextColor(167, 243, 208);
    doc.text(
      `Trazabilidad GACP · INASE · SENASA · Ley 27.669 | Página ${pageNumber}`,
      margin,
      22.5
    );
  };

  let currentPage = 1;
  addHeader(currentPage);
  y = 33;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 16) {
      doc.addPage();
      currentPage++;
      addHeader(currentPage);
      y = 33;
    }
  };

  // Resumen de Establecimiento y Diagnóstico en Vivo
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 2, 2, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`Establecimiento / Organización: ${organizationName || 'Socio Productor HempC'}`, margin + 4, y + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Usuario: ${user?.name || 'Productor'} (${user?.email || 'sin-email'}) · Rol: ${user?.role || 'Socio_Productor'}`,
    margin + 4,
    y + 12.5
  );
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text(
    `Estado Operativo Actual: ${report.completedCount}/${report.totalSteps} Eslabones Completados (${report.completionPct}%) · Próximo Paso: ${report.nextRecommendedStep.shortTitle}`,
    margin + 4,
    y + 18.5
  );
  y += 28;

  // Regla de Oro Fitosanitaria
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 2, 2, 'F');
  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('REGLA OBLIGATORIA DE TRAZABILIDAD FITOSANITARIA Y DOSIFICACIÓN (SENASA):', margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const goldenRuleLines = doc.splitTextToSize(
    '1º Dar de alta el Insumo en "Insumos e Inventario" (/resources) vinculado a su Proveedor, con Ficha Técnica SENASA y Dosis Recomendada/Máxima por ha. 2º Emitir la "Nueva Orden de Labor" (/tasks) seleccionando dicho insumo y registrando el clima. 3º El registro impacta automáticamente en el "Cuaderno Fitosanitario SENASA" (/phytosanitary). El productor NO puede aplicar insumos fuera de su Lista de Tareas de Campo.',
    pageWidth - margin * 2 - 8
  );
  doc.text(goldenRuleLines, margin + 4, y + 11);
  y += 24;

  // Detalle de los 6 Eslabones Operativos
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. LOS 6 ESLABONES OBLIGATORIOS DE CARGA DEL PRODUCTOR', margin, y);
  y += 6;

  for (const step of report.steps) {
    ensureSpace(48);
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 43, 2, 2, 'FD');

    const statusLabel =
      step.status === 'completed'
        ? 'COMPLETADO'
        : step.status === 'in_progress'
        ? 'EN CURSO'
        : 'PENDIENTE';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(12, 45, 30);
    doc.text(`${step.title}  [${statusLabel}]`, margin + 4, y + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Ruta en plataforma: ${step.primaryRoute}  |  Estado actual: ${step.metricsSummary}`, margin + 4, y + 11.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Pasos de carga:', margin + 4, y + 16.5);

    doc.setFont('helvetica', 'normal');
    let lineY = y + 21;
    step.stepByStepChecklist.slice(0, 3).forEach((item, idx) => {
      const wrapped = doc.splitTextToSize(`${idx + 1}. ${item}`, pageWidth - margin * 2 - 8);
      doc.text(wrapped[0], margin + 4, lineY);
      lineY += 4.5;
    });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    const errLine = doc.splitTextToSize(
      `Evitar bloqueo: ${step.blockingErrorsToAvoid[0]}`,
      pageWidth - margin * 2 - 8
    );
    doc.text(errLine[0], margin + 4, y + 39);

    y += 47;
  }

  // Matriz Productor vs Administrador
  ensureSpace(65);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. DIFERENCIAS DE VISTA Y PERMISOS: PRODUCTOR VS. ADMINISTRADOR', margin, y);
  y += 6;

  for (const row of PRODUCER_VS_ADMIN_MATRIX) {
    ensureSpace(22);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 19, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${row.moduleName} (${row.route})`, margin + 3, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(5, 150, 105);
    const prodText = doc.splitTextToSize(`Productor: ${row.producerCapability}`, pageWidth - margin * 2 - 6);
    doc.text(prodText[0], margin + 3, y + 10.5);

    doc.setTextColor(71, 85, 105);
    const admText = doc.splitTextToSize(`Administrador: ${row.adminCapability}`, pageWidth - margin * 2 - 6);
    doc.text(admText[0], margin + 3, y + 15.5);

    y += 21.5;
  }

  doc.save('Manual_Procedimientos_Productor_HempC_Nucleus.pdf');
}
