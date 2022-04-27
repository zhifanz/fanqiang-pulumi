aws configure set aws_access_key_id ${accessKeyId}
aws configure set aws_secret_access_key ${accessKeySecret}
yum update -y
amazon-linux-extras install docker
service docker start
curl --silent -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

SHADOWSOCKS_HOME=/opt/shadowsocks
mkdir $SHADOWSOCKS_HOME && aws s3 cp ${artifactsUri} $SHADOWSOCKS_HOME/ --recursive
docker-compose --project-directory $SHADOWSOCKS_HOME up --detach
