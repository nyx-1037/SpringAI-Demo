package com.nyx.springAIDemo20250715.controller;

import com.nyx.springAIDemo20250715.dto.ChatRequest;
import com.nyx.springAIDemo20250715.dto.ChatResponse;
import com.nyx.springAIDemo20250715.service.QwenAIService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.Map;
import java.util.UUID;

/**
 * 聊天控制器
 * 
 * 提供AI聊天相关的REST API接口，包括：
 * - 流式聊天对话
 * - 停止流式传输
 * - 检查流状态
 * - 健康检查
 * 
 * 使用Server-Sent Events (SSE)技术实现实时流式响应
 * 
 * @author nyx
 * @version 1.0
 * @since 2025-07-15
 */
@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*") // 允许跨域访问
public class ChatController {
    
    /** 日志记录器 */
    private static final Logger logger = LoggerFactory.getLogger(ChatController.class);
    
    /** 通义千问AI服务 */
    private final QwenAIService qwenAIService;
    
    /**
     * 构造函数，注入QwenAIService依赖
     * 
     * @param qwenAIService 通义千问AI服务实例
     */
    @Autowired
    public ChatController(QwenAIService qwenAIService) {
        this.qwenAIService = qwenAIService;
    }
    
    /**
     * 流式聊天接口
     * 
     * 接收用户消息并返回AI的流式响应，使用Server-Sent Events技术
     * 实现实时数据传输，支持打字机效果显示
     * 
     * @param request 聊天请求对象，包含用户消息和历史记录
     * @param sessionIdParam 会话ID参数，如果为空则自动生成新的会话ID
     * @return 返回包含AI响应数据的响应式流
     */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> streamChat(@RequestBody ChatRequest request,
                                   @RequestParam(name = "sessionIdParam", defaultValue = "") String sessionIdParam) {
        
        // 如果没有提供sessionId，生成一个新的
        String sessionId = sessionIdParam.isEmpty() ? UUID.randomUUID().toString() : sessionIdParam;
        
        logger.info("Starting stream chat for session: {}, message: {}", sessionId, request.getMessage());
        
        return qwenAIService.streamChat(request.getMessage(), request.getHistory(), sessionId)
                .doOnNext(response -> logger.debug("Controller收到响应 - sessionId: {}, content: {}, finished: {}", 
                        sessionId, response.getContent(), response.getFinished()))
                .map(response -> {
                    try {
                        // 转换为JSON格式（Spring Boot会自动添加SSE格式）
                        String jsonData = objectToJson(response);
                        logger.debug("发送数据 - sessionId: {}, data: {}", sessionId, jsonData);
                        return jsonData;
                    } catch (Exception e) {
                        logger.error("Error converting response to JSON - sessionId: {}", sessionId, e);
                        return "{\"error\":\"数据转换错误\",\"finished\":true}";
                    }
                })
                .doOnComplete(() -> logger.info("Stream completed for session: {}", sessionId))
                .doOnError(error -> logger.error("Stream error for session: {}", sessionId, error));
    }
    
    /**
     * 停止流式传输
     * 
     * 根据会话ID停止正在进行的流式对话传输
     * 
     * @param sessionId 要停止的会话ID
     * @return 返回操作结果，包含成功状态和消息
     */
    @PostMapping("/stop/{sessionId}")
    public ResponseEntity<Map<String, Object>> stopStream(@PathVariable String sessionId) {
        logger.info("Stopping stream for session: {}", sessionId);
        qwenAIService.stopStream(sessionId);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Stream stopped",
                "sessionId", sessionId
        ));
    }
    
    /**
     * 检查流状态
     * 
     * 检查指定会话ID的流式传输是否仍在活跃状态
     * 
     * @param sessionId 要检查的会话ID
     * @return 返回会话状态信息，包含会话ID和活跃状态
     */
    @GetMapping("/status/{sessionId}")
    public ResponseEntity<Map<String, Object>> getStreamStatus(@PathVariable String sessionId) {
        boolean isActive = qwenAIService.isStreamActive(sessionId);
        return ResponseEntity.ok(Map.of(
                "sessionId", sessionId,
                "active", isActive
        ));
    }
    
    /**
     * 健康检查接口
     * 
     * 提供服务健康状态检查，用于监控和负载均衡
     * 
     * @return 返回服务状态信息，包含状态、服务名称和时间戳
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "service", "Spring AI Chat Service",
                "timestamp", System.currentTimeMillis()
        ));
    }
    
    /**
     * 简单的JSON转换方法
     * 
     * 将ChatResponse对象转换为JSON字符串格式
     * 
     * @param response 要转换的聊天响应对象
     * @return 转换后的JSON字符串
     */
    private String objectToJson(ChatResponse response) {
        StringBuilder json = new StringBuilder();
        json.append("{");
        
        if (response.getContent() != null) {
            json.append("\"content\":\"").append(escapeJson(response.getContent())).append("\",");
        }
        
        json.append("\"finished\":").append(response.getFinished()).append(",");
        
        if (response.getError() != null) {
            json.append("\"error\":\"").append(escapeJson(response.getError())).append("\",");
        }
        
        json.append("\"timestamp\":").append(response.getTimestamp());
        json.append("}");
        
        return json.toString();
    }
    
    /**
     * 转义JSON字符串
     * 
     * 对字符串中的特殊字符进行转义，确保生成有效的JSON格式
     * 
     * @param str 要转义的原始字符串
     * @return 转义后的安全JSON字符串
     */
    private String escapeJson(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\")
                  .replace("\"", "\\\"")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r")
                  .replace("\t", "\\t");
    }
}