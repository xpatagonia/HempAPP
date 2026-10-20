import {
  User, Location, Plot, Variety, TrialRecord, Project, Task, HydricRecord,
  StoragePoint, Supplier, SeedBatch, SeedMovement, SupplierLotInspection, Resource,
  OperationalExpense, Client
} from '../../types';

export const ADMIN_USER: User = {
  "id": "user-admin-hempc",
  "name": "Administración Central HempC",
  "email": "admin@hempc.com.ar",
  "role": "super_admin",
  "password": "admin",
  "memberType": "Cooperativa_Central",
  "organizationName": "Red Cooperativa Nucleus",
  "jobTitle": "Administrador General de la Plataforma",
  "phone": "+54 9 11 4567-8900",
  "isNetworkMember": true
};

export const DEMO_USER: User = {
  "id": "user-admin-nucleus",
  "name": "Ing. Gastón Barea (Nucleus)",
  "email": "gaston.barea.moreno@gmail.com",
  "role": "super_admin",
  "memberType": "Cooperativa_Central",
  "organizationName": "Red Cooperativa Nucleus",
  "jobTitle": "Director Agronómico & Trazabilidad Central",
  "phone": "+54 9 11 4567-8900",
  "isNetworkMember": true
};

export const DEMO_USERS_LIST: User[] = [
  {
    "id": "user-admin-hempc",
    "name": "Administración Central HempC",
    "email": "admin@hempc.com.ar",
    "role": "super_admin",
    "password": "admin",
    "memberType": "Cooperativa_Central",
    "organizationName": "Red Cooperativa Nucleus",
    "jobTitle": "Administrador General de la Plataforma",
    "phone": "+54 9 11 4567-8900",
    "isNetworkMember": true
  },
  {
    "id": "user-admin-nucleus",
    "name": "Ing. Gastón Barea (Nucleus)",
    "email": "gaston.barea.moreno@gmail.com",
    "role": "super_admin",
    "memberType": "Cooperativa_Central",
    "organizationName": "Red Cooperativa Nucleus",
    "jobTitle": "Director Agronómico & Trazabilidad Central",
    "phone": "+54 9 11 4567-8900",
    "isNetworkMember": true
  },
  {
    "id": "user-admin-xpatagonia",
    "name": "Ing. Gastón Barea (xpatagonia)",
    "email": "xpatagonia.com@gmail.com",
    "role": "super_admin",
    "password": "admin",
    "memberType": "Cooperativa_Central",
    "organizationName": "Red Cooperativa Nucleus",
    "jobTitle": "Director Agronómico & Trazabilidad Central",
    "phone": "+54 9 11 4567-8900",
    "isNetworkMember": true
  },
  {
    "id": "user-admin-secondary",
    "name": "Administración Contable HempC",
    "email": "finanzas@hempc.com.ar",
    "role": "admin",
    "memberType": "Cooperativa_Central",
    "organizationName": "Red Cooperativa Nucleus",
    "jobTitle": "Auditor Financiero & Liquidaciones",
    "phone": "+54 9 11 4567-8901",
    "isNetworkMember": true
  },
  {
    "id": "user-socio-idevi",
    "name": "Ing. Lucas Varela (Socio IDEVI)",
    "email": "varela@idevi-canamo.org.ar",
    "role": "client",
    "structureRole": "propietario",
    "clientId": "client-idevi",
    "memberType": "Socio_Productor",
    "organizationName": "Asociación IDEVI Cáñamo",
    "jobTitle": "Productor Asociado Valle Inferior",
    "phone": "+54 9 2920 654321",
    "isNetworkMember": true,
    "assignedPlotIds": [
      "plot-gamma-patagonia"
    ]
  },
  {
    "id": "user-operario-idevi",
    "name": "Facundo Morales (Tractorista IDEVI)",
    "email": "morales@idevi-canamo.org.ar",
    "role": "technician",
    "structureRole": "operario",
    "clientId": "client-idevi",
    "memberType": "Socio_Productor",
    "organizationName": "Asociación IDEVI Cáñamo",
    "jobTitle": "Operario de Riego y Maquinaria",
    "phone": "+54 9 2920 441199",
    "isNetworkMember": true,
    "assignedPlotIds": [
      "plot-gamma-patagonia"
    ]
  }
];

