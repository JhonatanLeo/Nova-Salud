// Importamos desde los archivos correctos
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm"
import { SUPABASE_URL, SUPABASE_KEY, formatCurrency, generateSaleId } from "./config.js"
import { showToast, addNotification, loadNotifications } from "./notifications.js"

// Crear cliente de Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Funciones básicas (copiadas de utils.js para evitar problemas de importación)
function showLoading(message) {
  const loadingEl = document.getElementById("loading")
  if (!loadingEl) {
    const newLoading = document.createElement("div")
    newLoading.id = "loading"
    newLoading.innerHTML = `
      <div class="loading-content">
        <div class="spinner"></div>
        <p>${message || "Cargando..."}</p>
      </div>
    `
    document.body.appendChild(newLoading)
  } else {
    loadingEl.querySelector("p").textContent = message || "Cargando..."
    loadingEl.style.display = "flex"
  }
}

function hideLoading() {
  const loadingEl = document.getElementById("loading")
  if (loadingEl) {
    loadingEl.style.display = "none"
  }
}

// Función showToast ahora se importa desde notifications.js

// Nota: formatCurrency ahora se importa desde config.js

function showModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) {
    modal.classList.add("active")
  }
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) {
    modal.classList.remove("active")
  }
}

function getCurrentUser() {
  const userStr = localStorage.getItem("currentUser") || localStorage.getItem("user")
  if (userStr) {
    try {
      const user = JSON.parse(userStr)
      return user
    } catch (e) {
      console.error("Error al parsear usuario:", e)
      return null
    }
  }
  return null
}

// Nota: generateSaleId ahora se importa desde config.js

// Función para verificar la conexión de Supabase
function checkSupabase() {
  if (!supabase) {
    console.error("Error: Supabase no está inicializado correctamente")
    return false
  }
  return true
}

// Carrito de compras
let cart = []

// Lista de clientes registrados
let clients = []

// Cargar productos para el POS
async function loadPOSProducts() {
  try {
    showLoading("Cargando productos...")

    // Verificar si Supabase está disponible
    if (!supabase) {
      throw new Error("La conexión a Supabase no está disponible")
    }

    const { data, error } = await supabase
      .from("productos")
      .select("id, codigo, nombre, precio_venta, stock, categorias(nombre)")
      .gt("stock", 0) // Solo productos con stock disponible
      .order("nombre")

    if (error) {
      throw new Error("Error al cargar productos: " + error.message)
    }

    if (!data || data.length === 0) {
      console.log("No se encontraron productos con stock disponible")
      // Usar los productos estáticos como fallback
      const staticProducts = document.querySelectorAll(".product-card")
      if (staticProducts.length > 0) {
        console.log("Usando productos estáticos como fallback")
        // Los productos ya están en el HTML, solo agregamos la clase clickable
        staticProducts.forEach((card) => {
          card.classList.add("clickable")
          // Añadir eventos de click a los productos estáticos
          card.onclick = function () {
            const productData = {
              id: this.getAttribute("data-id"),
              nombre: this.querySelector("h3").textContent,
              precio_venta: Number.parseFloat(this.getAttribute("data-price")),
              stock: Number.parseInt(this.querySelector(".stock").textContent.replace("Stock: ", ""), 10),
              codigo: this.getAttribute("data-id"),
            }
            addProductToCart(productData)
          }
        })
      } else {
        showToast("No hay productos disponibles en inventario", "warning")
      }
    } else {
      // Renderizar grid de productos dinámicos
      console.log("Renderizando", data.length, "productos desde la base de datos")
      renderProductsGrid(data)
    }

    hideLoading()
    return true
  } catch (error) {
    console.error("Error al cargar productos:", error)
    hideLoading()
    showToast("Error al cargar productos: " + error.message, "error")
    return false
  }
}

