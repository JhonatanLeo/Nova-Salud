// Importar funciones y variables necesarias
import { supabase, initSupabase, showLoading, hideLoading, showToast } from "./utils.js"

// Añadir logs para debugging
console.log("Auth.js cargado correctamente")

// Verificar si el usuario está autenticado
async function checkAuth() {
  if (!initSupabase()) {
    return false
  }

  try {
    showLoading("Verificando sesión...")

    const { data, error } = await supabase.auth.getSession()

    if (error || !data.session) {
      hideLoading()
      return false
    }

    // Guardar información del usuario
    localStorage.setItem("currentUser", JSON.stringify(data.session.user))

    hideLoading()
    return true
  } catch (error) {
    console.error("Error al verificar autenticación:", error)
    hideLoading()
    return false
  }
}

// Iniciar sesión
async function login(email, password) {
  if (!initSupabase()) {
    showToast("Error de configuración de Supabase", "error")
    return false
  }

  try {
    showLoading("Iniciando sesión...")
    console.log("Intentando iniciar sesión con:", email)

    // Para fines de desarrollo y prueba, permitir inicio de sesión con cualquier credencial
    // En producción, descomentar el código de autenticación real

    // Código real de autenticación con Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      hideLoading()
      showToast(error.message, "error")
      return false
    }

    // Guardar información del usuario
    localStorage.setItem("currentUser", JSON.stringify(data.user))

    hideLoading()
    showToast("Inicio de sesión exitoso", "success")

    hideLoading()
    return true
  } catch (error) {
    console.error("Error al iniciar sesión:", error)
    hideLoading()
    showToast("Error al iniciar sesión", "error")
    return false
  }
}

// Cerrar sesión
async function logout() {
  if (!initSupabase()) {
    return false
  }

  try {
    showLoading("Cerrando sesión...")

    const { error } = await supabase.auth.signOut()

    if (error) {
      hideLoading()
      showToast(error.message, "error")
      return false
    }

    // Eliminar información del usuario
    localStorage.removeItem("currentUser")
    localStorage.removeItem("user") // También eliminar la clave alternativa

    hideLoading()

    // Redirigir a login
    window.location.href = "login.html"

    return true
  } catch (error) {
    console.error("Error al cerrar sesión:", error)
    hideLoading()
    showToast("Error al cerrar sesión", "error")
    return false
  }
}

// Modificar la función initAuth para asegurar que siempre redirija a login.html si no hay usuario autenticado
function initAuth() {
  console.log("Inicializando autenticación...")

  // Verificar si estamos en la página de login
  const currentPath = window.location.pathname
  const isLoginPage = currentPath.includes("login.html") || currentPath.endsWith("/login.html")
  console.log("¿Es página de login?", isLoginPage, "Path actual:", currentPath)

  // Verificar si hay un usuario autenticado en localStorage directamente
  const userStr = localStorage.getItem("currentUser")
  let isAuthenticated = false
  let user = null

  if (userStr) {
    try {
      user = JSON.parse(userStr)
      // Verificar que el usuario tenga un ID en formato UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      isAuthenticated = user && user.id && uuidRegex.test(user.id)

      if (!isAuthenticated && user) {
        console.warn("Usuario encontrado pero con ID inválido:", user.id)
        // Corregir el ID si no es un UUID válido
        // user.id = "00000000-0000-0000-0000-000000000000"
        // localStorage.setItem("currentUser", JSON.stringify(user))
        // isAuthenticated = true
        // console.log("ID de usuario corregido a UUID válido")
      }
    } catch (e) {
      console.error("Error al parsear usuario:", e)
    }
  }

  console.log("¿Usuario autenticado?", isAuthenticated)

  // Siempre redirigir a login si no está autenticado y no estamos en la página de login
  if (!isAuthenticated && !isLoginPage) {
    console.log("Redirigiendo a login.html")
    window.location.href = "login.html"
    return // Detener la ejecución para evitar problemas
  } else if (isAuthenticated && isLoginPage) {
    // Redirigir al dashboard si está autenticado y estamos en la página de login
    console.log("Redirigiendo a index.html")
    window.location.href = "index.html"
  }
}

// Exportar funciones
export { checkAuth, login, logout, initAuth }

// Inicializar cuando el DOM esté cargado
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM cargado, configurando auth.js...")

  // Inicializar autenticación
  initAuth()

  // Configurar el formulario de login
  const loginForm = document.getElementById("login-form")
  if (loginForm) {
    console.log("Formulario de login encontrado, configurando evento submit")
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault()

      const email = document.getElementById("email").value
      const password = document.getElementById("password").value
      console.log("Formulario enviado con email:", email)

      const success = await login(email, password)
      console.log("Resultado de login:", success)

      if (success) {
        console.log("Redirigiendo a index.html después de login exitoso")
        setTimeout(() => {
          window.location.href = "index.html"
        }, 1000) // Pequeño delay para que el usuario vea el mensaje de éxito
      }
    })
  } else {
    console.log("No se encontró el formulario de login")
  }

  // Configurar el botón de logout
  const logoutBtn = document.getElementById("logout-btn")
  if (logoutBtn) {
    console.log("Botón de logout encontrado, configurando evento click")
    logoutBtn.addEventListener("click", logout)
  }
})
