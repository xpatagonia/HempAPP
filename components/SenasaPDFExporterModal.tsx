import React, { useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
    FileText, Download, ShieldCheck, X, Check, Calendar, 
    User, Building, Award, CheckCircle2, Loader2, Sparkles, Filter, Package
} from 'lucide-react';
import { AgrochemicalApplication, Plot } from '../types';

interface SenasaPDFExporterModalProps {
    isOpen: boolean;
    onClose: () => void;
    applications: AgrochemicalApplication[];
    plots: Plot[];
    appName: string;
}

export default function SenasaPDFExporterModal({
    isOpen,
    onClose,
    applications,
    plots,
    appName
}: SenasaPDFExporterModalProps) {
    const [selectedPlotId, setSelectedPlotId] = useState<string>('all');
    const [producerName, setProductorName] = useState<string>('PatagonianC LTDA Cooperativa de Trabajo · CUIT: 30-71816113-0 · HempC (Unidad de Negocios)');
    const [establishmentRenspa, setEstablishmentRenspa] = useState<string>('RENSPA N° 19.042.8.00120/00');
    const [agronomistName, setAgronomistName] = useState<string>('Ing. Agr. Gabriel Santos');
    const [agronomistMp, setAgronomistMp] = useState<string>('MP 4.812 (CPIA)');
    const [includeSenasaSignBox, setIncludeSenasaSignBox] = useState<boolean>(true);
    const [includeAffidavit, setIncludeAffidavit] = useState<boolean>(true);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);

    if (!isOpen) return null;

    const filteredApps = applications.filter(a => selectedPlotId === 'all' || a.plotId === selectedPlotId);

    const handleGeneratePDF = () => {
        setIsGenerating(true);
        setTimeout(() => {
            try {
                const doc = new jsPDF({
                    orientation: 'landscape',
                    unit: 'mm',
                    format: 'a4'
                }) as any;

                const todayStr = new Date().toLocaleDateString('es-AR', {
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                });

                const pageWidth = doc.internal.pageSize.width;
                const pageHeight = doc.internal.pageSize.height;

                // --- HEADER OFICIAL SENASA ---
                // Franja Superior SENASA (Verde/Azul institucional)
                doc.setFillColor(15, 23, 42); // Navy Dark
                doc.rect(0, 0, pageWidth, 28, 'F');

                doc.setFillColor(126, 34, 206); // Purple Accent Line
                doc.rect(0, 28, pageWidth, 3, 'F');

                // Títulos Institucionales
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(14);
                doc.text("REPÚBLICA ARGENTINA - SERVICIO NACIONAL DE SANIDAD Y CALIDAD AGROALIMENTARIA", 14, 12);

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.text("SENASA | REGISTRO NACIONAL OFICIAL DE APLICACIONES DE FERTILIZANTES Y FITOSANITARIOS", 14, 19);

                doc.setFontSize(8);
                doc.text(`EMISIÓN AUDITADA: ${todayStr}`, pageWidth - 14, 19, { align: 'right' });

                // --- CUADRO DE DATOS DEL ESTABLECIMIENTO Y DECLARANTE ---
                doc.setFillColor(248, 250, 252);
                doc.setDrawColor(226, 232, 240);
                doc.roundedRect(14, 35, pageWidth - 28, 26, 3, 3, 'FD');

                doc.setTextColor(15, 23, 42);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text("DATOS DEL ESTABLECIMIENTO Y RESPONSABLE TÉCNICO", 18, 42);

                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text(`Red / Establecimiento: ${producerName}`, 18, 48);
                doc.text(`Registro RENSPA SENASA: ${establishmentRenspa}`, 18, 54);

                doc.text(`Ingeniero Agrónomo Responsable: ${agronomistName}`, 140, 48);
                doc.text(`Matrícula Profesional: ${agronomistMp}`, 140, 54);

                const totalHa = plots.reduce((s, p) => s + (p.surfaceArea || 1), 0);
                doc.text(`Superficie Monitoreada: ${totalHa.toFixed(1)} Ha (${filteredApps.length} Tratamientos)`, 220, 48);
                doc.text(`Especie: Cáñamo Industrial (Cannabis Sativa L.)`, 220, 54);

                // --- TABLA DE TRAZABILIDAD Y APLICACIONES ---
                const tableRows = filteredApps.map((a, idx) => [
                    (idx + 1).toString(),
                    a.plotName,
                    `${a.date}\n${a.time || '10:00'}`,
                    a.category,
                    `${a.productName}\nActivo: ${a.activeIngredient}`,
                    `${a.supplierName}\nFab: ${a.manufacturer}`,
                    `Lote: ${a.batchNumber}\nVenc: ${a.expirationDate || '2027-12-31'}`,
                    a.senasaRegisterNumber,
                    `${a.dosagePerHa} ${a.dosageUnit}\nTot: ${a.totalAppliedAmount} ${a.dosageUnit === 'L/ha' ? 'L' : 'kg'}`,
                    `${a.safetyPeriodDays} días\n${a.status}`,
                    `${a.responsibleAgronomist}\n${a.agronomistLicense}`
                ]);

                doc.autoTable({
                    startY: 65,
                    head: [['N°', 'Parcela', 'Fecha/Hora', 'Categoría', 'Marca Comercial / Principio', 'Proveedor / Fab.', 'N° Lote & Venc.', 'Reg. SENASA', 'Dosis / Total', 'Carencia', 'Agrónomo MP']],
                    body: tableRows,
                    headStyles: {
                        fillColor: [88, 28, 135], // Purple-900
                        textColor: [255, 255, 255],
                        fontSize: 7.5,
                        fontStyle: 'bold',
                        halign: 'center'
                    },
                    bodyStyles: {
                        fontSize: 6.5,
                        textColor: [30, 41, 59]
                    },
                    alternateRowStyles: {
                        fillColor: [250, 245, 255]
                    },
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 8 },
                        1: { fontStyle: 'bold', cellWidth: 20 },
                        2: { halign: 'center', cellWidth: 20 },
                        3: { cellWidth: 22 },
                        4: { cellWidth: 38 },
                        5: { cellWidth: 32 },
                        6: { cellWidth: 28 },
                        7: { halign: 'center', fontStyle: 'bold', cellWidth: 28 },
                        8: { halign: 'center', cellWidth: 22 },
                        9: { halign: 'center', cellWidth: 20 },
                        10: { cellWidth: 26 }
                    },
                    margin: { left: 14, right: 14 }
                });

                let finalY = (doc as any).lastAutoTable.previous.finalY + 8;

                // Validar si entra el bloque de firmas en la misma página o crear nueva
                if (finalY + 45 > pageHeight) {
                    doc.addPage();
                    finalY = 20;
                }

                // --- DECLARACIÓN JURADA ---
                if (includeAffidavit) {
                    doc.setFillColor(241, 245, 249);
                    doc.setDrawColor(203, 213, 225);
                    doc.roundedRect(14, finalY, pageWidth - 28, 18, 2, 2, 'FD');

                    doc.setTextColor(30, 41, 59);
                    doc.setFontSize(7.5);
                    doc.setFont('helvetica', 'bold');
                    doc.text("DECLARACIÓN JURADA DE CUMPLIMIENTO SANITARIO (RESOLUCIÓN SENASA N° 350/1999 Y N° 637/2011):", 18, finalY + 5);

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(6.5);
                    const affidavitText = "Declaramos bajo fe de juramento que la totalidad de los fitosanitarios y fertilizantes consignados en este informe cuentan con registro aprobado ante SENASA, habiendo sido aplicados respetando estrictamente las dosis máximas autorizadas, perídos de carencia pre-cosecha y franjas de seguridad ambiental vigentes en la República Argentina.";
                    doc.text(doc.splitTextToSize(affidavitText, pageWidth - 36), 18, finalY + 10);

                    finalY += 23;
                }

                // --- CAJAS DE FIRMA OFICIAL ---
                if (includeSenasaSignBox) {
                    const boxWidth = 120;
                    const boxHeight = 22;

                    // Caja Firma Agrónomo
                    doc.setDrawColor(148, 163, 184);
                    doc.roundedRect(14, finalY, boxWidth, boxHeight, 2, 2, 'S');
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'bold');
                    doc.text("FIRMA Y SELLO - INGENIERO AGRÓNOMO RESPONSABLE", 18, finalY + 5);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(6.5);
                    doc.text(`${agronomistName} | ${agronomistMp}`, 18, finalY + 18);

                    // Caja Inspección Oficial SENASA
                    doc.roundedRect(pageWidth - 14 - boxWidth, finalY, boxWidth, boxHeight, 2, 2, 'S');
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'bold');
                    doc.text("CERTIFICACIÓN DE INSPECCIÓN OFICIAL SENASA", pageWidth - 14 - boxWidth + 4, finalY + 5);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(6.5);
                    doc.text("Firma, Sello y Matrícula Inspector Habilitado / Fecha", pageWidth - 14 - boxWidth + 4, finalY + 18);
                }

                // --- FOOTER PAGINADO Y PIE DE PÁGINA ---
                const pageCount = doc.internal.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(6.5);
                    doc.setTextColor(148, 163, 184);
                    doc.text(`Documento emitido por PatagonianC LTDA Cooperativa de Trabajo | CUIT: 30-71816113-0 | HempC (Unidad de Negocios) - ${appName} | Código Único: SENASA-HEMP-${Date.now().toString().substring(5)}`, 14, pageHeight - 6);
                    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
                }

                doc.save(`INFORME_OFICIAL_SENASA_TRAZABILIDAD_${new Date().toISOString().split('T')[0]}.pdf`);
            } catch (error) {
                console.error("Error generando PDF SENASA:", error);
            } finally {
                setIsGenerating(false);
                onClose();
            }
        }, 600);
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-purple-500/30 rounded-[36px] max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
                
                {/* Header Modal */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-md">
                            <ShieldCheck size={26} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg flex items-center gap-2">
                                <span>Exportar Informe Oficial SENASA</span>
                                <span className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                                    PDF Normativo
                                </span>
                            </h3>
                            <p className="text-xs text-slate-400 font-medium">
                                Generación de declaración jurada y libro matriz de insumos listo para inspección.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Formulario de Configuración del Informe */}
                <div className="space-y-4">
                    <div className="p-4 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-2xl flex items-start gap-3">
                        <Award className="text-purple-600 shrink-0 mt-0.5" size={20} />
                        <p className="text-xs text-purple-900 dark:text-purple-200 leading-relaxed font-medium">
                            Este reporte genera un documento en formato apaisado A4 reglamentario, con los campos oficiales exigidos por las Resoluciones SENASA N° 350/1999 y N° 637/2011 para la producción de Cáñamo Industrial.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[11px] font-black text-slate-400 uppercase">Filtrar por Parcela / Lote</label>
                            <select
                                value={selectedPlotId}
                                onChange={e => setSelectedPlotId(e.target.value)}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                            >
                                <option value="all">Todas las Parcelas ({applications.length} Aplicaciones)</option>
                                {plots.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.surfaceArea} {p.surfaceUnit})</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-black text-slate-400 uppercase">Registro RENSPA SENASA</label>
                            <input
                                type="text"
                                value={establishmentRenspa}
                                onChange={e => setEstablishmentRenspa(e.target.value)}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[11px] font-black text-slate-400 uppercase">Establecimiento / Razon Social</label>
                            <input
                                type="text"
                                value={producerName}
                                onChange={e => setProductorName(e.target.value)}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-black text-slate-400 uppercase">Ingeniero Agrónomo Firmante</label>
                            <input
                                type="text"
                                value={agronomistName}
                                onChange={e => setAgronomistName(e.target.value)}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase block">Opciones del Documento Oficial</label>
                        
                        <label className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeAffidavit}
                                onChange={e => setIncludeAffidavit(e.target.checked)}
                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Incluir Declaración Jurada Sanitaria (Res. SENASA 350/99 & 637/11)
                            </span>
                        </label>

                        <label className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeSenasaSignBox}
                                onChange={e => setIncludeSenasaSignBox(e.target.checked)}
                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Incluir recuadros de firma para Inspector SENASA e Ingeniero Agrónomo MP
                            </span>
                        </label>
                    </div>
                </div>

                {/* Footer Modal Actions */}
                <div className="pt-4 flex gap-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 p-3.5 rounded-2xl text-xs font-black uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleGeneratePDF}
                        disabled={isGenerating || filteredApps.length === 0}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white p-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-700/20 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Generando PDF SENASA...</span>
                            </>
                        ) : (
                            <>
                                <Download size={16} />
                                <span>Descargar Informe SENASA ({filteredApps.length})</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
