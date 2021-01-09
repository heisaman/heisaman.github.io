---
layout: post
title:  "K8S Deployment学习笔记"
categories: [ Paas, Kubernetes, Deployment ]
image: assets/images/21.jpg
tags: [featured]
---

#### 背景
更新Pod中应用版本的方式一般有两种：
1. 先删除所有当前运行的Pods，再启动新版本应用的Pods；
2. 先启动新版本的Pods，等新版本的Pods就绪了，再删除老版本的Pods，可以一次性全部替换，也可以一个一个Pod地替换；
显而易见两种方式各有优劣。
方式2可以用蓝绿部署(blue-green deployment)的方式实现，修改服务的标签选择器`kubectl set selector`，使其切换到代理新版本Pods的应用。
方式2也可以使用滚动更新的方式实现，`kubectl rolling-update kubia-v1 kubia-v2 --image=luksa/kubia:v2`，不过这是一种过时的更新应用的方式，原因有三：a. 没人期望K8s修改我们创建的资源对象, b. 更新的过程是在kubectl客户端执行的，如果中间出现网络异常，pod和rc就会停留在更新的中间状态, c. 这种更新方式是命令式的，而不是K8s通用的声明式的。

默认的容器镜像拉取策略(imagePullPolicy)，取决于镜像的tag，当tag是latest时，默认值为Always，当tag是别的值时，默认值为IfNotPresent。
用kubectl的`--v 6`选项可以提高日志级别，让你能看到kubectl发送给API Server的请求。

## Deployment: 声明式地更新应用
Deployment就是为了部署应用和声明式地更新应用而出现的高层资源，它基于底层资源ReplicaSet，下面你会看到为什么它比ReplicaSet或ReplicaController更优越。
一个Deployment可以创建多个ReplicaSets，其中每个都对应着Pod模板的一个版本。
前述更新Pod中应用版本的方式，分别对应了Deployment的更新策略：
1. Recreate方式；
2. RollingUpdate方式（默认）；
只有当你的应用不支持同时运行多个版本时，才应该考虑使用Recreate的更新策略。
现在更新应用版本的方式只需要一条命令`kubectl set image deployment kubia nodejs=luksa/kubia:v2`，作为Kubernetes控制平面一部分的控制器就会为你执行更新操作，不是在kubectl客户端，而是在Kubernetes服务端，它是声明式的而不是命令式的。
Kubernetes会创建一个新的带有不同镜像版本模板的ReplicaSet，逐步增加其副本数直至目标副本数，逐步减少旧的ReplicaSet的副本数，直至为0，但不会删除旧的ReplicaSet。

修改K8s中已存在资源的几种方式：
`kubectl patch deployment kubia -p '{"spec": {"minReadySeconds": 10}}'` 可以用来修改资源的一个或少量属性
`kubectl set image deployment kubia nodejs=luksa/kubia:v2` 可以用来修改任何包含容器的资源的镜像
`kubectl apply -f kubia-deployment-v2.yaml` 用一个完整的资源定义YAML或JSON文件来更新资源的属性值，如果资源对象不存在就直接创建
`kubectl replace -f kubia-deployment-v2.yaml` 用一个完整的资源定义YAML或JSON文件来替换资源对象，资源对象必须存在

#### 回滚一个Deployment
`kubectl rollout undo deployment kubia` 将一个Deployment回滚至上一个镜像版本，`undo`命令也可以在rollout还没完成时终止更新立即恢复至原本状态。
`kubectl rollout history deployment kubia` 可以查看Deployment的所有更新历史记录(现在默认保留10个历史版本记录)。
`kubectl rollout undo deployment kubia --to-revision=1` 回滚到一个特定的Deployment的更新版本。

两个参数可以控制滚动更新的速率：
`maxSurge` 最大上涌，定义相对于目标副本数的最大可多出来的副本数，默认为25%向上取整；
`maxUnavailable` 最大不可用，定义相对于目标副本数的最大不可用副本数，默认为25%向下取整。

#### 暂停Deployment的更新过程
`kubectl rollout pause deploy kubia` 可以暂停一个Deployment新版本的更新过程，这就实现了所谓的金丝雀发布(canary release)
`kubectl rollout resume deploy kubia` 可以继续一个Deployment新版本的更新过程
暂停更新过程并不太适当，未来可能会有一种新的升级策略来自动化地做这件事，目前实现金丝雀发布的合适方式是用两个Deployment，一步步伸缩。

#### 阻塞有问题版本的发布
Deployment的`minReadySeconds`属性表示当一个Pod处于就绪(Ready)状态多久之后Kubernetes才会认为它是可用的，这个属性可以用来减慢发布更新的过程，但其最主要的作用是防止你发布了一个有问题的版本。如果一个Pod并不能正常工作，其就绪探针在`minReadySeconds`时间到达之前就开始失败，那么一个新版本的发布过程就自然而然地被阻塞了。所以如果合理地设置了`minReadySeconds`属性，就可以保证有问题的版本不会顺利发布。
Deployment的`progressDeadlineSeconds`属性可以用来配置发布过程的超时时间，默认10分钟。
现在丢弃失败发布并回滚还需要手动执行`kubectl rollout undo deployment kubia`，在未来的版本中发布超时时间`progressDeadlineSeconds`一过，丢弃并回滚会自动执行。
