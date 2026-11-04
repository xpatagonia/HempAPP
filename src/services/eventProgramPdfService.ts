import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface EventProgramParticipant {
  name: string;
  email: string;
  ticketCode: string;
  profileLabel: string;
  organizationName?: string;
  locality?: string;
  phone?: string;
}

export const OFFICIAL_PROGRAM_STATIC_PDF_PATH =
  '/assets/aistudio/Programa_Oficial_Un_Dia_de_Siembra_PatagonianC_ad224782.pdf';

export const EVENT_METADATA = {
  diplomatura: 'DIPLOMATURA UNIVERSITARIA EN CÁÑAMO INDUSTRIAL • UNLZ – UATRE',
  title: 'JORNADA OFICIAL: “UN DÍA DE SIEMBRA”',
  sede: 'Sede Práctica Patagonia: Chacra Experimental PatagonianC LTDA',
  ubicacion: 'Ubicación: VIRCH – Trelew, Chubut',
  organizan: 'PatagonianC & UATRE',
  horarioGeneral: '08:30 a 15:30 hs',
  esquemaCampo: '3 Lotes por Propósito',
  metodologia: 'Protocolo BPA Propio',
  avisoImportante:
    'AVISO IMPORTANTE: Por tratarse de una actividad de campo a cielo abierto, LA JORNADA SE REPROGRAMA EN CASO DE MAL TIEMPO. (Aviso 24 hs antes — Programa sujeto a actualización)'
};

export const EVENT_SCHEDULE_ITEMS = [
  {
    time: '08:30 – 09:15',
    block: 'Acreditación y Recepción',
    subBlock: 'Café de bienvenida',
    description:
      'Registro de delegaciones provinciales, acreditación de participantes, entrega de credenciales y carpeta técnica de campo.',
    audience: 'General'
  },
  {
    time: '09:15 – 10:00',
    block: 'Apertura Institucional',
    subBlock: 'Bienvenida oficial',
    description:
      'Palabras de apertura: Gastón Barea y Carlos Reyes (PatagonianC LTDA), Director académico del área cáñamo industrial Sebastián Tosolini - Demian Gomez (UATRE Buenos Aires - Chubut): Categorías laborales del cáñamo industrial y reconocimiento de la actividad agraria. Resoluciones y Autoridades Provinciales.',
    audience: 'General'
  },
  {
    time: '10:00 – 10:45',
    block: 'Bloque de Campo 1',
    subBlock: 'Propósitos en 3 Lotes y Mecanización',
    description:
      'Traslado a lotes. Presentación de las 3 líneas genéticas según destino: Grano, Cañamiza y Fibra Textil. Regulación de sembradora adaptada y BPA.',
    audience: 'Alumnos / Prod.'
  },
  {
    time: '10:45 – 11:45',
    block: 'Bloque de Campo 2',
    subBlock: 'Protocolo Propio, BPA, Red y NUCLEUS',
    description:
      'Siembra en vivo en los 3 lotes aplicando el Protocolo de Siembra desarrollado por PatagonianC LTDA y Buenas Prácticas de Cultivo. Registro en NUCLEUS.',
    audience: 'Alumnos / Prod.'
  },
  {
    time: '11:45 – 12:30',
    block: 'Bloque de Campo 3',
    subBlock: 'Sistema de Riego en el VIRCH',
    description:
      'Manejo hídrico por canal principal. Estrategia de riego de asiento y eficiencia hídrica en suelos patagónicos. Fin de actividades de campo.',
    audience: 'Alumnos / Prod.'
  },
  {
    time: '12:30 – 14:15',
    block: 'Break - Charla',
    subBlock: 'Showroom de Materiales y Plantas Vivas',
    description:
      'Espacio de networking y diálogo técnico. Exhibición interactiva de plantas sembradas de muestra, cañamiza, fibra textil, bloques de Hempcrete y derivados de grano.',
    audience: 'General'
  },
  {
    time: '14:15 – 15:00',
    block: 'Charla Técnica Central',
    subBlock: 'Protocolo de Siembra - Trazabilidad 360',
    description:
      'Exposición sobre desarrollo de campaña, Protocolo de Siembra - Trazabilidad 360, Buenas Prácticas de Cultivo, integración a la Red de Productores y monitoreo satelital en NUCLEUS.',
    audience: 'General'
  },
  {
    time: '15:00 – 15:30',
    block: 'Cierre y Certificados',
    subBlock: 'Clausura de la jornada',
    description:
      'Entrega de certificados de asistencia práctica junto a UATRE y despedida de los estudiantes de otras provincias.',
    audience: 'General'
  }
];

