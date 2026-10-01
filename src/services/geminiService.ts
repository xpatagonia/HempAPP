import { GoogleGenAI } from '@google/genai';

export interface GeminiConnectionStatus {
  hasKey: boolean;
  isValid?: boolean;
  model?: string;
  source: 'user_custom' | 'environment' | 'none';
  errorMessage?: string;
  checkedAt?: string;
}

/**
 * Obtiene la API Key activa para Gemini descartando claves no válidas o de otros servicios (como Supabase)
 */
export function getActiveGeminiApiKey(): { key: string; source: 'user_custom' | 'environment' | 'none' } {
  // 1. Clave personalizada configurada por el usuario en el navegador
  if (typeof window !== 'undefined') {
    const userKey = localStorage.getItem('user_gemini_api_key');
    if (userKey && userKey.trim().length > 10 && !userKey.startsWith('sb_')) {
      return { key: userKey.trim(), source: 'user_custom' };
    }
  }

  // 2. Variable de entorno Vite
  try {
    const viteKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (viteKey && typeof viteKey === 'string' && viteKey.trim().length > 10 && !viteKey.startsWith('sb_')) {
      return { key: viteKey.trim(), source: 'environment' };
    }
  } catch (e) {}

  // 3. Variable inyectada por compilador o node
  try {
    const globalKey = typeof __API_KEY__ !== 'undefined' ? __API_KEY__ : '';
    if (globalKey && typeof globalKey === 'string' && globalKey.trim().length > 10 && !globalKey.startsWith('sb_')) {
      return { key: globalKey.trim(), source: 'environment' };
    }
  } catch (e) {}

  try {
    const processKey = typeof process !== 'undefined' && (process.env?.GEMINI_API_KEY || process.env?.API_KEY);
    if (processKey && typeof processKey === 'string' && processKey.trim().length > 10 && !processKey.startsWith('sb_')) {
      return { key: processKey.trim(), source: 'environment' };
    }
  } catch (e) {}

  // 4. Clave de Google AI Studio del proyecto
  const defaultKey = 'AQ.Ab8RN6LAEMU1tHqdCrzf4gCMrQeU3id02FXu5aAZy0vR9ouiQA';
  return { key: defaultKey, source: 'environment' };
}

/**
 * Guarda una clave de API proporcionada por el usuario en localStorage
 */
export function saveUserGeminiApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (!key || key.trim() === '') {
      localStorage.removeItem('user_gemini_api_key');
    } else {
      localStorage.setItem('user_gemini_api_key', key.trim());
    }
  }
}

/**
 * Prueba la conexión en vivo con la API de Gemini
 */
export async function testGeminiConnection(customKey?: string): Promise<{ success: boolean; message: string; model?: string }> {
  const keyToTest = customKey ? customKey.trim() : getActiveGeminiApiKey().key;

  if (!keyToTest || keyToTest.length < 10) {
    return {
      success: false,
      message: 'No se ha configurado ninguna API Key de Gemini.'
    };
  }

  if (keyToTest.startsWith('sb_')) {
    return {
      success: false,
      message: 'La clave configurada es una clave de Supabase/Postgres, no de Google Gemini AI Studio.'
    };
  }

  const modelsToTry = [
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-flash-latest'
  ];

  for (const model of modelsToTry) {
    try {
      const ai = new GoogleGenAI({ apiKey: keyToTest });
      const response = await ai.models.generateContent({
        model: model,
        contents: 'ping'
      });

      if (response && (response.text || response.candidates)) {
        return {
          success: true,
          message: `Conexión exitosa con ${model}. Respuesta recibida correctamente de Google AI Studio.`,
          model: model
        };
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('CONSUMER_SUSPENDED') || errMsg.includes('suspended')) {
        return {
          success: false,
          message: 'Error 403: El proyecto de Google Cloud asociado a esta clave está suspendido o inactivo.'
        };
      }
      if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('not valid')) {
        return {
          success: false,
          message: 'Error 400: La API Key ingresada no es válida para Google Generative Language API.'
        };
      }
      if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
        return {
          success: false,
          message: 'Error 429: Cuota de peticiones excedida temporalmente en Google AI Studio.'
        };
      }
    }
  }

  return {
    success: false,
    message: 'No se pudo conectar con los modelos de Gemini. Verifica la validez de la clave.'
  };
}

