---
layout: post
title:  "K8S内部构造学习笔记"
categories: [ Paas, Kubernetes, Architecture ]
image: assets/images/21.jpg
tags: [featured]
---

## K8S架构  
首先，一个K8S集群分为两个部分：
1. k8s控制平面组件(master nodes)
    - etcd分布式持久化存储
    - API Server
    - Scheduler
    - Controller Manager
2. 工作节点组件(worker nodes)
    - Kubelet
    - k8s服务代理(kube-proxy)
    - 容器运行时(Docker, rkt, ...)

![Architecture](assets/images/kubernetes-architecture.png)

除此之外，还有一些附加组件：
- k8s DNS server(以前用的是kube-dns, 现在默认用CoreDNS)
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
控制平面组件的etcd和API Server可同时运行多个实例，但Scheduler和Controller Manager同时只能各运行一个实例，其它实例只能处于standby模式。  
#### 各组件是如何运行的
各控制平面组件和kube-proxy既可以直接部署在系统里，也可以以pod形式运行，而Kubelet是唯一需要以常规系统组件运行的组件，因为是Kubelet让其它的核心组件能以pod形式运行于集群中的。  
如下命令的执行结果所示：
```shell
# -o custom-columns选项可以用来选择展示的列，--sort-by选项可以用来对资源排序
$ kubectl get po -n kube-system -o custom-columns=POD:metadata.name,NODE:spec.nodeName --sort-by spec.nodeName
# 以下是一个三master节点常见的输出
etcd-consul-4                                    consul-4
kube-controller-manager-consul-4                 consul-4
kube-apiserver-consul-4                          consul-4
kube-scheduler-consul-4                          consul-4
kube-proxy-ds-amd64-g9h5g                        consul-4
kube-flannel-ds-x768l                            consul-4
nginx-ingress-controller-c96864996-t9564         consul-4
etcd-consul-5                                    consul-5
...
etcd-consul-6                                    consul-6
...
kube-proxy-ds-amd64-c74v6                        izbp1axxxxxxxxxxxxxxxxx
kube-flannel-ds-8qz89                            izbp1axxxxxxxxxxxxxxxxx
...
```
#### K8S是如何用etcd的
etcd是一个高速分布式一致性KV存储，和它交互的只有API Server(这可以引入一些好处，比如一个健壮的乐观锁系统)，它是k8s存储集群状态和元数据的唯一地方。
k8s资源都会带有一个版本号 metadata.resourceVersion，客户端更新资源的时候都必须把版本号传回给API Server，如果版本号与当前存储在etcd中的不匹配，API Server就会拒绝这次更新。  
API Server其实就是把资源完整的JSON表示存储在etcd里。  
###### 集群化的etcd是如何保证一致性的？
etcd使用Raft共识算法来达成共识，保证一致性。Raft共识算法能保证在任意特定时刻，每个节点的状态要么是集群中大多数节点都同意过的当前状态，要么是大多数节点都同意过的之前某个状态。该算法要求集群中半数以上的节点都同意，才能更新到下一个状态。在网络断开发生脑裂的场景下，只有拥有集群中大多数节点(**quorum**)的一边才能接受状态更新请求。  
**etcd的实例数应该是一个奇数**，因为相比奇数个的etcd实例，加1的偶数个的etcd实例的集群的故障率会更高。通常情况下对一个大的集群，5或7个节点的etcd集群也就够用了。

#### API Server做了什么事
