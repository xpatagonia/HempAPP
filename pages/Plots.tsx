
import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Plot, Variety, Location, Project, TrialRecord } from '../types';
import { 
  ChevronRight, FileSpreadsheet, LayoutGrid, List, Tag, FlaskConical, 
  Tractor, Trash2, Edit2, QrCode, X, Save, Search, Filter, 
  MapPin, Calendar, Sprout, Printer, Ruler, Activity, CheckCircle2, AlertCircle, Download, ExternalLink, Plus, Loader2, Info, FolderKanban, Archive,
  // Add missing Link as LinkIcon alias from lucide-react to fix line 280 reference
  Link as LinkIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Plots() {
  const { plots, locations, varieties, projects, currentUser, getLatestRecord, seedBatches, deletePlot, updatePlot, addPlot, trialRecords } = useAppContext();
  
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLoc, setFilterLoc] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'Ensayo' | 'Producción'>('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPlot, setEditingPlot] = useState<Plot | null>(null);
  const [qrPlot, setQrPlot] = useState<Plot | null>(null);

  // Form State para Alta
  const [formData, setFormData] = useState<Partial<Plot>>({
      name: '',
      type: 'Ensayo',
      locationId: '',
      projectId: '',
      varietyId: '',
      seedBatchId: '',
      status: 'Activa',
      sowingDate: new Date().toISOString().split('T')[0],
      surfaceArea: 0,
      surfaceUnit: 'ha',
      density: 0,
      observations: ''
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const isClient = currentUser?.role === 'client';

  const filteredPlots = useMemo(() => plots.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLoc = filterLoc === 'all' || p.locationId === filterLoc;
      const matchType = filterType === 'all' || p.type === filterType;
      const matchStatus = filterStatus === 'all' || p.status === filterStatus;
      let hasAccess = isAdmin || (isClient && locations.find(l => l.id === p.locationId)?.clientId === currentUser.clientId) || p.responsibleIds?.includes(currentUser?.id || '');
      return matchSearch && matchLoc && matchType && matchStatus && hasAccess;
  }), [plots, searchTerm, filterLoc, filterType, filterStatus, isAdmin, isClient, currentUser, locations]);

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.locationId || !formData.varietyId || isSaving) {
        alert("Por favor complete los campos obligatorios (*)");
        return;
    }

    setIsSaving(true);
    const payload = {
        ...formData,
        id: Date.now().toString(),
        responsibleIds: [currentUser?.id || ''],
        surfaceArea: Number(formData.surfaceArea),
        density: Number(formData.density)
    } as Plot;

    const success = await addPlot(payload);
    if (success) {
        setIsAddModalOpen(false);
        setFormData({ name: '', type: 'Ensayo', locationId: '', projectId: '', varietyId: '', seedBatchId: '', status: 'Activa', sowingDate: new Date().toISOString().split('T')[0], surfaceArea: 0, surfaceUnit: 'ha', density: 0 });
    }
    setIsSaving(false);
  };

  const handleUpdatePlot = async (e: React.FormEvent) => {
      e.preventDefault();
      if (editingPlot) {
          setIsSaving(true);
          await updatePlot(editingPlot);
          setEditingPlot(null);
          setIsSaving(false);
      }
  };

  const handleExport = () => {
    const exportData = filteredPlots.map(p => ({
        'Nombre': p.name,
        'Tipo': p.type, 
        'Proyecto': projects.find(proj => proj.id === p.projectId)?.name || 'N/A',
        'Locación': locations.find(l => l.id === p.locationId)?.name || 'N/A',
        'Variedad': varieties.find(v => v.id === p.varietyId)?.name || 'N/A',
        'Estado': p.status,
        'Fecha Siembra': p.sowingDate
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Planilla_Global");
    XLSX.writeFile(workbook, `HempC_Planilla_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const inputClass = "w-full border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-3 rounded-xl focus:ring-2 focus:ring-hemp-500 outline-none transition-all disabled:opacity-50 font-medium";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-gray-800 dark:text-white flex items-center uppercase tracking-tighter italic">
                Unidades <span className="text-hemp-600">Productivas</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Control de parcelas, ensayos y lotes de producción.</p>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="bg-white dark:bg-slate-900 p-1 rounded-xl flex border dark:border-slate-800 shadow-sm">
              <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition ${viewMode === 'table' ? 'bg-hemp-600 text-white shadow-md' : 'text-gray-400'}`}><List size={20} /></button>
              <button onClick={() => setViewMode('gallery')} className={`p-2 rounded-lg transition ${viewMode === 'gallery' ? 'bg-hemp-600 text-white shadow-md' : 'text-gray-400'}`}><LayoutGrid size={20} /></button>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="flex-1 sm:flex-none bg-hemp-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-hemp-700 transition shadow-xl flex items-center justify-center">
            <Plus size={18} className="mr-2" /> Nueva Unidad
          </button>
        </div>
      </div>

      {/* FILTERS PANEL */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-[24px] shadow-sm border dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Buscar por identificador..." className="w-full pl-10 pr-4 py-2 border dark:border-slate-800 bg-gray-50 dark:bg-slate-950 rounded-xl text-sm outline-none focus:ring-2 focus:ring-hemp-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
          </div>
          <select className="px-3 py-2 border dark:border-slate-800 bg-gray-50 dark:bg-slate-950 rounded-xl text-sm outline-none font-bold text-gray-600 dark:text-white appearance-none" value={filterLoc} onChange={e => setFilterLoc(e.target.value)}>
              <option value="all">Todas las Locaciones</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select className="px-3 py-2 border dark:border-slate-800 bg-gray-50 dark:bg-slate-950 rounded-xl text-sm outline-none font-bold text-gray-600 dark:text-white appearance-none" value={filterType} onChange={e => setFilterType(e.target.value as any)}>
              <option value="all">Ensayo & Prod.</option>
              <option value="Ensayo">Solo Ensayos</option>
              <option value="Producción">Solo Producción</option>
          </select>
          <select className="px-3 py-2 border dark:border-slate-800 bg-gray-50 dark:bg-slate-950 rounded-xl text-sm outline-none font-bold text-gray-600 dark:text-white appearance-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">Todos los Estados</option>
              <option value="Activa">Activa</option>
              <option value="Cosechada">Cosechada</option>
          </select>
          <button onClick={() => { setSearchTerm(''); setFilterLoc('all'); setFilterType('all'); setFilterStatus('all'); }} className="text-[10px] font-black text-hemp-600 hover:text-hemp-700 uppercase tracking-widest text-center">Reset Filtros</button>
      </div>

      {viewMode === 'table' ? (
          <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 overflow-hidden overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-slate-950/50 text-gray-500 uppercase font-black text-[10px] tracking-widest border-b dark:border-slate-800">
                <tr>
                  <th className="px-8 py-5">Unidad</th>
                  <th className="px-8 py-5">Campaña / Sitio</th>
                  <th className="px-8 py-5">Genética</th>
                  <th className="px-8 py-5">Estado</th>
                  <th className="px-8 py-5 text-right">Ficha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium">
                {filteredPlots.length === 0 ? (
                  <tr><td colSpan={5} className="p-12 text-center text-gray-400 italic">Sin unidades registradas con este filtro.</td></tr>
                ) : filteredPlots.map(p => {
                  const loc = locations.find(l => l.id === p.locationId);
                  const vari = varieties.find(v => v.id === p.varietyId);
                  const proj = projects.find(pr => pr.id === p.projectId);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 group transition-colors">
                      <td className="px-8 py-5">
                          <div className="font-black text-gray-900 dark:text-white text-base tracking-tight">{p.name}</div>
                          <div className="text-[9px] font-black uppercase text-hemp-600 tracking-widest">{p.type}</div>
                      </td>
                      <td className="px-8 py-5">
                          <div className="text-gray-700 dark:text-gray-300 font-bold flex items-center mb-1 uppercase tracking-tighter">
                            <FolderKanban size={14} className="mr-2 text-blue-500 opacity-60"/>
                            {proj?.name || 'S/Campaña'}
                          </div>
                          <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center">
                              <MapPin size={10} className="mr-1.5"/>
                              {loc?.name || 'S/Sitio'}
                          </div>
                      </td>
                      <td className="px-8 py-5">
                          <div className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-tighter">{vari?.name || 'S/D'}</div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase">{vari?.usage || '-'}</div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase inline-flex items-center shadow-sm ${
                            p.status === 'Activa' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                            {p.status === 'Activa' && <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>}
                            {p.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setQrPlot(p)} className="p-2 text-gray-400 hover:text-blue-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 transition"><QrCode size={16}/></button>
                          {isAdmin && <button onClick={() => setEditingPlot(p)} className="p-2 text-gray-400 hover:text-hemp-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 transition"><Edit2 size={16}/></button>}
                          <Link to={`/plots/${p.id}`} className="p-2 text-hemp-600 bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 transition"><ChevronRight size={18} /></Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlots.map(p => (
                  <div key={p.id} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-sm border dark:border-slate-800 hover:shadow-xl transition-all relative group overflow-hidden flex flex-col h-full">
                      <div className="absolute top-0 right-0 p-3 bg-hemp-600 text-white rounded-bl-2xl font-black text-[9px] uppercase tracking-widest">{p.status}</div>
                      <h4 className="font-black text-xl text-gray-800 dark:text-white mb-1 uppercase tracking-tighter">{p.name}</h4>
                      <p className="text-[10px] text-hemp-600 mb-4 font-black uppercase tracking-[0.2em]">{p.type}</p>
                      
                      <div className="space-y-3 mb-6 flex-1">
                          <div className="bg-gray-50 dark:bg-slate-950 p-3 rounded-2xl border dark:border-slate-800 space-y-2">
                             <div className="flex items-center text-[10px] text-gray-500 font-bold uppercase"><MapPin size={12} className="mr-2 text-blue-500"/> {locations.find(l => l.id === p.locationId)?.name}</div>
                             <div className="flex items-center text-[10px] text-gray-500 font-bold uppercase"><FolderKanban size={12} className="mr-2 text-blue-500"/> {projects.find(pr => pr.id === p.projectId)?.name || 'Campaña S/D'}</div>
                          </div>
                          <div className="flex items-center text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tighter italic">
                              <Sprout size={14} className="mr-2 text-hemp-600 opacity-60"/>
                              {varieties.find(v => v.id === p.varietyId)?.name}
                          </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t dark:border-slate-800">
                          <div className="flex space-x-2">
                             <button onClick={() => setQrPlot(p)} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-xl text-gray-500 hover:text-blue-600 transition"><QrCode size={16}/></button>
                             {isAdmin && <button onClick={() => setEditingPlot(p)} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-xl text-gray-500 hover:text-hemp-600 transition"><Edit2 size={16}/></button>}
                          </div>
                          <Link to={`/plots/${p.id}`} className="bg-slate-900 dark:bg-hemp-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg">Entrar Bitácora</Link>
                      </div>
                  </div>
              ))}
          </div>
      )}

      {/* MODAL ALTA NUEVA UNIDAD */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] max-w-4xl w-full p-10 shadow-2xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-hemp-600 p-3 rounded-2xl text-white shadow-lg"><Sprout size={28}/></div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Lanzar <span className="text-hemp-600">Unidad Productiva</span></h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Protocolo de diseño de parcelas y lotes de escala</p>
                    </div>
                </div>
                <button onClick={() => !isSaving && setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition text-slate-400"><X size={28}/></button>
            </div>

            <form onSubmit={handleSubmitAdd} className="space-y-6 font-sans">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* COLUMNA 1: IDENTIFICACIÓN Y ASOCIACIONES */}
                  <div className="space-y-6">
                      <div className="bg-gray-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800">
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b dark:border-slate-800 pb-3 flex items-center"><Info size={14} className="mr-2 text-hemp-500"/> Definición Básica</h3>
                          <div className="space-y-4">
                              <div>
                                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1 mb-1 block">Identificador Único *</label>
                                  <input required type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} placeholder="EJ: LOTE-A1-TRELEW" />
                              </div>
                              <div>
                                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1 mb-1 block">Tipo de Cultivo</label>
                                  <div className="grid grid-cols-2 gap-2">
                                      {['Ensayo', 'Producción'].map(t => (
                                          <button key={t} type="button" onClick={() => setFormData({...formData, type: t as any})} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${formData.type === t ? 'bg-hemp-600 text-white border-hemp-600 shadow-md' : 'bg-white dark:bg-slate-800 text-gray-400 border-gray-200 dark:border-slate-700 hover:bg-gray-50'}`}>{t}</button>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/30">
                          <h3 className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-6 border-b border-blue-100 dark:border-blue-900/30 pb-3 flex items-center"><LinkIcon size={14} className="mr-2"/> Atribución de Sitio</h3>
                          <div className="space-y-4">
                              <div>
                                  <label className="text-[9px] font-black uppercase text-blue-800 dark:text-blue-300 ml-1 mb-1 block">Establecimiento / Campo *</label>
                                  <select required className={inputClass} value={formData.locationId} onChange={e => setFormData({...formData, locationId: e.target.value})}>
                                      <option value="">-- Seleccionar Campo --</option>
                                      {locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.province})</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label className="text-[9px] font-black uppercase text-blue-800 dark:text-blue-300 ml-1 mb-1 block">Campaña / Proyecto</label>
                                  <select className={inputClass} value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})}>
                                      <option value="">-- Sin proyecto específico --</option>
                                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                  </select>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* COLUMNA 2: GENÉTICA Y DISEÑO */}
                  <div className="space-y-6">
                      <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30">
                          <h3 className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-6 border-b border-emerald-100 dark:border-emerald-900/30 pb-3 flex items-center"><FlaskConical size={14} className="mr-2"/> Genética & Material</h3>
                          <div className="space-y-4">
                              <div>
                                  <label className="text-[9px] font-black uppercase text-emerald-800 dark:text-emerald-300 ml-1 mb-1 block">Variedad Genética *</label>
                                  <select required className={inputClass} value={formData.varietyId} onChange={e => setFormData({...formData, varietyId: e.target.value})}>
                                      <option value="">-- Seleccionar Genética --</option>
                                      {varieties.map(v => <option key={v.id} value={v.id}>{v.name} ({v.usage})</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label className="text-[9px] font-black uppercase text-emerald-800 dark:text-emerald-300 ml-1 mb-1 block">Lote de Semilla (Trazabilidad)</label>
                                  <select className={inputClass} value={formData.seedBatchId} onChange={e => setFormData({...formData, seedBatchId: e.target.value})}>
                                      <option value="">-- Autoproducción o Externo --</option>
                                      {seedBatches.filter(b => !formData.varietyId || b.varietyId === formData.varietyId).map(b => (
                                          <option key={b.id} value={b.id}>{b.batchCode} - Disp: {b.remainingQuantity} kg</option>
                                      ))}
                                  </select>
                              </div>
                          </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[32px] border dark:border-slate-800">
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b dark:border-slate-800 pb-3 flex items-center"><Activity size={14} className="mr-2"/> Diseño Técnico</h3>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1 mb-1 block">Superficie</label>
                                  <div className="flex">
                                      <input type="number" step="0.01" className={`${inputClass} rounded-r-none`} value={formData.surfaceArea} onChange={e => setFormData({...formData, surfaceArea: Number(e.target.value)})} />
                                      <select className="bg-slate-100 dark:bg-slate-800 border border-l-0 border-gray-300 dark:border-slate-800 rounded-r-xl px-2 text-[10px] font-black uppercase outline-none" value={formData.surfaceUnit} onChange={e => setFormData({...formData, surfaceUnit: e.target.value as any})}>
                                          <option value="ha">HA</option>
                                          <option value="m2">M²</option>
                                          <option value="ac">AC</option>
                                      </select>
                                  </div>
                              </div>
                              <div>
                                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1 mb-1 block">Fecha de Siembra</label>
                                  <input type="date" required className={inputClass} value={formData.sowingDate} onChange={e => setFormData({...formData, sowingDate: e.target.value})} />
                              </div>
                              <div className="col-span-2">
                                  <label className="text-[9px] font-black uppercase text-slate-400 ml-1 mb-1 block">Densidad Objetivo (pl/m²)</label>
                                  <input type="number" className={inputClass} value={formData.density} onChange={e => setFormData({...formData, density: Number(e.target.value)})} placeholder="Ej: 150" />
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="flex justify-end space-x-3 pt-8 border-t dark:border-slate-800 mt-4">
                <button type="button" disabled={isSaving} onClick={() => setIsAddModalOpen(false)} className="px-8 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition">Descartar</button>
                <button type="submit" disabled={isSaving} className="bg-slate-900 dark:bg-hemp-600 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 className="animate-spin mr-2" size={18}/> : <Save className="mr-2" size={18}/>}
                    {isSaving ? 'Lanzando...' : 'Lanzar Unidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {qrPlot && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl max-w-sm w-full p-10 text-center animate-in zoom-in-95 relative overflow-hidden">
                  <button onClick={() => setQrPlot(null)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition dark:text-white"><X size={24}/></button>
                  <div className="mb-8">
                    <div className="bg-hemp-50 dark:bg-hemp-900/20 p-4 rounded-3xl inline-block mb-4"><QrCode size={40} className="text-hemp-600"/></div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Etiqueta de Campo</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{qrPlot.name}</p>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] shadow-inner border border-slate-100 mb-8 inline-block mx-auto">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/#/plots/' + qrPlot.id)}`} alt="QR Code" className="w-48 h-48"/>
                  </div>
                  <button onClick={() => window.print()} className="w-full bg-slate-900 dark:bg-hemp-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl flex items-center justify-center hover:scale-[1.02] transition-all">
                      <Printer size={18} className="mr-2"/> Imprimir Etiqueta
                  </button>
              </div>
          </div>
      )}

      {/* EDIT MODAL */}
      {editingPlot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl max-w-xl w-full p-10 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tighter">Editar Unidad</h2>
                    <button onClick={() => setEditingPlot(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition dark:text-gray-400"><X size={24}/></button>
                </div>
                <form onSubmit={handleUpdatePlot} className="space-y-6 font-sans">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Identificador Único *</label>
                        <input required className={inputClass} value={editingPlot.name} onChange={e => setEditingPlot({...editingPlot, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Tipo de Unidad</label>
                            <select className={inputClass} value={editingPlot.type} onChange={e => setEditingPlot({...editingPlot, type: e.target.value as any})}>
                                <option value="Ensayo">Ensayo (I+D)</option>
                                <option value="Producción">Producción (Escala)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-1">Estatus Actual</label>
                            <select className={inputClass} value={editingPlot.status} onChange={e => setEditingPlot({...editingPlot, status: e.target.value as any})}>
                                <option value="Activa">Activa</option>
                                <option value="Cosechada">Cosechada</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-8 border-t dark:border-slate-800 mt-4">
                        <button type="button" onClick={() => setEditingPlot(null)} className="px-8 py-3 text-gray-500 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="px-10 py-3 bg-hemp-600 text-white rounded-2xl font-black shadow-lg hover:bg-hemp-700 transition uppercase text-[10px] tracking-widest flex items-center">
                            {isSaving ? <Loader2 className="animate-spin mr-2" size={16}/> : null}
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
