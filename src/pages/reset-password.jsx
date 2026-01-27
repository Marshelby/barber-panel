import { useState } from "react"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"

export default function ResetPassword() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    match: password.length > 0 && password === confirmPassword,
  }

  const allValid = Object.values(rules).every(Boolean)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!allValid) {
      setError("La contraseña no cumple con los requisitos.")
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    navigate("/", { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
        <h1 className="text-2xl font-extrabold text-gray-900">
          BarberPanel
        </h1>

        <p className="text-gray-500 mt-1 mb-4 text-sm">
          Define una nueva contraseña
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Nueva contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="********"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="********"
              required
            />
          </div>

          {/* Reglas dinámicas */}
          <ul className="text-sm space-y-1">
            <li className={rules.length ? "text-green-600" : "text-red-500"}>
              • Mínimo 8 caracteres
            </li>
            <li className={rules.uppercase ? "text-green-600" : "text-red-500"}>
              • Al menos una letra mayúscula
            </li>
            <li className={rules.number ? "text-green-600" : "text-red-500"}>
              • Al menos un número
            </li>
            <li className={rules.match ? "text-green-600" : "text-red-500"}>
              • Las contraseñas coinciden
            </li>
          </ul>

          <button
            disabled={!allValid || loading}
            className={`w-full rounded-lg py-2 font-semibold text-white ${
              allValid
                ? "bg-black hover:bg-gray-900"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {loading ? "Guardando..." : "Cambiar contraseña"}
          </button>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </form>
      </div>
    </div>
  )
}
