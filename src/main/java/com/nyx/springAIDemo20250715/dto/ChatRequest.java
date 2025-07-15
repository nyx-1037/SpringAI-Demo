package com.nyx.springAIDemo20250715.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.nyx.springAIDemo20250715.model.ChatMessage;

import java.util.List;

/**
 * 聊天请求数据传输对象
 * 
 * 用于封装前端发送的聊天请求数据，包含用户消息、历史记录和流式设置
 * 
 * @author nyx
 * @version 1.0
 * @since 2025-07-15
 */
public class ChatRequest {
    
    /** 用户输入的消息内容 */
    @JsonProperty("message")
    private String message;
    
    /** 聊天历史记录列表 */
    @JsonProperty("history")
    private List<ChatMessage> history;
    
    /** 是否启用流式响应，默认为true */
    @JsonProperty("stream")
    private Boolean stream = true;
    
    /**
     * 默认构造函数
     */
    public ChatRequest() {}
    
    /**
     * 带参数的构造函数
     * 
     * @param message 用户消息
     * @param history 聊天历史记录
     */
    public ChatRequest(String message, List<ChatMessage> history) {
        this.message = message;
        this.history = history;
    }
    
    /**
     * 获取用户消息
     * 
     * @return 用户输入的消息内容
     */
    public String getMessage() {
        return message;
    }
    
    /**
     * 设置用户消息
     * 
     * @param message 用户输入的消息内容
     */
    public void setMessage(String message) {
        this.message = message;
    }
    
    /**
     * 获取聊天历史记录
     * 
     * @return 聊天历史记录列表
     */
    public List<ChatMessage> getHistory() {
        return history;
    }
    
    /**
     * 设置聊天历史记录
     * 
     * @param history 聊天历史记录列表
     */
    public void setHistory(List<ChatMessage> history) {
        this.history = history;
    }
    
    /**
     * 获取流式响应设置
     * 
     * @return 是否启用流式响应
     */
    public Boolean getStream() {
        return stream;
    }
    
    /**
     * 设置流式响应
     * 
     * @param stream 是否启用流式响应
     */
    public void setStream(Boolean stream) {
        this.stream = stream;
    }
}