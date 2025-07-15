package com.nyx.springAIDemo20250715.model;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 聊天消息模型类
 * 
 * 用于表示聊天对话中的单条消息，包含角色、内容和时间戳信息
 * 角色通常为"user"（用户）或"assistant"（AI助手）
 * 
 * @author nyx
 * @version 1.0
 * @since 2025-07-15
 */
public class ChatMessage {
    
    /** 消息角色（user/assistant） */
    @JsonProperty("role")
    private String role;
    
    /** 消息内容 */
    @JsonProperty("content")
    private String content;
    
    /** 消息时间戳 */
    @JsonProperty("timestamp")
    private Long timestamp;
    
    /**
     * 默认构造函数
     * 自动设置当前时间戳
     */
    public ChatMessage() {
        this.timestamp = System.currentTimeMillis();
    }
    
    /**
     * 带参数的构造函数
     * 
     * @param role 消息角色
     * @param content 消息内容
     */
    public ChatMessage(String role, String content) {
        this.role = role;
        this.content = content;
        this.timestamp = System.currentTimeMillis();
    }
    
    /**
     * 获取消息角色
     * 
     * @return 消息角色
     */
    public String getRole() {
        return role;
    }
    
    /**
     * 设置消息角色
     * 
     * @param role 消息角色
     */
    public void setRole(String role) {
        this.role = role;
    }
    
    /**
     * 获取消息内容
     * 
     * @return 消息内容
     */
    public String getContent() {
        return content;
    }
    
    /**
     * 设置消息内容
     * 
     * @param content 消息内容
     */
    public void setContent(String content) {
        this.content = content;
    }
    
    /**
     * 获取消息时间戳
     * 
     * @return 消息时间戳
     */
    public Long getTimestamp() {
        return timestamp;
    }
    
    /**
     * 设置消息时间戳
     * 
     * @param timestamp 消息时间戳
     */
    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }
    
    /**
     * 返回对象的字符串表示
     * 
     * @return 包含所有字段信息的字符串
     */
    @Override
    public String toString() {
        return "ChatMessage{" +
                "role='" + role + '\'' +
                ", content='" + content + '\'' +
                ", timestamp=" + timestamp +
                '}';
    }
}