FROM rabbitmq:3.7.4-management-alpine

RUN rabbitmq-plugins enable --offline rabbitmq_peer_discovery_k8s

COPY rabbitmq.conf /etc/rabbitmq/
