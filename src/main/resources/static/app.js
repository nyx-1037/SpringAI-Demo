/**
 * Spring AI Chat Demo - 前端聊天应用
 * 
 * 功能描述：
 * - 实现与Spring AI后端的实时流式对话
 * - 支持Markdown渲染和代码高亮
 * - 提供打字机效果的消息显示
 * - 支持对话历史管理和会话控制
 * 
 * @author Spring AI Demo Team
 * @version 1.0.0
 * @date 2024-01-15
 */

/**
 * 聊天应用主类
 * 负责管理整个聊天界面的交互逻辑和状态
 */
class ChatApp {
    /**
     * 构造函数 - 初始化聊天应用
     */
    constructor() {
        // 会话标识符
        this.sessionId = this.generateSessionId();
        // 聊天历史记录
        this.chatHistory = [];
        // 当前事件源连接
        this.currentEventSource = null;
        // 流式传输状态标志
        this.isStreaming = false;
        // 当前AI助手消息元素
        this.currentAssistantMessage = null;
        // 打字机效果定时器
        this.currentTypewriterInterval = null;
        // 当前完整内容
        this.currentFullContent = '';
        // 内容缓冲区
        this.contentBuffer = '';
        // 记录最后一次Markdown渲染的内容长度
        this.lastRenderedLength = 0;
        
        // 初始化各个组件
        this.initMarkdown();
        this.initElements();
        this.bindEvents();
        this.updateStatus('ready', '就绪');
    }
    
