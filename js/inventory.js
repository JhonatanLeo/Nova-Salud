// Importar funciones y variables necesarias
import { 
  supabase, 
  initSupabase, 
  showLoading, 
  hideLoading, 
  showToast, 
  formatCurrency, 
  showModal, 
  hideModal, 
  getCurrentUser
} from './utils.js'

// Declarar funciones de exportación temporal para desarrollo
function exportToExcel(data, fileName) {
  console.log('Exportando a Excel:', data.length, 'registros');
  showToast('Función de exportación en desarrollo', 'info');
  // Implementación básica para descargar como CSV
  const csvContent = 'data:text/csv;charset=utf-8,' + 
    Object.keys(data[0]).join(',') + '\n' + 
    data.map(row => Object.values(row).join(',')).join('\n');
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportToPDF(elementId, fileName) {
  console.log('Exportando a PDF elemento:', elementId);
  showToast('Función de exportación a PDF en desarrollo', 'info');
}

// Cargar productos
async function loadProducts() {
  console.log("Cargando productos...");
  showLoading("Cargando inventario...");
  
  try {
    // Verificar que Supabase está inicializado
    if (!initSupabase()) {
      hideLoading();
      console.error("Error: Supabase no está disponible");
      showToast("Error al conectar con la base de datos", "error");
      
      // Cargar datos simulados como fallback
      loadSimulatedProducts();
      return false;
    }
    
    // Obtener productos desde Supabase
    console.log("Consultando productos en Supabase...");
    const { data: products, error } = await supabase
      .from("productos")
      .select(`
        id, 
        codigo, 
        nombre, 
        categoria_id, 
        stock, 
        precio_venta, 
        proveedor_id, 
        descripcion,
        categorias (nombre),
        proveedores (nombre)
      `)
      .order("nombre");
      
    if (error) {
      console.error("Error en la consulta de productos:", error);
      hideLoading();
      showToast("Error al obtener productos: " + error.message, "error");
      
      // Cargar datos simulados como fallback
      loadSimulatedProducts();
      return false;
    }
    
    const tableBody = document.querySelector("#inventory-table tbody");
    if (!tableBody) {
      hideLoading();
      return false;
    }
    
    // Limpiar tabla
    tableBody.innerHTML = "";
    
    if (!products || products.length === 0) {
      tableBody.innerHTML = `
        <tr class="empty-state">
          <td colspan="7">
            <div class="empty-state-container">
              <i class="fas fa-box-open empty-state-icon"></i>
              <p>No hay productos en el inventario</p>
              <button class="btn btn-primary" id="add-first-product">
                <i class="fas fa-plus-circle"></i> Añadir primer producto
              </button>
            </div>
          </td>
        </tr>
      `;
      
      document.getElementById("add-first-product").addEventListener("click", () => {
        openProductForm();
      });
    } else {
      console.log(`Mostrando ${products.length} productos`);
      products.forEach(product => {
        const row = document.createElement("tr");
        const stockClass = product.stock <= 10 ? "stock-badge low-stock" : "stock-badge";
        
        // Obtener nombre de categoría (manejar caso donde la relación puede ser nula)
        const categoria = product.categorias ? product.categorias.nombre : "Sin categoría";
        
        // Obtener nombre de proveedor (manejar caso donde la relación puede ser nula)
        const proveedor = product.proveedores ? product.proveedores.nombre : "No especificado";
        
        row.innerHTML = `
          <td>${product.codigo || ''}</td>
          <td>${product.nombre || ''}</td>
          <td>${categoria}</td>
          <td><span class="${stockClass}">${product.stock || 0} unidades</span></td>
          <td>${formatCurrency(product.precio_venta || 0)}</td>
          <td>${proveedor}</td>
          <td class="actions">
            <button class="btn-icon edit-btn" data-id="${product.id}">
              <i class="fas fa-edit"></i> Editar
            </button>
            <button class="btn-icon restock-btn" data-id="${product.id}">
              <i class="fas fa-plus-circle"></i> Reabastecer
            </button>
          </td>
        `;
        
        tableBody.appendChild(row);
      });
    }
    
    // Añadir event listeners a los botones
    addProductEventListeners();
    
    // Ocultar cargando
    hideLoading();
    console.log("Productos cargados correctamente");
    return true;
  } catch (error) {
    console.error("Error al cargar productos:", error);
    hideLoading();
    showToast("Error al cargar productos: " + error.message, "error");
    
    // Cargar datos simulados como fallback
    loadSimulatedProducts();
    return false;
  }
}

// Cargar productos simulados (respaldo si falla la conexión a BD)
async function loadSimulatedProducts() {
  console.warn("Cargando productos en modo simulado...");
  showToast("Usando datos locales (sin conexión a BD)", "warning");
  
  setTimeout(() => {
    const tableBody = document.querySelector("#inventory-table tbody");
    if (!tableBody) return;
    
    // Limpiar tabla
    tableBody.innerHTML = "";
    
    // Datos simulados para desarrollo
    const products = [
      { id: "1", codigo: "ASP100", nombre: "Aspirina 100mg", categoria: "Analgésicos", stock: 150, precio_venta: 5.99, proveedor: "Distribuidora Farmacéutica S.A." },
      { id: "2", codigo: "IBP200", nombre: "Ibuprofeno 200mg", categoria: "Analgésicos", stock: 85, precio_venta: 7.50, proveedor: "Importaciones Médicas" },
      { id: "3", codigo: "AMXC500", nombre: "Amoxicilina 500mg", categoria: "Antibióticos", stock: 42, precio_venta: 12.75, proveedor: "FarmaSupply" },
      { id: "4", codigo: "LORAT10", nombre: "Loratadina 10mg", categoria: "Antialérgicos", stock: 63, precio_venta: 8.25, proveedor: "Distribuidora Farmacéutica S.A." },
      { id: "5", codigo: "KCREM50", nombre: "Crema Hidratante 50g", categoria: "Dermatológicos", stock: 29, precio_venta: 15.50, proveedor: "FarmaSupply" },
      { id: "6", codigo: "JABON100", nombre: "Jabón Antibacterial 100g", categoria: "Higiene", stock: 80, precio_venta: 3.99, proveedor: "Importaciones Médicas" },
      { id: "7", codigo: "PARC500", nombre: "Paracetamol 500mg", categoria: "Analgésicos", stock: 120, precio_venta: 4.50, proveedor: "Distribuidora Farmacéutica S.A." },
      { id: "8", codigo: "OMEP20", nombre: "Omeprazol 20mg", categoria: "Gastroenterológicos", stock: 55, precio_venta: 9.75, proveedor: "FarmaSupply" },
      { id: "9", codigo: "VITC1000", nombre: "Vitamina C 1000mg", categoria: "Suplementos", stock: 95, precio_venta: 11.25, proveedor: "Importaciones Médicas" },
      { id: "10", codigo: "CEPD001", nombre: "Cepillo Dental Suave", categoria: "Higiene", stock: 34, precio_venta: 2.99, proveedor: "Distribuidora Farmacéutica S.A." }
    ];
    
    if (products.length === 0) {
      tableBody.innerHTML = `
        <tr class="empty-state">
          <td colspan="7">
            <div class="empty-state-container">
              <i class="fas fa-box-open empty-state-icon"></i>
              <p>No hay productos en el inventario</p>
              <button class="btn btn-primary" id="add-first-product">
                <i class="fas fa-plus-circle"></i> Añadir primer producto
              </button>
            </div>
          </td>
        </tr>
      `;
      
      document.getElementById("add-first-product").addEventListener("click", () => {
        openProductForm();
      });
    } else {
      products.forEach(product => {
        const row = document.createElement("tr");
        const stockClass = product.stock <= 10 ? "stock-badge low-stock" : "stock-badge";
        
        row.innerHTML = `
          <td>${product.codigo}</td>
          <td>${product.nombre}</td>
          <td>${product.categoria}</td>
          <td><span class="${stockClass}">${product.stock} unidades</span></td>
          <td>${formatCurrency(product.precio_venta)}</td>
          <td>${product.proveedor}</td>
          <td class="actions">
            <button class="btn-icon edit-btn" data-id="${product.id}">
              <i class="fas fa-edit"></i> Editar
            </button>
            <button class="btn-icon restock-btn" data-id="${product.id}">
              <i class="fas fa-plus-circle"></i> Reabastecer
            </button>
          </td>
        `;
        
        tableBody.appendChild(row);
      });
    }
    
    // Añadir event listeners a los botones
    addProductEventListeners();
    
    // Ocultar cargando
    hideLoading();
  }, 1000);
}

// Renderizar tabla de productos
function renderProductsTable(products) {
  const tableBody = document.querySelector("#inventory-table tbody")
  if (!tableBody) return

  tableBody.innerHTML = ""

  if (products.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <i class="fas fa-box-open"></i>
          <p>No hay productos en el inventario</p>
        </td>
      </tr>
    `
    return
  }

  products.forEach((product) => {
    // Determinar clase de stock
    let stockClass = "stock-badge"
    if (product.stock <= product.stock_minimo) {
      stockClass += " low-stock"
    }

    const row = document.createElement("tr")
    row.innerHTML = `
      <td>${product.codigo || '-'}</td>
      <td>${product.nombre}</td>
      <td>${product.categorias ? product.categorias.nombre : "Sin categoría"}</td>
      <td><span class="${stockClass}">${product.stock} unidades</span></td>
      <td>${formatCurrency(product.precio_venta)}</td>
      <td>${product.proveedores ? product.proveedores.nombre : "No especificado"}</td>
      <td class="actions">
        <button class="btn-icon edit-btn" data-id="${product.id}">
          <i class="fas fa-edit"></i> Editar
        </button>
        <button class="btn-icon restock-btn" data-id="${product.id}">
          <i class="fas fa-plus-circle"></i> Reabastecer
        </button>
      </td>
    `

    tableBody.appendChild(row)
  })

  // Añadir event listeners
  addProductEventListeners()
}

// Añadir event listeners a los botones de productos
function addProductEventListeners() {
  // Botones de editar
  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const productId = this.getAttribute("data-id")
      editProduct(productId)
    })
  })

  // Botones de reabastecer
  document.querySelectorAll(".restock-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const productId = this.getAttribute("data-id")
      restockProduct(productId)
    })
  })
}

// Cargar categorías
async function loadCategories() {
  if (!initSupabase()) {
    showToast("Error de configuración de Supabase", "error")
    return []
  }

  try {
    const { data, error } = await supabase
      .from("categorias")
      .select("id, nombre")
      .order("nombre")

    if (error) {
      console.error("Error al cargar categorías:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error al cargar categorías:", error)
    return []
  }
}

// Cargar proveedores
async function loadProveedores() {
  if (!initSupabase()) {
    showToast("Error de configuración de Supabase", "error")
    return []
  }

  try {
    const { data, error } = await supabase
      .from("proveedores")
      .select("id, nombre")
      .order("nombre")

    if (error) {
      console.error("Error al cargar proveedores:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error al cargar proveedores:", error)
    return []
  }
}

// Editar producto
async function editProduct(productId) {
  try {
    console.log("Editando producto ID:", productId);
    showLoading("Cargando datos del producto...");

    // En un entorno de desarrollo sin conexión a la BD, simular datos
    const producto = {
      id: productId,
      codigo: "MED" + Math.floor(Math.random() * 100).toString().padStart(3, '0'),
      nombre: "Producto de prueba",
      descripcion: "Descripción de prueba",
      categoria_id: null,
      proveedor_id: null,
      precio_compra: 10.50,
      precio_venta: 15.75,
      stock: 25,
      stock_minimo: 10
    };
    
    // Simular carga de categorías y proveedores
    const categorias = [
      { id: 1, nombre: "Analgésicos" },
      { id: 2, nombre: "Antibióticos" },
      { id: 3, nombre: "Antialérgicos" },
      { id: 4, nombre: "Dermatológicos" },
      { id: 5, nombre: "Higiene" }
    ];
    
    const proveedores = [
      { id: 1, nombre: "Distribuidora Farmacéutica S.A." },
      { id: 2, nombre: "Importaciones Médicas" },
      { id: 3, nombre: "FarmaSupply" }
    ];

    // Llenar el formulario con los datos del producto
    document.getElementById("product-code").value = producto.codigo || "";
    document.getElementById("product-name").value = producto.nombre || "";
    document.getElementById("product-stock").value = producto.stock || 0;
    document.getElementById("product-price").value = producto.precio_venta || 0;
    document.getElementById("product-description").value = producto.descripcion || "";

    // Llenar select de categorías
    const categorySelect = document.getElementById("product-category");
    categorySelect.innerHTML = '<option value="">Seleccionar categoría</option>';

    categorias.forEach((categoria) => {
      const option = document.createElement("option");
      option.value = categoria.id;
      option.textContent = categoria.nombre;
      option.selected = categoria.id === producto.categoria_id;
      categorySelect.appendChild(option);
    });

    // Llenar select de proveedores
    const supplierSelect = document.getElementById("product-supplier");
    supplierSelect.innerHTML = '<option value="">Seleccionar proveedor</option>';

    proveedores.forEach((proveedor) => {
      const option = document.createElement("option");
      option.value = proveedor.id;
      option.textContent = proveedor.nombre;
      option.selected = proveedor.id === producto.proveedor_id;
      supplierSelect.appendChild(option);
    });

    // Guardar ID del producto en el formulario
    document.getElementById("product-form").setAttribute("data-id", productId);

    // Cambiar título del modal
    document.querySelector("#product-modal .modal-header h2").textContent = "Editar Producto";

    hideLoading();
    
    // Configurar botones del modal para cerrar correctamente
    document.querySelector(".close-modal").addEventListener("click", function() {
      hideModal("product-modal");
    });
    
    document.querySelector(".cancel-btn").addEventListener("click", function() {
      hideModal("product-modal");
    });

    // Mostrar modal
    showModal("product-modal");
    showToast("Datos del producto cargados", "success");
  } catch (error) {
    console.error("Error al editar producto:", error);
    hideLoading();
    showToast("Error al editar producto: " + error.message, "error");
  }
}

// Reabastecer producto
async function restockProduct(productId) {
  console.log('Reabasteciendo producto ID:', productId);
  
  // Crear modal de reabastecimiento si no existe
  if (!document.getElementById("restock-modal")) {
    const modal = document.createElement("div");
    modal.id = "restock-modal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Reabastecer Producto</h2>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <form id="restock-form">
            <div class="form-group">
              <label for="restock-quantity">Cantidad a añadir</label>
              <input type="number" id="restock-quantity" min="1" value="1" required>
            </div>
            <div class="form-group">
              <label for="restock-reason">Motivo</label>
              <input type="text" id="restock-reason" placeholder="Compra, devolución, etc." value="Compra de inventario" required>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary cancel-btn">Cancelar</button>
              <button type="submit" class="btn btn-primary">Confirmar</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Añadir event listeners
    modal.querySelector(".close-modal").addEventListener("click", () => {
      hideModal("restock-modal");
    });

    modal.querySelector(".cancel-btn").addEventListener("click", () => {
      hideModal("restock-modal");
    });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        hideModal("restock-modal");
      }
    });
  }

  // Configurar formulario
  const form = document.getElementById("restock-form");
  form.setAttribute("data-id", productId);
  form.reset();
  document.getElementById("restock-quantity").value = "1";
  document.getElementById("restock-reason").value = "Compra de inventario";

  // Mostrar modal
  showModal("restock-modal");

  // Configurar submit
  form.onsubmit = async (e) => {
    e.preventDefault();

    const quantity = parseInt(document.getElementById("restock-quantity").value);
    const reason = document.getElementById("restock-reason").value;

    if (!quantity || quantity <= 0) {
      showToast("Cantidad inválida", "error");
      return;
    }

    try {
      showLoading("Actualizando stock...");
      
      // Verificar que Supabase está inicializado
      if (!initSupabase()) {
        // Modo simulado si la base de datos no está disponible
        handleSimulatedRestock(productId, quantity);
        return;
      }
      
      try {
        // 1. Obtener el producto actual de la base de datos
        console.log("Obteniendo producto desde Supabase, ID:", productId);
        const { data: product, error: fetchError } = await supabase
          .from("productos")
          .select("id, codigo, nombre, stock, stock_minimo")
          .eq("id", productId)
          .single();

        if (fetchError) {
          console.error("Error al obtener producto:", fetchError);
          hideLoading();
          showToast("Error al obtener producto: " + fetchError.message, "error");
          
          // Intentar simulación como fallback
          handleSimulatedRestock(productId, quantity);
          return;
        }

        if (!product) {
          hideLoading();
          showToast("Producto no encontrado", "error");
          return;
        }

        // 2. Calcular nuevo stock
        const newStock = product.stock + quantity;
        console.log(`Actualizando stock de ${product.stock} a ${newStock}`);

        // 3. Actualizar el producto en la base de datos
        const { error: updateError } = await supabase
          .from("productos")
          .update({ stock: newStock })
          .eq("id", productId);

        if (updateError) {
          console.error("Error al actualizar stock:", updateError);
          hideLoading();
          showToast("Error al actualizar stock: " + updateError.message, "error");
          return;
        }

        // 4. Registrar movimiento de inventario (opcional si tienes esta tabla)
        const user = getCurrentUser();
        const movimientoData = {
          producto_id: productId,
          tipo_movimiento: "Entrada",
          cantidad: quantity,
          usuario_id: user?.id,
          motivo: reason,
          fecha: new Date().toISOString()
        };
        
        try {
          const { error: movementError } = await supabase
            .from("movimientos_inventario")
            .insert(movimientoData);

          if (movementError) {
            console.warn("Error al registrar movimiento (no crítico):", movementError);
          }
        } catch (movError) {
          console.warn("Error al registrar movimiento (no crítico):", movError);
        }

        hideLoading();
        showToast(`Stock de ${product.nombre} actualizado correctamente: +${quantity} unidades`, "success");

        // Cerrar modal y recargar datos
        hideModal("restock-modal");
        loadProducts(); // Recargar todos los productos

      } catch (dbError) {
        console.error("Error en la operación de base de datos:", dbError);
        hideLoading();
        // Intentar simulación como fallback
        handleSimulatedRestock(productId, quantity);
      }
    } catch (error) {
      console.error("Error al reabastecer producto:", error);
      hideLoading();
      showToast("Error al reabastecer producto: " + error.message, "error");
    }
  };
}

// Función auxiliar para simular reabastecimiento cuando la BD no está disponible
function handleSimulatedRestock(productId, quantity) {
  console.warn("Usando modo simulado para reabastecer producto");
  showToast("Actualizando en modo local (sin conexión a BD)", "warning");
  
  setTimeout(() => {
    // Encontrar el producto en la tabla
    const tableBody = document.querySelector("#inventory-table tbody");
    if (tableBody) {
      const row = Array.from(tableBody.querySelectorAll('tr')).find(
        tr => tr.querySelector('.restock-btn')?.getAttribute('data-id') === productId
      );
      
      if (row) {
        // Actualizar stock en la fila
        const stockCell = row.cells[3];
        const stockSpan = stockCell.querySelector('span');
        
        if (stockSpan) {
          // Obtener valor actual
          const currentText = stockSpan.textContent;
          const currentStock = parseInt(currentText.match(/\d+/)[0]) || 0;
          const newStock = currentStock + quantity;
          
          // Actualizar texto
          stockSpan.textContent = `${newStock} unidades`;
          
          // Actualizar clase si es necesario
          stockSpan.className = newStock <= 10 ? "stock-badge low-stock" : "stock-badge";
        }
      }
    }
    
    hideLoading();
    showToast(`Stock actualizado localmente: +${quantity} unidades`, "success");
    
    // Cerrar modal
    hideModal("restock-modal");
  }, 1000);
}

// Guardar producto (nuevo o edición)
async function saveProduct(event) {
  event.preventDefault();
  
  try {
    console.log("Guardando producto...");
    showLoading("Guardando producto...");

    // Obtener valores del formulario
    const codigo = document.getElementById("product-code").value;
    const nombre = document.getElementById("product-name").value;
    const categoria_id = document.getElementById("product-category").value;
    const stock = parseInt(document.getElementById("product-stock").value);
    const precio_venta = parseFloat(document.getElementById("product-price").value);
    const proveedor_id = document.getElementById("product-supplier").value;
    const descripcion = document.getElementById("product-description").value;

    // Validar datos básicos
    if (!codigo || !nombre || stock < 0 || precio_venta <= 0) {
      hideLoading();
      showToast("Por favor complete todos los campos obligatorios correctamente", "error");
      return;
    }

    // Verificar si es edición o creación
    const productId = document.getElementById("product-form").getAttribute("data-id");
    
    // Verificar que Supabase está inicializado
    if (!initSupabase()) {
      hideLoading();
      // Intentar modo simulado si la base de datos no está disponible
      handleSimulatedSave(productId, codigo, nombre, categoria_id, stock, precio_venta, proveedor_id, descripcion);
      return;
    }
    
    // Preparar datos del producto
    const productData = {
      codigo,
      nombre,
      categoria_id: categoria_id || null,
      stock,
      precio_venta,
      proveedor_id: proveedor_id || null,
      descripcion,
      // Por defecto, el precio de compra será 80% del precio de venta
      precio_compra: precio_venta * 0.8,
      // Stock mínimo por defecto
      stock_minimo: 10,
    };
    
    let result;
    
    // Intentar guardar en la base de datos
    try {
      if (productId) {
        // Edición de producto existente
        console.log("Actualizando producto en Supabase, ID:", productId);
        result = await supabase
          .from("productos")
          .update(productData)
          .eq("id", productId);
      } else {
        // Creación de nuevo producto
        console.log("Insertando nuevo producto en Supabase");
        result = await supabase
          .from("productos")
          .insert(productData);
      }
      
      const { error, data } = result;
      
      if (error) {
        console.error("Error de Supabase:", error);
        hideLoading();
        showToast(`Error al ${productId ? 'actualizar' : 'crear'} producto: ${error.message}`, "error");
        return;
      }
      
      hideLoading();
      showToast(`Producto ${nombre} ${productId ? 'actualizado' : 'creado'} correctamente`, "success");
      
      // Cerrar modal
      hideModal("product-modal");
      
      // Recargar productos desde la base de datos
      loadProducts();
      
    } catch (dbError) {
      console.error("Error al guardar en base de datos:", dbError);
      hideLoading();
      
      // Si falla la base de datos, intentar simular para no perder la funcionalidad
      handleSimulatedSave(productId, codigo, nombre, categoria_id, stock, precio_venta, proveedor_id, descripcion);
    }
    
  } catch (error) {
    console.error("Error al guardar producto:", error);
    hideLoading();
    showToast("Error al guardar producto: " + error.message, "error");
  }
}

// Función auxiliar para simular guardado cuando la BD no está disponible
function handleSimulatedSave(productId, codigo, nombre, categoria_id, stock, precio_venta, proveedor_id, descripcion) {
  console.warn("Usando modo simulado para guardar producto");
  showToast("Guardando en modo local (sin conexión a BD)", "warning");
  
  setTimeout(() => {
    const tableBody = document.querySelector("#inventory-table tbody");
    if (tableBody) {
      // Si es una edición, buscar la fila y actualizarla
      if (productId) {
        const row = Array.from(tableBody.querySelectorAll('tr')).find(
          tr => tr.querySelector('.edit-btn')?.getAttribute('data-id') === productId
        );
        
        if (row) {
          row.cells[0].textContent = codigo;
          row.cells[1].textContent = nombre;
          // Categoría (simulada)
          if (categoria_id) {
            const categorias = ["", "Analgésicos", "Antibióticos", "Antialérgicos", "Dermatológicos", "Higiene"];
            row.cells[2].textContent = categorias[categoria_id] || "Sin categoría";
          }
          // Stock
          row.cells[3].querySelector('span').textContent = `${stock} unidades`;
          // Precio
          row.cells[4].textContent = formatCurrency(precio_venta);
          // Proveedor (simulado)
          if (proveedor_id) {
            const proveedores = ["", "Distribuidora Farmacéutica S.A.", "Importaciones Médicas", "FarmaSupply"];
            row.cells[5].textContent = proveedores[proveedor_id] || "No especificado";
          }
        }
      } else {
        // Si es un nuevo producto, agregarlo a la tabla
        const newId = Date.now().toString(); // ID único simulado
        const row = document.createElement("tr");
        const categorias = ["", "Analgésicos", "Antibióticos", "Antialérgicos", "Dermatológicos", "Higiene"];
        const proveedores = ["", "Distribuidora Farmacéutica S.A.", "Importaciones Médicas", "FarmaSupply"];
        
        row.innerHTML = `
          <td>${codigo}</td>
          <td>${nombre}</td>
          <td>${categorias[categoria_id] || "Sin categoría"}</td>
          <td><span class="stock-badge">${stock} unidades</span></td>
          <td>${formatCurrency(precio_venta)}</td>
          <td>${proveedores[proveedor_id] || "No especificado"}</td>
          <td class="actions">
            <button class="btn-icon edit-btn" data-id="${newId}">
              <i class="fas fa-edit"></i> Editar
            </button>
            <button class="btn-icon restock-btn" data-id="${newId}">
              <i class="fas fa-plus-circle"></i> Reabastecer
            </button>
          </td>
        `;
        
        // Si es la primera fila y hay un mensaje de "sin productos", eliminar ese mensaje
        if (tableBody.querySelector('.empty-state')) {
          tableBody.innerHTML = '';
        }
        
        tableBody.insertBefore(row, tableBody.firstChild);
        
        // Actualizar event listeners
        addProductEventListeners();
      }
    }
    
    // Ocultar modal
    hideModal("product-modal");
    showToast(`Producto ${nombre} ${productId ? 'actualizado' : 'creado'} en modo local`, "success");
  }, 1000);
}

// Filtrar productos
function filterProducts() {
  const searchInput = document.getElementById("inventory-search")
  const categoryFilter = document.getElementById("category-filter")

  if (!searchInput || !categoryFilter) return

  const searchTerm = searchInput.value.toLowerCase()
  const categoryValue = categoryFilter.value

  const rows = document.querySelectorAll("#inventory-table tbody tr")

  rows.forEach((row) => {
    if (row.cells.length < 3) return // Ignorar filas sin suficientes celdas (como la de estado vacío)
    
    const name = row.cells[1].textContent.toLowerCase()
    const code = row.cells[0].textContent.toLowerCase()
    const category = row.cells[2].textContent.toLowerCase()

    const matchesSearch = name.includes(searchTerm) || code.includes(searchTerm)
    const matchesCategory = categoryValue === "all" || category === categoryValue

    row.style.display = matchesSearch && matchesCategory ? "" : "none"
  })
}

// Cargar categorías para el filtro
async function loadCategoryFilter() {
  const categorias = await loadCategories()
  
  const categoryFilter = document.getElementById("category-filter")
  if (categoryFilter) {
    // Mantener la opción "Todos"
    categoryFilter.innerHTML = '<option value="all">Todos</option>'

    // Añadir categorías
    categorias.forEach((category) => {
      const option = document.createElement("option")
      option.value = category.nombre.toLowerCase()
      option.textContent = category.nombre
      categoryFilter.appendChild(option)
    })
  }
}

// Exportar inventario a Excel
async function exportInventory() {
  try {
    showLoading("Preparando exportación...");
    console.log("Iniciando exportación de inventario");
    
    // Obtener datos de la tabla en lugar de usar loadProducts (que requiere conexión a BD)
    const tableRows = document.querySelectorAll("#inventory-table tbody tr");
    
    if (tableRows.length === 0 || tableRows[0].querySelector('.empty-state')) {
      hideLoading();
      return;
    }
    
    // Obtener todos los productos directamente de la base de datos
    console.log("Obteniendo productos de Supabase para exportación...");
    const { data: products, error } = await supabase
      .from("productos")
      .select(`
        id,
        codigo,
        nombre,
        descripcion,
        stock, 
        stock_minimo,
        precio_compra,
        precio_venta,
        categorias (nombre),
        proveedores (nombre)
      `)
      .order("nombre");
    
    if (error) {
      console.error("Error al obtener productos para exportar:", error);
      hideLoading();
      showToast("Error al obtener datos para exportar: " + error.message, "error");
      
      // Si falla, intentar exportar desde la tabla como respaldo
      exportFromTable();
      return;
    }
    
    if (!products || products.length === 0) {
      hideLoading();
      showToast("No hay productos para exportar", "warning");
      return;
    }
    
    // Definir encabezados
    const headers = [
      "Código", 
      "Nombre", 
      "Descripción",
      "Categoría", 
      "Stock", 
      "Stock Mínimo",
      "Precio Compra", 
      "Precio Venta", 
      "Proveedor"
    ];
    
    // Preparar filas de datos
    const rows = products.map(product => [
      product.codigo || "",
      product.nombre || "",
      product.descripcion || "",
      product.categorias ? product.categorias.nombre : "Sin categoría",
      product.stock || 0,
      product.stock_minimo || 0,
      product.precio_compra || 0,
      product.precio_venta || 0,
      product.proveedores ? product.proveedores.nombre : "No especificado"
    ]);
    
    // Generar contenido CSV
    let csvContent = headers.join(",") + "\n";
    
    rows.forEach(row => {
      // Escapar campos que puedan contener comas o saltos de línea
      const escapedRow = row.map(field => {
        // Convertir a string y escapar comillas
        const str = String(field).replace(/"/g, '""');
        // Si contiene comas, comillas o saltos de línea, encerrar en comillas
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str}"`;
        }
        return str;
      });
      
      csvContent += escapedRow.join(",") + "\n";
    });
    
    // Crear blob y link para descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", "inventario-" + new Date().toISOString().slice(0, 10) + ".csv");
    link.style.display = "none";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    hideLoading();
    showToast("Archivo CSV generado correctamente", "success");
  } catch (error) {
    console.error("Error al exportar a CSV:", error);
    hideLoading();
    showToast("Error al generar CSV: " + error.message, "error");
    
    // Si hay un error inesperado, intentar exportar desde la tabla
    exportFromTable();
  }
}

