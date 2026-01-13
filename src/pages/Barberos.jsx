import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

/* =========================
   HELPERS
========================= */
function formatHoraCL(dateStr) {
  return new Date(dateStr).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFechaCL(dateStr) {
  return new Date(dateStr).toLocaleDateString("es-CL");
}

function formatDiaCL(dateStr) {
  return new Date(dateStr).toLocaleDateString("es-CL", {
    weekday: "long",
  });
}

function agruparPorFecha(cortes) {
  return cortes.reduce((acc, c) => {
    const fecha = formatFechaCL(c.created_at);
    if (!acc[fecha]) acc[fecha] = [];
    acc[fecha].push(c);
    return acc;
  }, {});
}

function estadoLabel(estado) {
  if (estado === "disponible") return "Disponible";
  if (estado === "en_colacion" || estado === "en_almuerzo")
    return "En colación";
  return "No disponible";
}

function estadoBadgeClass(estado) {
  if (estado === "disponible") return "bg-green-600 text-white";
  if (estado === "en_colacion" || estado === "en_almuerzo")
    return "bg-yellow-400 text-black";
  return "bg-red-600 text-white";
}

/* =========================
   COMPONENT
========================= */
export default function Barberos() {
  const [barberos, setBarberos] = useState([]);
  const [stats, setStats] = useState({});
  const [estados, setEstados] = useState({});
  const [loading, setLoading] = useState(true);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [barberoSeleccionado, setBarberoSeleccionado] = useState(null);
  const [tabModal, setTabModal] = useState("hoy");

  const [cortesHoyBarbero, setCortesHoyBarbero] = useState([]);
  const [cortesMesBarbero, setCortesMesBarbero] = useState([]);

  useEffect(() => {
    cargarTodo();
  }, []);

  useEffect(() => {
    if (!modalAbierto) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") cerrarModal();
    };

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [modalAbierto]);

  async function cargarTodo() {
    setLoading(true);

    const { data: barberosData } = await supabase
      .from("barberos")
      .select("id, nombre")
      .order("nombre");

    const { data: estadosData } = await supabase
      .from("estado_actual")
      .select("barbero_id, estado");

    const estadosMap = {};
    (estadosData || []).forEach((e) => {
      estadosMap[e.barbero_id] = e.estado;
    });

    // 🔹 HOY
    const { data: cortesHoy } = await supabase
      .from("cortes")
      .select("barbero_id, monto_barbero");

    // 🔹 HISTÓRICO (MES)
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const { data: cortesHistoricos } = await supabase
      .from("cortes_historicos")
      .select("barbero_id, monto_barbero, created_at")
      .gte("created_at", inicioMes.toISOString());

    const statsMap = {};
    (barberosData || []).forEach((b) => {
      statsMap[b.id] = {
        total_hoy: 0,
        cortes_hoy: 0,
        ganancia_mes: 0,
        cortes_mes: 0,
      };
    });

    (cortesHoy || []).forEach((c) => {
      const s = statsMap[c.barbero_id];
      if (!s) return;
      s.total_hoy += Number(c.monto_barbero || 0);
      s.cortes_hoy += 1;
      s.ganancia_mes += Number(c.monto_barbero || 0);
      s.cortes_mes += 1;
    });

    (cortesHistoricos || []).forEach((c) => {
      const s = statsMap[c.barbero_id];
      if (!s) return;
      s.ganancia_mes += Number(c.monto_barbero || 0);
      s.cortes_mes += 1;
    });

    setBarberos(barberosData || []);
    setStats(statsMap);
    setEstados(estadosMap);
    setLoading(false);
  }

  async function abrirModal(barbero) {
    setBarberoSeleccionado(barbero);
    setTabModal("hoy");
    setModalAbierto(true);

    const { data: hoy } = await supabase
      .from("cortes")
      .select("created_at, precio, monto_barbero")
      .eq("barbero_id", barbero.id)
      .order("created_at", { ascending: false });

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const { data: historicos } = await supabase
      .from("cortes_historicos")
      .select("created_at, precio, monto_barbero")
      .eq("barbero_id", barbero.id)
      .gte("created_at", inicioMes.toISOString())
      .order("created_at", { ascending: false });

    setCortesHoyBarbero(hoy || []);
    setCortesMesBarbero([...(historicos || []), ...(hoy || [])]);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setBarberoSeleccionado(null);
    setCortesHoyBarbero([]);
    setCortesMesBarbero([]);
  }

  const cortesAMostrar =
    tabModal === "hoy" ? cortesHoyBarbero : cortesMesBarbero;

  const totalPeriodo = cortesAMostrar.reduce(
    (acc, c) => {
      acc.total += Number(c.precio || 0);
      acc.barbero += Number(c.monto_barbero || 0);
      acc.cortes += 1;
      return acc;
    },
    { total: 0, barbero: 0, cortes: 0 }
  );

  const cortesAgrupados =
    tabModal === "mes" ? agruparPorFecha(cortesAMostrar) : null;

  const estadoSeleccionado = barberoSeleccionado
    ? estados[barberoSeleccionado.id] ?? "no_disponible"
    : "no_disponible";

  if (loading) return <p className="p-6">Cargando barberos…</p>;

  return (
    <div className="p-6">
      <h1 className="text-4xl font-extrabold mb-8">Barberos</h1>

      <p className="text-base font-semibold text-gray-700 -mt-6 mb-8">
        Aquí puedes ver el rendimiento diario y mensual de cada barbero. Haz clic
        en una tarjeta para ver el detalle.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {barberos.map((b) => {
          const s = stats[b.id];
          const est = estados[b.id] ?? "no_disponible";

          return (
            <div
              key={b.id}
              onClick={() => abrirModal(b)}
              className="cursor-pointer rounded-2xl bg-black/50 p-6 text-white transition-shadow duration-150 hover:shadow-2xl"
            >
              <h2 className="text-5xl font-extrabold text-center mb-6">
                {b.nombre}
              </h2>

              <div className="bg-black/80 rounded-xl p-6 text-center mb-4">
                <p className="text-4xl font-extrabold">
                  ${s.total_hoy.toLocaleString("es-CL")}
                </p>
                <p>{s.cortes_hoy} cortes hoy</p>
              </div>

              <p className="text-sm">
                Este mes: ${s.ganancia_mes.toLocaleString("es-CL")} ·{" "}
                {s.cortes_mes} cortes
              </p>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs font-bold opacity-90">
                  *CLICK PARA VER DETALLES*
                </span>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${estadoBadgeClass(
                    est
                  )}`}
                >
                  {estadoLabel(est)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {modalAbierto && barberoSeleccionado && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onMouseDown={(e) => e.target === e.currentTarget && cerrarModal()}
        >
          <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-xl flex flex-col relative">
            <button
              onClick={cerrarModal}
              className="absolute top-4 right-4 text-xl z-10"
            >
              ✕
            </button>

            <div className="sticky top-0 bg-white z-10 p-6 border-b space-y-4">
              <div className="flex items-center rounded-lg overflow-hidden w-fit border">
                <button
                  onClick={() => setTabModal("hoy")}
                  className={`px-6 py-2 font-semibold ${
                    tabModal === "hoy" ? "bg-black text-white" : "bg-white"
                  }`}
                >
                  📅 HOY
                </button>
                <button
                  onClick={() => setTabModal("mes")}
                  className={`px-6 py-2 font-semibold ${
                    tabModal === "mes" ? "bg-black text-white" : "bg-white"
                  }`}
                >
                  📆 ESTE MES
                </button>
              </div>

              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-bold">
                  Cortes — {barberoSeleccionado.nombre}
                </h3>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${estadoBadgeClass(
                    estadoSeleccionado
                  )}`}
                >
                  {estadoLabel(estadoSeleccionado)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded-lg p-3">
                  <p className="text-xs text-gray-500">Cortes</p>
                  <p className="font-bold">{totalPeriodo.cortes}</p>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="font-bold">
                    ${totalPeriodo.total.toLocaleString("es-CL")}
                  </p>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-xs text-gray-500">Barbero</p>
                  <p className="font-bold">
                    ${totalPeriodo.barbero.toLocaleString("es-CL")}
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto px-6 pb-6">
              {totalPeriodo.cortes === 0 ? (
                <p className="text-center text-gray-500 py-10">
                  No hay cortes para mostrar
                </p>
              ) : tabModal === "mes" ? (
                Object.entries(cortesAgrupados).map(([fecha, cortes]) => (
                  <div key={fecha} className="mb-4">
                    <div className="px-3 py-2 border-b bg-gray-50">
                      <div className="font-bold">{fecha}</div>
                      <div className="text-sm text-gray-500">
                        {formatDiaCL(cortes[0].created_at)}
                      </div>
                    </div>

                    <ul className="divide-y border rounded-b-lg">
                      {cortes.map((c, i) => (
                        <li key={i} className="py-3 px-3 flex justify-between">
                          <span>{formatHoraCL(c.created_at)}</span>
                          <span className="text-right">
                            <div className="font-bold">
                              ${Number(c.precio).toLocaleString("es-CL")}
                            </div>
                            <div className="text-sm text-gray-500">
                              Barbero: $
                              {Number(c.monto_barbero).toLocaleString("es-CL")}
                            </div>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <ul className="divide-y border rounded-lg">
                  {cortesAMostrar.map((c, i) => (
                    <li key={i} className="py-3 px-3 flex justify-between">
                      <span>{formatHoraCL(c.created_at)}</span>
                      <span className="text-right">
                        <div className="font-bold">
                          ${Number(c.precio).toLocaleString("es-CL")}
                        </div>
                        <div className="text-sm text-gray-500">
                          Barbero: $
                          {Number(c.monto_barbero).toLocaleString("es-CL")}
                        </div>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
