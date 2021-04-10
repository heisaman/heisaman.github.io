---
layout: post
title:  "CPUThrottlingHigh触发太多报警了该怎么办？"
categories: [ Prometheus, Alerts, Resources ]
image: assets/images/z4-unsplash.jpg
---

## CPUThrottlingHigh解释

**CPU过热**

关于 CPU 的 limit 合理性指标。查出最近5分钟，超过25%的 CPU 执行周期受到限制的容器。表达式：

```shell
sum(increase(container_cpu_cfs_throttled_periods_total{container!="", }[5m])) by (container, pod, namespace) 
    / 
sum(increase(container_cpu_cfs_periods_total{}[5m])) by (container, pod, namespace)
    > ( 25 / 100 )
```

相关指标：

* container_cpu_cfs_throttled_periods_total：容器生命周期中度过的受限的 cpu 周期总数
* container_cpu_cfs_periods_total：容器生命周期中度过的 cpu 周期总数

`CFS` (Completly Fair Scheduler) 完全公平调度器，是Linux内核中的默认的进程调度器。

## 报警现象及原因

集群中会有一些pod发出CPUThrottlingHigh的报警，但是当我们查看监控，会发现这些pod的当前使用的cpu核数并未达到其设置的requests或limits值。

**原因**：如果limits设置得低的话，有尖刺的cpu负载虽然平均使用率很低，但仍有一些执行周期会受到限制。

有人发现在Linux内核CFS上的bugs也导致了上述cpu受限周期比例升高的问题，有几个修复补丁也可以缓解这个告警。  
不过即使升级了补丁，正常容器的cpu资源limits也不应该小于100微核，例如我们的很多flannel的pod容器limits就设置的是 `cpu: 100m`，一般内核的上下文切换时间就可能有这么昂贵，所以很容易出现cpu周期受限。

## 解决办法

CPUThrottlingHigh是一种基于原因而不是基于现象的报警，有时会有用，特别是我们做debugging的时候。但是如果你的应用对执行延迟不敏感，这种报警在绝大多数情况下都不需要做什么。

我们可以采用以下几种解决办法：

* 提高容器cpu资源的limits，但是保持requests在平均使用核数的95%左右，就可以让我们有更少的cpu受限周期，同时保持不错的cpu资源使用率
* 提高CPUThrottlingHigh报警的阈值到25%以上
* 把一些对执行时间不敏感的应用从这条报警中移除


参考链接：  
* [Github Issue: CPUThrottlingHigh false positives](https://github.com/kubernetes-monitoring/kubernetes-mixin/issues/108)
* [Unthrottled: How a Valid Fix Becomes a Regression](https://engineering.indeedblog.com/blog/2019/12/cpu-throttling-regression-fix/)
