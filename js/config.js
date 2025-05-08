// Configuración de Supabase
const SUPABASE_URL = "https://ysvjtttjonoqctedhasd.supabase.co"
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlzdmp0dHRqb25vcWN0ZWRoYXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NzQzNDYsImV4cCI6MjA2MjE1MDM0Nn0.m7ckDLbjy-S-VvY1gG2XnmG9UIySMnBlTkCXy1YM2iw"

// Función para inicializar Supabase - esta función será exportada
function initSupabase(createClient) {
  try {
    return createClient(SUPABASE_URL, SUPABASE_KEY)
  } catch (error) {
    console.error("Error al inicializar Supabase:", error)
    return null
  }
}

// Formatear moneda
function formatCurrency(amount) {
  return `S/. ${Number.parseFloat(amount).toFixed(2)}`
}

// Formatear fecha
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Generar ID único para ventas
function generateSaleId() {
  const date = new Date()
  const year = date.getFullYear().toString().slice(2)
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const day = date.getDate().toString().padStart(2, "0")
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")

  return `F${year}${month}${day}-${hours}${minutes}`
}

// Exportar constantes y funciones
export { SUPABASE_URL, SUPABASE_KEY, initSupabase, formatCurrency, formatDate, generateSaleId }