export const DEMO_CLIENTS: Client[] = [
  {
    "id": "client-idevi",
    "name": "Asociación Productores IDEVI",
    "type": "Productor Mediano (5-15 ha)",
    "contactName": "Ing. Lucas Varela",
    "contactPhone": "+54 9 2920 654321",
    "email": "varela@idevi-canamo.org.ar",
    "address": "Camino 4 Valle Inferior, Viedma, Río Negro",
    "totalHectares": 45,
    "isNetworkMember": true,
    "membershipLevel": "Activo",
    "contractDate": "2024-09-01",
    "cuit": "30-71882341-3",
    "relatedUserId": "user-socio-idevi",
    "coordinates": {
      "lat": -40.7812,
      "lng": -63.0245
    },
    "teamUserIds": [
      "user-socio-idevi",
      "user-operario-idevi"
    ]
  }
];

export const DEMO_VARIETIES: Variety[] = [
  {
    "id": "var-grano-alimento",
    "supplierId": "sup-1",
    "name": "Variedad (Grano / Alimento)",
    "usage": "Grano",
    "cycleDays": 125,
    "expectedThc": 0.10,
    "knowledgeBase": "Variedad homologada en el Anexo II Protocolo Técnico de Siembra Patagonian C Ltda. Dosis 50 kg/Ha, profundidad 1.5-2.0 cm (máx. 2.5 cm), distancia 15-20 cm, ventana 1 Nov a 15 Dic. Trilla con 75-80% de grano maduro y 12-15% humedad.",
    "inaseRncNumber": "INASE-RNC-9941/24",
    "oecdListing": true,
    "breederName": "Patagonian C Ltda. / Red Oficial",
    "breederCountry": "Argentina / Chubut",
    "chemotype": "Fibra/Grano (<0.3% THC)",
    "expectedCbg": 0.15,
    "expectedCbd": 1.20,
    "photoperiodType": "Monoica",
    "gddRequirement": 1800,
    "waterNeedMm": 450,
    "optimalSowingDensityKgHa": 50,
    "thousandSeedWeightGr": 18.0,
    "expectedFiberYieldTnHa": 5.5,
    "expectedGrainYieldKgHa": 1600,
    "thcLabCertificate": "HPLC-LAB-ARICCAME-2025-012",
    "thcLabName": "Laboratorio Agronómico Patagonian C Ltda."
  },
  {
    "id": "var-multiproposito-biomasa",
    "supplierId": "sup-2",
    "name": "Variedad (Multipropósito / Biomasa)",
    "usage": "Dual",
    "cycleDays": 145,
    "expectedThc": 0.15,
    "knowledgeBase": "Variedad homologada en el Anexo II Protocolo Técnico de Siembra Patagonian C Ltda. Dosis 50 kg/Ha, profundidad 1.5-2.0 cm (máx. 2.5 cm), distancia 15-20 cm. Destino doble propósito grano y biomasa industrial con enfardado post-trilla.",
    "inaseRncNumber": "INASE-RNC-9942/24",
    "oecdListing": true,
    "breederName": "Patagonian C Ltda. / Red Oficial",
    "breederCountry": "Argentina / Chubut",
    "chemotype": "Fibra/Grano (<0.3% THC)",
    "expectedCbg": 0.35,
    "expectedCbd": 1.80,
    "photoperiodType": "Monoica",
    "gddRequirement": 2050,
    "waterNeedMm": 520,
    "optimalSowingDensityKgHa": 50,
    "thousandSeedWeightGr": 18.5,
    "expectedFiberYieldTnHa": 9.2,
    "expectedGrainYieldKgHa": 1300,
    "thcLabCertificate": "HPLC-LAB-ARICCAME-2025-013",
    "thcLabName": "Laboratorio Agronómico Patagonian C Ltda."
  },
  {
    "id": "var-uso31",
    "supplierId": "sup-1",
    "name": "USO 31 (Fibra Industrial)",
    "usage": "Fibra",
    "cycleDays": 115,
    "expectedThc": 0.12,
    "knowledgeBase": "Genética ucraniana monoica de alto porte (hasta 3.2m), excelente resistencia a déficit hídrico y rendimiento de fibra técnica superior a 8.5 tn/ha.",
    "inaseRncNumber": "INASE-RNC-8492/23",
    "oecdListing": true,
    "breederName": "Glukhov Institute of Bast Crops (Ucrania) / BioGenética",
    "breederCountry": "Ucrania",
    "chemotype": "Tipo V (Fibra industrial sin cannabinoides)",
    "expectedCbg": 0.15,
    "expectedCbd": 0.85,
    "photoperiodType": "Monoica",
    "gddRequirement": 1850,
    "waterNeedMm": 480,
    "optimalSowingDensityKgHa": 45,
    "thousandSeedWeightGr": 16.5,
    "expectedFiberYieldTnHa": 8.5,
    "expectedGrainYieldKgHa": 650,
    "thcLabCertificate": "HPLC-LAB-INTA-2025-089",
    "thcLabName": "Laboratorio de Cromatografía INTA / Cannatech"
  },
  {
    "id": "var-santhica27",
    "supplierId": "sup-1",
    "name": "Santhica 27 (CBG / Fibra)",
    "usage": "Fibra",
    "cycleDays": 120,
    "expectedThc": 0.04,
    "knowledgeBase": "Variedad francesa monoica libre de THC (<0.05%), alto contenido de CBG natural y fibra celulósica de alta pureza.",
    "inaseRncNumber": "INASE-RNC-9120/24",
    "oecdListing": true,
    "breederName": "CCPSC / Hemp-it ADN (Francia)",
    "breederCountry": "Francia",
    "chemotype": "Tipo IV (CBG puro)",
    "expectedCbg": 2.8,
    "expectedCbd": 0.05,
    "photoperiodType": "Monoica",
    "gddRequirement": 1920,
    "waterNeedMm": 520,
    "optimalSowingDensityKgHa": 50,
    "thousandSeedWeightGr": 15.2,
    "expectedFiberYieldTnHa": 7.8,
    "expectedGrainYieldKgHa": 800,
    "thcLabCertificate": "HPLC-LAB-EU-GACP-4412",
    "thcLabName": "Eurofins Agroscience Services"
  },
  {
    "id": "var-futura75",
    "supplierId": "sup-2",
    "name": "Futura 75 (Doble Propósito)",
    "usage": "Dual",
    "cycleDays": 130,
    "expectedThc": 0.18,
    "knowledgeBase": "Genética dual vigorosa con potencial de cosecha de grano alimenticio (>1400 kg/ha) y rastrojo para bioenergía/biocompuestos.",
    "inaseRncNumber": "INASE-RNC-7734/22",
    "oecdListing": true,
    "breederName": "Fédération Nationale des Producteurs de Chanvre (FNPC)",
    "breederCountry": "Francia",
    "chemotype": "Fibra/Grano (<0.3% THC)",
    "expectedCbg": 0.4,
    "expectedCbd": 1.8,
    "photoperiodType": "Monoica",
    "gddRequirement": 2100,
    "waterNeedMm": 560,
    "optimalSowingDensityKgHa": 38,
    "thousandSeedWeightGr": 18,
    "expectedFiberYieldTnHa": 6.8,
    "expectedGrainYieldKgHa": 1450,
    "thcLabCertificate": "HPLC-CANNATECH-2025-102",
    "thcLabName": "Laboratorios Cannatech Innovación"
  },
  {
    "id": "var-finola",
    "supplierId": "sup-2",
    "name": "Finola (Semilla & Aceite)",
    "usage": "Grano",
    "cycleDays": 95,
    "expectedThc": 0.15,
    "knowledgeBase": "Variedad autofloreciente dioica de ciclo corto, porte bajo (1.2m) ideal para cosecha directa con cosechadora de granos convencional.",
    "inaseRncNumber": "INASE-RNC-8012/23",
    "oecdListing": true,
    "breederName": "Finola Oy (Finlandia)",
    "breederCountry": "Finlandia",
    "chemotype": "Fibra/Grano (<0.3% THC)",
    "expectedCbg": 0.2,
    "expectedCbd": 1.2,
    "photoperiodType": "Dioica",
    "gddRequirement": 1450,
    "waterNeedMm": 380,
    "optimalSowingDensityKgHa": 32,
    "thousandSeedWeightGr": 13.5,
    "expectedFiberYieldTnHa": 3.2,
    "expectedGrainYieldKgHa": 1650,
    "thcLabCertificate": "HPLC-FIN-OECD-9031",
    "thcLabName": "Luke Natural Resources Institute Finland"
  }
];

