---
layout: post
title:  "Programming Kubernetes学习笔记"
categories: [ Paas, Kubernetes, Client-go ]
image: assets/images/21.jpg
---

## 4. 使用自定义资源（CRs）

#### 子资源(Subresources)

子资源有特殊的HTTP端点路径, 即在常规的HTTP路径后面添加后缀. 例如，Pod有以下几种子资源：

* /api/v1/namespace/namespace/pods/name/logs

* /api/v1/namespace/namespace/pods/name/portforward

* /api/v1/namespace/namespace/pods/name/exec

* /api/v1/namespace/namespace/pods/name/status

子资源端点往往使用与主资源端点不同的协议来访问。

而CR只支持两种子资源：/scale 和 /status，都需要在CRD中显性地开启。

The /status subresource solves this by providing two endpoints that are resources on their own. Each can be controlled with RBAC rules independently. 这叫做spec-status分离.

### 4.4 开发者的视角看自定义资源

在Golang中可以用多种客户端来访问自定义资源，常规的两种有：

* 用client-go的动态客户端
* 用有类型的客户端：由kubernetes-sigs/controller-runtime提供的被Operator SDK和Kubebuilder使用的有类型的客户端，或者由`client-gen`生成的有类型的客户端

#### 4.4.1  <ins>动态客户端</ins>

在`k8s.io/client-go/dynamic`中的动态客户端没有用到任何Go类型，除了`unstructured.Unstructured`，它仅是封装了json.Unmarshal和它的输出。

动态客户端的输入和输出就是一个*unstructured.Unstructured—即一个对象，它有着和`json.Unmarshal`在反序列化时所输出的一样的数据结构:

* 对象用map[string]interface{}表示

* 数组用[]interface{}表示

* 基础类型是string, bool, float64, or int64

动态客户端也被Kubernetes自身用在一些通用的控制器上，例如垃圾回收控制器，因为其会处理系统中的任意资源，所以广泛使用了动态客户端。

**适用场景**：用在处理未知类型对象的通用控制器中。

#### 4.4.2 <ins>通过client-gen生成的有类型的客户端</ins>

有了API包`pkg/apis/group/version`之后，客户端生成器`client-gen`就可以在默认的包路径`pkg/generated/clientset/versioned`下生成一个有类型的客户端，生成的顶层对象就是一个client set，它包括了很多API groups, versions和下面的资源。

这种代码生成机制让我们能和K8s核心资源一样为自定义资源编写逻辑代码，像informers这种上层的工具也可以用`informer-gen`生成。

**适用场景**：用在类型安全能极大地加强代码正确性的场合，如许多人协作的K8s项目自身。

#### 4.4.3 <ins>Operator SDK和Kubebuilder使用的controller-runtime客户端</ins>

`controller-runtime`项目是Operator SDK and Kubebuilder这两种operator解决方案的基础。

和前面提到的client-gen生成的客户端不同，与动态客户端类似，controller-runtime客户端也只有一个实例，它能处理在某个scheme中注册过的所有类型。它使用API server的信息发现机制来把类型映射到HTTP路径。

**适用场景**：用在便捷性和高速率很重要的场合，减少经过的管道。


## 5. 自动化代码生成

### 为什么需要代码生成？

因为Go是一门设计简洁的语言，它缺乏高层次或者像元编程那样的机制，可以用一种通用（类型无关）的方式在不同的数据类型上表达同一种算法。Go的做法就是使用外部的代码生成。

### 调用生成器

通常，在每个控制器项目中，代码生成器几乎都是以同一种方式被调用，只有包名、资源组名和API版本会有所不同。调用脚本`k8s.io/code-generator/generate-groups.sh`或者诸如`hack/update-codegen.sh`一样的bash脚本，是在编译系统里的Go类型自定义资源中添加代码生成的最简单方式。

``` shell
$ vendor/k8s.io/code-generator/generate-groups.sh all \
    github.com/programming-kubernetes/cnat/cnat-client-go/pkg/generated
    github.com/programming-kubernetes/cnat/cnat-client-go/pkg/apis \
    cnat:v1alpha1 \
    --output-base "${GOPATH}/src" \
    --go-header-file "hack/boilerplate.go.txt"
```

这里的`all`意味着会调用为自定义资源准备的四种标准的代码生成器:

* **deepcopy-gen**: 生成 `func (t *T) DeepCopy() *T` 和 `func (t *T) DeepCopyInto(*T)` 方法。
* **client-gen**: 生成有类型的客户端 client sets.
* **informer-gen**: 为自定义资源生成 informers，提供一种基于事件的接口来响应服务器上自定义资源的变化。
* **lister-gen**: 为自定义资源生成 listers，为GET和LIST请求提供一个只读的缓存层。

这四种代码生成器为构建全特性、生产可用的控制器提供了强大的基础，构建出的控制器使用的就是和Kubernetes上游控制器一样的机制和包。
