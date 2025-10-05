// script.js (Final, Strict Logic for Conditional Bubbles)

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

    const availableModels = [
        'z-ai/glm-4.6', 
        'anthropic/claude-sonnet-4.5', 
        'google/gemini-2.5-flash-lite-preview-09-2025', 
        'openai/gpt-5-nano', 
        'openai/chatgpt-4o-latest', 
        'openai/gpt-5',
        'deepseek/deepseek-chat-v3.1',
        'deepseek/deepseek-chat-v3-0324:free', 
        'google/gemini-2.5-pro', 
        'google/gemini-2.5-flash-lite', 
        'google/gemma-2-9b-it'
    ];
    let selectedModel = availableModels[0];

    const welcomeMessageHTML = `
        <div class="welcome-message">
            <h1>Good morning, Syntax jojohn</h1>
        </div>`;
    
    function resetInputUI() {
        userInput.disabled = false;
        sendBtn.classList.remove('stop-btn');
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        abortController = null;
        userInput.focus();
    }

    // --- Sidebar and Model Selector Logic (unchanged) ---
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
            modelSelector.classList.toggle('open');
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
        selectedModel = modelName;
        currentModelName.textContent = modelName;
        localStorage.setItem('jomer-chat-model', modelName);
    }

    // --- Chat History Logic (unchanged) ---
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

    // --- Message and UI Functions ---
    function displayMessage(sender, content) {
        const welcome = document.querySelector('.welcome-message');
        if (welcome) welcome.remove();

        const messageWrapper = document.createElement('div');
        
        if (sender === 'user') {
            messageWrapper.classList.add('user-message');
            if (content.startsWith('data:image')) {
                messageWrapper.innerHTML = `<img src="${content}" alt="Uploaded Image">`;
            } else if (content.startsWith('[File]')) {
                const fileName = content.substring(7);
                messageWrapper.innerHTML = `<div class="file-preview"><i class="fas fa-file-alt"></i><span>${fileName}</span></div>`;
            } else {
                messageWrapper.textContent = content;
            }
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
            
            // --- NEW, SIMPLIFIED LOGIC START ---

            const createPlainText = (text, container) => {
                const trimmedText = text.trim();
                if (!trimmedText) return;
                const p = document.createElement('p');
                p.textContent = trimmedText;
                container.appendChild(p);
            };
            
            const createTextBubble = (text, container) => {
                const trimmedText = text.trim();
                if (!trimmedText) return;
                const bubble = document.createElement('div');
                bubble.className = 'formatted-content-container';
                const header = document.createElement('div');
                header.className = 'content-header';
                const langTag = document.createElement('span');
                langTag.className = 'language-tag';
                langTag.textContent = 'Text';
                const copyBtn = document.createElement('button');
                copyBtn.className = 'copy-content-btn';
                copyBtn.title = 'Copy text';
                copyBtn.innerHTML = '<i class="far fa-copy"></i>';
                copyBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(trimmedText);
                    copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(() => copyBtn.innerHTML = '<i class="far fa-copy"></i>', 2000);
                });
                header.appendChild(langTag);
                header.appendChild(copyBtn);
                const textElement = document.createElement('div');
                textElement.className = 'content-text';
                textElement.textContent = trimmedText;
                bubble.appendChild(header);
                bubble.appendChild(textElement);
                container.appendChild(bubble);
            };

            const createCodeBubble = (language, code, container) => {
                const codeContainer = document.createElement('div');
                codeContainer.className = 'formatted-content-container';
                const header = document.createElement('div');
                header.className = 'content-header';
                const langTag = document.createElement('span');
                langTag.className = 'language-tag';
                langTag.textContent = language || 'text';
                const copyBtn = document.createElement('button');
                copyBtn.className = 'copy-content-btn';
                copyBtn.title = 'Copy code';
                copyBtn.innerHTML = '<i class="far fa-copy"></i>';
                copyBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(code.trim());
                    copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(() => copyBtn.innerHTML = '<i class="far fa-copy"></i>', 2000);
                });
                header.appendChild(langTag);
                header.appendChild(copyBtn);
                const pre = document.createElement('pre');
                const codeEl = document.createElement('code');
                codeEl.className = `language-${language || 'plaintext'}`;
                codeEl.textContent = code.trim();
                hljs.highlightElement(codeEl);
                pre.appendChild(codeEl);
                codeContainer.appendChild(header);
                codeContainer.appendChild(pre);
                container.appendChild(codeContainer);
            };

            const parts = content.split(/(```[\s\S]*?```)/g);

            parts.forEach(part => {
                const trimmedPart = part.trim();
                if (!trimmedPart) return;

                if (trimmedPart.startsWith('```') && trimmedPart.endsWith('```')) {
                    const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)```/;
                    const match = trimmedPart.match(codeBlockRegex);
                    const [fullMatch, language, code] = match;
                    createCodeBubble(language, code, messageTextContainer);
                } else {
                    // This is the new, simpler, more robust rule:
                    // If the text block contains ANY newline, it's complex. Put it in a bubble.
                    if (trimmedPart.includes('\n')) {
                        createTextBubble(trimmedPart, messageTextContainer);
                    } else {
                        createPlainText(trimmedPart, messageTextContainer);
                    }
                }
            });

            // --- NEW, SIMPLIFIED LOGIC END ---

            messageContentWrapper.appendChild(modelNameHeader);
            messageContentWrapper.appendChild(messageTextContainer);
            
            const messageActions = document.createElement('div');
            messageActions.className = 'message-actions';
            const copyMsgBtn = document.createElement('button');
            copyMsgBtn.className = 'action-btn';
            copyMsgBtn.innerHTML = '<i class="fas fa-copy"></i>';
            copyMsgBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(content);
            });
            const deleteMsgBtn = document.createElement('button');
            deleteMsgBtn.className = 'action-btn';
            deleteMsgBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteMsgBtn.addEventListener('click', () => {
                messageWrapper.remove();
            });
            messageActions.appendChild(copyMsgBtn);
            messageActions.appendChild(deleteMsgBtn);
            messageContentWrapper.appendChild(messageActions);

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

    // --- File Upload Logic (unchanged) ---
    attachmentButtons.forEach(button => {
        button.addEventListener('click', () => {
            fileUploadInput.accept = button.dataset.type === 'image' ? 'image/*' : '*/*';
            fileUploadInput.click();
            attachmentMenu.classList.remove('visible');
        });
    });

    fileUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                displayMessage('user', e.target.result);
                addMessageToActiveChat('user', e.target.result);
            };
            reader.readAsDataURL(file);
        } else {
            const fileInfo = `[File]${file.name}`;
            displayMessage('user', fileInfo);
            addMessageToActiveChat('user', fileInfo);
        }
        event.target.value = '';
    });

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
            const response = await fetch('/api/proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [{ role: 'user', content: message }],
                    stream: true
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
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        if (data.trim() === '[DONE]') break;
                        try {
                            const json = JSON.parse(data);
                            const token = json.choices[0]?.delta?.content || '';
                            if (token) {
                                if (isFirstToken) {
                                    streamingTextElement.innerHTML = '';
                                    isFirstToken = false;
                                }
                                
                                fullResponse += token;
                                streamingTextElement.textContent = fullResponse;
                                chatArea.scrollTop = chatArea.scrollHeight;
                            }
                        } catch (e) { /* Ignore parsing errors */ }
                    }
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

     addAttachmentBtn.addEventListener('click', (event) => {
        attachmentMenu.classList.toggle('visible');
        event.stopPropagation();
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