export const DEMO_LOCATIONS: Location[] = [
  {
    "id": "loc-patagonia",
    "name": "Valle Inferior Río Negro (IDEVI)",
    "siteType": "Chacra Intensiva",
    "status": "Activo",
    "activeCampaigns": [
      "2025/2026",
      "2026/2027"
    ],
    "province": "Río Negro",
    "city": "Viedma",
    "address": "Camino 4 IDEVI Parcela 104",
    "soilType": "Franco-Arenoso aluvial fértil",
    "climate": "Semiárido de valle irrigado patagónico",
    "responsiblePerson": "Ing. Gastón Barea",
    "coordinates": {
      "lat": -40.7831,
      "lng": -63.0024
    },
    "capacityHa": 60,
    "irrigationSystem": "Riego por Gravedad y Canales Matriz",
    "ariccameLicenseNumber": "ARICCAME-DISP-2025-00049-APN",
    "ariccameLicenseCategory": "Cultivo e Industrialización (Fibra y Grano)",
    "ariccameLicenseStatus": "Vigente",
    "renspaNumber": "16.012.0.00514/02",
    "cadastralId": "Parcela 104 - Colonia IDEVI",
    "landTenureType": "Propiedad",
    "securityMeasures": [
      "Cerco Perimetral Reglamentario",
      "Control de Acceso / Libro de Guardia",
      "Monitoreo CCTV / Vigilancia"
    ],
    "sowingDeclarationId": "DDJJ-SIEMBRA-2025-RN-003",
    "sowingDeclarationDate": "2025-10-20",
    "sowingDeclarationHa": 30,
    "polygon": [
      {
        "lat": -40.776,
        "lng": -63.012
      },
      {
        "lat": -40.7765,
        "lng": -62.992
      },
      {
        "lat": -40.7895,
        "lng": -62.9925
      },
      {
        "lat": -40.789,
        "lng": -63.0125
      }
    ],
    "sowingDeclarationPolygon": [
      {
        "lat": -40.7785,
        "lng": -63.009
      },
      {
        "lat": -40.779,
        "lng": -62.995
      },
      {
        "lat": -40.787,
        "lng": -62.9955
      },
      {
        "lat": -40.7865,
        "lng": -63.0095
      }
    ],
    "responsibleIds": [
      "user-admin-nucleus",
      "user-admin-xpatagonia",
      "user-socio-idevi"
    ]
  }
];

