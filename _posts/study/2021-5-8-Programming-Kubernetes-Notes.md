---
layout: post
title:  "Programming Kubernetes学习笔记"
categories: [ Paas, Kubernetes, Client-go ]
image: assets/images/21.jpg
---

## 3. clieng-go库基础

### 3.4 Informers和Caching

#### 3.4.1 <ins>Work Queue</ins>

client-go在`k8s.io/client-go/util/workqueue`包中为构建控制器提供了一种优先队列的强大实现。这个包中许多变量类型实现的基础接口如下：

```
type Interface interface {
	Add(item interface{})
	Len() int
	Get() (item interface{}, shutdown bool)  // 每个从Get()返回的item，当控制器处理完后都需要调用一次Done(item)
	Done(item interface{})
	ShutDown()
	ShuttingDown() bool
}
```

从上面的通用接口派生出来的队列类型有：`DelayingInterface`可以在后面的某个时间添加一个item，`RateLimitingInterface`扩展了前面的接口，可以限制添加进队列items的速率。

速率限制算法可以被传进构造函数`NewRateLimitingQueue`中，这个包里还定义了多种，如`BucketRateLimiter`, `ItemExponentialFailureRateLimiter`, `ItemFastSlowRateLimiter`和`MaxOfRateLimiter`。绝大多数控制器仅需使用`DefaultControllerRateLimiter() *RateLimiter`函数获取默认的控制器的速率限制器。

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

### 5.1 为什么需要代码生成？

因为Go是一门设计简洁的语言，它缺乏高层次或者像元编程那样的机制，可以用一种通用（类型无关）的方式在不同的数据类型上表达同一种算法。Go的做法就是使用外部的代码生成。

### 5.2 调用生成器

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

### 5.3 用标签（Tags）控制代码生成器的行为

除了可以像上面这种从命令行参数控制代码生成器的行为之外，代码生成器更多的属性是通过Go文件中的tags标签来控制的。

有两种类型的tags：

* 在doc.go文件中package行上面的全局tags
* 在类型声明（比如结构体定义）上面的局部tags

#### 5.3.1 <ins>deepcopy-gen Tags</ins>

Deep-copy方法生成默认对所有类型都是开启的，只需要添加一个全局tag：`// +k8s:deepcopy-gen=package tag`。

不需要开启的类型只要添加一个局部tag: `// +k8s:deepcopy-gen=false`。

#### 5.3.2 <ins>runtime.Object和DeepCopyObject</ins>

把局部tag：`// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object`放到你的顶层API资源类型之上，可以生成它的`DeepCopyObject() runtime.Object`方法（结构体中嵌有`metav1.TypeMeta`的都是顶层API资源类型）。`DeepCopyObject`方法属于`runtime.Object`接口，在Kubernetes中的泛化代码必须都能够创建对象的深度拷贝。

当别的接口也需要可以深度拷贝时，可以使用如下面例子里的局部tag：

```
// +k8s:deepcopy-gen:interfaces=<package>.Foo
type FooImplementation struct {
    ...
}

// Kubernetes源码中的一些例子
// +k8s:deepcopy-gen:interfaces=.../pkg/registry/rbac/reconciliation.RuleOwner
// +k8s:deepcopy-gen:interfaces=.../pkg/registry/rbac/reconciliation.RoleBinding
```

#### 5.3.3 <ins>deepcopy-gen Tags</ins>

```
// +genclient
让client-gen代码生成器为这个Go类型创建一个客户端
// +genclient:noStatus
避免生成 UpdateStatus() 方法，否则默认都会生成
// +genclient:nonNamespaced
针对集群层面的资源类型，否则默认是生成一个命名空间客户端
// +genclient:noVerbs
// +genclient:onlyVerbs=create,delete
// +genclient:skipVerbs=get,list,create,update,patch,delete,watch

// +genclient:method=Create,verb=create,
// result=k8s.io/apimachinery/pkg/apis/meta/v1.Status
有这个标签的类型只可以创建，并且不返回API资源类型本身，而是返回一个`metav1.Status`，仅对用户提供的Go写的API servers的资源类型有意义。
```

`// +genclient:method= `标签使用的一个常见场景是添加弹扩资源的方法。

#### 5.3.4 <ins>informer-gen 和 lister-gen</ins>

informer-gen 和 lister-gen 代码生成器也会处理client-gen的`// +genclient`标签，每个选择生成客户端的类型也会自动生成对应的informers 和 listers。更多高级用法可以参考[k8s.io/api](https://github.com/kubernetes/api)和[OpenShift API types](https://github.com/openshift/api)。


## 6. 写Operators的方案

写自定义控制器和operators的三种方案：

### 6.1 sample-controller


### 6.2 Kubebuilder

Kubebuilder是Kubernetes SIG API Machinery维护的一套工具库，让你能简单高效地构建operators，深入探索Kubebuilder的最佳资源是在线的[Kubebuilder电子书](https://book.kubebuilder.io/introduction.html)。

