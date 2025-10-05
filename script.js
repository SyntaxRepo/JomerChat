document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selections ---
    const sidebar = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('collapse-btn');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const chatArea = document.getElementById('chat-area');
    const chatAreaContent = document.getElementById('chat-area-content');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatList = document.getElementById('chat-list');
    const modelSelector = document.getElementById('model-selector');
    const currentModelDisplay = document.getElementById('current-model-display');
    const currentModelName = document.getElementById('current-model-name');
    const modelList = document.getElementById('model-list');

    // --- State Management ---
    let chats = [];
    let activeChatId = null;
    let abortController = null;

    // --- AVAILABLE MODELS: Now an array of objects with model-specific parameters ---
    const availableModels = [
        { 
            name: 'qwen-3-coder-480b',
            params: { temperature: 0.7, top_p: 0.8, max_completion_tokens: 40000 }
        },
        { 
            name: 'qwen-3-235b-a22b-thinking-2507',
            params: { temperature: 0.6, top_p: 0.95, max_completion_tokens: 65536 }
        },
        { 
            name: 'gpt-oss-120b',
            params: { temperature: 1, top_p: 1, max_completion_tokens: 65536, reasoning_effort: "medium" }
        },
        { 
            name: 'qwen-3-32b',
            params: { temperature: 0.6, top_p: 0.95, max_completion_tokens: 16382 }
        },
        { 
            name: 'llama-3.3-70b',
            params: { temperature: 0.2, top_p: 1, max_completion_tokens: 2048 }
        }
    ];
    let selectedModel = availableModels[0];

    const welcomeMessageHTML = `
    <div class="welcome-message">
        <h1>Maayong Adlaw Kanimo Diha Badi</h1>
    </div>`;

    function resetInputUI() {
        userInput.disabled = false;
        sendBtn.classList.remove('stop-btn');
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        abortController = null;
        userInput.focus();
    }

    // --- Sidebar and Model Selector Logic ---
    function initializeSidebarCollapse() {
        const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
        if (isCollapsed) sidebar.classList.add('sidebar-collapsed');
        collapseBtn.addEventListener('click', () => {
            sidebar.classList.toggle('sidebar-collapsed');
            localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('sidebar-collapsed'));
        });
    }

    function initializeModelSelector() {
        modelList.innerHTML = '';
        availableModels.forEach(model => {
            const li = document.createElement('li');
            li.textContent = model.name;
            li.dataset.modelName = model.name; // Use a data attribute for the name
            modelList.appendChild(li);
        });

        const savedModelName = localStorage.getItem('jomer-chat-model') || selectedModel.name;
        updateModel(savedModelName);

        currentModelDisplay.addEventListener('click', () => {
            modelSelector.classList.toggle('open');
        });

        modelList.addEventListener('click', (e) => {
            if (e.target.tagName === 'LI') {
                updateModel(e.target.dataset.modelName);
                modelSelector.classList.remove('open');
            }
        });
        document.addEventListener('click', (e) => {
            if (!modelSelector.contains(e.target)) {
                modelSelector.classList.remove('open');
            }
        });
    }

    function updateModel(modelName) {
        const foundModel = availableModels.find(m => m.name === modelName) || availableModels[0];
        selectedModel = foundModel;
        currentModelName.textContent = selectedModel.name;
        localStorage.setItem('jomer-chat-model', selectedModel.name);
    }

    // --- Chat History Logic (No changes) ---
    function saveChats() {
        localStorage.setItem('jomer-chats', JSON.stringify(chats));
    }
    function loadChats() {
        const savedChats = localStorage.getItem('jomer-chats');
        if (savedChats) {
            chats = JSON.parse(savedChats);
            if (chats.length > 0) activeChatId = chats[0].id;
        }
    }
    function renderChatHistory() {
        chatList.innerHTML = '';
        if (chats.length === 0) return;
        chats.forEach(chat => {
            const li = document.createElement('li');
            li.className = `chat-item ${chat.id === activeChatId ? 'active' : ''}`;
            li.dataset.id = chat.id;
            li.innerHTML = `<span class="chat-item-title">${chat.title}</span><button class="chat-item-delete"><i class="fas fa-trash-alt"></i></button>`;
            li.addEventListener('click', (e) => {
                if (!e.target.closest('.chat-item-delete')) switchChat(chat.id);
            });
            li.querySelector('.chat-item-delete').addEventListener('click', () => deleteChat(chat.id));
            chatList.appendChild(li);
        });
    }
    function renderActiveChat() {
        chatAreaContent.innerHTML = '';
        if (!activeChatId) {
            chatAreaContent.innerHTML = welcomeMessageHTML;
            return;
        }
        const activeChat = chats.find(c => c.id === activeChatId);
        if (activeChat && activeChat.messages.length > 0) {
            activeChat.messages.forEach(msg => {
                if (msg.content !== 'thinking') displayMessage(msg.sender, msg.content);
            });
        } else {
            chatAreaContent.innerHTML = welcomeMessageHTML;
        }
    }
    function switchChat(chatId) {
        activeChatId = chatId;
        renderChatHistory();
        renderActiveChat();
    }
    function createNewChat() {
        const newChat = { id: Date.now(), title: 'New Chat', messages: [] };
        chats.unshift(newChat);
        activeChatId = newChat.id;
        saveChats();
        renderChatHistory();
        renderActiveChat();
    }
    function deleteChat(chatId) {
        chats = chats.filter(c => c.id !== chatId);
        saveChats();
        if (activeChatId === chatId) {
            activeChatId = chats.length > 0 ? chats[0].id : null;
            renderActiveChat();
        }
        renderChatHistory();
    }
    function addMessageToActiveChat(sender, content) {
        if (!activeChatId) createNewChat();
        const activeChat = chats.find(c => c.id === activeChatId);
        if (activeChat) {
            const lastMessage = activeChat.messages[activeChat.messages.length - 1];
            if (sender === 'ai' && lastMessage?.sender === 'ai' && lastMessage?.content === 'thinking') {
                lastMessage.content = content;
            } else {
                activeChat.messages.push({ sender, content });
            }
            if (activeChat.title === 'New Chat' && sender === 'user') {
                const newTitle = content.split('\n')[0].substring(0, 30);
                activeChat.title = newTitle.length < 30 ? newTitle : newTitle + '...';
                renderChatHistory();
            }
            saveChats();
        }
    }
    // --- Message and UI Functions (Simplified for brevity, your original detailed code is fine) ---
    function displayMessage(sender, content) {
        const welcome = document.querySelector('.welcome-message');
        if (welcome) welcome.remove();
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add(sender === 'user' ? 'user-message' : 'ai-message');
        if (sender === 'ai') {
            messageWrapper.innerHTML = `<span class="avatar">J</span><div class="message-content-wrapper"><div class="model-name-header">${selectedModel.name}</div><div class="message-text"><p>${content}</p></div></div>`;
        } else {
            messageWrapper.textContent = content;
        }
        chatAreaContent.appendChild(messageWrapper);
        chatArea.scrollTop = chatArea.scrollHeight;
    }
    function displayThinkingMessage() {
        const welcome = document.querySelector('.welcome-message');
        if (welcome) welcome.remove();
        const thinkingHTML = `<div class="thinking-indicator"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('ai-message');
        messageWrapper.innerHTML = `<span class="avatar">J</span><div class="message-content-wrapper"><div class="model-name-header">${selectedModel.name}</div><div class="message-text">${thinkingHTML}</div></div>`;
        chatAreaContent.appendChild(messageWrapper);
        chatArea.scrollTop = chatArea.scrollHeight;
        return messageWrapper;
    }

    // --- Main Send Function ---
    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        addMessageToActiveChat('user', message);
        displayMessage('user', message);
        userInput.value = '';
        userInput.disabled = true;
        sendBtn.classList.add('stop-btn');
        sendBtn.innerHTML = '<i class="fas fa-stop"></i>';
        abortController = new AbortController();

        const thinkingBubble = displayThinkingMessage();
        const streamingTextElement = thinkingBubble.querySelector('.message-text');

        let fullResponse = '';
        let isFirstToken = true;

        try {
            // --- DYNAMICALLY CREATE THE REQUEST BODY ---
            const requestBody = {
                model: selectedModel.name,
                messages: [{
                    "role": "system",
                    "content": "You are a helpful AI assistant."
                }, {
                    role: 'user',
                    content: message
                }],
                stream: true,
                ...selectedModel.params // Spread the model-specific parameters
            };

            const response = await fetch('/api/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal: abortController.signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(`API error (${response.status}): ${errorData?.error?.message || response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const token = decoder.decode(value);
                if (token) {
                    if (isFirstToken) {
                        streamingTextElement.innerHTML = '';
                        isFirstToken = false;
                    }
                    fullResponse += token;
                    streamingTextElement.textContent = fullResponse;
                    chatArea.scrollTop = chatArea.scrollHeight;
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Stream stopped by user.');
            } else {
                console.error('Error sending message to API:', error);
                fullResponse = `Sorry, I ran into a problem: ${error.message}`;
            }
        } finally {
            thinkingBubble.remove();
            if (fullResponse) {
                displayMessage('ai', fullResponse);
                addMessageToActiveChat('ai', fullResponse);
            }
            resetInputUI();
        }
    }

    // --- Event Listeners ---
    sendBtn.addEventListener('click', () => {
        if (sendBtn.classList.contains('stop-btn')) {
            abortController?.abort();
        } else {
            sendMessage();
        }
    });
    newChatBtn.addEventListener('click', createNewChat);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !userInput.disabled) {
            e.preventDefault();
            sendMessage();
        }
    });

    // --- Initial Load ---
    function initialize() {
        loadChats();
        initializeModelSelector();
        initializeSidebarCollapse();
        renderChatHistory();
        renderActiveChat();
    }

    initialize();
});