export const DEMO_PLOTS: Plot[] = [
  {
    "id": "plot-gamma-patagonia",
    "locationId": "loc-patagonia",
    "projectId": "proj-patagonia-dual",
    "varietyId": "var-futura75",
    "name": "Lote Gamma - Transición Hídrica Patagonia",
    "seedBatchId": "batch-futura-2025",
    "type": "Ensayo",
    "surfaceArea": 22,
    "surfaceUnit": "ha",
    "density": 50,
    "status": "Activa",
    "campaign": "2025/2026",
    "activeCampaigns": [
      "2025/2026",
      "2026/2027"
    ],
    "sowingDate": "2025-11-05",
    "ownerName": "Asociación IDEVI Cáñamo",
    "irrigationType": "Gravedad Presurizada",
    "coordinates": {
      "lat": -40.7831,
      "lng": -63.0024
    },
    "polygon": [
      {
        "lat": -40.779,
        "lng": -63.008
      },
      {
        "lat": -40.7795,
        "lng": -62.996
      },
      {
        "lat": -40.7865,
        "lng": -62.9965
      },
      {
        "lat": -40.786,
        "lng": -63.0085
      }
    ],
    "observations": "Cálculo de eficiencia de uso de agua (WUE) comparativa vs alfalfa bajo riego de cuenca.",
    "currentPhenologicalStage": "BBCH_10_19",
    "accumulatedGdd": 340,
    "lastStageUpdateDate": "2025-11-28",
    "stageHistory": [
      {
        "stageId": "BBCH_00_09",
        "date": "2025-11-12",
        "certifiedBy": "Ing. Lucas Varela"
      },
      {
        "stageId": "BBCH_10_19",
        "date": "2025-11-28",
        "certifiedBy": "Ing. Lucas Varela"
      }
    ]
  }
];

