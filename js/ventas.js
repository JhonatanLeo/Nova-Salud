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

import { 
  showToast as notificationToast, 
  addNotification, 
  loadNotifications,
  renderNotificationsMenu
} from './notifications_v2.js' // Usando versión completamente nueva sin supabase.raw

// Variables globales
let allSales = [];
let filteredSales = [];
let currentSort = { column: 'fecha', direction: 'desc' };
let currentFilter = 'all';
let searchText = '';
let dateRange = { from: null, to: null };

// Inicializar al cargar documento
document.addEventListener('DOMContentLoaded', () => {
  // No es necesario cargar XLSX, usamos CSV directamente que es más compatible
  console.log('Página de ventas cargando...');
  
  // Inicializar notificaciones
  loadNotifications();
  
  // Configurar funcionalidad de toggle para el menú de notificaciones
  const toggleNotifications = document.getElementById("toggle-notifications");
  if (toggleNotifications) {
    toggleNotifications.addEventListener("click", function(e) {
      e.stopPropagation();
      const menu = document.querySelector(".notifications-menu");
      if (menu) {
        menu.classList.toggle("active");
        
        // Si el menú está activo, renderizar las notificaciones
        if (menu.classList.contains("active")) {
          renderNotificationsMenu();
        }
      }
    });
    
    // Cerrar el menú al hacer clic fuera de él
    document.addEventListener("click", function(e) {
      const menu = document.querySelector(".notifications-menu");
      if (menu && !e.target.closest(".notifications") && menu.classList.contains("active")) {
        menu.classList.remove("active");
      }
    });
  }
  
  // Configurar el comportamiento del sidebar
  const toggleSidebarBtn = document.getElementById('toggle-sidebar');
  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('collapsed');
      document.querySelector('.main-content').classList.toggle('expanded');
    });
  }
  
  // Configurar filtros de estado
  setupFilters();
  
  // Configurar filtros de fecha
  setupDateFilters();
  
  // Configurar búsqueda
  setupSearch();
  
  // Configurar ordenamiento de tabla
  setupSorting();
  
  // Configurar modal
  setupModal();
  
  // Configurar exportación a Excel
  setupExport();
  
  // Cargar ventas
  loadSalesData();
});

