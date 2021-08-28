---
layout: post
title:  "CAP理论，ACID理论和BASE理论"
categories: [ 分布式, 算法, 实战 ]
image: assets/images/23.jpg
---

## CAP理论

CAP 理论是对分布式系统的特性做了高度抽象，形成的三个指标：

- 一致性（Consistency）
- 可用性（Availability）
- 分区容错性（Partition Tolerance）

<ins>一致性强调的是数据正确，可用性强调的是服务可用，但不保证数据正确，而分区容错性强调的是集群对分区故障的容错能力</ins>。

因为分布式系统与单机系统不同，它涉及到多节点间的通讯和交互，节点间的分区故障是必然发生的，所以，在分布式系统中分区容错性是必须要考虑的。


## ACID理论，追求一致性（C）


## BASE理论，追求可用性（A）