export const DEMO_PROJECTS: Project[] = [
  {
    "id": "proj-patagonia-dual",
    "name": "Desarrollo Dual Patagonia & Valles Irrigados 2025/26",
    "description": "Ensayos de adaptación ecofisiológica bajo riego en el Valle Inferior del Río Negro (IDEVI) para grano y fibra corta.",
    "status": "En Curso",
    "startDate": "2025-10-15",
    "campaign": "2025/2026",
    "objectiveType": "Fibra Industrial",
    "targetYieldTn": 320,
    "budgetUsd": 110000,
    "directorId": "user-admin-nucleus"
  }
];

export const DEMO_TRIALS: TrialRecord[] = [
  {
    "id": "trial-pat-01",
    "plotId": "plot-gamma-patagonia",
    "date": "2025-11-20",
    "time": "10:00",
    "stage": "Vegetativo",
    "temperature": 24,
    "humidity": 55,
    "plantHeight": 18,
    "plantsPerMeter": 45,
    "uniformity": 9,
    "vigor": 9,
    "lodging": 1,
    "birdDamage": 1,
    "diseasesScore": 1,
    "pestsScore": 1,
    "harvestPlantCount": 0,
    "seedYield": 0,
    "seedQualityGermination": 94,
    "seedQualityNonConformity": 0,
    "stemWeight": 0,
    "floweringDate": "",
    "harvestDate": ""
  },
  {
    "id": "trial-pat-02",
    "plotId": "plot-gamma-patagonia",
    "date": "2025-12-15",
    "time": "11:00",
    "stage": "Floración",
    "temperature": 27,
    "humidity": 46,
    "plantHeight": 85,
    "plantsPerMeter": 44,
    "uniformity": 9,
    "vigor": 9,
    "lodging": 1,
    "birdDamage": 1,
    "diseasesScore": 1,
    "pestsScore": 1,
    "harvestPlantCount": 0,
    "seedYield": 0,
    "seedQualityGermination": 94,
    "seedQualityNonConformity": 0,
    "stemWeight": 0,
    "floweringDate": "2025-12-10",
    "harvestDate": ""
  }
];

export const DEMO_HYDRIC: HydricRecord[] = [
  {
    "id": "hydric-pat-01",
    "locationId": "loc-patagonia",
    "plotId": "plot-gamma-patagonia",
    "date": "2025-11-15",
    "time": "08:00",
    "endTime": "14:00",
    "type": "Riego",
    "amountMm": 35,
    "createdBy": "user-socio-idevi"
  },
  {
    "id": "hydric-pat-02",
    "locationId": "loc-patagonia",
    "plotId": "plot-gamma-patagonia",
    "date": "2025-12-05",
    "time": "09:00",
    "endTime": "15:00",
    "type": "Riego",
    "amountMm": 45,
    "createdBy": "user-socio-idevi"
  }
];

export const DEMO_TASKS: Task[] = [
  {
    "id": "labor-patagonia-01",
    "title": "Apertura de Compuertas & Turno de Riego Gravitacional",
    "description": "Distribución de 350 m3 de agua del canal matriz IDEVI para recarga de humedad en perfil de suelo franco.",
    "status": "Homologada",
    "priority": "Media",
    "assignedToIds": [
      "user-socio-patagonia"
    ],
    "dueDate": "2025-11-28",
    "executionDate": "2025-11-28",
    "plotId": "plot-gamma-patagonia",
    "createdBy": "user-socio-patagonia",
    "laborType": "MANEJO_HIDRICO",
    "targetStage": "BBCH_10_19",
    "advancesPhenologicalStage": false,
    "machinery": {
      "tractor": "Pala Niveladora Hidráulica",
      "implement": "Compuertas Modulares de Polietileno",
      "fuelConsumptionLiters": 35,
      "machineHours": 7
    },
    "operator": "Ing. Lucas Varela (Socio IDEVI)",
    "weather": {
      "tempC": 19,
      "humidityPct": 38,
      "windSpeedKmh": 18,
      "windDirection": "O",
      "suitableForSpraying": false
    },
    "directCostUsd": 410,
    "syncWithExpenses": true,
    "homologatedBy": "Ing. Rodrigo Paz",
    "homologatedAt": "2025-11-29",
    "homologationNotes": "Excelente coeficiente de uniformidad en manto."
  }
];

