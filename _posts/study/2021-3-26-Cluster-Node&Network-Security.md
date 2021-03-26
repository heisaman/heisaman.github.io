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


