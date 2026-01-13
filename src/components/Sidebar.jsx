import { NavLink } from "react-router-dom";

const links = [
  { to: "/app", label: "Inicio", icon: "🏠" },
  { to: "/app/registrar-corte", label: "Registrar corte", icon: "✂️" },
  { to: "/app/barberos", label: "Barberos", icon: "🧔" },
  { to: "/app/estado-diario", label: "Estado diario", icon: "🟡" },

  // 🔹 NUEVO LINK — AGENDA DEL DÍA (ÚNICO CAMBIO)
  { to: "/app/agenda-del-dia", label: "Agenda del día", icon: "📅" },

  { to: "/app/orden-barberos", label: "Orden de barberos", icon: "📋" },
  { to: "/app/contabilidad", label: "Contabilidad", icon: "💰" },
];

export default function Sidebar() {
  return (
    <aside className="w-64 h-full bg-zinc-900 text-zinc-100 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-zinc-800 flex-shrink-0">
        <span className="text-lg font-semibold tracking-tight">
          Barber<span className="text-zinc-400">Panel</span>
        </span>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end
            className={({ isActive }) =>
              `
              flex items-center gap-3 px-3 py-2 rounded-md
              text-base font-medium transition
              ${
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }
            `
            }
          >
            <span className="text-lg">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