// Cargar datos de ventas
async function loadSalesData() {
  try {
    // Mostrar overlay de carga
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'flex';
    }
    
    if (!supabase) {
      console.error("Error: Cliente Supabase no disponible");
      showToast("Error de conexión con la base de datos", "error");
      return;
    }
    
    console.log("Cargando datos de ventas...");
    
    // Comprobar si la tabla tiene las columnas necesarias
    const { data: columnCheck, error: columnError } = await supabase
      .from("ventas")
      .select("*")
      .limit(1);
    
    if (columnError) {
      console.error("Error al verificar estructura de tabla ventas:", columnError);
      throw new Error("Error al verificar estructura de tabla");
    }
    
    console.log("Estructura de la tabla ventas:", columnCheck && columnCheck.length > 0 ? Object.keys(columnCheck[0]) : "Sin datos");
    
    // Construir la consulta base
    let query = supabase
      .from("ventas")
      .select("*");
    
    // Aplicar filtros de fecha si existen
    if (dateRange.from) {
      query = query.gte('fecha', new Date(dateRange.from).toISOString());
    }
    
    if (dateRange.to) {
      // Ajustar fecha "hasta" para incluir todo ese día
      const endDate = new Date(dateRange.to);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('fecha', endDate.toISOString());
    }
    
    // Ordenar por fecha descendente por defecto
    query = query.order('fecha', { ascending: false });
    
    // Ejecutar consulta
    const { data: sales, error: salesError } = await query;
    
    if (salesError) {
      console.error("Error al cargar ventas:", salesError);
      throw new Error("Error al cargar ventas");
    }
    
    console.log(`Se cargaron ${sales?.length || 0} ventas`);
    
    // Guardar ventas en variable global
    allSales = sales || [];
    
    // Aplicar filtros actuales
    applyFilters();
    
    // Ocultar overlay de carga
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
    
  } catch (error) {
    console.error("Error en loadSalesData:", error);
    showToast("Error al cargar datos de ventas: " + error.message, "error");
    
    // Ocultar overlay de carga
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
    
    // Mostrar estado vacío con mensaje de error
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
      emptyState.style.display = 'flex';
      emptyState.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="color: var(--danger-color);"></i>
        <p>Error al cargar datos de ventas</p>
      `;
    }
  }
}

// Configurar filtros de estado
function setupFilters() {
  const filterButtons = document.querySelectorAll('.ventas-filters .filter-btn');
  
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Actualizar estado activo
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Guardar filtro actual
      currentFilter = button.getAttribute('data-filter');
      
      // Aplicar filtros
      applyFilters();
    });
  });
}

// Configurar filtros de fecha
function setupDateFilters() {
  const dateFrom = document.getElementById('date-from');
  const dateTo = document.getElementById('date-to');
  const applyBtn = document.getElementById('apply-date-filter');
  const resetBtn = document.getElementById('reset-date-filter');
  
  // Establecer fechas por defecto (último mes)
  const today = new Date();
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  
  dateFrom.value = formatDateForInput(monthAgo);
  dateTo.value = formatDateForInput(today);
  
  // Guardar fechas iniciales
  dateRange.from = dateFrom.value;
  dateRange.to = dateTo.value;
  
  // Botón aplicar
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      dateRange.from = dateFrom.value;
      dateRange.to = dateTo.value;
      loadSalesData(); // Recargar datos con nuevos filtros de fecha
    });
  }
  
  // Botón restablecer
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      dateFrom.value = formatDateForInput(monthAgo);
      dateTo.value = formatDateForInput(today);
      dateRange.from = dateFrom.value;
      dateRange.to = dateTo.value;
      loadSalesData(); // Recargar datos con fechas por defecto
    });
  }
}

// Formatear fecha para input date (YYYY-MM-DD)
function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Configurar búsqueda
function setupSearch() {
  const searchInput = document.getElementById('ventas-search');
  
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchText = e.target.value.toLowerCase();
      applyFilters();
    });
  }
}

// Configurar ordenamiento de tabla
function setupSorting() {
  const sortableHeaders = document.querySelectorAll('th[data-sortable]');
  
  sortableHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const column = header.getAttribute('data-sortable');
      
      // Determinar dirección de ordenamiento
      let direction = 'asc';
      if (currentSort.column === column) {
        direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      }
      
      // Actualizar estado de ordenamiento
      currentSort = { column, direction };
      
      // Actualizar clases CSS
      sortableHeaders.forEach(h => {
        h.classList.remove('sort-asc', 'sort-desc');
      });
      
      header.classList.add(`sort-${direction}`);
      
      // Aplicar ordenamiento
      applyFilters();
    });
  });
}

// Configurar funcionalidad de exportación a Excel
function setupExport() {
  const exportButton = document.getElementById('export-excel');
  if (exportButton) {
    exportButton.addEventListener('click', () => {
      exportSalesData();
    });
  }
}

// Exportar datos de ventas a CSV (más compatible que Excel)
function exportSalesData() {
  try {
    if (filteredSales.length === 0) {
      showToast('No hay datos para exportar', 'warning');
      return;
    }

    // Cabeceras para el CSV
    const headers = ['Fecha', 'Nº Factura', 'Cliente', 'Total', 'Método de Pago', 'Estado', 'Subtotal', 'IGV'];
    
    // Iniciar con las cabeceras
    let csvContent = headers.join(',') + '\n';
    
    // Agregar filas de datos
    filteredSales.forEach(sale => {
      // Formatear fecha
      const formattedDate = sale.fecha ? new Date(sale.fecha).toLocaleDateString() : '';
      
      // Determinar estado
      let estado = sale.estado || 'No especificado';
      
      // Formatear datos para CSV, escapando comas
      const row = [
        `"${formattedDate}"`,
        `"${sale.numero_factura || 'Sin número'}"`,
        `"${sale.cliente_nombre || 'Cliente no registrado'}"`,
        sale.total || 0,
        `"${sale.metodo_pago || 'No especificado'}"`,
        `"${estado}"`,
        sale.subtotal || 0,
        sale.igv || 0
      ];
      
      csvContent += row.join(',') + '\n';
    });
    
    // Crear un objeto Blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Crear un enlace para descargar
    const link = document.createElement('a');
    const fileName = 'Reporte_Ventas_' + new Date().toISOString().split('T')[0] + '.csv';
    
    // Configurar el enlace
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.style.display = 'none';
    
    // Añadir a la página, hacer clic y eliminar
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Exportación completada con éxito', 'success');
  } catch (error) {
    console.error('Error al exportar datos:', error);
    showToast('Error al exportar: ' + error.message, 'error');
  }
}

// Configurar modal
function setupModal() {
  const modal = document.getElementById('sale-details-modal');
  const closeButtons = document.querySelectorAll('.modal-close, #close-modal');
  
  // Botones de cerrar
  closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  });
  
  // Cerrar al hacer clic fuera del contenido
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
  
  // Botón imprimir en modal - Reemplazado por excel
  const printButton = document.getElementById('print-sale');
  if (printButton) {
    printButton.addEventListener('click', () => {
      exportSaleDetails();
    });
  }
}

// Aplicar filtros, búsqueda y ordenamiento
function applyFilters() {
  // Primero filtrar por estado
  if (currentFilter === 'all') {
    filteredSales = [...allSales];
  } else {
    filteredSales = allSales.filter(sale => {
      const estado = sale.estado ? sale.estado.toLowerCase() : '';
      return estado === currentFilter;
    });
  }
  
  // Luego aplicar búsqueda
  if (searchText) {
    filteredSales = filteredSales.filter(sale => {
      return (
        (sale.numero_factura && sale.numero_factura.toLowerCase().includes(searchText)) || 
        (sale.cliente_nombre && sale.cliente_nombre.toLowerCase().includes(searchText)) ||
        (sale.cliente_id && sale.cliente_id.toString().includes(searchText))
      );
    });
  }
  
  // Finalmente ordenar
  sortSales();
  
  // Actualizar UI
  updateUI();
}

// Ordenar ventas
function sortSales() {
  const { column, direction } = currentSort;
  
  filteredSales.sort((a, b) => {
    let valueA = a[column] !== undefined ? a[column] : '';
    let valueB = b[column] !== undefined ? b[column] : '';
    
    // Si ordenamos por fecha
    if (column === 'fecha') {
      valueA = new Date(valueA).getTime();
      valueB = new Date(valueB).getTime();
    }
    
    // Si ordenamos por total o precio
    else if (column === 'total' || column === 'subtotal' || column === 'igv') {
      valueA = parseFloat(valueA) || 0;
      valueB = parseFloat(valueB) || 0;
    }
    
    // Para valores de texto
    else if (typeof valueA === 'string') {
      valueA = valueA.toLowerCase();
      valueB = (valueB || '').toLowerCase();
    }
    
    if (direction === 'asc') {
      return valueA > valueB ? 1 : -1;
    } else {
      return valueA < valueB ? 1 : -1;
    }
  });
}

// Actualizar la interfaz
function updateUI() {
  // Actualizar tabla
  updateTable();
  
  // Mostrar/ocultar estado vacío
  const emptyState = document.getElementById('empty-state');
  if (emptyState) {
    emptyState.style.display = filteredSales.length === 0 ? 'flex' : 'none';
  }
}

// Actualizar tabla de ventas
function updateTable() {
  const tableBody = document.querySelector('#ventas-table tbody');
  
  if (!tableBody) return;
  
  // Limpiar tabla
  tableBody.innerHTML = '';
  
  // Generar filas
  filteredSales.forEach((sale, index) => {
    const row = document.createElement('tr');
    row.style.setProperty('--row-index', index);
    
    // Formatear fecha
    const saleDate = new Date(sale.fecha);
    const formattedDate = formatDate(saleDate);
    
    // Definir badge de estado
    let statusClass = 'completed';
    if (sale.estado) {
      const estado = sale.estado.toLowerCase();
      if (estado === 'pendiente') statusClass = 'pending';
      else if (estado === 'cancelada') statusClass = 'cancelled';
    }
    
    row.innerHTML = `
      <td>${formattedDate}</td>
      <td>${sale.numero_factura || "Sin número"}</td>
      <td>${sale.cliente_nombre || "Cliente no registrado"}</td>
      <td>${formatCurrency(sale.total || 0)}</td>
      <td>${sale.metodo_pago || "No especificado"}</td>
      <td><span class="status-badge ${statusClass}">${sale.estado || "No especificado"}</span></td>
      <td>
        <button class="view-details-btn" data-sale-id="${sale.id}" title="Ver detalles">
          <i class="fas fa-eye"></i>
        </button>
      </td>
    `;
    
    // Agregar evento al botón de detalles
    const viewBtn = row.querySelector('.view-details-btn');
    if (viewBtn) {
      viewBtn.addEventListener('click', () => {
        showSaleDetails(sale);
      });
    }
    
    tableBody.appendChild(row);
  });
}

// Mostrar detalles de venta en modal
async function showSaleDetails(sale) {
  try {
    console.log("Mostrando detalles de venta:", sale);
    
    // Abrir modal
    const modal = document.getElementById('sale-details-modal');
    if (!modal) return;
    
    // Mostrar datos básicos
    document.getElementById('sale-factura').textContent = sale.numero_factura || "Sin número";
    document.getElementById('sale-fecha').textContent = formatDate(new Date(sale.fecha));
    document.getElementById('sale-cliente').textContent = sale.cliente_nombre || "Cliente no registrado";
    
    // Estado
    let statusClass = 'completed';
    if (sale.estado) {
      const estado = sale.estado.toLowerCase();
      if (estado === 'pendiente') statusClass = 'pending';
      else if (estado === 'cancelada') statusClass = 'cancelled';
    }
    document.getElementById('sale-estado').innerHTML = `<span class="status-badge ${statusClass}">${sale.estado || "No especificado"}</span>`;
    
    // Otros datos
    document.getElementById('sale-pago').textContent = sale.metodo_pago || "No especificado";
    document.getElementById('sale-vendedor').textContent = "No disponible"; // Este dato podría buscarse si es necesario
    
    // Totales
    document.getElementById('sale-subtotal').textContent = formatCurrency(sale.subtotal || 0);
    document.getElementById('sale-igv').textContent = formatCurrency(sale.igv || 0);
    document.getElementById('sale-total').textContent = formatCurrency(sale.total || 0);
    
    // Cargar detalles de la venta
    const itemsContainer = document.getElementById('sale-items-tbody');
    if (itemsContainer) {
      // Limpiar contenido anterior
      itemsContainer.innerHTML = "";
      
      try {
        // Buscar detalles de la venta
        const { data: detalles, error: detallesError } = await supabase
          .from("detalles_venta")
          .select("*, productos(nombre)")
          .eq("venta_id", sale.id);
        
        if (detallesError) {
          console.error("Error al cargar detalles:", detallesError);
          throw new Error("Error al cargar detalles de la venta");
        }
        
        if (!detalles || detalles.length === 0) {
          // No hay detalles disponibles
          itemsContainer.innerHTML = `
            <tr>
              <td colspan="4" style="text-align: center; padding: 20px;">
                No hay detalles disponibles para esta venta
              </td>
            </tr>
          `;
        } else {
          // Mostrar cada detalle
          detalles.forEach(detalle => {
            const row = document.createElement('tr');
            
            // Nombre del producto (si está disponible)
            const productoNombre = detalle.productos?.nombre || `Producto ID: ${detalle.producto_id}`;
            
            // Calcular subtotal
            const subtotal = (detalle.precio_unitario || 0) * (detalle.cantidad || 0);
            
            row.innerHTML = `
              <td>${productoNombre}</td>
              <td>${detalle.cantidad || 0}</td>
              <td>${formatCurrency(detalle.precio_unitario || 0)}</td>
              <td>${formatCurrency(subtotal)}</td>
            `;
            
            itemsContainer.appendChild(row);
          });
        }
      } catch (detallesError) {
        console.error("Error al procesar detalles:", detallesError);
        itemsContainer.innerHTML = `
          <tr>
            <td colspan="4" style="text-align: center; padding: 20px; color: var(--danger-color);">
              <i class="fas fa-exclamation-circle"></i> Error al cargar detalles
            </td>
          </tr>
        `;
      }
    }
    
    // Mostrar modal
    modal.classList.add('active');
    
  } catch (error) {
    console.error("Error al mostrar detalles de venta:", error);
    showToast("Error al cargar detalles de la venta: " + error.message, "error");
  }
}

// Exportar detalles de venta a CSV (más compatible)
function exportSaleDetails() {
  try {
    const modal = document.getElementById('sale-details-modal');
    if (!modal) return;
    
    // Obtener los datos del modal
    
    // Datos de la venta
    const factura = document.getElementById('sale-factura').textContent;
    const fecha = document.getElementById('sale-fecha').textContent;
    const cliente = document.getElementById('sale-cliente').textContent;
    const estadoElement = document.getElementById('sale-estado');
    const estado = estadoElement.textContent.replace(/\s+/g, ' ').trim();
    const metodoPago = document.getElementById('sale-pago').textContent;
    const subtotal = document.getElementById('sale-subtotal').textContent.replace(/[^\d,.]/g, '');
    const igv = document.getElementById('sale-igv').textContent.replace(/[^\d,.]/g, '');
    const total = document.getElementById('sale-total').textContent.replace(/[^\d,.]/g, '');
    
    // Obtener detalles de productos (filas de la tabla)
    const itemRows = document.querySelectorAll('.sale-items tbody tr');
    const items = [];
    
    itemRows.forEach(row => {
      const columns = row.querySelectorAll('td');
      if (columns.length >= 4) {
        items.push({
          'Producto': columns[0].textContent.trim(),
          'Cantidad': columns[1].textContent.trim(),
          'Precio Unitario': columns[2].textContent.replace(/[^\d,.]/g, ''),
          'Subtotal': columns[3].textContent.replace(/[^\d,.]/g, '')
        });
      }
    });
    
    // Exportar a CSV
    if (items.length === 0) {
      showToast('No hay detalles para exportar', 'warning');
      return;
    }
    
    // Preparar el contenido del CSV
    let csvContent = 'DETALLES DE VENTA: ' + factura + '\n\n';
    csvContent += 'Fecha:,' + fecha + ',Cliente:,' + cliente + '\n';
    csvContent += 'Estado:,' + estado + ',Método de Pago:,' + metodoPago + '\n\n';
    
    // Añadir cabeceras de productos
    csvContent += 'Producto,Cantidad,Precio Unitario,Subtotal\n';
    
    // Añadir items
    items.forEach(item => {
      csvContent += `"${item.Producto}",${item.Cantidad},${item['Precio Unitario']},${item.Subtotal}\n`;
    });
    
    // Añadir totales
    csvContent += '\n,,,Subtotal:,' + subtotal + '\n';
    csvContent += ',,,IGV (18%):,' + igv + '\n';
    csvContent += ',,,TOTAL:,' + total + '\n';
    
    // Crear un objeto Blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Crear un enlace para descargar
    const link = document.createElement('a');
    const fileName = `Venta_${factura.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    
    // Configurar el enlace
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.style.display = 'none';
    
    // Añadir a la página, hacer clic y eliminar
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Exportación completada con éxito', 'success');

    
  } catch (error) {
    console.error("Error al imprimir detalles:", error);
    showToast("Error al imprimir: " + error.message, "error");
  }
}
