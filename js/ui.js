// Funciones de UI compartidas

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

// Inicializar elementos de UI comunes
document.addEventListener("DOMContentLoaded", () => {
  // Toggle sidebar
  const toggleBtn = document.getElementById("toggle-sidebar")
  const sidebar = document.querySelector(".sidebar")

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed")
    })
  }

  // Cerrar modales
  const closeButtons = document.querySelectorAll(".close-modal, .cancel-btn")
  closeButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const modal = this.closest(".modal")
      if (modal) {
        modal.classList.remove("active")
      }
    })
  })

  // Cerrar modal al hacer clic fuera
  document.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal")) {
      event.target.classList.remove("active")
    }
  })
})