// Cargar clientes desde la base de datos
async function loadClients() {
  try {
    console.log("Cargando clientes...")
    showLoading("Cargando lista de clientes...")

    // Verificar si Supabase está disponible
    if (!supabase) {
      throw new Error("La conexión a Supabase no está disponible")
    }

    // Solo pedimos id y nombre para evitar errores con otras columnas
    const { data: clientesTest, error: testError } = await supabase.from("clientes").select("id, nombre").limit(1)

    if (testError) {
      // Si hay error en esta consulta básica, la tabla puede no existir
      console.error("Error al verificar la tabla clientes:", testError)
      throw new Error("La tabla de clientes no está disponible: " + testError.message)
    }

    // Solo seleccionamos id y nombre (que sabemos que existen) para evitar errores
    const { data, error } = await supabase.from("clientes").select("id, nombre").order("nombre")

    if (error) {
      throw new Error("Error al cargar clientes: " + error.message)
    }

    // Guardar clientes en variable global
    clients = data || []
    console.log(`Se cargaron ${clients.length} clientes`)

    // Actualizar dropdown de clientes
    updateClientDropdown()

    hideLoading()
    return true
  } catch (error) {
    console.error("Error al cargar clientes:", error)
    hideLoading()
    showToast("Error al cargar clientes: " + error.message, "error")
    return false
  }
}

// Actualizar dropdown de clientes
function updateClientDropdown() {
  // Obtener los elementos del formulario de cliente
  const customerType = document.getElementById("customer-type")
  const customerName = document.getElementById("customer-name")
  const customerId = document.getElementById("customer-id")

  if (!customerType) {
    console.error("No se encontró el elemento customer-type en el DOM")
    return
  }

  console.log(`Actualizando dropdown de clientes con ${clients.length} clientes disponibles`)

  // Guardar event listener actual
  const currentOnChange = customerType.onchange

  // Limpiar opciones existentes y añadir las básicas
  customerType.innerHTML = `
    <option value="unregistered">Cliente no registrado</option>
    <option value="new">Nuevo cliente</option>
  `

  // Añadir clientes registrados si hay disponibles
  if (clients && clients.length > 0) {
    console.log(`Añadiendo ${clients.length} clientes al dropdown`)

    // Añadir opción de cliente registrado
    const registeredOption = document.createElement("option")
    registeredOption.value = "registered"
    registeredOption.textContent = "Cliente registrado"
    customerType.insertBefore(registeredOption, customerType.querySelector('option[value="new"]'))

    // Crear y añadir opciones para cada cliente
    clients.forEach((client) => {
      try {
        if (!client || !client.id || !client.nombre) {
          console.warn("Cliente con datos incompletos:", client)
          return // Saltamos este cliente
        }

        // Ya no buscamos documento porque no está disponible
        // Simplemente mostramos el nombre del cliente
        const option = document.createElement("option")
        option.value = `client-${client.id}`
        option.textContent = `${client.nombre}`
        option.setAttribute("data-client-id", client.id)
        option.setAttribute("data-client-name", client.nombre)
        option.setAttribute("data-client-document", "")
        customerType.appendChild(option)
      } catch (err) {
        console.error("Error al procesar cliente para dropdown:", err, client)
      }
    })

    console.log("Opciones añadidas al dropdown de clientes:", customerType.options.length - 2)
  } else {
    console.warn("No hay clientes disponibles para mostrar en el dropdown")
  }

  // Configurar evento change
  customerType.onchange = function () {
    const selectedValue = this.value
    console.log("Cliente seleccionado:", selectedValue)

    // Habilitar/deshabilitar campos según selección
    if (selectedValue === "unregistered") {
      // Cliente no registrado - campos opcionales
      customerName.value = ""
      customerId.value = ""
      customerName.disabled = false
      customerId.disabled = false
      customerName.placeholder = "Opcional"
      customerId.placeholder = "Opcional"
    } else if (selectedValue === "new") {
      // Nuevo cliente - campos requeridos
      customerName.value = ""
      customerId.value = ""
      customerName.disabled = false
      customerId.disabled = false
      customerName.placeholder = "Nombre del cliente (requerido)"
      customerId.placeholder = "DNI/RUC (requerido)"
    } else if (selectedValue === "registered") {
      // Cliente registrado - mostrar selector
      customerName.value = ""
      customerId.value = ""
      customerName.disabled = true
      customerId.disabled = true
      customerName.placeholder = "Seleccione un cliente registrado"
      customerId.placeholder = "Seleccione un cliente registrado"
    } else if (selectedValue.startsWith("client-")) {
      // Cliente específico seleccionado
      const option = this.options[this.selectedIndex]
      customerName.value = option.getAttribute("data-client-name") || ""
      customerId.value = option.getAttribute("data-client-document") || ""
      customerName.disabled = true
      customerId.disabled = true
    }

    // Llamar al listener anterior si existía
    if (currentOnChange) currentOnChange.call(this)
  }

  // Disparar evento change para actualizar campos
  try {
    const event = new Event("change")
    customerType.dispatchEvent(event)
  } catch (err) {
    console.error("Error al disparar evento change:", err)
  }
}

