---
layout: post
title:  "Kubernetes集群节点和网络安全指南"
categories: [ Paas, Kubernetes, Security ]
image: assets/images/21.jpg
tags: [featured]
---

Pods可以访问它们所运行的节点上的资源，为了安全起见，本篇我们将介绍如何配置Kubernetes集群，让用户不能拿着他们的pods肆意妄为，然后再谈谈如何让pods通信的网络变得安全。

## 让pod中使用host节点的命名空间(Linux namespaces)

每个pod中的容器都运行在自己独立的Linux namespaces中，例如network namespace、PID namespace、IPC namespace等等这些，其运行的host节点也有自己默认的namespaces，以此来实现资源隔离。

但是，如果你把pod定义spec下的`hostNetwork`属性设为true，pod就使用了host节点的network namespace，使用的就是节点的网络接口。同理，`hostPID`和`hostIPC`这两个属性也一样，分别让pod使用节点的PID namespace和IPC namespace。这些特性主要是给系统pods服务的。

*pod定义spec.containers.ports下的`hostPort`属性可以用来仅把pod绑定到节点的port，而不使用节点的网络命名空间。* 这个特性主要用来暴露系统的一些services。

## 配置pod中容器的securityContext字段

除了允许pod使用host节点的Linux namespaces外，其它有关安全的特性也可以通过pod和它的容器的securityContext字段属性来配置。securityContext属性可以配置实现以下功能：  
![what-is-configurable-in-security-context](/assets/images/what-is-configurable-in-security-context.png)

container层面的security context所允许设置的属性：

- `runAsUser`: 
- `runAsNonRoot`: 
- `privileged`: 让pod获得其所在host节点的所有内核权限
- `capabilities.add`:
    - `SYS_TIME`:
    - ...
- `capabilities.drop`:
    - `CHOWN`:
    - ...
- `readOnlyRootFilesystem`:

pod层面的security context除了上面的属性，还允许设置一些额外属性：

- `fsGroup`: 
- `supplementalGroups`: 

## 限制pod中有关安全的特性的使用

针对上面介绍的这些有关安全的特性，必须有一种机制能让集群管理员来限制用户对这些特性的使用，所以在Kubernetes中引入了`PodSecurityPolicy`资源。

### PodSecurityPolicy

`PodSecurityPolicy`是一种集群层面的资源，定义了哪些有关安全的特性用户在pods中能用或不能用，而负责维持这些规则的工作是由API server中运行的PodSecurityPolicy准入控制插件来完成的。

一个PodSecurityPolicy资源可以定义像下面这些事情：  
![Things-defined-by-a-PodSecurityPolicy](/assets/images/things-defined-by-a-PodSecurityPolicy1.png)
![Things-defined-by-a-PodSecurityPolicy](/assets/images/things-defined-by-a-PodSecurityPolicy2.png)


### 针对不同的用户和组使用不同的PodSecurityPolicies

这也是通过RBAC机制实现的，创建指向不同的PodSecurityPolicies的ClusterRoles资源，再通过ClusterRoleBindings绑定到具体的用户或组，PodSecurityPolicy准入控制插件在判断是否接收一个pod的定义的时候，只会考虑对创建这个pod的用户可用的规则。

#### 用kubectl创建新用户

```shell
# 创建新用户
$ kubectl config set-credentials alice --username=alice --password=password
# --user选项让你以另一个认证用户的身份执行命令
$ kubectl --user alice create -f pod-privileged.yaml
# 查看kubectl执行的当前上下文（用户密钥）
$ kubectl config current-context
# 查看所有配置
$ kubectl config view
```

## 隔离pod之间的网络

隔离pod之间的网络，让网络变得更安全的方式就是，通过创建`NetworkPolicy`资源来配置网络隔离，不过这首先取决于集群中使用的容器网络插件是否支持。主要是配置`ingress`和`egress`这两种规则，以及三种pod匹配选项方式。