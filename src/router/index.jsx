import { createBrowserRouter } from "react-router-dom";

// layouts
import OwnerLayout from "../layouts/OwnerLayout";

// páginas privadas
import Dashboard from "../pages/Dashboard";
import Barberos from "../pages/Barberos";
import EstadoDiario from "../pages/EstadoDiario";
import Contabilidad from "../pages/Contabilidad";
import RegistrarCorte from "../pages/RegistrarCorte";
import OrdenBarberos from "../pages/OrdenBarberos";
import AgendaDelDia from "../pages/AgendaDelDia";

// páginas públicas
import Login from "../pages/Login";
import EstadoPublico from "../pages/EstadoPublico";
import ForgotPassword from "../pages/forgot-password";
import ResetPassword from "../pages/reset-password";

const router = createBrowserRouter([
  // 🔓 LOGIN
  {
    path: "/",
    element: <Login />,
  },

  // 🔓 RECUPERAR CONTRASEÑA
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },

  {
    path: "/reset-password",
    element: <ResetPassword />,
  },

  // 🔒 PANEL PRIVADO
  {
    path: "/app",
    element: <OwnerLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "barberos", element: <Barberos /> },
      { path: "estado-diario", element: <EstadoDiario /> },
      { path: "agenda-del-dia", element: <AgendaDelDia /> },
      { path: "contabilidad", element: <Contabilidad /> },
      { path: "registrar-corte", element: <RegistrarCorte /> },
      { path: "orden-barberos", element: <OrdenBarberos /> },
    ],
  },

  // 🌍 ESTADO PÚBLICO
  {
    path: "/estado-barberia",
    element: <EstadoPublico />,
  },
]);

export default router;
