// Content Script para interacción con DOM de Twitch

class TwitchNavigator {
  constructor() {
    this.isNavigating = false;
    this.originalChannel = null;
    this.observerActive = false;
    this.maxRetries = 3;
    this.sideNavSelectors = [
      'a[data-a-id="side-nav-card"]',
      'a[data-test-selector="followed-channel"], a[data-test-selector="side-nav-card"]',
      '[data-a-target="side-nav-live-channels"] a',
      'nav a[href^="/"][href*="twitch.tv"], nav a[href^="/"]'
    ];
    
    this.init();
  }
  
  async init() {
    try {
      // Verificar que estamos en Twitch
      if (!window.location.hostname.includes('twitch.tv')) {
        return;
      }
      
      TwitchUtils.log('Content script iniciado en Twitch');
      
      // Configurar listeners
      this.setupMessageListener();
      
      // Notificar al background que la página está cargada
      await this.notifyPageLoaded();
      
      // Observar cambios en el DOM
      this.setupDOMObserver();
      
    } catch (error) {
      TwitchUtils.handleError(error, 'init');
    }
  }
  
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Mantener canal abierto para respuestas asíncronas
    });
  }
  
  async handleMessage(message, sender, sendResponse) {
    try {
      TwitchUtils.log(`Mensaje recibido: ${message.action}`);
      
      switch (message.action) {
        case 'switch_channel':
          await this.switchToRandomChannel();
          sendResponse({success: true});
          break;
          
        case 'return_to_channel':
          await this.returnToChannel(message.channel);
          sendResponse({success: true});
          break;
          
        case 'get_channels':
          const channels = await this.getAvailableChannels();
          sendResponse({channels});
          break;
          
        case 'page_ready':
          sendResponse({ready: true});
          break;
          
        default:
          sendResponse({error: 'Acción no reconocida'});
      }
    } catch (error) {
      TwitchUtils.handleError(error, 'handleMessage');
      sendResponse({error: error.message});
    }
  }
  
  async notifyPageLoaded() {
    try {
      await chrome.runtime.sendMessage({
        action: 'page_loaded',
        url: window.location.href,
        channel: TwitchUtils.getCurrentChannel()
      });
    } catch (error) {
      // Es normal que falle si el background script no está listo
      TwitchUtils.log('No se pudo notificar carga de página');
    }
  }
  
  setupDOMObserver() {
    if (this.observerActive) return;
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Verificar si se cargaron nuevos elementos de navegación
          this.checkForNavigationElements();
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    this.observerActive = true;
    TwitchUtils.log('Observador DOM configurado');
  }
  
  checkForNavigationElements() {
    // Verificar si los elementos de navegación están disponibles
    const sideNavElement = document.querySelector('[data-a-target="side-nav-live-channels"], nav[aria-label="Seguidores"], nav[aria-label*="Canales"]');
    if (sideNavElement && !sideNavElement.hasAttribute('data-navigator-ready')) {
      sideNavElement.setAttribute('data-navigator-ready', 'true');
      TwitchUtils.log('Elementos de navegación detectados');
    }
  }
  
  async getAvailableChannels() {
    const retryCount = 0;
    return this.getChannelsWithRetry(retryCount);
  }
  
  async getChannelsWithRetry(retryCount) {
    try {
      // Buscar canales en la barra lateral
      const channelSelectors = [
        '[data-a-target="side-nav-card-live"]',
        '[data-a-target="side-nav-live-channels"] a[data-a-target="side-nav-card"]',
        'a[data-a-id="side-nav-card"]',
        'a[data-test-selector="followed-channel"], a[data-test-selector="side-nav-card"]',
        'nav a[href^="/"]',
        '[data-test-selector="live-channel-card"]'
      ];
      
      let channels = [];
      
      for (const selector of channelSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          elements.forEach(element => {
            const channelData = this.extractChannelData(element);
            if (channelData) {
              channels.push(channelData);
            }
          });
          break; // Si encontramos canales con un selector, no probar los otros
        }
      }
      
      // Si no encontramos canales, buscar en el directorio
      if (channels.length === 0) {
        channels = await this.getChannelsFromDirectory();
      }
      
      TwitchUtils.log(`Encontrados ${channels.length} canales`);
      return channels;
      
    } catch (error) {
      if (retryCount < this.maxRetries) {
        TwitchUtils.log(`Reintentando obtener canales (${retryCount + 1}/${this.maxRetries})`);
        await this.delay(1000 * (retryCount + 1));
        return this.getChannelsWithRetry(retryCount + 1);
      } else {
        TwitchUtils.handleError(error, 'getChannelsWithRetry');
        return [];
      }
    }
  }
  
  extractChannelData(element) {
    try {
      let channelName = null;
      let href = null;
      
      // Intentar obtener el nombre del canal de diferentes formas
      const linkElement = element.tagName === 'A' ? element : element.querySelector('a');
      
      if (linkElement) {
        // Normalizar href a URL absoluta
        href = linkElement.href || linkElement.getAttribute('href');
        if (href && href.startsWith('/')) {
          href = `https://www.twitch.tv${href}`;
        }
        const urlMatch = href ? href.match(/twitch\.tv\/([^\/\?]+)/) : null;
        if (urlMatch) {
          channelName = urlMatch[1];
        }
      }
      
      // Buscar en atributos de texto
      if (!channelName) {
        const textElements = element.querySelectorAll('[data-a-target*="channel"], [title], .tw-title');
        for (const textEl of textElements) {
          const text = textEl.textContent?.trim() || textEl.getAttribute('title');
          if (text && !text.includes(' ') && text.length > 2) {
            channelName = text;
            break;
          }
        }
      }
      
      if (channelName && href) {
        return {
          name: channelName,
          href: href,
          element: element
        };
      }
      
      return null;
    } catch (error) {
      TwitchUtils.handleError(error, 'extractChannelData');
      return null;
    }
  }
  
  async getChannelsFromDirectory() {
    try {
      // Si estamos en el directorio, buscar canales allí
      const directoryChannels = document.querySelectorAll('[data-target="directory-game-card"], .tw-card, .game-card');
      const channels = [];
      
      directoryChannels.forEach((element, index) => {
        if (index < 20) { // Limitar para no sobrecargar
          const linkElement = element.querySelector('a');
          if (linkElement && linkElement.href.includes('twitch.tv/')) {
            const channelData = this.extractChannelData(element);
            if (channelData) {
              channels.push(channelData);
            }
          }
        }
      });
      
      return channels;
    } catch (error) {
      TwitchUtils.handleError(error, 'getChannelsFromDirectory');
      return [];
    }
  }
  
  async switchToRandomChannel() {
    if (this.isNavigating) {
      TwitchUtils.log('Ya hay una navegación en progreso');
      return;
    }
    
    try {
      this.isNavigating = true;
      
      // Guardar canal actual
      this.originalChannel = TwitchUtils.getCurrentChannel();
      TwitchUtils.log(`Canal original: ${this.originalChannel}`);
      
      // Obtener canales disponibles
      let channels = await this.getAvailableChannels();
      
      // Deduplicar por nombre
      const seen = new Set();
      channels = channels.filter(ch => {
        const key = ch.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      
      // Excluir el canal actual
      if (this.originalChannel) {
        const currentLower = this.originalChannel.toLowerCase();
        channels = channels.filter(ch => ch.name.toLowerCase() !== currentLower);
      }
      
      if (channels.length === 0) {
        TwitchUtils.log('No se encontraron canales disponibles');
        return;
      }
      
      // Seleccionar canal usando IA
      const selectedChannel = TwitchUtils.selectChannelWithAI(channels);
      
      if (!selectedChannel) {
        TwitchUtils.log('No se pudo seleccionar un canal');
        return;
      }
      
      TwitchUtils.log(`Canal seleccionado: ${selectedChannel.name}`);
      
      // Navegar al canal
      await this.navigateToChannel(selectedChannel);
      
    } catch (error) {
      TwitchUtils.handleError(error, 'switchToRandomChannel');
    } finally {
      this.isNavigating = false;
    }
  }
  
  async navigateToChannel(channelData) {
    try {
      // Simular comportamiento humano
      await this.delay(TwitchUtils.getHumanDelay());
      
      // Método 1: Click en el elemento si está visible
      if (channelData.element && this.isElementVisible(channelData.element)) {
        TwitchUtils.log(`Haciendo click en elemento del canal: ${channelData.name}`);
        const before = location.href;
        this.simulateHumanClick(channelData.element);
        // Fallback: si la URL no cambió en 2s, navegar por URL
        setTimeout(() => {
          if (location.href === before) {
            window.location.href = channelData.href;
          }
        }, 2000);
        return;
      }
      
      // Método 2: Navegación directa por URL
      TwitchUtils.log(`Navegando directamente a: ${channelData.href}`);
      window.location.href = channelData.href;
      
    } catch (error) {
      TwitchUtils.handleError(error, 'navigateToChannel');
    }
  }
  
  async returnToChannel(channelName) {
    if (!channelName || this.isNavigating) {
      return;
    }
    
    try {
      this.isNavigating = true;
      
      TwitchUtils.log(`Regresando al canal original: ${channelName}`);
      
      // Simular delay humano
      await this.delay(TwitchUtils.getHumanDelay());
      
      // Navegar al canal original
      const channelUrl = `https://www.twitch.tv/${channelName}`;
      window.location.href = channelUrl;
      
    } catch (error) {
      TwitchUtils.handleError(error, 'returnToChannel');
    } finally {
      this.isNavigating = false;
    }
  }
  
  simulateHumanClick(element) {
    try {
      // Simular movimiento de mouse y click más natural
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      
      // Eventos de mouse para simular interacción humana
      const events = ['mouseenter', 'mouseover', 'mousedown', 'mouseup', 'click'];
      
      events.forEach((eventType, index) => {
        setTimeout(() => {
          const event = new MouseEvent(eventType, {
            bubbles: true,
            cancelable: true,
            clientX: x + Math.random() * 4 - 2, // Pequeña variación para simular imprecisión humana
            clientY: y + Math.random() * 4 - 2,
            button: 0
          });
          element.dispatchEvent(event);
        }, index * 50);
      });
      
    } catch (error) {
      // Fallback: click simple
      element.click();
    }
  }
  
  isElementVisible(element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      rect.top < window.innerHeight &&
      rect.bottom > 0
    );
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TwitchNavigator();
  });
} else {
  new TwitchNavigator();
}
