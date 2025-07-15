package com.nyx.springAIDemo20250715.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web配置类
 * 
 * 配置Spring MVC相关设置，包括：
 * - CORS跨域访问配置
 * - 静态资源处理配置
 * 
 * @author nyx
 * @version 1.0
 * @since 2025-07-15
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
    
    /**
     * 配置跨域访问
     * 
     * 允许前端应用跨域访问API接口，支持所有常用HTTP方法
     * 
     * @param registry CORS注册器
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("*")  // 允许所有来源
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")  // 允许的HTTP方法
                .allowedHeaders("*")  // 允许所有请求头
                .allowCredentials(false)  // 不允许携带凭证
                .maxAge(3600);  // 预检请求缓存时间（秒）
    }
    
    /**
     * 配置静态资源处理
     * 
     * 设置静态资源的访问路径和缓存策略
     * 
     * @param registry 资源处理器注册器
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 配置静态资源处理：将所有请求映射到classpath:/static/目录
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .setCachePeriod(3600);  // 设置缓存时间为1小时
    }
}