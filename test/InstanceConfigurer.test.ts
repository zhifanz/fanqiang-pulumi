import { assert } from "chai";
import { InstanceConfigurer } from "../lib/core/InstanceConfigurer";
import { applyProgram } from "./helper";

const expected1 = `
mkdir ~/downloads && cd ~/downloads
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install
cd ~ && rm -rf ~/downloads
aws configure set aws_access_key_id foo
aws configure set aws_secret_access_key bar`;

const expected2 = `
mkdir ~/downloads && cd ~/downloads
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install
cd ~ && rm -rf ~/downloads
mkdir -p /tmp/foo
aws s3 cp s3://path/to/content /tmp/foo --recursive`;

const expected3 = `
yum install -y yum-utils
yum-config-manager \
    --add-repo \
    https://download.docker.com/linux/centos/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl start docker
sleep 5
docker compose --file /opt/app/dc.yml --file dc-other.yml up --no-start
docker compose --file /opt/app/dc.yml --file dc-other.yml start foo
docker compose --file /opt/app/dc.yml --file dc-other.yml start bar
`;

describe("InstanceConfigurer", function () {
  it("configure aws access key", async function () {
    const result = await applyProgram(async () => {
      const shell = new InstanceConfigurer();
      shell.configureAwsAccessKey("foo", "bar");
      return { content: shell.toShellScript() };
    });
    assert.equal(result.outputs["content"].value, expected1);
  });
  it("aws s3 copy", async function () {
    const result = await applyProgram(async () => {
      const shell = new InstanceConfigurer();
      shell.s3CopyDir("path/to/content", "/tmp/foo");
      return { content: shell.toShellScript() };
    });
    assert.equal(result.outputs["content"].value, expected2);
  });
  it("docker compose service", async function () {
    const result = await applyProgram(async () => {
      const shell = new InstanceConfigurer();
      const dc = shell.configureDockerCompose("/opt/app");
      dc.addFile("dc.yml");
      dc.addFile("dc-other.yml");
      dc.addService("foo");
      dc.addService("bar");
      return { content: shell.toShellScript() };
    });
    assert.equal(result.outputs["content"].value, expected3);
  });
});