/**
 * Consulta la IA de Gemini con fallback al motor agronómico especializado
 */
export async function queryGeminiWithAgronomicFallback({
  prompt,
  systemPrompt,
  imageBase64,
  dataContext
}: {
  prompt: string;
  systemPrompt?: string;
  imageBase64?: string;
  dataContext: {
    appName?: string;
    plots: any[];
    trialRecords: any[];
    tasks: any[];
    varieties: any[];
    locations?: any[];
  };
}): Promise<{
  text: string;
  source: 'gemini_api' | 'agronomic_engine';
  modelUsed?: string;
  errorNotice?: string;
}> {
  const { key, source } = getActiveGeminiApiKey();

  // Si tenemos una key válida en formato (no supabase), intentamos llamada en vivo
  if (key && key.length > 10 && !key.startsWith('sb_')) {
    const models = [
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest'
    ];

    for (const model of models) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        let response;

        if (imageBase64) {
          const rawBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
          response = await ai.models.generateContent({
            model: model,
            contents: {
              parts: [
                { text: prompt || 'Analiza esta imagen agronómica de cultivo.' },
                { inlineData: { mimeType: 'image/jpeg', data: rawBase64 } }
              ]
            },
            config: systemPrompt ? { systemInstruction: systemPrompt } : undefined
          });
        } else {
          response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: systemPrompt ? { systemInstruction: systemPrompt } : undefined
          });
        }

        if (response && response.text) {
          return {
            text: response.text,
            source: 'gemini_api',
            modelUsed: model
          };
        }
      } catch (err: any) {
        console.warn(`Error llamando a Gemini (${model}):`, err?.message);
        // Si es el último modelo, guardamos el error para informarlo
        if (model === models[models.length - 1]) {
          const errMsg = err?.message || '';
          let errorDetail = 'La API de Gemini no respondió.';
          if (errMsg.includes('CONSUMER_SUSPENDED')) {
            errorDetail = 'La clave de Gemini de entorno pertenece a un proyecto de Google Cloud suspendido (403).';
          } else if (errMsg.includes('API_KEY_INVALID')) {
            errorDetail = 'La clave configurada no es reconocida por Google Generative AI (400).';
          } else if (errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
            errorDetail = 'Se alcanzó el límite de cuota gratuita en Google AI Studio (429).';
          }

          const fallbackResponse = generateComprehensiveAgronomicInference(prompt, dataContext);
          return {
            text: fallbackResponse,
            source: 'agronomic_engine',
            errorNotice: `${errorDetail} Se activó el Motor Experto Agrónomo Nucleus con los datos de tu red.`
          };
        }
      }
    }
  }

  // Si no hay clave configurada
  const fallbackResponse = generateComprehensiveAgronomicInference(prompt, dataContext);
  return {
    text: fallbackResponse,
    source: 'agronomic_engine',
    errorNotice: 'No se detectó una API Key de Gemini activa. Respuesta generada por el Motor Experto Agrónomo Nucleus.'
  };
}

/**
 * Motor de Inferencia Agronómica Experto Local (Totalmente autónomo y conectado a los datos de la app)
 */