export const EVENT_LOT_SCHEMES = [
  {
    unit: 'LOTE 1\nCiclo Corto',
    purpose: 'Variedad para Grano\n(Alimentario y Nutracéutico)',
    parameters:
      '• Densidad: 250–300 plantas/m² (25–30 kg/ha)\n• Distancia entre líneas: 17,5 a 20 cm\n• Porte bajo/medio para trilla directa',
    destination:
      'Cosecha de semilla para prensado en frío: aceite rico en Omega 3 y 6, harina proteica y superalimentos.'
  },
  {
    unit: 'LOTE 2\nAlto Volumen',
    purpose: 'Variedad para Cañamiza\n(Biomasa y Bioconstrucción)',
    parameters:
      '• Densidad: 400–450 plantas/m² (40–45 kg/ha)\n• Distancia entre líneas: 15 a 17,5 cm\n• Desarrollo de tallo leñoso grueso y alto',
    destination:
      'Obtención de madera interna limpia (hurd) para fabricación de bloques y morteros ignífugos (Hempcrete).'
  },
  {
    unit: 'LOTE 3\nAlta Densidad',
    purpose: 'Variedad para Fibra Textil\n(Filamento Técnico e Industrial)',
    parameters:
      '• Densidad: 500–550 plantas/m² (50–60 kg/ha)\n• Distancia entre líneas: 12,5 a 15 cm\n• Competencia apical para tallos finos sin ramas',
    destination:
      'Extracción de fibra larga cortical de alta resistencia para industria textil, cordelería, papel y biocompuestos.'
  }
];

/**
 * Descarga directamente el archivo PDF original adjunto por la cooperativa o,
 * si se solicita con credencial impresa, genera el documento de 3 páginas exacto.
 */
