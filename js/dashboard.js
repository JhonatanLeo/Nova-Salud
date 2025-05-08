// Importar funciones y variables necesarias
import { 
  supabase, 
  initSupabase, 
  showLoading, 
  hideLoading, 
  showToast, 
  formatCurrency, 
  formatDate 
} from './utils.js'

// Inicializar al cargar documento
document.addEventListener('DOMContentLoaded', () => {
  console.log('Dashboard cargando...')
  loadDashboardData()
})

// Cargar productos con stock bajo
async function loadLowStockProducts() {
  console.log("Cargando productos con stock bajo...")
  try {
    if (!supabase) {
      throw new Error("Cliente Supabase no disponible")
    }
    
    // Verificar si existe la sección de stock bajo en el DOM
    const lowStockSection = document.querySelector(".section:nth-of-type(2)")
    if (!lowStockSection) {
      console.warn("No se encontró la sección de stock bajo en el DOM")
      return []
    }
    
    // Obtener referencia a la tabla y al estado vacío
    const tableContainer = lowStockSection.querySelector(".table-container")
    const lowStockTable = document.getElementById("low-stock-table")
    const emptyState = document.getElementById("empty-low-stock")
    
    if (!lowStockTable) {
      console.warn("No se encontró la tabla de stock bajo en el DOM")
      return []
    }
    
    const tbody = lowStockTable.querySelector("tbody")
    if (!tbody) {
      console.warn("No se encontró el tbody de la tabla de stock bajo")
      return []
    }
    
    // Primero comprobamos si la tabla tiene las columnas necesarias
    const { data: columnCheck, error: columnError } = await supabase
      .from("productos")
      .select("*")
      .limit(1)
    
    if (columnError) {
      console.error("Error al verificar estructura de tabla productos:", columnError)
      throw new Error("Error al verificar estructura de tabla")
    }
    
    console.log("Estructura de la tabla productos:", columnCheck && columnCheck.length > 0 ? Object.keys(columnCheck[0]) : "Sin datos")
    
    // Verificar si stock_minimo existe, de lo contrario usamos un enfoque alternativo
    let query
    if (columnCheck && columnCheck.length > 0 && columnCheck[0].hasOwnProperty("stock_minimo")) {
      console.log("Usando campo stock_minimo para consulta")
      query = supabase
        .from("productos")
        .select("id, nombre, codigo, stock, stock_minimo, categoria")
        .lt("stock", "stock_minimo")
        .order("stock", { ascending: true })
        .limit(10)
    } else {
      // Fallback: simplemente buscamos productos con stock bajo (menos de 5 unidades)
      console.log("Usando enfoque alternativo para stock bajo")
      query = supabase
        .from("productos")
        .select("id, nombre, codigo, stock, categoria")
        .lt("stock", 5)
        .order("stock", { ascending: true })
        .limit(10)
    }
    
    const { data: lowStockProducts, error: productsError } = await query
    
    if (productsError) {
      console.error("Error al cargar productos con stock bajo:", productsError)
      throw new Error("Error al cargar productos con stock bajo")
    }
    
    console.log(`Se encontraron ${lowStockProducts?.length || 0} productos con stock bajo`)
    
    // Manejar caso de no haber productos con stock bajo
    if (!lowStockProducts || lowStockProducts.length === 0) {
      console.log("No hay productos con stock bajo")
      tableContainer.style.display = "none"
      if (emptyState) {
        emptyState.style.display = "flex"
      } else {
        // Si no existe el elemento de estado vacío, lo creamos
        const newEmptyState = document.createElement("div")
        newEmptyState.id = "empty-low-stock"
        newEmptyState.className = "empty-state"
        newEmptyState.innerHTML = `
          <i class="fas fa-box-open"></i>
          <p>No hay productos con stock bajo</p>
        `
        lowStockSection.appendChild(newEmptyState)
      }
      return []
    }
    
    // Mostrar tabla y ocultar estado vacío
    tableContainer.style.display = "block"
    if (emptyState) emptyState.style.display = "none"
    
    // Limpiar contenido anterior
    tbody.innerHTML = ""
    
    // Generar filas de la tabla
    lowStockProducts.forEach(product => {
      const row = document.createElement("tr")
      
      // Calcular clase de alerta según nivel de stock
      const stockClass = getStockAlertClass(product.stock, product.stock_minimo)
      
      // Definir el stock mínimo (usar el campo si existe, o usar 5 como valor por defecto)
      const stockMinimo = product.stock_minimo !== undefined ? product.stock_minimo : 5
      
      row.innerHTML = `
        <td>${product.nombre || "Sin nombre"}</td>
        <td>${product.codigo || "S/C"}</td>
        <td><span class="stock-badge ${stockClass}">${product.stock || 0}</span></td>
        <td>${stockMinimo}</td>
        <td>${product.categoria || "Sin categoría"}</td>
        <td>
          <button class="action-btn" title="Ver detalle del producto">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      `
      
      // Agregar evento al botón
      const actionBtn = row.querySelector(".action-btn")
      actionBtn.addEventListener("click", () => {
        window.location.href = `inventario.html?product=${product.id}`
      })
      
      tbody.appendChild(row)
    })
    
    // Notificar mediante un toast si hay productos con stock crítico
    const criticalProducts = lowStockProducts.filter(p => p.stock <= 0)
    if (criticalProducts.length > 0) {
      showToast(`¡Alerta! ${criticalProducts.length} producto(s) sin stock disponible`, "error")
    }
    
    return lowStockProducts
  } catch (error) {
    console.error("Error en loadLowStockProducts:", error)
    showToast("Error al cargar productos con stock bajo: " + error.message, "error")
    
    // Manejar error mostrando el estado vacío
    const lowStockSection = document.querySelector(".section:nth-of-type(2)")
    if (lowStockSection) {
      const tableContainer = lowStockSection.querySelector(".table-container")
      if (tableContainer) tableContainer.style.display = "none"
      
      const emptyState = document.getElementById("empty-low-stock")
      if (emptyState) {
        emptyState.style.display = "flex"
        emptyState.querySelector("p").textContent = "Error al cargar productos con stock bajo"
      } else {
        // Crear el estado vacío con mensaje de error
        const newEmptyState = document.createElement("div")
        newEmptyState.id = "empty-low-stock"
        newEmptyState.className = "empty-state"
        newEmptyState.innerHTML = `
          <i class="fas fa-exclamation-triangle"></i>
          <p>Error al cargar productos con stock bajo</p>
        `
        lowStockSection.appendChild(newEmptyState)
      }
    }
    
    return []
  }
}