    /**
     * 初始化Markdown渲染器
     * 配置marked.js和代码高亮功能
     */
    initMarkdown() {
        // 配置marked.js Markdown解析器
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                // 代码高亮配置
                highlight: function(code, lang) {
                    if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
                        try {
                            return hljs.highlight(code, { language: lang }).value;
                        } catch (err) {
                            console.warn('代码高亮失败:', err);
                        }
                    }
                    return code;
                },
                breaks: true,        // 支持换行符转换为<br>
                gfm: true,          // 启用GitHub风格Markdown
                sanitize: false     // 不清理HTML标签
            });
        }
    }
    
    /**
     * 初始化DOM元素引用
     * 获取页面中的关键元素并存储引用
     */
    initElements() {
        this.chatMessages = document.getElementById('chatMessages');      // 消息显示区域
        this.messageInput = document.getElementById('messageInput');      // 消息输入框
        this.sendBtn = document.getElementById('sendBtn');                // 发送按钮
        this.stopBtn = document.getElementById('stopBtn');                // 停止按钮
        this.statusText = document.getElementById('status-text');         // 状态文本
        this.statusDot = document.getElementById('status-dot');           // 状态指示点
        this.loadingOverlay = document.getElementById('loadingOverlay');  // 加载遮罩
        this.charCount = document.querySelector('.char-count');           // 字符计数
    }
    
    /**
     * 绑定事件监听器
     * 设置用户交互事件的处理逻辑
     */
    bindEvents() {
        // 发送按钮点击事件
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // 停止按钮点击事件
        this.stopBtn.addEventListener('click', () => this.stopStream());
        
        // 输入框键盘事件 - 支持Ctrl+Enter快捷发送
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // 输入框内容变化事件 - 自动调整高度和更新字符计数
        this.messageInput.addEventListener('input', () => {
            this.autoResize();
            this.updateCharCount();
        });
        
        // 窗口关闭前清理资源
        window.addEventListener('beforeunload', () => {
            if (this.currentEventSource) {
                this.currentEventSource.close();
            }
        });
    }
    
    /**
     * 生成唯一的会话ID
     * @returns {string} 格式为 'session_时间戳_随机字符串' 的会话ID
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * 自动调整输入框高度
     * 根据内容自动调整，最大高度120px
     */
    autoResize() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }
    
    /**
     * 更新字符计数显示
     * 根据字符数量改变颜色提示
     */
    updateCharCount() {
        const count = this.messageInput.value.length;
        this.charCount.textContent = `${count}/2000`;
        
        // 根据字符数量设置不同颜色
        if (count > 1800) {
            this.charCount.style.color = '#ef4444';  // 红色 - 接近限制
        } else if (count > 1500) {
            this.charCount.style.color = '#f59e0b';  // 橙色 - 警告
        } else {
            this.charCount.style.color = '#6b7280';  // 灰色 - 正常
        }
    }
    
    /**
     * 更新连接状态显示
     * @param {string} type - 状态类型 (ready/streaming/error/paused)
     * @param {string} text - 状态文本
     */
    updateStatus(type, text) {
        this.statusText.textContent = text;
        this.statusDot.className = `status-dot ${type}`;
    }
    
    /**
     * 发送用户消息
     * 处理用户输入，发送消息并启动流式响应
     */
    async sendMessage() {
        const message = this.messageInput.value.trim();
        // 检查消息是否为空或正在流式传输中
        if (!message || this.isStreaming) return;
        
        // 添加用户消息到界面和历史记录
        this.addMessage('user', message);
        this.chatHistory.push({ role: 'user', content: message });
        
        // 清空输入框并重置UI
        this.messageInput.value = '';
        this.autoResize();
        this.updateCharCount();
        
        // 更新UI状态为流式传输中
        this.isStreaming = true;
        this.sendBtn.disabled = true;
        this.stopBtn.disabled = false;
        this.updateStatus('streaming', 'AI正在回复...');
        
        // 创建AI助手消息容器
        this.currentAssistantMessage = this.addMessage('assistant', '', true);
        
        // 初始化内容缓冲区
        this.contentBuffer = '';
        
        try {
            await this.startStream(message);
        } catch (error) {
            console.error('发送消息失败:', error);
            this.handleError('发送消息失败: ' + error.message);
        }
    }
    
    /**
     * 启动流式请求
     * 向后端发送消息并处理流式响应
     * @param {string} message - 用户输入的消息
     */
    async startStream(message) {
        // 构建请求数据
        const requestData = {
            message: message,
            history: this.chatHistory.slice(-10), // 只保留最近10条对话历史
            stream: true
        };
        
        console.log('开始流式请求:', {
            sessionId: this.sessionId,
            message: message,
            historyLength: this.chatHistory.length
        });
        
        // 使用fetch API进行POST请求
        try {
            // 构建后端URL（后端运行在8999端口）
            const backendUrl = window.location.protocol + '//' + window.location.hostname + ':8999';
            const response = await fetch(backendUrl + '/api/chat/stream?sessionIdParam=' + this.sessionId, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify(requestData)
            });
            
            console.log('响应状态:', response.status, response.statusText);
            console.log('响应头:', Object.fromEntries(response.headers.entries()));
            
            // 检查响应状态
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // 创建流读取器
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';           // 数据缓冲区
            let messageCount = 0;      // 消息计数器
            
            console.log('开始读取流数据...');
            
            // 循环读取流数据
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    console.log('流读取完成，总共处理了', messageCount, '条消息');
                    break;
                }
                
                // 解码数据并处理行分割
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // 保留不完整的行
                
                // 处理每一行数据
                for (const line of lines) {
                    console.log('处理行:', line);
                    if (line.startsWith('data:')) {
                        // 处理Server-Sent Events格式的数据
                        const data = line.startsWith('data: ') ? line.slice(6).trim() : line.slice(5).trim();
                        if (data && data !== '[DONE]') {
                            messageCount++;
                            console.log('收到流数据 #' + messageCount + ':', data);
                            this.handleStreamData(data);
                        } else if (data === '[DONE]') {
                            console.log('收到流结束标志');
                            this.finishStream();
                            break;
                        }
                    } else if (line.trim() === '') {
                        // 忽略空行
                        continue;
                    } else if (line.trim()) {
                        console.log('收到非data行:', line);
                    }
                }
            }
            
        } catch (error) {
            console.error('Stream error:', error);
            this.handleError('连接失败: ' + error.message);
        }
    }
    
    /**
     * 处理流式数据
     * 接收并处理从后端流式传输的数据
     * @param {string} data - 接收到的流数据
     */
    handleStreamData(data) {
        console.log('处理流数据:', data);
        
        try {
            const response = JSON.parse(data);
            console.log('解析后的响应:', response);
            
            if (response.error) {
                console.error('收到错误响应:', response.error);
                this.handleError(response.error);
                return;
            }
            
            if (response.content) {
                console.log('收到内容:', response.content);
                this.appendToCurrentMessage(response.content);
            }
            
            if (response.finished) {
                console.log('流结束标志收到');
                this.finishStream();
            }
            
        } catch (error) {
            console.error('解析流数据失败:', error, 'Data:', data);
        }
    }
    
    /**
     * 向当前消息追加内容
     * 将新接收的内容追加到当前AI助手消息中，并启动打字机效果
     * @param {string} content - 要追加的内容
     */
    appendToCurrentMessage(content) {
        if (this.currentAssistantMessage) {
            const messageText = this.currentAssistantMessage.querySelector('.message-text');
            
            // 移除打字指示器
            const typingIndicator = messageText.querySelector('.typing-indicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
            
            // 累积内容到缓冲区
            if (!this.contentBuffer) {
                this.contentBuffer = '';
            }
            this.contentBuffer += content;
            
            console.log('累积内容长度:', this.contentBuffer.length, '新增内容:', content);
            
            // 如果当前没有打字机效果在运行，或者内容有显著增加，启动/更新打字机效果
            const currentDisplayedLength = this.getTextWithoutCursor(messageText).length;
            const shouldStartTypewriter = !this.currentTypewriterInterval || 
                                        (this.contentBuffer.length - currentDisplayedLength > 10);
            
            if (shouldStartTypewriter) {
                // 使用打字机效果显示累积的内容
                this.typewriterEffect(messageText, this.contentBuffer);
            } else {
                // 更新目标内容，让现有的打字机效果继续
                this.currentFullContent = this.contentBuffer;
            }
        }
    }
    
    /**
     * 打字机效果显示内容
     * 逐字符显示内容，模拟打字机效果，提升用户体验
     * @param {HTMLElement} element - 要显示内容的DOM元素
     * @param {string} fullContent - 要显示的完整内容
     */
    typewriterEffect(element, fullContent) {
        // 获取当前已显示的文本长度（不包括光标）
        let currentText = this.getTextWithoutCursor(element);
        const currentLength = currentText.length;
        
        console.log('打字机效果 - 当前长度:', currentLength, '目标长度:', fullContent.length);
        
        // 如果没有新内容需要显示，直接返回
        if (currentLength >= fullContent.length) {
            if (this.isStreaming) {
                this.addCursor(element);
            }
            return;
        }
        
        // 停止当前的打字机效果（如果有的话）
        if (this.currentTypewriterInterval) {
            clearInterval(this.currentTypewriterInterval);
            this.currentTypewriterInterval = null;
        }
        
        // 存储当前要显示的完整内容
        this.currentFullContent = fullContent;
        
        // 逐字添加新内容
        let i = currentLength;
        this.currentTypewriterInterval = setInterval(() => {
            // 检查是否有更新的内容需要显示
            if (this.currentFullContent !== fullContent) {
                // 内容已更新，停止当前效果，让新的调用处理
                clearInterval(this.currentTypewriterInterval);
                this.currentTypewriterInterval = null;
                return;
            }
            
            if (i < fullContent.length && this.isStreaming) {
                this.setTextWithCursor(element, fullContent.substring(0, i + 1));
                i++;
                this.scrollToBottom();
            } else {
                clearInterval(this.currentTypewriterInterval);
                this.currentTypewriterInterval = null;
                
                // 添加光标闪烁效果
                if (this.isStreaming) {
                    this.addCursor(element);
                }
            }
        }, 30); // 30ms间隔，可调整打字速度
    }
    
    /**
     * 获取不包含光标的纯文本内容
     * 用于计算实际显示的文本长度，排除光标元素的干扰
     * @param {HTMLElement} element - 要获取文本的DOM元素
     * @returns {string} 不包含光标的纯文本内容
     */
    getTextWithoutCursor(element) {
        // 克隆元素以避免影响原始DOM
        const clone = element.cloneNode(true);
        // 移除光标元素
        const cursor = clone.querySelector('.typing-cursor');
        if (cursor) {
            cursor.remove();
        }
        return clone.textContent || '';
    }
    
    /**
     * 设置文本内容并保持光标
     * 智能处理Markdown渲染，优化性能，避免频繁重新渲染
     * @param {HTMLElement} element - 要设置文本的DOM元素
     * @param {string} text - 要设置的文本内容
     */
    setTextWithCursor(element, text) {
        // 检查是否存在光标
        const hasCursor = element.querySelector('.typing-cursor');
        
        // 优化策略：减少频繁的Markdown渲染
        if (typeof marked !== 'undefined' && this.shouldRenderMarkdownNow(text)) {
            try {
                // 解析Markdown为HTML
                const htmlContent = marked.parse(text);
                element.innerHTML = htmlContent;
                
                // 初始化代码高亮
                if (typeof hljs !== 'undefined') {
                    element.querySelectorAll('pre code').forEach((block) => {
                        hljs.highlightElement(block);
                    });
                }
                
                // 添加代码块复制功能
                this.addCopyButtons(element);
                
                // 记录最后一次渲染的内容长度
                this.lastRenderedLength = text.length;
            } catch (error) {
                // 如果渲染失败，回退到纯文本
                element.textContent = text;
            }
        } else {
            // 直接设置文本内容
            element.textContent = text;
        }
        
        // 如果之前有光标且正在流式传输，重新添加光标
        if (hasCursor && this.isStreaming) {
            this.addCursor(element);
        }
    }
    
    /**
     * 添加打字光标
     * 在元素末尾添加闪烁的光标，提供视觉反馈
     * @param {HTMLElement} element - 要添加光标的DOM元素
     */
    addCursor(element) {
        // 移除现有光标，避免重复
        const existingCursor = element.querySelector('.typing-cursor');
        if (existingCursor) {
            existingCursor.remove();
        }
        
        // 创建并添加新光标
        const cursor = document.createElement('span');
        cursor.className = 'typing-cursor';
        cursor.textContent = '|';
        element.appendChild(cursor);
    }
    
    /**
     * 移除打字光标
     * 在消息完成时移除光标元素
     * @param {HTMLElement} element - 要移除光标的DOM元素
     */
    removeCursor(element) {
        const cursor = element.querySelector('.typing-cursor');
        if (cursor) {
            cursor.remove();
        }
    }
    
    /**
     * 完成流式处理
     * 处理流结束，完成打字机效果并重置UI状态
     */
    finishStream() {
        this.isStreaming = false;
        this.sendBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.updateStatus('ready', '就绪');
        
        if (this.currentAssistantMessage) {
            const messageText = this.currentAssistantMessage.querySelector('.message-text');
            
            // 检查是否还有未显示的内容
            const currentDisplayedText = this.getTextWithoutCursor(messageText);
            const hasRemainingContent = this.contentBuffer && currentDisplayedText.length < this.contentBuffer.length;
            
            if (hasRemainingContent) {
                // 如果还有未显示的内容，继续打字机效果直到完成
                console.log('流结束，但还有未显示内容，继续打字机效果');
                this.finishTypewriterEffect(messageText, this.contentBuffer);
            } else {
                // 所有内容已显示完毕，直接完成
                this.completeMessage(messageText);
            }
        }
        
        if (this.currentEventSource) {
            this.currentEventSource.close();
            this.currentEventSource = null;
        }
    }
    
    /**
     * 加速完成打字机效果
     * 以更快的速度显示剩余内容，确保所有内容都能完整显示
     * @param {HTMLElement} element - 要显示内容的DOM元素
     * @param {string} fullContent - 要显示的完整内容
     */
    finishTypewriterEffect(element, fullContent) {
        // 停止当前的打字机效果
        if (this.currentTypewriterInterval) {
            clearInterval(this.currentTypewriterInterval);
            this.currentTypewriterInterval = null;
        }
        
        // 获取当前已显示的文本长度
        let currentText = this.getTextWithoutCursor(element);
        let currentLength = currentText.length;
        
        console.log('完成打字机效果 - 当前长度:', currentLength, '目标长度:', fullContent.length);
        
        // 继续逐字显示剩余内容，但速度稍快一些
        this.currentTypewriterInterval = setInterval(() => {
            if (currentLength < fullContent.length) {
                this.setTextWithCursor(element, fullContent.substring(0, currentLength + 1));
                currentLength++;
                this.scrollToBottom();
            } else {
                // 所有内容显示完毕
                clearInterval(this.currentTypewriterInterval);
                this.currentTypewriterInterval = null;
                this.completeMessage(element);
            }
        }, 15); // 更快的速度完成剩余内容
    }
    
    /**
     * 完成消息处理
     * 最终处理消息显示，包括Markdown渲染、历史记录保存和状态清理
     * @param {HTMLElement} messageText - 消息文本元素
     */
    completeMessage(messageText) {
        // 移除光标
        this.removeCursor(messageText);
        
        // 确保显示完整内容并渲染Markdown
        if (this.contentBuffer && this.contentBuffer.trim()) {
            this.renderMarkdown(messageText, this.contentBuffer);
            
            // 添加到聊天历史
            this.chatHistory.push({ role: 'assistant', content: this.contentBuffer });
        } else {
            const content = messageText.textContent;
            if (content.trim()) {
                this.renderMarkdown(messageText, content);
                this.chatHistory.push({ role: 'assistant', content: content });
            }
        }
        
        // 添加完成指示器
        this.addCompletionIndicator(messageText);
        
        // 更新时间戳
        const timeElement = this.currentAssistantMessage.querySelector('.message-time');
        timeElement.textContent = this.formatTime(new Date());
        
        // 清理内容缓冲区和状态
        this.contentBuffer = '';
        this.currentAssistantMessage = null;
        this.lastRenderedLength = 0; // 重置渲染长度记录
    }
    
    /**
     * 渲染Markdown内容
     * 将文本内容解析为HTML并应用代码高亮
     * @param {HTMLElement} element - 要渲染的DOM元素
     * @param {string} content - 要渲染的Markdown文本内容
     */
    renderMarkdown(element, content) {
        // 检查marked.js是否已加载
        if (typeof marked !== 'undefined') {
            try {
                // 使用marked.js渲染Markdown
                const htmlContent = marked.parse(content);
                element.innerHTML = htmlContent;
                
                // 初始化代码高亮
                if (typeof hljs !== 'undefined') {
                    element.querySelectorAll('pre code').forEach((block) => {
                        hljs.highlightElement(block);
                    });
                }
                
                // 添加代码块复制功能
                this.addCopyButtons(element);
                
            } catch (error) {
                console.warn('Markdown渲染失败:', error);
                element.textContent = content;
            }
        } else {
            // 如果marked.js不可用，直接显示文本
            element.textContent = content;
        }
    }
    
    /**
     * 检测文本是否包含Markdown语法
     * 通过正则表达式匹配常见的Markdown语法元素
     * @param {string} text - 要检测的文本内容
     * @returns {boolean} 如果包含Markdown语法返回true，否则返回false
     */
    containsMarkdownSyntax(text) {
        // 检测常见的Markdown语法
        const markdownPatterns = [
            /#{1,6}\s+/,           // 标题 # ## ###
            /\*\*.*?\*\*/,         // 粗体 **text**
            /\*.*?\*/,             // 斜体 *text*
            /`.*?`/,               // 行内代码 `code`
            /```[\s\S]*?```/,      // 代码块 ```code```
            /^\s*[-*+]\s+/m,       // 无序列表 - * +
            /^\s*\d+\.\s+/m,       // 有序列表 1. 2.
            /^\s*>\s+/m,           // 引用 >
            /\[.*?\]\(.*?\)/,      // 链接 [text](url)
            /!\[.*?\]\(.*?\)/,     // 图片 ![alt](url)
            /\|.*?\|/,             // 表格 |cell|
            /^\s*---+\s*$/m,       // 分隔线 ---
            /~~.*?~~/              // 删除线 ~~text~~
        ];
        
        return markdownPatterns.some(pattern => pattern.test(text));
    }
    
    /**
     * 智能判断是否应该渲染Markdown
     * 检查文本是否包含完整的Markdown结构，避免渲染不完整的语法
     * @param {string} text - 要检查的文本内容
     * @returns {boolean} 如果应该渲染Markdown返回true，否则返回false
     */
    shouldRenderMarkdown(text) {
        // 智能判断是否应该渲染Markdown
        if (!this.containsMarkdownSyntax(text)) {
            return false;
        }
        
        // 检查是否包含完整的Markdown结构
        const completePatterns = [
            /#{1,6}\s+.+/,                    // 完整标题行
            /\*\*[^*]+\*\*/,                  // 完整粗体
            /\*[^*]+\*/,                      // 完整斜体
            /`[^`]+`/,                        // 完整行内代码
            /```[\s\S]*?```/,                 // 完整代码块
            /^\s*[-*+]\s+.+$/m,               // 完整列表项
            /^\s*\d+\.\s+.+$/m,               // 完整有序列表项
            /^\s*>\s+.+$/m,                   // 完整引用行
            /\[[^\]]+\]\([^)]+\)/,            // 完整链接
            /!\[[^\]]*\]\([^)]+\)/,           // 完整图片
            /~~[^~]+~~/,                      // 完整删除线
            /^\s*---+\s*$/m                   // 完整分隔线
        ];
        
        // 如果包含完整的Markdown结构，或者文本较长（可能包含多个元素），则渲染
        return completePatterns.some(pattern => pattern.test(text)) || text.length > 50;
    }
    
    /**
     * 优化的Markdown渲染时机判断
     * 减少频繁渲染，提升性能，只在合适的时机进行渲染
     * @param {string} text - 要检查的文本内容
     * @returns {boolean} 如果现在应该渲染Markdown返回true，否则返回false
     */
    shouldRenderMarkdownNow(text) {
        // 优化的渲染策略：减少频繁渲染
        if (!this.containsMarkdownSyntax(text)) {
            return false;
        }
        
        // 初始化最后渲染长度
        if (!this.lastRenderedLength) {
            this.lastRenderedLength = 0;
        }
        
        const currentLength = text.length;
        const lengthDiff = currentLength - this.lastRenderedLength;
        
        // 渲染条件：
        // 1. 内容长度增加超过100个字符
        // 2. 检测到完整的Markdown结构
        // 3. 包含代码块结束标记
        const hasSignificantChange = lengthDiff > 100;
        const hasCompleteStructure = this.shouldRenderMarkdown(text);
        const hasCodeBlockEnd = /```\s*$/.test(text) || /```\w*\s*\n[\s\S]*?```/.test(text);
        
        return hasSignificantChange || hasCompleteStructure || hasCodeBlockEnd;
    }
    
    /**
     * 为代码块添加复制按钮
     * 在每个代码块右上角添加复制按钮，提供便捷的代码复制功能
     * @param {HTMLElement} element - 包含代码块的DOM元素
     */
    addCopyButtons(element) {
        const codeBlocks = element.querySelectorAll('pre');
        codeBlocks.forEach((pre) => {
            // 避免重复添加复制按钮
            if (pre.querySelector('.copy-btn')) {
                return;
            }
            
            // 创建复制按钮
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
            copyBtn.title = '复制代码';
            
            // 添加复制功能
            copyBtn.addEventListener('click', () => {
                const code = pre.querySelector('code');
                if (code) {
                    navigator.clipboard.writeText(code.textContent).then(() => {
                        // 显示复制成功状态
                        copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                        copyBtn.style.color = '#10b981';
                        // 2秒后恢复原状态
                        setTimeout(() => {
                            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                            copyBtn.style.color = '';
                        }, 2000);
                    }).catch(err => {
                        console.error('复制失败:', err);
                    });
                }
            });
            
            // 设置代码块为相对定位，以便按钮绝对定位
            pre.style.position = 'relative';
            pre.appendChild(copyBtn);
        });
    }
    
    /**
     * 添加完成指示器
     * 在消息完成时添加绿色的完成标识，3秒后自动移除
     * @param {HTMLElement} element - 要添加指示器的消息文本元素
     */
    addCompletionIndicator(element) {
        // 创建完成指示器元素
        const indicator = document.createElement('span');
        indicator.className = 'completion-indicator';
        indicator.innerHTML = ' <i class="fas fa-check-circle"></i>';
        element.appendChild(indicator);
        
        // 3秒后自动移除指示器
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, 3000);
    }
    
    /**
     * 停止流式处理
     * 用户主动停止对话，立即完成当前消息并发送停止请求到后端
     */
    async stopStream() {
        // 检查是否正在流式传输中
        if (!this.isStreaming) return;
        
        // 立即更新UI状态为停止中
        this.updateStatus('paused', '正在停止...');
        this.stopBtn.disabled = true;
        
        // 停止打字机效果定时器
        if (this.currentTypewriterInterval) {
            clearInterval(this.currentTypewriterInterval);
            this.currentTypewriterInterval = null;
        }
        
        try {
            // 向后端发送停止请求
            const backendUrl = window.location.protocol + '//' + window.location.hostname + ':8999';
            const response = await fetch(`${backendUrl}/api/chat/stop/${this.sessionId}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                // 立即显示所有剩余内容并渲染Markdown
                if (this.currentAssistantMessage && this.contentBuffer) {
                    const messageText = this.currentAssistantMessage.querySelector('.message-text');
                    
                    // 移除打字光标
                    this.removeCursor(messageText);
                    
                    // 立即渲染Markdown格式的完整内容
                    this.renderMarkdown(messageText, this.contentBuffer);
                    
                    // 添加暂停指示器（橙色暂停图标）
                    const pauseIndicator = document.createElement('span');
                    pauseIndicator.className = 'pause-indicator';
                    pauseIndicator.innerHTML = ' <i class="fas fa-pause-circle"></i>';
                    pauseIndicator.title = '对话已暂停';
                    messageText.appendChild(pauseIndicator);
                    
                    // 将内容保存到聊天历史
                    this.chatHistory.push({ role: 'assistant', content: this.contentBuffer });
                    
                    // 更新消息时间戳
                    const timeElement = this.currentAssistantMessage.querySelector('.message-time');
                    timeElement.textContent = this.formatTime(new Date());
                    
                    // 清理状态变量
                    this.contentBuffer = '';
                    this.currentAssistantMessage = null;
                    this.lastRenderedLength = 0; // 重置渲染长度记录
                }
                
                // 更新UI状态为就绪
                this.isStreaming = false;
                this.sendBtn.disabled = false;
                this.stopBtn.disabled = true;
                this.updateStatus('ready', '已停止');
                
                // 显示停止成功通知
                this.showNotification('对话已暂停', 'info');
            }
        } catch (error) {
            console.error('停止流失败:', error);
            this.updateStatus('error', '停止失败');
            this.showNotification('停止失败，请重试', 'error');
        }
        
        // 关闭事件源连接
        if (this.currentEventSource) {
            this.currentEventSource.close();
            this.currentEventSource = null;
        }
    }
    
    /**
     * 显示通知消息
     * 在页面右上角显示临时通知，支持不同类型的样式
     * @param {string} message - 通知消息内容
     * @param {string} type - 通知类型 ('info'|'success'|'error')
     */
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // 添加到页面body
        document.body.appendChild(notification);
        
        // 延迟100ms后显示动画效果
        setTimeout(() => notification.classList.add('show'), 100);
        
        // 3秒后开始隐藏动画并移除元素
        setTimeout(() => {
            notification.classList.remove('show');
            // 等待300ms动画完成后移除DOM元素
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }
    
    /**
     * 处理错误情况
     * 统一处理各种错误，更新UI状态并显示错误信息
     * @param {string} errorMessage - 错误消息内容
     */
    handleError(errorMessage) {
        // 完成当前流并重置状态
        this.finishStream();
        // 更新状态显示为错误
        this.updateStatus('error', '错误');
        
        // 在当前消息或新消息中显示错误信息
        if (this.currentAssistantMessage) {
            const messageText = this.currentAssistantMessage.querySelector('.message-text');
            messageText.textContent = errorMessage;
            messageText.style.color = '#ef4444';
        } else {
            // 如果没有当前消息，创建新的错误消息
            this.addMessage('assistant', errorMessage, false, true);
        }
    }
    
    /**
     * 添加消息到聊天界面
     * 创建消息DOM元素并添加到聊天区域，支持不同类型的消息显示
     * @param {string} role - 消息角色 ('user'|'assistant')
     * @param {string} content - 消息内容
     * @param {boolean} isStreaming - 是否为流式消息（显示打字指示器）
     * @param {boolean} isError - 是否为错误消息（红色显示）
     * @returns {HTMLElement} 创建的消息DOM元素
     */
    addMessage(role, content, isStreaming = false, isError = false) {
        // 创建消息容器
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        // 创建头像区域
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
        
        // 创建内容区域
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // 创建文本区域
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        
        // 根据消息类型设置不同的显示方式
        if (isError) {
            // 错误消息：红色文本
            textDiv.style.color = '#ef4444';
            textDiv.textContent = content;
        } else if (isStreaming) {
            // 流式消息：显示打字指示器
            textDiv.innerHTML = '<span class="typing-indicator">●</span>';
        } else if (role === 'user' && content.trim()) {
            // 用户消息：支持Markdown渲染
            this.renderMarkdown(textDiv, content);
        } else {
            // 普通消息：纯文本显示
            textDiv.textContent = content;
        }
        
        // 创建时间戳
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = this.formatTime(new Date());
        
        // 组装DOM结构
        contentDiv.appendChild(textDiv);
        contentDiv.appendChild(timeDiv);
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        // 添加到聊天区域并滚动到底部
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        return messageDiv;
    }
    
    /**
     * 格式化时间显示
     * 根据时间差智能显示相对时间或绝对时间
     * @param {Date} date - 要格式化的日期对象
     * @returns {string} 格式化后的时间字符串
     */
    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { 
            // 小于1分钟：显示"刚刚"
            return '刚刚';
        } else if (diff < 3600000) { 
            // 小于1小时：显示"X分钟前"
            return Math.floor(diff / 60000) + '分钟前';
        } else if (date.toDateString() === now.toDateString()) { 
            // 今天：显示具体时间 "HH:MM"
            return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        } else {
            // 其他日期：显示日期和时间 "MM月DD日 HH:MM"
            return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) + ' ' +
                   date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        }
    }
    
    /**
     * 滚动到聊天区域底部
     * 确保最新消息始终可见
     */
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}

// ==================== 应用初始化 ====================
/**
 * DOM内容加载完成后初始化聊天应用
 * 确保所有DOM元素都已准备就绪后再创建应用实例
 */
document.addEventListener('DOMContentLoaded', () => {
    // 创建并启动聊天应用实例
    // 应用将自动初始化所有必要的组件和事件监听器
    const app = new ChatApp();
    
    // 将应用实例暴露到全局作用域，便于错误处理器访问
    window.chatApp = app;
});

// ==================== 全局错误处理 ====================
/**
 * 全局JavaScript错误处理器
 * 捕获所有未处理的JavaScript错误并显示用户友好的错误信息
 * 包括语法错误、运行时错误、资源加载错误等
 */
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);
    
    // 如果聊天应用已初始化，通过应用的错误处理机制显示错误
    if (window.chatApp && typeof window.chatApp.handleError === 'function') {
        window.chatApp.handleError('发生未知错误: ' + (event.error?.message || '未知错误'));
    }
});

/**
 * 全局Promise拒绝处理器
 * 捕获所有未处理的Promise拒绝（如网络请求失败、异步操作错误等）
 * 防止未捕获的Promise错误导致应用崩溃
 */
window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason);
    
    // 如果聊天应用已初始化，通过应用的错误处理机制显示错误
    if (window.chatApp && typeof window.chatApp.handleError === 'function') {
        const errorMessage = event.reason?.message || event.reason || '网络或服务器连接异常';
        window.chatApp.handleError('网络或服务器错误: ' + errorMessage);
    }
    
    // 阻止浏览器默认的错误处理行为
    event.preventDefault();
});