// Renderizar grid de productos
function renderProductsGrid(products) {
  const grid = document.getElementById("products-grid")
  if (!grid) {
    console.error("No se encontró el elemento products-grid")
    return
  }

  grid.innerHTML = ""

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-box-open"></i>
        <p>No hay productos disponibles</p>
      </div>
    `
    return
  }

  console.log("Renderizando", products.length, "productos")

  products.forEach((product) => {
    // Asegurarse de que todos los datos necesarios estén presentes
    if (!product || !product.id || !product.nombre) {
      console.warn("Producto con datos incompletos:", product)
      return
    }

    const card = document.createElement("div")
    card.className = "product-card clickable"
    card.setAttribute("data-id", product.id)
    card.setAttribute("data-price", product.precio_venta || 0)
    card.setAttribute("data-name", product.nombre || "")
    card.setAttribute("data-stock", product.stock || 0)
    card.setAttribute("data-code", product.codigo || "")
    card.setAttribute("data-category", product.categorias ? product.categorias.nombre : "Sin categoría")

    card.innerHTML = `
      <h3>${product.nombre}</h3>
      <p class="stock">Stock: ${product.stock}</p>
      <p class="price">${formatCurrency(product.precio_venta)}</p>
    `

    // Crear una función concreta para el evento click
    card.onclick = () => {
      console.log("Producto clickeado:", product.nombre)
      addProductToCart(product)
    }

    grid.appendChild(card)
  })
}

// Función separada para agregar al carrito (evita problemas de contexto)
function addProductToCart(product) {
  // Validar datos necesarios
  if (!product || !product.id || !product.nombre) {
    console.error("Producto inválido:", product)
    showToast("Error: Datos de producto incompletos", "error")
    return
  }

  // Verificar que el precio sea un número válido
  const precio = Number.parseFloat(product.precio_venta)
  if (isNaN(precio) || precio <= 0) {
    console.error("Precio inválido:", product.precio_venta)
    showToast("Error: Precio de producto inválido", "error")
    return
  }

  // Verificar que el stock sea un número válido
  const stock = Number.parseInt(product.stock)
  if (isNaN(stock) || stock <= 0) {
    console.error("Stock inválido:", product.stock)
    showToast("Error: No hay stock disponible", "error")
    return
  }

  // Agregar al carrito con una copia del objeto
  const productToAdd = {
    id: product.id,
    name: product.nombre,
    code: product.codigo || "",
    price: precio,
    quantity: 1,
    stock: stock,
  }

  // Verificar si ya existe en el carrito
  const existingIndex = cart.findIndex((item) => item.id === productToAdd.id)

  if (existingIndex >= 0) {
    // El producto ya está en el carrito
    if (cart[existingIndex].quantity >= stock) {
      showToast("No hay suficiente stock disponible", "error")
      return
    }
    cart[existingIndex].quantity += 1
    console.log("Cantidad incrementada para", product.nombre, "- Nueva cantidad:", cart[existingIndex].quantity)
  } else {
    // Nuevo producto
    cart.push(productToAdd)
    console.log("Producto añadido al carrito:", productToAdd)
  }

  // Actualizar la UI
  updateCartUI()

  // Mostrar notificación
  showToast(`${product.nombre} añadido al carrito`, "success")
}

// Nota: esta función estaba duplicada con addProductToCart, se ha eliminado

// Actualizar UI del carrito
function updateCartUI() {
  const cartItems = document.getElementById("cart-items")
  const cartEmpty = document.getElementById("cart-empty")
  const cartSummary = document.getElementById("cart-summary")
  const processButton = document.getElementById("process-sale")

  if (!cartItems || !cartEmpty || !cartSummary || !processButton) return

  if (cart.length === 0) {
    cartItems.style.display = "none"
    cartEmpty.style.display = "flex"
    cartSummary.style.display = "none"
    processButton.disabled = true
    return
  }

  // Mostrar items y ocultar mensaje vacío
  cartItems.style.display = "block"
  cartEmpty.style.display = "none"
  cartSummary.style.display = "block"
  processButton.disabled = false

  // Renderizar items
  cartItems.innerHTML = ""

  cart.forEach((item, index) => {
    const itemElement = document.createElement("div")
    itemElement.className = "cart-item"

    itemElement.innerHTML = `
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-price">${formatCurrency(item.price)} × ${item.quantity}</div>
      </div>
      <div class="item-quantity">
        <button class="quantity-btn decrease" data-index="${index}">-</button>
        <span class="quantity-value">${item.quantity}</span>
        <button class="quantity-btn increase" data-index="${index}">+</button>
      </div>
      <button class="remove-item" data-index="${index}">
        <i class="fas fa-trash"></i>
      </button>
    `

    cartItems.appendChild(itemElement)
  })

  // Añadir event listeners
  document.querySelectorAll(".quantity-btn.decrease").forEach((button) => {
    button.addEventListener("click", function () {
      const index = Number.parseInt(this.getAttribute("data-index"))
      decreaseQuantity(index)
    })
  })

  document.querySelectorAll(".quantity-btn.increase").forEach((button) => {
    button.addEventListener("click", function () {
      const index = Number.parseInt(this.getAttribute("data-index"))
      increaseQuantity(index)
    })
  })

  document.querySelectorAll(".remove-item").forEach((button) => {
    button.addEventListener("click", function () {
      const index = Number.parseInt(this.getAttribute("data-index"))
      removeFromCart(index)
    })
  })

  // Actualizar totales
  updateCartTotals()
}

// Aumentar cantidad
function increaseQuantity(index) {
  const item = cart[index]

  // Verificar stock disponible
  if (item.quantity >= item.stock) {
    showToast("No hay suficiente stock disponible", "error")
    return
  }

  item.quantity += 1
  updateCartUI()
}

// Disminuir cantidad
function decreaseQuantity(index) {
  const item = cart[index]

  if (item.quantity > 1) {
    item.quantity -= 1
  } else {
    removeFromCart(index)
  }

  updateCartUI()
}

// Eliminar del carrito
function removeFromCart(index) {
  cart.splice(index, 1)
  updateCartUI()
}

// Actualizar totales del carrito
function updateCartTotals() {
  const subtotalElement = document.getElementById("subtotal")
  const taxElement = document.getElementById("tax")
  const totalElement = document.getElementById("total")

  if (!subtotalElement || !taxElement || !totalElement) return

  // Calcular subtotal
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // Calcular IGV (18%)
  const tax = subtotal * 0.18

  // Calcular total
  const total = subtotal + tax

  // Actualizar elementos
  subtotalElement.textContent = formatCurrency(subtotal)
  taxElement.textContent = formatCurrency(tax)
  totalElement.textContent = formatCurrency(total)

  // Actualizar también en el modal de confirmación
  const confirmItemsCount = document.getElementById("confirm-items-count")
  const confirmTotal = document.getElementById("confirm-total")

  if (confirmItemsCount && confirmTotal) {
    const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)
    confirmItemsCount.textContent = itemsCount
    confirmTotal.textContent = formatCurrency(total)
  }
}

// Procesar venta
async function processSale() {
  if (cart.length === 0) {
    showToast("El carrito está vacío", "error")
    return
  }

  // Mostrar modal de confirmación
  showModal("sale-confirmation-modal")
}

// Confirmar venta
async function confirmSale() {
  console.log("Procesando confirmación de venta...")

  try {
    // Verificar que supabase esté disponible
    if (!supabase) {
      console.error("Error: Supabase no está disponible")
      showToast("Error de conexión con la base de datos", "error")
      return false
    }

    showLoading("Procesando venta...")

    // Verificar si hay productos en el carrito
    if (cart.length === 0) {
      hideLoading()
      showToast("No hay productos en el carrito", "error")
      return
    }

    // Obtener datos del cliente
    const customerType = document.getElementById("customer-type").value
    const customerName = document.getElementById("customer-name").value
    const customerId = document.getElementById("customer-id").value

    // Extraer ID del cliente si se seleccionó uno específico
    let clienteId = null
    if (customerType.startsWith("client-")) {
      clienteId = customerType.replace("client-", "")
      console.log("Cliente seleccionado ID:", clienteId)
    }

    // Verificación de cliente nuevo
    if (customerType === "new" && (!customerName || !customerId)) {
      hideLoading()
      showToast("Debe ingresar nombre y documento para nuevo cliente", "error")
      return
    }

    // Calcular totales
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const tax = subtotal * 0.18
    const total = subtotal + tax

    // Obtener el usuario actual
    const userData = getCurrentUser()

    // Verificar que haya un usuario autenticado
    if (!userData || !userData.id) {
      hideLoading()
      showToast("Debe iniciar sesión para procesar ventas", "error")
      // Redirigir a la página de login
      setTimeout(() => {
        window.location.href = "login.html"
      }, 2000)
      return
    }

    // Verificar que el ID de usuario sea un UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userData.id)) {
      console.error("ID de usuario inválido:", userData.id)
      hideLoading()
      showToast("Error: ID de usuario inválido. Por favor, inicie sesión nuevamente.", "error")
      // Redirigir a la página de login
      setTimeout(() => {
        window.location.href = "login.html"
      }, 2000)
      return
    }

    console.log("Usuario autenticado con ID válido:", userData.id)

    // Crear venta
    const saleId = generateSaleId()
    console.log("Generando venta con ID:", saleId)

    const ventaData = {
      numero_factura: saleId,
      cliente_id: clienteId, // Ahora asociamos el cliente correctamente
      usuario_id: userData.id,
      subtotal,
      igv: tax,
      total,
      metodo_pago: "Efectivo", // Por defecto
      estado: "Completada",
      cliente_nombre: customerName || "Cliente no registrado",
      cliente_documento: customerId || null,
      fecha: new Date().toISOString(),
    }

    console.log("Datos de venta a insertar:", ventaData)

    // Verificar la estructura de la tabla ventas para entender qué campos espera
    console.log("Verificando estructura de la tabla ventas...")
    const { data: ventasInfo, error: infoError } = await supabase.from("ventas").select("*").limit(1)

    if (infoError) {
      console.error("Error al verificar estructura de la tabla:", infoError)
    } else {
      // Mostrar las columnas disponibles
      const columnas = ventasInfo.length > 0 ? Object.keys(ventasInfo[0]) : []
      console.log("Columnas disponibles en la tabla ventas:", columnas)
    }

    // Asegurar que los datos tengan el formato correcto para Supabase
    const ventaDataLimpia = {
      numero_factura: ventaData.numero_factura,
      // Eliminamos usuario_id temporalmente para evitar la restricción de clave foránea
      // cuando no existe el usuario en la tabla relacionada
      // usuario_id: ventaData.usuario_id,
      subtotal: Number.parseFloat(ventaData.subtotal),
      igv: Number.parseFloat(ventaData.igv),
      total: Number.parseFloat(ventaData.total),
      metodo_pago: ventaData.metodo_pago,
      estado: ventaData.estado,
      fecha: new Date().toISOString(),
    }

    // Solo agregar los campos opcionales si tienen valor
    if (ventaData.cliente_id && ventaData.cliente_id !== null) {
      ventaDataLimpia.cliente_id = Number.parseInt(ventaData.cliente_id, 10)
    }

    console.log("Datos de venta procesados para enviar a Supabase:", ventaDataLimpia)

    // Crear la venta con manejo mejorado de errores
    const { data: venta, error: ventaError } = await supabase
      .from("ventas")
      .insert([ventaDataLimpia]) // Aseguramos que sea un array
      .select("*")

    if (ventaError) {
      console.error("Error al crear venta:", ventaError)
      // Mostrar un mensaje más descriptivo y útil para el usuario
      let errorMsg = "Error al crear venta: "
      if (ventaError.message.includes("column")) {
        errorMsg += "Problema con la estructura de datos. Contacte al administrador."
      } else if (ventaError.message.includes("uuid")) {
        errorMsg += "Formato de ID de usuario inválido. Inicie sesión nuevamente."
        console.error("Valor de usuario_id que causó el error:", ventaDataLimpia.usuario_id)
      } else {
        errorMsg += ventaError.message || "Error desconocido"
      }
      throw new Error(errorMsg)
    }

    // Verificar que tengamos datos de venta
    if (!venta || venta.length === 0) {
      console.error("No se obtuvieron datos de la venta creada")
      throw new Error("No se pudo crear la venta correctamente")
    }

    // Como quitamos el .single(), venta será un array, tomamos el primer elemento
    const ventaCreada = venta[0]
    console.log("Venta creada:", ventaCreada)

    // Crear detalles de venta y actualizar stock
    const cartItems = [...cart] // Hacer una copia del carrito para imprimir el ticket después

    for (const item of cartItems) {
      console.log(`Procesando item: ${item.name}, cantidad: ${item.quantity}`)

      // Crear detalle
      const detalleData = {
        venta_id: ventaCreada.id,
        producto_id: item.id,
        cantidad: item.quantity,
        precio_unitario: item.price,
        subtotal: item.price * item.quantity,
      }

      console.log("Agregando detalle de venta:", detalleData)

      const { error: detalleError } = await supabase.from("detalles_venta").insert(detalleData)

      if (detalleError) {
        console.error("Error al crear detalle:", detalleError)
        throw detalleError
      }

      // Obtener stock actual y actualizarlo
      console.log("Obteniendo producto para actualizar stock, ID:", item.id)

      const { data: producto, error: productoError } = await supabase
        .from("productos")
        .select("id, stock")
        .eq("id", item.id)
        .single()

      if (productoError) {
        console.error("Error al obtener producto:", productoError)
        throw productoError
      }

      if (!producto) {
        console.error("Producto no encontrado")
        throw new Error(`Producto con ID ${item.id} no encontrado`)
      }

      const nuevoStock = Math.max(0, producto.stock - item.quantity)
      console.log(`Actualizando stock de ${producto.stock} a ${nuevoStock}`)

      // Actualizar stock
      const { error: stockError } = await supabase.from("productos").update({ stock: nuevoStock }).eq("id", item.id)

      if (stockError) {
        console.error("Error al actualizar stock:", stockError)
        throw stockError
      }

      // Registrar movimiento de inventario - Verificamos primero si el usuario existe
      try {
        // Comprobar si el usuario_id es válido y existe en la tabla users
        const { data: userExists, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("id", userData.id)
          .single()
        
        let usuarioId = userData.id
        
        // Si hay error o no se encontró el usuario, usamos un ID de sistema predeterminado
        if (userError || !userExists) {
          console.warn("Usuario no encontrado en BD, utilizando ID de sistema")
          usuarioId = null // Omitiremos el campo usuario_id para que use el valor por defecto
        }
        
        const movimientoData = {
          producto_id: item.id,
          tipo_movimiento: "Salida",
          cantidad: item.quantity,
          motivo: "Venta",
          // Solo incluimos usuario_id si es válido
          ...(usuarioId ? { usuario_id: usuarioId } : {}),
          documento_referencia: ventaCreada.numero_factura,
          fecha: new Date().toISOString(),
        }

        console.log("Registrando movimiento de inventario:", movimientoData)

        const { error: movementError } = await supabase.from("movimientos_inventario").insert(movimientoData)

        if (movementError) {
          console.error("Error al registrar movimiento:", movementError)
          // No lanzamos error para que la venta continúe
        }
      } catch (movError) {
        console.error("Error al procesar movimiento de inventario:", movError)
        // No interrumpimos la venta por error en movimientos
      }
    }

    hideLoading()
    showToast("Venta procesada correctamente", "success")
    
    // Crear notificación de venta
    const montoFormateado = formatCurrency(ventaCreada.total)
    const clienteNombre = customerName || "Cliente no registrado"
    const titulo = `Nueva venta #${ventaCreada.numero_factura}`
    const mensaje = `Se ha completado una venta por ${montoFormateado} a ${clienteNombre}`
    addNotification(titulo, mensaje, "sale", false) // No mostrar como toast porque ya mostramos uno

    // Cerrar modal
    hideModal("sale-confirmation-modal")

    // Hacer copia de los items del carrito para el ticket
    const itemsForTicket = [...cartItems]

    // Limpiar carrito
    cart = []
    updateCartUI()

    // Actualizar grid de productos para mostrar stock actualizado
    loadPOSProducts()

    // Imprimir ticket
    console.log("Imprimiendo ticket...")
    printTicket(venta, itemsForTicket)
  } catch (error) {
    console.error("Error al procesar venta:", error)
    hideLoading()
    showToast("Error al procesar venta: " + error.message, "error")
  }
}

