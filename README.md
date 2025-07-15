# Spring AI Chat Demo

基于Spring Boot和阿里云Qwen大模型的聊天应用演示项目。

## 功能特性

- 🤖 集成阿里云Qwen大模型API
- 📝 支持Markdown渲染和代码高亮
- 💬 实时流式对话体验
- ⏸️ 支持手动暂停对话
- 🎨 现代化响应式UI设计
- 📱 移动端适配
- 🔄 会话管理和历史记录
- ⚡ 基于Server-Sent Events的流式传输

## 技术栈

### 后端
- Spring Boot 3.2.0
- Spring AI 0.8.1
- Spring WebFlux (响应式编程)
- Maven

### 前端
- 原生HTML/CSS/JavaScript
- Marked.js (Markdown解析) - 使用BootCDN中国镜像
- Highlight.js (代码高亮) - 使用BootCDN中国镜像
- Server-Sent Events (SSE)
- Font Awesome图标 - 使用BootCDN中国镜像
- 支持JavaScript/Python/Java/CSS/HTML/JSON等多种语言的代码高亮
- 响应式设计
- 详细中文注释

## 快速开始

### 1. 环境要求
- JDK 17+
- Maven 3.6+
- 阿里云Qwen API密钥

### 2. 配置API密钥

在 `src/main/resources/application.yml` 中配置你的阿里云Qwen API密钥：

```yaml
spring:
  ai:
    qwen:
      api:
        key: ${QWEN_API_KEY: API_KEY}
        url: https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation
        model: qwen-turbo
```

或者通过环境变量设置：
```bash
export QWEN_API_KEY=your-actual-qwen-api-key-here # 或者直接在application.yml中配置
```

### 3. 运行项目

```bash
# 编译项目
mvn clean compile

# 运行应用
mvn spring-boot:run
```

### 4. 访问应用

打开浏览器访问：http://localhost:8999

## API接口

### 聊天接口

#### 流式聊天
```
POST /api/chat/stream?sessionId={sessionId}
Content-Type: application/json

{
  "message": "你好",
  "history": [
    {"role": "user", "content": "之前的消息"},
    {"role": "assistant", "content": "AI的回复"}
  ],
  "stream": true
}
```

#### 停止流式传输
```
POST /api/chat/stop/{sessionId}
```

#### 检查流状态
```
GET /api/chat/status/{sessionId}
```

#### 健康检查
```
GET /api/chat/health
```

## 项目结构

```
src/
├── main/
│   ├── java/com/nyx/springAIDemo20250715/
│   │   ├── Main.java                 # 主启动类
│   │   ├── config/
│   │   │   ├── QwenConfig.java       # Qwen API配置
│   │   │   └── WebConfig.java        # Web配置
│   │   ├── controller/
│   │   │   ├── ChatController.java   # 聊天API控制器
│   │   │   └── HomeController.java   # 首页控制器
│   │   ├── dto/
│   │   │   ├── ChatRequest.java      # 聊天请求DTO
│   │   │   └── ChatResponse.java     # 聊天响应DTO
│   │   ├── model/
│   │   │   └── ChatMessage.java      # 消息实体
│   │   └── service/
│   │       └── QwenAIService.java    # Qwen AI服务
│   └── resources/
│       ├── application.yml           # 应用配置
│       └── static/
│           ├── index.html           # 聊天界面
│           ├── style.css            # 样式文件
│           └── app.js               # 前端逻辑
└── test/
```

## 配置说明

### application.yml 配置项

```yaml
server:
  port: 8080                          # 服务端口

spring:
  ai:
    qwen:
      api:
        key: ${QWEN_API_KEY}           # API密钥
        url: https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation
        model: qwen-turbo              # 模型名称
        max-tokens: 2000               # 最大token数
        temperature: 0.7               # 温度参数
        stream: true                   # 启用流式传输

logging:
  level:
    com.nyx.springAIDemo20250715: DEBUG
```

## 使用说明

1. **发送消息**：在输入框中输入消息，点击发送按钮或按Ctrl+Enter发送
2. **暂停对话**：在AI回复过程中，点击停止按钮可以中断当前对话
3. **查看历史**：页面会自动保存对话历史，支持上下文对话
4. **响应式设计**：支持桌面端和移动端访问

## 开发说明

### 扩展其他AI模型

项目设计支持扩展其他AI模型，只需：

1. 创建新的AI服务类实现相同的接口
2. 添加对应的配置类
3. 在控制器中注入新的服务

### 自定义UI

前端使用原生技术栈，可以轻松自定义。所有前端代码（`index.html`, `style.css`, `app.js`）均已添加详细中文注释，方便理解和修改：

- 修改 `style.css` 调整界面样式
- 修改 `app.js` 添加新功能
- 修改 `index.html` 调整页面结构

## 故障排除

### 常见问题

1. **API密钥错误**
   - 检查 `application.yml` 中的API密钥配置
   - 确认阿里云账户余额充足

2. **连接超时**
   - 检查网络连接
   - 确认阿里云API服务可用

3. **流式传输中断**
   - 检查浏览器控制台错误信息
   - 确认服务器日志中的错误信息

### 日志查看

应用启动后，可以通过以下方式查看日志：

```bash
# 查看应用日志
tail -f logs/spring.log

# 或者在IDE中查看控制台输出
```

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。