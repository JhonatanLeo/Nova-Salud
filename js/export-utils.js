// Utilidades para exportar datos a Excel

/**
 * Exporta datos a un archivo Excel
 * @param {Array} data - Array de objetos con los datos
 * @param {String} fileName - Nombre del archivo
 * @param {Array} headers - Cabeceras para la tabla (opcional)
 */
export function exportToExcel(data, fileName, headers = null) {
  if (!data || data.length === 0) {
    showToast("No hay datos para exportar", "warning");
    return;
  }

  try {
    // Si no se proporcionan cabeceras, usar las claves del primer objeto
    if (!headers) {
      headers = Object.keys(data[0]);
    }

    // Crear un libro de trabajo
    const workbook = XLSX.utils.book_new();
    
    // Preparar datos para la hoja
    const worksheetData = [
      headers, // Primera fila con cabeceras
      ...data.map(item => headers.map(header => {
        // Obtener el valor, manejar nulos y undefined
        const value = item[header];
        if (value === null || value === undefined) return "";
        
        // Si es fecha, formatearla
        if (header.toLowerCase().includes('fecha') && value) {
          try {
            const date = new Date(value);
            if (!isNaN(date)) {
              return date.toLocaleDateString('es-ES');
            }
          } catch (e) {
            // Si hay error al formatear, devolver el valor original
          }
        }
        
        return value;
      }))
    ];
    
    // Crear hoja de trabajo
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Añadir la hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
    
    // Guardar archivo
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
    
    showToast("Exportación completada", "success");
  } catch (error) {
    console.error("Error al exportar a Excel:", error);
    showToast("Error al exportar: " + error.message, "error");
  }
}

/**
 * Muestra un toast de notificación
 * @param {String} message - Mensaje a mostrar
 * @param {String} type - Tipo de toast (success, error, warning, info)
 */
function showToast(message, type = "info") {
  // Buscar toast existente
  let toastContainer = document.querySelector(".toast-container");

  // Crear container si no existe
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  // Crear nuevo toast
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas ${type === "success" ? "fa-check-circle" : type === "error" ? "fa-exclamation-circle" : type === "warning" ? "fa-exclamation-triangle" : "fa-info-circle"}"></i>
      <p>${message}</p>
    </div>
    <button class="close-toast">&times;</button>
  `;

  // Añadir toast al contenedor
  toastContainer.appendChild(toast);

  // Cerrar al hacer clic en el botón
  toast.querySelector(".close-toast").addEventListener("click", () => {
    toast.classList.add("hide");
    setTimeout(() => {
      toast.remove();
    }, 300);
  });

  // Desaparecer automáticamente después de 5 segundos
  setTimeout(() => {
    if (toast.parentNode) { // Verificar que el toast aún exista en el DOM
      toast.classList.add("hide");
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 300);
    }
  }, 5000);
}
