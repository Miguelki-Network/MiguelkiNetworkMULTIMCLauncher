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
            
            this.launchers = launchers;
            this.displayLaunchers();
            
        } catch (error) {
            console.error('Error cargando launchers:', error);
            this.showError(error.message);
        }
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
        
        this.launchers.forEach((launcher, index) => {
            const launcherCard = this.createLauncherCard(launcher, index);
            this.launchersGrid.appendChild(launcherCard);
        });
    }
    
    createLauncherCard(launcher, index) {
        const card = document.createElement('div');
        card.className = 'launcher-card animate-in';
        card.dataset.launcherIndex = index;
        
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
        
        card.appendChild(icon);
        card.appendChild(name);
        
        // Event listener para selección
        card.addEventListener('click', () => {
            this.selectLauncher(launcher, card);
        });
        
        // Aplicar animación con delay
        setTimeout(() => {
            card.classList.add('animate-in');
        }, index * 100);
        
        return card;
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
