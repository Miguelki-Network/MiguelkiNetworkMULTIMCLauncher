/**
 * Módulo para gestionar la URL del launcher seleccionado
 */

class LauncherUrlManager {
    constructor() {
        this.defaultUrl = 'https://mclauncherapi.miguelkiwebservices.com/';
        this.selectedUrl = null;
        this.selectedLauncher = null;
    }
    
    /**
     * Establece la URL del launcher seleccionado
     * @param {string} url - URL del launcher
     * @param {Object} launcherInfo - Información del launcher seleccionado
     */
    setSelectedUrl(url, launcherInfo = null) {
        // Asegurar que la URL termine con /
        this.selectedUrl = url.endsWith('/') ? url : url + '/';
        this.selectedLauncher = launcherInfo;
        
        console.log('URL del launcher establecida:', this.selectedUrl);
        if (launcherInfo) {
            console.log('Información del launcher:', launcherInfo);
        }
    }
    
    /**
     * Obtiene la URL actual (seleccionada o por defecto)
     * @param {boolean} forceDefault - Si es true, devuelve la URL por defecto
     * @returns {string} URL actual
     */
    getCurrentUrl(forceDefault = false) {
        if (forceDefault) {
            return this.defaultUrl;
        }
        return this.selectedUrl || this.defaultUrl;
    }
    
    /**
     * Obtiene la URL por defecto (para actualizaciones)
     * @returns {string} URL por defecto
     */
    getDefaultUrl() {
        return this.defaultUrl;
    }
    
    /**
     * Obtiene información del launcher seleccionado
     * @returns {Object|null} Información del launcher
     */
    getSelectedLauncher() {
        return this.selectedLauncher;
    }
    
    /**
     * Verifica si hay un launcher seleccionado
     * @returns {boolean} True si hay un launcher seleccionado
     */
    hasSelectedLauncher() {
        return this.selectedUrl !== null;
    }
    
    /**
     * Resetea la selección del launcher
     */
    reset() {
        this.selectedUrl = null;
        this.selectedLauncher = null;
        console.log('Selección de launcher reseteada');
    }
    
    /**
     * Construye una URL completa para un endpoint específico
     * @param {string} endpoint - Endpoint de la API
     * @param {boolean} forceDefault - Si es true, usa la URL por defecto
     * @returns {string} URL completa
     */
    buildUrl(endpoint, forceDefault = false) {
        const baseUrl = this.getCurrentUrl(forceDefault);
        
        // Limpiar endpoint (remover / inicial si existe)
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        
        return `${baseUrl}${cleanEndpoint}`;
    }
}

// Crear instancia global
const launcherUrlManager = new LauncherUrlManager();

module.exports = {
    LauncherUrlManager,
    launcherUrlManager
};
