// Gestión de alertas y notificaciones - Versión 2 (sin supabase.raw)

// Import Supabase client
import { supabase } from "./supabase.js"
import { initSupabase } from "./supabase.js"
import { showLoading, hideLoading } from "./utils.js"
import { formatDate, formatCurrency } from "./utils.js"

// Almacenamiento local de notificaciones
let notifications = [];

// Mostrar un toast (notificación temporal)
function showToast(message, type = "info") {
  // Buscar toast existente
  let toastContainer = document.querySelector(".toast-container")

  // Crear container si no existe
  if (!toastContainer) {
    toastContainer = document.createElement("div")
    toastContainer.className = "toast-container"
    document.body.appendChild(toastContainer)
  }

  // Crear nuevo toast
  const toast = document.createElement("div")
  toast.className = `toast ${type}`
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas ${type === "success" ? "fa-check-circle" : type === "error" ? "fa-exclamation-circle" : type === "warning" ? "fa-exclamation-triangle" : "fa-info-circle"}"></i>
      <p>${message}</p>
    </div>
    <button class="close-toast">&times;</button>
  `

  // Añadir toast al contenedor
  toastContainer.appendChild(toast)

  // Cerrar al hacer clic en el botón
  toast.querySelector(".close-toast").addEventListener("click", () => {
    toast.classList.add("hide")
    setTimeout(() => {
      toast.remove()
    }, 300)
  })

  // Desaparecer automáticamente después de 5 segundos
  setTimeout(() => {
    if (toast.parentNode) { // Verificar que el toast aún exista en el DOM
      toast.classList.add("hide")
      setTimeout(() => {
        if (toast.parentNode) toast.remove()
      }, 300)
    }
  }, 5000)
}

// Añadir una nueva notificación (para la campana)
function addNotification(title, message, type = "info", addToast = true) {
  // Crear nueva notificación
  const newNotification = {
    id: Date.now(),
    title,
    message,
    type,
    timestamp: new Date(),
    read: false
  }
  
  // Añadir al array
  notifications.unshift(newNotification) // Añadir al principio
  
  // Limitar a 20 notificaciones
  if (notifications.length > 20) {
    notifications = notifications.slice(0, 20)
  }
  
  // Guardar en localStorage
  localStorage.setItem('appNotifications', JSON.stringify(notifications))
  
  // Actualizar UI
  updateNotificationsUI()
  
  // Mostrar también como toast si se solicita
  if (addToast) {
    showToast(message, type)
  }
  
  return newNotification
}

// Cargar notificaciones desde localStorage
function loadNotifications() {
  try {
    const stored = localStorage.getItem('appNotifications')
    if (stored) {
      notifications = JSON.parse(stored)
    }
  } catch (e) {
    console.error("Error al cargar notificaciones:", e)
    notifications = []
  }
  
  updateNotificationsUI()
  return notifications
}

// Marcar notificación como leída
function markNotificationAsRead(id) {
  const notification = notifications.find(n => n.id === id)
  if (notification) {
    notification.read = true
    localStorage.setItem('appNotifications', JSON.stringify(notifications))
    updateNotificationsUI()
  }
}

// Marcar todas las notificaciones como leídas
function markAllNotificationsAsRead() {
  notifications.forEach(notification => {
    notification.read = true
  })
  localStorage.setItem('appNotifications', JSON.stringify(notifications))
  updateNotificationsUI()
}

// Actualizar UI de notificaciones
function updateNotificationsUI() {
  // Actualizar contador
  const unreadCount = notifications.filter(n => !n.read).length
  const badgeElement = document.querySelector(".notifications .badge")
  
  if (badgeElement) {
    if (unreadCount > 0) {
      badgeElement.textContent = unreadCount
      badgeElement.style.display = "flex"
    } else {
      badgeElement.style.display = "none"
    }
  }
  
  // Actualizar menú desplegable si está abierto
  const menu = document.querySelector(".notifications-menu")
  if (menu && menu.classList.contains("active")) {
    renderNotificationsMenu()
  }
}

// Renderizar menú de notificaciones
function renderNotificationsMenu() {
  const menu = document.querySelector(".notifications-menu")
  if (!menu) return
  
  // Crear contenido del menú
  menu.innerHTML = `
    <div class="notifications-header">
      <h3>Notificaciones</h3>
      <button class="mark-all-read">Marcar todas como leídas</button>
    </div>
  `
  
  // Contenedor para los items
  const notificationsList = document.createElement("div")
  notificationsList.className = "notifications-list"
  
  // Verificar si hay notificaciones
  if (notifications.length === 0) {
    notificationsList.innerHTML = `
      <div class="empty-notifications">
        <i class="fas fa-bell-slash"></i>
        <p>No tienes notificaciones</p>
      </div>
    `
  } else {
    // Mostrar cada notificación
    notifications.forEach(notification => {
      const item = document.createElement("div")
      item.className = `notification-item ${notification.read ? '' : 'unread'}`
      item.setAttribute("data-id", notification.id)
      
      // Calcular tiempo relativo
      const timeAgo = getTimeAgo(notification.timestamp)
      
      item.innerHTML = `
        <div class="notification-icon">
          <i class="fas ${getIconForType(notification.type)}"></i>
        </div>
        <div class="notification-content">
          <h4 class="notification-title">${notification.title}</h4>
          <p class="notification-message">${notification.message}</p>
          <span class="notification-time">${timeAgo}</span>
        </div>
      `
      
      notificationsList.appendChild(item)
    })
  }
  
  menu.appendChild(notificationsList)
  
  // Añadir event listeners
  menu.querySelector(".mark-all-read").addEventListener("click", () => {
    markAllNotificationsAsRead()
  })
  
  // Event listener para marcar como leída al hacer click
  notificationsList.querySelectorAll(".notification-item").forEach(item => {
    item.addEventListener("click", function() {
      const id = parseInt(this.getAttribute("data-id"))
      markNotificationAsRead(id)
    })
  })
}

// Obtener icono según tipo de notificación
function getIconForType(type) {
  switch (type) {
    case "success": return "fa-check-circle"
    case "error": return "fa-exclamation-circle"
    case "warning": return "fa-exclamation-triangle"
    case "sale": return "fa-shopping-cart"
    case "inventory": return "fa-boxes"
    default: return "fa-bell"
  }
}

// Obtener texto de tiempo relativo (hace X minutos, etc.)
function getTimeAgo(timestamp) {
  const now = new Date()
  const date = new Date(timestamp)
  const seconds = Math.floor((now - date) / 1000)
  
  if (seconds < 60) return "ahora mismo"
  
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`
  
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days} ${days === 1 ? 'día' : 'días'}`
  
  const months = Math.floor(days / 30)
  return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`
}

