---
layout: post
title:  "K8S内部构造学习笔记"
categories: [ Paas, Kubernetes, Architecture ]
image: assets/images/21.jpg
tags: [featured]
---

## K8S架构
首先，一个K8S集群分为两个部分：
1. k8s控制平面(master nodes)
    - etcd分布式持久化存储
    - API Server
    - Scheduler
    - Controller Manager
2. 工作节点(worker nodes)
    - Kubelet
    - k8s服务代理(kube-proxy)
    - 容器运行时(Docker, rkt, ...)

![Architecture](assets/images/kubernetes-architecture.png)

除此之外，还有一些附加组件：
- k8s DNS server
- Dashboard
- Ingress 控制器
- Heapster
- 容器网络接口插件(CNI)

```shell
# 获取master节点上的控制平面组件的健康状态
$ kubectl get componentstatuses
```
与API Server的连接基本上都是由其它组件发起的，除了像用kubectl获取日志、`kubectl attach`和`kubectl port-forward`这种命令是API Server主动连接Kubelet外。  
用`kubectl attach`可以连到一个正在运行的容器，它与`kubectl exec`类似，但它是attach到容器中运行的主进程，而不是另起一个进程。  
