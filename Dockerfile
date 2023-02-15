FROM pulumi/pulumi:3.53.1

ARG ANSIBLE_VERSION=7.2
ARG PSQL_VERSION=13

ENV PULUMI_CONFIG_PASSPHRASE=SimplePassPhrase

RUN pip install "ansible~=$ANSIBLE_VERSION" && \
    apt-get install postgresql-client-$PSQL_VERSION -y && \
    ssh-keygen -t ed25519 -C ansible@fanqiang -N '' -f ~/.ssh/id_ed25519
WORKDIR /usr/src/app
COPY . .
RUN npm ci
