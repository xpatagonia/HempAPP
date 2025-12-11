
import React, { useState, useEffect } from 'react';
import { Calculator, Scale, Sprout, ArrowRight } from 'lucide-react';

export default function Tools() {
  // --- Calculator 1: Seeding Rate ---
  const [targetDensity, setTargetDensity] = useState<number>(150); // pl/m2
  const [pms, setPms] = useState<number>(18); // Peso Mil Semillas (g)
  const [germination, setGermination] = useState<number>(90); // %
  const [purity, setPurity] = useState<number>(98); // %
  const [seedingRateResult, setSeedingRateResult] = useState<number>(0);

  useEffect(() => {
    // Formula: (Densidad * PMS) / (Germinacion * Pureza) * 100
    // Factor logic: (pl/m2 * g/1000) * 10 = kg/ha roughly
    // Precise: (Density_pl_m2 * PMS_g) / (Germ_0_1 * Pur_0_1 * 100)
    
    if (germination > 0 && purity > 0) {
        // Example: 150 pl/m2 * 18g PMS = 2700g needed per 1000m2 (roughly) if perfect
        // Standard formula kg/ha = (pl/m2 * PMS_g) / (PG% * Pureza% / 100)
        
        // Let's use simplified standard: Kg/Ha = (Pl/m² * PMS) / (PG * 0.01 * Pureza * 0.01 * 1000) * 10
        // Or simpler: (Pl/m2 * PMS) / (PG * Pureza) * 100
        
        const rate = (targetDensity * pms * 100) / (germination * purity);
        setSeedingRateResult(rate);
    }
  }, [targetDensity, pms, germination, purity]);

  // --- Calculator 2: Stand Verification ---
  const [rowDistance, setRowDistance] = useState<number>(17.5); // cm
  const [plantsPerMeter, setPlantsPerMeter] = useState<number>(25);
  const [realDensity, setRealDensity] = useState<number>(0);
  const [plantsPerHectare, setPlantsPerHectare] = useState<number>(0);

  useEffect(() => {
    if (rowDistance > 0) {
        // Linear meter = 100cm. Area represented by 1 linear meter = 100cm * rowDistance_cm = X cm2
        // X cm2 / 10000 = Y m2.
        // Density = Plants / Y.
        
        // Simplified: Density (pl/m2) = (Plants_in_1m * 100) / Row_Distance_cm
        const dens = (plantsPerMeter * 100) / rowDistance;
        setRealDensity(dens);
        setPlantsPerHectare(dens * 10000);
    }
  }, [rowDistance, plantsPerMeter]);

  const inputClass = "w-full border border-gray-300 bg-white text-gray-900 p-2 rounded focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center mb-6">
        <Calculator className="text-hemp-600 mr-3" size={32} />
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Herramientas Agronómicas</h1>
            <p className="text-gray-500">Calculadoras rápidas para planificación de siembra y monitoreo.</p>
        </div>
      </div>

      {/* CALCULATOR 1: Seeding Rate */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
         <div className="bg-hemp-50 px-6 py-4 border-b border-hemp-100 flex items-center">
            <Sprout className="text-hemp-600 mr-2" size={20} />
            <h2 className="font-bold text-hemp-900">Calculadora de Dosis de Siembra</h2>
         </div>
         <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
             <div className="space-y-4">
                 <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Densidad Objetivo (pl/m²)</label>
                     <input type="number" className={inputClass} value={targetDensity} onChange={e => setTargetDensity(Number(e.target.value))} />
                 </div>
                 <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Peso de Mil Semillas (PMS) en gramos</label>
                     <input type="number" step="0.1" className={inputClass} value={pms} onChange={e => setPms(Number(e.target.value))} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Poder Germinativo (%)</label>
                        <input type="number" className={inputClass} value={germination} onChange={e => setGermination(Number(e.target.value))} />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pureza Física (%)</label>
                        <input type="number" className={inputClass} value={purity} onChange={e => setPurity(Number(e.target.value))} />
                     </div>
                 </div>
             </div>

             <div className="bg-gray-50 p-6 rounded-xl flex flex-col items-center justify-center text-center h-full border border-gray-200">
                 <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Dosis Necesaria</h3>
                 <div className="text-5xl font-bold text-hemp-600 mb-1">
                     {seedingRateResult.toFixed(1)}
                 </div>
                 <span className="text-xl text-gray-700 font-medium">kg / ha</span>
                 <p className="text-xs text-gray-400 mt-4">
                     Fórmula: (Densidad × PMS × 100) / (PG × Pureza)
                 </p>
             </div>
         </div>
      </div>

      {/* CALCULATOR 2: Stand Verification */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
         <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex items-center">
            <Scale className="text-blue-600 mr-2" size={20} />
            <h2 className="font-bold text-blue-900">Verificador de Población (Stand)</h2>
         </div>
         <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
             <div className="space-y-4">
                 <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Distancia entre hileras (cm)</label>
                     <input type="number" step="0.5" className={inputClass} value={rowDistance} onChange={e => setRowDistance(Number(e.target.value))} />
                 </div>
                 <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Plantas contadas en 1 metro lineal</label>
                     <input type="number" className={inputClass} value={plantsPerMeter} onChange={e => setPlantsPerMeter(Number(e.target.value))} />
                     <p className="text-xs text-gray-500 mt-1">Tip: Cuenta varias veces y usa el promedio.</p>
                 </div>
             </div>

             <div className="bg-gray-50 p-6 rounded-xl flex flex-col items-center justify-center text-center h-full border border-gray-200 space-y-4">
                 <div>
                    <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Densidad Real</h3>
                    <div className="text-4xl font-bold text-blue-600">
                        {realDensity.toFixed(1)} <span className="text-lg text-gray-600">pl/m²</span>
                    </div>
                 </div>
                 <div className="w-full border-t border-gray-200 pt-3">
                     <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Población por Hectárea</h3>
                     <div className="text-2xl font-bold text-gray-800">
                         {Math.round(plantsPerHectare).toLocaleString()} <span className="text-sm text-gray-600">plantas/ha</span>
                     </div>
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
}
