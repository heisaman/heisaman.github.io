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

### 构建一个更好的图


```javascript
Dagoba.G = {}                                   // the prototype

Dagoba.graph = function(V, E) {                 // the factory
  var graph = Object.create( Dagoba.G )

  graph.edges       = []                        // fresh copies so they're not shared
  graph.vertices    = []
  graph.vertexIndex = {}                        // a lookup optimization

  graph.autoid = 1                              // an auto-incrementing ID counter

  if(Array.isArray(V)) graph.addVertices(V)     // arrays only, because you wouldn't
  if(Array.isArray(E)) graph.addEdges(E)        //   call this with singular V and E

  return graph
}
```

```javascript
Dagoba.G.addVertices = function(vs) { vs.forEach(this.addVertex.bind(this)) }
Dagoba.G.addEdges    = function(es) { es.forEach(this.addEdge  .bind(this)) }
```

```javascript
Dagoba.G.addVertex = function(vertex) {         // accepts a vertex-like object
  if(!vertex._id)
    vertex._id = this.autoid++
  else if(this.findVertexById(vertex._id))
    return Dagoba.error('A vertex with that ID already exists')

  this.vertices.push(vertex)
  this.vertexIndex[vertex._id] = vertex         // a fancy index thing
  vertex._out = []; vertex._in = []             // placeholders for edge pointers
  return vertex._id
}
```

```javascript
Dagoba.G.addEdge = function(edge) {             // accepts an edge-like object
  edge._in  = this.findVertexById(edge._in)
  edge._out = this.findVertexById(edge._out)

  if(!(edge._in && edge._out))
    return Dagoba.error("That edge's " + (edge._in ? 'out' : 'in')
                                       + " vertex wasn't found")

  edge._out._out.push(edge)                     // edge's out vertex's out edges
  edge._in._in.push(edge)                       // vice versa

  this.edges.push(edge)
}
```

```javascript
Dagoba.error = function(msg) {
  console.log(msg)
  return false
}
```
