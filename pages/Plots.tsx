
import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Plot } from '../types';
import { Plus, ChevronRight, CheckCircle, FileSpreadsheet, Edit2, Calendar, UserCheck } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Plots() {
  const { plots, locations, varieties, projects, usersList, addPlot, updatePlot, currentUser, getLatestRecord } = useAppContext();
  const [searchParams] = useSearchParams();
  const initialProjectFilter = searchParams.get('project') || 'all';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [filterLoc, setFilterLoc] = useState('all');
  const [filterProj, setFilterProj] = useState(initialProjectFilter);

  // Extended form state to handle lat/lng strings
  const [formData, setFormData] = useState<Partial<Plot> & { lat?: string, lng?: string }>({
    projectId: '', locationId: '', varietyId: '', 
    block: '1', replicate: 1,
    ownerName: '', responsibleIds: [],
    sowingDate: '', rowDistance: 0, density: 0, 
    status: 'Activa',
    observations: '',
    irrigationType: '',
    lat: '', lng: ''
  });

  const isAdmin = currentUser?.role === 'admin';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId || !formData.locationId || !formData.varietyId) return;
    
    // Generate standard name if creating
    const v = varieties.find(v => v.id === formData.varietyId);
    const varCode = v ? v.name.substring(0, 3).toUpperCase() : 'VAR';
    const autoName = `${varCode}-B${formData.block}-R${formData.replicate}`;

    // Process coordinates
    const coordinates = (formData.lat && formData.lng) 
      ? { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) }
      : undefined;

    const plotPayload = {
      locationId: formData.locationId!,
      varietyId: formData.varietyId!,
      projectId: formData.projectId!,
      block: formData.block!,
      replicate: Number(formData.replicate),
      ownerName: formData.ownerName || 'No especificado',
      responsibleIds: formData.responsibleIds || [],
      sowingDate: formData.sowingDate!,
      rowDistance: Number(formData.rowDistance),
      density: Number(formData.density),
      status: formData.status || 'Activa',
      observations: formData.observations,
      irrigationType: formData.irrigationType,
      coordinates
    } as any;

    if (editingId) {
        // When editing, keep ID and Name (unless we want to regen name, but better keep stable)
        updatePlot({ ...plotPayload, id: editingId, name: autoName } as Plot);
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
        projectId: '', locationId: '', varietyId: '', block: '1', replicate: 1,
        ownerName: '', responsibleIds: [], sowingDate: '', rowDistance: 0, density: 0, 
        status: 'Activa', observations: '', irrigationType: '',
        lat: '', lng: ''
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
        lng: p.coordinates?.lng.toString() || ''
      });
      setEditingId(p.id);
      setIsModalOpen(true);
  };

  const handleExport = () => {
    // Export full merged data (Plot Info + Latest Trial Data)
    const exportData = plots.map(p => {
        const l = locations.find(l => l.id === p.locationId);
        const v = varieties.find(v => v.id === p.varietyId);
        const pr = projects.find(proj => proj.id === p.projectId);
        
        // Use the new helper to get current status
        const d = getLatestRecord(p.id);

        return {
            'Proyecto': pr?.name,
            'Locación': l?.name,
            'Variedad': v?.name,
            'Bloque': p.block,
            'Repetición': p.replicate,
            'Latitud': p.coordinates?.lat || l?.coordinates?.lat || '-',
            'Longitud': p.coordinates?.lng || l?.coordinates?.lng || '-',
            'Fecha Siembra': p.sowingDate,
            'Último Reg': d?.date || '-',
            'Etapa': d?.stage || '-',
            'Emergencia': d?.emergenceDate || '-',
            'N° Plantas/m (Ini)': d?.plantsPerMeterInit || '-',
            'Uniformidad': d?.uniformity || '-',
            'Vigor': d?.vigor || '-',
            'Floración': d?.floweringDate || '-',
            'Altura Planta': d?.plantHeight || '-',
            'Vuelco': d?.lodging || '-',
            'Daño Aves': d?.birdDamage || '-',
            'Enfermedades': d?.diseases || '-',
            'Plagas': d?.pests || '-',
            'Fecha Cosecha': d?.harvestDate || '-',
            'Altura Cosecha': d?.harvestHeight || '-',
            'N° Plantas/m (Fin)': d?.plantsPerMeterFinal || '-',
            'Peso Tallo (g)': d?.stemWeight || '-',
            'Peso Hoja (g)': d?.leafWeight || '-',
            'Rendimiento': d?.yield || '-',
            'Observaciones': p.observations || '-',
            'Riego': p.irrigationType || '-'
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resumen Ensayos");
    XLSX.writeFile(workbook, "Registro_Ensayos_Canamo.xlsx");
  };

  const toggleResponsible = (userId: string) => {
    const current = formData.responsibleIds || [];
    if (current.includes(userId)) {
        setFormData({...formData, responsibleIds: current.filter(id => id !== userId)});
    } else {
        setFormData({...formData, responsibleIds: [...current, userId]});
    }
  };

  // Filter Logic:
  // 1. Dropdown Filters (Location, Project)
  // 2. Role Restriction: Admin sees all, Technician sees only assigned
  const filteredPlots = plots.filter(p => {
      const matchLoc = filterLoc === 'all' || p.locationId === filterLoc;
      const matchProj = filterProj === 'all' || p.projectId === filterProj;
      
      const isAssigned = isAdmin || (currentUser && p.responsibleIds.includes(currentUser.id));

      return matchLoc && matchProj && isAssigned;
  });

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors";

  // Filter users to only show potential technicians (Admin or Technician role)
  const assignableUsers = usersList.filter(u => u.role === 'admin' || u.role === 'technician');

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Planilla de Ensayos</h1>
        <div className="flex space-x-2 w-full sm:w-auto">
          <button onClick={handleExport} className="border border-gray-300 bg-white text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 flex items-center flex-1 sm:flex-none justify-center transition">
             <FileSpreadsheet size={18} className="mr-2 text-green-600" /> Exportar Resumen
          </button>
          {isAdmin && (
            <button onClick={openNew} className="bg-hemp-600 text-white px-4 py-2 rounded-lg flex items-center justify-center hover:bg-hemp-700 transition flex-1 sm:flex-none">
                <Plus size={20} className="mr-2" /> Nueva Parcela
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
             <span className="text-sm font-semibold text-gray-500 mr-2">Proyecto:</span>
             <button onClick={() => setFilterProj('all')} className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border transition ${filterProj === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Todos</button>
             {projects.map(pr => (
                 <button key={pr.id} onClick={() => setFilterProj(pr.id)} className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border transition ${filterProj === pr.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                    {pr.name}
                 </button>
             ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Variedad</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase">Bloque</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500 uppercase">Rep</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Locación</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Siembra</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPlots.length === 0 ? (
                <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500 italic">
                        No se encontraron parcelas asignadas a tu perfil o con los filtros actuales.
                    </td>
                </tr>
            ) : filteredPlots.map(p => {
              const loc = locations.find(l => l.id === p.locationId);
              const vari = varieties.find(v => v.id === p.varietyId);
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-hemp-800 font-semibold">{vari?.name}</td>
                  <td className="px-4 py-3 text-center">{p.block}</td>
                  <td className="px-4 py-3 text-center">{p.replicate}</td>
                  <td className="px-4 py-3 text-gray-600">{loc?.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.sowingDate}</td>
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
                        <button onClick={() => handleEdit(p)} className="text-gray-400 hover:text-hemp-600 inline-block align-middle">
                            <Edit2 size={16} />
                        </button>
                    )}
                    <Link to={`/plots/${p.id}`} className="text-hemp-600 hover:text-hemp-900 font-medium inline-block align-middle">
                      <ChevronRight size={20} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

       {/* Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900">{editingId ? 'Editar Unidad Experimental' : 'Nueva Unidad Experimental'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto Marco</label>
                    <select required className={inputClass} value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})}>
                        <option value="">Seleccionar Proyecto...</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                 </div>
              </div>

              <div className="grid grid-cols-3 gap-4 bg-gray-50 p-3 rounded border border-gray-100">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Variedad</label>
                   <select required className={inputClass} value={formData.varietyId} onChange={e => setFormData({...formData, varietyId: e.target.value})}>
                     <option value="">...</option>
                     {varieties.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Bloque</label>
                   <input required type="text" className={inputClass} placeholder="1" value={formData.block} onChange={e => setFormData({...formData, block: e.target.value})} />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Rep (R)</label>
                   <input required type="number" className={inputClass} placeholder="1" value={formData.replicate} onChange={e => setFormData({...formData, replicate: Number(e.target.value)})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Locación (Base)</label>
                  <select required className={inputClass} value={formData.locationId} onChange={e => setFormData({...formData, locationId: e.target.value})}>
                    <option value="">Seleccionar...</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                     <UserCheck size={14} className="mr-1" /> Responsables Técnicos
                   </label>
                   <div className="border border-gray-300 bg-white rounded p-2 h-20 overflow-y-auto text-xs">
                     {assignableUsers.map(u => (
                         <label key={u.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                             <input 
                                type="checkbox" 
                                className="rounded text-hemp-600 focus:ring-hemp-500" 
                                checked={formData.responsibleIds?.includes(u.id)} 
                                onChange={() => toggleResponsible(u.id)} 
                             />
                             <div className="flex flex-col">
                                <span className="text-gray-900 font-medium">{u.name}</span>
                                <span className="text-[10px] text-gray-400 capitalize">{u.role === 'admin' ? 'Administrador' : 'Técnico'}</span>
                             </div>
                         </label>
                     ))}
                     {assignableUsers.length === 0 && (
                        <div className="text-gray-400 text-center py-2">No hay técnicos registrados</div>
                     )}
                  </div>
                </div>
              </div>

              {/* Specific Coordinates */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded border border-gray-100">
                  <div className="col-span-2 text-xs text-gray-500 font-semibold uppercase mb-1">
                      Coordenadas Específicas de Parcela (Opcional)
                  </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Latitud</label>
                    <input type="number" step="any" placeholder="-34.6037" className={inputClass} value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Longitud</label>
                    <input type="number" step="any" placeholder="-58.3816" className={inputClass} value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} />
                 </div>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <Calendar size={14} className="mr-1 text-hemp-600" /> Fecha Siembra
                    </label>
                    <input 
                      type="date" 
                      className={`${inputClass} cursor-pointer`} 
                      value={formData.sowingDate} 
                      onChange={e => setFormData({...formData, sowingDate: e.target.value})} 
                      onClick={(e) => {
                        try {
                          e.currentTarget.showPicker();
                        } catch (error) {}
                      }}
                    />
                </div>
                <div className="lg:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Densidad (pl/m2)</label>
                    <input type="number" className={inputClass} value={formData.density} onChange={e => setFormData({...formData, density: Number(e.target.value)})} />
                </div>
                <div className="lg:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Distancia (cm)</label>
                    <input type="number" className={inputClass} value={formData.rowDistance} onChange={e => setFormData({...formData, rowDistance: Number(e.target.value)})} />
                </div>
                <div className="lg:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Riego</label>
                    <select className={inputClass} value={formData.irrigationType || ''} onChange={e => setFormData({...formData, irrigationType: e.target.value})}>
                        <option value="">-</option>
                        <option value="Goteo">Goteo</option>
                        <option value="Aspersión">Aspersión</option>
                        <option value="Surco">Surco</option>
                        <option value="Secano">Secano</option>
                    </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones Generales</label>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={formData.observations || ''}
                  onChange={e => setFormData({...formData, observations: e.target.value})}
                  placeholder="Notas sobre el suelo, condiciones iniciales, etc."
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-hemp-600 text-white rounded hover:bg-hemp-700 shadow-sm">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
