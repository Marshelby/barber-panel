import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useBarberia } from "../context/BarberiaContext";

export default function Header() {
  const { barberia } = useBarberia();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-zinc-200">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Barber<span className="text-zinc-500">Panel</span>
        </h1>
        <p className="text-sm text-zinc-500">
          {barberia?.nombre || "Panel del dueño"}
        </p>
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 cursor-pointer"
        >
          <span className="text-sm text-zinc-600">Dueño</span>
          <div className="w-9 h-9 rounded-full bg-zinc-200 flex items-center justify-center text-sm font-medium">
            👤
          </div>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-40 bg-white border border-zinc-200 rounded-md shadow-md z-50">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-zinc-100"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