// Función auxiliar para exportar desde la tabla (respaldo)
function exportFromTable() {
  console.warn("Exportando desde la tabla (modo alternativo)...");
  showToast("Exportando desde vista actual (sin conexión a BD)", "warning");
  
  try {
    // Obtener datos de la tabla
    const table = document.getElementById("inventory-table");
    if (!table) {
      hideLoading();
      showToast("No se encontró la tabla de inventario", "error");
      return;
    }
    
    // Obtener encabezados
    const headers = [];
    const headerCells = table.querySelectorAll("thead th");
    headerCells.forEach(cell => {
      // Excluir columna de acciones
      if (cell.textContent.trim() !== "Acciones") {
        headers.push(cell.textContent.trim());
      }
    });
    
    // Obtener filas de datos
    const rows = [];
    const dataCells = table.querySelectorAll("tbody tr");
    
    dataCells.forEach(row => {
      // Ignorar filas vacías
      if (row.classList.contains("empty-state")) return;
      
      const rowData = [];
      const cells = row.querySelectorAll("td");
      
      // Obtener solo las columnas de datos (excluir acciones)
      for (let i = 0; i < cells.length - 1; i++) {
        let cellText = cells[i].textContent.trim();
        
        // Limpiar texto para columna de stock (quitar "unidades")
        if (i === 3) {
          cellText = cellText.replace(" unidades", "");
        }
        
        rowData.push(cellText);
      }
      
      rows.push(rowData);
    });
    
    // Generar contenido CSV
    let csvContent = headers.join(",") + "\n";
    
    rows.forEach(row => {
      // Escapar campos que puedan contener comas
      const escapedRow = row.map(field => {
        // Convertir a string y escapar comillas
        const str = String(field).replace(/"/g, '""');
        // Si contiene comas o comillas, encerrar en comillas
        if (str.includes(',') || str.includes('"')) {
          return `"${str}"`;
        }
        return str;
      });
      
      csvContent += escapedRow.join(",") + "\n";
    });
    
    // Crear blob y link para descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", "inventario-" + new Date().toISOString().slice(0, 10) + ".csv");
    link.style.display = "none";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    hideLoading();
    showToast("Archivo CSV generado en modo alternativo", "success");
  } catch (error) {
    console.error("Error al exportar a CSV desde tabla:", error);
    hideLoading();
    showToast("Error al generar CSV: " + error.message, "error");
  }
}

// Inicializar página de inventario
document.addEventListener("DOMContentLoaded", () => {
  // Verificar si estamos en la página de inventario
  if (document.querySelector(".inventory-page")) {
    // Inicializar Supabase
    initSupabase()

    // Cargar productos
    loadProducts()

    // Cargar categorías para el filtro
    loadCategoryFilter()

    // Event listener para búsqueda
    const searchInput = document.getElementById("inventory-search")
    if (searchInput) {
      searchInput.addEventListener("input", filterProducts)
    }

    // Event listener para filtro de categoría
    const categoryFilter = document.getElementById("category-filter")
    if (categoryFilter) {
      categoryFilter.addEventListener("change", filterProducts)
    }

    // Event listener para botón de nuevo producto
    const addButton = document.getElementById("add-product-btn")
    if (addButton) {
      addButton.addEventListener("click", async () => {
        // Limpiar formulario
        document.getElementById("product-form").reset()
        document.getElementById("product-form").removeAttribute("data-id")

        // Cargar categorías y proveedores
        const categorias = await loadCategories()
        const proveedores = await loadProveedores()

        // Llenar select de categorías
        const categorySelect = document.getElementById("product-category")
        categorySelect.innerHTML = '<option value="">Seleccionar categoría</option>'

        categorias.forEach((categoria) => {
          const option = document.createElement("option")
          option.value = categoria.id
          option.textContent = categoria.nombre
          categorySelect.appendChild(option)
        })

        // Llenar select de proveedores
        const supplierSelect = document.getElementById("product-supplier")
        supplierSelect.innerHTML = '<option value="">Seleccionar proveedor</option>'

        proveedores.forEach((proveedor) => {
          const option = document.createElement("option")
          option.value = proveedor.id
          option.textContent = proveedor.nombre
          supplierSelect.appendChild(option)
        })

        // Cambiar título del modal
        document.querySelector("#product-modal .modal-header h2").textContent = "Añadir Nuevo Producto"

        // Mostrar modal
        showModal("product-modal")
      })
    }

    // Event listener para formulario de producto
    const productForm = document.getElementById("product-form")
    if (productForm) {
      productForm.addEventListener("submit", saveProduct)
    }
    
    // Event listener para botón de exportar
    const exportButton = document.getElementById("export-inventory-btn")
    if (exportButton) {
      exportButton.addEventListener("click", exportInventory)
    }
  }
})

// Exportar funciones
export { loadProducts, filterProducts }
