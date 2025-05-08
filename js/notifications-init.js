// Script para inicializar las notificaciones en todas las páginas
import { 
  loadNotifications, 
  renderNotificationsMenu,
  markAllNotificationsAsRead,
  markNotificationAsRead
} from './notifications_v2.js?v=20250508';

// Inicializar sistema de notificaciones
document.addEventListener('DOMContentLoaded', () => {
  console.log('Inicializando sistema de notificaciones...');
  
  // Cargar notificaciones almacenadas
  loadNotifications();
  
  // Configurar el menú de notificaciones
  setupNotificationsMenu();
});

// Configurar el menú de notificaciones
function setupNotificationsMenu() {
  // Primero verificar si ya existe un menú de notificaciones
  let menu = document.querySelector('.notifications-menu');
  
  // Si no existe, crearlo
  if (!menu) {
    menu = document.createElement('div');
    menu.className = 'notifications-menu';
    
    // Buscar el contenedor de notificaciones para añadir el menú
    const notificationsContainer = document.querySelector('.notifications');
    if (notificationsContainer) {
      // Primero verifica si hay un elemento badge (contador de notificaciones)
      let badgeElement = notificationsContainer.querySelector('.badge');
      
      // Si no existe el badge, crearlo
      if (!badgeElement) {
        badgeElement = document.createElement('span');
        badgeElement.className = 'badge';
        badgeElement.textContent = '0';
        badgeElement.style.display = 'none';
        notificationsContainer.appendChild(badgeElement);
      }
      
      // Añadir el menú de notificaciones al contenedor
      notificationsContainer.appendChild(menu);
      
      // Asegurarse de que la estructura del menú esté completa
      menu.innerHTML = `
        <div class="notifications-header">
          <h3>Notificaciones</h3>
          <button class="mark-all-read">Marcar todas como leídas</button>
        </div>
        <div class="notifications-list">
          <div class="empty-notifications">
            <i class="fas fa-bell-slash"></i>
            <p>No tienes notificaciones</p>
          </div>
        </div>
      `;
    }
  }
  
  // Asegurar que la página tenga el CSS de notificaciones
  if (!document.querySelector('link[href="css/notifications.css"]')) {
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = 'css/notifications.css';
    document.head.appendChild(styleLink);
  }
  
  // Configurar funcionalidad de toggle para el menú de notificaciones
  const toggleNotifications = document.querySelector('.notifications i.fa-bell');
  if (toggleNotifications) {
    toggleNotifications.parentElement.addEventListener('click', function(e) {
      e.stopPropagation();
      
      if (menu) {
        menu.classList.toggle('active');
        
        // Si el menú está activo, renderizar las notificaciones
        if (menu.classList.contains('active')) {
          renderNotificationsMenu();
        }
      }
    });
    
    // Cerrar el menú al hacer clic fuera de él
    document.addEventListener('click', function(e) {
      if (menu && !e.target.closest('.notifications') && menu.classList.contains('active')) {
        menu.classList.remove('active');
      }
    });
  }
}

// Exportamos una función para que pueda ser accedida desde otros scripts
export function refreshNotifications() {
  loadNotifications();
  
  // Si el menú está visible, actualizarlo
  const menu = document.querySelector('.notifications-menu');
  if (menu && menu.classList.contains('active')) {
    renderNotificationsMenu();
  }
}
