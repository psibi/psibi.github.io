+++
title = "Deploying Postgres based Yesod web application to Kubernetes using Helm"
description = "If you enjoy using Haskell and building web frameworks, then you definitely know about Yesod. Learn how to deploy a PostgresSQL web application using Kubernetes using Helm."
date = 2018-09-20
author = "Sibi Prabakaran"
path = "posts/2018-09-20-yesod-postgres-kubernetes-deployment.html"

[taxonomies]
tags = ["haskell", "devops", "kubernetes"]
+++

> **Mirrored from FP Complete.** The original FP Complete site is no longer available, so this post is mirrored here. [Read the archived original on the Wayback Machine](https://web.archive.org/web/20221206093333/https://www.fpcomplete.com/blog/2018/09/yesod-postgres-kubernetes-deployment/).

<p>Yesod is one of the most popular web frameworks in the Haskell
land. This post will explore creating a sample Postgres based Yesod
web application and then deploying it to Kubernetes cluster. We
will create a Helm chart for doing our kubernetes release. Note
that the entire source lives here:</p>
<ul>
<li><a href="https://github.com/psibi/yesod-postgres" rel=
"noopener" target="_blank">Sample yesod application</a></li>
<li><a href="https://github.com/psibi/yesod-postgres-chart" rel=
"noopener" target="_blank">Helm chart for the application</a></li>
</ul>
<h2>Creating Yesod application</h2>
<p>The first step would be to create a sample Yesod application
using the Stack build tool:</p>
<pre><code class=
"language-shellsession">$ stack new yesod-demo yesod-postgres
</code></pre>
<p>Now, I will add an additional model to the existing scaffolding
site:</p>
<pre><code class="language-text">Person json
    name Text
    age Int
    deriving Show
</code></pre>
<p>And also add four new routes to the application:</p>
<pre><code class="language-text">/person PersonR GET POST

/health/liveness LivenessR GET
/health/readiness ReadinessR GET
</code></pre>
<p>The <code>/health</code> based handlers are for the basic health
checking of your application. Every kubelet in the worker node will
perform a periodic diagnostic check to determine the health of your
web application. Based on the result, it will perform an
appropriate action (such as restarting your failed container).</p>
<p>Now let’s define some <a href=
"https://www.yesodweb.com/book/routing-and-handlers" rel="noopener"
target="_blank">Yesod handlers</a> for the above routes:</p>
<pre><code class="language-haskell">postPersonR :: Handler RepJson
postPersonR = do
  person :: Person &lt;- requireJsonBody
  runDB $ insert_ person
  return $ repJson $ toJSON person

getPersonR :: Handler RepJson
getPersonR = do
  persons :: [Entity Person] &lt;- runDB $ selectList [] []
  return $ repJson $ toJSON persons

getLivenessR :: Handler ()
getLivenessR = return ()

getReadinessR :: Handler RepJson
getReadinessR = do
  person :: [Entity Person] &lt;- runDB $ selectList [] [LimitTo 1]
  return $ repJson $ toJSON person
</code></pre>
<p>The <code>postPersonR</code> function will insert a
<code>Person</code> object in the database and the
<code>getPersonR</code> function will return the list of all
<code>Person</code> in the database. The other two handlers are for
the probe checks which are performed by the kubelet. I have
provided simplified implementation for them. The liveness probe is
to tell the kubelet if the container is running. If it isn’t
running, then the container is killed and based on the restart
policy, an appropriate action is taken. The readiness probe on the
otherhand informs the kubelet if the container is ready to service
requests. You can read more about them <a href=
"https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/"
rel="noopener" target="_blank">here</a>.</p>
<h2>Building Docker Image</h2>
<p>Now, I will update the <code>stack.yaml</code> file to build a
docker image for our application:</p>
<pre><code class="language-yaml">image:
  container:
    name: psibi/yesod-demo:3.0
    base: fpco/stack-build
    add:
      static: /app
    
    entrypoints:
    - yesod-demo

docker:
  enable: true
</code></pre>
<p>Note that the name of the docker image is specified as
<code>psibi/yesod-demo:3.0</code>. Also, I’m adding the
<code>static</code> directory inside the container so that it can
be served properly by the server. Now, doing <code>stack image
container</code> will build the docker image. You can verify it
using the docker tool:</p>
<pre><code class="language-shellsession"> $ docker images
REPOSITORY                 TAG                 IMAGE ID            CREATED             SIZE
psibi/yesod-demo           3.0-yesod-demo      8e32c1329557        46 hours ago        7.92GB
</code></pre>
<p>Now, I will push it to the docker registry:</p>
<pre><code class=
"language-shellsession">$ docker push psibi/yesod-demo:3.0-yesod-demo
</code></pre>
<h2>Deployment to Kubernetes</h2>
<p>Given that our application is available in the <a href=
"https://hub.docker.com/r/psibi/yesod-demo/" rel="noopener" target=
"_blank">docker hub</a> now, you can move on to create Kubernetes
manifests and get ready for deploying our yesod application. Since
our application has PostgreSQL as database backend, we will make
use of the <a href=
"https://github.com/helm/charts/tree/master/stable/postgresql" rel=
"noopener" target="_blank">existing helm postgres chart</a> for it.
Note that for a mission critical workloads, something like <a href=
"https://aws.amazon.com/rds/" rel="noopener" target=
"_blank">RDS</a> would be a better choice. Let’s create a helm
chart for our application:</p>
<pre><code class=
"language-shellsession">$ helm create yesod-postgres-chart
Creating yesod-postgres-chart
$ tree yesod-postgres-chart/
yesod-postgres-chart/
├── charts
├── Chart.yaml
├── templates
│   ├── deployment.yaml
│   ├── _helpers.tpl
│   ├── ingress.yaml
│   ├── NOTES.txt
│   └── service.yaml
└── values.yaml

2 directories, 7 files
</code></pre>
<p>Now I would create a <code>requirements.txt</code> file inside
the folder and define our postgresql dependency there:</p>
<pre><code class="language-yaml">dependencies:
  - name: postgresql
    version: 0.15.0
    repository: https://kubernetes-charts.storage.googleapis.com
</code></pre>
<p>Now, let’s configure the <code>postgresql</code> helm chart from
our <code>values.yaml</code> file:</p>
<pre><code class="language-yaml">postgresql:
  postgresUser: postgres
  postgresPassword: your-postgresql-password
  postgresDatabase: yesod-test
  persistence:
    storageClass: ssd-slow
</code></pre>
<p>Note that we are also providing a storageClass named
<code>ssd-slow</code> in the above file. So, you would have to
provision that in the k8s cluster. Using the
<code>StorageClass</code>, the postgres helm chart will create
volumes <a href=
"https://kubernetes.io/docs/concepts/storage/dynamic-provisioning/"
rel="noopener" target="_blank">on demand</a>. All the k8s manifests
goes inside the <code>templates</code> directory. Let’s first
create the above storageClass resource:</p>
<pre><code class="language-yaml">kind: StorageClass
apiVersion: storage.k8s.io/v1
metadata:
  name: ssd-slow
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp2
</code></pre>
<p>Kubernetes has a concept of ConfigMap and Secret to store
special configuration and secret (duh!) data. Let’s define the
<code>ConfigMap</code> resource for our yesod application:</p>
<pre><code class="language-yaml">apiVersion: v1
data:
  yesod_static_path: /app
  yesod_db_name: yesod-test
  yesod_db_port: "5432"
  yesod_host_name: "{{ .Release.Name  }}-postgresql"
kind: ConfigMap
metadata:
  name: {{ template "yesod-postgres-chart.full_name" . }}-configmap</code></pre>
<p>We have previously seen in our <code>stack.yaml</code> that our
static folder is added under <code>/app</code>, so
corresponding we give the proper path to the key
<code>yesod_static_path</code>. I have defined some helper
functions in the file <code>_helpers.tpl</code> which I’m using now
for the generation of <code>metadata.name</code>. We will be using
these helper function throughout our template. Now, let’s define
the <code>Secret</code> manifest for your application:</p>
<pre><code class="language-yaml">apiVersion: v1
kind: Secret
metadata:
  name: {{ template "yesod-postgres-chart.full_name" . }}-secret
type: Opaque
data:
  yesod-db-password: {{ .Values.postgresql.postgresPassword | b64enc | quote }}
  yesod-db-user: {{ .Values.postgresql.postgresUser | b64enc | quote }}
</code></pre>
<p>Now comes the important part - Deployment manifest. They
basically are a controller which will manager your pods. This
manifest for our application is slightly bigger:</p>
<pre><code class="language-yaml">apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: {{ template "yesod-postgres-chart.full_name" . }}
spec:
  replicas: 1
  template:
    metadata:
      labels:
        {{- include "yesod-postgres-chart.release_labels" . | indent 8 }}
    spec:
      containers:
        - name: yesod-demo
          image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
          resources: 
{{ toYaml .Values.yesodapp.resources | indent 12 }}
          livenessProbe:
            httpGet:
              path: /health/liveness
              port: 3000
              scheme: HTTP
              initialDelaySeconds: 30
              periodSeconds: 15
              timeoutSeconds: 5              
          readinessProbe:
            httpGet:
              path: /health/readiness
              port: 3000
              scheme: HTTP
            initialDelaySeconds: 30
            timeoutSeconds: 1
          env:
            - name: YESOD_STATIC_DIR
              valueFrom:
                configMapKeyRef:
                  name: {{ template "yesod-postgres-chart.full_name" . }}-configmap
                  key: yesod_static_path
            - name: YESOD_PGPORT
              valueFrom:
                configMapKeyRef:
                  name: {{ template "yesod-postgres-chart.full_name" . }}-configmap
                  key: yesod_db_port
            - name: YESOD_PGHOST
              valueFrom:
                configMapKeyRef:
                  name: {{ template "yesod-postgres-chart.full_name" . }}-configmap
                  key: yesod_host_name
            - name: YESOD_PGDATABASE
              valueFrom:
                configMapKeyRef:
                  name: {{ template "yesod-postgres-chart.full_name" . }}-configmap
                  key: yesod_db_name
            - name: YESOD_PGUSER
              valueFrom:
                secretKeyRef:
                  name: {{ template "yesod-postgres-chart.full_name" . }}-secret
                  key: yesod-db-user
            - name: YESOD_PGPASS
              valueFrom:
                secretKeyRef:
                  name: {{ template "yesod-postgres-chart.full_name" . }}-secret
                  key: yesod-db-password
</code></pre>
<p>While the above file may look complex, it’s actually quite
simple. We are specifying the docker image in
<code>spec.containers.image</code> and the compute resources in
<code>spec.containers.resources</code>. Then we specify the
liveness and readiness probe with the proper path which we defined
earlier. After that we define the environment variables which are
required for proper running of this application. We fetch the
variables from the configmaps and secrets we defined earlier.</p>
<p>The final step is to create a Service manifest which will act as
a persistent endpoints for the pods created out of deployment.
Services use labels to select a particular pod. This is our Service
definition:</p>
<pre><code class="language-yaml">kind: Service
apiVersion: v1
metadata:
  name: {{ template "yesod-postgres-chart.full_name" . }}
  labels:
    {{- include "yesod-postgres-chart.release_labels" . | indent 4 }}
spec:
  selector:
    app: {{ template "yesod-postgres-chart.full_name" . }}
  ports:
    - protocol: "TCP"
      port: 3100
      targetPort: 3000
  type: ClusterIP
</code></pre>
<p>In the above file, you have defined the service type as
<code>ClusterIP</code>. That makes our service only reachable
within the cluster. Through <code>spec.ports.targetPort</code> we
indicate the actual port on the POD where our service is running.
Since our yesod application runs on port 3000 on the container, we
specify it appropriately. The <code>spec.ports.port</code>
indicates the port in which it will be available to other services
in the cluster. Now, I will add nginx deployment on top of this
which will route the requests to our yesod application. I won’t
show it’s Deployment manifest as it’s quite similar to the previous
one we saw, but it’s Service object is interesting:</p>
<pre><code class="language-yaml">kind: Service
apiVersion: v1
metadata:
  name: {{ template "yesod-nginx-resource.full_name" . }}
spec:
  selector:
    {{- include "yesod-nginx-resource.release_labels" . | indent 4 }}
  ports:
    - protocol: "TCP"
      port: 80
      targetPort: 80
  type: LoadBalancer
</code></pre>
<p>The type <code>LoadBalancer</code> will expose the service using
the underlying cloud’s load balancer. Once you have the entire
thing ready, you can install the chart:</p>
<pre><code class=
"language-shellsession">helm install . --name="yesod-demo"
</code></pre>
<p>It will take some time for our pods to get up and start
servicing the requests. We specify the release name as
<code>yesod-demo</code>. You can find the load balancer DNS name by
querying using kubectl:</p>
<pre><code class="language-shellsession">$ kubectl get services
NAME                              TYPE           CLUSTER-IP       EXTERNAL-IP                                                               PORT(S)        AGE
kubernetes                        ClusterIP      172.20.0.1       &lt;none&gt;                                                                    443/TCP        12d
nginx-yesod-demo-yesod-postgres-chart   LoadBalancer   172.20.155.194   a0d96c1a5a14a11e88a68065a88681d5-2013621451.us-west-2.elb.amazonaws.com   80:31578/TCP   3d
yesod-demo-postgresql                   ClusterIP      172.20.173.246   &lt;none&gt;                                                                    5432/TCP       3d
yesod-demo-yesod-postgres-chart         ClusterIP      172.20.125.142   &lt;none&gt;                                                                    3100/TCP       3d
</code></pre>
<p>To see the log of the yesod application:</p>
<pre><code class="language-shellsession">$ kubectl get pods
NAME                                            READY     STATUS    RESTARTS   AGE
nginx-yesod-demo-yesod-postgres-chart-f4f5979-2w6s9   1/1       Running   0          3d
yesod-demo-postgresql-786b4cc4-dwpph                  1/1       Running   0          3d
yesod-demo-yesod-postgres-chart-7bcb474796-xdbfd      1/1       Running   0          11h
$ kubectl logs -f yesod-demo-yesod-postgres-chart-7bcb474796-xdbfd
10.0.0.28 - - [19/Aug/2018:17:13:11 +0000] "GET /health/liveness HTTP/1.1" 200 0 "" "kube-probe/1.10"
10.0.0.28 - - [19/Aug/2018:17:13:21 +0000] "GET /health/liveness HTTP/1.1" 200 0 "" "kube-probe/1.10"
10.0.0.28 - - [19/Aug/2018:17:13:31 +0000] "GET /health/liveness HTTP/1.1" 200 0 "" "kube-probe/1.10"
10.0.0.28 - - [19/Aug/2018:17:13:38 +0000] "GET /health/readiness HTTP/1.1" 200 33 "" "kube-probe/1.10"
10.0.0.28 - - [19/Aug/2018:17:13:41 +0000] "GET /health/liveness HTTP/1.1" 200 0 "" "kube-probe/1.10"
10.0.0.28 - - [19/Aug/2018:17:13:48 +0000] "GET /health/readiness HTTP/1.1" 200 33 "" "kube-probe/1.10"
10.0.0.28 - - [19/Aug/2018:17:13:51 +0000] "GET /health/liveness HTTP/1.1" 200 0 "" "kube-probe/1.10"
10.0.0.28 - - [19/Aug/2018:17:13:58 +0000] "GET /health/readiness HTTP/1.1" 200 33 "" "kube-probe/1.10"
10.0.0.28 - - [19/Aug/2018:17:14:01 +0000] "GET /health/liveness HTTP/1.1" 200 0 "" "kube-probe/1.10"
10.0.0.28 - - [19/Aug/2018:17:14:08 +0000] "GET /health/readiness HTTP/1.1" 200 33 "" "kube-probe/1.10"
</code></pre>
<p>You can see in the logs of our pod, that the web application is
being continously probed by diagnostic checks. Let’s confirm that
our web application is indeed working:</p>
<pre><code class=
"language-shellsession">$ curl --header "Content-Type: application/json" --request POST --data '{"name":"Sibi","age":"32"}' https://a0d96c1a5a14a11e88a68065a88681d5-2013621451.us-west-2.elb.amazonaws.com
$ curl --header "Content-Type: application/json" --request POST --data '{"name":"Sibi","age":32}' https://a0d96c1a5a14a11e88a68065a88681d5-2013621451.us-west-2.elb.amazonaws.com/person
{"age":32,"name":"Sibi"}⏎                                                            
</code></pre>
<p>Now, if you do a curl request on the index page, then you will
observe that the urls in the web application won’t be correct.
Yesod, by default put’s the hostname in the url according to the
configuration present in <code>settings.yml</code> file. You will
be seeing the hostname of the pod in your linked urls. It will
render improperly in your browser because of this:</p>
<p><img class="img-fluid" src="/images/posts/yesod-postgres-kubernetes-deployment/yesod-render-issue.png" alt="yesod render issue"></p>
<p>There are three ways to tackle this problem:</p>
<ul>
<li>Override Approot in Yesod typeclass instance: This is the most
straightforward approach and I would just define approot to
<code>ApprootRelative</code> so that there is no root URL. You can
see the other <a href=
"https://github.com/yesodweb/yesod/wiki/Overriding-approot" rel=
"noopener" target="_blank">options here.</a>.</li>
<li>Another option is to find out the load balancer’s DNS Name
after kubernetes is deployed and pass new environment variable for
your yesod application in accordance with your
<code>settings.yml</code> file. But this would mean deploying again
using <code>helm upgrade</code>. I dislike this approach as it
involves multiple deployment using Helm. There is currently an
<a href="https://github.com/helm/helm/issues/949" rel="noopener"
target="_blank">open issue in Helm</a> related to this.</li>
<li>The third option is to call the Kubernetes API from your web
application as a part of initialization step and get the DNS name
dynamically and update your application settings accordingly. You
have to use the <a href="https://kubernetes.io/docs/reference/"
rel="noopener" target="_blank">Services API</a> for achieving
it.</li>
</ul>
<p>For this demo application, let’s use the first approach and
deploy a new image with tag <code>4.0</code>:</p>
<pre><code class=
"language-shellsession">$ docker push psibi/yesod-demo:4.0-yesod-demo
</code></pre>
<p>Now, let’s update the <code>values.yaml</code> file to the
newest tag of the image and then upgrade the deployment using
helm:</p>
<pre><code class=
"language-shellsession">$ helm upgrade yesod-demo .
</code></pre>
<p>Now, you can indeed verify that the pod has updated to the new
image</p>
<pre><code class=
"language-shellsession">$ kubectl describe pod yesod-demo-yesod-postgres-chart-7bcb474796-xdbfd | grep Image
    Image:          psibi/yesod-demo:4.0-yesod-demo
    Image ID:       docker-pullable://psibi/yesod-demo@sha256:5d22e4dfd4ba4050f56f02f0b98eb7ae92d78ee4b5f2e6a0ec4fd9e6f9a068c7
</code></pre>
<p>Try visiting the homepage and you can observe that all the
static resources of your yesod application would have properly
loaded this time.</p>
<p><img class="img-fluid" src="/images/posts/yesod-postgres-kubernetes-deployment/yesod-render-fixed.png" alt="yesod proper render"></p>
<p>As you can see your application loads properly now. This
concludes our post on deploying our Yesod application to
Kubernetes. Let me know if you have any questions/queries through
the comments section.</p>

