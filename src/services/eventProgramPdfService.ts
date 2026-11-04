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

export const EVENT_SCHEDULE_ITEMS = [
  {
    time: '08:30 – 09:15 hs',
    block: 'Acreditación Digital QR & Recepción Institucional',
    description:
      'Recepción de productores, técnicos, autoridades e invitados en el predio. Escaneo de credencial QR de acreditación, entrega de dossier técnico y desayuno patagónico.',
    speaker: 'Mesa de Acreditaciones HempC Nucleus'
  },
  {
    time: '09:15 – 10:00 hs',
    block: 'Apertura Oficial: Red Cooperativa & Marco Regulatorio',
    description:
      'Presentación del plan de expansión de la Red Cooperativa PatagonianC LTDA (HempC), normativas vigentes ARICCAME / INASE / SENASA y oportunidades para nuevos socios productores.',
    speaker: 'Dirección Ejecutiva & Consejo Técnico Cooperativo'
  },
  {
    time: '10:00 – 11:00 hs',
    block: 'Genética Industrial, Semilla Certificada y Trazabilidad Satelital',
    description:
      'Evaluación de cultivares de fibra y grano (Futura 75, Uso 31, Santhica, Muka, Yuma), poder germinativo ISTA y demostración en vivo de monitoreo satelital Sentinel-2 / SAR.',
    speaker: 'Equipo de Agronomía & Laboratorio de Semillas'
  },
  {
    time: '11:00 – 12:45 hs',
    block: 'Demostración Dinámica en Lote: Apertura del Primer Surco',
    description:
      'Regulación de sembradora de precisión, calibración de tren de siembra, profundidad, distancia entre hileras, densidad objetivo e inicio formal de la siembra de la campaña.',
    speaker: 'Ingeniería de Campo & Operadores de Maquinaria'
  },
  {
    time: '12:45 – 14:15 hs',
    block: 'Almuerzo de Camaradería & Rueda de Vinculación Productiva',
    description:
      'Espacio de articulación entre productores agrícolas, asesores técnicos, proveedores homologados, organismos científicos (INTA / CONICET) e inversores de la cadena del cáñamo.',
    speaker: 'Comunidad Cooperativa HempC'
  },
  {
    time: '14:15 – 15:30 hs',
    block: 'Captura Neta de CO₂ (Protocolo MRV) y Bioconstrucción (Hempcrete)',
    description:
      'Certificación de huella de carbono bajo norma ISO 14064-2, emisión de bonos verdes por hectárea sembrada y aprovechamiento industrial de cañamiza mineralizada.',
    speaker: 'Área de Bioeconomía & Sustentabilidad MRV'
  },
  {
    time: '15:30 – 16:30 hs',
    block: 'Mesa de Incorporación de Nuevos Productores & Cierre',
    description:
      'Habilitación de cuentas autogestionadas en la plataforma HempC Nucleus, asignación de lotes para la campaña y firma del acta simbólica de inicio de siembra.',
    speaker: 'Administración Central HempC Nucleus'
  }
];

/**
 * Genera y descarga el Programa Oficial "Un Día de Siembra" (Sábado 21 de Noviembre)
 * en formato PDF A4 con la credencial personalizada del inscripto.
 */
