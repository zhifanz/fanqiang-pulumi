FROM pulumi/pulumi:3.53.1

LABEL org.opencontainers.image.source=https://github.com/zhifanz/fanqiang-pulumi

WORKDIR /usr/src/app
COPY . .
RUN npm ci
