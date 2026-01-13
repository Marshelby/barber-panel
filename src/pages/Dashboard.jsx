import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const [estadoResumen, setEstadoResumen] = useState({
    disponible: [],
    en_almuerzo: [],
    no_disponible: [],
  });

  const [ranking, setRanking] = useState([]);
  const [graficoPorBarbero, setGraficoPorBarbero] = useState([]);
  const [barberoDelMes, setBarberoDelMes] = useState(null);

  const [ingresosDia, setIngresosDia] = useState(0);
  const [ingresosMes, setIngresosMes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarEstadoActual();
    cargarDashboard();
  }, []);

  /* =======================
     ESTADO ACTUAL BARBEROS
     ======================= */
  async function cargarEstadoActual() {
    const { data, error } = await supabase
      .from("estado_actual")
      .select(`
        estado,
        barberos:barbero_id ( nombre )
      `);

    if (error) {
      console.error("Error estado_actual:", error);
      return;
    }

    const agrupado = {
      disponible: [],
      en_almuerzo: [],
      no_disponible: [],
    };

    (data || []).forEach((row) => {
      const estado = row.estado;
      const nombre = row.barberos?.nombre;
      if (!estado || !nombre) return;
      if (agrupado[estado]) agrupado[estado].push(nombre);
    });

    setEstadoResumen(agrupado);
  }

  /* =======================
     INGRESOS Y GRÁFICOS
     ======================= */
  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  // 🔴 SOLO SE TOCA ESTA FUNCIÓN
  async function cargarDashboard() {
    setLoading(true);

    const ahora = new Date();
    const hoyStr = startOfDay(ahora).toISOString().slice(0, 10);
    const inicioMesStr = startOfMonth(ahora).toISOString().slice(0, 10);

    /* ========= INGRESOS ========= */

    const { data: hoyRow } = await supabase
      .from("resumen_contable_diario")
      .select("total_ingresos")
      .eq("fecha", hoyStr)
      .maybeSingle();

    const { data: mesRows } = await supabase
      .from("resumen_contable_diario")
      .select("total_ingresos")
      .gte("fecha", inicioMesStr);

    const totalDia = Number(hoyRow?.total_ingresos || 0);

    let totalMes = 0;
    (mesRows || []).forEach((r) => {
      totalMes += Number(r.total_ingresos || 0);
    });

    setIngresosDia(totalDia);
    setIngresosMes(totalMes);

    /* ========= RANKING POR BARBERO ========= */

    const { data: rankingRows, error } = await supabase
      .from("resumen_contable_barbero_diario")
      .select(`
        barbero_id,
        total_ingresos,
        barberos:barbero_id ( nombre )
      `)
      .gte("fecha", inicioMesStr);

    if (error) {
      console.error("Error ranking:", error);
      setLoading(false);
      return;
    }

    const acumulado = {};

    (rankingRows || []).forEach((r) => {
      const id = r.barbero_id;
      if (!acumulado[id]) {
        acumulado[id] = {
          nombre: r.barberos?.nombre || "Sin nombre",
          total: 0,
        };
      }
      acumulado[id].total += Number(r.total_ingresos || 0);
    });

    const rankingFinal = Object.values(acumulado).sort(
      (a, b) => b.total - a.total
    );

    setRanking(rankingFinal);
    setGraficoPorBarbero(rankingFinal);

    setBarberoDelMes(rankingFinal[0] || null);

    setLoading(false);
  }

  /* =======================
     RENDER
     ======================= */
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Inicio</h1>
      <p className="text-gray-500 mb-6">Resumen general de la barbería</p>

      <div className="bg-white border border-black rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Estado operativo en tiempo real
          </h2>
          <span className="text-sm font-semibold text-green-600">● En vivo</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <EstadoCard
            titulo="Disponible"
            color="green"
            lista={estadoResumen.disponible}
          />
          <EstadoCard
            titulo="En almuerzo"
            color="yellow"
            lista={estadoResumen.en_almuerzo}
          />
          <EstadoCard
            titulo="No disponible"
            color="red"
            lista={estadoResumen.no_disponible}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-w-3xl">
        <InfoCard titulo="💰 Ingresos del día" valor={ingresosDia} />
        <InfoCard titulo="📆 Ingresos del mes" valor={ingresosMes} />
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">
          📊 Ingresos por barbero (mes actual)
        </h2>

        {!loading && graficoPorBarbero.length > 0 && (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={graficoPorBarbero}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* =======================
   COMPONENTES
   ======================= */
function EstadoCard({ titulo, color, lista }) {
  const estilos = {
    green: { accent: "bg-green-500", text: "text-green-700" },
    yellow: { accent: "bg-yellow-500", text: "text-yellow-700" },
    red: { accent: "bg-red-500", text: "text-red-700" },
  };

  return (
    <div className="relative bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <span
        className={`absolute left-0 top-0 h-full w-1 rounded-l-lg ${estilos[color].accent}`}
      />
      <h3 className={`text-xs font-semibold uppercase mb-2 ${estilos[color].text}`}>
        {titulo}
      </h3>

      {lista.length === 0 ? (
        <p className="text-sm text-gray-400">Ninguno</p>
      ) : (
        lista.map((n) => (
          <p key={n} className="text-lg font-semibold text-gray-900">
            {n}
          </p>
        ))
      )}
    </div>
  );
}

function InfoCard({ titulo, valor }) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <p className="text-gray-500 text-sm mb-1">{titulo}</p>
      <p className="text-2xl font-bold">${valor.toLocaleString()}</p>
    </div>
  );
}
