// Popup Logic para Twitch Auto-Navigator

class PopupController {
  constructor() {
    this.isActive = false;
    this.timers = {};
    this.updateInterval = null;
    
    this.init();
  }
  
  async init() {
    try {
      console.log('Popup Controller iniciado');
      
      // Configurar elementos DOM
      this.setupDOMElements();
      
      // Configurar event listeners
      this.setupEventListeners();
      
      // Cargar configuración guardada
      await this.loadSettings();
      
      // Actualizar estado inicial
      await this.updateStatus();
      
      // Iniciar actualizaciones periódicas
      this.startPeriodicUpdates();
      
    } catch (error) {
      console.error('Error inicializando popup:', error);
      this.showError('Error al cargar la extensión');
    }
  }
  
  setupDOMElements() {
    // Elementos principales
    this.elements = {
      toggleBtn: document.getElementById('toggleBtn'),
      toggleBtnText: document.getElementById('toggleBtnText'),
      statusIndicator: document.getElementById('statusIndicator'),
      statusDot: document.getElementById('statusDot'),
      statusText: document.getElementById('statusText'),
      
      // Timers
      channelTimer: document.getElementById('channelTimer'),
      tabTimer: document.getElementById('tabTimer'),
      forceChannelBtn: document.getElementById('forceChannelBtn'),
      forceTabBtn: document.getElementById('forceTabBtn'),
      
      // Estado
      currentState: document.getElementById('currentState'),
      originalChannel: document.getElementById('originalChannel'),
      lastAction: document.getElementById('lastAction'),
      
      // Configuración
      aiMode: document.getElementById('aiMode'),
      autoStart: document.getElementById('autoStart'),
      notificationsEnabled: document.getElementById('notificationsEnabled'),
      
      // Historial
      historyList: document.getElementById('historyList'),
      
      // Controles
      resetBtn: document.getElementById('resetBtn'),
      helpBtn: document.getElementById('helpBtn'),
      
      // Loading
      loadingOverlay: document.getElementById('loadingOverlay')
    };
  }
  
  setupEventListeners() {
    // Botón principal de activar/desactivar
    this.elements.toggleBtn.addEventListener('click', () => {
      this.toggleNavigation();
    });
    
    // Botones de forzar acción
    this.elements.forceChannelBtn.addEventListener('click', () => {
      this.forceAction('channel_switch');
    });
    
    this.elements.forceTabBtn.addEventListener('click', () => {
      this.forceAction('tab_open');
    });
    
    // Configuración
    this.elements.aiMode.addEventListener('change', () => {
      this.saveSettings();
    });
    
    this.elements.autoStart.addEventListener('change', () => {
      this.saveSettings();
    });
    
    this.elements.notificationsEnabled.addEventListener('change', () => {
      this.saveSettings();
    });
    
    // Controles adicionales
    this.elements.resetBtn.addEventListener('click', () => {
      this.resetExtension();
    });
    
    this.elements.helpBtn.addEventListener('click', () => {
      this.showHelp();
    });
  }
  
  async toggleNavigation() {
    try {
      this.showLoading(true);
      
      if (this.isActive) {
        await this.stopNavigation();
      } else {
        await this.startNavigation();
      }
      
      await this.updateStatus();
      
    } catch (error) {
      console.error('Error toggling navigation:', error);
      this.showError('Error al cambiar estado de navegación');
    } finally {
      this.showLoading(false);
    }
  }
  
  async startNavigation() {
    const response = await chrome.runtime.sendMessage({
      action: 'start_timers'
    });
    
    if (response.success) {
      this.isActive = true;
      this.addHistoryItem('Navegación automática iniciada');
      this.showNotification('✅ Navegación automática activada');
    } else {
      throw new Error(response.error || 'Error desconocido');
    }
  }
  
  async stopNavigation() {
    const response = await chrome.runtime.sendMessage({
      action: 'stop_timers'
    });
    
    if (response.success) {
      this.isActive = false;
      this.addHistoryItem('Navegación automática detenida');
      this.showNotification('⏹️ Navegación automática desactivada');
    } else {
      throw new Error(response.error || 'Error desconocido');
    }
  }
  