export function downloadUnDiaDeSiembraProgramPDF(participant: EventProgramParticipant): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Encabezado Institucional
  doc.setFillColor(2, 44, 34); // Verde profundo #022c22
  doc.rect(0, 0, 210, 36, 'F');

  // Franja decorativa lima institucional
  doc.setFillColor(221, 219, 0); // #DDDB00
  doc.rect(0, 36, 210, 2.2, 'F');

  doc.setTextColor(221, 219, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('JORNADA OFICIAL DE APERTURA DE CAMPAÑA • SÁBADO 21 DE NOVIEMBRE', 14, 11);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(19);
  doc.text('PROGRAMA OFICIAL: "UN DÍA DE SIEMBRA"', 14, 21);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(167, 243, 208);
  doc.text(
    'PatagonianC LTDA Cooperativa de Trabajo (CUIT 30-71816113-0) • HempC | Red Cooperativa Nucleus',
    14,
    29
  );

  // Recuadro de Credencial Personalizada del Participante
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, 43, 182, 28, 3, 3, 'FD');

  doc.setTextColor(6, 78, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CREDENCIAL OFICIAL DE PRE-INSCRIPCIÓN Y ACREDITACIÓN (EMAIL CONFIRMADO)', 18, 49.5);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(`Participante: ${participant.name}`, 18, 56.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Correo Verificado: ${participant.email}`, 18, 62);
  doc.text(
    `Perfil: ${participant.profileLabel} | Entidad: ${participant.organizationName || 'Independiente'} (${participant.locality || 'Argentina'})`,
    18,
    67.5
  );

  // Badge del Código de Ticket a la derecha
  doc.setFillColor(6, 78, 59);
  doc.roundedRect(142, 47, 50, 18, 2, 2, 'F');
  doc.setTextColor(167, 243, 208);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('PASE DE ACCESO', 167, 52.5, { align: 'center' });
  doc.setTextColor(221, 219, 0);
  doc.setFontSize(11);
  doc.text(participant.ticketCode, 167, 60.5, { align: 'center' });

  // Título Cronograma
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('CRONOGRAMA DE ACTIVIDADES — SÁBADO 21 DE NOVIEMBRE', 14, 80);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Actividades técnicas, demostración dinámica de maquinaria de siembra, trazabilidad satelital y vinculación cooperativa.',
    14,
    85
  );

  // Tabla del Programa con autoTable
  autoTable(doc, {
    startY: 89,
    head: [['Horario', 'Bloque Temático & Actividad en Campo', 'Coordinación / Disertantes']],
    body: EVENT_SCHEDULE_ITEMS.map(item => [
      item.time,
      `${item.block}\n${item.description}`,
      item.speaker
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [6, 78, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      cellPadding: 3.5
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 3.5,
      valign: 'top'
    },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: 'bold', textColor: [4, 120, 87] },
      1: { cellWidth: 108 },
      2: { cellWidth: 42, fontStyle: 'bold', textColor: [71, 85, 105] }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14 }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 225;

  // Bloque Normativo y de Aprobación de Usuario
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, finalY + 6, 182, 30, 2.5, 2.5, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('INSTRUCCIONES DE INGRESO Y ALTA AUTOGESTIVA EN PLATAFORMA HEMPC NUCLEUS', 18, finalY + 12.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    '1. Presentá este documento (impreso o en tu celular) junto con tu código de pase en la mesa de ingreso el Sábado 21 de Noviembre.',
    18,
    finalY + 18.5
  );
  doc.text(
    '2. Tu usuario ya fue pre-registrado de forma autogestiva en https://red.hempc.com.ar. Los Administradores de la Cooperativa cuentan',
    18,
    finalY + 23.5
  );
  doc.text(
    '   con la facultad de aprobar tu perfil como "Productor Asociado" o "Visitante Acreditado", notificándote vía notificaciones@hempc.com.ar.',
    18,
    finalY + 28
  );
  doc.text(
    '3. Por normativas de bioseguridad y trazabilidad ARICCAME / SENASA, se ruega respetar las zonas demarcadas durante la labor de siembra.',
    18,
    finalY + 32.5
  );

  // Pie de página oficial
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 281, 196, 281);
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Emitido digitalmente por HempC Nucleus • Remitente oficial: notificaciones@hempc.com.ar • Pase: ${participant.ticketCode}`,
    105,
    286,
    { align: 'center' }
  );

  const cleanCode = participant.ticketCode.replace(/[^a-zA-Z0-9_-]/g, '');
  doc.save(`Programa_Un_Dia_De_Siembra_21Nov_${cleanCode}.pdf`);
}
