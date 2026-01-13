import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useBarberos } from "./BarberContext";

const EstadoContext = createContext();

export function EstadoProvider({ children }) {
  const { barberos } = useBarberos();
  const [estado, setEstado] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!barberos || barberos.length === 0) {
      setLoading(false);
      return;
    }

    // 🔹 usamos el primer barbero activo como referencia
    const barberoId = barberos[0].id;

    async function fetchEstado() {
      setLoading(true);

      const { data, error } = await supabase
        .from("estado_actual")
        .select("*")
        .eq("barbero_id", barberoId)
        .limit(1)
        .single();

      if (error) {
        console.error("Error cargando estado actual:", error);
        setEstado(null);
      } else {
        setEstado(data);
      }

      setLoading(false);
    }

    fetchEstado();
  }, [barberos]);

  return (
    <EstadoContext.Provider value={{ estado, loading }}>
      {children}
    </EstadoContext.Provider>
  );
}

export function useEstado() {
  const context = useContext(EstadoContext);
  if (!context) {
    throw new Error("useEstado debe usarse dentro de EstadoProvider");
  }
  return context;
}