export function downloadOfficialStaticProgramPDF(): void {
  if (typeof window === 'undefined') return;
  const link = document.createElement('a');
  link.href = OFFICIAL_PROGRAM_STATIC_PDF_PATH;
  link.download = 'Programa_Oficial_Un_Dia_de_Siembra_PatagonianC.pdf';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Genera el Programa Oficial "Un Día de Siembra" respetando exactamente
 * las 3 páginas, estructura, colores y textos del documento oficial de PatagonianC & UATRE,
 * sin ningún ícono gráfico delante del título "UN DÍA DE SIEMBRA".
 */
export function downloadUnDiaDeSiembraProgramPDF(participant?: EventProgramParticipant): void {
  // Si el usuario prefiere el PDF estático original adjunto, primero disparamos la descarga directa del archivo oficial
  if (typeof window !== 'undefined') {
    try {
      downloadOfficialStaticProgramPDF();
      return;
    } catch {
      // Fallback al generador jsPDF idéntico de 3 páginas si por alguna razón falla el enlace estático
    }
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const drawFooter = (pageNum: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 282, 196, 282);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('PatagonianC', 14, 288);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('patagonianc.com.ar  |  Mat. INAES 68218', 38, 288);
    doc.text(`Página ${pageNum} de 3`, 196, 288, { align: 'right' });
  };

  // =========================================================================
  // PÁGINA 1: ENCABEZADO + 1. CRONOGRAMA GENERAL DE ACTIVIDADES (08:30 a 14:15)
  // =========================================================================
  doc.setFillColor(12, 45, 30);
  doc.rect(14, 12, 182, 34, 'F');
  doc.setFillColor(180, 130, 20);
  doc.rect(14, 12, 2.5, 34, 'F');

  doc.setTextColor(221, 219, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(EVENT_METADATA.diplomatura, 20, 19);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.text(EVENT_METADATA.title, 20, 27.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240);
  doc.text(EVENT_METADATA.sede, 20, 34.5);
  doc.text(EVENT_METADATA.ubicacion, 20, 40.5);

  // Recuadro HempC a la derecha
  doc.setFillColor(221, 219, 0);
  doc.roundedRect(164, 17, 26, 16, 1.5, 1.5, 'F');
  doc.setTextColor(12, 45, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('HempC', 177, 26.5, { align: 'center' });
  doc.setTextColor(221, 219, 0);
  doc.setFontSize(7.5);
  doc.text('hempc.com.ar', 177, 38, { align: 'center' });

  // 4 Columnas de Resumen
  const metaY = 52;
  const cols = [
    { label: 'ORGANIZAN', val: EVENT_METADATA.organizan, x: 16 },
    { label: 'HORARIO GENERAL', val: EVENT_METADATA.horarioGeneral, x: 64 },
    { label: 'ESQUEMA DE CAMPO', val: EVENT_METADATA.esquemaCampo, x: 112 },
    { label: 'METODOLOGÍA', val: EVENT_METADATA.metodologia, x: 158 }
  ];
  cols.forEach(c => {
    doc.setDrawColor(12, 45, 30);
    doc.setLineWidth(0.8);
    doc.line(c.x, metaY, c.x, metaY + 9);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, c.x + 3, metaY + 3.5);
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(c.val, c.x + 3, metaY + 8);
  });

  // Aviso Importante Reprogramación y Sujeto a Actualización
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.4);
  doc.rect(14, 66, 182, 13, 'FD');
  doc.setTextColor(180, 83, 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(
    'AVISO IMPORTANTE: Por tratarse de una actividad de campo a cielo abierto, LA JORNADA SE',
    18,
    71.5
  );
  doc.text(
    'REPROGRAMA EN CASO DE MAL TIEMPO. (Aviso 24 hs antes • Programa sujeto a actualización)',
    18,
    76.5
  );

  // Sección 1
  doc.setTextColor(12, 45, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. CRONOGRAMA GENERAL DE ACTIVIDADES', 14, 88);
  doc.setDrawColor(217, 119, 6);
  doc.line(14, 90, 196, 90);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    'La jornada articula las prácticas presenciales de mecanización de la Diplomatura (Módulo 7) bajo estrictas Buenas',
    14,
    96
  );
  doc.text(
    'Prácticas de Siembra y Cultivo (BPA) junto al Protocolo de Siembra desarrollado por la Cooperativa PatagonianC LTDA.',
    14,
    100.5
  );

  autoTable(doc, {
    startY: 105,
    head: [['HORARIO', 'BLOQUE / ESTACIÓN', 'DESARROLLO TÉCNICO Y OPERATIVO', 'PÚBLICO']],
    body: EVENT_SCHEDULE_ITEMS.slice(0, 6).map(item => [
      item.time,
      `${item.block}\n${item.subBlock}`,
      item.description,
      item.audience
    ]),
    theme: 'plain',
    headStyles: {
      fillColor: [12, 45, 30],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 3.5
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 4,
      lineColor: [226, 232, 240],
      lineWidth: { bottom: 0.2 }
    },
    columnStyles: {
      0: { cellWidth: 25, fontStyle: 'bold' },
      1: { cellWidth: 42, fontStyle: 'bold' },
      2: { cellWidth: 90 },
      3: { cellWidth: 25, fontStyle: 'bold', textColor: [180, 83, 9] }
    },
    margin: { left: 14, right: 14 }
  });

  drawFooter(1);

  // =========================================================================
  // PÁGINA 2: CONTINUACIÓN CRONOGRAMA + 2. ESQUEMA DE 3 LOTES + 3. PROTOCOLO
  // =========================================================================
  doc.addPage();

  autoTable(doc, {
    startY: 15,
    head: [['HORARIO', 'BLOQUE / ESTACIÓN', 'DESARROLLO TÉCNICO Y OPERATIVO', 'PÚBLICO']],
    body: EVENT_SCHEDULE_ITEMS.slice(6).map(item => [
      item.time,
      `${item.block}\n${item.subBlock}`,
      item.description,
      item.audience
    ]),
    theme: 'plain',
    headStyles: {
      fillColor: [12, 45, 30],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 3.5
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 4,
      lineColor: [226, 232, 240],
      lineWidth: { bottom: 0.2 }
    },
    columnStyles: {
      0: { cellWidth: 25, fontStyle: 'bold' },
      1: { cellWidth: 42, fontStyle: 'bold' },
      2: { cellWidth: 90 },
      3: { cellWidth: 25, fontStyle: 'bold', textColor: [180, 83, 9] }
    },
    margin: { left: 14, right: 14 }
  });

  // Recuadro BPA y Normas de Seguridad en Campo
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(22, 163, 74);
  doc.rect(14, 65, 182, 20, 'FD');
  doc.setTextColor(21, 128, 61);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Buenas Prácticas de Siembra y Cultivo (BPA) y Normas de Seguridad en Campo', 18, 71);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(
    'Todas las actividades en lote se ejecutan bajo estándares de Buenas Prácticas de Siembra y Cultivo e higiene laboral rural',
    18,
    76.5
  );
  doc.text(
    '(Módulo 7 UATRE – UNLZ). En caso de mal tiempo, la jornada se reprogramará.',
    18,
    81.5
  );

  // Sección 2: Esquema en 3 lotes
  doc.setTextColor(12, 45, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('2. ESQUEMA DE SIEMBRA EN 3 LOTES DIFERENCIADOS POR PROPÓSITO', 14, 95);
  doc.setDrawColor(217, 119, 6);
  doc.line(14, 97, 196, 97);

  autoTable(doc, {
    startY: 103,
    head: [
      [
        'UNIDAD DE CAMPO',
        'PROPÓSITO PRODUCTIVO',
        'PARÁMETROS DE SIEMBRA Y REGULACIÓN',
        'DESTINO INDUSTRIAL Y VALOR AGREGADO'
      ]
    ],
    body: EVENT_LOT_SCHEMES.map(l => [l.unit, l.purpose, l.parameters, l.destination]),
    theme: 'grid',
    headStyles: {
      fillColor: [12, 45, 30],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 3.5
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 4
    },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: 'bold' },
      1: { cellWidth: 42, fontStyle: 'bold' },
      2: { cellWidth: 58 },
      3: { cellWidth: 54 }
    },
    margin: { left: 14, right: 14 }
  });

  drawFooter(2);

  // =========================================================================
  // PÁGINA 3: PROTOCOLO COOPERATIVO + PLATAFORMA NUCLEUS + ACREDITACIÓN
  // =========================================================================
  doc.addPage();

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(12, 45, 30);
  doc.rect(14, 16, 88, 68, 'FD');
  doc.rect(108, 16, 88, 68, 'FD');

  doc.setTextColor(12, 45, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('PROTOCOLO COOPERATIVO Y BUENAS PRÁCTICAS', 18, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(
    '• Protocolo de Siembra PatagonianC: Metodología agronómica\n  y de mecanización desarrollada íntegramente por la\n  cooperativa para suelos del valle patagónico.\n\n• Buenas Prácticas de Siembra y Cultivo (BPA): Calibración\n  sin daño mecánico a la semilla, profundidad controlada\n  (1,5–2 cm), avance a 5–6 km/h y manejo sin agroquímicos.\n\n• Riego en el VIRCH: Uso racional del agua por canal\n  principal mediante riego de asiento y monitoreo edáfico.',
    18,
    31
  );

  doc.setTextColor(12, 45, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('BREAK - CHARLA Y MUESTRA INTERACTIVA', 112, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(
    '• Plantas Vivas de Muestra: Exhibición de ejemplares en\n  desarrollo vegetativo temprano para reconocimiento\n  morfológico y radicular.\n\n• Muestrario Industrial: Mesas técnicas con fibra textil\n  descortezada, cañamiza limpia, prototipos de Hempcrete\n  ignífugo, semilla entera, aceite y harina proteica.\n\n• Vinculación con Productores: Espacio para sumar chacras\n  del valle mediante provisión de genética y maquinaria.',
    112,
    31
  );

  // Plataforma AgTech NUCLEUS
  doc.setFillColor(15, 23, 42);
  doc.rect(14, 92, 182, 28, 'F');
  doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('PLATAFORMA AGTECH NUCLEUS: PROTOCOLO DE SIEMBRA – TRAZABILIDAD 360', 18, 99);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    'Cada uno de los 3 lotes (Grano, Cañamiza y Fibra) se audita en vivo dentro de NUCLEUS, el software desarrollado por',
    18,
    105.5
  );
  doc.text(
    'PatagonianC LTDA que digitaliza nuestro Protocolo de Siembra – Trazabilidad 360 y certifica las Buenas Prácticas de Cultivo.',
    18,
    110.5
  );
  doc.setTextColor(253, 224, 71);
  doc.text('*IMPORTANTE: Se reprograma en caso de mal tiempo. Programa sujeto a actualización.', 18, 116);

  // Acreditación y Credencial del Participante
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(12, 45, 30);
  doc.rect(14, 128, 182, 34, 'FD');
  doc.setTextColor(12, 45, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ACREDITACIÓN Y REGISTRO ONLINE OBLIGATORIO', 18, 136);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    'Escaneá el código QR con tu celular o ingresá al enlace para registrar tu asistencia a la jornada práctica y acceder al material técnico:',
    18,
    142.5
  );
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87);
  doc.text('https://red.hempc.com.ar/#/evento', 18, 148.5);

  if (participant) {
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `Acreditado: ${participant.name} (${participant.email}) • Pase: ${participant.ticketCode} • Perfil: ${participant.profileLabel}`,
      18,
      156
    );
  }

  drawFooter(3);
  doc.save('Programa_Oficial_Un_Dia_de_Siembra_PatagonianC.pdf');
}
