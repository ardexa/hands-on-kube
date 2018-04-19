# Stage 1

## Empty container

```
docker run -it --rm -p 8080:80 nginx
```

http://localhost:8080/

## Some content

```
docker build -t frontend:1.0 stage1/image
docker run -it --rm -p 8080:80 frontend:1.0
```

http://localhost:8080/

# Stage 2

https://medium.com/google-cloud/kubernetes-101-pods-nodes-containers-and-clusters-c1509e409e16

We'll be using minikube

https://github.com/kubernetes/minikube/releases

```
minikube start --cpus=2 --memory=4096
```

Set our docker environment directly to the minikube VM
```
eval $(minikube docker-env)
```

Grab the docker images that we need
```
docker pull nginx:1.13.10-alpine
docker pull node:8.10.0-alpine
docker pull rabbitmq:3.7.4-management-alpine
```

And build our frontend image into the minikube docker environment
```
docker build -t frontend:1.0 stage1/image
```

## The Pod

Load the pod
```
cat stage2/pod.yaml
kubectl create -f stage2/pod.yaml
```

Look at the pod
```
kubectl get po
```

But how do we get at it?
```
kubectl get po -o wide
```

That gives the IP inside the cluster which we can access using the minikube host
```
minikube ssh -- curl $(kubectl get po -o wide | grep frontend | awk '{print $6}')
```

But we want to make this accesible to the world.  Normally, you'd use a load
balancer. Minikube doesn't have one, so instead we'll use a NodePort. This will
map the desired port to the minikube host
```
cat stage2/service.yaml
kubectl create -f stage2/service.yaml
```

Let's make things a little easier and map the ip address of the minikube host to an easy to remember DNS name
```
echo "$(minikube ip) minikue.local" | sudo tee -a /etc/hosts
```
Take the IP and add it to your /etc/hosts file (or equivalent)

Now let's try to access our new service
http://minikube.local:30080/

# Stage 3

Let's throw a little chaos in the mix:
```
kubectl delete po frontend
```

http://minikube.local:30080/

```
kubectl get po
```
Oh nos!

We need a way to tell Kubernetes to keep the pod running at all times. Deployments to the rescue!
```
diff --color -uw stage2/pod.yaml stage3/deployment.yaml
kubectl create -f stage3/deployment.yaml
kubectl get po
kubectl get deploy
```

Now let's try to access our new deployment
http://minikube.local:30080/

All seems to be working, now let's delete the pod again:
```
kubectl delete po $(kubectl get po | grep frontend | awk '{print $1}')
```

Now when we refresh the page it's still working! Looking the at the running pods
```
kubectl get po
```

We can see that there is a another `frontend` pod running with a slightly different name. Through all of this we never had to change the `Service`... it just kept on pointing to any pod with the label `app=frontend`

# Stage 4

Let's upgrade our web app with an API. Let's build the API and start it running
```
docker build -t api:1.0 stage4/api/image
kubectl create -f stage4/api/api.yaml
```

And then _upgrading_ our web app
```
docker build -t frontend:2.0 stage4/web
kubectl set image deployment/frontend-deployment frontend=frontend:2.0
```

# Stage 5

Create a RabbitMQ Cluster using a stateful set
```
docker build -t broker:1.0 stage5/broker/image

cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 64 > erlang.cookie
kubectl create secret generic broker-secrets --from-file=erlang.cookie
kubectl create -f stage5/broker/broker.yaml
```

Two ways to check the status
*Command Line*
```
watch kubectl exec broker-0 rabbitmqctl cluster_status
```

*Web UI*
```
kubectl port-forward broker-0 15672
```
http://localhost:15672/

# Stage 6

Add some workers
```
cd stage6/worker
go get github.com/streadway/amqp
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo .
docker build -t worker:1.0 .
cd ../..
kubectl create -f stage6/worker.yaml
```

Upgrade the API
```
docker build -t api:2.0 stage6/api
kubectl set image deployment/api api=api:2.0
```

Upgrade the Web App
```
docker build -t frontend:3.0 stage6/web
kubectl set image deployment/frontend-deployment frontend=frontend:3.0
```

If we submit a job with a count of `5` and a workload of three dots, we can see they are completed in sequence by the same worker

Let's scale the worker
```
kubectl scale --replicas=5 deployment/worker
```

Now if we submit the same job, we can see they are completed in *parallel* by *different* workers
