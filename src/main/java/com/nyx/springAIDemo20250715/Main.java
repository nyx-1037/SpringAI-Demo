package com.nyx.springAIDemo20250715;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Spring AI Chat Demo 应用程序主类
 * 
 * 这是一个基于Spring Boot的AI聊天演示应用，集成了通义千问AI模型，
 * 提供流式对话功能和Markdown渲染支持。
 * 
 * @author nyx
 * @version 1.0
 * @since 2025-07-15
 */
@SpringBootApplication
public class Main {
	
	/**
	 * 应用程序入口点
	 * 
	 * @param args 命令行参数
	 */
	public static void main(String[] args) {
		SpringApplication.run(Main.class, args);
		System.out.println("启动成功");
	}
}