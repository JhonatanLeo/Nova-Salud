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
} from './notifications_fixed.js' // Usando versión corregida sin supabase.raw


// Variables globales
let allProducts = [];
let filteredProducts = [];
let currentSort = { column: 'stock', direction: 'asc' };
let currentFilter = 'all';
let searchText = '';

// Inicializar al cargar documento
document.addEventListener('DOMContentLoaded', () => {
  // No necesitamos cargar XLSX, usaremos un enfoque CSV más simple para la exportación
  console.log('Página de stock cargando...');
  
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
  
  // Configurar filtros de stock
  setupFilters();
  
  // Configurar búsqueda
  setupSearch();
  
  // Configurar ordenamiento de tabla
  setupSorting();
  
  // Configurar exportación a Excel
  setupExport();
  
  // Cargar productos
  loadStockData();
});

// Cargar datos de stock
async function loadStockData() {
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
    
    console.log("Cargando datos de productos...");
    
    // Comprobar si la tabla tiene las columnas necesarias
    const { data: columnCheck, error: columnError } = await supabase
      .from("productos")
      .select("*")
      .limit(1);
    
    if (columnError) {
      console.error("Error al verificar estructura de tabla productos:", columnError);
      throw new Error("Error al verificar estructura de tabla");
    }
    
    console.log("Estructura de la tabla productos:", columnCheck && columnCheck.length > 0 ? Object.keys(columnCheck[0]) : "Sin datos");
    
    // Obtener todos los productos
    const { data: products, error: productsError } = await supabase
      .from("productos")
      .select("*")
      .order('stock', { ascending: true });
    
    if (productsError) {
      console.error("Error al cargar productos:", productsError);
      throw new Error("Error al cargar productos");
    }
    
    console.log(`Se cargaron ${products?.length || 0} productos`);
    
    // Guardar productos en variable global
    allProducts = products || [];
    
    // Aplicar filtro actual
    applyFilters();
    
    // Ocultar overlay de carga
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
    
    // Mostrar notificación si hay productos con stock crítico
    const criticalProducts = allProducts.filter(p => p.stock <= 0);
    if (criticalProducts.length > 0) {
      showToast(`¡Alerta! ${criticalProducts.length} producto(s) sin stock disponible`, "error");
    }
    
  } catch (error) {
    console.error("Error en loadStockData:", error);
    showToast("Error al cargar datos de stock: " + error.message, "error");
    
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
        <p>Error al cargar datos de stock</p>
      `;
    }
  }
}

// Configurar filtros
function setupFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  
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

// Configurar búsqueda
function setupSearch() {
  const searchInput = document.getElementById('stock-search');
  
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

// Aplicar filtros, búsqueda y ordenamiento
function applyFilters() {
  // Primero filtrar por nivel de stock
  if (currentFilter === 'all') {
    filteredProducts = [...allProducts];
  } else {
    filteredProducts = allProducts.filter(product => {
      const stockClass = getStockAlertClass(product.stock, product.stock_minimo);
      return stockClass === currentFilter;
    });
  }
  
  // Luego aplicar búsqueda
  if (searchText) {
    filteredProducts = filteredProducts.filter(product => {
      return (
        (product.nombre && product.nombre.toLowerCase().includes(searchText)) || 
        (product.codigo && product.codigo.toLowerCase().includes(searchText)) ||
        (product.categoria && product.categoria.toLowerCase().includes(searchText))
      );
    });
  }
  
  // Finalmente ordenar
  sortProducts();
  
  // Actualizar UI
  updateUI();
}

// Ordenar productos
function sortProducts() {
  const { column, direction } = currentSort;
  
  filteredProducts.sort((a, b) => {
    let valueA = a[column] !== undefined ? a[column] : '';
    let valueB = b[column] !== undefined ? b[column] : '';
    
    // Si ordenamos por nombre o texto
    if (typeof valueA === 'string') {
      valueA = valueA.toLowerCase();
      valueB = valueB.toLowerCase();
    }
    
    // Para valores numéricos o fechas, convertir a número
    if (column === 'stock' || column === 'stock_minimo' || column === 'precio_venta') {
      valueA = parseFloat(valueA) || 0;
      valueB = parseFloat(valueB) || 0;
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
  // Actualizar contadores en los filtros
  updateFilterCounts();
  
  // Actualizar tabla
  updateTable();
  
  // Mostrar/ocultar estado vacío
  const emptyState = document.getElementById('empty-state');
  if (emptyState) {
    emptyState.style.display = filteredProducts.length === 0 ? 'flex' : 'none';
  }
}

// Actualizar contadores en los filtros
function updateFilterCounts() {
  // Contar productos por categoría de alerta
  const counts = {
    all: allProducts.length,
    critical: 0,
    danger: 0,
    warning: 0,
    alert: 0
  };
  
  allProducts.forEach(product => {
    const stockClass = getStockAlertClass(product.stock, product.stock_minimo);
    if (counts[stockClass] !== undefined) {
      counts[stockClass]++;
    }
  });
  
  // Actualizar badges
  document.querySelectorAll('.filter-btn').forEach(button => {
    const filter = button.getAttribute('data-filter');
    const badge = button.querySelector('.filter-badge');
    
    if (badge && counts[filter] !== undefined) {
      badge.textContent = counts[filter];
    }
  });
}

// Configurar funcionalidad de exportación a Excel
function setupExport() {
  const exportButton = document.getElementById('export-excel');
  if (exportButton) {
    exportButton.addEventListener('click', () => {
      exportStockData();
    });
  }
}

// Exportar datos de stock a CSV (más compatible que Excel)
function exportStockData() {
  try {
    if (filteredProducts.length === 0) {
      showToast('No hay datos para exportar', 'warning');
      return;
    }

    // Cabeceras para el CSV
    const headers = ['Código', 'Producto', 'Categoría', 'Stock Actual', 'Stock Mínimo', 'Nivel', 'Ubicación', 'Precio Venta'];
    
    // Iniciar con las cabeceras
    let csvContent = headers.join(',') + '\n';
    
    // Agregar filas de datos
    filteredProducts.forEach(product => {
      // Determinar nivel de stock
      let stockLevel = 'Normal';
      if (product.stock === 0) stockLevel = 'Sin Stock';
      else if (product.stock_minimo && product.stock <= product.stock_minimo * 0.5) stockLevel = 'Crítico';
      else if (product.stock_minimo && product.stock <= product.stock_minimo) stockLevel = 'Bajo';
      else if (product.stock_minimo && product.stock <= product.stock_minimo * 1.5) stockLevel = 'Alerta';
      
      // Formatear datos para CSV, escapando comas
      const row = [
        `"${product.codigo || ''}"`,
        `"${product.nombre}"`,
        `"${product.categoria || 'Sin categoría'}"`,
        product.stock || 0,
        product.stock_minimo || '-',
        `"${stockLevel}"`,
        `"${product.ubicacion || 'No especificada'}"`,
        product.precio_venta || 0
      ];
      
      csvContent += row.join(',') + '\n';
    });
    
    // Crear un objeto Blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Crear un enlace para descargar
    const link = document.createElement('a');
    const fileName = 'Reporte_Stock_' + new Date().toISOString().split('T')[0] + '.csv';
    
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

// Actualizar tabla de productos
function updateTable() {
  const tableBody = document.querySelector('#stock-table tbody');
  
  if (!tableBody) return;
  
  // Limpiar tabla
  tableBody.innerHTML = '';
  
  // Generar filas
  filteredProducts.forEach((product, index) => {
    const row = document.createElement('tr');
    row.style.setProperty('--row-index', index);
    
    // Calcular clase de alerta según nivel de stock
    const stockClass = getStockAlertClass(product.stock, product.stock_minimo);
    
    // Definir el stock mínimo (usar el campo si existe, o usar 5 como valor por defecto)
    const stockMinimo = product.stock_minimo !== undefined ? product.stock_minimo : 5;
    
    // Formatear fecha de último movimiento
    const lastUpdate = product.ultima_actualizacion ? formatDate(new Date(product.ultima_actualizacion)) : 'No disponible';
    
    row.innerHTML = `
      <td>
        <div class="product-name">${product.nombre || "Sin nombre"}</div>
      </td>
      <td>${product.codigo || "S/C"}</td>
      <td><span class="stock-badge ${stockClass}">${product.stock || 0}</span></td>
      <td>${stockMinimo}</td>
      <td><span class="category-badge">${product.categoria || "Sin categoría"}</span></td>
      <td>${lastUpdate}</td>
      <td>
        <div class="action-buttons">
          <button class="action-btn view-btn" title="Ver detalle">
            <i class="fas fa-eye"></i>
          </button>
          <button class="action-btn edit-btn" title="Editar stock">
            <i class="fas fa-edit"></i>
          </button>
        </div>
      </td>
    `;
    
    // Agregar eventos a los botones
    const viewBtn = row.querySelector('.view-btn');
    if (viewBtn) {
      viewBtn.addEventListener('click', () => {
        window.location.href = `inventario.html?product=${product.id}`;
      });
    }
    
    const editBtn = row.querySelector('.edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        // Aquí iría la lógica para editar el stock (modal o redirección)
        showEditStockModal(product);
      });
    }
    
    tableBody.appendChild(row);
  });
}

// Mostrar modal para editar stock (función placeholder)
function showEditStockModal(product) {
  // Esta función sería implementada en una versión completa
  // Por ahora solo mostraremos un toast
  showToast(`Editar stock de ${product.nombre || 'producto'} (Función en desarrollo)`, "info");
}

// Determinar clase de alerta según nivel de stock
function getStockAlertClass(currentStock, minStock) {
  // Si no hay stock mínimo definido, usamos 5 como valor por defecto
  const stockMinimo = minStock !== undefined ? minStock : 5;
  
  if (currentStock <= 0) {
    return "critical"; // Sin stock
  } else if (currentStock <= stockMinimo * 0.3) {
    return "danger"; // Menos del 30% del stock mínimo
  } else if (currentStock <= stockMinimo * 0.6) {
    return "warning"; // Entre 30% y 60% del stock mínimo
  } else if (currentStock < stockMinimo) {
    return "alert"; // Menos que el mínimo pero más del 60%
  } else {
    return "normal"; // Stock normal
  }
}
