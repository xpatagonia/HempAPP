import React, { useState, useRef, useEffect } from 'react';
import {
  SeedMovement,
  SeedBatch,
  Variety,
  StoragePoint,
  Client,
  Supplier,
  ElectronicSignatureRecord,
  MovementAuditEvent
} from '../types';
import {
  X,
  Printer,
  FileCheck,
  ShieldCheck,
  Truck,
  CheckCircle2,
  PenTool,
  Sparkles,
  History,
  FileText,
  Eraser,
  QrCode,
  MapPin,
  Package,
  Calendar,
  Clock,
  Award,
  AlertCircle,
  Download,
  Plus,
  Lock,
  Upload,
  Eye,
  Trash2
} from 'lucide-react';
import { DateInputAr } from '../src/components/DateInputAr';
import { formatDateAr } from '../src/utils/dateFormat';

export type SignatureRoleKey = 'issuer' | 'carrier' | 'receiver';

export interface TransitGuideContextData {
  batch?: SeedBatch;
  variety?: Variety;
  supplier?: Supplier;
  originStorage?: StoragePoint;
  targetStorage?: StoragePoint;
  client?: Client;
  currentUserName?: string;
}

export const downloadTadDocumentPdf = (movement: SeedMovement) => {
  if (!movement.tadDocumentUrl) return;
  const link = document.createElement('a');
  link.href = movement.tadDocumentUrl;
  const safeGuide = (movement.transportGuideNumber || movement.remitoNumber || movement.id || 'GUIA')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  link.download = movement.tadDocumentName || `Guia_Aprobada_TAD_ARICCAME_${safeGuide}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generateSignatureHash = (seed: string): string => {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ (c + i), 2246822507);
  }
  const p1 = (h1 >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return `SHA256-HEMPC-${p1}${p2}`;
};

export const generateCalligraphicSignatureDataUrl = (
  signerName: string,
  roleLabel: string,
  hashCode: string
): string => {
  const cleanName = (signerName || 'Firma Autorizada').replace(/[<>&"']/g, '');
  const cleanRole = (roleLabel || 'Custodia Oficial').replace(/[<>&"']/g, '');
  const shortHash = hashCode.slice(-10);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="96" viewBox="0 0 320 96">
    <rect width="320" height="96" rx="8" fill="#f8fafc" fill-opacity="0.4"/>
    <path d="M 24 64 Q 52 22, 76 54 T 128 46 Q 158 26, 178 58 T 238 40 Q 262 34, 288 52" fill="none" stroke="#0f172a" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M 38 70 Q 115 58, 265 66" fill="none" stroke="#059669" stroke-width="1.4" stroke-linecap="round" stroke-dasharray="3 2"/>
    <text x="160" y="38" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="16" font-weight="bold" fill="#1e293b" opacity="0.92">${cleanName}</text>
    <text x="160" y="82" text-anchor="middle" font-family="Courier New, monospace" font-size="8.5" font-weight="bold" fill="#047857">${cleanRole} · ${shortHash}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const formatDateTimeAr = (raw?: string): string => {
  if (!raw) return '-';
  const parts = raw.trim().split(' ');
  const datePart = formatDateAr(parts[0]);
  const timePart = parts[1] ? ` ${parts[1]} hs` : '';
  return `${datePart}${timePart}`;
};

const triggerIframePrint = (htmlContent: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
      }, 2500);
    }, 350);
  }
};

export const printSingleTransitGuidePDF = (
  movement: SeedMovement,
  ctx: TransitGuideContextData
) => {
  const guideNum = movement.transportGuideNumber || movement.remitoNumber || 'GUIA-OFICIAL';
  const remitoNum = movement.remitoNumber || 'R-0001-0002526';
  const precintoNum = movement.precintoNumber || 'PREC-SENASA-OFICIAL';
  const dateAr = formatDateAr(movement.date);
  const qtyKg = Number((movement.quantity || 0).toFixed(3));
  const qtyGr = Math.round(qtyKg * 1000);
  const vName = ctx.variety?.name || 'Semilla Fiscalizada C1';
  const supName = ctx.supplier?.name || (vName === 'Yuma' ? 'Ananda Pampa' : 'HEMPIT France');
  const originName = ctx.originStorage?.name || 'BioC Warehousing 1# (Planta Central)';
  const originCity = ctx.originStorage?.city || 'Parque Industrial Trelew, Chubut';
  const targetName = ctx.targetStorage?.name || 'Depósito de Establecimiento';
  const targetCity = ctx.targetStorage?.city || 'Patagonia / Buenos Aires';
  const clientName = ctx.client?.name || targetName;

  const sig1 = movement.issuerSignature;
  const sig2 = movement.carrierSignature;
  const sig3 = movement.receiverSignature;
  const sigCount = [sig1, sig2, sig3].filter(Boolean).length;

  const renderSigBoxHtml = (title: string, subtitle: string, sig?: ElectronicSignatureRecord) => {
    if (!sig) {
      return `
        <div class="sig-card pending">
          <div class="sig-header">${title}</div>
          <div class="sig-placeholder">PENDIENTE DE FIRMA ELECTRÓNICA</div>
          <div class="sig-meta">
            <strong>${subtitle}</strong><br/>
            Estado: Aguardando conformidad digital
          </div>
        </div>
      `;
    }
    return `
      <div class="sig-card signed">
        <div class="sig-header">✓ ${title}</div>
        <div class="sig-img-wrap">
          ${sig.signatureDataUrl ? `<img src="${sig.signatureDataUrl}" alt="Firma ${sig.signedBy}" class="sig-img" />` : `<div class="sig-script">${sig.signedBy}</div>`}
        </div>
        <div class="sig-meta">
          <strong>${sig.signedBy}</strong><br/>
          <span>DNI/Mat.: ${sig.dniOrMatricula || 'Verificado'}</span><br/>
          <span>Rol: ${sig.role || subtitle}</span><br/>
          <span>Fecha/Hora: ${formatDateTimeAr(sig.signedAt)}</span><br/>
          <span class="hash">${sig.verificationHash}</span>
        </div>
      </div>
    `;
  };

  const historyRowsHtml = (movement.auditHistory || [])
    .map(
      ev => `
      <tr>
        <td>${formatDateTimeAr(ev.timestamp)}</td>
        <td><strong>${ev.action}</strong></td>
        <td>${ev.actorName}<br/><span class="sub">${ev.actorRole || ''}</span></td>
        <td>${ev.details || '-'}<br/><span class="hash">${ev.verificationHash || ''}</span></td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Guia_Transito_${guideNum.replace(/[^a-zA-Z0-9_-]/g, '_')}</title>
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        body { font-family: 'Courier New', Courier, monospace; color: #0f172a; margin: 0; padding: 12px; font-size: 10.5px; line-height: 1.38; }
        .doc-frame { border: 2px solid #0f172a; border-radius: 8px; padding: 14px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #059669; padding-bottom: 10px; margin-bottom: 12px; }
        .badge { display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #6ee7b7; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase; }
        .title { font-size: 15px; font-weight: 900; text-transform: uppercase; margin: 4px 0 2px 0; color: #0f172a; }
        .subtitle { font-size: 9.5px; color: #475569; font-weight: bold; }
        .doc-box { border: 2px solid #0f172a; border-radius: 6px; padding: 8px 12px; text-align: right; background: #f8fafc; min-width: 230px; }
        .doc-num { font-size: 12px; font-weight: 900; color: #047857; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .panel { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; background: #ffffff; }
        .panel-title { font-size: 9px; font-weight: 900; text-transform: uppercase; color: #065f46; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 6px; }
        .kv { margin-bottom: 3px; font-size: 10px; }
        .kv span { color: #64748b; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9.5px; }
        th { background: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 8.5px; padding: 6px 8px; text-align: left; }
        th.num, td.num { text-align: right; }
        td { padding: 6px 8px; border: 1px solid #cbd5e1; vertical-align: top; }
        .sub { font-size: 8.5px; color: #64748b; }
        .sig-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 8px; margin-bottom: 10px; page-break-inside: avoid; }
        .sig-card { border: 1.5px solid #94a3b8; border-radius: 6px; padding: 8px; background: #f8fafc; display: flex; flex-direction: column; justify-content: space-between; }
        .sig-card.signed { border-color: #059669; background: #f0fdf4; }
        .sig-header { font-size: 8.5px; font-weight: 900; text-transform: uppercase; color: #065f46; border-bottom: 1px solid #bbf7d0; padding-bottom: 4px; margin-bottom: 6px; text-align: center; }
        .sig-img-wrap { height: 66px; display: flex; align-items: center; justify-content: center; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 4px; margin-bottom: 6px; overflow: hidden; }
        .sig-img { max-height: 62px; max-width: 100%; object-fit: contain; }
        .sig-placeholder { height: 66px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 9px; font-weight: bold; text-align: center; border: 1px dashed #cbd5e1; border-radius: 4px; margin-bottom: 6px; background: #fff; }
        .sig-meta { font-size: 8.5px; line-height: 1.35; color: #1e293b; }
        .hash { font-size: 7.5px; color: #047857; font-weight: bold; word-break: break-all; display: inline-block; margin-top: 2px; }
        .footer { border-top: 1.5px solid #0f172a; padding-top: 6px; margin-top: 8px; display: flex; justify-content: space-between; font-size: 8.5px; color: #475569; }
      </style>
    </head>
    <body>
      <div class="doc-frame">
        <div class="header">
          <div>
            <span class="badge">ARICCAME · INASE · SENASA · Trazabilidad Oficial Ley 27.669</span>
            <div class="title">Guía Única de Tránsito y Remito Oficial de Semilla</div>
            <div class="subtitle">Red Cooperativa PatagonianC LTDA · Sistema de Cadena de Custodia Nucleus Trace</div>
            <div style="font-size:9px; margin-top:4px;">
              <strong>Campaña Agrícola:</strong> ${movement.campaign || '2025/2026'} ·
              <strong>Estado Documental:</strong> ${movement.status === 'Recibido' ? 'ENTREGADO Y CONFORMADO EN DESTINO' : 'EN TRÁNSITO OFICIAL'} (${sigCount}/3 Firmas Electrónicas) ·
              <strong>Oficialización TAD (ARICCAME):</strong> ${movement.tadDocumentUrl ? `✓ OFICIALIZADA (${movement.tadDocumentName || 'PDF TAD Adjunto'})` : 'En trámite / Sin PDF TAD adjunto'}
            </div>
          </div>
          <div class="doc-box">
            <div style="font-size:8.5px; font-weight:bold; text-transform:uppercase; color:#64748b;">N° Guía Oficial ARICCAME</div>
            <div class="doc-num">${guideNum}</div>
            <div style="font-size:9.5px; font-weight:bold; margin-top:3px;">Remito N°: ${remitoNum}</div>
            <div style="font-size:8.5px; color:#475569;">Precinto SENASA: <strong>${precintoNum}</strong></div>
            <div style="font-size:8.5px; color:#047857; font-weight:bold;">TAD ARICCAME: ${movement.tadDocumentUrl ? '✓ PDF APROBADO CARGADO' : 'PENDIENTE PDF TAD'}</div>
            <div style="font-size:8.5px; color:#0f172a; margin-top:2px;">Emisión: <strong>${dateAr} ${movement.dispatchTime ? `· ${movement.dispatchTime} hs` : ''}</strong></div>
          </div>
        </div>

        <div class="grid-2">
          <div class="panel">
            <div class="panel-title">1. Establecimiento Emisor / Planta de Origen</div>
            <div class="kv"><span>Planta / Nodo Custodia:</span> <strong>${originName}</strong></div>
            <div class="kv"><span>Ubicación Geográfica:</span> <strong>${originCity}</strong></div>
            <div class="kv"><span>Entidad Titular:</span> <strong>HempC de PatagonianC LTDA</strong></div>
            <div class="kv"><span>Responsable Despacho:</span> <strong>${sig1?.signedBy || 'Gastón Barea Moreno'}</strong></div>
          </div>
          <div class="panel">
            <div class="panel-title">2. Establecimiento Destinatario & Depósito Receptor</div>
            <div class="kv"><span>Estructura Productiva:</span> <strong>${clientName}</strong></div>
            <div class="kv"><span>Depósito de Destino:</span> <strong>${targetName} (${targetCity})</strong></div>
            <div class="kv"><span>Responsable Recepción:</span> <strong>${movement.recipientName || sig3?.signedBy || 'Responsable de Campo'}</strong></div>
            <div class="kv"><span>Credencial / DNI Receptor:</span> <strong>${movement.recipientDni || sig3?.dniOrMatricula || 'Verificado en Red'}</strong></div>
          </div>
        </div>

        <div class="panel-title" style="margin-bottom:4px;">3. Detalle Técnico del Material Biológico Transportado (Semilla Fiscalizada)</div>
        <table>
          <thead>
            <tr>
              <th>Código Lote Madre</th>
              <th>Genética / Cultivar</th>
              <th>Obtentor / Proveedor</th>
              <th>Certif. / Rótulo INASE</th>
              <th>Calidad QA (PG / Pureza)</th>
              <th class="num">Masa Neta (KG)</th>
              <th class="num">Equivalente (Gramos)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${ctx.batch?.batchCode || 'LOTE-OFICIAL'}</strong><br/><span class="sub">Cat. ${ctx.batch?.category || 'C1 Fiscalizada'}</span></td>
              <td><strong>${vName}</strong><br/><span class="sub">THC &lt;0.2% Autorizado</span></td>
              <td>${supName}</td>
              <td>Cert: <strong>${ctx.batch?.certificationNumber || 'INASE'}</strong><br/><span class="sub">Rótulo: ${ctx.batch?.labelSerialNumber || '00000012'}</span></td>
              <td>1° PG: ${ctx.batch?.breederGerminationPct || 90}% ➔ 2° PG QA: <strong>${ctx.batch?.coopGerminationPct || ctx.batch?.germination || 92}%</strong><br/><span class="sub">Pureza: ${ctx.batch?.purity || 100}% · Grado A</span></td>
              <td class="num"><strong style="font-size:12px;">${qtyKg.toFixed(3)} kg</strong></td>
              <td class="num"><strong style="font-size:11px; color:#047857;">${qtyGr.toLocaleString('es-AR')} gr</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="panel" style="margin-bottom:10px;">
          <div class="panel-title">4. Datos de Transporte, Unidad Habilitada e Itinerario de Custodia</div>
          <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px;">
            <div class="kv"><span>Empresa Transportista:</span><br/><strong>${movement.transportCompany || 'Cooperativa PatagonianC LTDA'} (${movement.transportType || 'Propio'})</strong></div>
            <div class="kv"><span>Conductor / Chofer:</span><br/><strong>${movement.driverName || 'Chofer Autorizado'}</strong> (DNI/CUIT: ${movement.driverDni || 'Verificado'})</div>
            <div class="kv"><span>Vehículo y Dominio:</span><br/><strong>${movement.vehicleModel || 'Unidad Logística'} · Patente: ${movement.vehiclePlate || 'Oficial'}</strong></div>
            <div class="kv"><span>Hoja de Ruta / Itinerario:</span><br/><strong>${movement.routeItinerary || `${originName} -> ${targetName}`}</strong></div>
          </div>
          ${movement.notes ? `<div style="margin-top:6px; font-size:9px; color:#334155; border-top:1px dashed #cbd5e1; padding-top:4px;"><strong>Observaciones de Guía:</strong> ${movement.notes}</div>` : ''}
        </div>

        <div class="panel-title" style="margin-bottom:4px;">5. Triple Certificación y Firma Electrónica Criptográfica (Emisor · Transportista · Receptor)</div>
        <div class="sig-grid">
          ${renderSigBoxHtml('1° Firma: Emisor (Planta Origen)', 'Despacho Planta Central', sig1)}
          ${renderSigBoxHtml('2° Firma: Transportista (Porte)', 'Conformidad de Carga en Tránsito', sig2)}
          ${renderSigBoxHtml('3° Firma: Receptor (Destino)', 'Recepción Conforme en Campo', sig3)}
        </div>

        ${
          historyRowsHtml
            ? `
          <div class="panel-title" style="margin-bottom:4px;">6. Historial Inmutable de Auditoría y Trazabilidad de la Guía</div>
          <table>
            <thead>
              <tr>
                <th style="width:18%;">Fecha y Hora</th>
                <th style="width:26%;">Hito / Acción Registrada</th>
                <th style="width:22%;">Interviniente & Rol</th>
                <th style="width:34%;">Detalle & Sello SHA-256</th>
              </tr>
            </thead>
            <tbody>
              ${historyRowsHtml}
            </tbody>
          </table>
        `
            : ''
        }

        <div class="footer">
          <div>Documento electrónico oficial generado y almacenado en <strong>Nucleus Trace V7.30.0-STABLE</strong></div>
          <div>ID Registro: ${movement.id} · Archivo: ${movement.archivedAt ? formatDateTimeAr(movement.archivedAt) : 'Activo'}</div>
        </div>
      </div>
    </body>
    </html>
  `;

  triggerIframePrint(html);
};

export const printMovementsHistoryLedgerPDF = (
  movements: SeedMovement[],
  resolveCtx: (m: SeedMovement) => TransitGuideContextData,
  filterSummaryText: string
) => {
  const issueDateAr = formatDateAr(new Date().toISOString().split('T')[0]);
  const totalKg = Number(movements.reduce((acc, m) => acc + (m.quantity || 0), 0).toFixed(3));
  const totalGr = Math.round(totalKg * 1000);
  const receivedCount = movements.filter(m => m.status === 'Recibido').length;
  const fullySignedCount = movements.filter(
    m => m.issuerSignature && m.carrierSignature && m.receiverSignature
  ).length;

  const rowsHtml = movements
    .map((m, idx) => {
      const ctx = resolveCtx(m);
      const vName = ctx.variety?.name || 'Semilla';
      const supName = ctx.supplier?.name || '';
      const targetName = ctx.targetStorage?.name || 'Destino';
      const clientName = ctx.client?.name || targetName;
      const qtyKg = Number((m.quantity || 0).toFixed(3));
      const qtyGr = Math.round(qtyKg * 1000);
      const s1 = m.issuerSignature ? `✓ ${m.issuerSignature.signedBy}` : 'Pendiente';
      const s2 = m.carrierSignature ? `✓ ${m.carrierSignature.signedBy}` : 'Pendiente';
      const s3 = m.receiverSignature ? `✓ ${m.receiverSignature.signedBy}` : 'Pendiente';
      return `
        <tr>
          <td><strong>${idx + 1}</strong></td>
          <td>
            <strong>${m.transportGuideNumber || 'S/N'}</strong><br/>
            <span class="sub">Remito: ${m.remitoNumber || '-'} · Precinto: ${m.precintoNumber || '-'}</span><br/>
            <span class="sub" style="color:${m.tadDocumentUrl ? '#047857' : '#b45309'}; font-weight:bold;">${m.tadDocumentUrl ? `✓ TAD Oficializada (${m.tadDocumentName || 'PDF'})` : 'Sin PDF TAD'}</span>
          </td>
          <td>${formatDateAr(m.date)}<br/><span class="sub">${m.dispatchTime || '08:00'} hs</span></td>
          <td>
            <strong>${vName}</strong> (${supName})<br/>
            <span class="sub">Lote: ${ctx.batch?.batchCode || '-'}</span>
          </td>
          <td>
            <strong>${clientName}</strong><br/>
            <span class="sub">${targetName} · ${m.routeItinerary || ''}</span>
          </td>
          <td>
            ${m.driverName || '-'}<br/>
            <span class="sub">${m.transportCompany || ''} · Dom: ${m.vehiclePlate || '-'}</span>
          </td>
          <td class="num">
            <strong>${qtyKg.toFixed(3)} kg</strong><br/>
            <span class="sub">${qtyGr.toLocaleString('es-AR')} gr</span>
          </td>
          <td>
            <div style="font-size:8px; line-height:1.3;">
              <strong>1. Origen:</strong> ${s1}<br/>
              <strong>2. Porte:</strong> ${s2}<br/>
              <strong>3. Destino:</strong> ${s3}
            </div>
          </td>
          <td style="text-align:center;">
            <strong>${m.status || 'Recibido'}</strong><br/>
            <span class="sub">${m.issuerSignature && m.carrierSignature && m.receiverSignature ? '3/3 Firmas OK' : 'En proceso'}</span>
          </td>
        </tr>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Libro_Historico_Guias_Transito_y_Remitos_${issueDateAr.replace(/\//g, '-')}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        body { font-family: 'Courier New', Courier, monospace; color: #0f172a; margin: 0; padding: 12px; font-size: 10px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 12px; }
        .title { font-size: 15px; font-weight: 900; text-transform: uppercase; margin: 2px 0; }
        .badge { display: inline-block; background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; padding: 2px 8px; border-radius: 4px; font-size: 8.5px; font-weight: bold; text-transform: uppercase; }
        .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
        .kpi { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; background: #f8fafc; }
        .kpi-label { font-size: 8px; text-transform: uppercase; color: #64748b; font-weight: bold; }
        .kpi-val { font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; font-size: 9px; }
        th { background: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 8px; padding: 5px 6px; text-align: left; }
        th.num, td.num { text-align: right; }
        td { padding: 5px 6px; border-bottom: 1px solid #cbd5e1; vertical-align: top; }
        tfoot td { background: #f1f5f9; font-weight: 900; border-top: 2px solid #0f172a; }
        .sub { font-size: 8px; color: #64748b; font-weight: normal; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <span class="badge">Archivo Oficial ARICCAME / INASE / SENASA · Cadena de Custodia</span>
          <div class="title">Libro Histórico de Guías de Tránsito, Remitos y Firmas Electrónicas</div>
          <div>Red Cooperativa PatagonianC LTDA · Filtro Aplicado: ${filterSummaryText}</div>
        </div>
        <div style="text-align:right; font-size:9.5px;">
          <div><strong>Fecha de Emisión:</strong> ${issueDateAr}</div>
          <div><strong>Total Guías en Libro:</strong> ${movements.length} remitos</div>
          <div><strong>Masa Total Movilizada:</strong> ${totalKg.toFixed(3)} kg (${totalGr.toLocaleString('es-AR')} gr)</div>
        </div>
      </div>

      <div class="kpis">
        <div class="kpi">
          <div class="kpi-label">Total Guías Listadas</div>
          <div class="kpi-val">${movements.length} Guías Oficiales</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Volumen Total Despachado</div>
          <div class="kpi-val">${totalKg.toFixed(3)} kg (${totalGr.toLocaleString('es-AR')} gr)</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Guías Recibidas en Destino</div>
          <div class="kpi-val">${receivedCount} de ${movements.length}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Triple Firma Electrónica (3/3)</div>
          <div class="kpi-val">${fullySignedCount} Guías Archivadas</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Guía ARICCAME & Remito</th>
            <th>Fecha / Hora</th>
            <th>Variedad & Lote Madre</th>
            <th>Establecimiento Destino & Ruta</th>
            <th>Transporte & Chofer</th>
            <th class="num">Masa Despachada</th>
            <th>Firmas Electrónicas (1·2·3)</th>
            <th style="text-align:center;">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="6">TOTAL CONSOLIDADO DEL HISTORIAL DE GUÍAS Y REMITOS (${movements.length} REGISTROS)</td>
            <td class="num">${totalKg.toFixed(3)} kg (${totalGr.toLocaleString('es-AR')} gr)</td>
            <td colspan="2" style="text-align:center;">${fullySignedCount} Guías con Triple Firma Completa</td>
          </tr>
        </h6>
      </table>
    </body>
    </html>
  `;

  triggerIframePrint(html);
};

interface TransitGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  movement: SeedMovement;
  initialTab?: 'preview' | 'sign' | 'history' | 'tad';
  initialRole?: SignatureRoleKey;
  contextData: TransitGuideContextData;
  onSaveMovement: (updated: SeedMovement, confirmReceptionSync?: boolean) => Promise<void>;
  canManageAdmin?: boolean;
}

export const TransitGuideModal: React.FC<TransitGuideModalProps> = ({
  isOpen,
  onClose,
  movement,
  initialTab = 'preview',
  initialRole = 'receiver',
  contextData,
  onSaveMovement,
  canManageAdmin = true
}) => {
  const [modalTab, setModalTab] = useState<'preview' | 'sign' | 'history' | 'tad'>(
    !canManageAdmin && initialTab === 'sign' ? 'preview' : initialTab
  );
  const [selectedRole, setSelectedRole] = useState<SignatureRoleKey>(initialRole);
  const [sigMode, setSigMode] = useState<'handwritten' | 'digital_seal'>('handwritten');
  const [signerName, setSignerName] = useState('');
  const [signerDni, setSignerDni] = useState('');
  const [signerRoleTitle, setSignerRoleTitle] = useState('');
  const [sigDate, setSigDate] = useState(movement.date || new Date().toISOString().split('T')[0]);
  const [sigTime, setSigTime] = useState('18:00');
  const [receivedKg, setReceivedKg] = useState<number>(movement.quantity || 0);
  const [conformity, setConformity] = useState<'CONFORME' | 'CON_OBSERVACIONES'>('CONFORME');
  const [observations, setObservations] = useState('');
  const [confirmReceptionCheck, setConfirmReceptionCheck] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasDrawnCanvas, setHasDrawnCanvas] = useState(false);
  const [newAuditNote, setNewAuditNote] = useState('');
  const [tadApprovalInput, setTadApprovalInput] = useState(
    movement.tadApprovalNumber || movement.transportGuideNumber || ''
  );
  const [tadUploadNotice, setTadUploadNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const tadFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setModalTab(!canManageAdmin && initialTab === 'sign' ? 'preview' : initialTab);
    setSelectedRole(initialRole);
    setTadApprovalInput(movement.tadApprovalNumber || movement.transportGuideNumber || '');
    setTadUploadNotice(null);
  }, [initialTab, initialRole, movement.id, canManageAdmin]);

  // Pre-fill form fields when role changes
  useEffect(() => {
    const existingSig =
      selectedRole === 'issuer'
        ? movement.issuerSignature
        : selectedRole === 'carrier'
        ? movement.carrierSignature
        : movement.receiverSignature;

    if (existingSig) {
      setSignerName(existingSig.signedBy || '');
      setSignerDni(existingSig.dniOrMatricula || '');
      setSignerRoleTitle(existingSig.role || '');
      const parts = (existingSig.signedAt || '').split(' ');
      setSigDate(parts[0] || movement.date || new Date().toISOString().split('T')[0]);
      setSigTime(parts[1] || '18:00');
      setReceivedKg(existingSig.receivedQuantityKg ?? movement.quantity);
      setConformity(existingSig.conformityStatus || 'CONFORME');
      setObservations(existingSig.observations || '');
    } else {
      if (selectedRole === 'issuer') {
        setSignerName('Gastón Barea Moreno');
        setSignerDni('21.820.534 / Dir. Custodia BioC #1');
        setSignerRoleTitle('Emisor & Custodia Central (Planta BioC Warehousing 1#)');
        setSigDate(movement.date || new Date().toISOString().split('T')[0]);
        setSigTime(movement.dispatchTime || '08:00');
        setObservations('Despacho verificado con precinto intacto y certificado QA aprobado.');
      } else if (selectedRole === 'carrier') {
        setSignerName(movement.driverName || movement.transportCompany || 'Transportista Oficial');
        setSignerDni(movement.driverDni || movement.vehiclePlate || 'Hab. ARICCAME');
        setSignerRoleTitle(
          `Transportista (${movement.transportCompany || 'Logística Oficial'}${
            movement.vehiclePlate ? ` · Dom. ${movement.vehiclePlate}` : ''
          })`
        );
        setSigDate(movement.date || new Date().toISOString().split('T')[0]);
        setSigTime(movement.dispatchTime || '08:15');
        setObservations('Carga recibida conforme en unidad de transporte habilitada.');
      } else {
        setSignerName(movement.recipientName || contextData.client?.contactName || 'Responsable de Recepción');
        setSignerDni(movement.recipientDni || 'Credencial Red HempC');
        setSignerRoleTitle('Responsable de Recepción en Establecimiento Destino');
        setSigDate(movement.date || new Date().toISOString().split('T')[0]);
        setSigTime('18:30');
        setReceivedKg(movement.quantity);
        setConformity('CONFORME');
        setObservations(
          `Recepción conforme de ${movement.quantity.toFixed(3)} kg (${Math.round(
            movement.quantity * 1000
          )} gr) en depósito destino.`
        );
      }
    }
    clearCanvas();
  }, [selectedRole, movement]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Línea de base punteada sutil
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(24, canvas.height - 26);
    ctx.lineTo(canvas.width - 24, canvas.height - 26);
    ctx.stroke();
    ctx.setLineDash([]);
    setHasDrawnCanvas(false);
  };

  useEffect(() => {
    if (modalTab === 'sign' && sigMode === 'handwritten') {
      setTimeout(() => clearCanvas(), 50);
    }
  }, [modalTab, sigMode]);

  if (!isOpen) return null;

  const getPointerPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPointerPos(e);
    isDrawingRef.current = true;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const drawMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPointerPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawnCanvas(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const handleSaveSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim()) {
      alert('Por favor ingrese el Nombre y Apellido del firmante.');
      return;
    }

    setIsSaving(true);
    try {
      const timestamp = `${sigDate || new Date().toISOString().split('T')[0]} ${sigTime || '12:00'}`;
      const hash = generateSignatureHash(`${movement.id}-${selectedRole}-${signerName.trim()}-${timestamp}`);

      let finalSignatureDataUrl = '';
      if (sigMode === 'handwritten' && hasDrawnCanvas && canvasRef.current) {
        finalSignatureDataUrl = canvasRef.current.toDataURL('image/png');
      } else {
        const roleTag =
          selectedRole === 'issuer'
            ? 'DESPACHO PLANTA CENTRAL'
            : selectedRole === 'carrier'
            ? 'CONFORMIDAD DE PORTE'
            : 'RECEPCIÓN CONFORME DESTINO';
        finalSignatureDataUrl = generateCalligraphicSignatureDataUrl(signerName.trim(), roleTag, hash);
      }

      const newSigRecord: ElectronicSignatureRecord = {
        signedBy: signerName.trim(),
        dniOrMatricula: signerDni.trim() || 'Verificado',
        role: signerRoleTitle.trim() || 'Responsable Autorizado',
        signedAt: timestamp,
        signatureDataUrl: finalSignatureDataUrl,
        signatureMode: sigMode === 'handwritten' && hasDrawnCanvas ? 'handwritten' : 'digital_seal',
        verificationHash: hash,
        observations: observations.trim() || undefined,
        ...(selectedRole === 'receiver'
          ? {
              receivedQuantityKg: Number(Number(receivedKg || movement.quantity).toFixed(3)),
              conformityStatus: conformity
            }
          : {})
      };

      const actionTitle =
        selectedRole === 'issuer'
          ? 'FIRMA ELECTRÓNICA DE EMISIÓN Y DESPACHO (ORIGEN)'
          : selectedRole === 'carrier'
          ? 'FIRMA ELECTRÓNICA DE CONFORMIDAD DE PORTE (TRANSPORTE)'
          : 'FIRMA ELECTRÓNICA DE RECEPCIÓN EN DESTINO Y ARCHIVO';

      const newAuditEvent: MovementAuditEvent = {
        id: `aud-${selectedRole}-${Date.now()}`,
        timestamp,
        action: actionTitle,
        actorName: newSigRecord.signedBy,
        actorRole: newSigRecord.role,
        details:
          selectedRole === 'receiver'
            ? `Recepción firmada electrónicamente por ${newSigRecord.receivedQuantityKg?.toFixed(3)} kg (${Math.round(
                (newSigRecord.receivedQuantityKg || 0) * 1000
              )} gr). Estado: ${conformity}. ${observations || ''}`.trim()
            : `Firma electrónica registrada (${
                newSigRecord.signatureMode === 'handwritten' ? 'Trazo Manuscrito Digital' : 'Sello Criptográfico Homologado'
              }). ${observations || ''}`.trim(),
        verificationHash: hash
      };

      const nextIssuer = selectedRole === 'issuer' ? newSigRecord : movement.issuerSignature;
      const nextCarrier = selectedRole === 'carrier' ? newSigRecord : movement.carrierSignature;
      const nextReceiver = selectedRole === 'receiver' ? newSigRecord : movement.receiverSignature;

      const shouldMarkReceived =
        movement.status === 'Recibido' || (selectedRole === 'receiver' && confirmReceptionCheck);

      const updatedMov: SeedMovement = {
        ...movement,
        status: shouldMarkReceived ? 'Recibido' : movement.status,
        recipientName:
          selectedRole === 'receiver' ? newSigRecord.signedBy : movement.recipientName,
        recipientDni:
          selectedRole === 'receiver' && newSigRecord.dniOrMatricula
            ? newSigRecord.dniOrMatricula
            : movement.recipientDni,
        driverName:
          selectedRole === 'carrier' ? newSigRecord.signedBy : movement.driverName,
        issuerSignature: nextIssuer,
        carrierSignature: nextCarrier,
        receiverSignature: nextReceiver,
        auditHistory: [...(movement.auditHistory || []), newAuditEvent],
        archivedAt:
          nextIssuer && nextCarrier && nextReceiver
            ? timestamp
            : movement.archivedAt
      };

      await onSaveMovement(
        updatedMov,
        selectedRole === 'receiver' && confirmReceptionCheck && movement.status !== 'Recibido'
      );
      setModalTab('preview');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAuditNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuditNote.trim()) return;
    setIsSaving(true);
    try {
      const nowIso = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toTimeString().slice(0, 5);
      const timestamp = `${nowIso} ${nowTime}`;
      const actor = contextData.currentUserName || 'Gastón Barea Moreno';
      const hash = generateSignatureHash(`${movement.id}-NOTE-${timestamp}-${newAuditNote}`);

      const noteEvent: MovementAuditEvent = {
        id: `aud-note-${Date.now()}`,
        timestamp,
        action: 'REGISTRO DE CONTROL / NOVEDAD EN BITÁCORA DE GUÍA',
        actorName: actor,
        actorRole: 'Auditoría Logística & Custodia',
        details: newAuditNote.trim(),
        verificationHash: hash
      };

      const updatedMov: SeedMovement = {
        ...movement,
        auditHistory: [...(movement.auditHistory || []), noteEvent]
      };
      await onSaveMovement(updatedMov, false);
      setNewAuditNote('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canManageAdmin) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setTadUploadNotice({
        type: 'err',
        text: 'Formato inválido: Seleccione únicamente un archivo PDF oficial emitido en el TAD (ARICCAME).'
      });
      return;
    }

    setIsSaving(true);
    setTadUploadNotice(null);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = String(reader.result || '');
        const nowIso = new Date().toISOString().split('T')[0];
        const nowTime = new Date().toTimeString().slice(0, 5);
        const timestamp = `${nowIso} ${nowTime}`;
        const uploader = contextData.currentUserName || 'Gastón Barea Moreno';
        const approvalCode = (tadApprovalInput || movement.transportGuideNumber || 'TAD-ARICCAME').trim();
        const hash = generateSignatureHash(`${movement.id}-TAD-ARICCAME-${file.name}-${timestamp}`);

        const tadAuditEvent: MovementAuditEvent = {
          id: `aud-tad-${Date.now()}`,
          timestamp,
          action: 'OFICIALIZACIÓN DE GUÍA — CARGA DE DOCUMENTO PDF APROBADO EN TAD (ARICCAME)',
          actorName: uploader,
          actorRole: 'Administración Central & Custodia Regulatoria',
          details: `Se adjuntó y oficializó el documento PDF de Guía Aprobada en el TAD (ARICCAME): "${file.name}" (Expediente/Guía: ${approvalCode}). El tránsito se encuentra formalmente aprobado y disponible para descarga.`,
          verificationHash: hash
        };

        const updatedMov: SeedMovement = {
          ...movement,
          tadDocumentUrl: dataUrl,
          tadDocumentName: file.name,
          tadApprovalNumber: approvalCode,
          tadUploadedAt: timestamp,
          tadUploadedBy: uploader,
          auditHistory: [...(movement.auditHistory || []), tadAuditEvent]
        };

        await onSaveMovement(updatedMov, false);
        setTadUploadNotice({
          type: 'ok',
          text: `Documento "${file.name}" cargado con éxito. La Guía de Tránsito quedó OFICIALIZADA por ARICCAME / TAD.`
        });
      } catch {
        setTadUploadNotice({
          type: 'err',
          text: 'No se pudo almacenar el documento PDF. Intente con un archivo PDF más liviano.'
        });
      } finally {
        setIsSaving(false);
        if (tadFileInputRef.current) tadFileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setIsSaving(false);
      setTadUploadNotice({ type: 'err', text: 'Error al leer el archivo PDF seleccionado.' });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveTadPdf = async () => {
    if (!canManageAdmin || !movement.tadDocumentUrl) return;
    setIsSaving(true);
    try {
      const nowIso = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toTimeString().slice(0, 5);
      const timestamp = `${nowIso} ${nowTime}`;
      const uploader = contextData.currentUserName || 'Gastón Barea Moreno';
      const removedName = movement.tadDocumentName || 'Documento TAD';
      const hash = generateSignatureHash(`${movement.id}-TAD-REMOVE-${timestamp}`);

      const removeEvent: MovementAuditEvent = {
        id: `aud-tad-rem-${Date.now()}`,
        timestamp,
        action: 'BAJA / REEMPLAZO DE DOCUMENTO PDF TAD (ARICCAME)',
        actorName: uploader,
        actorRole: 'Administración Central',
        details: `Se desvinculó el archivo PDF "${removedName}" para su actualización administrativa.`,
        verificationHash: hash
      };

      const updatedMov: SeedMovement = {
        ...movement,
        tadDocumentUrl: '',
        tadDocumentName: '',
        tadUploadedAt: '',
        tadUploadedBy: '',
        auditHistory: [...(movement.auditHistory || []), removeEvent]
      };
      await onSaveMovement(updatedMov, false);
      setTadUploadNotice({
        type: 'ok',
        text: 'El archivo PDF TAD anterior fue desvinculado.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const qtyKg = Number((movement.quantity || 0).toFixed(3));
  const qtyGr = Math.round(qtyKg * 1000);
  const vName = contextData.variety?.name || 'Semilla Fiscalizada';
  const supName = contextData.supplier?.name || (vName === 'Yuma' ? 'Ananda Pampa' : 'HEMPIT France');
  const originName = contextData.originStorage?.name || 'BioC Warehousing 1# (Planta Central)';
  const targetName = contextData.targetStorage?.name || 'Depósito Receptor';
  const clientName = contextData.client?.name || targetName;
  const sigCount = [
    movement.issuerSignature,
    movement.carrierSignature,
    movement.receiverSignature
  ].filter(Boolean).length;
  const hasTadPdf = Boolean(movement.tadDocumentUrl);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[80] p-3 sm:p-5 font-mono">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[94vh] flex flex-col overflow-hidden">
        {/* CABECERA SUPERIOR DEL VISOR Y CENTRO DE FIRMA ELECTRÓNICA */}
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap justify-between items-center gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/40 text-sky-400 flex items-center justify-center">
              <FileCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Guía Oficial ARICCAME / INASE
                </span>
                <span className="text-[10px] text-slate-400">
                  Remito: <strong className="text-white">{movement.remitoNumber || 'R-0001-0002526'}</strong>
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-tight mt-0.5">
                {movement.transportGuideNumber || 'GUÍA DE TRÁNSITO OFICIAL'} · {vName} ({qtyKg.toFixed(3)} kg / {qtyGr} gr)
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasTadPdf && (
              <button
                type="button"
                onClick={() => downloadTadDocumentPdf(movement)}
                className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow transition cursor-pointer"
                title={`Descargar ${movement.tadDocumentName || 'PDF Guía Aprobada TAD ARICCAME'}`}
              >
                <Download size={14} />
                <span>Descargar PDF TAD (ARICCAME)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => printSingleTransitGuidePDF(movement, contextData)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Printer size={14} />
              <span>Descargar / Imprimir Remito (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* INPUT OCULTO PARA SUBIR ARCHIVO PDF DE LA GUÍA APROBADA EN EL TAD (ARICCAME) */}
        {canManageAdmin && (
          <input
            ref={tadFileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleTadFileChange}
            className="hidden"
          />
        )}

        {/* BARRA DE NAVEGACIÓN INTERNA */}
        <div className="px-6 py-2.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setModalTab('preview')}
              className={`px-3.5 py-1.5 rounded-xl font-black uppercase flex items-center gap-1.5 transition cursor-pointer ${
                modalTab === 'preview'
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText size={14} />
              <span>1. Vista Previa Remito PDF</span>
            </button>
            <button
              type="button"
              onClick={() => setModalTab('tad')}
              className={`px-3.5 py-1.5 rounded-xl font-black uppercase flex items-center gap-1.5 transition cursor-pointer ${
                modalTab === 'tad'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileCheck size={14} />
              <span>
                2. Guía Aprobada TAD / ARICCAME ({hasTadPdf ? '✓ PDF Oficializado' : 'Pendiente PDF'})
              </span>
            </button>
            {canManageAdmin && (
              <button
                type="button"
                onClick={() => setModalTab('sign')}
                className={`px-3.5 py-1.5 rounded-xl font-black uppercase flex items-center gap-1.5 transition cursor-pointer ${
                  modalTab === 'sign'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <PenTool size={14} />
                <span>3. Firmar Electrónicamente ({sigCount}/3)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setModalTab('history')}
              className={`px-3.5 py-1.5 rounded-xl font-black uppercase flex items-center gap-1.5 transition cursor-pointer ${
                modalTab === 'history'
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History size={14} />
              <span>
                {canManageAdmin ? '4.' : '3.'} Historial y Archivo ({(movement.auditHistory || []).length})
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            <span
              className={`px-2.5 py-1 rounded-lg font-black uppercase flex items-center gap-1 ${
                hasTadPdf
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
              }`}
            >
              <FileCheck size={12} />
              <span>{hasTadPdf ? 'TAD ARICCAME Oficializada' : 'Sin PDF TAD Adjunto'}</span>
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg font-black uppercase flex items-center gap-1 ${
                sigCount === 3
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
              }`}
            >
              <ShieldCheck size={12} />
              <span>{sigCount === 3 ? '3/3 Firmas OK' : `${sigCount}/3 Firmas`}</span>
            </span>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL DEL MODAL */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/60 dark:bg-slate-950/40">
          {modalTab === 'preview' && (
            /* HOJA A4 INTERACTIVA DE LA GUÍA DE TRÁNSITO Y REMITO OFICIAL */
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-2xl p-6 shadow-md max-w-4xl mx-auto space-y-5 text-xs">
              {/* ENCABEZADO OFICIAL DE LA GUÍA */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b-2 border-emerald-600 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[9px] font-black uppercase">
                      ARICCAME · INASE · SENASA · Ley 27.669
                    </span>
                    <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[9px] font-black uppercase">
                      Campaña {movement.campaign || '2025/2026'}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Guía Única de Tránsito & Remito Oficial de Semilla Fiscalizada
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold">
                    Red Cooperativa PatagonianC LTDA · Sistema de Cadena de Custodia Biológica Nucleus Trace
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-900 dark:border-slate-600 rounded-xl p-3 text-right min-w-[250px]">
                  <span className="text-[9px] font-black uppercase text-slate-400 block">
                    Expediente / Guía Oficial ARICCAME
                  </span>
                  <strong className="text-sm font-black text-emerald-700 dark:text-emerald-400 block">
                    {movement.transportGuideNumber || 'S/N'}
                  </strong>
                  <div className="text-[10px] text-slate-700 dark:text-slate-300 mt-1 space-y-0.5">
                    <div>
                      Remito Oficial: <strong>{movement.remitoNumber || 'R-0001-0002526'}</strong>
                    </div>
                    <div>
                      Precinto SENASA: <strong>{movement.precintoNumber || 'PREC-SENASA'}</strong>
                    </div>
                    <div>
                      Fecha Despacho: <strong>{formatDateAr(movement.date)}</strong>{' '}
                      {movement.dispatchTime && `· ${movement.dispatchTime} hs`}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 1 Y 2: ORIGEN Y DESTINO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5">
                  <div className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 border-b border-slate-200 dark:border-slate-700 pb-1 mb-2 flex items-center gap-1.5">
                    <Package size={13} />
                    <span>1. Planta Emisora / Nodo de Origen</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Depósito Origen:</span>{' '}
                    <strong className="text-slate-900 dark:text-white">{originName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Localidad / Provincia:</span>{' '}
                    <strong>{contextData.originStorage?.city || 'Parque Industrial Trelew, Chubut'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Entidad Emisora:</span>{' '}
                    <strong>HempC de PatagonianC LTDA</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Responsable Despacho:</span>{' '}
                    <strong>{movement.issuerSignature?.signedBy || 'Gastón Barea Moreno'}</strong>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5">
                  <div className="text-[10px] font-black uppercase text-sky-700 dark:text-sky-400 border-b border-slate-200 dark:border-slate-700 pb-1 mb-2 flex items-center gap-1.5">
                    <MapPin size={13} />
                    <span>2. Establecimiento Destinatario & Recepción</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Estructura / Socio:</span>{' '}
                    <strong className="text-slate-900 dark:text-white">{clientName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Depósito Destino:</span>{' '}
                    <strong>
                      {targetName} ({contextData.targetStorage?.city || 'Patagonia'})
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Responsable Recepción:</span>{' '}
                    <strong>
                      {movement.recipientName ||
                        movement.receiverSignature?.signedBy ||
                        'Responsable de Campo'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Estado de Recepción:</span>{' '}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        movement.status === 'Recibido'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {movement.status || 'Recibido'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: DETALLE DEL MATERIAL BIOLÓGICO */}
              <div>
                <div className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-600" />
                  <span>3. Especificación Técnica del Material Biológico Transportado</span>
                </div>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="min-w-full text-left text-[11px]">
                    <thead className="bg-slate-900 text-white uppercase text-[9px] font-black">
                      <tr>
                        <th className="px-3 py-2.5">Lote Madre Origen</th>
                        <th className="px-3 py-2.5">Genética / Cultivar</th>
                        <th className="px-3 py-2.5">Obtentor / Proveedor</th>
                        <th className="px-3 py-2.5">Certif. & Rótulo INASE</th>
                        <th className="px-3 py-2.5">Calidad QA (PG / Pureza)</th>
                        <th className="px-3 py-2.5 text-right">Masa Neta (KG)</th>
                        <th className="px-3 py-2.5 text-right">Equivalente (GR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      <tr className="bg-white dark:bg-slate-900">
                        <td className="px-3 py-3 font-black text-slate-900 dark:text-white">
                          {contextData.batch?.batchCode || 'LOTE-OFICIAL'}
                          <span className="block text-[9px] text-slate-400 font-normal">
                            Cat. {contextData.batch?.category || 'C1 Fiscalizada'}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-black text-emerald-700 dark:text-emerald-400">
                          {vName}
                          <span className="block text-[9px] text-slate-400 font-normal">
                            Cáñamo Industrial (&lt;0.2% THC)
                          </span>
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-700 dark:text-slate-300">
                          {supName}
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-bold">
                            Cert: {contextData.batch?.certificationNumber || 'INASE'}
                          </span>
                          <span className="block text-[9px] text-slate-400">
                            Rótulo: {contextData.batch?.labelSerialNumber || '00000012'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-bold text-purple-700 dark:text-purple-400">
                            1° PG: {contextData.batch?.breederGerminationPct || 90}% ➔ 2° PG QA:{' '}
                            {contextData.batch?.coopGerminationPct ||
                              contextData.batch?.germination ||
                              92}
                            %
                          </span>
                          <span className="block text-[9px] text-slate-400">
                            Pureza: {contextData.batch?.purity || 100}% · Grado A
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-black text-sm text-slate-900 dark:text-white tabular-nums">
                          {qtyKg.toFixed(3)} kg
                        </td>
                        <td className="px-3 py-3 text-right font-black text-sm text-emerald-700 dark:text-emerald-400 tabular-nums">
                          {qtyGr.toLocaleString('es-AR')} gr
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECCIÓN 4: TRANSPORTE E ITINERARIO */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-1 mb-2.5 flex items-center gap-1.5">
                  <Truck size={13} className="text-sky-600" />
                  <span>4. Transporte, Conductor Habilitado e Itinerario de Ruta</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Empresa Transportista</span>
                    <strong className="text-slate-900 dark:text-white">
                      {movement.transportCompany || 'Cooperativa PatagonianC LTDA'} (
                      {movement.transportType || 'Propio'})
                    </strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Conductor / Chofer</span>
                    <strong className="text-slate-900 dark:text-white">
                      {movement.driverName || 'Chofer Asignado'}
                    </strong>
                    <span className="text-[9px] text-slate-500 block">
                      DNI/CUIT: {movement.driverDni || 'Verificado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Unidad & Dominio</span>
                    <strong className="text-slate-900 dark:text-white">
                      {movement.vehicleModel || 'Unidad Logística'} · Patente:{' '}
                      {movement.vehiclePlate || 'Oficial'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Itinerario Declarado</span>
                    <strong className="text-sky-700 dark:text-sky-300">
                      {movement.routeItinerary || `${originName} ➔ ${targetName}`}
                    </strong>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 5: TRIPLE CUADRO DE FIRMAS ELECTRÓNICAS */}
              <div>
                <div className="flex flex-wrap justify-between items-center gap-2 mb-2.5">
                  <div className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <PenTool size={13} />
                    <span>
                      5. Certificación de Cadena de Custodia · Triple Firma Electrónica Homologada
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {canManageAdmin
                      ? 'Haga clic en cualquier recuadro para firmar o actualizar la firma electrónica'
                      : 'Certificación electrónica oficial (Modo Visualización y Descarga)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(
                    [
                      {
                        key: 'issuer' as SignatureRoleKey,
                        title: '1° Firma: Emisor (Origen)',
                        subtitle: 'Despacho Planta Central',
                        sig: movement.issuerSignature
                      },
                      {
                        key: 'carrier' as SignatureRoleKey,
                        title: '2° Firma: Transportista',
                        subtitle: 'Conformidad de Porte',
                        sig: movement.carrierSignature
                      },
                      {
                        key: 'receiver' as SignatureRoleKey,
                        title: '3° Firma: Receptor (Destino)',
                        subtitle: 'Recepción Conforme en Campo',
                        sig: movement.receiverSignature
                      }
                    ] as const
                  ).map(item => (
                    <div
                      key={item.key}
                      className={`rounded-2xl border-2 p-3.5 flex flex-col justify-between transition ${
                        item.sig
                          ? 'border-emerald-500/70 bg-emerald-50/30 dark:bg-emerald-950/20'
                          : 'border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-1.5 mb-2">
                          <span className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200">
                            {item.title}
                          </span>
                          {item.sig ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[8px] font-black uppercase">
                              ✓ Firmado
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[8px] font-black uppercase">
                              Pendiente
                            </span>
                          )}
                        </div>

                        <div className="h-20 bg-white dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center p-1 mb-2.5 overflow-hidden">
                          {item.sig?.signatureDataUrl ? (
                            <img
                              src={item.sig.signatureDataUrl}
                              alt={`Firma ${item.sig.signedBy}`}
                              className="max-h-18 max-w-full object-contain"
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold text-center px-2">
                              Sin firma electrónica registrada
                            </span>
                          )}
                        </div>

                        {item.sig ? (
                          <div className="text-[10px] space-y-0.5 text-slate-700 dark:text-slate-300">
                            <div className="font-black text-slate-900 dark:text-white truncate">
                              {item.sig.signedBy}
                            </div>
                            <div className="text-[9px] text-slate-500 truncate">
                              DNI/Mat.: {item.sig.dniOrMatricula || 'Verificado'}
                            </div>
                            <div className="text-[9px] text-slate-500 truncate">
                              Fecha: {formatDateTimeAr(item.sig.signedAt)}
                            </div>
                            {item.key === 'receiver' && item.sig.receivedQuantityKg !== undefined && (
                              <div className="text-[9px] font-black text-emerald-700 dark:text-emerald-400">
                                Recibido: {item.sig.receivedQuantityKg.toFixed(3)} kg (
                                {Math.round(item.sig.receivedQuantityKg * 1000)} gr) ·{' '}
                                {item.sig.conformityStatus || 'CONFORME'}
                              </div>
                            )}
                            <div className="text-[8px] font-mono text-emerald-700 dark:text-emerald-400 break-all pt-0.5">
                              {item.sig.verificationHash}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">
                            Requiere firma electrónica de {item.subtitle.toLowerCase()}.
                          </div>
                        )}
                      </div>

                      {canManageAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRole(item.key);
                            setModalTab('sign');
                          }}
                          className={`mt-3 w-full py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            item.sig
                              ? 'bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                          }`}
                        >
                          <PenTool size={11} />
                          <span>{item.sig ? 'Re-Firmar / Actualizar' : 'Firmar Ahora'}</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* SECCIÓN 6: OFICIALIZACIÓN DE LA GUÍA EN EL TAD (ARICCAME) — DOCUMENTO PDF ADJUNTO */}
              <div
                className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                  hasTadPdf
                    ? 'border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/25'
                    : 'border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/15'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        hasTadPdf
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {hasTadPdf
                        ? '✓ GUÍA OFICIALIZADA EN TAD (ARICCAME)'
                        : '⏳ PENDIENTE DOCUMENTO PDF TAD (ARICCAME)'}
                    </span>
                    <span className="text-[11px] font-black uppercase text-slate-900 dark:text-white">
                      6. Documento Oficial de Aprobación de Tránsito (TAD — ARICCAME)
                    </span>
                  </div>
                  {hasTadPdf ? (
                    <div className="text-[11px] text-slate-700 dark:text-slate-300">
                      Archivo Oficial:{' '}
                      <strong className="text-emerald-700 dark:text-emerald-400">
                        {movement.tadDocumentName || 'Guia_Aprobada_TAD_ARICCAME.pdf'}
                      </strong>{' '}
                      {movement.tadUploadedAt && (
                        <span className="text-slate-500">
                          · Subido el {formatDateTimeAr(movement.tadUploadedAt)} por{' '}
                          {movement.tadUploadedBy || 'Administración Central'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      {canManageAdmin
                        ? 'Adjunte el documento PDF de la Guía Aprobada en el TAD (ARICCAME) para oficializar el tránsito de esta guía.'
                        : 'El documento PDF de aprobación TAD (ARICCAME) aún no fue adjuntado por la Administración Central.'}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {hasTadPdf && (
                    <>
                      <button
                        type="button"
                        onClick={() => setModalTab('tad')}
                        className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-black uppercase flex items-center gap-1.5 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>Ver PDF TAD</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadTadDocumentPdf(movement)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                      >
                        <Download size={13} />
                        <span>Descargar PDF ARICCAME</span>
                      </button>
                    </>
                  )}
                  {canManageAdmin && (
                    <button
                      type="button"
                      onClick={() => tadFileInputRef.current?.click()}
                      disabled={isSaving}
                      className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black uppercase flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <Upload size={13} />
                      <span>
                        {hasTadPdf ? 'Reemplazar PDF TAD' : 'Subir PDF Guía TAD (ARICCAME)'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {modalTab === 'tad' && (
            /* VISOR Y GESTIÓN DEL DOCUMENTO PDF DE LA GUÍA APROBADA EN EL TAD (ARICCAME) */
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-4xl mx-auto space-y-5 shadow-sm text-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-600 block">
                    Trámites a Distancia (TAD) · Agencia Regulatoria ARICCAME
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase mt-0.5">
                    Documento PDF Oficial — Guía Aprobada en el TAD (ARICCAME)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Este documento oficializa la guía de tránsito y habilita la circulación federal del material biológico.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {hasTadPdf && (
                    <button
                      type="button"
                      onClick={() => downloadTadDocumentPdf(movement)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase flex items-center gap-1.5 shadow transition cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Descargar PDF TAD ARICCAME</span>
                    </button>
                  )}
                  {canManageAdmin && (
                    <button
                      type="button"
                      onClick={() => tadFileInputRef.current?.click()}
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black uppercase flex items-center gap-1.5 shadow transition cursor-pointer"
                    >
                      <Upload size={14} />
                      <span>
                        {hasTadPdf ? 'Reemplazar Archivo PDF' : 'Subir Archivo PDF ARICCAME'}
                      </span>
                    </button>
                  )}
                  {canManageAdmin && hasTadPdf && (
                    <button
                      type="button"
                      onClick={handleRemoveTadPdf}
                      disabled={isSaving}
                      className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 transition cursor-pointer"
                      title="Quitar PDF TAD adjunto"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {tadUploadNotice && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                    tadUploadNotice.type === 'ok'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  <CheckCircle2 size={15} className="shrink-0" />
                  <span>{tadUploadNotice.text}</span>
                </div>
              )}

              {canManageAdmin && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                      N° de Expediente / Disposición TAD ARICCAME
                    </label>
                    <input
                      type="text"
                      value={tadApprovalInput}
                      onChange={e => setTadApprovalInput(e.target.value)}
                      placeholder="Ej: EX-2026-04104576-APN-ARICCAME#MEC"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => tadFileInputRef.current?.click()}
                    disabled={isSaving}
                    className="w-full py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-black uppercase flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Upload size={14} />
                    <span>Seleccionar PDF (.pdf)</span>
                  </button>
                </div>
              )}

              {hasTadPdf ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap justify-between items-center gap-2 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2">
                      <FileCheck size={16} className="text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-black text-emerald-900 dark:text-emerald-200">
                          {movement.tadDocumentName || 'Guia_Aprobada_TAD_ARICCAME.pdf'}
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                          Expediente: {movement.tadApprovalNumber || movement.transportGuideNumber} · Oficializado el{' '}
                          {movement.tadUploadedAt ? formatDateTimeAr(movement.tadUploadedAt) : formatDateAr(movement.date)}{' '}
                          por {movement.tadUploadedBy || 'Administración Central'}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[9px] font-black uppercase">
                      ✓ Tránsito Aprobado TAD
                    </span>
                  </div>

                  <div className="rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950">
                    <iframe
                      src={movement.tadDocumentUrl}
                      title="Documento Oficial Guía Aprobada TAD ARICCAME"
                      className="w-full h-[500px]"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-10 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                    <FileText size={24} />
                  </div>
                  <div className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase">
                    Guía Pendiente de Documento PDF TAD (ARICCAME)
                  </div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {canManageAdmin
                      ? 'Suba el archivo PDF emitido por la plataforma TAD (Trámites a Distancia — ARICCAME) que aprueba el tránsito y oficializa esta guía.'
                      : 'Solo los usuarios Super Admin y Administradores pueden cargar el archivo PDF de aprobación TAD (ARICCAME). Una vez cargado, podrá visualizarlo y descargarlo desde aquí.'}
                  </p>
                  {canManageAdmin && (
                    <button
                      type="button"
                      onClick={() => tadFileInputRef.current?.click()}
                      className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase inline-flex items-center gap-2 shadow cursor-pointer"
                    >
                      <Upload size={15} />
                      <span>Subir Archivo PDF ARICCAME Ahora</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {modalTab === 'sign' && canManageAdmin && (
            /* CENTRO DE FIRMA ELECTRÓNICA (PAD MANUSCRITO TÁCTIL/MOUSE + SELLO CALIGRÁFICO) */
            <form
              onSubmit={handleSaveSignature}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-3xl mx-auto space-y-5 shadow-sm"
            >
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-600 block">
                  Certificación Digital de Guías de Tránsito & Remitos
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase mt-0.5">
                  Seleccione el Eslabón de la Cadena de Custodia a Firmar
                </h3>
              </div>

              {/* SELECTOR DE ESLABÓN (EMISOR / TRANSPORTISTA / RECEPTOR) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {(
                  [
                    {
                      key: 'issuer' as SignatureRoleKey,
                      label: '1. Emisor / Despacho',
                      desc: 'Planta Central Origen',
                      done: Boolean(movement.issuerSignature)
                    },
                    {
                      key: 'carrier' as SignatureRoleKey,
                      label: '2. Transportista / Porte',
                      desc: 'Conductor de Unidad',
                      done: Boolean(movement.carrierSignature)
                    },
                    {
                      key: 'receiver' as SignatureRoleKey,
                      label: '3. Receptor en Destino',
                      desc: 'Confirmación en Campo',
                      done: Boolean(movement.receiverSignature)
                    }
                  ] as const
                ).map(r => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setSelectedRole(r.key)}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                      selectedRole === r.key
                        ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-black text-slate-900 dark:text-white uppercase text-[11px]">
                        {r.label}
                      </span>
                      {r.done && (
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{r.desc}</span>
                  </button>
                ))}
              </div>

              {/* DATOS DEL FIRMANTE */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                    Nombre y Apellido del Firmante *
                  </label>
                  <input
                    required
                    type="text"
                    value={signerName}
                    onChange={e => setSignerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold"
                    placeholder="Nombre completo..."
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                    DNI / CUIT / Matrícula Profesional *
                  </label>
                  <input
                    required
                    type="text"
                    value={signerDni}
                    onChange={e => setSignerDni(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold"
                    placeholder="DNI o Matrícula..."
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                    Cargo / Función en Custodia
                  </label>
                  <input
                    type="text"
                    value={signerRoleTitle}
                    onChange={e => setSignerRoleTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                    Fecha de Firma (DD/MM/AAAA) *
                  </label>
                  <DateInputAr
                    required
                    value={sigDate}
                    onChange={e => setSigDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                    Hora de Firma (24 hs) *
                  </label>
                  <input
                    required
                    type="time"
                    value={sigTime}
                    onChange={e => setSigTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold"
                  />
                </div>
              </div>

              {/* CAMPOS ESPECÍFICOS DE CONFORMIDAD PARA EL RECEPTOR EN DESTINO */}
              {selectedRole === 'receiver' && (
                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/70 space-y-3">
                  <div className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300">
                    Verificación de Recepción de Semilla en Establecimiento Destino
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 block mb-1">
                        Masa Neta Recibida (KG) · Equiv: {Math.round((receivedKg || 0) * 1000)} gr
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={receivedKg}
                        onChange={e => setReceivedKg(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 font-black text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 block mb-1">
                        Estado de Precinto y Conformidad
                      </label>
                      <select
                        value={conformity}
                        onChange={e => setConformity(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 font-bold text-xs"
                      >
                        <option value="CONFORME">✅ CONFORME (Precinto Intacto y Peso Exacto)</option>
                        <option value="CON_OBSERVACIONES">⚠️ CON OBSERVACIONES (Detallar abajo)</option>
                      </select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={confirmReceptionCheck}
                      onChange={e => setConfirmReceptionCheck(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>
                      Marcar Guía como RECIBIDA EN DESTINO, impactar stock en depósito receptor y archivar en el Libro Histórico
                    </span>
                  </label>
                </div>
              )}

              {/* MODALIDAD DE FIRMA: LIENZO MANUSCRITO VS SELLO CALIGRÁFICO */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">
                    Método de Estampado de Firma Electrónica
                  </label>
                  <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-[10px] font-black uppercase">
                    <button
                      type="button"
                      onClick={() => setSigMode('handwritten')}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                        sigMode === 'handwritten'
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                          : 'text-slate-500'
                      }`}
                    >
                      ✍️ Trazo Manuscrito (Pad)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSigMode('digital_seal')}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                        sigMode === 'digital_seal'
                          ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-xs'
                          : 'text-slate-500'
                      }`}
                    >
                      ⚡ Sello Digital Homologado (1 Clic)
                    </button>
                  </div>
                </div>

                {sigMode === 'handwritten' ? (
                  <div className="space-y-1.5">
                    <div className="relative border-2 border-slate-300 dark:border-slate-700 rounded-2xl bg-white overflow-hidden">
                      <canvas
                        ref={canvasRef}
                        width={600}
                        height={150}
                        onMouseDown={startDrawing}
                        onMouseMove={drawMove}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={drawMove}
                        onTouchEnd={stopDrawing}
                        className="w-full h-[140px] cursor-crosshair touch-none"
                      />
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold uppercase flex items-center gap-1"
                      >
                        <Eraser size={12} />
                        <span>Limpiar Lienzo</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Dibuje su firma con el mouse o pantalla táctil. Si deja el lienzo en blanco, se aplicará automáticamente su Sello Caligráfico Electrónico Homologado.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/20 flex flex-col items-center justify-center space-y-2">
                    <img
                      src={generateCalligraphicSignatureDataUrl(
                        signerName || 'Firma Autorizada',
                        selectedRole === 'issuer'
                          ? 'DESPACHO PLANTA CENTRAL'
                          : selectedRole === 'carrier'
                          ? 'CONFORMIDAD DE PORTE'
                          : 'RECEPCIÓN CONFORME DESTINO',
                        generateSignatureHash(`${movement.id}-${selectedRole}-${signerName}`)
                      )}
                      alt="Vista previa sello digital"
                      className="h-20 object-contain bg-white rounded-xl border border-slate-200 px-4 py-1"
                    />
                    <span className="text-[10px] text-sky-700 dark:text-sky-300 font-bold">
                      Vista previa del Sello Caligráfico Criptográfico SHA-256 listo para estampar
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                  Observaciones de Conformidad / Notas de Custodia
                </label>
                <input
                  type="text"
                  value={observations}
                  onChange={e => setObservations(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  placeholder="Ej: Precintos SENASA verificados sin alteraciones..."
                />
              </div>

              <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalTab('preview')}
                  className="px-4 py-2 text-xs font-bold uppercase text-slate-400 hover:text-slate-600"
                >
                  Volver al Documento
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow transition cursor-pointer"
                >
                  <ShieldCheck size={15} />
                  <span>
                    {isSaving
                      ? 'Certificando y Almacenando...'
                      : 'Estampar Firma Electrónica y Guardar en Historial'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {modalTab === 'history' && (
            /* BITÁCORA CRONOLÓGICA INMUTABLE DE LA GUÍA DE TRÁNSITO */
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-4xl mx-auto space-y-5 shadow-sm">
              <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-purple-600 block">
                    Trazabilidad Inmutable & Archivo Histórico
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">
                    Bitácora de Eventos y Firmas de la Guía {movement.transportGuideNumber}
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400">
                  ID: {movement.id}
                </span>
              </div>

              <div className="space-y-3">
                {(movement.auditHistory || []).map((ev, index) => (
                  <div
                    key={ev.id || index}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row justify-between items-start gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[9px] font-black uppercase">
                          Hito #{index + 1}
                        </span>
                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase">
                          {ev.action}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300">{ev.details}</p>
                      <div className="text-[10px] text-slate-500">
                        Firmante / Interviniente: <strong>{ev.actorName}</strong>{' '}
                        {ev.actorRole ? `(${ev.actorRole})` : ''}
                      </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-xs font-black text-slate-900 dark:text-white">
                        {formatDateTimeAr(ev.timestamp)}
                      </div>
                      {ev.verificationHash && (
                        <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                          {ev.verificationHash}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* AGREGAR HITO / CONTROL DE RUTA AL HISTORIAL (SOLO SUPER ADMIN Y ADMIN) */}
              {canManageAdmin ? (
                <form
                  onSubmit={handleAddAuditNote}
                  className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2"
                >
                  <input
                    type="text"
                    value={newAuditNote}
                    onChange={e => setNewAuditNote(e.target.value)}
                    placeholder="Registrar control de ruta, verificación de precinto o novedad en el historial de esta guía..."
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={isSaving || !newAuditNote.trim()}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Anexar al Historial</span>
                  </button>
                </form>
              ) : (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-center gap-2">
                  <Lock size={13} className="text-slate-400 shrink-0" />
                  <span>
                    Registro histórico inmutable en modo lectura y descarga para su campo y estructura.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