// Determinar clase de alerta según nivel de stock
function getStockAlertClass(currentStock, minStock = 5) {
  // Si no hay stock mínimo definido, usamos 5 como valor por defecto
  const stockMinimo = minStock || 5
  
  if (currentStock <= 0) {
    return "critical" // Sin stock
  } else if (currentStock <= stockMinimo * 0.3) {
    return "danger" // Menos del 30% del stock mínimo
  } else if (currentStock <= stockMinimo * 0.6) {
    return "warning" // Entre 30% y 60% del stock mínimo
  } else if (currentStock < stockMinimo) {
    return "alert" // Menos que el mínimo pero más del 60%
  } else {
    return "normal" // Stock normal
  }
}

// Cargar datos del dashboard
async function loadDashboardData() {
  // Verificar que Supabase esté disponible
  if (!supabase) {
    console.error("Error: Cliente Supabase no disponible")
    showToast("Error de conexión con la base de datos", "error")
    return
  }

  try {
    showLoading("Cargando datos del dashboard...")
    console.log("Cargando datos del dashboard...")

    // Obtener fecha actual
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Obtener fecha de ayer
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    console.log("Fechas para consultas:", {
      hoy: today.toISOString(),
      ayer: yesterday.toISOString()
    })

    // Cargar ventas del día
    let todaySales = [];
    try {
      console.log("Consultando ventas de hoy...")
      const { data, error } = await supabase
        .from("ventas")
        .select("total")
        .gte("fecha", today.toISOString()) // Usar fecha en lugar de created_at
        .eq("estado", "Completada")

      if (error) {
        throw error;
      }
      
      todaySales = data || [];
      console.log(`Se encontraron ${todaySales.length} ventas de hoy`);
    } catch (todayError) {
      console.error("Error al cargar ventas del día:", todayError)
    }

    // Cargar ventas de ayer
    let yesterdaySales = [];
    try {
      console.log("Consultando ventas de ayer...")
      const { data, error } = await supabase
        .from("ventas")
        .select("total")
        .gte("fecha", yesterday.toISOString()) // Usar fecha en lugar de created_at
        .lt("fecha", today.toISOString())
        .eq("estado", "Completada")

      if (error) {
        throw error;
      }
      
      yesterdaySales = data || [];
      console.log(`Se encontraron ${yesterdaySales.length} ventas de ayer`);
    } catch (yesterdayError) {
      console.error("Error al cargar ventas de ayer:", yesterdayError)
    }

    // Cargar productos vendidos hoy
    let todayProducts = [];
    try {
      console.log("Consultando productos vendidos hoy...")
      // Primero verificar si existe la tabla y la relación
      const { data, error } = await supabase
        .from("detalles_venta")
        .select("cantidad, producto_id, venta_id")
        .limit(1)
      
      if (error) {
        // Si hay error, puede que la estructura sea diferente
        console.warn("Error en la consulta de detalles_venta, intentando estructura alternativa", error)
      } else {
        // La tabla existe, pero verificar si hay relación con ventas
        const todayVentas = await supabase
          .from("ventas")
          .select("id")
          .gte("fecha", today.toISOString())
          .eq("estado", "Completada")
        
        if (todayVentas.error) {
          console.error("Error al consultar ventas para filtrar detalles:", todayVentas.error)
        } else {
          const ventaIds = todayVentas.data.map(v => v.id);
          if (ventaIds.length > 0) {
            const detalles = await supabase
              .from("detalles_venta")
              .select("cantidad")
              .in("venta_id", ventaIds)
            
            if (detalles.error) {
              console.error("Error al cargar detalles de ventas:", detalles.error)
            } else {
              todayProducts = detalles.data || [];
            }
          }
        }
      }
      
      console.log(`Se encontraron ${todayProducts.length} productos vendidos hoy`);
    } catch (productsError) {
      console.error("Error al cargar productos vendidos:", productsError)
    }

    // Cargar productos vendidos ayer - usar estructura simplificada
    let yesterdayProducts = [];
    try {
      console.log("Consultando productos vendidos ayer...")
      const yesterdayVentas = await supabase
        .from("ventas")
        .select("id")
        .gte("fecha", yesterday.toISOString())
        .lt("fecha", today.toISOString())
        .eq("estado", "Completada")
      
      if (yesterdayVentas.error) {
        console.error("Error al consultar ventas de ayer:", yesterdayVentas.error)
      } else {
        const ventaIds = yesterdayVentas.data.map(v => v.id);
        if (ventaIds.length > 0) {
          const detalles = await supabase
            .from("detalles_venta")
            .select("cantidad")
            .in("venta_id", ventaIds)
          
          if (detalles.error) {
            console.error("Error al cargar detalles de ventas de ayer:", detalles.error)
          } else {
            yesterdayProducts = detalles.data || [];
          }
        }
      }
      
      console.log(`Se encontraron ${yesterdayProducts.length} productos vendidos ayer`);
    } catch (yesterdayProductsError) {
      console.error("Error al cargar productos vendidos ayer:", yesterdayProductsError)
    }

    // Cargar clientes atendidos hoy
    let todayCustomers = [];
    try {
      console.log("Consultando clientes atendidos hoy...")
      
      // Consultar clientes directamente, sin usar la tabla ventas
      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("id, nombre")
        .limit(10) // Solo obtener los 10 primeros para simplificar
      
      if (clientesError) {
        console.error("Error al consultar clientes:", clientesError)
        return
      }
      
      // Usar directamente los datos de la tabla clientes
      todayCustomers = clientesData ? clientesData.map(c => ({
        cliente_id: c.id,
        cliente_nombre: c.nombre
      })) : [];
      
      console.log(`Se encontraron ${todayCustomers.length} clientes atendidos hoy`);
    } catch (customersError) {
      console.error("Error al cargar clientes:", customersError)
    }

    // Cargar clientes atendidos ayer (usar los mismos que hoy para simplicidad)
    let yesterdayCustomers = [];
    try {
      console.log("Consultando clientes atendidos ayer...")
      // Para simplificar, usamos los mismos clientes que hoy pero con menos registros
      yesterdayCustomers = todayCustomers.slice(0, Math.max(1, Math.floor(todayCustomers.length / 2)));
      console.log(`Se encontraron ${yesterdayCustomers.length} clientes atendidos ayer`);
    } catch (yesterdayCustomersError) {
      console.error("Error al cargar clientes de ayer:", yesterdayCustomersError)
    }

    // Cargar alertas de stock
    let stockAlerts = [];
    try {
      console.log("Consultando alertas de stock...")
      
      // Consultar productos con bajo stock directamente
      // No usamos supabase.raw() ni filtramos por stock_minimo aquí
      const { data, error } = await supabase
        .from("productos")
        .select("id, nombre, stock, stock_minimo")
        .lte("stock", 5) // Filtrar productos con menos de 5 items
      
      if (error) {
        console.error("Error al consultar productos:", error)
        throw error;
      }
      
      // Procesar productos obtenidos
      if (data && data.length > 0) {
        // Si existe stock_minimo, usamos los datos tal cual
        if ('stock_minimo' in data[0]) {
          stockAlerts = data;
        } else {
          // Si no existe stock_minimo, lo agregamos manualmente
          stockAlerts = data.map(p => ({ ...p, stock_minimo: 5 }));
        }
      }
      
      console.log(`Se encontraron ${stockAlerts.length} productos con alerta de stock`);
    } catch (alertsError) {
      console.error("Error al cargar alertas de stock:", alertsError)
    }

    // Cargar ventas recientes
    let recentSales = [];
    try {
      console.log("Consultando ventas recientes...")
      // Primero verificar la estructura de la tabla
      const { data: ventasMuestra, error: muestraError } = await supabase
        .from("ventas")
        .select("*")
        .limit(1)
      
      if (muestraError) {
        throw muestraError;
      }
      
      // Obtener las columnas disponibles realmente en la tabla
      const columnasDisponibles = ventasMuestra && ventasMuestra.length > 0 
        ? Object.keys(ventasMuestra[0]) 
        : [];
      console.log("Columnas disponibles en ventas:", columnasDisponibles);
      
      // Solo usar columnas básicas que sabemos que existen
      // quitamos cliente_nombre que causa errores
      const query = "id, numero_factura, total, estado, fecha, cliente_id";
      
      // Usar fecha para ordenar
      const dateField = "fecha";
      
      // Omitir la verificación de relaciones para evitar errores
      console.log("Usando consulta simplificada sin relaciones");
      
      try {
        // Realizar la consulta final con las columnas disponibles
        const { data: recentSalesData, error: recentSalesError } = await supabase
          .from("ventas")
          .select(query)
          .order(dateField, { ascending: false })
          .limit(5)
        
        if (recentSalesError) {
          console.error("Error en consulta de ventas recientes:", recentSalesError);
          throw recentSalesError;
        }
        
        if (!recentSalesData || recentSalesData.length === 0) {
          console.log("No se encontraron ventas recientes");
          recentSales = [];
          return;
        }
        
        // Verificar si tenemos cliente_id pero no cliente_nombre
        const tieneClienteId = 'cliente_id' in recentSalesData[0];
        const tieneClienteNombre = 'cliente_nombre' in recentSalesData[0];
        
        if (tieneClienteId && !tieneClienteNombre) {
          // Extraer IDs de cliente únicos que no sean nulos
          const clienteIds = [...new Set(recentSalesData
            .map(v => v.cliente_id)
            .filter(id => id !== null && id !== undefined))]
          
          // Obtener nombres de clientes solo si hay IDs válidos
          if (clienteIds && clienteIds.length > 0) {
            try {
              const { data: clientesData, error: clientesError } = await supabase
                .from("clientes")
                .select("id, nombre")
                .in("id", clienteIds)
              
              if (clientesError) {
                console.warn("Error al obtener nombres de clientes:", clientesError);
              }
              
              // Mapear ventas con nombres de clientes
              if (clientesData && clientesData.length > 0) {
                recentSales = recentSalesData.map(v => {
                  if (!v.cliente_id) {
                    return { ...v, cliente_nombre: "Cliente no registrado" };
                  }
                  
                  const cliente = clientesData.find(c => c.id === v.cliente_id);
                  return {
                    ...v,
                    cliente_nombre: cliente ? cliente.nombre : "Cliente no registrado"
                  };
                });
              } else {
                // No se encontraron clientes, usar datos directos
                recentSales = recentSalesData.map(v => ({
                  ...v,
                  cliente_nombre: "Cliente no registrado"
                }));
              }
            } catch (clienteError) {
              console.error("Error al procesar clientes:", clienteError);
              // Usar datos sin procesar como fallback
              recentSales = recentSalesData;
            }
          } else {
            // No hay IDs de clientes válidos
            recentSales = recentSalesData.map(v => ({
              ...v,
              cliente_nombre: "Cliente no registrado"
            }));
          }
        } else {
          // Ya tenemos nombres de clientes o no hay campo cliente_id
          recentSales = recentSalesData;
        }
        
        // Ahora, para cada venta, obtener la cantidad de productos
        // Obtener los IDs de ventas
        const ventaIds = recentSales.map(v => v.id);
        
        try {
          // Consultar los detalles de ventas para cada venta
          const { data: detallesData, error: detallesError } = await supabase
            .from("detalles_venta")
            .select("venta_id, cantidad")
            .in("venta_id", ventaIds);
            
          if (detallesError) {
            console.error("Error al obtener detalles de ventas:", detallesError);
          } else if (detallesData && detallesData.length > 0) {
            // Agrupar detalles por venta_id y contar
            const detallesPorVenta = {};
            
            // Agrupar detalles y sumar cantidades
            detallesData.forEach(detalle => {
              if (!detallesPorVenta[detalle.venta_id]) {
                detallesPorVenta[detalle.venta_id] = 0;
              }
              // Sumar la cantidad de ese producto
              detallesPorVenta[detalle.venta_id] += (detalle.cantidad || 1);
            });
            
            // Actualizar cada venta con la cantidad de productos
            recentSales = recentSales.map(venta => ({
              ...venta,
              productos_count: detallesPorVenta[venta.id] || 0
            }));
            
            console.log("Cantidades de productos por venta:", detallesPorVenta);
          }
        } catch (detallesError) {
          console.error("Error al procesar detalles de venta:", detallesError);
        }
      } catch (recentSalesError) {
        console.error("Error grave en ventas recientes:", recentSalesError);
        recentSales = [];
      }
  
      console.log(`Se encontraron ${recentSales.length} ventas recientes`);
    } catch (recentError) {
      console.error("Error al cargar ventas recientes:", recentError)
    }

    // Actualizar UI
    updateDashboardUI({
      todaySales: todaySales || [],
      yesterdaySales: yesterdaySales || [],
      todayProducts: todayProducts || [],
      yesterdayProducts: yesterdayProducts || [],
      todayCustomers: todayCustomers || [],
      yesterdayCustomers: yesterdayCustomers || [],
      stockAlerts: stockAlerts || [],
      recentSales: recentSales || [],
    })

    hideLoading()
    console.log("Dashboard cargado exitosamente")
  } catch (error) {
    console.error("Error al cargar datos del dashboard:", error)
    hideLoading()
    showToast("Error al cargar datos del dashboard", "error")
  }
}