export const DEMO_STORAGE_POINTS: StoragePoint[] = [
  {
    "id": "sp-patagonia",
    "name": "Centro de Acopio & Silos IDEVI - Viedma",
    "nodeCode": "NOD-RC-01",
    "type": "Propio",
    "address": "Parque Industrial Viedma Parcela 12, Río Negro",
    "city": "Viedma",
    "province": "Río Negro",
    "coordinates": {
      "lat": -40.795,
      "lng": -63.012
    },
    "surfaceM2": 1200,
    "totalCapacityTn": 450,
    "conditions": "Humedad controlada < 12%, ventilación forzada y control térmico para biomasa y flor seca.",
    "tempC": 18.5,
    "humidityPct": 48,
    "tempStatus": "normal",
    "humidityStatus": "normal",
    "securityLevel": "GACP Alta Seguridad",
    "ariccameCustodyRegistry": "ARICCAME-LIB-CBA-0442",
    "responsibleAgronomistMatricula": "MP-AGRO-7814 CBA",
    "zones": [
      {
        "id": "z-rc-1",
        "name": "Silo 1 - Grano Alimento Limpio",
        "type": "Silo_Grano_Alimento",
        "capacityTn": 120,
        "currentOccupancyTn": 64,
        "targetTempC": 16,
        "maxHumidityPct": 50
      },
      {
        "id": "z-rc-2",
        "name": "Playa Estiba Fardos Fibra Tech",
        "type": "Playa_Estiba_Fardos",
        "capacityTn": 250,
        "currentOccupancyTn": 180,
        "targetTempC": 22,
        "maxHumidityPct": 60
      },
      {
        "id": "z-rc-3",
        "name": "Cámara Fría Biomasa CBG",
        "type": "Biomasa_Custodiada",
        "capacityTn": 80,
        "currentOccupancyTn": 28,
        "targetTempC": 14,
        "maxHumidityPct": 45
      }
    ],
    "responsibleUserId": "user-admin-nucleus"
  }
];

export const DEMO_SUPPLIERS: Supplier[] = [
  {
    "id": "sup-1",
    "name": "BioGenética Andina & Semillas Certificadas",
    "category": "Semillero_Criadero",
    "legalName": "BioGenética Andina S.A.",
    "cuit": "30-71654321-9",
    "country": "Argentina",
    "province": "Mendoza",
    "city": "Luján de Cuyo",
    "address": "Ruta Panamericana Km 18",
    "coordinates": {
      "lat": -33.0035,
      "lng": -68.868
    },
    "email": "calidad@biogenetica.com.ar",
    "whatsapp": "+54 9 261 455-8890",
    "isOfficialPartner": true,
    "inaseRncyfsNumber": "RNCyFS-INASE-9842-K",
    "ariccameLicenseNumber": "EX-2024-11882200-ARICCAME",
    "homologationStatus": "Homologado_Conforme",
    "technicalSpecialty": "Multiplicador Fiscalizado de Variedades Monoicas y Criadero Homologado",
    "activeIngredientsProvided": [
      "Semilla Fiscalizada C1",
      "Semilla Fiscalizada C2",
      "Plantines F1 Homologados"
    ],
    "batchReturnWarrantyDays": 90,
    "audit": {
      "technicalAgronomistName": "Ing. Agr. Lucas Berardi",
      "technicalAgronomistMatricula": "MP-AGRO-3321 MZA",
      "lastAuditDate": "2025-08-10",
      "auditScore": 98,
      "gacpCertified": true,
      "bpaCertified": true,
      "organicCertified": false,
      "zeroResidueGuarantee": true
    }
  }
];

