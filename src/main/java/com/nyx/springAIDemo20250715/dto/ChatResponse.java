package com.nyx.springAIDemo20250715.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 聊天响应数据传输对象
 * 
 * 用于封装AI服务返回的响应数据，包含内容、完成状态、错误信息和时间戳
 * 
 * @author nyx
 * @version 1.0
 * @since 2025-07-15
 */
public class ChatResponse {
    
    /** 响应内容 */
    @JsonProperty("content")
    private String content;
    
    /** 是否完成响应，默认为false */
    @JsonProperty("finished")
    private Boolean finished = false;
    
    /** 错误信息 */
    @JsonProperty("error")
    private String error;
    
    /** 响应时间戳 */
    @JsonProperty("timestamp")
    private Long timestamp;
    
    /**
     * 默认构造函数
     * 自动设置当前时间戳
     */
    public ChatResponse() {
        this.timestamp = System.currentTimeMillis();
    }
    
    /**
     * 带内容的构造函数
     * 
     * @param content 响应内容
     */
    public ChatResponse(String content) {
        this.content = content;
        this.timestamp = System.currentTimeMillis();
    }
    
    /**
     * 带内容和完成状态的构造函数
     * 
     * @param content 响应内容
     * @param finished 是否完成
     */
    public ChatResponse(String content, Boolean finished) {
        this.content = content;
        this.finished = finished;
        this.timestamp = System.currentTimeMillis();
    }
    
    /**
     * 创建包含内容的响应对象
     * 
     * @param content 响应内容
     * @return ChatResponse实例
     */
    public static ChatResponse of(String content) {
        return new ChatResponse(content);
    }
    
    /**
     * 创建已完成的响应对象
     * 
     * @param content 响应内容
     * @return 标记为已完成的ChatResponse实例
     */
    public static ChatResponse finished(String content) {
        return new ChatResponse(content, true);
    }
    
    /**
     * 创建错误响应对象
     * 
     * @param error 错误信息
     * @return 包含错误信息且标记为已完成的ChatResponse实例
     */
    public static ChatResponse error(String error) {
        ChatResponse response = new ChatResponse();
        response.setError(error);
        response.setFinished(true);
        return response;
    }
    
    /**
     * 获取响应内容
     * 
     * @return 响应内容
     */
    public String getContent() {
        return content;
    }
    
    /**
     * 设置响应内容
     * 
     * @param content 响应内容
     */
    public void setContent(String content) {
        this.content = content;
    }
    
    /**
     * 获取完成状态
     * 
     * @return 是否完成响应
     */
    public Boolean getFinished() {
        return finished;
    }
    
    /**
     * 设置完成状态
     * 
     * @param finished 是否完成响应
     */
    public void setFinished(Boolean finished) {
        this.finished = finished;
    }
    
    /**
     * 获取错误信息
     * 
     * @return 错误信息
     */
    public String getError() {
        return error;
    }
    
    /**
     * 设置错误信息
     * 
     * @param error 错误信息
     */
    public void setError(String error) {
        this.error = error;
    }
    
    /**
     * 获取时间戳
     * 
     * @return 响应时间戳
     */
    public Long getTimestamp() {
        return timestamp;
    }
    
    /**
     * 设置时间戳
     * 
     * @param timestamp 响应时间戳
     */
    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }
}