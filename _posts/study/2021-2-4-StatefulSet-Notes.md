---
layout: post
title:  "K8S StatefulSet学习笔记"
categories: [ Paas, Kubernetes, StatefulSet ]
image: assets/images/21.jpg
tags: [featured]
---

#### 背景
一些分布式的有状态应用有两个常见的需求：
1. 分布式数据存储：每个Pod都需要有独自的存储卷；
2. 实例有长期稳定的身份标识，如hostname和IP；

尽管有一些tricks可以在某种程度上解决上面两个需求，但它们都显得那么繁琐丑陋，而且并不能解决所有问题，所以我们才有了StatefulSet这一新的资源类型。

## 理解StatefulSets
StatefulSet资源类型是为一些应用量身定做的，那些应用的每个实例都是一个不可替代的个体，有着自己的名称和状态。\
StatefulSet所管理的Pod都是有状态的Pod，当一个有状态的Pod实例消亡时，这个Pod实例必须要在另一个节点上复活(和它所替代的Pod实例有着一样的名称、网络身份和状态)。\
和ReplicaSet以及ReplicationController一样，StatefulSet也有副本数字段来提供伸缩功能，也有pod模板来给创建Pod时使用。

##### 通过StatefulSet来部署应用
通过StatefulSet来部署应用至少需要创建两种对象：
1. 一个StatefulSet所需要的治理服务，这是一个headless服务(让你的Pod能够发现彼此)；
2. 一个StatefulSet资源对象本身；

当你apply一个StatefulSet的manifest文件时，不像ReplicationController或ReplicaSet所有的Pod实例都会同时被创建，StatefulSet的Pod实例会一个一个地被陆续创建并正常运行，这是因为对一些集群化的有状态应用来说，如果一次性启动多个集群成员，可能会触发竞争条件。

#### 通过API Server直接和Pod或Service交流
首先与API Server直接通信需要认证和授权，绕过这些的最简单的方式就是使用`kubectl`做代理：
```shell
$ kubectl proxy
Starting to serve on 127.0.0.1:8001
```
这样你就可以用`localhost:8001`而不是真实的主机端口来与API Server通信了。\
`<apiServerHost>:<port>/api/v1/namespaces/<namespace>/pods/<pod name>/proxy/<path>`  通过API Server直接请求Pod所提供服务的URL\
`<apiServerHost>:<port>/api/v1/namespaces/<namespace>/services/<service name>/proxy/<path>`  通过API Server直接请求Service所提供服务的URL

#### StatefulSet的伸缩
当你缩减一个StatefulSet的副本数时，只会从最高序数的副本依次一个个地删除，而相应关联的PVC是不会动的。

## StatefulSet中副本彼此发现
集群化的有状态应用的一个重要需求就是副本的彼此发现，虽然通过Kubernetes的API Server可以做到这一点，但应该有更简便合理的方式。\
Kubernetes会自动创建DNS SRV记录(类似于DNS A, CNAME, 或MX记录)，指向支撑headless服务的所有Pods的hostname。\
`kubectl run -it srvlookup --image=tutum/dnsutils --rm --restart=Never -- dig SRV kubia.default.svc.cluster.local`  创建临时Pod，并用DNS查询工具dig列出你的headless服务的DNS SRV记录。
```shell
;; QUESTION SECTION:
;kubia.default.svc.cluster.local. IN    SRV

;; ANSWER SECTION:
kubia.default.svc.cluster.local. 5 IN   SRV     0 50 80 kubia-0.kubia.default.svc.cluster.local.
kubia.default.svc.cluster.local. 5 IN   SRV     0 50 80 kubia-1.kubia.default.svc.cluster.local.
```
所以让一个StatefulSet中的Pod副本发现所有其它副本，只要做一次DNS SRV记录查询即可。

## 正确理解StatefulSets是如何应对K8S集群节点故障的
K8S必须在100%确定一个有状态的pod不再运行了之后，才会创建它的替代品。所以当集群节点故障后，仅是Kubelet停止向master节点上报worker节点的状态，K8S并不能准确知道worker节点和上面运行的pod的状态，所以StatefulSet不应该创建故障节点上pod的替代品，除非系统管理员主动告诉K8S这么做。

#### 节点故障后Pod的状态
节点故障后，其上Pod的状态会先变成`Unknown`，如果节点一段时间后恢复正常，Pod的状态又会被标记成`Running`，但如果Pod的状态维持在`Unknown`超过几分钟（可配置）后，master节点上的K8S控制平面就会自动将Pod从故障节点上驱逐，但是因为故障节点上的Kubelet连不上master节点了，Pod的状态就一直保持在`Terminating`，Pod还会继续运行。\
这时候即使你主动执行`kubectl delete po`删除Pod，也并不会起作用，Pod的状态还是`Terminating`，因为API server收不到Kubelet真实删除Pod的反馈。所以只能执行强制删除Pod的命令：
```shell
# --grace-period=0，Pod会在其进程完成后正常终止，K8S默认正常终止时间段为30s，删除Pod时可以替换此宽限期，将--grace-period标志设置为强制终止Pod之前等待Pod终止的秒数
$ kubectl delete po kubia-0 --force --grace-period=0
# 如果执行了上面的命令后Pod还是卡在Unknown的状态，用下面的命令将Pod从集群中移除
$ kubectl patch pod <pod> -p '{"metadata":{"finalizers":null}}'
```
