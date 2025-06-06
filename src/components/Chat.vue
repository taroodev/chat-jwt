<template>
    <div id="voice-widget">
      <button id="toggleWidget" class="widget-fab" aria-label="Abrir chat">
        <i class="fa-solid fa-comment-dots"></i>
        <span class="fab-text">Agent</span>
      </button>
      
      <div id="chatPanel" class="chat-panel hidden" aria-label="Panel de chat">
        <!-- Panel de Login -->
        <div id="loginPanel" class="login-panel">
          <div class="login-header">
            <h2>Iniciar Sesión</h2>
            <button id="closeWidget" aria-label="Cerrar chat">✖</button>
          </div>
          <div class="login-form">
            <div class="form-group">
              <label for="userId">Usuario:</label>
              <input id="userId" type="text" placeholder="Ingresa tu ID de usuario" />
            </div>
            <div class="form-group">
              <label for="rawToken">contraseña:</label>
              <input id="rawToken" type="password" placeholder="Ingresa tu token" />
            </div>
            <button id="loginBtn" class="login-btn">Iniciar Sesión</button>
            <div id="loginError" class="error-msg hidden"></div>
          </div>
        </div>

        <!-- Panel de Chat (oculto inicialmente) -->
        <div id="chatMainPanel" class="chat-main-panel hidden">
          <div class="chat-header">
            <h2>Agente ClassRoom</h2>
            <div class="header-actions">
              <span id="userInfo" class="user-info"></span>
              <button id="logoutBtn" class="logout-btn" title="Cerrar sesión">
                <img src="https://img.icons8.com/ios-filled/24/ffffff/logout-rounded-left.png" alt="Cerrar sesión" class="logout-icon" />
              </button>
              <button id="closeWidgetChat" aria-label="Cerrar chat">✖</button>
            </div>
          </div>
          <div id="messages" class="messages"></div>
          <div id="suggestions" class="suggestions">
            <button class="suggest-btn">¿Necesitas información sobre los cursos?</button>
            <button class="suggest-btn">¿Quieres información tus datos academicos?</button>
            <button class="suggest-btn">Estado de titulo</button>
          </div>
          <div class="chat-controls">
            <input id="textoInput" type="text" placeholder="Escribe tu mensaje…" autocomplete="off" />
            <button id="btnEnviar" class="ctrl-btn" aria-label="Enviar">
              <img src="/src/assets/send.png" alt="Enviar" class="ctrl-icon" />
            </button>
            <button id="btnHablar" class="ctrl-btn" aria-label="Hablar">
              <img src="/src/assets/micro.png" alt="Hablar" class="ctrl-icon" />
            </button>
          </div>
        </div>
      </div>
    </div>
</template>

<script>
import microIcon from '../assets/micro.png';
import sendIcon from '../assets/send.png';

