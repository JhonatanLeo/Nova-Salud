// Archivo de configuración de Supabase
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm"
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js"

// Crear cliente de Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Función para inicializar Supabase y verificar la conexión
export function initSupabase() {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error("Error: Faltan credenciales de Supabase")
      return false
    }

    console.log("Inicializando conexión con Supabase...")
    return true
  } catch (error) {
    console.error("Error al inicializar Supabase:", error)
    return false
  }
}
