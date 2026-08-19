// EdgeRAG Chat Application Logic
document.addEventListener("DOMContentLoaded", () => {
    // State management
    let conversations = JSON.parse(localStorage.getItem("edgerag_conversations") || "[]");
    let activeConversationId = localStorage.getItem("edgerag_active_id") || null;
    let isQuerying = false;

    // DOM Elements
    const sidebar = document.getElementById("sidebar");
    const sidebarBackdrop = document.getElementById("sidebarBackdrop");
    const menuBtn = document.getElementById("menuBtn");
    const closeSidebarBtn = document.getElementById("closeSidebarBtn");
    const newChatBtn = document.getElementById("newChatBtn");
    const conversationsList = document.getElementById("conversationsList");
    const currentChatTitle = document.getElementById("currentChatTitle");
    
    const chatViewport = document.querySelector(".chat-viewport");
    const messagesContainer = document.getElementById("messagesContainer");
    const emptyState = document.getElementById("emptyState");
    
    const composerForm = document.getElementById("composerForm");
    const messageInput = document.getElementById("messageInput");
    const sendBtn = document.getElementById("sendBtn");

    // Initialize application
    init();

    function init() {
        renderConversationsList();
        
        if (activeConversationId) {
            loadConversation(activeConversationId);
        } else {
            showEmptyState();
        }

        // Event Listeners
        menuBtn.addEventListener("click", openSidebar);
        closeSidebarBtn.addEventListener("click", closeSidebar);
        sidebarBackdrop.addEventListener("click", closeSidebar);
        newChatBtn.addEventListener("click", handleNewChat);
        
        // Input textarea auto-grow and button activation
        messageInput.addEventListener("input", handleInputResize);
        
        // Handle keyboard event for form submission (Enter without Shift)
        messageInput.addEventListener("keydown", handleKeydown);
        
        composerForm.addEventListener("submit", handleFormSubmit);

        // Suggested prompts click delegation
        document.querySelectorAll(".prompt-chip").forEach(chip => {
            chip.addEventListener("click", () => {
                const promptText = chip.getAttribute("data-prompt");
                if (promptText && !isQuerying) {
                    messageInput.value = promptText;
                    handleInputResize();
                    submitQuestion(promptText);
                }
            });
        });
    }

    // Sidebar functions
    function openSidebar() {
        sidebar.classList.add("open");
        sidebarBackdrop.classList.add("open");
    }

    function closeSidebar() {
        sidebar.classList.remove("open");
        sidebarBackdrop.classList.remove("open");
    }

    // Textarea resize logic
    function handleInputResize() {
        messageInput.style.height = "auto";
        // Calculate new height (min 32px, max 200px based on css)
        const scrollHeight = messageInput.scrollHeight;
        messageInput.style.height = scrollHeight + "px";
        
        // Enable/Disable send button
        const hasText = messageInput.value.trim().length > 0;
        sendBtn.disabled = !hasText || isQuerying;
    }

    // Enter sends, Shift+Enter newlines
    function handleKeydown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            composerForm.requestSubmit();
        }
    }

    // Render list of recent conversations in sidebar
    function renderConversationsList() {
        conversationsList.innerHTML = "";
        
        if (conversations.length === 0) {
            const noHistory = document.createElement("div");
            noHistory.style.fontSize = "0.75rem";
            noHistory.style.color = "var(--text-muted)";
            noHistory.style.padding = "12px 8px";
            noHistory.style.textAlign = "center";
            noHistory.innerText = "No history yet";
            conversationsList.appendChild(noHistory);
            return;
        }

        conversations.slice().reverse().forEach(convo => {
            const item = document.createElement("div");
            item.className = `conversation-item ${convo.id === activeConversationId ? 'active' : ''}`;
            
            const titleWrapper = document.createElement("div");
            titleWrapper.className = "conversation-title-wrapper";
            
            // Conversation icon
            titleWrapper.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>${escapeHtml(convo.title)}</span>
            `;
            
            // Delete button
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "delete-conversation-btn";
            deleteBtn.ariaLabel = "Delete conversation";
            deleteBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            `;
            
            deleteBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                deleteConversation(convo.id);
            });

            item.appendChild(titleWrapper);
            item.appendChild(deleteBtn);
            
            item.addEventListener("click", () => {
                if (convo.id !== activeConversationId && !isQuerying) {
                    loadConversation(convo.id);
                    closeSidebar();
                }
            });

            conversationsList.appendChild(item);
        });
    }

    // Start a new chat
    function handleNewChat() {
        if (isQuerying) return;
        activeConversationId = null;
        localStorage.removeItem("edgerag_active_id");
        showEmptyState();
        closeSidebar();
        
        // Focus the composer
        messageInput.focus();
    }

    // Show empty chat state
    function showEmptyState() {
        messagesContainer.innerHTML = "";
        emptyState.style.display = "flex";
        currentChatTitle.innerText = "EdgeRAG";
        messageInput.value = "";
        handleInputResize();
        chatViewport.scrollTop = 0;
    }

    // Load active conversation
    function loadConversation(id) {
        const convo = conversations.find(c => c.id === id);
        if (!convo) {
            handleNewChat();
            return;
        }

        activeConversationId = id;
        localStorage.setItem("edgerag_active_id", id);
        
        emptyState.style.display = "none";
        messagesContainer.innerHTML = "";
        
        currentChatTitle.innerText = convo.title;
        
        convo.messages.forEach(msg => {
            appendMessage(msg.role, msg.text, msg.sources);
        });
        
        renderConversationsList();
        scrollToBottom();
        messageInput.value = "";
        handleInputResize();
    }

    // Delete conversation
    function deleteConversation(id) {
        conversations = conversations.filter(c => c.id !== id);
        localStorage.setItem("edgerag_conversations", JSON.stringify(conversations));
        
        if (activeConversationId === id) {
            activeConversationId = null;
            localStorage.removeItem("edgerag_active_id");
            showEmptyState();
        } else {
            renderConversationsList();
        }
    }

    // Append message HTML to viewport
    function appendMessage(role, text, sources = null) {
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${role}`;
        
        const senderSpan = document.createElement("span");
        senderSpan.className = "message-sender";
        senderSpan.innerText = role === "user" ? "You" : "EdgeRAG";
        
        const contentDiv = document.createElement("div");
        contentDiv.className = "message-content";
        
        if (role === "assistant") {
            contentDiv.innerHTML = formatMarkdown(text);
        } else {
            contentDiv.innerText = text;
        }

        messageDiv.appendChild(senderSpan);
        messageDiv.appendChild(contentDiv);
        
        // Append sources if available
        if (sources && sources.length > 0) {
            const sourcesDiv = document.createElement("div");
            sourcesDiv.className = "sources-container";
            sources.forEach(src => {
                const chip = document.createElement("span");
                chip.className = "source-chip";
                chip.innerHTML = `📄 <span>${escapeHtml(src)}</span>`;
                sourcesDiv.appendChild(chip);
            });
            messageDiv.appendChild(sourcesDiv);
        }

        messagesContainer.appendChild(messageDiv);
        scrollToBottom();
    }

    // Form submit handler
    function handleFormSubmit(e) {
        e.preventDefault();
        const text = messageInput.value.trim();
        if (!text || isQuerying) return;
        submitQuestion(text);
    }

    // Submit question to the FastAPI server
    async function submitQuestion(questionText) {
        isQuerying = true;
        sendBtn.disabled = true;
        messageInput.disabled = true;
        messageInput.placeholder = "Qwen is thinking...";

        // Set up active conversation if none exists
        if (!activeConversationId) {
            const newConvoId = Date.now().toString();
            // Title is first 25 characters of question + ellipses if needed
            let title = questionText.slice(0, 25);
            if (questionText.length > 25) title += "...";
            
            const newConvo = {
                id: newConvoId,
                title: title,
                messages: []
            };
            
            conversations.push(newConvo);
            activeConversationId = newConvoId;
            localStorage.setItem("edgerag_conversations", JSON.stringify(conversations));
            localStorage.setItem("edgerag_active_id", newConvoId);
            
            emptyState.style.display = "none";
            currentChatTitle.innerText = title;
        }

        // Add user message to UI and save state
        appendMessage("user", questionText);
        addMessageToConvo(activeConversationId, "user", questionText);
        renderConversationsList();

        // Clear input field and resize it
        messageInput.value = "";
        handleInputResize();

        // Append typing indicator
        const typingDiv = appendTypingIndicator();

        try {
            const response = await fetch("/query", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ question: questionText })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Failed to communicate with local server.");
            }

            const data = await response.json();
            
            // Remove typing indicator
            typingDiv.remove();

            // Render assistant message and save
            appendMessage("assistant", data.answer, data.sources);
            addMessageToConvo(activeConversationId, "assistant", data.answer, data.sources);
            
        } catch (error) {
            console.error("Query Error:", error);
            typingDiv.remove();
            
            // Append error notification to chat (but don't save in conversation history)
            appendErrorMessage(error.message || "An unexpected error occurred. Verify the server is running.");
        } finally {
            isQuerying = false;
            messageInput.disabled = false;
            messageInput.placeholder = "Ask EdgeRAG anything...";
            sendBtn.disabled = true;
            messageInput.focus();
            handleInputResize();
        }
    }

    // Helper functions
    function addMessageToConvo(convoId, role, text, sources = null) {
        const convo = conversations.find(c => c.id === convoId);
        if (convo) {
            const msg = { role, text };
            if (sources) msg.sources = sources;
            convo.messages.push(msg);
            localStorage.setItem("edgerag_conversations", JSON.stringify(conversations));
        }
    }

    function appendTypingIndicator() {
        const messageDiv = document.createElement("div");
        messageDiv.className = "message assistant typing";
        
        const senderSpan = document.createElement("span");
        senderSpan.className = "message-sender";
        senderSpan.innerText = "EdgeRAG";
        
        const contentDiv = document.createElement("div");
        contentDiv.className = "message-content";
        
        const indicator = document.createElement("div");
        indicator.className = "typing-indicator";
        indicator.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        
        contentDiv.appendChild(indicator);
        messageDiv.appendChild(senderSpan);
        messageDiv.appendChild(contentDiv);
        messagesContainer.appendChild(messageDiv);
        scrollToBottom();
        return messageDiv;
    }

    function appendErrorMessage(errorMsg) {
        const errorDiv = document.createElement("div");
        errorDiv.className = "error-message";
        errorDiv.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>${escapeHtml(errorMsg)}</span>
        `;
        messagesContainer.appendChild(errorDiv);
        scrollToBottom();
    }

    function scrollToBottom() {
        chatViewport.scrollTop = chatViewport.scrollHeight;
    }

    // Safe escaping
    function escapeHtml(text) {
        return text
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Lightweight custom Markdown formatting function
    function formatMarkdown(text) {
        // Safe escape first
        let html = escapeHtml(text);

        // Pre-formatted code blocks: ```lang ... ```
        const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
        html = html.replace(codeBlockRegex, (match, lang, code) => {
            // Unescape inside code blocks for rendering readable code
            const rawCode = code
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'");
            return `<pre><code class="language-${lang}">${escapeHtml(rawCode).trim()}</code></pre>`;
        });

        // Inline code: `code`
        html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

        // Bold: **text**
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Split into lines for list rendering
        const lines = html.split('\n');
        let inList = false;
        const formattedLines = lines.map(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
                const content = trimmed.substring(2);
                if (!inList) {
                    inList = true;
                    return `<ul><li>${content}</li>`;
                }
                return `<li>${content}</li>`;
            } else {
                if (inList) {
                    inList = false;
                    return `</ul>${line}`;
                }
                return line;
            }
        });
        
        if (inList) {
            formattedLines.push('</ul>');
        }
        
        html = formattedLines.join('\n');

        // Format paragraphs (double newlines) but skip tags that shouldn't be wrapped
        html = html.split(/\n\n+/).map(para => {
            const trimmed = para.trim();
            if (trimmed.startsWith("<pre>") || trimmed.startsWith("<ul>") || trimmed.startsWith("<li>") || trimmed.startsWith("</ul>")) {
                return para;
            }
            return `<p>${para.replace(/\n/g, '<br>')}</p>`;
        }).join('\n');

        return html;
    }
});