  async forceAction(actionType) {
    try {
      this.showLoading(true);
      
      const response = await chrome.runtime.sendMessage({
        action: 'force_action',
        actionType: actionType
      });
      
      if (response.success) {
        const actionText = actionType === 'channel_switch' ? 'Cambio de canal forzado' : 'Apertura de pestaña forzada';
        this.addHistoryItem(actionText);
        this.showNotification(`🚀 ${actionText} ejecutado`);
      } else {
        throw new Error(response.error || 'Error ejecutando acción');
      }
      
    } catch (error) {
      console.error('Error forcing action:', error);
      this.showError('Error al forzar acción');
    } finally {
      this.showLoading(false);
    }
  }
  
  async updateStatus() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'get_status'
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Actualizar estado general
      this.isActive = response.active;
      this.updateUIStatus(response);
      
      // Actualizar timers
      this.updateTimers(response.alarms);
      
    } catch (error) {
      console.error('Error updating status:', error);
      this.showOfflineStatus();
    }
  }
  
  updateUIStatus(status) {
    // Estado del botón principal
    if (this.isActive) {
      this.elements.toggleBtn.className = 'btn btn-primary active';
      this.elements.toggleBtnText.textContent = 'Detener Navegación';
      this.elements.statusDot.className = 'status-dot active';
      this.elements.statusText.textContent = 'Activo';
    } else {
      this.elements.toggleBtn.className = 'btn btn-primary';
      this.elements.toggleBtnText.textContent = 'Iniciar Navegación';
      this.elements.statusDot.className = 'status-dot';
      this.elements.statusText.textContent = 'Inactivo';
    }
    
    // Estado actual
    const stateMap = {
      'idle': 'Inactivo',
      'active': 'Activo',
      'channel_switched': 'Canal cambiado',
      'returned': 'Canal restaurado'
    };
    
    this.elements.currentState.textContent = stateMap[status.state] || status.state;
    this.elements.originalChannel.textContent = status.originalChannel || 'Ninguno';
    
    // Última acción
    if (status.lastAction) {
      const actionDate = new Date(status.lastAction.timestamp);
      const actionText = `${status.lastAction.type} - ${actionDate.toLocaleTimeString()}`;
      this.elements.lastAction.textContent = actionText;
    }
  }
  
  updateTimers(alarms) {
    const channelAlarm = alarms.find(alarm => alarm.name === 'channel_switch');
    const tabAlarm = alarms.find(alarm => alarm.name === 'tab_open');
    
    // Timer de cambio de canal
    if (channelAlarm && channelAlarm.timeRemaining > 0) {
      this.elements.channelTimer.textContent = this.formatTime(channelAlarm.timeRemaining);
      this.elements.forceChannelBtn.disabled = false;
    } else {
      this.elements.channelTimer.textContent = '--:--:--';
      this.elements.forceChannelBtn.disabled = !this.isActive;
    }
    
    // Timer de pestaña
    if (tabAlarm && tabAlarm.timeRemaining > 0) {
      this.elements.tabTimer.textContent = this.formatTime(tabAlarm.timeRemaining);
      this.elements.forceTabBtn.disabled = false;
    } else {
      this.elements.tabTimer.textContent = '--:--:--';
      this.elements.forceTabBtn.disabled = !this.isActive;
    }
  }
  
  formatTime(ms) {
    if (ms <= 0) return '00:00:00';
    
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  showOfflineStatus() {
    this.elements.statusDot.className = 'status-dot';
    this.elements.statusText.textContent = 'Desconectado';
    this.elements.currentState.textContent = 'Desconectado';
    this.elements.channelTimer.textContent = '--:--:--';
    this.elements.tabTimer.textContent = '--:--:--';
  }
  
  async loadSettings() {
    try {
      const result = await chrome.storage.local.get([
        'aiMode',
        'autoStart',
        'notificationsEnabled',
        'history'
      ]);
      
      // Configuración
      this.elements.aiMode.value = result.aiMode || 'balanced';
      this.elements.autoStart.checked = result.autoStart || false;
      this.elements.notificationsEnabled.checked = result.notificationsEnabled !== false; // default true
      
      // Historial
      if (result.history && result.history.length > 0) {
        this.loadHistory(result.history);
      }
      
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
  
  async saveSettings() {
    try {
      await chrome.storage.local.set({
        aiMode: this.elements.aiMode.value,
        autoStart: this.elements.autoStart.checked,
        notificationsEnabled: this.elements.notificationsEnabled.checked
      });
      
      console.log('Configuración guardada');
      
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }
  
  loadHistory(history) {
    this.elements.historyList.innerHTML = '';
    
    history.slice(-10).forEach(item => { // Mostrar últimos 10
      this.addHistoryItemToDOM(item.time, item.action);
    });
  }
  
  addHistoryItem(action) {
    const time = new Date().toLocaleTimeString();
    this.addHistoryItemToDOM(time, action);
    this.saveHistoryItem(time, action);
  }
  
  addHistoryItemToDOM(time, action) {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item fade-in';
    historyItem.innerHTML = `
      <span class="history-time">${time}</span>
      <span class="history-action">${action}</span>
    `;
    
    this.elements.historyList.insertBefore(historyItem, this.elements.historyList.firstChild);
    
    // Mantener solo 10 elementos
    while (this.elements.historyList.children.length > 10) {
      this.elements.historyList.removeChild(this.elements.historyList.lastChild);
    }
  }
  
  async saveHistoryItem(time, action) {
    try {
      const result = await chrome.storage.local.get(['history']);
      const history = result.history || [];
      
      history.push({ time, action, timestamp: Date.now() });
      
      // Mantener solo los últimos 50 elementos
      const recentHistory = history.slice(-50);
      
      await chrome.storage.local.set({ history: recentHistory });
      
    } catch (error) {
      console.error('Error saving history:', error);
    }
  }
  
  startPeriodicUpdates() {
    // Actualizar cada 5 segundos
    this.updateInterval = setInterval(() => {
      this.updateStatus();
    }, 5000);
  }
  
  showLoading(show) {
    this.elements.loadingOverlay.className = show ? 'loading-overlay show' : 'loading-overlay';
  }
  
  showNotification(message) {
    if (this.elements.notificationsEnabled.checked) {
      // Mostrar notificación visual simple
      const notification = document.createElement('div');
      notification.className = 'notification';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(78, 205, 196, 0.9);
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-size: 14px;
        z-index: 10000;
        backdrop-filter: blur(10px);
      `;
      notification.textContent = message;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 3000);
    }
  }
  
  showError(message) {
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 107, 107, 0.9);
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 10000;
      backdrop-filter: blur(10px);
    `;
    notification.textContent = `❌ ${message}`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }
  
  async resetExtension() {
    if (confirm('¿Estás seguro de que quieres resetear la extensión? Esto detendrá todos los timers y borrará la configuración.')) {
      try {
        this.showLoading(true);
        
        // Detener navegación
        await this.stopNavigation();
        
        // Limpiar storage
        await chrome.storage.local.clear();
        
        // Resetear UI
        this.elements.historyList.innerHTML = '<div class="history-item"><span class="history-time">--:--</span><span class="history-action">Extensión reseteada</span></div>';
        
        // Recargar configuración por defecto
        await this.loadSettings();
        
        this.showNotification('🔄 Extensión reseteada exitosamente');
        
      } catch (error) {
        console.error('Error resetting extension:', error);
        this.showError('Error al resetear la extensión');
      } finally {
        this.showLoading(false);
      }
    }
  }
  
  showHelp() {
    const helpText = `
🎮 Twitch Auto-Navigator con IA

Esta extensión automatiza la navegación en Twitch con temporizadores inteligentes:

🔄 Cambio de Canal (3-6h):
- Detecta canales en vivo automáticamente
- Usa IA para seleccionar canales de forma natural
- Permanece 5-20 minutos y regresa al original

📂 Pestañas Nuevas (1-3h):
- Abre pestañas del directorio de Twitch
- Las mantiene abiertas 3-7 minutos
- Las cierra automáticamente

⚙️ Configuración:
- Modo IA: Controla la selección de canales
- Auto-iniciar: Activa al abrir Twitch
- Notificaciones: Alertas visuales

🚀 Acciones Manuales:
- "Forzar Ahora": Ejecuta acción inmediatamente
- Reset: Limpia toda la configuración

La extensión funciona en segundo plano incluso si cambias de pestaña.
    `.trim();
    
    alert(helpText);
  }
  
  // Cleanup al cerrar popup
  cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  const popup = new PopupController();
  
  // Cleanup al cerrar ventana
  window.addEventListener('beforeunload', () => {
    popup.cleanup();
  });
});
