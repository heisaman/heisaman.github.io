---
layout: post
title:  "如何保障Kubernetes API server的安全？"
categories: [ Paas, Kubernetes, Architecture ]
image: assets/images/21.jpg
tags: [featured]
---

本篇我们主要介绍Kubernetes API server的安全策略。  

## 认证

API server可以配置使用一个或多个认证Authentication插件（同样一个或多个授权Authorization插件），这些插件一般用以下方式来获取客户端的身份：

1. 客户端证书；
2. 在HTTP header中添加的认证token；
3. Basic HTTP认证；
4. 其它方式；

Kubernetes中用`ServiceAccount`资源表示应用Pod的帐号。

### ServiceAccount

每个容器启动的时候都会通过一个secret卷加载一个ServiceAccount的认证token文件到容器的文件目录，API server的认证插件就可以通过这个token获取应用的ServiceAccount用户名，格式如：  
`system:serviceaccount:<namespace>:<service account name>`  
每个命名空间会自动创建一个默认的ServiceAccount资源，名字就是default，你可以创建额外的sa，不过每个pod只会和一个同命名空间的sa资源关联。  
通过把不同的sa指定给pod，你就能控制每个pod有权访问的资源，API server是通过系统层面的授权插件来获取权限信息的，一般是RBAC插件。

```shell
# 创建一个sa资源对象
$ kubectl create serviceaccount foo
```

在sa中使用的认证tokens是`JSON Web Tokens (JWT)`。  
使用了含有`kubernetes.io/enforce-mountable-secrets="true"`注解的sa的pod，就只能载入此sa中定义的mountable Secrets列表secret，不过此sa中定义的imagePullSecrets列表的secret则会全部载入到pod容器中。  
通过设置pod定义中的`spec.serviceAccountName`字段，就可以指定该pod使用的sa，当你的集群使用了RBAC插件，创建并使用一些额外的sa帐号就是必须的了。

## 基于角色的访问控制（RBAC）


