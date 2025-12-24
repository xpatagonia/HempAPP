
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
    BrainCircuit, FileDown, FileSpreadsheet, FileText, 
    Filter, Search, Download, CheckCircle2, 
    ArrowRight, TrendingUp, Sprout, Target, Calendar,
    ChevronDown, Archive, Loader2, Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function AgronomicIntelligence() {
    const { plots, projects, locations, varieties, trialRecords, appName, appLogo, hydricRecords } = useAppContext();
    
    const [filterCampaign, setFilterCampaign] = useState('all');
    const [filterVariety, setFilterVariety] = useState('all');
    const [isExporting, setIsExporting] = useState<string | null>(null);

    // --- PROCESAMIENTO DE DATOS ---
    const reportData = useMemo(() => {
        return plots.filter(p => {
            const matchCampaign = filterCampaign === 'all' || p.projectId === filterCampaign;
            const matchVariety = filterVariety === 'all' || p.varietyId === filterVariety;
            return matchCampaign && matchVariety;
        }).map(p => {
            const campaign = projects.find(proj => proj.id === p.projectId);
            const location = locations.find(l => l.id === p.locationId);
            const variety = varieties.find(v => v.id === p.varietyId);
            const records = trialRecords.filter(r => r.plotId === p.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const latest = records[0];
            
            // Calculo lluvia manual para esta parcela
            const plotRain = hydricRecords.filter(h => h.plotId === p.id).reduce((s, r) => s + r.amountMm, 0);

            return {
                id: p.id,
                name: p.name,
                campaign: campaign?.name || 'N/A',
                location: location?.name || 'N/A',
                variety: variety?.name || 'N/A',
                status: p.status,
                sowingDate: p.sowingDate,
                area: p.surfaceArea || 0,
                unit: p.surfaceUnit || 'ha',
                yield: latest?.yield || 0,
                height: latest?.plantHeight || 0,
                rain: plotRain
            };
        });
    }, [plots, projects, locations, varieties, trialRecords, filterCampaign, filterVariety, hydricRecords]);

    const stats = useMemo(() => {
        const totalHa = reportData.reduce((s, r) => s + r.area, 0);
        const avgYield = reportData.length > 0 
            ? reportData.reduce((s, r) => s + r.yield, 0) / reportData.length 
            : 0;
        const activeCount = reportData.filter(r => r.status === 'Activa').length;
        
        return { totalHa, avgYield: Math.round(avgYield), activeCount };
    }, [reportData]);

    // --- EXPORTAR EXCEL ---
    const exportExcel = () => {
        setIsExporting('excel');
        setTimeout(() => {
            const worksheet = XLSX.utils.json_to_sheet(reportData.map(r => ({
                'Parcela': r.name,
                'Campaña': r.campaign,
                'Localización': r.location,
                'Genética': r.variety,
                'Fecha Siembra': r.sowingDate,
                'Superficie': `${r.area} ${r.unit}`,
                'Rinde Est. (kg/ha)': r.yield,
                'Altura Act. (cm)': r.height,
                'Lluvia Reg. (mm)': r.rain,
                'Estado': r.status
            })));
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte_Agronomico");
            XLSX.writeFile(workbook, `${appName}_Inteligencia_Campaña_${new Date().toISOString().split('T')[0]}.xlsx`);
            setIsExporting(null);
        }, 500);
    };

    // --- EXPORTAR PDF ---
    const exportPDF = () => {
        setIsExporting('pdf');
        setTimeout(() => {
            const doc = new jsPDF() as any;
            const today = new Date().toLocaleDateString();

            // HEADER
            doc.setFillColor(22, 163, 74); // Hemp-600
            doc.rect(0, 0, 210, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.text(appName.toUpperCase(), 14, 20);
            doc.setFontSize(10);
            doc.text("CENTRO DE INTELIGENCIA Y AUDITORÍA AGRONÓMICA", 14, 28);
            doc.text(`EMISIÓN: ${today}`, 160, 28);

            // RESUMEN
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(14);
            doc.text("Resumen Ejecutivo de Campaña", 14, 55);
            doc.setFontSize(10);
            doc.text(`Superficie Auditada: ${stats.totalHa.toFixed(2)} Ha`, 14, 65);
            doc.text(`Rendimiento Promedio: ${stats.avgYield} kg/ha`, 14, 72);
            doc.text(`Unidades en Monitoreo: ${reportData.length}`, 14, 79);

            // TABLA
            const tableRows = reportData.map(r => [
                r.name,
                r.campaign,
                r.variety,
                r.sowingDate,
                `${r.area} ${r.unit}`,
                `${r.yield} kg`,
                `${r.rain} mm`
            ]);

            doc.autoTable({
                startY: 90,
                head: [['Parcela', 'Campaña', 'Genética', 'Siembra', 'Área', 'Rinde', 'Lluvia']],
                body: tableRows,
                headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
                bodyStyles: { fontSize: 8 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { top: 90 }
            });

            // FOOTER
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`${appName} Industrial Intelligence - Documento para uso técnico y profesional.`, 14, doc.internal.pageSize.height - 10);

            doc.save(`${appName}_Informe_Auditoria_${new Date().toISOString().split('T')[0]}.pdf`);
            setIsExporting(null);
        }, 500);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tighter italic flex items-center">
                        <BrainCircuit className="mr-3 text-hemp-600" size={32}/> Inteligencia <span className="text-hemp-600">Agronómica</span>
                    </h1>
                    <p className="text-sm text-gray-500 font-medium">Reporting industrial y extracción de protocolos de auditoría.</p>
                </div>
                
                <div className="flex space-x-2 w-full md:w-auto">
                    <button 
                        onClick={exportExcel}
                        disabled={!!isExporting}
                        className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center transition-all"
                    >
                        {isExporting === 'excel' ? <Loader2 className="animate-spin mr-2" size={16}/> : <FileSpreadsheet className="mr-2" size={16}/>}
                        Extraer Excel
                    </button>
                    <button 
                        onClick={exportPDF}
                        disabled={!!isExporting}
                        className="flex-1 md:flex-none bg-slate-900 dark:bg-hemp-600 hover:bg-black text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center transition-all"
                    >
                        {isExporting === 'pdf' ? <Loader2 className="animate-spin mr-2" size={16}/> : <FileText className="mr-2" size={16}/>}
                        Generar PDF Técnico
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center">
                            <Filter size={14} className="mr-2 text-hemp-600"/> Filtros de Reporte
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block mb-2">Campaña / Proyecto</label>
                                <select 
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-hemp-600 dark:text-white"
                                    value={filterCampaign}
                                    onChange={e => setFilterCampaign(e.target.value)}
                                >
                                    <option value="all">Todas las Campañas</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block mb-2">Genética</label>
                                <select 
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-hemp-600 dark:text-white"
                                    value={filterVariety}
                                    onChange={e => setFilterVariety(e.target.value)}
                                >
                                    <option value="all">Todas las Genéticas</option>
                                    {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/30">
                        <div className="flex items-center space-x-2 mb-4">
                            <Info size={16} className="text-blue-600"/>
                            <h4 className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-widest">Protocolo de Uso</h4>
                        </div>
                        <p className="text-[11px] text-blue-800 dark:text-blue-200 leading-relaxed font-medium">
                            Use el reporte PDF para certificaciones de terceros y el Excel para auditorías internas de stock y rinde.
                        </p>
                    </div>
                </div>

                <div className="md:col-span-3 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm group">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Masa Crítica Acumulada</p>
                            <div className="flex items-baseline space-x-1">
                                <h3 className="text-3xl font-black text-slate-800 dark:text-white">{stats.totalHa.toFixed(1)}</h3>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ha</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rinde Promedio Pond.</p>
                            <div className="flex items-baseline space-x-1">
                                <h3 className="text-3xl font-black text-hemp-600">{stats.avgYield}</h3>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">kg/ha</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unidades Auditables</p>
                            <div className="flex items-baseline space-x-1">
                                <h3 className="text-3xl font-black text-blue-600">{reportData.length}</h3>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lotes</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                        <div className="px-10 py-6 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-950/50">
                            <h2 className="font-black text-gray-900 dark:text-white uppercase text-[10px] tracking-[0.3em] flex items-center">
                                <Archive size={18} className="mr-3 text-hemp-600"/> Vista Previa del Informe de Consolidado
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-slate-950/50 text-gray-400 uppercase text-[9px] font-black tracking-widest border-b dark:border-slate-800">
                                    <tr>
                                        <th className="px-8 py-5">Identificador</th>
                                        <th className="px-8 py-5">Campaña / Sitio</th>
                                        <th className="px-8 py-5">Genética</th>
                                        <th className="px-8 py-5 text-center">Superficie</th>
                                        <th className="px-8 py-5 text-center">Rinde (kg)</th>
                                        <th className="px-8 py-5 text-center">Lluvia (mm)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                    {reportData.length === 0 ? (
                                        <tr><td colSpan={6} className="p-20 text-center text-slate-300 italic font-bold">Sin datos para los filtros seleccionados.</td></tr>
                                    ) : reportData.map(r => (
                                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-8 py-5 font-black text-slate-800 dark:text-white uppercase tracking-tighter">{r.name}</td>
                                            <td className="px-8 py-5">
                                                <div className="font-bold text-xs dark:text-gray-300">{r.campaign}</div>
                                                <div className="text-[9px] text-slate-400 uppercase font-black">{r.location}</div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="px-2 py-1 bg-hemp-50 dark:bg-hemp-900/20 text-hemp-700 dark:text-hemp-400 rounded-lg text-[9px] font-black uppercase border border-hemp-100 dark:border-hemp-900/30">{r.variety}</span>
                                            </td>
                                            <td className="px-8 py-5 text-center font-bold text-slate-600 dark:text-slate-400">{r.area} {r.unit}</td>
                                            <td className="px-8 py-5 text-center font-black text-slate-900 dark:text-white">{r.yield.toLocaleString()}</td>
                                            <td className="px-8 py-5 text-center">
                                                <div className="flex items-center justify-center text-blue-600 font-bold">
                                                    <Calendar size={12} className="mr-1.5 opacity-50"/> {r.rain}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