// Imprimir ticket
function printTicket(venta, items) {
  try {
    // Crear ventana de impresión
    const printWindow = window.open("", "_blank", "width=700,height=500")
    
    // Verificar si la ventana se abrió correctamente
    if (!printWindow) {
      throw new Error("No se pudo abrir la ventana de impresión. Por favor, permita las ventanas emergentes para este sitio.")
    }
    
    // Contenido del ticket
    printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ticket de Venta - ${venta.numero_factura}</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          margin: 0;
          padding: 20px;
          font-size: 12px;
        }
        .ticket {
          width: 300px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        .header h1 {
          font-size: 16px;
          margin: 5px 0;
        }
        .header p {
          margin: 5px 0;
        }
        .items {
          margin-bottom: 20px;
        }
        .item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        .totals {
          border-top: 1px dashed #000;
          padding-top: 10px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          border-top: 1px dashed #000;
          padding-top: 10px;
        }
        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="header">
          <h1>NOVA SALUD</h1>
          <p>Botica y Farmacia</p>
          <p>RUC: 20123456789</p>
          <p>Dirección: Av. Principal 123</p>
          <p>Teléfono: 01-234-5678</p>
          <p>Fecha: ${new Date().toLocaleString()}</p>
          <p>Ticket: ${venta.numero_factura}</p>
          <p>Cliente: ${venta.cliente_nombre}</p>
        </div>
        
        <div class="items">
          <div class="item" style="font-weight: bold;">
            <span>Producto</span>
            <span>Cant.</span>
            <span>Precio</span>
            <span>Total</span>
          </div>
          ${items
            .map(
              (item) => `
            <div class="item">
              <span>${item.name.substring(0, 20)}</span>
              <span>${item.quantity}</span>
              <span>${formatCurrency(item.price)}</span>
              <span>${formatCurrency(item.price * item.quantity)}</span>
            </div>
          `,
            )
            .join("")}
        </div>
        
        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(venta.subtotal)}</span>
          </div>
          <div class="total-row">
            <span>IGV (18%):</span>
            <span>${formatCurrency(venta.igv)}</span>
          </div>
          <div class="total-row" style="font-weight: bold;">
            <span>TOTAL:</span>
            <span>${formatCurrency(venta.total)}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>¡Gracias por su compra!</p>
          <p>Vuelva pronto</p>
        </div>
      </div>
      
      <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()">Imprimir Ticket</button>
      </div>
    </body>
    </html>
  `)

  printWindow.document.close()
  
  // Imprimir después de cargar
  printWindow.onload = function() {
    printWindow.print()
    setTimeout(() => printWindow.close(), 1000)
  }
  } catch (error) {
    console.error("Error al imprimir ticket:", error)
    showToast("Error al imprimir ticket: " + error.message, "error")
  }
}

// Modificar la función searchProducts para eliminar el espacio en blanco

// Reemplazar la función searchProducts con esta versión mejorada:
function searchProducts() {
  const searchInput = document.getElementById("product-search")

  if (!searchInput) return

  const searchTerm = searchInput.value.toLowerCase().trim()

  // Obtener todos los productos
  const productCards = document.querySelectorAll(".product-card")

  // Filtrar productos directamente en la cuadrícula
  productCards.forEach((card) => {
    const name = card.getAttribute("data-name")?.toLowerCase() || ""
    const code = card.getAttribute("data-code")?.toLowerCase() || ""
    const category = card.getAttribute("data-category")?.toLowerCase() || ""

    if (searchTerm === "" || name.includes(searchTerm) || code.includes(searchTerm) || category.includes(searchTerm)) {
      card.style.display = ""
    } else {
      card.style.display = "none"
    }
  })
}

// Añadir evento para cerrar resultados al hacer clic fuera
document.addEventListener("click", (event) => {
  const searchResults = document.getElementById("search-results")
  const searchInput = document.getElementById("product-search")

  if (searchResults && searchInput && !searchResults.contains(event.target) && event.target !== searchInput) {
    searchResults.style.display = "none"
  }
})

// Cuando el DOM esté cargado
document.addEventListener("DOMContentLoaded", async function () {
  console.log("DOM cargado, inicializando POS system...")

  // Cargar productos y clientes
  await loadPOSProducts()
  await loadClients()
  
  // Inicializar sistema de notificaciones
  loadNotifications()
  
  // Configurar funcionalidad de toggle para el menú de notificaciones
  const toggleNotifications = document.getElementById("toggle-notifications")
  if (toggleNotifications) {
    toggleNotifications.addEventListener("click", function(e) {
      e.stopPropagation()
      const menu = document.querySelector(".notifications-menu")
      if (menu) {
        menu.classList.toggle("active")
        
        // Si el menú está activo, renderizar las notificaciones
        if (menu.classList.contains("active")) {
          // Esta función viene del archivo notifications.js
          renderNotificationsMenu()
        }
      }
    })
    
    // Cerrar el menú al hacer clic fuera de él
    document.addEventListener("click", function(e) {
      const menu = document.querySelector(".notifications-menu")
      if (menu && !e.target.closest(".notifications") && menu.classList.contains("active")) {
        menu.classList.remove("active")
      }
    })
  }

  // Verificar si estamos en la página de POS
  if (document.querySelector(".pos-container")) {
    console.log("Inicializando página de POS...")

    // Verificar si hay un usuario autenticado
    const userData = getCurrentUser()
    if (!userData || !userData.id) {
      console.error("No hay usuario autenticado. Redirigiendo a login...")
      showToast("Debe iniciar sesión para acceder al punto de venta", "error")
      setTimeout(() => {
        window.location.href = "login.html"
      }, 2000)
      return
    }

    // Verificar que el ID de usuario sea un UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userData.id)) {
      console.error("ID de usuario inválido:", userData.id)
      showToast("Error: ID de usuario inválido. Por favor, inicie sesión nuevamente.", "error")
      setTimeout(() => {
        window.location.href = "login.html"
      }, 2000)
      return
    }

    console.log("Usuario autenticado con ID válido:", userData.id)

    try {
      // Verificar si Supabase está inicializado correctamente
      if (!checkSupabase()) {
        throw new Error("Error al inicializar Supabase")
      }

      console.log("Supabase inicializado correctamente con URL:", SUPABASE_URL)

      // Asegurar que los productos estáticos estén funcionando inmediatamente
      document.querySelectorAll(".product-card").forEach((card) => {
        if (!card.classList.contains("clickable")) {
          card.classList.add("clickable")

          // Añadir eventos de click a los productos estáticos iniciales
          card.onclick = function () {
            const productData = {
              id: this.getAttribute("data-id"),
              nombre: this.querySelector("h3").textContent,
              precio_venta: Number.parseFloat(this.getAttribute("data-price")),
              stock: Number.parseInt(this.querySelector(".stock").textContent.replace("Stock: ", ""), 10),
              codigo: this.getAttribute("data-id"),
            }
            addProductToCart(productData)
          }
        }
      })

      // Cargar productos - primero porque es lo más visible para el usuario
      const productsLoaded = await loadPOSProducts()

      // Cargar clientes
      const clientsLoaded = await loadClients()

      if (!clientsLoaded) {
        console.warn("No se pudieron cargar los clientes correctamente. Reintentando...")
        // Intentar una vez más después de un pequeño retraso
        setTimeout(async () => {
          await loadClients()
        }, 2000)
      }

      // Event listener para búsqueda con mejoras
      const searchInput = document.getElementById("product-search")
      if (searchInput) {
        searchInput.addEventListener("input", searchProducts)
      } else {
        console.warn("No se encontró el input de búsqueda")
      }

      // Event listener para procesar venta
      const processButton = document.getElementById("process-sale")
      if (processButton) {
        processButton.addEventListener("click", processSale)
      }

      // Event listener para confirmar venta
      const confirmButton = document.getElementById("confirm-sale-btn")
      if (confirmButton) {
        confirmButton.addEventListener("click", async () => {
          await confirmSale()
          // Cerrar el modal después de confirmar la venta
          hideModal("sale-confirmation-modal")
        })
      }

      // Event listener para cancelar venta
      const cancelButtons = document.querySelectorAll(".cancel-btn, .close-modal")
      cancelButtons.forEach((button) => {
        button.addEventListener("click", () => {
          hideModal("sale-confirmation-modal")
        })
      })

      // Mejorar selección de productos agregando clase de hover a los productos que aún no sean clickable
      document.querySelectorAll(".product-card:not(.clickable)").forEach((card) => {
        card.classList.add("clickable")

        // Añadir eventos de click a los productos
        card.onclick = function () {
          const productData = {
            id: this.getAttribute("data-id"),
            nombre: this.querySelector("h3").textContent,
            precio_venta: Number.parseFloat(this.getAttribute("data-price")),
            stock: Number.parseInt(this.querySelector(".stock").textContent.replace("Stock: ", ""), 10),
            codigo: this.getAttribute("data-id"),
          }
          addProductToCart(productData)
        }
      })

      console.log("Página de POS inicializada correctamente")
    } catch (error) {
      console.error("Error al inicializar la página de POS:", error)
      showToast("Error al inicializar la página: " + error.message, "error")
    }
  }
})