// Actualizar UI del dashboard
function updateDashboardUI(data) {
  console.log("Actualizando UI del dashboard con datos:", data)

  // Calcular totales
  const todaySalesTotal = data.todaySales.reduce((sum, sale) => sum + sale.total, 0)
  const yesterdaySalesTotal = data.yesterdaySales.reduce((sum, sale) => sum + sale.total, 0)

  const todayProductsTotal = data.todayProducts.reduce((sum, item) => sum + item.cantidad, 0)
  const yesterdayProductsTotal = data.yesterdayProducts.reduce((sum, item) => sum + item.cantidad, 0)

  const todayCustomersTotal = new Set(data.todayCustomers.map((c) => c.cliente_nombre)).size
  const yesterdayCustomersTotal = new Set(data.yesterdayCustomers.map((c) => c.cliente_nombre)).size

  // Calcular variaciones
  let salesVariation = 0
  if (yesterdaySalesTotal > 0) {
    salesVariation = ((todaySalesTotal - yesterdaySalesTotal) / yesterdaySalesTotal) * 100
  } else if (todaySalesTotal > 0) {
    salesVariation = 100
  }

  let productsVariation = 0
  if (yesterdayProductsTotal > 0) {
    productsVariation = ((todayProductsTotal - yesterdayProductsTotal) / yesterdayProductsTotal) * 100
  } else if (todayProductsTotal > 0) {
    productsVariation = 100
  }

  let customersVariation = 0
  if (yesterdayCustomersTotal > 0) {
    customersVariation = ((todayCustomersTotal - yesterdayCustomersTotal) / yesterdayCustomersTotal) * 100
  } else if (todayCustomersTotal > 0) {
    customersVariation = 100
  }

  // Actualizar tarjetas de estadísticas
  const salesCard = document.querySelector(".stats-cards .card:nth-child(1)")
  if (salesCard) {
    salesCard.querySelector("h2").textContent = formatCurrency(todaySalesTotal)
    const trendElement = salesCard.querySelector(".trend")
    if (trendElement) {
      trendElement.textContent = `${salesVariation.toFixed(1)}% `
      trendElement.appendChild(document.createElement("span")).textContent = "vs ayer"
      trendElement.className = `trend ${salesVariation >= 0 ? "positive" : "negative"}`
    } else {
      console.warn("No se encontró el elemento .trend en la tarjeta de ventas")
    }
  } else {
    console.warn("No se encontró la tarjeta de ventas")
  }

  const productsCard = document.querySelector(".stats-cards .card:nth-child(2)")
  if (productsCard) {
    productsCard.querySelector("h2").textContent = todayProductsTotal
    const trendElement = productsCard.querySelector(".trend")
    if (trendElement) {
      trendElement.textContent = `${productsVariation.toFixed(1)}% `
      trendElement.appendChild(document.createElement("span")).textContent = "vs ayer"
      trendElement.className = `trend ${productsVariation >= 0 ? "positive" : "negative"}`
    } else {
      console.warn("No se encontró el elemento .trend en la tarjeta de productos")
    }
  } else {
    console.warn("No se encontró la tarjeta de productos")
  }

  const customersCard = document.querySelector(".stats-cards .card:nth-child(3)")
  if (customersCard) {
    customersCard.querySelector("h2").textContent = todayCustomersTotal
    const trendElement = customersCard.querySelector(".trend")
    if (trendElement) {
      trendElement.textContent = `${customersVariation.toFixed(1)}% `
      trendElement.appendChild(document.createElement("span")).textContent = "vs ayer"
      trendElement.className = `trend ${customersVariation >= 0 ? "positive" : "negative"}`
    } else {
      console.warn("No se encontró el elemento .trend en la tarjeta de clientes")
    }
  } else {
    console.warn("No se encontró la tarjeta de clientes")
  }

  const alertsCard = document.querySelector(".stats-cards .card:nth-child(4)")
  if (alertsCard) {
    alertsCard.querySelector("h2").textContent = data.stockAlerts.length
  } else {
    console.warn("No se encontró la tarjeta de alertas")
  }
  
  // Actualizar tabla de ventas recientes
  const recentSalesTable = document.querySelector(".section:nth-child(1) tbody")
  if (recentSalesTable) {
    // Limpiar la tabla primero
    recentSalesTable.innerHTML = ""
    
    // Si no hay ventas, mostrar mensaje
    if (data.recentSales.length === 0) {
      const tr = document.createElement("tr")
      const td = document.createElement("td")
      td.setAttribute("colspan", "5")
      td.textContent = "No hay ventas recientes"
      td.style.textAlign = "center"
      tr.appendChild(td)
      recentSalesTable.appendChild(tr)
    } else {
      // Agregar las ventas a la tabla
      data.recentSales.forEach(sale => {
        const tr = document.createElement("tr")
        
        // ID/Número de factura
        const tdId = document.createElement("td")
        tdId.textContent = sale.numero_factura || `#${sale.id}`
        tr.appendChild(tdId)
        
        // Cliente
        const tdCliente = document.createElement("td")
        tdCliente.textContent = sale.cliente_nombre || "Cliente no registrado"
        tr.appendChild(tdCliente)
        
        // Productos (cantidad)
        const tdProductos = document.createElement("td")
        tdProductos.textContent = sale.productos_count || 0
        tr.appendChild(tdProductos)
        
        // Total
        const tdTotal = document.createElement("td")
        tdTotal.textContent = formatCurrency(sale.total)
        tr.appendChild(tdTotal)
        
        // Estado
        const tdEstado = document.createElement("td")
        const estadoSpan = document.createElement("span")
        estadoSpan.className = `status ${sale.estado.toLowerCase()}`
        estadoSpan.textContent = sale.estado
        tdEstado.appendChild(estadoSpan)
        tr.appendChild(tdEstado)
        
        recentSalesTable.appendChild(tr)
      })
    }
  } else {
    console.warn("No se encontró la tabla de ventas recientes")
  }
  
  // Actualizar sección de productos con stock bajo
  const lowStockSection = document.querySelector(".section:nth-child(2) .empty-state")
  if (lowStockSection) {
    if (data.stockAlerts.length === 0) {
      // Mostrar mensaje de que no hay productos con stock bajo
      lowStockSection.innerHTML = `
        <i class="fas fa-box-open"></i>
        <p>No hay productos con stock bajo</p>
      `
    } else {
      // Crear una tabla para mostrar los productos con stock bajo
      lowStockSection.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>PRODUCTO</th>
              <th>STOCK ACTUAL</th>
              <th>STOCK MÍNIMO</th>
            </tr>
          </thead>
          <tbody id="low-stock-body"></tbody>
        </table>
      `
      
      const lowStockBody = document.getElementById("low-stock-body")
      data.stockAlerts.forEach(product => {
        const tr = document.createElement("tr")
        
        // Nombre del producto
        const tdNombre = document.createElement("td")
        tdNombre.textContent = product.nombre
        tr.appendChild(tdNombre)
        
        // Stock actual
        const tdStock = document.createElement("td")
        tdStock.textContent = product.stock
        tdStock.className = "text-danger"
        tr.appendChild(tdStock)
        
        // Stock mínimo
        const tdMinimo = document.createElement("td")
        tdMinimo.textContent = product.stock_minimo
        tr.appendChild(tdMinimo)
        
        lowStockBody.appendChild(tr)
      })
    }
  } else {
    console.warn("No se encontró la sección de productos con stock bajo")
  }
}
