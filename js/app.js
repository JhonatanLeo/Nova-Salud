// Archivo principal de la aplicación

// Importar funciones necesarias (asegúrate de que las rutas sean correctas)
import { initSupabase } from "./supabase.js"
import { showToast } from "./utils.js"
import { initAuth } from "./auth.js"
import { loadDashboardData } from "./dashboard.js"
import { loadProducts } from "./inventario.js"
import { loadPOSProducts } from "./pos.js"
import { loadReportsData } from "./reportes.js"
import { loadAlerts } from "./alertas.js"

// Inicializar la aplicación
document.addEventListener("DOMContentLoaded", () => {
  // Verificar si tenemos la clave de Supabase
  const supabaseKey = localStorage.getItem("SUPABASE_KEY")

  if (!supabaseKey) {
    // Solicitar clave de Supabase
    const key = prompt("Por favor, ingrese su clave de Supabase:")

    if (key) {
      localStorage.setItem("SUPABASE_KEY", key)
      initSupabase()
    } else {
      showToast("Se requiere la clave de Supabase para continuar", "error")
      return
    }
  } else {
    initSupabase()
  }

  // Inicializar autenticación
  initAuth()

  // Cargar datos específicos de cada página
  const currentPath = window.location.pathname

  if (currentPath.includes("index.html") || currentPath === "/") {
    // Estamos en el dashboard
    if (typeof loadDashboardData === "function") {
      loadDashboardData()
    }
  } else if (currentPath.includes("inventario.html")) {
    // Estamos en la página de inventario
    if (typeof loadProducts === "function") {
      loadProducts()
    }
  } else if (currentPath.includes("pos.html")) {
    // Estamos en la página de punto de venta
    if (typeof loadPOSProducts === "function") {
      loadPOSProducts()
    }
  } else if (currentPath.includes("reportes.html")) {
    // Estamos en la página de reportes
    if (typeof loadReportsData === "function") {
      loadReportsData()
    }
  } else if (currentPath.includes("alertas.html")) {
    // Estamos en la página de alertas
    if (typeof loadAlerts === "function") {
      loadAlerts()
    }
  }
})
