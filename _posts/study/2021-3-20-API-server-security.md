---
layout: post
title:  "如何保障Kubernetes API server的安全？"
categories: [ Paas, Kubernetes, Architecture ]
image: assets/images/21.jpg
tags: [featured]
---

本篇我们主要介绍Kubernetes API server的安全策略。  

## 认证
API server可以配置使用一个或多个认证Authentication插件（同样的一个或多个授权Authorization插件），这些插件一般用以下方式来获取客户端的身份：
1. 客户端证书；
2. 在HTTP header中添加的认证token；
3. Basic HTTP认证；
4. 其它方式；


