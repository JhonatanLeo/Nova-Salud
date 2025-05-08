// Gestión de alertas y notificaciones

// Import Supabase client (assuming it's in supabase.js)
import { supabase } from "./supabase.js"
import { initSupabase } from "./supabase.js"
import { showToast } from "./utils.js"
import { showLoading, hideLoading } from "./utils.js"
import { formatDate } from "./utils.js"

// Cargar alertas
async function loadAlerts() {
  if (!initSupabase()) {
    showToast("Error de configuración de Supabase", "error")
    return
  }

  try {
    showLoading("Cargando alertas...")

    // Cargar productos con stock bajo
    const { data: lowStockProducts, error: stockError } = await supabase
      .from("productos")
      .select("*")
      .lte("stock", supabase.raw("stock_minimo"))

    if (stockError) {
      console.error("Error al cargar productos con stock bajo:", stockError)
    }

    // Cargar productos próximos a vencer
    const today = new Date()
    const nextMonth = new Date(today)
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    const { data: expiringProducts, error: expiringError } = await supabase
      .from("productos")
      .select("*")
      .lt("fecha_vencimiento", nextMonth.toISOString())
      .gt("fecha_vencimiento", today.toISOString())

    if (expiringError) {
      console.error("Error al cargar productos próximos a vencer:", expiringError)
    }

    // Actualizar UI
    updateAlertsUI({
      lowStockProducts: lowStockProducts || [],
      expiringProducts: expiringProducts || [],
    })

    hideLoading()
  } catch (error) {
    console.error("Error al cargar alertas:", error)
    hideLoading()
    showToast("Error al cargar alertas", "error")
  }
}

// Actualizar UI de alertas
function updateAlertsUI(data) {
  // Actualizar contador de alertas
  const alertCount = data.lowStockProducts.length + data.expiringProducts.length
  const badgeElement = document.querySelector(".notifications .badge")

  if (badgeElement) {
    badgeElement.textContent = alertCount
  }

  // Actualizar lista de productos con stock bajo
  const lowStockList = document.querySelector("#low-stock-list")

  if (lowStockList) {
    lowStockList.innerHTML = ""

    if (data.lowStockProducts.length === 0) {
      lowStockList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <p>No hay productos con stock bajo</p>
                </div>
            `
    } else {
      data.lowStockProducts.forEach((product) => {
        const alertItem = document.createElement("div")
        alertItem.className = "alert-item"

        alertItem.innerHTML = `
                    <div class="alert-icon warning">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="alert-content">
                        <h3>${product.nombre}</h3>
                        <p>Stock actual: <strong>${product.stock}</strong> unidades</p>
                        <p>Stock mínimo: <strong>${product.stock_minimo}</strong> unidades</p>
                    </div>
                    <div class="alert-actions">
                        <button class="btn-icon restock-btn" data-id="${product.id}">
                            <i class="fas fa-plus-circle"></i> Reabastecer
                        </button>
                    </div>
                `

        lowStockList.appendChild(alertItem)
      })

      // Añadir event listeners
      document.querySelectorAll(".restock-btn").forEach((button) => {
        button.addEventListener("click", function () {
          const productId = this.getAttribute("data-id")
          window.location.href = `inventario.html?restock=${productId}`
        })
      })
    }
  }

  // Actualizar lista de productos próximos a vencer
  const expiringList = document.querySelector("#expiring-list")

  if (expiringList) {
    expiringList.innerHTML = ""

    if (data.expiringProducts.length === 0) {
      expiringList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <p>No hay productos próximos a vencer</p>
                </div>
            `
    } else {
      data.expiringProducts.forEach((product) => {
        const daysToExpire = Math.ceil((new Date(product.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24))

        const alertItem = document.createElement("div")
        alertItem.className = "alert-item"

        alertItem.innerHTML = `
                    <div class="alert-icon danger">
                        <i class="fas fa-calendar-times"></i>
                    </div>
                    <div class="alert-content">
                        <h3>${product.nombre}</h3>
                        <p>Vence en: <strong>${daysToExpire}</strong> días</p>
                        <p>Fecha de vencimiento: <strong>${formatDate(product.fecha_vencimiento)}</strong></p>
                    </div>
                    <div class="alert-actions">
                        <button class="btn-icon view-btn" data-id="${product.id}">
                            <i class="fas fa-eye"></i> Ver detalles
                        </button>
                    </div>
                `

        expiringList.appendChild(alertItem)
      })

      // Añadir event listeners
      document.querySelectorAll(".view-btn").forEach((button) => {
        button.addEventListener("click", function () {
          const productId = this.getAttribute("data-id")
          window.location.href = `inventario.html?view=${productId}`
        })
      })
    }
  }
}

// Inicializar página de alertas
document.addEventListener("DOMContentLoaded", () => {
  // Verificar si estamos en la página de alertas
  if (document.querySelector(".alerts-page")) {
    // Cargar alertas
    loadAlerts()
  } else {
    // Cargar contador de alertas para el header
    loadAlerts()
  }
})
