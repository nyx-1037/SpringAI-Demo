package com.nyx.springAIDemo20250715.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nyx.springAIDemo20250715.config.QwenConfig;
import com.nyx.springAIDemo20250715.dto.ChatResponse;
import com.nyx.springAIDemo20250715.model.ChatMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * 通义千问AI服务类
 * 
 * 负责与阿里云通义千问API进行交互，提供以下功能：
 * - 流式聊天对话
 * - 会话管理和控制
 * - 请求构建和响应解析
 * - 错误处理和超时控制
 * 
 * 使用WebClient进行异步HTTP请求，支持Server-Sent Events流式响应
 * 
 * @author nyx
 * @version 1.0
 * @since 2025-07-15
 */
@Service
public class QwenAIService {
    
    /** 日志记录器 */
    private static final Logger logger = LoggerFactory.getLogger(QwenAIService.class);
    
    /** 通义千问配置信息 */
    private final QwenConfig qwenConfig;
    
    /** WebClient实例，用于HTTP请求 */
    private final WebClient webClient;
    
    /** JSON对象映射器，用于数据解析 */
    private final ObjectMapper objectMapper;
    
    /** 活跃流会话管理Map，key为sessionId，value为会话状态控制器 */
    private final Map<String, AtomicBoolean> activeStreams = new ConcurrentHashMap<>();
    
    /**
     * 构造函数，初始化QwenAIService
     * 
     * @param qwenConfig 通义千问配置对象
     */
    @Autowired
    public QwenAIService(QwenConfig qwenConfig) {
        this.qwenConfig = qwenConfig;
        // 配置WebClient，设置最大内存缓冲区为10MB
        this.webClient = WebClient.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
                .build();
        this.objectMapper = new ObjectMapper();
    }
    
    /**
     * 流式聊天方法
     * 
     * 与通义千问API进行流式对话，支持历史记录和会话管理
     * 
     * @param message 用户输入的消息内容
     * @param history 聊天历史记录列表
     * @param sessionId 会话ID，用于会话管理和控制
     * @return 返回包含AI响应的响应式流
     */
    public Flux<ChatResponse> streamChat(String message, List<ChatMessage> history, String sessionId) {
        logger.info("开始流式聊天 - sessionId: {}, message: {}", sessionId, message);
        
        // 创建会话控制标志
        AtomicBoolean isActive = new AtomicBoolean(true);
        activeStreams.put(sessionId, isActive);
        
        return createQwenRequest(message, history)
                .doOnNext(requestBody -> logger.info("发送请求到Qwen API - sessionId: {}, requestBody: {}", sessionId, requestBody))
                .flatMapMany(requestBody -> {
                    logger.info("开始WebClient请求 - sessionId: {}, URL: {}", sessionId, qwenConfig.getApi().getUrl());
                    
                    return webClient.post()
                            .uri(qwenConfig.getApi().getUrl())
                            .header("Authorization", "Bearer " + qwenConfig.getApi().getKey())
                            .header("Content-Type", "application/json")
                            .header("Accept", "text/event-stream")
                            .bodyValue(requestBody)
                            .retrieve()
                            .bodyToFlux(String.class)
                            .doOnNext(rawData -> logger.debug("收到原始数据 - sessionId: {}, data: {}", sessionId, rawData))
                            .takeWhile(data -> {
                                boolean active = isActive.get();
                                if (!active) {
                                    logger.info("流被中断 - sessionId: {}", sessionId);
                                }
                                return active;
                            })
                            .filter(data -> {
                                boolean isValid = !data.trim().isEmpty();
                                if (!isValid) {
                                    logger.debug("过滤掉空行 - sessionId: {}", sessionId);
                                }
                                return isValid;
                            })
                            .map(data -> {
                                ChatResponse response = parseStreamData(data);
                                if (response != null) {
                                    logger.debug("解析成功 - sessionId: {}, content: {}, finished: {}", 
                                            sessionId, response.getContent(), response.getFinished());
                                } else {
                                    logger.warn("解析失败 - sessionId: {}, data: {}", sessionId, data);
                                }
                                return response;
                            })
                            .filter(response -> response != null)
                            .doOnComplete(() -> {
                                activeStreams.remove(sessionId);
                                logger.info("Stream completed for session: {}", sessionId);
                            })
                            .doOnError(error -> {
                                activeStreams.remove(sessionId);
                                logger.error("Stream error for session: {}", sessionId, error);
                            })
                            .timeout(Duration.ofMinutes(5));
                })
                .onErrorResume(error -> {
                    logger.error("Error in stream chat - sessionId: {}", sessionId, error);
                    return Flux.just(ChatResponse.error("AI服务暂时不可用: " + error.getMessage()));
                });
    }
    
