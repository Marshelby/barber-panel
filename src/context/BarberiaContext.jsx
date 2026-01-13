import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const BarberiaContext = createContext();

export function BarberiaProvider({ children }) {
  const [barberia, setBarberia] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchBarberia() {
      setLoading(true);

      // 1️⃣ Obtener sesión activa
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (isMounted) {
          setBarberia(null);
          setLoading(false);
        }
        return;
      }

      const userId = session.user.id;

      // 2️⃣ Cargar barbería del usuario (1 usuario = 1 barbería)
      const { data, error } = await supabase
        .from("barberias")
        .select("*")
        .eq("owner_user_id", userId)
        .limit(1);

      if (!isMounted) return;

      if (error) {
        console.error("Error cargando barbería:", error);
        setBarberia(null);
      } else {
        setBarberia(data && data.length > 0 ? data[0] : null);
      }

      setLoading(false);
    }

    fetchBarberia();

    // 3️⃣ Escuchar login / logout
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchBarberia();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <BarberiaContext.Provider value={{ barberia, loading }}>
      {children}
    </BarberiaContext.Provider>
  );
}

export function useBarberia() {
  const context = useContext(BarberiaContext);
  if (!context) {
    throw new Error("useBarberia debe usarse dentro de BarberiaProvider");
  }
  return context;
}
