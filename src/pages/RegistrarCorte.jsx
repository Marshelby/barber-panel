import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

const PORCENTAJE_BARBERO = 50;

export default function RegistrarCorte() {
  const navigate = useNavigate();

  const [barberos, setBarberos] = useState([]);
  const [tiposCorte, setTiposCorte] = useState([]);
  const [cortesHoy, setCortesHoy] = useState([]);

  const [barberoId, setBarberoId] = useState("");
  const [tipoCorteId, setTipoCorteId] = useState("");
  const [precio, setPrecio] = useState(0);
  const [nota, setNota] = useState("");

  const [estadoBarbero, setEstadoBarbero] = useState(null);
  const [registrando, setRegistrando] = useState(false);

  const [mostrarEliminar, setMostrarEliminar] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinEliminacionReal, setPinEliminacionReal] = useState(null);
  const [corteEliminarId, setCorteEliminarId] = useState(null);

  // ✅ NUEVO: error de PIN (solo para la modal)
  const [pinError, setPinError] = useState(false);

  const [editando, setEditando] = useState(null);
  const [editBarberoId, setEditBarberoId] = useState("");
  const [editTipo, setEditTipo] = useState("");
  const [editPrecio, setEditPrecio] = useState(0);
  const [editNota, setEditNota] = useState("");

  useEffect(() => {
    cargarTodo();
  }, []);

  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape") {
        setEditando(null);
        setMostrarEliminar(false);
      }
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  async function cargarTodo() {
    await Promise.all([cargarBarberos(), cargarTiposCorte(), cargarCortesHoy()]);
  }

  async function cargarBarberos() {
    const { data } = await supabase
      .from("barberos")
      .select("id,nombre")
      .order("nombre");
    setBarberos(data || []);
  }

  async function cargarTiposCorte() {
    const { data } = await supabase
      .from("tipos_corte")
      .select("id,nombre,precio")
      .eq("activo", true)
      .order("nombre");
    setTiposCorte(data || []);
  }

  async function cargarCortesHoy() {
    // ✅ AJUSTE ÚNICO: ahora "cortes" es tabla diaria, no filtramos por fecha
    const { data } = await supabase
      .from("cortes")
      .select(`
        id,
        barbero_id,
        created_at,
        precio,
        nota,
        monto_barbero,
        monto_barberia,
        barberos(nombre),
        tipos_corte(nombre,id)
      `)
      .order("created_at", { ascending: false });

    setCortesHoy(data || []);
  }

  async function verificarEstado(barbero_id) {
    if (!barbero_id) {
      setEstadoBarbero(null);
      return;
    }

    const { data } = await supabase
      .from("estado_actual")
      .select("estado")
      .eq("barbero_id", barbero_id)
      .single();

    setEstadoBarbero(data?.estado || null);
  }

  function formatearHora(fecha) {
    return new Date(fecha).toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const resumen = useMemo(
    () => ({
      totalDia: cortesHoy.reduce((a, c) => a + c.precio, 0),
      totalBarberos: cortesHoy.reduce((a, c) => a + c.monto_barbero, 0),
      totalBarberia: cortesHoy.reduce((a, c) => a + c.monto_barberia, 0),
      cantidad: cortesHoy.length,
    }),
    [cortesHoy]
  );

  const bloqueado =
    estadoBarbero === "no_disponible" || estadoBarbero === "en_almuerzo";

  async function registrarCorte() {
    if (!barberoId || !tipoCorteId || bloqueado) return;

    setRegistrando(true);

    const montoBarbero = Math.round((precio * PORCENTAJE_BARBERO) / 100);
    const montoBarberia = precio - montoBarbero;

    await supabase.from("cortes").insert({
      barbero_id: barberoId,
      tipo_corte_id: tipoCorteId,
      precio,
      porcentaje_barbero: PORCENTAJE_BARBERO,
      monto_barbero: montoBarbero,
      monto_barberia: montoBarberia,
      nota: nota || null,
    });

    setBarberoId("");
    setTipoCorteId("");
    setPrecio(0);
    setNota("");
    setEstadoBarbero(null);
    setRegistrando(false);
    cargarCortesHoy();
  }

  function iniciarEdicion(c) {
    setEditando(c.id);
    setEditBarberoId(c.barbero_id);
    setEditTipo(c.tipos_corte?.id || "");
    setEditPrecio(c.precio);
    setEditNota(c.nota || "");
  }

  async function guardarEdicion() {
    const montoBarbero = Math.round((editPrecio * PORCENTAJE_BARBERO) / 100);
    const montoBarberia = editPrecio - montoBarbero;

    await supabase
      .from("cortes")
      .update({
        barbero_id: editBarberoId,
        tipo_corte_id: editTipo,
        precio: editPrecio,
        monto_barbero: montoBarbero,
        monto_barberia: montoBarberia,
        nota: editNota || null,
      })
      .eq("id", editando);

    setEditando(null);
    cargarCortesHoy();
  }

  // 🔐 ÚNICA MEJORA: PIN REAL DE LA BARBERÍA
  async function abrirEliminar(corte) {
    setCorteEliminarId(corte.id);
    setPinInput("");
    setPinError(false); // ✅ limpiar mensaje al abrir

    const { data: barbero } = await supabase
      .from("barberos")
      .select("barberia_id")
      .eq("id", corte.barbero_id)
      .single();

    if (!barbero) {
      alert("No se pudo obtener la barbería");
      return;
    }

    const { data: barberia } = await supabase
      .from("barberias")
      .select("pin_eliminacion")
      .eq("id", barbero.barberia_id)
      .single();

    if (!barberia) {
      alert("No se pudo obtener el PIN de la barbería");
      return;
    }

    setPinEliminacionReal(String(barberia.pin_eliminacion));
    setMostrarEliminar(true);
  }

  async function confirmarEliminar() {
    if (pinInput !== pinEliminacionReal) {
      // ✅ en vez de alert, mostramos el mensaje en la misma modal
      setPinError(true);
      return;
    }

    await supabase.from("cortes").delete().eq("id", corteEliminarId);
    setMostrarEliminar(false);
    cargarCortesHoy();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* RESUMEN */}
      <div className="grid md:grid-cols-4 gap-4">
        {[
          ["Total día", resumen.totalDia],
          ["Total barberos", resumen.totalBarberos],
          ["Total barbería", resumen.totalBarberia],
          ["Cortes", resumen.cantidad],
        ].map(([t, v]) => (
          <div key={t} className="bg-white border border-black p-4 rounded">
            <div className="text-sm text-zinc-500">{t}</div>
            <div className="text-2xl font-bold">
              {t === "Cortes" ? v : `$${v.toLocaleString("es-CL")}`}
            </div>
          </div>
        ))}
      </div>

      {/* FORM + LISTADO */}
      <div className="grid md:grid-cols-[360px_1fr] gap-6 items-start">
        {/* FORM REGISTRAR */}
        <div className="bg-white border border-black p-3 rounded">
          <h2 className="text-lg font-semibold mb-3">Registrar corte</h2>

          <select
            value={barberoId}
            onChange={(e) => {
              setBarberoId(e.target.value);
              verificarEstado(e.target.value);
            }}
            className="w-full border border-black p-2 rounded mb-2"
          >
            <option value="">Seleccionar barbero</option>
            {barberos.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nombre}
              </option>
            ))}
          </select>

          {bloqueado && (
            <div className="mb-2 text-sm text-orange-600 border border-orange-500 p-2 rounded">
              ⚠ El barbero no está disponible.
              <button
                type="button"
                onClick={() => navigate("/app/estado-diario")}
                className="underline ml-1"
              >
                Ir a Estado diario
              </button>
            </div>
          )}

          <select
            value={tipoCorteId}
            onChange={(e) => {
              const v = e.target.value;
              setTipoCorteId(v);

              const t = tiposCorte.find((x) => x.id === v);
              setPrecio(t?.precio || 0);
            }}
            className="w-full border border-black p-2 rounded mb-2"
          >
            <option value="">Seleccionar tipo de corte</option>
            {tiposCorte.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} (${t.precio})
              </option>
            ))}
          </select>

          <input
            type="number"
            value={precio}
            disabled
            className="w-full border border-black p-2 rounded mb-2 bg-gray-100"
          />

          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            className="w-full border border-black p-2 rounded mb-3"
            placeholder="Nota (opcional)"
          />

          <button
            type="button"
            onClick={registrarCorte}
            disabled={registrando || bloqueado}
            className={`w-full py-2 rounded text-white ${
              bloqueado ? "bg-gray-400" : "bg-black"
            }`}
          >
            Registrar corte
          </button>
        </div>

        {/* LISTADO */}
        <div className="bg-white border border-black p-4 rounded">
          <h2 className="text-lg font-semibold pb-2 border-b border-black mb-4">
            Cortes de hoy
          </h2>

          {cortesHoy.map((c) => (
            <div
              key={c.id}
              className="flex justify-between border-b border-black py-2"
            >
              <div>
                <div className="font-medium">
                  {c.barberos.nombre} — {c.tipos_corte?.nombre || "Sin tipo"}
                  <span className="text-sm text-zinc-500 ml-2">
                    · {formatearHora(c.created_at)}
                  </span>
                </div>
                <div className="text-sm text-zinc-600">
                  ${c.precio.toLocaleString("es-CL")}
                </div>
              </div>

              <div className="flex gap-4 text-sm">
                <button
                  type="button"
                  onClick={() => iniciarEdicion(c)}
                  className="underline"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => abrirEliminar(c)}
                  className="text-red-600 underline"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL EDITAR */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
          <div className="bg-white border border-black p-4 rounded w-[420px]">
            <h3 className="font-semibold text-lg mb-3">Editar corte</h3>

            <select
              value={editBarberoId}
              onChange={(e) => setEditBarberoId(e.target.value)}
              className="w-full border border-black p-2 rounded mb-2"
            >
              {barberos.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nombre}
                </option>
              ))}
            </select>

            <select
              value={editTipo}
              onChange={(e) => {
                const v = e.target.value;
                setEditTipo(v);

                const t = tiposCorte.find((x) => x.id === v);
                setEditPrecio(t?.precio || 0);
              }}
              className="w-full border border-black p-2 rounded mb-2"
            >
              {tiposCorte.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={editPrecio}
              disabled
              className="w-full border border-black p-2 rounded mb-2 bg-gray-100"
            />

            <textarea
              value={editNota}
              onChange={(e) => setEditNota(e.target.value)}
              className="w-full border border-black p-2 rounded mb-4"
              placeholder="Nota"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditando(null)}
                className="border border-black px-3 py-1 rounded"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarEdicion}
                className="bg-black text-white px-3 py-1 rounded"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {mostrarEliminar && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
          <div className="bg-white border border-black p-4 rounded w-[320px]">
            <h3 className="font-semibold text-lg mb-3">Eliminar corte</h3>

            <input
              type="password"
              placeholder="PIN"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                if (pinError) setPinError(false);
              }}
              className="w-full border border-black p-2 rounded mb-2"
            />

            {pinError && (
              <div className="text-sm text-red-600 mb-3">
                ⚠ PIN incorrecto. Intenta nuevamente.
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMostrarEliminar(false)}
                className="border border-black px-3 py-1 rounded"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminar}
                className="bg-red-600 text-white px-3 py-1 rounded"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
