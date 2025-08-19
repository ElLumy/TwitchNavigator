# 🎮 Twitch Auto-Navigator con IA

Una extensión de Chrome avanzada que automatiza la navegación en Twitch utilizando inteligencia artificial y temporizadores persistentes. Simula comportamiento humano natural para una experiencia de navegación automática inteligente.

## ✨ Características Principales

### 🔄 Navegación Automática Inteligente
- **Temporizador Principal**: Cambia de canal cada 3-6 horas (aleatorio)
- **IA de Selección**: Algoritmo inteligente para seleccionar canales de forma natural
- **Permanencia Variable**: Permanece 5-20 minutos en cada canal
- **Retorno Automático**: Regresa al canal original automáticamente

### 📂 Gestión de Pestañas
- **Apertura Automática**: Abre nuevas pestañas cada 1-3 horas
- **Cierre Inteligente**: Cierra pestañas automáticamente después de 3-7 minutos
- **Primer Plano**: Las pestañas se abren en primer plano para simular actividad real

### ⏱️ Temporizadores Persistentes
- **Funcionamiento en Segundo Plano**: Continúa funcionando aunque cierres Twitch
- **Resistente a Reinicios**: Los timers se restauran al reiniciar el navegador
- **Chrome Alarms**: Utiliza la API nativa de Chrome para máxima confiabilidad

### 🧠 Inteligencia Artificial
- **Modo Balanceado**: Mezcla canales populares y diversos
- **Modo Popular**: Prefiere streamers con más viewers
- **Modo Diverso**: Explora canales más pequeños
- **Modo Aleatorio**: Selección completamente aleatoria

## 🛠️ Instalación

### Método 1: Instalación Manual (Recomendado)

1. **Descargar el código**:
   - Clona este repositorio o descarga los archivos
   - Asegúrate de tener la carpeta `twitch-timer-extension` completa

2. **Abrir Chrome**:
   - Ve a `chrome://extensions/`
   - Activa el "Modo de desarrollador" (esquina superior derecha)

3. **Cargar la extensión**:
   - Haz clic en "Cargar extensión sin empaquetar"
   - Selecciona la carpeta `twitch-timer-extension`
   - La extensión aparecerá en tu lista de extensiones

4. **Verificar instalación**:
   - Deberías ver el ícono de la extensión en tu barra de herramientas
   - Haz clic en el ícono para abrir el panel de control

## 🚀 Uso

### Inicio Rápido

1. **Navega a Twitch**:
   - Ve a [twitch.tv](https://twitch.tv)
   - Entra a cualquier canal

2. **Activar la extensión**:
   - Haz clic en el ícono de la extensión
   - Presiona "Iniciar Navegación"
   - ¡Los temporizadores comenzarán automáticamente!

### Panel de Control

El popup de la extensión incluye:

- **🎛️ Control Principal**: Botón para iniciar/detener la navegación automática
- **⏱️ Temporizadores**: Visualización en tiempo real del tiempo restante
- **🚀 Acciones Forzadas**: Botones para ejecutar acciones inmediatamente
- **📊 Estado Actual**: Información sobre el estado de la extensión
- **⚙️ Configuración**: Opciones para personalizar el comportamiento
- **📝 Historial**: Registro de las últimas acciones realizadas

### Configuración Avanzada

#### Modos de IA:
- **Balanceado** (Recomendado): Mezcla inteligente de todos los tipos de canales
- **Preferir Populares**: Se enfoca en streamers con más viewers
- **Diverso**: Explora canales más pequeños y únicos
- **Completamente Aleatorio**: Selección puramente aleatoria

#### Opciones:
- **Auto-iniciar en Twitch**: Activa automáticamente al detectar Twitch
- **Notificaciones**: Muestra alertas visuales de las acciones

## 🔧 Funcionalidades Técnicas

### Arquitectura
- **Manifest V3**: Utiliza las últimas APIs de Chrome
- **Service Worker**: Manejo robusto de temporizadores en segundo plano
- **Content Scripts**: Interacción inteligente con el DOM de Twitch
- **Chrome Storage**: Persistencia de configuración y estado

### Algoritmos de IA
```javascript
// Ejemplo de selección inteligente de canales
selectChannelWithAI(channels) {
  const random = Math.random();
  
  if (random < 0.4) {
    return this.selectPopularChannel(channels);    // 40% - Populares
  } else if (random < 0.7) {
    return this.selectRandomChannel(channels);     // 30% - Aleatorio
  } else {
    return this.selectSmallerChannel(channels);    // 30% - Diversos
  }
}
```

### Detección de Elementos
La extensión detecta automáticamente:
- Canales en vivo en la barra lateral
- Elementos de navegación de Twitch
- Cambios dinámicos en el DOM
- Estado de carga de la página

## 🛡️ Privacidad y Seguridad

- **Sin Recopilación de Datos**: No enviamos información a servidores externos
- **Local Storage**: Toda la información se guarda localmente en tu navegador
- **Permisos Mínimos**: Solo solicitamos los permisos necesarios para funcionar
- **Código Abierto**: Puedes revisar todo el código fuente

## 🐛 Solución de Problemas

### Problemas Comunes

**La extensión no se activa:**
- Verifica que estés en twitch.tv
- Asegúrate de que la extensión esté habilitada
- Recarga la página de Twitch

**Los temporizadores no funcionan:**
- Verifica que Chrome tenga permisos para ejecutar en segundo plano
- Comprueba que no tengas bloqueadores que interfieran
- Prueba reiniciar Chrome

**No detecta canales:**
- Espera unos segundos para que cargue completamente la página
- Asegúrate de que haya canales en vivo en la barra lateral
- Prueba navegar al directorio de Twitch

### Resetear la Extensión

Si encuentras problemas persistentes:
1. Abre el popup de la extensión
2. Haz clic en "🔄 Reset"
3. Confirma la acción
4. La extensión se reiniciará con configuración por defecto

## 📋 Changelog

### v1.0.0 (Actual)
- ✅ Implementación inicial completa
- ✅ Temporizadores persistentes con Chrome Alarms
- ✅ Sistema de IA para selección de canales
- ✅ Interfaz de usuario moderna y responsiva
- ✅ Gestión automática de pestañas
- ✅ Historial de acciones
- ✅ Configuración personalizable
- ✅ Soporte completo para Manifest V3

## 🤝 Contribuir

¿Quieres mejorar la extensión? ¡Las contribuciones son bienvenidas!

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## ⚠️ Disclaimer

Esta extensión es para uso educativo y personal. Úsala responsablemente y respeta los términos de servicio de Twitch. Los desarrolladores no se hacen responsables del uso indebido de la extensión.

---

**Desarrollado con ❤️ para la comunidad de Twitch**

¿Tienes preguntas o sugerencias? ¡Abre un issue en GitHub!
