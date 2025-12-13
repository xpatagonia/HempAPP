import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Plot } from '../types';
import { Plus, ChevronRight, CheckCircle, FileSpreadsheet, Edit2, Calendar, UserCheck, MapPin, Box, Trash2, LayoutGrid, List, Image as ImageIcon, Ruler, Droplets, FlaskConical, Tractor, Tag, Sprout, Map } from 'lucide-react';
import * as XLSX from 'xlsx';
import MapEditor from '../components/MapEditor';

export default function Plots() {
  const { plots, locations, varieties, projects, usersList, addPlot, updatePlot, deletePlot, currentUser, getLatestRecord, logs, seedBatches } = useAppContext();
  
  const [searchParams] = useSearchParams();
  const initialProjectFilter = searchParams.get('project') || 'all';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // View Mode State
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table');

  const [filterLoc, setFilterLoc] = useState('all');
  const [filterProj, setFilterProj] = useState(initialProjectFilter);
  const [filterType, setFilterType] = useState<'all' | 'Ensayo' | 'Producción'>('all');

  // Extended form state to handle lat/lng strings and Polygon
  const [formData, setFormData] = useState<Partial<Plot> & { lat?: string, lng?: string }>({
    projectId: '', locationId: '', varietyId: '', seedBatchId: '',
    type: 'Ensayo',
    block: '1', replicate: 1,
    ownerName: '', responsibleIds: [],
    sowingDate: '', rowDistance: 0, density: 0, 
    surfaceArea: 0, surfaceUnit: 'm2',
    status: 'Activa',
    observations: '',
    irrigationType: '',
    lat: '', lng: '',
    polygon: []
  });

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;

  // Filter available batches based on selected variety
  const availableBatches = seedBatches.filter(b => b.varietyId === formData.varietyId);

  // Get location center for map init
  const selectedLocation = locations.find(l => l.id === formData.locationId);
  const mapCenter = selectedLocation?.coordinates 
    ? { lat: selectedLocation.coordinates.lat, lng: selectedLocation.coordinates.lng } 
    : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId || !formData.locationId || !formData.varietyId) return;
    
    // Generate standard name if creating
    const v = varieties.find(v => v.id === formData.varietyId);
    const varCode = v ? v.name.substring(0, 3).toUpperCase() : 'VAR';
    
    // Naming convention differs slightly by type
    let autoName = '';
    if (formData.type === 'Producción') {
        autoName = `LOTE-${formData.block}-${varCode}`; // Example: LOTE-A1-USO
    } else {
        autoName = `${varCode}-B${formData.block}-R${formData.replicate}`; // Example: USO-B1-R1
    }

    // Process coordinates (Center)
    // If user drew a polygon, use the first point as center if no lat/lng manually entered
    let finalLat = parseFloat(formData.lat || '0');
    let finalLng = parseFloat(formData.lng || '0');

    if (!finalLat && formData.polygon && formData.polygon.length > 0) {
        finalLat = formData.polygon[0].lat;
        finalLng = formData.polygon[0].lng;
    }

    const coordinates = (finalLat && finalLng) 
      ? { lat: finalLat, lng: finalLng }
      : undefined;

    const plotPayload = {
      type: formData.type || 'Ensayo',
      locationId: formData.locationId!,
      varietyId: formData.varietyId!,
      seedBatchId: formData.seedBatchId || null, 
      projectId: formData.projectId!,
      block: formData.block!,
      replicate: Number(formData.replicate),
      ownerName: formData.ownerName || 'No especificado',
      responsibleIds: formData.responsibleIds || [],
      sowingDate: formData.sowingDate!,
      rowDistance: Number(formData.rowDistance),
      density: Number(formData.density),
      surfaceArea: Number(formData.surfaceArea || 0),
      surfaceUnit: formData.surfaceUnit || 'm2',
      status: formData.status || 'Activa',
      observations: formData.observations,
      irrigationType: formData.irrigationType,
      coordinates,
      polygon: formData.polygon || [] // Save the drawn polygon
    } as any;

    if (editingId) {
        updatePlot({ ...plotPayload, id: editingId, name: plots.find(p => p.id === editingId)?.name || autoName } as Plot);
    } else {
        addPlot({
            ...plotPayload,
            id: Date.now().toString(),
            name: autoName,
        } as Plot);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
        projectId: '', locationId: '', varietyId: '', seedBatchId: '', type: 'Ensayo', block: '1', replicate: 1,
        ownerName: '', responsibleIds: [], sowingDate: '', rowDistance: 0, density: 0, 
        surfaceArea: 0, surfaceUnit: 'm2',
        status: 'Activa', observations: '', irrigationType: '',
        lat: '', lng: '', polygon: []
    });
    setEditingId(null);
  };

  const openNew = () => {
      resetForm();
      setIsModalOpen(true);
  };

  const handleEdit = (p: Plot) => {
      setFormData({
        ...p,
        lat: p.coordinates?.lat.toString() || '',
        lng: p.coordinates?.lng.toString() || '',
        surfaceArea: p.surfaceArea || 0,
        surfaceUnit: p.surfaceUnit || 'm2',
        type: p.type || 'Ensayo',
        seedBatchId: p.seedBatchId || '',
        polygon: p.polygon || []
      });
      setEditingId(p.id);
      setIsModalOpen(true);
  };

  const handlePolygonChange = (newPoly: { lat: number, lng: number }[], areaHa: number) => {
      setFormData(prev => ({
          ...prev,
          polygon: newPoly,
          // Auto-calculate area if unit is hectares
          surfaceArea: areaHa > 0 ? Number(areaHa.toFixed(2)) : prev.surfaceArea,
          surfaceUnit: areaHa > 0 ? 'ha' : prev.surfaceUnit
      }));
  };

  const handleDelete = async (id?: string) => {
      const targetId = id || editingId;
      if (targetId && window.confirm("¡ATENCIÓN! ¿Estás seguro de eliminar esta parcela y TODOS sus registros históricos? Esta acción no se puede deshacer.")) {
        await deletePlot(targetId);
        setIsModalOpen(false);
      }
  };

  const handleExport = () => {
    // Export full merged data
    const exportData = plots.map(p => {
        const l = locations.find(l => l.id === p.locationId);
        const v = varieties.find(v => v.id === p.varietyId);
        const pr = projects.find(proj => proj.id === p.projectId);
        const sb = seedBatches.find(b => b.id === p.seedBatchId);
        const d = getLatestRecord(p.id);

        return {
            'Tipo': p.type || 'Ensayo',
            'Proyecto': pr?.name,
            'Locación': l?.name,
            'Variedad': v?.name,
            'Lote Semilla': sb ? sb.batchCode : '-',
            'Bloque/Lote': p.block,
            'Repetición': p.replicate,
            'Latitud': p.coordinates?.lat || l?.coordinates?.lat || '-',
            'Longitud': p.coordinates?.lng || l?.coordinates?.lng || '-',
            'Sup. Siembra': p.surfaceArea ? `${p.surfaceArea} ${p.surfaceUnit}` : '-',
            'Fecha Siembra': p.sowingDate,
            'Último Reg': d?.date || '-',
            'Etapa': d?.stage || '-',
            'Altura Planta': d?.plantHeight || '-',
            'Rendimiento': d?.yield || '-',
            'Observaciones': p.observations || '-',
            'Riego': p.irrigationType || '-'
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registro_Cultivos");
    XLSX.writeFile(workbook, "HempAPP_Registro_Cultivos.xlsx");
  };

  const toggleResponsible = (userId: string) => {
    const current = formData.responsibleIds || [];
    if (current.includes(userId)) {
        setFormData({...formData, responsibleIds: current.filter(id => id !== userId)});
    } else {
        setFormData({...formData, responsibleIds: [...current, userId]});
    }
  };

  const filteredPlots = plots.filter(p => {
      const matchLoc = filterLoc === 'all' || p.locationId === filterLoc;
      const matchProj = filterProj === 'all' || p.projectId === filterProj;
      const matchType = filterType === 'all' || p.type === filterType;
      const isAssigned = isAdmin || (currentUser && p.responsibleIds?.includes(currentUser.id));
      return matchLoc && matchProj && matchType && isAssigned;
  });

  const getLatestPhoto = (plotId: string) => {
      // Find latest log with a photo
      const plotLogs = logs.filter(l => l.plotId === plotId && l.photoUrl).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return plotLogs.length > 0 ? plotLogs[0].photoUrl : null;
  };

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors";

  // Filter users to show in the Assignment Modal
  const assignableUsers = usersList.filter(u => u.role === 'admin' || u.role === 'technician' || u.role === 'viewer');

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Planilla de Cultivo</h1>
            <p className="text-sm text-gray-500">Gestión de parcelas de ensayo y lotes productivos.</p>
        </div>
        <div className="flex space-x-2 w-full sm:w-auto">
          {/* View Toggle */}
          <div className="bg-gray-100 p-1 rounded-lg flex mr-2">
              <button 
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md transition ${viewMode === 'table' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                title="Vista Lista"
              >
                  <List size={18} />
              </button>
              <button 
                onClick={() => setViewMode('gallery')}
                className={`p-2 rounded-md transition ${viewMode === 'gallery' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                title="Vista Recorrida Visual"
              >
                  <LayoutGrid size={18} />
              </button>
          </div>

          <button onClick={handleExport} className="border border-gray-300 bg-white text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 flex items-center justify-center transition" title="Exportar Excel">
             <FileSpreadsheet size={18} />
          </button>
          {isAdmin && (
            <button onClick={openNew} className="bg-hemp-600 text-white px-4 py-2 rounded-lg flex items-center justify-center hover:bg-hemp-700 transition flex-1 sm:flex-none font-medium">
                <Plus size={20} className="mr-2" /> Nueva
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-col md:flex-row gap-4">
            
            {/* Type Filter */}
            <div className="flex items-center bg-gray-100 p-1 rounded-lg w-fit">
                <button 
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${filterType === 'all' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
                >
                    Todos
                </button>
                <button 
                    onClick={() => setFilterType('Ensayo')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center ${filterType === 'Ensayo' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                >
                    <FlaskConical size={12} className="mr-1"/> I+D (Ensayos)
                </button>
                <button 
                    onClick={() => setFilterType('Producción')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center ${filterType === 'Producción' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}
                >
                    <Tractor size={12} className="mr-1"/> Producción
                </button>
            </div>

            {/* Project Filter */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 custom-scrollbar flex-1">
                 <span className="text-sm font-semibold text-gray-500 mr-2 whitespace-nowrap">Proyecto:</span>
                 <button onClick={() => setFilterProj('all')} className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border transition ${filterProj === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Todos</button>
                 {projects.map(pr => (
                     <button key={pr.id} onClick={() => setFilterProj(pr.id)} className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border transition ${filterProj === pr.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        {pr.name}
                     </button>
                 ))}
            </div>
        </div>
      </div>

      {viewMode === 'table' ? (
          // --- TABLE VIEW ---
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">ID / Nombre</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Variedad</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase">Bloque</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Locación</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Superficie</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPlots.length === 0 ? (
                    <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500 italic">
                            {isAdmin 
                              ? "No se encontraron parcelas con los filtros actuales."
                              : "No tienes parcelas asignadas a tu usuario."
                            }
                        </td>
                    </tr>
                ) : filteredPlots.map(p => {
                  const loc = locations.find(l => l.id === p.locationId);
                  const vari = varieties.find(v => v.id === p.varietyId);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 group">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3">
                          {p.type === 'Producción' ? (
                              <span className="flex items-center text-green-700 text-xs bg-green-50 px-2 py-0.5 rounded border border-green-100 w-fit">
                                  <Tractor size={10} className="mr-1"/> Prod.
                              </span>
                          ) : (
                              <span className="flex items-center text-blue-700 text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-100 w-fit">
                                  <FlaskConical size={10} className="mr-1"/> I+D
                              </span>
                          )}
                      </td>
                      <td className="px-4 py-3 text-hemp-800 font-semibold">{vari?.name}</td>
                      <td className="px-4 py-3 text-center">{p.block}</td>
                      <td className="px-4 py-3 text-gray-600">{loc?.name}</td>
                      <td className="px-4 py-3 text-gray-600">
                          {p.surfaceArea ? `${p.surfaceArea} ${p.surfaceUnit}` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.status === 'Activa' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {p.status === 'Activa' && <CheckCircle size={10} className="mr-1"/>}
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {isAdmin && (
                            <>
                                <button onClick={() => handleEdit(p)} className="text-gray-400 hover:text-hemp-600 inline-block align-middle p-1" title="Editar">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-600 inline-block align-middle p-1" title="Eliminar">
                                    <Trash2 size={16} />
                                </button>
                            </>
                        )}
                        <Link to={`/plots/${p.id}`} className="text-hemp-600 hover:text-hemp-900 font-medium inline-block align-middle p-1" title="Ver Detalle">
                          <ChevronRight size={20} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      ) : (
          // --- GALLERY VIEW (VISUAL SCOUTING) ---
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPlots.map(p => {
                  const loc = locations.find(l => l.id === p.locationId);
                  const vari = varieties.find(v => v.id === p.varietyId);
                  const latestPhoto = getLatestPhoto(p.id);
                  const latestData = getLatestRecord(p.id);

                  return (
                      <Link to={`/plots/${p.id}`} key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition group flex flex-col h-full relative">
                          {/* Type Badge */}
                          <div className="absolute top-2 left-2 z-10">
                              {p.type === 'Producción' ? (
                                  <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center">
                                      <Tractor size={10} className="mr-1"/> COMERCIAL
                                  </span>
                              ) : (
                                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center">
                                      <FlaskConical size={10} className="mr-1"/> ENSAYO
                                  </span>
                              )}
                          </div>

                          {/* Card Image Header */}
                          <div className="h-48 bg-gray-100 relative overflow-hidden">
                              {latestPhoto ? (
                                  <img src={latestPhoto} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50 pattern-grid-lg">
                                      {/* Show Map Icon if coordinates/polygon exist but no photo */}
                                      {p.coordinates || (p.polygon && p.polygon.length > 0) ? (
                                          <>
                                            <Map size={32} className="mb-2 opacity-50" />
                                            <span className="text-xs font-medium">Ubicada</span>
                                          </>
                                      ) : (
                                          <>
                                            <ImageIcon size={32} className="mb-2 opacity-50" />
                                            <span className="text-xs font-medium">Sin datos</span>
                                          </>
                                      )}
                                  </div>
                              )}
                              
                              {/* Overlay Badge Status */}
                              <div className="absolute top-2 right-2">
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold shadow-sm uppercase ${p.status === 'Activa' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                                      {p.status}
                                  </span>
                              </div>
                              
                              {/* Overlay Bottom Gradient */}
                              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-4">
                                  <h3 className="text-white font-bold text-lg leading-tight shadow-black drop-shadow-md">{p.name}</h3>
                                  <p className="text-gray-200 text-xs">{vari?.name} • {loc?.name}</p>
                              </div>
                          </div>

                          {/* Card Body */}
                          <div className="p-4 flex-1 flex flex-col">
                              <div className="grid grid-cols-2 gap-2 mb-4">
                                  <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                      <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Altura</span>
                                      <div className="text-sm font-bold text-gray-800 flex items-center">
                                          <Ruler size={14} className="mr-1 text-blue-500"/> 
                                          {latestData?.plantHeight ? `${latestData.plantHeight} cm` : '-'}
                                      </div>
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded border border-gray-100">
                                      <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Superficie</span>
                                      <div className="text-sm font-bold text-gray-800 truncate">
                                          {p.surfaceArea ? `${p.surfaceArea} ${p.surfaceUnit}` : '-'}
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="mt-auto pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                                  <div className="flex items-center">
                                      <Calendar size={12} className="mr-1" />
                                      Siembra: {p.sowingDate}
                                  </div>
                                  {p.irrigationType && (
                                      <div className="flex items-center" title="Riego">
                                          <Droplets size={12} className="mr-1 text-blue-400" />
                                          {p.irrigationType}
                                      </div>
                                  )}
                              </div>
                          </div>
                      </Link>
                  );
              })}
          </div>
      )}

       {/* Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900">{editingId ? 'Editar Unidad' : 'Nueva Unidad de Cultivo'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* LEFT COLUMN: BASIC INFO */}
                  <div className="space-y-6">
                      {/* Sección 1: Identidad (COLOR PÚRPURA SUAVE) */}
                      <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                          <h3 className="text-sm font-bold text-purple-800 mb-3 flex items-center uppercase">
                              <Box size={14} className="mr-2"/> Identidad y Propósito
                          </h3>
                          <div className="grid grid-cols-1 gap-4">
                             <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-medium text-purple-900 mb-1">Proyecto Marco</label>
                                    <select required className={inputClass} value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})}>
                                        <option value="">Seleccionar Proyecto...</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                 </div>
                                 <div>
                                     <label className="block text-sm font-medium text-purple-900 mb-1">Tipo de Cultivo</label>
                                     <select className={inputClass} value={formData.type || 'Ensayo'} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                                         <option value="Ensayo">I+D (Ensayo Experimental)</option>
                                         <option value="Producción">Producción (Lote Comercial)</option>
                                     </select>
                                 </div>
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-purple-900 mb-1">Variedad</label>
                                <select required className={inputClass} value={formData.varietyId} onChange={e => setFormData({...formData, varietyId: e.target.value, seedBatchId: ''})}>
                                  <option value="">Seleccionar...</option>
                                  {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                             </div>
                             {/* SEED BATCH SELECTOR */}
                             <div>
                                <label className="block text-sm font-medium text-purple-900 mb-1 flex items-center">
                                    <Tag size={12} className="mr-1"/> Lote de Semilla (Trazabilidad)
                                </label>
                                <select 
                                    className={inputClass} 
                                    value={formData.seedBatchId || ''} 
                                    onChange={e => setFormData({...formData, seedBatchId: e.target.value})}
                                    disabled={!formData.varietyId}
                                >
                                  <option value="">-- Origen Genérico --</option>
                                  {availableBatches.map(b => (
                                      <option key={b.id} value={b.id}>
                                          {b.batchCode} ({b.supplierName})
                                      </option>
                                  ))}
                                </select>
                             </div>
                             
                             <div className="grid grid-cols-2 gap-2">
                                 <div>
                                    <label className="block text-sm font-medium text-purple-900 mb-1">Bloque / Lote</label>
                                    <input required type="text" className={inputClass} placeholder="1" value={formData.block} onChange={e => setFormData({...formData, block: e.target.value})} />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-medium text-purple-900 mb-1">
                                        {formData.type === 'Producción' ? 'Sector' : 'Rep (R)'}
                                    </label>
                                    <input required type="number" className={inputClass} placeholder="1" value={formData.replicate} onChange={e => setFormData({...formData, replicate: Number(e.target.value)})} />
                                 </div>
                             </div>
                          </div>
                      </div>

                      {/* Sección 3: Manejo Agronómico (COLOR VERDE SUAVE) */}
                      <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                          <h3 className="text-sm font-bold text-green-800 mb-3 flex items-center uppercase">
                              <Sprout size={14} className="mr-2"/> Manejo Agronómico
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-green-900 mb-1">Fecha Siembra</label>
                                <input type="date" className={`${inputClass} cursor-pointer`} value={formData.sowingDate} onChange={e => setFormData({...formData, sowingDate: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-green-900 mb-1">Riego</label>
                                <select className={inputClass} value={formData.irrigationType || ''} onChange={e => setFormData({...formData, irrigationType: e.target.value})}>
                                    <option value="">-</option>
                                    <option value="Goteo">Goteo</option>
                                    <option value="Aspersión">Aspersión</option>
                                    <option value="Surco">Surco</option>
                                    <option value="Secano">Secano</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-green-900 mb-1">Densidad (pl/m2)</label>
                                <input type="number" className={inputClass} value={formData.density} onChange={e => setFormData({...formData, density: Number(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-green-900 mb-1">Distancia (cm)</label>
                                <input type="number" className={inputClass} value={formData.rowDistance} onChange={e => setFormData({...formData, rowDistance: Number(e.target.value)})} />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-green-900 mb-1">Superficie Total</label>
                                <div className="flex">
                                    <input type="number" step="any" placeholder="0" className={`${inputClass} rounded-r-none border-r-0`} value={formData.surfaceArea || ''} onChange={e => setFormData({...formData, surfaceArea: Number(e.target.value)})} />
                                    <select className="bg-white border border-gray-300 text-gray-700 text-sm rounded-r px-1 focus:outline-none" value={formData.surfaceUnit} onChange={e => setFormData({...formData, surfaceUnit: e.target.value as any})}>
                                        <option value="m2">m²</option>
                                        <option value="ha">ha</option>
                                        <option value="ac">acres</option>
                                    </select>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Calculada automáticamente si dibujas el polígono.</p>
                            </div>
                          </div>
                      </div>
                  </div>

                  {/* RIGHT COLUMN: MAPS & LOCATION */}
                  <div className="space-y-6">
                      {/* Sección 2: Ubicación (COLOR AZUL SUAVE) */}
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 h-full flex flex-col">
                          <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center uppercase">
                              <MapPin size={14} className="mr-2"/> Georreferenciación
                          </h3>
                          
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-blue-900 mb-1">Locación (Establecimiento)</label>
                            <select required className={inputClass} value={formData.locationId} onChange={e => setFormData({...formData, locationId: e.target.value})}>
                              <option value="">Seleccionar...</option>
                              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                          </div>

                          <div className="flex-1 flex flex-col">
                              <label className="block text-sm font-medium text-blue-900 mb-2">Dibujar Polígono del Lote</label>
                              
                              {/* MAP EDITOR COMPONENT */}
                              {formData.locationId ? (
                                  <MapEditor 
                                    initialCenter={mapCenter}
                                    initialPolygon={formData.polygon}
                                    onPolygonChange={handlePolygonChange}
                                    height="300px"
                                  />
                              ) : (
                                  <div className="bg-gray-200 rounded h-64 flex items-center justify-center text-gray-500 text-sm border-2 border-dashed border-gray-300">
                                      Selecciona una locación primero
                                  </div>
                              )}
                              
                              <div className="grid grid-cols-2 gap-2 mt-4">
                                  <div>
                                      <label className="block text-xs font-medium text-blue-900 mb-1">Latitud (Centro)</label>
                                      <input type="number" step="any" placeholder="-34..." className={inputClass} value={formData.lat || (formData.polygon?.[0]?.lat || '')} onChange={e => setFormData({...formData, lat: e.target.value})} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-medium text-blue-900 mb-1">Longitud (Centro)</label>
                                      <input type="number" step="any" placeholder="-58..." className={inputClass} value={formData.lng || (formData.polygon?.[0]?.lng || '')} onChange={e => setFormData({...formData, lng: e.target.value})} />
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* FULL WIDTH BOTTOM SECTIONS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <UserCheck size={14} className="mr-1" /> Responsables Asignados
                    </label>
                    <div className="border border-gray-300 bg-white rounded p-2 h-24 overflow-y-auto text-xs grid grid-cols-2 gap-1">
                      {assignableUsers.map(u => (
                          <label key={u.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                              <input 
                                 type="checkbox" 
                                 className="rounded text-hemp-600 focus:ring-hemp-500" 
                                 checked={formData.responsibleIds?.includes(u.id)} 
                                 onChange={() => toggleResponsible(u.id)} 
                              />
                              <span className="text-gray-900">{u.name}</span>
                          </label>
                      ))}
                   </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones Generales</label>
                    <textarea
                      className={`${inputClass} h-24`}
                      value={formData.observations || ''}
                      onChange={e => setFormData({...formData, observations: e.target.value})}
                      placeholder="Notas sobre el suelo, condiciones iniciales, etc."
                    ></textarea>
                  </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                {editingId && isAdmin ? (
                     <button type="button" onClick={() => handleDelete()} className="text-red-500 hover:text-red-700 text-sm flex items-center px-2 py-1 hover:bg-red-50 rounded transition">
                         <Trash2 size={16} className="mr-1"/> Eliminar Parcela
                     </button>
                ) : <div></div>}
                
                <div className="flex space-x-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-hemp-600 text-white rounded hover:bg-hemp-700 shadow-sm font-bold">Guardar</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}