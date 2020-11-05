---
layout: post
title:  "伴鱼英语基础架构细节分享记录"
categories: [ Paas, Infrastructure ]
image: assets/images/20.jpg
tags: [featured]
---

业务规模、流量特点会影响基础架构的规划建设思路。

小米自身的规模非常大，抢购具有流量洪峰，质量保障要求极高，在这种环境下做项目自己的架构设计、实现能力都得到了极大的提升。伴鱼英语量上虽然没有传统互联网公司大，但是对稳定性要求极高，并且是创业公司、时间紧张，系统建设需要找好切入点，依次展开。总之，在每个不同的公司，都保持持续学习的习惯，然后根据业务特点灵活开展项目，适合的才是最好的。
这一年里伴鱼扩展基础设施（如专线建设）；深耕服务治理、质量保证，提升服务研发效能，数据库稳定性；从 0 到 1 推出多个系统如 CMDB、PaaS、SQL 审核、OKR 平台、触达平台等等，不断提升业务、研发的自动化水平，减少人为介入。另外，伴鱼还非常重视技术影响力建设，推出了几十篇高质量的技术文章，跟 PingCAP 达成战略合作，参与、推出开源项目等，为下一个五年做好充足的准备。

比如服务治理是很容易提升业务开发效率的，这就很容易得到业务的认可，建设、推动起来会比较方便。

对于深层次的如基础设施、中间件这类业务感知不明显的系统，就需要基础研发的同学不断找存在感，打造内外影响力，让大家能够感知到这类系统带来的一些变化。

另外技术债是永远不可避免的一个点，解决历史债务一是要有良好的指导文档，二是要重视小工具的建设，方便大家迁移。

伴鱼的基础架构研发更适合使用因地制宜的方式。首先，伴鱼是一家创业公司，并且教育类公司也有自己的特点。例如，伴鱼的服务有固定晚高峰，高峰期服务付费用户，那对于稳定性的要求要非常高，所以伴鱼开展稳定性建设比较早，如自研稳定性组件—Dolphin，提供限流、降级、熔断能力，TiDB、Mongo SDK 静默埋入表级别熔断能力，防止 DB 挂掉；伴鱼中台非常重视效能，现阶段经常会出现测试环境不够用的情况，于是就提供了泳道能力，流量在前端入口、网关处会打上标记，网关之后的服务实例都会带有泳道标识，具有相同泳道标识的流量、服务构成一个完整的测试环境，方便开发人员密集开发需求时，不同需求的测试。

+ 拆分。首先服务的依赖层次必须清晰，微服务经常出现循环调用，继而导致线上连锁反应，这是特别常见的事情。所以，先不用管服务拆分的粒度，循环依赖的事情不能有，层次必须清晰；拆分的另一方面是基础库、基础服务 SDK、业务代码库的层次关系，一定要逐层向上依赖，拆分清晰。
+ 稳定性平台建设。伴鱼设计、开发了 Dolphin 稳定性平台，支持服务治理、SDK、基础服务、基础库的限流、降级、熔断需求，在应对业务突发、异常问题时非常有用。
+ 推动单元测试框架。提升流程自动化水平、减少人为接入，推动业务监控大盘、APM 提升可视化能力，持续推动报警平台建设、接入，不断打磨、优化框架等。

一般先从监控入手，比如统一业务监控大盘，每个业务系统都可以看到自己某个系统的运行情况。然后，报警也非常重要，尤其是业务发展比较快的时期，很容易出现各类问题。日志规范化越早做越好，为后续跟数据对接做准备。基本的服务治理框架必不可少，后面可以边对外支持，边迭代开发，复议代码生成工具（服务）可以很好的解决一些历史代码问题，剩下的就是根据公司需要推出一些基础服务、中间件、平台建设了。