export const DEMO_SEED_BATCHES: SeedBatch[] = [
  {
    "id": "batch-futura-2025",
    "varietyId": "var-futura75",
    "supplierId": "sup-1",
    "batchCode": "FUT75-C1-2025-03",
    "materialType": "seed",
    "labelSerialNumber": "INASE-ROT-9440-C",
    "category": "C1",
    "analysisDate": "2025-08-25",
    "germinationExpiryDate": "2026-08-25",
    "purity": 99.3,
    "germination": 91,
    "gs1Code": "7791234567892",
    "certificationNumber": "CERT-INASE-2025-0604",
    "purchaseDate": "2025-09-15",
    "pricePerKg": 16.5,
    "initialQuantity": 3200,
    "remainingQuantity": 1850,
    "storagePointId": "sp-patagonia",
    "storageConditions": "Cámara fría 15°C / 42% HR en Bóveda INASE",
    "isActive": true
  },
  {
    "id": "batch-grano-futura-cosecha",
    "varietyId": "var-futura75",
    "batchCode": "COS-GRAN-FUT-2501",
    "materialType": "harvested_grain",
    "originPlotId": "plot-gamma-patagonia",
    "originCampaign": "2025/2026",
    "harvestDate": "2026-02-15",
    "initialQuantity": 28500,
    "remainingQuantity": 22000,
    "storagePointId": "sp-patagonia",
    "moisturePct": 8.4,
    "oilContentPct": 32.5,
    "aflatoxinFreeCertificate": "SENASA-INOC-2026-8812 (Negativo)",
    "pricePerKg": 1.35,
    "storageConditions": "Silo 1 Seco y aireado en Río Cuarto",
    "isActive": true
  }
];

export const DEMO_SEED_MOVEMENTS: SeedMovement[] = [];

export const DEMO_SUPPLIER_INSPECTIONS: SupplierLotInspection[] = [
  {
    "id": "insp-1",
    "supplierId": "sup-1",
    "supplierName": "BioGenética Andina & Semillas Certificadas",
    "date": "2025-10-14",
    "inputCategory": "Semilla C1/C2",
    "lotNumber": "LOT-INASE-FUTURA75-2025-01",
    "guideOrRemitoNumber": "REM-0001-00049210",
    "germinationDeclaredPct": 90,
    "germinationTestedPct": 94,
    "purityPct": 99.8,
    "moisturePct": 8.7,
    "weedSeedsFound": false,
    "pathogenScreeningResult": "Negativo (Conforme)",
    "residueStatus": "Cero Residuos / Orgánico",
    "verdict": "APROBADO_CAMPO",
    "agronomistName": "Ing. Agr. Lucas Berardi",
    "agronomistMatricula": "MP-AGRO-3321 MZA",
    "observations": "Semilla fiscalizada C1 con excelente vigor germinativo. Calibre homogéneo, sin indicios de hongos ni daños mecánicos.",
    "createdAt": "2025-10-14T11:30:00Z"
  }
];

export const DEMO_RESOURCES: Resource[] = [
  {
    "id": "res-bio-root",
    "name": "Bio-Hemp Root Optimizer (Ácidos Húmicos & Fúlvicos)",
    "type": "Insumo",
    "unit": "L",
    "costPerUnit": 14.5,
    "stock": 240
  },
  {
    "id": "res-nutri-foliar",
    "name": "Phyto-Mineral Boost Zn+B+Mg (Nutrición Foliar)",
    "type": "Fertilizante",
    "unit": "L",
    "costPerUnit": 18.2,
    "stock": 180
  },
  {
    "id": "res-neem-bio",
    "name": "Bio-Defend Neem Pure Organic (Control Biológico)",
    "type": "Fitosanitario",
    "unit": "L",
    "costPerUnit": 22,
    "stock": 95
  },
  {
    "id": "res-tricho-soil",
    "name": "Trichoderma Harzianum Formulada (Enmienda Biológica)",
    "type": "Insumo",
    "unit": "kg",
    "costPerUnit": 35,
    "stock": 120
  },
  {
    "id": "res-fert-organico",
    "name": "Compost Orgánico Estabilizado y Lombricompuesto",
    "type": "Fertilizante",
    "unit": "tn",
    "costPerUnit": 120,
    "stock": 45
  },
  {
    "id": "res-labor-pulv",
    "name": "Labor de Pulverización Terrestre Foliar (Maquinaria)",
    "type": "Labor",
    "unit": "ha",
    "costPerUnit": 28,
    "stock": 999
  },
  {
    "id": "res-labor-siembra",
    "name": "Labor de Siembra Directa Neumática Grano Grueso/Fino",
    "type": "Labor",
    "unit": "ha",
    "costPerUnit": 65,
    "stock": 999
  },
  {
    "id": "res-labor-riego",
    "name": "Operación & Mantenimiento Sistema Fertirriego Presurizado",
    "type": "Labor",
    "unit": "ha/mes",
    "costPerUnit": 42,
    "stock": 999
  },
  {
    "id": "res-labor-cosecha",
    "name": "Cosecha Mecanizada Cabezal Doble Corte Fibra/Grano",
    "type": "Labor",
    "unit": "ha",
    "costPerUnit": 95,
    "stock": 999
  }
];

