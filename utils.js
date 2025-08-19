// Utilidades y funciones de aleatoriedad para la extensión Twitch

class TwitchUtils {
  
  // Genera número aleatorio entre min y max (inclusivo)
  static randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  // Convierte minutos a milisegundos
  static minutesToMs(minutes) {
    return minutes * 60 * 1000;
  }
  
  // Convierte horas a milisegundos
  static hoursToMs(hours) {
    return hours * 60 * 60 * 1000;
  }
  
  // Genera intervalo aleatorio para cambio de canal (3-6 horas)
  static getRandomChannelSwitchInterval() {
    const hours = this.randomBetween(3, 6);
    return this.hoursToMs(hours);
  }
  
  // Genera tiempo aleatorio de permanencia en canal (5-20 minutos)
  static getRandomStayDuration() {
    const minutes = this.randomBetween(5, 20);
    return this.minutesToMs(minutes);
  }
  
  // Genera intervalo aleatorio para abrir pestañas (1-3 horas)
  static getRandomTabOpenInterval() {
    const hours = this.randomBetween(1, 3);
    return this.hoursToMs(hours);
  }
  
  // Genera tiempo aleatorio para mantener pestaña abierta (3-7 minutos)
  static getRandomTabOpenDuration() {
    const minutes = this.randomBetween(3, 7);
    return this.minutesToMs(minutes);
  }
  
  // Simula delay humano (100-500ms)
  static getHumanDelay() {
    return this.randomBetween(100, 500);
  }
  
  // Formatea tiempo restante para display
  static formatTimeRemaining(ms) {
    if (ms <= 0) return "00:00:00";
    
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Valida si estamos en una página de Twitch
  static isTwitchPage() {
    return window.location.hostname.includes('twitch.tv');
  }
  
  // Obtiene el canal actual desde la URL
  static getCurrentChannel() {
    const path = window.location.pathname;
    const match = path.match(/^\/([^\/]+)$/);
    return match ? match[1] : null;
  }
  
  // Simula comportamiento humano con IA básica
  static selectChannelWithAI(channels) {
    if (!channels || channels.length === 0) return null;
    
    // Lógica de IA simple: dar preferencia a diferentes tipos de canales
    const random = Math.random();
    
    if (random < 0.4) {
      // 40% - Preferir canales con más viewers (simular seguir tendencias)
      return this.selectPopularChannel(channels);
    } else if (random < 0.7) {
      // 30% - Selección completamente aleatoria
      return channels[this.randomBetween(0, channels.length - 1)];
    } else {
      // 30% - Preferir canales pequeños (simular diversidad)
      return this.selectSmallerChannel(channels);
    }
  }
  
  // Selecciona canal popular (por posición en lista)
  static selectPopularChannel(channels) {
    // Los primeros canales suelen tener más viewers
    const topChannelsCount = Math.min(5, channels.length);
    const selectedIndex = this.randomBetween(0, topChannelsCount - 1);
    return channels[selectedIndex];
  }
  
  // Selecciona canal más pequeño
  static selectSmallerChannel(channels) {
    // Los últimos canales suelen tener menos viewers
    const startIndex = Math.max(0, channels.length - 5);
    const selectedIndex = this.randomBetween(startIndex, channels.length - 1);
    return channels[selectedIndex];
  }
  
  // Log con timestamp
  static log(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[Twitch AI Navigator ${timestamp}] ${message}`, data || '');
  }
  
  // Manejo de errores
  static handleError(error, context = '') {
    this.log(`ERROR ${context}:`, error);
    console.error(error);
  }
}

// Exportar para uso en diferentes contextos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TwitchUtils;
} else if (typeof window !== 'undefined') {
  window.TwitchUtils = TwitchUtils;
}