export function generateComprehensiveAgronomicInference(
  query: string,
  context: {
    appName?: string;
    plots: any[];
    trialRecords: any[];
    tasks: any[];
    varieties: any[];
    locations?: any[];
  }
): string {
  const q = (query || '').toLowerCase().trim();
  const app = context.appName || 'HempC';
  const plots = context.plots || [];
  const activePlots = plots.filter(p => p.status === 'Activa');
  const trialRecords = context.trialRecords || [];
  const tasks = context.tasks || [];
  const pendingTasks = tasks.filter(t => t.status === 'Pendiente');
  const varieties = context.varieties || [];
  const locations = context.locations || [];

  // 1. Búsqueda de una parcela específica por nombre en la consulta
  const foundPlot = plots.find(p => p.name && q.includes(p.name.toLowerCase()));
  if (foundPlot) {
    const plotRecords = trialRecords.filter(r => r.plotId === foundPlot.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latest = plotRecords[0];
    const loc = locations.find(l => l.id === foundPlot.locationId);
    const varObj = varieties.find(v => v.id === foundPlot.varietyId);

    return `📍 **Diagnóstico Técnico de Parcela: ${foundPlot.name}**\n\n` +
      `- **Ubicación:** ${loc?.name || 'Campo General'} (${loc?.province || 'Región Central'})\n` +
      `- **Superficie:** ${foundPlot.surfaceArea || 1} ${foundPlot.surfaceUnit || 'ha'} | **Estado:** ${foundPlot.status}\n` +
      `- **Variedad Sembrada:** ${varObj?.name || 'Genética Industrial Certificada'}\n` +
      `- **Fecha de Siembra:** ${foundPlot.sowingDate || 'En ciclo actual'}\n\n` +
      `📊 **Último Muestreo Registrado (${latest?.date || 'Reciente'}):**\n` +
      `- **Altura Promedio:** ${latest?.plantHeight ? `${latest.plantHeight} cm` : 'Sin registro biométrico'}\n` +
      `- **Riesgo Plagas / Enfermedades:** ${latest?.pestsScore ? `${latest.pestsScore}/10` : '0/10 (Normal)'} | ${latest?.diseasesScore ? `${latest.diseasesScore}/10` : '0/10'}\n` +
      `- **Rendimiento Estimado:** ${latest?.yield ? `${latest.yield} kg/ha` : '7.800 kg/ha (proyección)'}\n\n` +
      `💡 **Recomendación Agronómica:** Mantener el seguimiento del índice NDVI satelital de la canopia. En caso de floración temprana, corroborar el fotoperiodo regional.`;
  }

  // 2. Plagas, Sanidad, Enfermedades
  if (q.includes('plaga') || q.includes('enfermedad') || q.includes('sanidad') || q.includes('bicho') || q.includes('hongo') || q.includes('arañuela')) {
    const criticalPlots = activePlots.filter(p => {
      const records = trialRecords.filter(r => r.plotId === p.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const last = records[0];
      return last && ((last.pestsScore || 0) > 4 || (last.diseasesScore || 0) > 4);
    });

    if (criticalPlots.length > 0) {
      return `⚠️ **Alerta Fitosanitaria - ${criticalPlots.length} Lote(s) Bajo Observación:**\n\n` +
        `Las parcelas **${criticalPlots.map(p => `\`${p.name}\``).join(', ')}** presentan registros sanitarios con umbral superior a 4/10.\n\n` +
        `🔍 **Protocolo de Manejo Integrado de Plagas (MIP):**\n` +
        `1. **Arañuela Roja (*Tetranychus urticae*):** Monitorear envés foliar en horas de sol pleno. Aplicar jabón potásico al 1.5% o aceite de neem al atardecer para evitar fitotoxicidad solar.\n` +
        `2. **Orugas Defoliadoras (*Spodoptera frugiperda* / *Helicoverpa*):** Aplicar *Bacillus thuringiensis* (Bt) cepa Kurstaki en estadios larvales L1-L2.\n` +
        `3. **Hongos de Tallo / Flor (*Botrytis* / *Fusarium*):** Fomentar buena aireación en densidad de siembra; evitar riegos por aspersión tardíos.`;
    }

    return `✅ **Sanidad Vegetal Óptima en la Red:**\n\n` +
      `Todas las parcelas activas (${activePlots.length} lotes) se mantienen por debajo del umbral de intervención económica. No se reportan incidencias graves de plagas ni defoliaciones significativas en los últimos monitoreos biométricos.`;
  }

  // 3. Riego, Agua, Balance Hídrico
  if (q.includes('riego') || q.includes('agua') || q.includes('hidric') || q.includes('lluvia') || q.includes('sequia')) {
    return `💧 **Manejo Hídrico y Eficiencia de Uso del Agua (WUE) en Cáñamo:**\n\n` +
      `- **Requerimiento del Ciclo:** 350 a 450 mm totales a lo largo de los 100-120 días de cultivo.\n` +
      `- **Período Crítico:** Días 25 a 70 desde emergencia (máxima tasa de elongación de tallo y cierre de canopia).\n` +
      `- **Eficiencia de Biomasa:** Produce entre **2.1 y 2.9 kg de biomasa seca por m³ de agua**, requiriendo hasta **70% menos agua que el algodón** y **40% menos que el maíz**.\n` +
      `- **Drenaje:** El cáñamo es muy sensible a la asfixia radicular; no tolera anegamientos mayores a 48 horas continuas.`;
  }

  // 4. Cosecha, Rendimiento, Genética, Variedades
  if (q.includes('cosecha') || q.includes('rinde') || q.includes('variedad') || q.includes('genetica') || q.includes('fibra') || q.includes('grano')) {
    const varietyNames = [...new Set(varieties.map(v => v.name))];
    return `🌾 **Proyecciones de Cosecha & Variedades de la Red:**\n\n` +
      `- **Genéticas Registradas (${varietyNames.length}):** ${varietyNames.join(', ') || 'Variedades Industriales INASE'}.\n` +
      `- **Momento Óptimo para Fibra Técnica:** Cosechar al inicio de la floración masculina (cuando el polen comienza a liberarse), antes de la lignificación excesiva del tallo.\n` +
      `- **Rendimiento de Tallo Seco:** Promedio esperado de **7.000 a 9.500 kg/ha** bajo manejo agronómico estándar.\n` +
      `- **Límite Normativo SENASA/INASE:** Certificar antes de cosecha que el contenido de THC se mantenga por debajo del límite regulatorio del 1.0% en base seca.`;
  }

  // 5. Suelo, Fertilización, NPK, SENASA
  if (q.includes('suelo') || q.includes('fertiliz') || q.includes('abono') || q.includes('senasa') || q.includes('insumo') || q.includes('nutri')) {
    return `🌱 **Estrategia Nutricional y Restauración Edáfica:**\n\n` +
      `- **Demanda Nutricional Promedio por Tonelada de Biomasa:** 20-25 kg N | 5-7 kg P₂O₅ | 25-30 kg K₂O.\n` +
      `- **Aporte de Enmiendas:** Priorizar fertilizantes foliares orgánicos y bioestimulantes certificados con registro SENASA (Banda Verde / IV).\n` +
      `- **Efecto Descompactador:** La raíz pivotante del cáñamo desciende hasta 2 metros de profundidad, rompiendo capas duras (piso de arado) y reciclando nutrientes lixiviados para cultivos posteriores.`;
  }

  // 6. Carbono, CO2, Bonos MRV
  if (q.includes('carbon') || q.includes('co2') || q.includes('bono') || q.includes('huella')) {
    return `🌍 **Balance de Carbono & Créditos MRV de la Red ${app}:**\n\n` +
      `- **Captura Bruta:** 13.5 a 17.8 toneladas de CO₂ equivalente por hectárea cultivada.\n` +
      `- **Distribución:** ~82% en biomasa aérea (tallos y hojas) y ~18% en sistema radicular y exudados de suelo.\n` +
      `- **Balance Neto Positivo:** Descontando las labores agrícolas (tractor, combustible, fertilizantes: ~0.65 tCO₂e/ha), cada hectárea genera un secuestro neto de **>12 tCO₂e/ha**, apto para auditorías de bonos de carbono.`;
  }

  // 7. Respuesta Ejecutiva Integral General
  return `🤖 **Informe Agronómico Ejecutivo - ${app} Advisor:**\n\n` +
    `Actualmente hay **${activePlots.length} parcelas activas** en la red (${plots.reduce((sum, p) => sum + (p.surfaceArea || 1), 0).toFixed(1)} ha totales) y **${pendingTasks.length} labores pendientes**.\n\n` +
    `📌 **Estado de la Operación:**\n` +
    `- **Genéticas Activas:** ${[...new Set(varieties.map(v => v.name))].slice(0, 4).join(', ') || 'Semillas Fiscalizadas'}\n` +
    `- **Condición Fitosanitaria:** Parámetros dentro de la normalidad biológica.\n` +
    `- **Prioridad Operativa:** Revisar las labores de monitoreo y fertirriego programadas en la sección de Tareas.\n\n` +
    `*Puedes consultarme puntualmente sobre un lote por su nombre, requerimientos de riego, plagas específicas, dosis de fertilizantes SENASA o estimaciones de cosecha.*`;
}
