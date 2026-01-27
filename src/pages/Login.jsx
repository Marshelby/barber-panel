import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // ✅ Si ya hay sesión activa, entra directo al panel
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (data?.session) {
        navigate("/app", { replace: true })
      }
    }
    checkSession()
  }, [navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    // ✅ Ruta real del panel
    navigate("/app", { replace: true })
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f5f5f5",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "white",
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>
          BarberPanel
        </h1>
        <p style={{ marginTop: 6, marginBottom: 18, color: "#666" }}>
          Inicia sesión para entrar al panel
        </p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "#666" }}>Correo</label>
            <input
              type="email"
              placeholder="correo@barberia.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ddd",
                marginTop: 6,
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "#666" }}>Contraseña</label>
            <input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ddd",
                marginTop: 6,
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "none",
              background: "#111",
              color: "white",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 700,
              marginTop: 6,
            }}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            style={{
              marginTop: 10,
              background: "transparent",
              border: "none",
              color: "#555",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            ¿Olvidaste tu contraseña?
          </button>


          {error && (
            <p style={{ color: "#c00", marginTop: 12, fontSize: 13 }}>
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