    /**
     * 停止指定会话的流式传输
     * 
     * @param sessionId 要停止的会话ID
     */
    public void stopStream(String sessionId) {
        AtomicBoolean isActive = activeStreams.get(sessionId);
        if (isActive != null) {
            isActive.set(false);
            activeStreams.remove(sessionId);
            logger.info("Stream stopped for session: {}", sessionId);
        }
    }
    
    /**
     * 创建通义千问API请求体
     * 
     * 根据用户消息和历史记录构建符合通义千问API格式的请求数据
     * 
     * @param message 用户当前输入的消息
     * @param history 聊天历史记录
     * @return 返回包含请求数据的Mono对象
     */
    private Mono<Map<String, Object>> createQwenRequest(String message, List<ChatMessage> history) {
        return Mono.fromCallable(() -> {
            Map<String, Object> request = new HashMap<>();
            
            // 设置模型参数
            Map<String, Object> model = new HashMap<>();
            model.put("model", qwenConfig.getApi().getModel());
            request.put("model", qwenConfig.getApi().getModel());
            
            // 构建消息列表
            Map<String, Object> input = new HashMap<>(); 
            StringBuilder prompt = new StringBuilder();
            
            // 添加历史对话
            if (history != null && !history.isEmpty()) {
                for (ChatMessage msg : history) {
                    if ("user".equals(msg.getRole())) {
                        prompt.append("用户: ").append(msg.getContent()).append("\n");
                    } else if ("assistant".equals(msg.getRole())) {
                        prompt.append("助手: ").append(msg.getContent()).append("\n");
                    }
                }
            }
            
            // 添加当前消息
            prompt.append("用户: ").append(message).append("\n助手: ");
            
            input.put("prompt", prompt.toString());
            request.put("input", input);
            
            // 设置参数
            Map<String, Object> parameters = new HashMap<>();
            parameters.put("max_tokens", qwenConfig.getApi().getMaxTokens());
            parameters.put("temperature", qwenConfig.getApi().getTemperature());
            parameters.put("incremental_output", true);
            request.put("parameters", parameters);
            
            logger.debug("Qwen request: {}", request);
            return request;
        });
    }
    
    /**
     * 解析流式数据
     * 
     * 将从通义千问API接收到的原始数据解析为ChatResponse对象
     * 
     * @param data 从API接收到的原始JSON字符串数据
     * @return 解析后的ChatResponse对象，解析失败时返回null
     */
    private ChatResponse parseStreamData(String data) {
        try {
            String jsonData = data.trim();
            
            // 检查是否为结束标记
            if ("[DONE]".equals(jsonData)) {
                return ChatResponse.finished("");
            }
            
            JsonNode jsonNode = objectMapper.readTree(jsonData);
            JsonNode output = jsonNode.path("output");
            
            if (output.has("text")) {
                String content = output.path("text").asText();
                boolean finished = output.path("finish_reason").asText().equals("stop");
                logger.debug("解析数据成功 - content: {}, finished: {}", content, finished);
                return new ChatResponse(content, finished);
            }
            
            logger.debug("数据中没有text字段 - data: {}", jsonData);
            return null;
        } catch (Exception e) {
            logger.error("Error parsing stream data: {}", data, e);
            return null;
        }
    }
    
    /**
     * 检查指定会话的流是否处于活跃状态
     * 
     * @param sessionId 要检查的会话ID
     * @return 如果会话存在且处于活跃状态返回true，否则返回false
     */
    public boolean isStreamActive(String sessionId) {
        AtomicBoolean isActive = activeStreams.get(sessionId);
        return isActive != null && isActive.get();
    }
}