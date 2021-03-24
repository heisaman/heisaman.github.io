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

Kubernetes中用`ServiceAccount(sa)`资源表示应用Pod的帐号。

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

Kubernetes默认给你创建ServiceAccount是无权查看和更改集群状态的，如果想写一个能和API server交互的应用的话，就必须理解如果通过RBAC相关的资源来管理授权。

API server暴露出来的是一个REST接口，所以用户发送到特定URL路径（代表特定的REST资源）上的`GET`，`POST`，`PUT`，`PATCH`，`DELETE`等HTTP请求，也就对应着对Kubernetes资源的`get`, `create`, `update`, `patch`, `delete`等操作。RBAC规则除了可以把安全许可应用到整个某种资源类型外，还可以应用到资源的具体实例，甚至一些非资源的URL路径上。

通过RBAC插件管理授权很简单，就是通过创建四种RBAC相关的Kubernetes资源来完成的：`Roles`和`ClusterRoles`负责定义能对哪些资源执行哪些操作, 而`RoleBindings`和`ClusterRoleBindings`负责把roles关联到不同的用户、组或者ServiceAccounts。  
**Roles**和**ClusterRoles**，或者**RoleBindings**和**ClusterRoleBindings**两两之间的区别也很好理解，Roles和RoleBindings都是命名空间下的资源，而ClusterRoles和ClusterRoleBindings都是集群层面的资源，其中命名空间下的RoleBindings资源也可以关联集群层面的ClusterRoles资源。

