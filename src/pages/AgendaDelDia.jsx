import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const BARBERIA_ID = "2c2812a7-5095-4283-bb00-6c09e22f9c94";

const ESTADO_STYLES = {
  agendada: { bg: "#1b5e20", label: "Agendada" },
  confirmada: { bg: "#0d47a1", label: "Confirmada" },
  vino: { bg: "#2e7d32", label: "Vino" },
  no_vino: { bg: "#b71c1c", label: "No vino" },
};

export default function AgendaDelDia() {
  const [agendas, setAgendas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState({
    abierta: false,
    agendaId: null,
    accion: null, // "vino" | "no_vino"
  });

  useEffect(() => {
    cargarAgendas();

    const channel = supabase
      .channel("realtime-agendas-dia")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agendas",
          filter: `barberia_id=eq.${BARBERIA_ID}`,
        },
        cargarAgendas
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const cargarAgendas = async () => {
    setLoading(true);
    const hoy = new Date().toISOString().split("T")[0];

    const { data } = await supabase
      .from("agendas")
      .select("*")
      .eq("barberia_id", BARBERIA_ID)
      .eq("fecha", hoy)
      .order("hora_inicio", { ascending: true });

    setAgendas(data || []);
    setLoading(false);
  };

  const confirmarAccion = async () => {
    const { error } = await supabase
      .from("agendas")
      .update({
        estado_final: modal.accion,
        confirmado_en: new Date().toISOString(),
        confirmado_por: "owner",
      })
      .eq("id", modal.agendaId);

    if (!error) {
      setModal({ abierta: false, agendaId: null, accion: null });
      cargarAgendas();
    } else {
      console.error("Error actualizando agenda:", error);
    }
  };

  const fechaHoy = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div style={{ padding: "32px", maxWidth: "1200px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "40px", display: "flex", alignItems: "center", gap: "12px" }}>
          📅 Agenda del día
        </h1>
        <div style={{ color: "#777", fontSize: "15px" }}>
          {fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1)}
        </div>
      </div>

      {loading && <div>Cargando agenda…</div>}
      {!loading && agendas.length === 0 && <div>No hay agendas para hoy.</div>}

      {!loading && agendas.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "22px",
          }}
        >
          {agendas.map((a) => {
            const estadoFinal = a.estado_final;
            const cardBg =
              estadoFinal === "vino"
                ? "linear-gradient(135deg, #1b5e20, #2e7d32)"
                : estadoFinal === "no_vino"
                ? "linear-gradient(135deg, #8e0000, #b71c1c)"
                : "#111";

            const vinoActivo = estadoFinal === "vino";
            const noVinoActivo = estadoFinal === "no_vino";

            return (
              <div
                key={a.id}
                style={{
                  background: cardBg,
                  borderRadius: "20px",
                  padding: "22px",
                  border: "2px solid #000",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
                  transition: "all 0.3s ease",
                }}
              >
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#fff" }}>
                  {a.hora_inicio} – {a.hora_fin}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "12px",
                  }}
                >
                  <div style={{ fontSize: "22px", fontWeight: 900, color: "#fff" }}>
                    {a.nombre_cliente}
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#ffd54f" }}>
                    {a.servicio}
                  </div>
                </div>

                <div style={{ marginTop: "6px", color: "#e0e0e0" }}>
                  ✂️ {a.barbero_nombre || "Cualquiera"}
                </div>

                <div style={{ fontSize: "14px", color: "#bdbdbd", marginTop: "4px" }}>
                  {a.telefono_cliente}
                </div>

                <div
                  style={{
                    marginTop: "12px",
                    background: ESTADO_STYLES[a.estado].bg,
                    color: "#fff",
                    padding: "8px 16px",
                    borderRadius: "999px",
                    fontWeight: 800,
                    width: "fit-content",
                  }}
                >
                  {ESTADO_STYLES[a.estado].label}
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "18px" }}>
                  <button
                    onClick={() =>
                      setModal({ abierta: true, agendaId: a.id, accion: "vino" })
                    }
                    style={{
                      flex: 1,
                      background: "#2e7d32",
                      color: "#fff",
                      border: "2px solid #000",
                      borderRadius: "12px",
                      padding: "10px",
                      fontWeight: 800,
                      cursor: "pointer",
                      opacity: vinoActivo || estadoFinal === "pendiente" ? 1 : 0.1,
                    }}
                  >
                    El cliente vino
                  </button>

                  <button
                    onClick={() =>
                      setModal({ abierta: true, agendaId: a.id, accion: "no_vino" })
                    }
                    style={{
                      flex: 1,
                      background: "#c62828",
                      color: "#fff",
                      border: "2px solid #000",
                      borderRadius: "12px",
                      padding: "10px",
                      fontWeight: 800,
                      cursor: "pointer",
                      opacity: noVinoActivo || estadoFinal === "pendiente" ? 1 : 0.1,
                    }}
                  >
                    No vino
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal.abierta && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#111",
              padding: "28px",
              borderRadius: "16px",
              border: "2px solid #000",
              width: "360px",
              color: "#fff",
              textAlign: "center",
            }}
          >
            <h3 style={{ marginBottom: "16px" }}>
              ¿Confirmar que el cliente{" "}
              <span style={{ color: modal.accion === "vino" ? "#4caf50" : "#f44336" }}>
                {modal.accion === "vino" ? "SÍ vino" : "NO vino"}?
              </span>
            </h3>

            <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
              <button
                onClick={confirmarAccion}
                style={{
                  flex: 1,
                  background: modal.accion === "vino" ? "#2e7d32" : "#c62828",
                  color: "#fff",
                  border: "2px solid #000",
                  borderRadius: "10px",
                  padding: "10px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Confirmar
              </button>

              <button
                onClick={() =>
                  setModal({ abierta: false, agendaId: null, accion: null })
                }
                style={{
                  flex: 1,
                  background: "#424242",
                  color: "#fff",
                  border: "2px solid #000",
                  borderRadius: "10px",
                  padding: "10px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
