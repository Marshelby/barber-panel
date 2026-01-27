import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:5173/reset-password",
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setMessage("Te enviamos un correo con instrucciones.")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
        <h1 className="text-2xl font-extrabold text-gray-900">
          BarberPanel
        </h1>

        <p className="text-gray-500 mt-1 mb-6 text-sm">
          Recupera el acceso a tu cuenta
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Correo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="correo@barberia.cl"
            />
          </div>

          <button
            disabled={loading}
            className="w-full rounded-lg bg-black py-2 text-white font-semibold hover:bg-gray-900 disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Enviar correo"}
          </button>

          {message && (
            <p className="text-sm text-green-600">{message}</p>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </form>
      </div>
    </div>
  )
}
