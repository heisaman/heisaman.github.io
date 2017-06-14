---
layout: post
title: Dagoba: 一款内存图数据库（500行开源代码解析之二）
---
<br><br>
### 前言
随着分布式系统的革命再一次改变了数据存储方面的所有事物，数据打破了空间上的种种限制，能自由漫步于机器与机器之间。坚持CAP定理的理论学家们打破了关系型数据库的垄断地位，为新的数据管理技术打开了大门————其中的某些能使人想起对可随机访问的数据进行管理的一些早期尝试。今天我们就来看这其中的一种技术，图数据库。

### 做一个试试
本文的目标是：传授长久以来软件专家设计一款软件的流程，并以此来搭建一款图数据库，重点将放在代码的简洁性上。

```javascript
parents = function(vertices) {
  var accumulator = []
  for(var i=0; i < E.length; i++) {
    var edge = E[i]
    if(vertices.indexOf(edge[1]) !== -1)
      accumulator.push(edge[0])
  }
  return accumulator
}
```
使用reduce方法的版本：
```javascript
parents  = (vertices) => E.reduce( (acc, [parent, child])
         => vertices.includes(child)  ? acc.concat(parent) : acc , [] )
children = (vertices) => E.reduce( (acc, [parent, child])
         => vertices.includes(parent) ? acc.concat(child)  : acc , [] )
```
