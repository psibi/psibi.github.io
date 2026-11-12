+++
title = "Canary Deployment with Kubernetes and Istio"
description = "Want to do canary deployments in your Kubernetes cluster? Read up on our recommended step-by-step process"
date = 2022-03-24
author = "Sibi Prabakaran"
path = "posts/2022-03-24-canary-deployment-istio.html"

[taxonomies]
tags = ["devops", "istio", "kubernetes"]
+++

> **Mirrored from FP Complete.** The original FP Complete site is no longer available, so this post is mirrored here. [Read the archived original on the Wayback Machine](https://web.archive.org/web/20230529075426/https://www.fpcomplete.com/blog/canary-deployment-istio/).

Istio is a service mesh that transparently adds various capabilities
like observability, traffic management and security to your
distributed collection of microservices. It comes with various
functionalities like circuit breaking, granular traffic routing, mTLS
management, authentication and authorization polices, ability to do
chaos testing etc.

In this post, we will explore on how to do canary deployments of our
application using Istio.

## What is Canary Deployment

Using Canary deployment strategy, you release a new version of your
application to a small percentage of the production traffic. And then
you monitor your application and gradually expand its percentage of
the production traffic.

For a canary deployment to be shipped successfully, you need good
monitoring in place. Based on your exact use case, you might want to
check various metrics like performance, user experience or [bounce
rate](https://en.wikipedia.org/wiki/Bounce_rate).

## Pre requisites

This post assumes that following components are already provisioned or
installed:

- Kubernetes cluster
- Istio
- cert-manager: (Optional, required if you want to provision TLS
  certificates)
- Kiali (Optional)

## Istio Concepts

For this specific deployment, we will be using three specific features
of Istio's traffic management capabilities:

- [Virtual Service](https://istio.io/latest/docs/concepts/traffic-management/#virtual-services): Virtual Service describes how traffic flows to
  a set of destinations. Using Virtual Service you can configure how
  to route the requests to a service within the mesh. It contains a
  bunch of routing rules that are evaluated, and then a decision is
  made on where to route the incoming request (or even reject if no
  routes match).
- [Gateway](https://istio.io/latest/docs/concepts/traffic-management/#gateways): Gateways are used to manage your inbound and outbound
  traffic. They allow you to specify the virtual hosts and their
  associated ports that needs to be opened for allowing the traffic
  into the cluster.
- [Destination Rule](https://istio.io/latest/docs/reference/config/networking/destination-rule/): This is used to configure how a client in
  the mesh interacts with your service. It's used for configuring TLS
  settings of [your sidecar](https://istio.io/latest/docs/reference/config/networking/sidecar/), splitting your service into subsets,
  load balancing strategy for your clients etc.

For doing canary deployment, destination rule plays a major role as
that's what we will be using to split the service into subset and
route traffic accordingly.

## Application deployment

For our canary deployment, we will be using the following version of
the application:

- [httpbin.org](https://httpbin.org/): This will be the version one (v1) of our
  application. This is the application that's already deployed, and
  your aim is to partially replace it with a newer version of the
  application.
- [websocket app](https://github.com/psibi/tornado-websocket-example): This will be the version two (v2) of the
  application that has to be gradually introduced.

Note that in the actual real world, both the applications will share
the same code. For our example, we are just taking two arbitrary
applications to make testing easier.

Our assumption is that we already have version one of our application
deployed. So let's deploy that initially. We will write our usual
Kubernetes resources for it. The deployment manifest for the version
one application:

``` yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
  namespace: canary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: httpbin
      version: v1
  template:
    metadata:
      labels:
        app: httpbin
        version: v1
    spec:
      containers:
      - image: docker.io/kennethreitz/httpbin
        imagePullPolicy: IfNotPresent
        name: httpbin
        ports:
        - containerPort: 80
```

And let's create a corresponding service for it:

``` yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    app: httpbin
  name: httpbin
  namespace: canary
spec:
  ports:
  - name: httpbin
    port: 8000
    targetPort: 80
  - name: tornado
    port: 8001
    targetPort: 8888
  selector:
    app: httpbin
  type: ClusterIP
```

SSL certificate for the application which will use cert-manager:

``` yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: httpbin-ingress-cert
  namespace: istio-system
spec:
  secretName: httpbin-ingress-cert
  issuerRef:
    name: letsencrypt-dns-prod
    kind: ClusterIssuer
  dnsNames:
  - canary.33test.dev-sandbox.fpcomplete.com
```

And the Istio resources for the application:

``` yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: httpbin-gateway
  namespace: canary
spec:
  selector:
    istio: ingressgateway
  servers:
  - hosts:
    - canary.33test.dev-sandbox.fpcomplete.com
    port:
      name: https-httpbin
      number: 443
      protocol: HTTPS
    tls:
      credentialName: httpbin-ingress-cert
      mode: SIMPLE
  - hosts:
    - canary.33test.dev-sandbox.fpcomplete.com
    port:
      name: http-httpbin
      number: 80
      protocol: HTTP
    tls:
      httpsRedirect: true
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: httpbin
  namespace: canary
spec:
  gateways:
  - httpbin-gateway
  hosts:
  - canary.33test.dev-sandbox.fpcomplete.com
  http:
  - route:
    - destination:
        host: httpbin.canary.svc.cluster.local
        port:
          number: 8000
```

The above resource define gateway and virtual service. You could see
that we are using TLS here and redirecting HTTP to HTTPS.

We also have to make sure that namespace has istio injection enabled:

``` yaml
apiVersion: v1
kind: Namespace
metadata:
  labels:
    app.kubernetes.io/component: httpbin
    istio-injection: enabled
  name: canary
```

I have the above set of k8s resources managed via
[kustomize](https://kustomize.io/). Let's deploy them to get the initial environment which
consists of only v1 (httpbin) application:

``` shellsession
❯ kustomize build overlays/istio_canary > istio.yaml
❯ kubectl apply -f istio.yaml
namespace/canary created
service/httpbin created
deployment.apps/httpbin created
gateway.networking.istio.io/httpbin-gateway created
virtualservice.networking.istio.io/httpbin created
❯ kubectl apply -f overlays/istio_canary/certificate.yaml
certificate.cert-manager.io/httpbin-ingress-cert created
```

Now I can go and verify in my browser that my application is actually
up and running:

![httpbin: Version 1 application](/images/posts/canary-deployment-istio/istio_httpbin_application.png)

Now comes the interesting part. We have to deploy the version two of
our application and make sure around 20% of our traffic goes to
it. Let's write the deployment manifest for it:

``` yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin-v2
  namespace: canary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: httpbin
      version: v2
  template:
    metadata:
      labels:
        app: httpbin
        version: v2
    spec:
      containers:
      - image: psibi/tornado-websocket:v0.3
        imagePullPolicy: IfNotPresent
        name: tornado
        ports:
        - containerPort: 8888
```

And now the destination rule to split the service:

``` yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: httpbin
  namespace: canary
spec:
  host: httpbin.canary.svc.cluster.local
  subsets:
  - labels:
      version: v1
    name: v1
  - labels:
      version: v2
    name: v2
```

And finally let's modify the virtual service to split 20% of the
traffic to the newer version:

``` yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: httpbin
  namespace: canary
spec:
  gateways:
  - httpbin-gateway
  hosts:
  - canary.33test.dev-sandbox.fpcomplete.com
  http:
  - route:
    - destination:
        host: httpbin.canary.svc.cluster.local
        port:
          number: 8000
        subset: v1
      weight: 80
    - destination:
        host: httpbin.canary.svc.cluster.local
        port:
          number: 8001
        subset: v2
      weight: 20
```

And now if you go again to the browser and refresh it a number of
times (note that we route only 20% of the traffic to the new
deployment), you will see the new application eventually:

![websocket: Version 2 application](/images/posts/canary-deployment-istio/istio_tornado_application.png)

## Testing deployment

Let's do around 10 curl requests to our endpoint to see how the
traffic is getting routed:

``` shellsession
❯ seq 10 | xargs -Iz curl -s https://canary.33test.dev-sandbox.fpcomplete.com | rg "<title>"
    <title>httpbin.org</title>
    <title>httpbin.org</title>
    <title>httpbin.org</title>
<title>tornado WebSocket example</title>
    <title>httpbin.org</title>
    <title>httpbin.org</title>
    <title>httpbin.org</title>
    <title>httpbin.org</title>
    <title>httpbin.org</title>
<title>tornado WebSocket example</title>
```

And you can confirm how out of the 10 requests, 2 requests are routed
to the websocket (v2) application. If you have [Kiali](https://kiali.io/) deployed,
you can even visualize the above traffic flow:

![Kiali visualization](/images/posts/canary-deployment-istio/istio_kiali.png)

And that summarizes our post on how to achieve canary deployment using
Istio. While this post shows a basic example, traffic steering and
routing is one of the core features of Istio and it offers various
ways to configure the routing decisions made by it. You can find more
further details about it in the [official docs](https://istio.io/latest/docs/concepts/traffic-management/#virtual-services). You can also use a
controller like [Argo Rollouts with Istio](https://argoproj.github.io/argo-rollouts/features/traffic-management/istio/) to perform canary
deployments and use additional features like [analysis](https://argoproj.github.io/argo-rollouts/features/analysis/) and
[experiment](https://argoproj.github.io/argo-rollouts/features/experiment/).

* * *

If you're looking for a solid Kubernetes platform, batteries included
with a first class support of Istio, [check out Kube360](https://www.fpcomplete.com/products/kube360/).

If you liked this article, you may also like:

* [An Istio/mutual TLS debugging story](https://www.fpcomplete.com/blog/istio-mtls-debugging-story/)
* [Deploying Rust with Windows Containers on Kubernetes](https://www.fpcomplete.com/blog/rust-kubernetes-windows/)
* [Cloud Vendor Neutrality](https://www.fpcomplete.com/blog/cloud-vendor-neutrality/)
* [DevOps for (Skeptical) Developers](https://www.fpcomplete.com/blog/devops-for-developers/)
* [Secure defaults with Kubernetes Security with Kube360](https://www.fpcomplete.com/blog/kube360s-kubernetes-security-focus/)
