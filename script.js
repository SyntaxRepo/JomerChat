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
    const addAttachmentBtn = document.getElementById('add-attachment-btn');
    const attachmentMenu = document.getElementById('attachment-menu');
    const attachmentButtons = document.querySelectorAll('.attachment-menu button');
    const fileUploadInput = document.getElementById('file-upload-input');
    const modelSelector = document.getElementById('model-selector');
    const currentModelDisplay = document.getElementById('current-model-display');
    const currentModelName = document.getElementById('current-model-name');
    const modelList = document.getElementById('model-list');

    // --- State Management ---
    let chats = [];
    let activeChatId = null;
    let abortController = null;

    // --- AVAILABLE MODELS: Added the new model to the list ---
    const availableModels = [
        'qwen-3-coder-480b',
        'qwen-3-235b-a22b-thinking-2507' // <-- New model added
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
        if (isCollapsed) {
            sidebar.classList.add('sidebar-collapsed');
        }
        collapseBtn.addEventListener('click', () => {
            sidebar.classList.toggle('sidebar-collapsed');
            const isNowCollapsed = sidebar.classList.contains('sidebar-collapsed');
            localStorage.setItem('sidebar-collapsed', isNowCollapsed);
        });
    }

    function initializeModelSelector() {
        modelList.innerHTML = '';
        availableModels.forEach(model => {
            const li = document.createElement('li');
            li.textContent = model;
            li.dataset.model = model;
            modelList.appendChild(li);
        });
        const savedModel = localStorage.getItem('jomer-chat-model') || selectedModel;
        updateModel(savedModel);

        currentModelDisplay.addEventListener('click', () => {
            if (availableModels.length > 1) {
                 modelSelector.classList.toggle('open');
            }
        });

        modelList.addEventListener('click', (e) => {
            if (e.target.tagName === 'LI') {
                updateModel(e.target.dataset.model);
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
        // Ensure the selected model is actually in the available list
        selectedModel = availableModels.includes(modelName) ? modelName : availableModels[0];
        currentModelName.textContent = selectedModel;
        localStorage.setItem('jomer-chat-model', selectedModel);
    }

    // --- Chat History Logic ---
    function saveChats() {
        localStorage.setItem('jomer-chats', JSON.stringify(chats));
    }

    function loadChats() {
        const savedChats = localStorage.getItem('jomer-chats');
        if (savedChats) {
            chats = JSON.parse(savedChats);
            if (chats.length > 0) {
                activeChatId = chats[0].id;
            }
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
                if (e.target.closest('.chat-item-delete')) return;
                switchChat(chat.id);
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
                if (msg.content !== 'thinking') {
                    displayMessage(msg.sender, msg.content);
                }
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

    // --- Message and UI Functions (unchanged) ---
    function displayMessage(sender, content) {
        const welcome = document.querySelector('.welcome-message');
        if (welcome) welcome.remove();
        const messageWrapper = document.createElement('div');
        if (sender === 'user') {
            messageWrapper.classList.add('user-message');
            messageWrapper.textContent = content; // Simplified for this example
        } else { // AI Message
            messageWrapper.classList.add('ai-message');
            messageWrapper.innerHTML = `<span class="avatar">J</span>`;
            const messageContentWrapper = document.createElement('div');
            messageContentWrapper.className = 'message-content-wrapper';
            const modelNameHeader = document.createElement('div');
            modelNameHeader.className = 'model-name-header';
            modelNameHeader.textContent = selectedModel;
            const messageTextContainer = document.createElement('div');
            messageTextContainer.className = 'message-text';
            
            // Simplified rendering for brevity. Your original code with code block handling is fine.
            const p = document.createElement('p');
            p.textContent = content;
            messageTextContainer.appendChild(p);

            messageContentWrapper.appendChild(modelNameHeader);
            messageContentWrapper.appendChild(messageTextContainer);
            messageWrapper.appendChild(messageContentWrapper);
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
        messageWrapper.innerHTML = `<span class="avatar">J</span><div class="message-content-wrapper"><div class="model-name-header">${selectedModel}</div><div class="message-text">${thinkingHTML}</div></div>`;
        chatAreaContent.appendChild(messageWrapper);
        chatArea.scrollTop = chatArea.scrollHeight;
        return messageWrapper;
    }

    // --- Main Send Function and Event Listeners ---
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
            // Note: The parameters being sent match the new model's example
            const response = await fetch('/api/proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [{
                        "role": "system",
                        "content": "You are a helpful AI assistant."
                    }, {
                        role: 'user',
                        content: message
                    }],
                    stream: true,
                    temperature: 0.6,
                    top_p: 0.95,
                    max_completion_tokens: 65536
                }),
                signal: abortController.signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const errorMessage = errorData?.error?.message || response.statusText;
                throw new Error(`API error (${response.status}): ${errorMessage}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const token = chunk;

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
                if (!fullResponse) {
                    thinkingBubble.remove();
                    resetInputUI();
                    return;
                }
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

    sendBtn.addEventListener('click', () => {
        if (sendBtn.classList.contains('stop-btn')) {
            if (abortController) {
                abortController.abort();
            }
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
