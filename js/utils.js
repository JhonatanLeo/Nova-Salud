// Importar la biblioteca de Supabase
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"
import {
  SUPABASE_URL,
  SUPABASE_KEY,
  formatCurrency as configFormatCurrency,
  formatDate as configFormatDate,
  generateSaleId as configGenerateSaleId,
} from "./config.js"

// Para las exportaciones fuera del navegador
// import * as XLSX from 'xlsx';
// import html2pdf from 'html2pdf.js';

// Inicializar cliente de Supabase inmediatamente para evitar problemas
let supabase = null
let isSupabaseInitialized = false

// Inicializar Supabase inmediatamente - esto evita problemas de carrera
try {
  console.log("Inicializando cliente Supabase con URL:", SUPABASE_URL)
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  console.log("Cliente Supabase creado correctamente")
  isSupabaseInitialized = true
} catch (error) {
  console.error("Error al inicializar Supabase:", error)
  showToast("Error de conexión con la base de datos", "error")
}

// Función para verificar si Supabase está inicializado (se mantiene para retrocompatibilidad)
function initSupabase() {
  try {
    if (!supabase) {
      console.log("Inicializando cliente Supabase con URL:", SUPABASE_URL)
      supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
      isSupabaseInitialized = true
    }
    return supabase !== null
  } catch (error) {
    console.error("Error al inicializar Supabase:", error)
    return false
  }
}

// Formatear moneda
function formatCurrency(amount) {
  return configFormatCurrency(amount)
}

// Formatear fecha
function formatDate(dateString) {
  return configFormatDate(dateString)
}

// Generar ID único para ventas
function generateSaleId() {
  return configGenerateSaleId()
}

// Mostrar mensaje de carga
function showLoading(message = "Cargando...") {
  // Crear overlay de carga si no existe
  if (!document.getElementById("loading-overlay")) {
    const overlay = document.createElement("div")
    overlay.id = "loading-overlay"
    overlay.innerHTML = `
      <div class="loading-spinner"></div>
      <p id="loading-message">${message}</p>
    `

    // Estilos para el overlay
    overlay.style.position = "fixed"
    overlay.style.top = "0"
    overlay.style.left = "0"
    overlay.style.width = "100%"
    overlay.style.height = "100%"
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)"
    overlay.style.display = "flex"
    overlay.style.flexDirection = "column"
    overlay.style.alignItems = "center"
    overlay.style.justifyContent = "center"
    overlay.style.zIndex = "9999"

    // Estilos para el spinner
    const style = document.createElement("style")
    style.textContent = `
      .loading-spinner {
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top: 4px solid var(--primary-color);
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      #loading-message {
        color: white;
        font-weight: 500;
      }
    `

    document.head.appendChild(style)
    document.body.appendChild(overlay)
  } else {
    document.getElementById("loading-message").textContent = message
    document.getElementById("loading-overlay").style.display = "flex"
  }
}

// Ocultar mensaje de carga
function hideLoading() {
  const overlay = document.getElementById("loading-overlay")
  if (overlay) {
    overlay.style.display = "none"
  }
}

// Mostrar notificación toast
function showToast(message, type = "success", duration = 3000) {
  // Crear contenedor de toasts si no existe
  if (!document.getElementById("toast-container")) {
    const container = document.createElement("div")
    container.id = "toast-container"

    // Estilos para el contenedor
    container.style.position = "fixed"
    container.style.bottom = "20px"
    container.style.right = "20px"
    container.style.zIndex = "9999"

    document.body.appendChild(container)
  }

  // Crear toast
  const toast = document.createElement("div")
  toast.className = `toast toast-${type}`
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fas fa-${type === "success" ? "check-circle" : type === "error" ? "exclamation-circle" : "info-circle"}"></i>
    </div>
    <div class="toast-content">${message}</div>
  `

  // Estilos para el toast
  toast.style.display = "flex"
  toast.style.alignItems = "center"
  toast.style.backgroundColor = "white"
  toast.style.borderRadius = "var(--radius)"
  toast.style.boxShadow = "var(--shadow-md)"
  toast.style.padding = "1rem"
  toast.style.marginTop = "0.5rem"
  toast.style.animation = "fadeIn 0.3s ease"
  toast.style.borderLeft = `4px solid ${type === "success" ? "var(--success-color)" : type === "error" ? "var(--danger-color)" : "var(--info-color)"}`

  // Estilos para el icono
  const iconDiv = toast.querySelector(".toast-icon")
  iconDiv.style.marginRight = "0.75rem"
  iconDiv.style.color =
    type === "success" ? "var(--success-color)" : type === "error" ? "var(--danger-color)" : "var(--info-color)"

  // Añadir al contenedor
  document.getElementById("toast-container").appendChild(toast)

  // Eliminar después de la duración
  setTimeout(() => {
    toast.style.opacity = "0"
    toast.style.transform = "translateX(100%)"
    toast.style.transition = "all 0.3s ease"

    setTimeout(() => {
      toast.remove()
    }, 300)
  }, duration)
}

// Mostrar modal
function showModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) {
    modal.classList.add("active")
  }
}

// Ocultar modal
function hideModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) {
    modal.classList.remove("active")
  }
}

// Obtener usuario actual
function getCurrentUser() {
  const userStr = localStorage.getItem("currentUser") || localStorage.getItem("user")
  if (userStr) {
    try {
      const user = JSON.parse(userStr)
      // Verificar que el usuario tenga un ID en formato UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (user && user.id && !uuidRegex.test(user.id)) {
        console.warn("Usuario encontrado pero con ID inválido:", user.id)
        return null
      }
      return user
    } catch (e) {
      console.error("Error al parsear usuario:", e)
      return null
    }
  }
  return null
}

// Exportar a Excel
function exportToExcel(data, fileName) {
  console.log("Exportar a Excel - Funcionalidad pendiente")
  // Para implementar en una versión futura con XLSX
  // const wb = XLSX.utils.book_new()
  // const ws = XLSX.utils.json_to_sheet(data)
  // XLSX.utils.book_append_sheet(wb, ws, "Datos")
  // XLSX.writeFile(wb, `${fileName}.xlsx`)
}

// Exportar a PDF
function exportToPDF(elementId, fileName) {
  console.log("Exportar a PDF - Funcionalidad pendiente")
  const element = document.getElementById(elementId)

  if (!element) {
    showToast("Elemento no encontrado", "error")
    return
  }

  // Para implementar en una versión futura con html2pdf
  // html2pdf()
  //   .from(element)
  //   .save(`${fileName}.pdf`)
}

// Exportar funciones y variables
export {
  supabase,
  initSupabase,
  formatCurrency,
  formatDate,
  generateSaleId,
  showLoading,
  hideLoading,
  showToast,
  showModal,
  hideModal,
  getCurrentUser,
  exportToExcel,
  exportToPDF,
}