export const DEMO_OPERATIONAL_EXPENSES: OperationalExpense[] = [
  {
    "id": "exp-socio-idevi-01",
    "campaign": "2025/2026",
    "date": "2025-11-04",
    "scope": "PARCELA_SOCIO",
    "plotId": "plot-gamma-patagonia",
    "plotName": "Lote Gamma - Transición Hídrica Patagonia",
    "locationName": "Establecimiento Río Negro Valley",
    "socioId": "user-socio-idevi",
    "socioName": "Asociación IDEVI Cáñamo",
    "category": "SEMILLA_FISCALIZADA",
    "concept": "Semilla Certificada C1 Futura 75 (INASE-RNC-7734/22)",
    "quantity": 1100,
    "unit": "kg",
    "unitCost": 4.8,
    "totalCost": 5280,
    "currency": "USD",
    "exchangeRate": 1250,
    "totalCostUsd": 5280,
    "receiptType": "Factura A",
    "receiptNumber": "FAC-A-0001-00003112",
    "supplierName": "Semillero Fiscalizado Patagonia BioTech",
    "status": "AUDITADO_CONFORME",
    "auditedBy": "Ing. Gastón Barea (Nucleus)",
    "auditDate": "2025-11-06",
    "auditNotes": "Marbetes INASE escaneados y validados en trazabilidad de lote.",
    "createdAt": "2025-11-04T09:40:00Z"
  },
  {
    "id": "exp-socio-idevi-02",
    "campaign": "2025/2026",
    "date": "2025-11-20",
    "scope": "PARCELA_SOCIO",
    "plotId": "plot-gamma-patagonia",
    "plotName": "Lote Gamma - Transición Hídrica Patagonia",
    "locationName": "Establecimiento Río Negro Valley",
    "socioId": "user-socio-idevi",
    "socioName": "Asociación IDEVI Cáñamo",
    "category": "RIEGO_COMBUSTIBLE",
    "concept": "Canon de riego presurizado de cuenca y energía eléctrica bombas",
    "quantity": 22,
    "unit": "ha",
    "unitCost": 55,
    "totalCost": 1210,
    "currency": "USD",
    "exchangeRate": 1250,
    "totalCostUsd": 1210,
    "receiptType": "Factura B/C",
    "receiptNumber": "FAC-B-0010-00049210",
    "supplierName": "Consorcio de Riego Valle Inferior (IDEVI)",
    "status": "AUDITADO_CONFORME",
    "auditedBy": "Ing. Gastón Barea (Nucleus)",
    "auditDate": "2025-11-22",
    "auditNotes": "Comprobante de pago canon hídrico verificado.",
    "createdAt": "2025-11-20T14:15:00Z"
  },
  {
    "id": "exp-socio-idevi-03",
    "campaign": "2025/2026",
    "date": "2025-12-10",
    "scope": "PARCELA_SOCIO",
    "plotId": "plot-gamma-patagonia",
    "plotName": "Lote Gamma - Transición Hídrica Patagonia",
    "locationName": "Establecimiento Río Negro Valley",
    "socioId": "user-socio-idevi",
    "socioName": "Asociación IDEVI Cáñamo",
    "category": "RIEGO_COMBUSTIBLE",
    "concept": "Repuesto y mantenimiento de electroválvula de cabezal sector sur",
    "quantity": 1,
    "unit": "global",
    "unitCost": 380,
    "totalCost": 380,
    "currency": "USD",
    "exchangeRate": 1250,
    "totalCostUsd": 380,
    "receiptType": "Remito Oficial",
    "receiptNumber": "REM-PVN-2025-410",
    "supplierName": "Riego Austral Tecnificado",
    "status": "OBSERVADO_REVISION",
    "auditedBy": "Ing. Gastón Barea (Nucleus)",
    "auditDate": "2025-12-12",
    "auditNotes": "Observado: Falta adjuntar Factura fiscal correspondiente al remito.",
    "createdAt": "2025-12-10T16:00:00Z"
  }
];
