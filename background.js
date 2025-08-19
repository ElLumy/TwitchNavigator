// Service Worker para manejo de timers persistentes y comunicación

class TwitchTimerManager {
  constructor() {
    this.ALARM_NAMES = {
      CHANNEL_SWITCH: 'channel_switch',
      TAB_OPEN: 'tab_open',
      TAB_CLOSE: 'tab_close',
      RETURN_TO_ORIGINAL: 'return_to_original'
    };
    
    this.STORAGE_KEYS = {
      ORIGINAL_CHANNEL: 'original_channel',
      CURRENT_STATE: 'current_state',
      LAST_ACTION: 'last_action',
      TIMERS_ACTIVE: 'timers_active'
    };
    
    this.init();
  }
  
  async init() {
    console.log('Twitch Timer Manager iniciado');
    
    // Configurar listeners
    this.setupListeners();
    
    // Restaurar timers si es necesario
    await this.restoreTimers();
  }
  
  setupListeners() {
    // Listener para alarmas
    chrome.alarms.onAlarm.addListener((alarm) => {
      this.handleAlarm(alarm);
    });
    
    // Listener para mensajes de content script y popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Mantener canal abierto para respuestas asíncronas
    });
    
    // Listener para cuando se instala/inicia la extensión
    chrome.runtime.onInstalled.addListener(() => {
      this.setupInitialState();
    });
    
    // Listener para cuando se actualiza una pestaña
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url && tab.url.includes('twitch.tv')) {
        this.handleTwitchPageLoad(tabId, tab);
      }
    });
  }
  
  async setupInitialState() {
    await chrome.storage.local.set({
      [this.STORAGE_KEYS.TIMERS_ACTIVE]: false,
      [this.STORAGE_KEYS.CURRENT_STATE]: 'idle',
      [this.STORAGE_KEYS.LAST_ACTION]: null
    });
    
    console.log('Estado inicial configurado');
  }
  
  async restoreTimers() {
    const data = await chrome.storage.local.get([this.STORAGE_KEYS.TIMERS_ACTIVE]);
    
    if (data[this.STORAGE_KEYS.TIMERS_ACTIVE]) {
      console.log('Restaurando timers activos...');
      await this.startTimers();
    }
  }
  
  async handleAlarm(alarm) {
    console.log(`Alarma activada: ${alarm.name}`);
    
    switch (alarm.name) {
      case this.ALARM_NAMES.CHANNEL_SWITCH:
        await this.executeChannelSwitch();
        break;
        
      case this.ALARM_NAMES.TAB_OPEN:
        await this.executeTabOpen();
        break;
        
      case this.ALARM_NAMES.TAB_CLOSE:
        await this.executeTabClose();
        break;
        
      case this.ALARM_NAMES.RETURN_TO_ORIGINAL:
        await this.executeReturnToOriginal();
        break;
    }
  }
  
  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'start_timers':
          await this.startTimers();
          sendResponse({success: true});
          break;
          
        case 'stop_timers':
          await this.stopTimers();
          sendResponse({success: true});
          break;
          
        case 'force_action':
          await this.forceAction(message.actionType);
          sendResponse({success: true});
          break;
          
        case 'get_status':
          const status = await this.getStatus();
          sendResponse(status);
          break;
          
        case 'page_loaded':
          await this.handlePageLoaded(sender.tab);
          sendResponse({success: true});
          break;
          
        default:
          sendResponse({error: 'Acción no reconocida'});
      }
    } catch (error) {
      console.error('Error manejando mensaje:', error);
      sendResponse({error: error.message});
    }
  }
  
  async startTimers() {
    try {
      // Limpiar alarmas existentes
      await this.stopTimers();
      
      // Crear alarmas con intervalos aleatorios
      const channelSwitchDelay = this.getRandomInterval(3, 6, 'hours');
      const tabOpenDelay = this.getRandomInterval(1, 3, 'hours');
      
      await chrome.alarms.create(this.ALARM_NAMES.CHANNEL_SWITCH, {
        delayInMinutes: channelSwitchDelay / (1000 * 60)
      });
      
      await chrome.alarms.create(this.ALARM_NAMES.TAB_OPEN, {
        delayInMinutes: tabOpenDelay / (1000 * 60)
      });
      
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.TIMERS_ACTIVE]: true,
        [this.STORAGE_KEYS.CURRENT_STATE]: 'active'
      });
      
      console.log('Timers iniciados', {channelSwitchDelay, tabOpenDelay});
      
    } catch (error) {
      console.error('Error iniciando timers:', error);
    }
  }
  
  async stopTimers() {
    await chrome.alarms.clearAll();
    
    await chrome.storage.local.set({
      [this.STORAGE_KEYS.TIMERS_ACTIVE]: false,
      [this.STORAGE_KEYS.CURRENT_STATE]: 'idle'
    });
    
    console.log('Timers detenidos');
  }
  
  async executeChannelSwitch() {
    try {
      const tabs = await chrome.tabs.query({url: '*://*.twitch.tv/*'});
      
      if (tabs.length === 0) {
        console.log('No hay pestañas de Twitch abiertas');
        await this.scheduleNextChannelSwitch();
        return;
      }
      
      // Preferir la pestaña activa en la ventana actual
      const activeTab = tabs.find(t => t.active) || tabs[0];
      const twitchTab = activeTab;
      
      // Guardar canal original
      await this.saveOriginalChannel(twitchTab);
      
      // Enviar mensaje al content script para cambiar canal
      try {
        await chrome.tabs.sendMessage(twitchTab.id, {
          action: 'switch_channel'
        });
      } catch (e) {
        console.warn('No se pudo enviar mensaje al content script. ¿Está inyectado?', e);
      }
      
      // Programar regreso al canal original
      const stayDuration = this.getRandomInterval(5, 20, 'minutes');
      await chrome.alarms.create(this.ALARM_NAMES.RETURN_TO_ORIGINAL, {
        delayInMinutes: stayDuration / (1000 * 60)
      });
      
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.CURRENT_STATE]: 'channel_switched',
        [this.STORAGE_KEYS.LAST_ACTION]: {
          type: 'channel_switched',
          timestamp: Date.now()
        }
      });
      
    } catch (error) {
      console.error('Error en cambio de canal:', error);
      await this.scheduleNextChannelSwitch();
    }
  }
  
  async executeTabOpen() {
    try {
      // Abrir una nueva pestaña de Chrome (New Tab). No establecer URL crea la pestaña Nueva pestaña.
      const newTab = await chrome.tabs.create({ active: true });
      
      // Programar cierre de pestaña
      const duration = this.getRandomInterval(3, 7, 'minutes');
      await chrome.alarms.create(this.ALARM_NAMES.TAB_CLOSE, {
        delayInMinutes: duration / (1000 * 60)
      });
      
      await chrome.storage.local.set({
        'temp_tab_id': newTab.id,
        [this.STORAGE_KEYS.LAST_ACTION]: {
          type: 'tab_opened',
          timestamp: Date.now(),
          tabId: newTab.id
        }
      });
      
      console.log(`Nueva pestaña abierta: ${newTab.id}`);
      
    } catch (error) {
      console.error('Error abriendo pestaña:', error);
    }
    
    // Programar próxima apertura de pestaña
    await this.scheduleNextTabOpen();
  }
  
  async executeTabClose() {
    try {
      const data = await chrome.storage.local.get(['temp_tab_id']);
      
      if (data.temp_tab_id) {
        await chrome.tabs.remove(data.temp_tab_id);
        await chrome.storage.local.remove(['temp_tab_id']);
        console.log(`Pestaña cerrada: ${data.temp_tab_id}`);
      }
      
    } catch (error) {
      console.error('Error cerrando pestaña:', error);
    }
  }
  
  async executeReturnToOriginal() {
    try {
      const data = await chrome.storage.local.get([this.STORAGE_KEYS.ORIGINAL_CHANNEL]);
      const tabs = await chrome.tabs.query({url: '*://*.twitch.tv/*'});
      
      if (tabs.length > 0 && data[this.STORAGE_KEYS.ORIGINAL_CHANNEL]) {
        const twitchTab = tabs.find(t => t.active) || tabs[0];
        
        await chrome.tabs.sendMessage(twitchTab.id, {
          action: 'return_to_channel',
          channel: data[this.STORAGE_KEYS.ORIGINAL_CHANNEL]
        });
        
        await chrome.storage.local.set({
          [this.STORAGE_KEYS.CURRENT_STATE]: 'returned',
          [this.STORAGE_KEYS.LAST_ACTION]: {
            type: 'returned_to_original',
            timestamp: Date.now()
          }
        });
      }
      
    } catch (error) {
      console.error('Error regresando al canal original:', error);
    }
    
    // Programar próximo cambio de canal
    await this.scheduleNextChannelSwitch();
  }
  
  async forceAction(actionType) {
    switch (actionType) {
      case 'channel_switch':
        await this.executeChannelSwitch();
        break;
      case 'tab_open':
        await this.executeTabOpen();
        break;
      default:
        console.log('Tipo de acción no válido:', actionType);
    }
  }
  
  async scheduleNextChannelSwitch() {
    const delay = this.getRandomInterval(3, 6, 'hours');
    await chrome.alarms.create(this.ALARM_NAMES.CHANNEL_SWITCH, {
      delayInMinutes: delay / (1000 * 60)
    });
  }
  
  async scheduleNextTabOpen() {
    const delay = this.getRandomInterval(1, 3, 'hours');
    await chrome.alarms.create(this.ALARM_NAMES.TAB_OPEN, {
      delayInMinutes: delay / (1000 * 60)
    });
  }
  
  async saveOriginalChannel(tab) {
    const currentChannel = this.extractChannelFromUrl(tab.url);
    if (currentChannel) {
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.ORIGINAL_CHANNEL]: currentChannel
      });
    }
  }
  
  async handleTwitchPageLoad(tabId, tab) {
    // Notificar al content script que la página está lista
    try {
      await chrome.tabs.sendMessage(tabId, {action: 'page_ready'});
      // Guardar el último tabId de Twitch visto
      await chrome.storage.local.set({ last_twitch_tab_id: tabId });
    } catch (error) {
      // Es normal que falle si el content script no está listo aún
    }
  }
  
  async getStatus() {
    const alarms = await chrome.alarms.getAll();
    const storage = await chrome.storage.local.get([
      this.STORAGE_KEYS.TIMERS_ACTIVE,
      this.STORAGE_KEYS.CURRENT_STATE,
      this.STORAGE_KEYS.LAST_ACTION,
      this.STORAGE_KEYS.ORIGINAL_CHANNEL
    ]);
    
    const status = {
      active: storage[this.STORAGE_KEYS.TIMERS_ACTIVE] || false,
      state: storage[this.STORAGE_KEYS.CURRENT_STATE] || 'idle',
      lastAction: storage[this.STORAGE_KEYS.LAST_ACTION] || null,
      originalChannel: storage[this.STORAGE_KEYS.ORIGINAL_CHANNEL] || null,
      alarms: alarms.map(alarm => ({
        name: alarm.name,
        scheduledTime: alarm.scheduledTime,
        timeRemaining: alarm.scheduledTime - Date.now()
      }))
    };
    
    return status;
  }
  
  // Funciones auxiliares
  getRandomInterval(min, max, unit) {
    const value = Math.floor(Math.random() * (max - min + 1)) + min;
    
    switch (unit) {
      case 'minutes':
        return value * 60 * 1000;
      case 'hours':
        return value * 60 * 60 * 1000;
      default:
        return value;
    }
  }
  
  extractChannelFromUrl(url) {
    const match = url.match(/twitch\.tv\/([^\/\?]+)/);
    return match ? match[1] : null;
  }
  
  async handlePageLoaded(tab) {
    if (tab && tab.url && tab.url.includes('twitch.tv')) {
      const data = await chrome.storage.local.get([this.STORAGE_KEYS.TIMERS_ACTIVE]);
      
      if (!data[this.STORAGE_KEYS.TIMERS_ACTIVE]) {
        // Auto-iniciar timers cuando se carga Twitch
        await this.startTimers();
      }
    }
  }
}

// Inicializar el manager cuando se carga el service worker
const timerManager = new TwitchTimerManager();