// Exportar funciones principales
export { showToast, addNotification, loadNotifications, renderNotificationsMenu, markAllNotificationsAsRead, markNotificationAsRead }

// NUEVA IMPLEMENTACIÓN SIN SUPABASE.RAW - CARGAR ALERTAS
async function loadAlerts() {
  console.log("🚀 Iniciando carga de alertas (Versión 2 - sin raw)")
  if (!initSupabase()) {
    showToast("Error de configuración de Supabase", "error")
    return
  }

  try {
    showLoading("Cargando alertas...")

    // Cargar todos los productos - MÉTODO SEGURO SIN USAR RAW
    const { data: products, error: productsError } = await supabase
      .from("productos")
      .select("*")
    
    if (productsError) {
      console.error("Error al cargar productos:", productsError)
      hideLoading()
      showToast("Error al cargar productos", "error")
      return
    }
    
    if (!products || products.length === 0) {
      console.log("No hay productos en la base de datos")
      updateAlertsUI({
        lowStockProducts: [],
        expiringProducts: []
      })
      hideLoading()
      return
    }
    
    console.log(`✅ Se encontraron ${products.length} productos en total`)
    
    // FILTRAR EN MEMORIA - no necesitamos supabase.raw
    const lowStockProducts = products.filter(product => {
      // Si el producto tiene stock_minimo definido, usamos ese valor
      if (product.stock_minimo !== null && product.stock_minimo !== undefined) {
        return product.stock <= product.stock_minimo
      }
      // Si no tiene stock_minimo, usamos un valor por defecto de 5
      return product.stock <= 5
    })
    
    console.log(`📊 Se encontraron ${lowStockProducts.length} productos con stock bajo`)
    
    // Productos próximos a vencer
    const today = new Date()
    const nextMonth = new Date(today)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    
    // Filtrar en memoria los productos que vencen pronto
    const expiringProducts = products.filter(product => {
      if (!product.fecha_vencimiento) return false
      
      const expDate = new Date(product.fecha_vencimiento)
      return expDate > today && expDate < nextMonth
    })
    
    console.log(`⏰ Se encontraron ${expiringProducts.length} productos próximos a vencer`)

    // Actualizar UI
    updateAlertsUI({
      lowStockProducts: lowStockProducts || [],
      expiringProducts: expiringProducts || []
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
                        <p>Stock mínimo: <strong>${product.stock_minimo || 5}</strong> unidades</p>
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
  console.log("⚡ Inicializando página de alertas v2 - sin supabase.raw")
  // Verificar si estamos en la página de alertas
  if (document.querySelector(".alerts-page")) {
    // Cargar alertas
    loadAlerts()
  } else {
    // Cargar contador de alertas para el header
    loadAlerts()
  }
})
