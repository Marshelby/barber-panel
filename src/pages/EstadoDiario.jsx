import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const ESTADOS = [
  { value: "disponible", label: "Disponible", color: "text-green-600" },
  { value: "en_almuerzo", label: "En colación", color: "text-yellow-500" },
  { value: "no_disponible", label: "No disponible", color: "text-red-600" },
];

function formatHora(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// NUEVO: formatea columnas tipo "time" (ej: "01:49:00" -> "01:49")
function formatTimeValue(t) {
  if (!t) return null;
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

export default function EstadoDiario() {
  const [loading, setLoading] = useState(true);
  const [barberos, setBarberos] = useState([]);
  const [estadoMap, setEstadoMap] = useState({});
  const [selectedEstado, setSelectedEstado] = useState({});
  const [horaVuelve, setHoraVuelve] = useState({});
  const [horaColacion, setHoraColacion] = useState({});
  const [checkMarcado, setCheckMarcado] = useState({});
  const [saving, setSaving] = useState({});
  const [error, setError] = useState({});

  const cargarTodo = async () => {
    setLoading(true);

    const { data: barberosData } = await supabase
      .from("barberos")
      .select("id, nombre")
      .order("nombre");

    const ids = barberosData.map((b) => b.id);

    const { data: estadosData } = await supabase
      .from("estado_actual")
      .select("barbero_id, estado, updated_at, hora_vuelve, hora_colacion")
      .in("barbero_id", ids);

    const map = {};
    const sel = {};
    const horas = {};
    const colacion = {};
    const checks = {};

    estadosData.forEach((e) => {
      map[e.barbero_id] = e;
      sel[e.barbero_id] = e.estado;
      horas[e.barbero_id] = "";
      colacion[e.barbero_id] = "";
      checks[e.barbero_id] = !e.hora_vuelve;
    });

    setBarberos(barberosData);
    setEstadoMap(map);
    setSelectedEstado(sel);
    setHoraVuelve(horas);
    setHoraColacion(colacion);
    setCheckMarcado(checks);
    setError({});
    setLoading(false);
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  // 🔴 ÚNICO CAMBIO: Realtime
  useEffect(() => {
    const channel = supabase
      .channel("estado-actual-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "estado_actual",
        },
        () => {
          cargarTodo();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const actualizarEstado = async (id) => {
    const estado = selectedEstado[id];

    // ✅ FIX: checkMarcado solo aplica a "disponible" y "no_disponible"
    const todoElDia =
      estado === "disponible" || estado === "no_disponible"
        ? checkMarcado[id]
        : false; // en_almuerzo nunca debe forzar hora_vuelve a null

    if (estado === "disponible" && !todoElDia) {
      if (!horaColacion[id] || !horaVuelve[id]) {
        setError((p) => ({
          ...p,
          [id]:
            "Debes indicar la hora de colación y la hora de regreso, o marcar “Todo el día”.",
        }));
        return;
      }
    }

    if (
      (estado === "en_almuerzo" || estado === "no_disponible") &&
      !todoElDia &&
      !horaVuelve[id]
    ) {
      setError((p) => ({
        ...p,
        [id]: "Debes indicar la hora de regreso.",
      }));
      return;
    }

    setError((p) => ({ ...p, [id]: null }));
    setSaving((p) => ({ ...p, [id]: true }));

    await supabase.from("estado_actual").upsert(
      {
        barbero_id: id,
        estado,
        hora_colacion:
          estado === "disponible" && !todoElDia ? horaColacion[id] : null,
        hora_vuelve: todoElDia ? null : horaVuelve[id],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "barbero_id" }
    );

    setSaving((p) => ({ ...p, [id]: false }));
    cargarTodo();
  };

  if (loading) return <div className="p-8">Cargando...</div>;

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <h1 className="text-5xl font-extrabold">Estado diario</h1>

        <p className="text-xl font-semibold text-gray-600 max-w-4xl">
          El <span className="font-bold text-black">chatbot</span> de la barbería
          se basa en estos{" "}
          <span className="font-bold text-black">estados</span> para responder
          automáticamente{" "}
          <span className="text-green-600 font-bold">WhatsApp</span> a los
          clientes. Mantenerlos{" "}
          <span className="font-bold text-black">actualizados</span> es clave
          para <span className="font-bold text-black">evitar errores</span> y
          dar una <span className="font-bold text-black">buena atención</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {barberos.map((b) => {
          const actual = estadoMap[b.id];
          const meta = ESTADOS.find((e) => e.value === actual?.estado);
          const estado = selectedEstado[b.id];
          const esDisponible = estado === "disponible";
          const esNoDisponible = estado === "no_disponible";
          const esColacion = estado === "en_almuerzo";

          let resumen = null;

          if (actual?.estado === "no_disponible") {
            resumen = actual.hora_vuelve
              ? `Vuelve a las ${formatTimeValue(actual.hora_vuelve)}.`
              : `No vuelve hoy.`;
          }

          if (actual?.estado === "en_almuerzo") {
            resumen = actual.hora_vuelve
              ? `Vuelve a las ${formatTimeValue(actual.hora_vuelve)}.`
              : null;
          }

          if (actual?.estado === "disponible") {
            if (actual.hora_colacion) {
              resumen = `Se va a colación a las ${formatTimeValue(
                actual.hora_colacion
              )}.`;
            } else {
              resumen = `Disponible todo el día.`;
            }
          }

          return (
            <div
              key={b.id}
              className="border border-black rounded-xl p-5 bg-white"
            >
              <h2 className="text-xl font-semibold mb-2">{b.nombre}</h2>

              <div className="text-sm mb-2">
                Estado actual:{" "}
                <span className={`font-semibold ${meta?.color}`}>
                  {meta?.label}
                </span>
                <div className="text-gray-500">
                  Última actualización: {formatHora(actual?.updated_at)}
                </div>
              </div>

              {resumen && (
                <div className="text-sm font-semibold text-gray-700 mb-3">
                  {resumen}
                </div>
              )}

              <select
                className="w-full border border-black rounded-lg px-3 py-2 mb-3"
                value={estado}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedEstado((p) => ({ ...p, [b.id]: value }));
                  if (value === "no_disponible") {
                    setCheckMarcado((p) => ({ ...p, [b.id]: true }));
                  }
                }}
              >
                {ESTADOS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>

              {esDisponible && (
                <>
                  <label className="flex items-center gap-2 text-sm mb-2">
                    <input
                      type="checkbox"
                      checked={checkMarcado[b.id]}
                      onChange={(e) =>
                        setCheckMarcado((p) => ({
                          ...p,
                          [b.id]: e.target.checked,
                        }))
                      }
                    />
                    Todo el día
                  </label>

                  <div className="text-sm font-medium mb-1">
                    Se va a colación a las:
                  </div>
                  <input
                    type="time"
                    disabled={checkMarcado[b.id]}
                    className={`w-full border border-black rounded-lg px-3 py-2 mb-3 ${
                      checkMarcado[b.id]
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    value={horaColacion[b.id] || ""}
                    onChange={(e) =>
                      setHoraColacion((p) => ({
                        ...p,
                        [b.id]: e.target.value,
                      }))
                    }
                  />

                  <div className="text-sm font-medium mb-1">Vuelve a las:</div>
                  <input
                    type="time"
                    disabled={checkMarcado[b.id]}
                    className={`w-full border border-black rounded-lg px-3 py-2 ${
                      checkMarcado[b.id]
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    value={horaVuelve[b.id] || ""}
                    onChange={(e) =>
                      setHoraVuelve((p) => ({
                        ...p,
                        [b.id]: e.target.value,
                      }))
                    }
                  />

                  {checkMarcado[b.id] && (
                    <p className="mt-3 text-base font-bold text-red-600">
                      Para escribir horas debes desmarcar “Todo el día”.
                    </p>
                  )}
                </>
              )}

              {esColacion && (
                <>
                  <div className="text-sm font-medium mb-1">Vuelve a las:</div>
                  <input
                    type="time"
                    className="w-full border border-black rounded-lg px-3 py-2"
                    value={horaVuelve[b.id] || ""}
                    onChange={(e) =>
                      setHoraVuelve((p) => ({
                        ...p,
                        [b.id]: e.target.value,
                      }))
                    }
                  />
                </>
              )}

              {esNoDisponible && (
                <>
                  <label className="flex items-center gap-2 text-sm mb-2">
                    <input
                      type="checkbox"
                      checked={checkMarcado[b.id]}
                      onChange={(e) =>
                        setCheckMarcado((p) => ({
                          ...p,
                          [b.id]: e.target.checked,
                        }))
                      }
                    />
                    No vuelve
                  </label>

                  <div className="text-sm font-medium mb-1">Vuelve a las:</div>
                  <input
                    type="time"
                    disabled={checkMarcado[b.id]}
                    className={`w-full border border-black rounded-lg px-3 py-2 ${
                      checkMarcado[b.id]
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    value={horaVuelve[b.id] || ""}
                    onChange={(e) =>
                      setHoraVuelve((p) => ({
                        ...p,
                        [b.id]: e.target.value,
                      }))
                    }
                  />
                </>
              )}

              {error[b.id] && (
                <p className="mt-3 text-base font-bold text-red-600">
                  {error[b.id]}
                </p>
              )}

              <button
                className="w-full rounded-lg py-2 mt-4 font-semibold text-white bg-black"
                onClick={() => actualizarEstado(b.id)}
                disabled={saving[b.id]}
              >
                {saving[b.id] ? "Actualizando..." : "Actualizar estado"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
