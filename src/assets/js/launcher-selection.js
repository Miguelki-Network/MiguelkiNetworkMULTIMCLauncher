const { ipcRenderer } = require('electron');
const nodeFetch = require("node-fetch");

class LauncherSelection {
    constructor() {
        this.launchers = [];
        this.selectedLauncher = null;
        this.apiUrl = 'http://mclauncherapi.miguelkiwebservices.com';
        
        this.loadingContainer = document.getElementById('loading');
        this.errorContainer = document.getElementById('error');
        this.launchersGrid = document.getElementById('launchers-grid');
        this.errorMessage = document.getElementById('error-message');
        this.retryBtn = document.getElementById('retry-btn');
        this.titleCloseBtn = document.getElementById('title-close');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadLaunchers();
    }
    
    setupEventListeners() {
        this.retryBtn.addEventListener('click', () => {
            this.loadLaunchers();
        });
        
        this.titleCloseBtn.addEventListener('click', () => {
            ipcRenderer.send('launcher-selection-close');
        });
        
        // Cerrar con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                ipcRenderer.send('launcher-selection-close');
            }
        });
    }
    
    async loadLaunchers() {
        this.showLoading();
        
        try {
            console.log('Cargando launchers desde:', `${this.apiUrl}/multi/launchers.json`);
            
            const response = await nodeFetch(`${this.apiUrl}/multi/launchers.json`, {
                method: 'GET',
                timeout: 10000,
                headers: {
                    'User-Agent': 'MiguelkiNetworkLauncher/1.0',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const launchers = await response.json();
            console.log('Launchers cargados:', launchers);
            
            if (!Array.isArray(launchers) || launchers.length === 0) {
                throw new Error('No se encontraron launchers disponibles');
            }
            
            // Verificar estado de mantenimiento de cada launcher
            this.launchers = await this.checkMaintenanceStatus(launchers);
            this.displayLaunchers();
            
        } catch (error) {
            console.error('Error cargando launchers:', error);
            this.showError(error.message);
        }
    }

    async checkMaintenanceStatus(launchers) {
        // Actualizar mensaje de carga
        const loadingText = this.loadingContainer.querySelector('p');
        if (loadingText) {
            loadingText.textContent = 'Verificando estado de mantenimiento...';
        }
        
        console.log(`Iniciando verificación de mantenimiento para ${launchers.length} launchers`);
        
        // Crear promesas para verificar cada launcher en paralelo
        const maintenancePromises = launchers.map(async (launcher, index) => {
            try {
                console.log(`[${index + 1}/${launchers.length}] Verificando mantenimiento para ${launcher.name}...`);
                
                // Construir URL de configuración para este launcher específico
                const configUrl = `${launcher.url}launcher/config-launcher/config.php`;
                console.log(`URL de configuración: ${configUrl}`);
                
                const response = await nodeFetch(configUrl, {
                    method: 'GET',
                    timeout: 8000, // Aumentar timeout
                    headers: {
                        'User-Agent': 'MiguelkiNetworkMCLauncher',
                        'Accept': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const config = await response.json();
                    launcher.maintenance = Boolean(config.maintenance);
                    launcher.maintenance_message = config.maintenance_message || 'Servidor en mantenimiento';
                    
                    console.log(`✓ ${launcher.name} - Mantenimiento: ${launcher.maintenance}`, config.maintenance ? `(${launcher.maintenance_message})` : '');
                } else {
                    launcher.maintenance = false;
                    console.warn(`⚠ No se pudo obtener configuración de ${launcher.name} (${response.status}), asumiendo disponible`);
                }
            } catch (error) {
                launcher.maintenance = false;
                console.error(`✗ Error verificando ${launcher.name}:`, error.message);
            }
            
            return launcher;
        });
        
        // Esperar a que todas las verificaciones terminen
        const launchersWithStatus = await Promise.all(maintenancePromises);
        
        // Log final del estado
        const maintenanceCount = launchersWithStatus.filter(l => l.maintenance).length;
        const availableCount = launchersWithStatus.length - maintenanceCount;
        console.log(`Verificación completada: ${availableCount} disponibles, ${maintenanceCount} en mantenimiento`);
        
        return launchersWithStatus;
    }
    
    showLoading() {
        this.loadingContainer.style.display = 'flex';
        this.errorContainer.style.display = 'none';
        this.launchersGrid.style.display = 'none';
    }
    
    showError(message) {
        this.loadingContainer.style.display = 'none';
        this.errorContainer.style.display = 'flex';
        this.launchersGrid.style.display = 'none';
        this.errorMessage.textContent = message;
    }
    
    displayLaunchers() {
        this.loadingContainer.style.display = 'none';
        this.errorContainer.style.display = 'none';
        this.launchersGrid.style.display = 'grid';
        
        // Limpiar grid anterior
        this.launchersGrid.innerHTML = '';
        
        // Debug: Log del estado de todos los launchers
        console.log('=== ESTADO DE LAUNCHERS ===');
        this.launchers.forEach((launcher, index) => {
            console.log(`${index + 1}. ${launcher.name}: ${launcher.maintenance ? 'EN MANTENIMIENTO' : 'DISPONIBLE'}`, launcher.maintenance ? `(${launcher.maintenance_message})` : '');
        });
        console.log('============================');
        
        this.launchers.forEach((launcher, index) => {
            const launcherCard = this.createLauncherCard(launcher, index);
            this.launchersGrid.appendChild(launcherCard);
        });
        
        // Mostrar resumen de estado
        this.showStatusSummary();
    }

    showStatusSummary() {
        const totalLaunchers = this.launchers.length;
        const maintenanceLaunchers = this.launchers.filter(l => l.maintenance).length;
        const availableLaunchers = totalLaunchers - maintenanceLaunchers;
        
        console.log(`Estado de launchers - Total: ${totalLaunchers}, Disponibles: ${availableLaunchers}, En mantenimiento: ${maintenanceLaunchers}`);
        
        if (maintenanceLaunchers > 0) {
            const maintenanceNames = this.launchers
                .filter(l => l.maintenance)
                .map(l => l.name)
                .join(', ');
            
            console.log(`Launchers en mantenimiento: ${maintenanceNames}`);
            
            // Mostrar notificación temporal si hay launchers en mantenimiento
            if (maintenanceLaunchers === totalLaunchers) {
                // Todos los launchers están en mantenimiento
                this.showTemporaryNotification(
                    '⚠️ Todos los launchers están en mantenimiento',
                    'Todos los servidores están temporalmente fuera de servicio. Por favor, inténtalo más tarde.',
                    'warning'
                );
            } else {
                // Algunos launchers están en mantenimiento
                this.showTemporaryNotification(
                    `🔧 ${maintenanceLaunchers} launcher(s) en mantenimiento`,
                    `Los siguientes launchers no están disponibles: ${maintenanceNames}`,
                    'info'
                );
            }
        }
    }

    showTemporaryNotification(title, message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `status-notification ${type}`;
        notification.innerHTML = `
            <div class="status-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-cerrar después de 4 segundos
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 4000);
    }
    
    createLauncherCard(launcher, index) {
        const card = document.createElement('div');
        card.className = 'launcher-card animate-in';
        card.dataset.launcherIndex = index;
        
        // Añadir clase de mantenimiento si está en mantenimiento
        if (launcher.maintenance) {
            card.classList.add('maintenance');
        }
        
        // Crear icono
        const icon = document.createElement('img');
        icon.className = 'launcher-icon';
        icon.src = launcher.icon;
        icon.alt = launcher.name;
        
        // Fallback para iconos que no carguen
        icon.onerror = () => {
            icon.src = './assets/images/icon.png'; // Usar icono por defecto
        };
        
        // Crear nombre
        const name = document.createElement('h3');
        name.className = 'launcher-name';
        name.textContent = launcher.name;
        
        // Crear indicador de mantenimiento si es necesario
        if (launcher.maintenance) {
            const maintenanceIndicator = document.createElement('div');
            maintenanceIndicator.className = 'maintenance-indicator';
            maintenanceIndicator.innerHTML = '⚠️ MANTENIMIENTO';
            card.appendChild(maintenanceIndicator);
            
            // Aplicar overlay de mantenimiento
            const overlay = document.createElement('div');
            overlay.className = 'maintenance-overlay';
            card.appendChild(overlay);
        }
        
        card.appendChild(icon);
        card.appendChild(name);
        
        // Event listener para selección
        card.addEventListener('click', () => {
            if (launcher.maintenance) {
                // Mostrar mensaje de mantenimiento en lugar de permitir selección
                this.showMaintenanceMessage(launcher);
            } else {
                this.selectLauncher(launcher, card);
            }
        });
        
        // Aplicar animación con delay
        setTimeout(() => {
            card.classList.add('animate-in');
        }, index * 100);
        
        return card;
    }

    showMaintenanceMessage(launcher) {
        // Crear modal o mensaje temporal
        const message = launcher.maintenance_message || 'Este launcher está actualmente en mantenimiento. Por favor, inténtalo más tarde.';
        
        // Crear elemento de notificación temporal
        const notification = document.createElement('div');
        notification.className = 'maintenance-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <h3>🔧 ${launcher.name} en Mantenimiento</h3>
                <p>${message}</p>
                <button class="notification-close">Entendido</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Cerrar notificación
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });
        
        // Auto-cerrar después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
    
    selectLauncher(launcher, cardElement) {
        // Remover selección anterior
        const previousSelected = this.launchersGrid.querySelector('.launcher-card.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }
        
        // Agregar selección actual
        cardElement.classList.add('selected');
        this.selectedLauncher = launcher;
        
        console.log('Launcher seleccionado:', launcher);
        
        // Mostrar feedback visual inmediato
        cardElement.style.transform = 'translateY(-4px) scale(1.05)';
        
        // Pequeño delay para mostrar la selección visual y luego proceder
        setTimeout(() => {
            // Enviar selección al proceso principal
            ipcRenderer.send('launcher-selected', {
                name: launcher.name,
                url: launcher.url,
                icon: launcher.icon
            });
        }, 500);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new LauncherSelection();
});

// Manejar errores globales
window.addEventListener('error', (event) => {
    console.error('Error global en launcher selection:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rechazada en launcher selection:', event.reason);
});
