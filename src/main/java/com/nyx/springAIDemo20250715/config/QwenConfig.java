package com.nyx.springAIDemo20250715.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * 通义千问AI配置类
 * 
 * 用于从application.yml配置文件中读取通义千问API相关配置信息，
 * 包括API密钥、请求URL、模型参数等。
 * 
 * 配置前缀：spring.ai.qwen
 * 
 * @author nyx
 * @version 1.0
 * @since 2025-07-15
 */
@Configuration
@ConfigurationProperties(prefix = "spring.ai.qwen")
public class QwenConfig {
    
    /** API配置信息 */
    private Api api = new Api();
    
    /**
     * 获取API配置
     * 
     * @return API配置对象
     */
    public Api getApi() {
        return api;
    }
    
    /**
     * 设置API配置
     * 
     * @param api API配置对象
     */
    public void setApi(Api api) {
        this.api = api;
    }
    
    /**
     * API配置内部类
     * 
     * 包含通义千问API的具体配置参数
     */
    public static class Api {
        /** API密钥 */
        private String key;
        
        /** API请求URL */
        private String url;
        
        /** 使用的模型名称，默认为qwen-turbo */
        private String model = "qwen-turbo";
        
        /** 最大生成token数量，默认为2000 */
        private Integer maxTokens = 2000;
        
        /** 温度参数，控制生成文本的随机性，默认为0.7 */
        private Double temperature = 0.7;
        
        /** 是否启用流式输出，默认为true */
        private Boolean stream = true;
        
        /**
         * 获取API密钥
         * 
         * @return API密钥
         */
        public String getKey() {
            return key;
        }
        
        /**
         * 设置API密钥
         * 
         * @param key API密钥
         */
        public void setKey(String key) {
            this.key = key;
        }
        
        /**
         * 获取API请求URL
         * 
         * @return API请求URL
         */
        public String getUrl() {
            return url;
        }
        
        /**
         * 设置API请求URL
         * 
         * @param url API请求URL
         */
        public void setUrl(String url) {
            this.url = url;
        }
        
        /**
         * 获取模型名称
         * 
         * @return 模型名称
         */
        public String getModel() {
            return model;
        }
        
        /**
         * 设置模型名称
         * 
         * @param model 模型名称
         */
        public void setModel(String model) {
            this.model = model;
        }
        
        /**
         * 获取最大token数量
         * 
         * @return 最大token数量
         */
        public Integer getMaxTokens() {
            return maxTokens;
        }
        
        /**
         * 设置最大token数量
         * 
         * @param maxTokens 最大token数量
         */
        public void setMaxTokens(Integer maxTokens) {
            this.maxTokens = maxTokens;
        }
        
        /**
         * 获取温度参数
         * 
         * @return 温度参数
         */
        public Double getTemperature() {
            return temperature;
        }
        
        /**
         * 设置温度参数
         * 
         * @param temperature 温度参数
         */
        public void setTemperature(Double temperature) {
            this.temperature = temperature;
        }
        
        /**
         * 获取流式输出设置
         * 
         * @return 是否启用流式输出
         */
        public Boolean getStream() {
            return stream;
        }
        
        /**
         * 设置流式输出
         * 
         * @param stream 是否启用流式输出
         */
        public void setStream(Boolean stream) {
            this.stream = stream;
        }
    }
}