export default {
  name: 'VoiceChatWidget',
  mounted() {
    
    fetch('https://voiceai-2sel.onrender.com/ping').catch(() => {});

    const $ = (s) => this.$el.querySelector(s);
    const toggle = $('#toggleWidget'),
          panel  = $('#chatPanel'),
          loginPanel = $('#loginPanel'),
          chatMainPanel = $('#chatMainPanel');
    
    const close = $('#closeWidget'),
          closeChatPanel = $('#closeWidgetChat');
    
    // Elementos de login
    const userIdInput = $('#userId'),
          rawTokenInput = $('#rawToken'),
          loginBtn = $('#loginBtn'),
          loginError = $('#loginError');
    
    // Elementos de chat
    const box = $('#messages'),
          sug = $('#suggestions'),
          input = $('#textoInput'),
          send = $('#btnEnviar'),
          mic = $('#btnHablar'),
          userInfo = $('#userInfo'),
          logoutBtn = $('#logoutBtn');

    // Variables de estado
    let typing = null,
        sugHidden = false,
        jwtToken = null,
        currentUserId = null;

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.classList.contains('hidden')) {
        closeChat();
      }
    });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = SpeechRecognition ? new SpeechRecognition() : null;
    if (rec) {
      rec.lang = 'es-ES';
      rec.interimResults = false;
    }

    // Funciones de utilidad
    const addMsg = (txt, cls) => {
      const p = document.createElement('p');
      p.textContent = txt;
      p.className = cls;
      box.appendChild(p);
      box.scrollTop = box.scrollHeight;
      return p;
    };

    // Reemplazar las imágenes de los botones por referencias importadas
    send.innerHTML = `<img src="${sendIcon}" alt="Enviar" class="ctrl-icon" />`;
    mic.innerHTML = `<img src="${microIcon}" alt="Hablar" class="ctrl-icon" />`;

    const micBusy = (busy) => {
      mic.disabled = busy;
      if (busy) {
        mic.innerHTML = '<span class="voice-spinner"></span>';
      } else {
        mic.innerHTML = `<img src="${microIcon}" alt="Hablar" class="ctrl-icon" />`;
      }
    };

    const hideSug = () => {
      if (!sugHidden) {
        sug.style.display = 'none';
        sugHidden = true;
      }
    };

    const showError = (message) => {
      loginError.textContent = message;
      loginError.classList.remove('hidden');
    };

    const hideError = () => {
      loginError.classList.add('hidden');
    };

    const closeChat = () => {
      panel.classList.add('hidden');
      toggle.classList.remove('hidden');
    };

    const logout = () => {
      jwtToken = null;
      currentUserId = null;
      userIdInput.value = '';
      rawTokenInput.value = '';
      box.innerHTML = '';
      sug.style.display = 'block';
      sugHidden = false;
      chatMainPanel.classList.add('hidden');
      loginPanel.classList.remove('hidden');
      hideError();
    };

    // Función de autenticación
    const authenticate = async (userId, rawToken) => {
      try {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Autenticando...';
        hideError();

        console.log('Enviando datos de login:', { user_id: userId, raw_token: rawToken });

        // Cambiar esta URL por la de tu backend de autenticación
        const response = await fetch('https://lang-graph.onrender.com/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            raw_token: rawToken
          }),
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        // Obtener el texto de la respuesta primero
        const responseText = await response.text();
        console.log('Response text:', responseText);

        if (!response.ok) {
          // Intentar parsear como JSON si hay contenido
          let errorMessage = ` el usuario o contraseña no son validos ${response.status}`;
          if (responseText) {
            try {
              const errorData = JSON.parse(responseText);
              errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (parseError) {
              // Si no es JSON válido, usar el texto tal como está
              errorMessage = responseText || errorMessage;
            }
          }
          throw new Error(errorMessage);
        }

        // Verificar si hay contenido antes de parsear JSON
        if (!responseText) {
          throw new Error('El servidor devolvió una respuesta vacía');
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          throw new Error('La respuesta del servidor no es JSON válido: ' + responseText);
        }

        // Verificar que se recibió el token
        jwtToken = data.token || data.jwt_token || data.access_token;
        if (!jwtToken) {
          throw new Error('No se recibió token de autenticación. Respuesta: ' + JSON.stringify(data));
        }

        currentUserId = userId;
        
        // Mostrar panel de chat
        loginPanel.classList.add('hidden');
        chatMainPanel.classList.remove('hidden');
        userInfo.textContent = `Usuario: ${userId}`;
        
        // Mensaje de bienvenida
        addMsg(`Secretaria: ¡Hola! ${userId} Has iniciado sesión correctamente. ¿En qué puedo ayudarte?`, 'bot-msg');
        input.focus();

        console.log('Login exitoso, token recibido:', jwtToken.substring(0, 20) + '...');

      } catch (error) {
        console.error('Error en authenticate:', error);
        showError(`Error: ${error.message}`);
      } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Iniciar Sesión';
      }
    };

    // Event listeners
    toggle.addEventListener('click', () => {
      panel.classList.remove('hidden');
      toggle.classList.add('hidden');
      
      // Mostrar panel de login si no está autenticado
      if (!jwtToken) {
        loginPanel.classList.remove('hidden');
        chatMainPanel.classList.add('hidden');
        userIdInput.focus();
      } else {
        loginPanel.classList.add('hidden');
        chatMainPanel.classList.remove('hidden');
        input.focus();
      }
    });

    close.addEventListener('click', closeChat);
    closeChatPanel.addEventListener('click', closeChat);

    loginBtn.addEventListener('click', () => {
      const userId = userIdInput.value.trim();
      const rawToken = rawTokenInput.value.trim();
      
      if (!userId || !rawToken) {
        showError('Por favor, completa todos los campos');
        return;
      }
      
      authenticate(userId, rawToken);
    });

    // Login con Enter
    [userIdInput, rawTokenInput].forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          loginBtn.click();
        }
      });
    });

    logoutBtn.addEventListener('click', logout);

    sug.addEventListener('click', (e) => {
      if (e.target.classList.contains('suggest-btn')) {
        sendText(e.target.textContent);
        hideSug();
      }
    });

    send.addEventListener('click', () => {
      const t = input.value.trim();
      if (t) sendText(t);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') send.click();
    });

    mic.addEventListener('click', () => {
      if (!rec) return alert('Tu navegador no soporta reconocimiento de voz');
      micBusy(true);
      rec.start();
    });

    if (rec) {
      rec.addEventListener('result', (e) => {
        const txt = [...e.results].map((r) => r[0].transcript).join('');
        sendText(txt);
      });
      rec.addEventListener('end', () => micBusy(false));
      rec.addEventListener('error', () => micBusy(false));
    }

    // Función para enviar mensajes (modificada para incluir JWT)
    async function sendText(texto) {
      if (!jwtToken) {
        alert('Sesión expirada. Por favor, inicia sesión nuevamente.');
        logout();
        return;
      }
      
      addMsg(`Tú: "${texto}"`, 'user-msg');
      input.value = '';
      typing = addMsg('Secretaria está escribiendo…', 'bot-msg');
      hideSug();
      
      try {
        console.log('Enviando mensaje:', { message: texto, user_id: currentUserId });
        
        // Cambiar esta URL por la de tu backend de chat
        const res = await fetch('https://crm-agent.onrender.com', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`
          },
          body: JSON.stringify({ 
            message: texto,
            user_id: currentUserId 
          }),
        });
        
        console.log('Chat response status:', res.status);
        
        if (res.status === 401) {
          throw new Error('Sesión expirada');
        }
        
        // Obtener texto de respuesta primero
        const responseText = await res.text();
        console.log('Chat response text:', responseText);
        
        if (!res.ok) {
          let errorMessage = `Error ${res.status}`;
          if (responseText) {
            try {
              const errorData = JSON.parse(responseText);
              errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (parseError) {
              errorMessage = responseText || errorMessage;
            }
          }
          throw new Error(errorMessage);
        }
        
        // Verificar si hay contenido antes de parsear JSON
        if (!responseText) {
          throw new Error('El servidor devolvió una respuesta vacía');
        }
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          throw new Error('La respuesta del chat no es JSON válido: ' + responseText);
        }
        
        const respuesta = data.reply || data.respuesta || data.response || data.message || 'Sin respuesta del servidor';
    typing.textContent = `Secretaria: "${respuesta}"`;
        
      } catch (err) {
        console.error('Error en sendText:', err);
        if (err.message === 'Sesión expirada') {
          typing.textContent = '❌ Sesión expirada. Por favor, inicia sesión nuevamente.';
          setTimeout(() => logout(), 2000);
        } else {
          typing.textContent = `❌ Error: ${err.message}`;
        }
      }
    }
  },
};
</script>

<style>
:root {
  --color-bg: #0e0f11;              
  --color-panel: rgba(32, 33, 36, 0.78); 
  --color-primary: #6c63ff;           
  --color-primary-hover: #b6b5bf;
  --color-user-bubble: var(--color-primary);
  --color-bot-bubble: #ffffff; 
  --text-bright: #f5f5f5;
  --text-muted: #a1a1aa;
  --radius: 1rem;
  --radius-lg: 1.5rem;
}

#voice-widget {
  position: fixed;
  bottom: 1.75rem;
  right: 1.75rem;
  z-index: 9999;
  color: var(--text-bright);
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.widget-fab {
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0 1.25rem;
  height: 54px;
  border-radius: 27px;
  background: #2d2d2d;            
  color: #fff;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
  transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
}

.widget-fab:hover {
  transform: translateY(-3px);
  background: #4a4a4a;                    
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.6);
}

.widget-fab i,
.widget-fab .fab-text {
  font-size: 1.05rem;
  font-weight: 600;
}

.widget-fab::after {
  content: '';
  position: absolute;
  right: 22px;
  bottom: -7px;
  border: 7px solid transparent;
  border-top-color: #c2c2c2;      
}

.chat-panel {
  position: absolute;
  bottom: 74px;
  right: 0;
  width: clamp(300px, 85vw, 420px);
  height: clamp(480px, 70vh, 640px);
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  overflow: hidden;
  background: #1e1e1e;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
  isolation: isolate;
}


.logout-icon {
  width: 22px;
  height: 22px;
  display: inline-block;
  vertical-align: middle;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.12));
}

.chat-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: radial-gradient(ellipse at top left,
              rgba(80, 80, 90, 0.25) 0%,
              rgba(20, 20, 24, 0.35) 35%,
              rgba(10, 10, 12, 0.6) 100%);
}

/* Estilos del panel de login */
.login-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.login-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.35rem;
  background: linear-gradient(to right, #202124 0%, #18181b 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.login-header h2 {
  font-size: 1.3rem;
  font-weight: 600;
  color: white;
}

.login-header button {
  all: unset;
  cursor: pointer;
  color: rgb(167, 164, 167);
  font-size: 1.2rem;
  line-height: 1;
  transition: opacity 0.2s ease;
}

.login-header button:hover { 
  opacity: 0.65; 
}

.login-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2rem 1.5rem;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  color: var(--text-bright);
  font-size: 0.9rem;
  font-weight: 500;
}

.form-group input {
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  background: #1a1b1e;
  color: var(--text-bright);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  outline: none;
  transition: border 0.25s ease, background 0.25s ease;
}

.form-group input::placeholder { 
  color: var(--text-muted); 
}

.form-group input:focus {
  background: #1f2024;
  border-color: var(--color-primary);
}

.login-btn {
  all: unset;
  cursor: pointer;
  text-align: center;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  font-weight: 600;
  background: var(--color-primary);
  color: white;
  border-radius: 12px;
  transition: background 0.25s ease, transform 0.2s ease;
}

.login-btn:hover:not(:disabled) {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.error-msg {
  color: #ff4757;
  font-size: 0.85rem;
  text-align: center;
  padding: 0.5rem;
  background: rgba(255, 71, 87, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(255, 71, 87, 0.3);
}

/* Panel principal del chat */
.chat-main-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.35rem;
  background: linear-gradient(to right, #202124 0%, #18181b 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.chat-header h2 {
  font-size: 1.3rem;
  font-weight: 600;
  color: white;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-info {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.logout-btn {
  all: unset;
  cursor: pointer;
  font-size: 1rem;
  color: rgb(167, 164, 167);
  transition: opacity 0.2s ease;
}

.logout-btn:hover {
  opacity: 0.65;
}

.chat-header button {
  all: unset;
  cursor: pointer;
  color: rgb(167, 164, 167);
  font-size: 1.2rem;
  line-height: 1;
  transition: opacity 0.2s ease;
}

.chat-header button:hover { 
  opacity: 0.65; 
}

.messages {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  scrollbar-width: thin;
  scrollbar-color: grey transparent;
}

.messages::-webkit-scrollbar { width: 6px; }
.messages::-webkit-scrollbar-track { background: transparent; }
.messages::-webkit-scrollbar-thumb { background: grey; border-radius: 3px; }

.messages p {
  margin: 0;
  padding: 0.55rem 0.9rem;
  max-width: 88%;
  line-height: 1.45;
  word-wrap: break-word;
  border-radius: var(--radius);
}

.user-msg {
  align-self: flex-end;
  background: var(--color-user-bubble);
  color: #fff;
  border-bottom-right-radius: 0;
}

.bot-msg {
  align-self: flex-start;
  background: #ffffff; 
  color: #0e0f11;       
  backdrop-filter: none; 
  border-bottom-left-radius: 0;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.9rem 1rem;
  background: rgba(20, 20, 24, 0.9);
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.suggest-btn {
  all: unset;
  cursor: pointer;
  padding: 0.45rem 0.95rem;
  border-radius: 9999px;
  font-size: 0.85rem;
  background: rgba(255, 255, 255, 0.05);
  color: white;
  transition: background 0.25s ease, color 0.25s ease;
}

.suggest-btn:hover {
  background: var(--color-primary);
  color: #fff;
}

.chat-controls {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.85rem 1rem;
  background: rgba(20, 20, 24, 0.9);
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.chat-controls input {
  flex: 1;
  padding: 0.60rem 0.90rem;
  font-size: 0.9rem;
  background: #1a1b1e;
  color: rgb(121, 121, 121);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 15px;
  outline: none;
  transition: border 0.25s ease, background 0.25s ease;
}

.chat-controls input::placeholder { 
  color: var(--text-muted); 
}

.chat-controls input:focus {
  background: #1f2024;
  border-color: gray;
}

.ctrl-btn {
  all: unset;
  cursor: pointer;
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  font-size: 1.1rem;
  border-radius: 30%;
  background: rgb(35, 34, 34);
  color: #fff;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.ctrl-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
}

.ctrl-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.hidden { 
  display: none !important; 
}

.ctrl-icon {
  width: 1.5rem;
  height: 1.5rem;
  max-width: 100%;
  max-height: 100%;
  display: block;
  object-fit: contain;
}

@media (max-width: 480px) {
  .chat-panel {
    width: 100vw;
    height: 100vh;
    right: 0;
    bottom: 0;
    border-radius: 0;
  }
  
  #voice-widget {
    right: 1rem;
    bottom: 1rem;
    transform: scale(0.9);
  }
  
  .widget-fab::after {
    display: none;
  }
  
  .messages {
    max-height: calc(100vh - 230px); 
  }
  
  .chat-header h2 {
    font-size: 1.1rem;
  }
  
  .chat-controls input {
    font-size: 0.8rem;
    padding: 0.5rem 0.75rem;
  }
  
  .suggest-btn {
    font-size: 0.75rem;
  }
  
  .user-info {
    font-size: 0.7rem;
  }
}
</style>

