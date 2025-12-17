
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Save, Database, Copy, RefreshCw, AlertTriangle, Lock, Settings as SettingsIcon, Sliders, Sparkles, ExternalLink, Trash2, ShieldCheck, PlayCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { User, Client, Supplier, Variety, Location, Project, Plot } from '../types';

export default function Settings() {
  const { currentUser, globalApiKey, refreshGlobalConfig, addClient, addSupplier, addVariety, addUser, addLocation, addProject, addPlot, addSeedBatch, addSeedMovement } = useAppContext();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'general' | 'connections' | 'demo'>('connections');

  // Supabase State
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  
  // AI State
  const [aiKey, setAiKey] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
      // Cargar configuración existente local y global
      const storedUrl = localStorage.getItem('hemp_sb_url');
      const storedKey = localStorage.getItem('hemp_sb_key');
      
      if (storedUrl) setUrl(storedUrl);
      if (storedKey) setKey(storedKey);
      
      // La API Key de IA preferimos mostrar la global si existe, sino la local
      if (globalApiKey) {
          setAiKey(globalApiKey);
      } else {
          setAiKey(localStorage.getItem('hemp_ai_key') || '');
      }
  }, [globalApiKey]);

  // PERMISSION GUARD: Solo Super Admin puede ver esto
  if (currentUser?.role !== 'super_admin') {
      return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
              <div className="bg-red-100 p-4 rounded-full">
                  <Lock size={48} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acceso Restringido</h2>
              <p className="text-gray-500 max-w-md">
                  La configuración del sistema es una zona sensible reservada únicamente para el Super Administrador.
              </p>
          </div>
      );
  }

  const handleSave = async () => {
      setStatus('checking');
      localStorage.setItem('hemp_sb_url', url.trim());
      localStorage.setItem('hemp_sb_key', key.trim());

      try {
          if (aiKey.trim()) {
              const { error } = await supabase.from('system_settings').upsert({
                  id: 'global',
                  gemini_api_key: aiKey.trim()
              });
              if (error) localStorage.setItem('hemp_ai_key', aiKey.trim());
              else localStorage.removeItem('hemp_ai_key');
          }
      } catch (e) { console.error(e); }

      await refreshGlobalConfig();
      setStatus('success');
      setTimeout(() => {
          setStatus('idle');
          if (url !== localStorage.getItem('hemp_sb_url') || key !== localStorage.getItem('hemp_sb_key')) {
             window.location.reload();
          }
      }, 1000);
  };

  const copySQL = () => {
      navigator.clipboard.writeText(SQL_SCRIPT);
      alert("SQL copiado al portapapeles. Pégalo en el editor SQL de Supabase.");
  };

  const clearLocalCache = () => {
      if(confirm("¿Borrar caché local?")) {
          Object.keys(localStorage).forEach(key => {
              if (key.startsWith('ht_local_')) localStorage.removeItem(key);
          });
          window.location.reload();
      }
  };

  const handleInjectDemoData = async () => {
      if (!confirm("¿Generar datos de demostración? Esto creará una cadena completa: Proveedor -> Variedad -> Cliente -> Locación -> Lote Semilla -> Parcela.")) return;
      
      setDemoLoading(true);
      try {
          // 1. Crear Proveedores (Suppliers)
          const sup1Id = Date.now().toString();
          
          await addSupplier({
              id: sup1Id, name: 'Hemp-it France', legalName: 'Hemp-it Cooperative', country: 'Francia', 
              province: 'Angers', city: 'Beaufort-en-Anjou', commercialContact: 'Pierre Dubois', notes: 'Líder en genética europea.'
          });

          // 2. Crear Variedad vinculada
          const varId = (Date.now()+1).toString();
          await addVariety({ 
              id: varId, 
              supplierId: sup1Id, 
              name: 'FEDORA 17', 
              usage: 'Dual', 
              cycleDays: 130, 
              expectedThc: 0.12 
          });

          // 3. Crear Cliente (Productor)
          const cliId = (Date.now()+10).toString();
          await addClient({
              id: cliId, name: 'Finca El Hornero', type: 'Productor Mediano (5-15 ha)', 
              contactName: 'Carlos Gómez', contactPhone: '2323-555555', isNetworkMember: true, cuit: '20-11111111-1'
          });

          // 4. Crear Locación del Cliente
          const locId = (Date.now()+20).toString();
          await addLocation({
              id: locId, name: 'Campo Experimental Hornero', province: 'Buenos Aires', city: 'Mercedes',
              address: 'Ruta 5 km 100', soilType: 'Franco', climate: 'Templado', clientId: cliId, ownerName: 'Finca El Hornero',
              ownerType: 'Productor Mediano (5-15 ha)', capacityHa: 15, coordinates: { lat: -34.650, lng: -59.430 }
          });

          // 5. Crear Proyecto General
          const projId = (Date.now()+30).toString();
          await addProject({
              id: projId, name: 'Campaña Fibra 2024', description: 'Producción extensiva fibra textil',
              startDate: new Date().toISOString().split('T')[0], status: 'En Curso', responsibleIds: []
          });

          // 6. Crear Lote de Semillas (Stock Central)
          const batchId = (Date.now()+40).toString();
          await addSeedBatch({
              id: batchId, varietyId: varId, supplierName: 'Hemp-it France', batchCode: 'LOT-DEMO-2024',
              originCountry: 'Francia', initialQuantity: 1000, remainingQuantity: 950, purchaseDate: new Date().toISOString().split('T')[0],
              isActive: true
          });

          // 7. ASIGNAR SEMILLA AL CLIENTE (Movimiento Logístico)
          await addSeedMovement({
              id: (Date.now()+50).toString(),
              batchId: batchId,
              clientId: cliId, // Link to Client
              targetLocationId: locId, // Link to Location
              quantity: 50,
              date: new Date().toISOString().split('T')[0],
              transportGuideNumber: 'GUIA-DEMO-001',
              status: 'Recibido',
              transportType: 'Propio', driverName: 'Carlos Gómez', vehiclePlate: 'AA123BB'
          });

          // 8. Crear Parcela en la Locación del Cliente
          await addPlot({
              id: (Date.now()+60).toString(),
              name: 'LOTE-DEMO-1',
              type: 'Producción',
              projectId: projId,
              locationId: locId,
              varietyId: varId,
              seedBatchId: batchId,
              block: 'A',
              replicate: 1,
              ownerName: 'Finca El Hornero',
              responsibleIds: [],
              sowingDate: new Date().toISOString().split('T')[0],
              surfaceArea: 5,
              surfaceUnit: 'ha',
              rowDistance: 17.5,
              density: 250,
              status: 'Activa'
          });

          alert("¡Datos de demostración cargados exitosamente! Se creó la cadena completa: Proveedor > Variedad > Cliente > Locación > Semilla > Parcela.");
      } catch (e) {
          console.error(e);
          alert("Hubo un error cargando algunos datos.");
      } finally {
          setDemoLoading(false);
      }
  };

  const SQL_SCRIPT = `
-- =========================================================
-- FORZAR RECARGA CACHÉ SUPABASE (SIMPLE)
-- =========================================================

-- 1. Notificar a PostgREST que recargue el esquema
NOTIFY pgrst, 'reload schema';

-- 2. Asegurar que las columnas existan (por si acaso)
ALTER TABLE public.seed_batches ADD COLUMN IF NOT EXISTS "analysisDate" TEXT;
ALTER TABLE public.seed_batches ADD COLUMN IF NOT EXISTS "purity" NUMERIC;
ALTER TABLE public.seed_batches ADD COLUMN IF NOT EXISTS "germination" NUMERIC;
ALTER TABLE public.seed_batches ADD COLUMN IF NOT EXISTS "labelSerialNumber" TEXT;

-- 3. Mensaje de éxito
SELECT 'Cache recargado. Ya deberías poder guardar.' as status;
  `;

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex items-center mb-6">
        <SettingsIcon className="text-hemp-600 mr-3" size={32} />
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Configuración Central</h1>
            <p className="text-gray-500">Parámetros del sistema y conexiones externas.</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
          <button onClick={() => setActiveTab('connections')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'connections' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Conexiones</button>
          <button onClick={() => setActiveTab('general')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'general' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Negocio</button>
          <button onClick={() => setActiveTab('demo')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'demo' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Datos Demo</button>
      </div>

      {activeTab === 'general' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
              <div className="bg-blue-50 p-4 rounded-full inline-block"><Sliders size={32} className="text-blue-500" /></div>
              <h3 className="text-xl font-bold text-gray-800">Parametrización del Negocio</h3>
              <p className="text-gray-500 max-w-lg mx-auto">Configuración I+D y Productiva (v2.7).</p>
          </div>
      )}

      {activeTab === 'demo' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 animate-in fade-in">
              <div className="text-center space-y-4">
                  <div className="bg-purple-50 p-4 rounded-full inline-block"><PlayCircle size={32} className="text-purple-600" /></div>
                  <h3 className="text-xl font-bold text-gray-800">Generador de Datos de Prueba</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                      Si el sistema está vacío, utiliza esta herramienta para poblar la base de datos con un flujo completo de negocio.
                  </p>
                  <ul className="text-sm text-left max-w-xs mx-auto list-disc text-gray-600 space-y-1 bg-gray-50 p-4 rounded">
                      <li>Proveedores y Variedades</li>
                      <li>Cliente Productor y su Locación</li>
                      <li>Envío de Semilla (Logística)</li>
                      <li>Parcela productiva asignada</li>
                  </ul>
                  <button 
                    onClick={handleInjectDemoData}
                    disabled={demoLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition flex items-center justify-center mx-auto disabled:opacity-50"
                  >
                      {demoLoading ? <RefreshCw className="animate-spin mr-2"/> : <Sparkles className="mr-2"/>}
                      {demoLoading ? 'Generando...' : 'Inyectar Cadena Completa'}
                  </button>
              </div>
          </div>
      )}

      {activeTab === 'connections' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-left-4">
            {/* Warning Banner */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
                <ShieldCheck className="text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">
                    <strong>Estado de Conexión:</strong> Si acabas de crear un nuevo proyecto en Supabase, asegúrate de ingresar la URL y KEY abajo.
                </div>
            </div>

            {/* CACHE TOOL */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex justify-between items-center">
                <div>
                    <h2 className="text-sm font-bold text-gray-800 flex items-center"><Database size={16} className="mr-2 text-gray-400" /> Caché Local</h2>
                    <p className="text-xs text-gray-500 mt-1">Si ves datos antiguos o errores.</p>
                </div>
                <button onClick={clearLocalCache} className="text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg text-xs font-bold flex items-center transition">
                    <Trash2 size={14} className="mr-2"/> Limpiar
                </button>
            </div>

            {/* Supabase Connection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 opacity-75 grayscale hover:grayscale-0 transition">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Database size={20} className="mr-2 text-gray-400" /> Base de Datos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Project URL</label><input type="text" className="w-full border border-gray-300 rounded p-2 text-sm bg-gray-50" value={url} onChange={e => setUrl(e.target.value)} disabled /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Anon API Key</label><input type="password" className="w-full border border-gray-300 rounded p-2 text-sm bg-gray-50" value={key} onChange={e => setKey(e.target.value)} disabled /></div>
                </div>
            </div>

            {/* AI Connection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Sparkles size={20} className="mr-2 text-purple-500" /> Inteligencia Artificial</h2>
                <input type="password" placeholder="AIzaSy..." className="w-full border border-gray-300 rounded p-2 text-sm" value={aiKey} onChange={e => setAiKey(e.target.value)} />
            </div>

            <button onClick={handleSave} disabled={status === 'checking'} className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center transition-all shadow-lg ${status === 'checking' ? 'bg-gray-400' : status === 'success' ? 'bg-green-600' : 'bg-hemp-600 hover:bg-hemp-700'}`}>
                {status === 'checking' ? <><RefreshCw className="animate-spin mr-2"/> Guardando...</> : status === 'success' ? <><Save className="mr-2"/> ¡Guardado!</> : <><Save className="mr-2"/> Guardar Configuración</>}
            </button>
            
            {/* SQL Box */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 mt-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-bold text-slate-800">Script: Forzar Recarga Caché</h2>
                    <button onClick={copySQL} className="text-xs bg-white border px-3 py-1 rounded shadow-sm font-bold hover:bg-slate-50">Copiar SQL</button>
                </div>
                <div className="bg-slate-900 p-4 rounded-lg text-xs font-mono text-blue-300 overflow-x-auto h-48 custom-scrollbar">
                    <pre>{SQL_SCRIPT}</pre>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                    <strong>TIP:</strong> Si el sistema te sigue pidiendo actualizar la BD, ejecuta este script y recarga la página.
                </p>
            </div>
        </div>
      )}
    </div>
  );
}
