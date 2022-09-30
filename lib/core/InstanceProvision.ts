import * as pulumi from "@pulumi/pulumi";

export class InstanceProvision {
  private dockerCompose?: DockerCompose;
  private s3Copy?: { key: pulumi.Input<string>; dir: pulumi.Input<string> };
  private awsAccessKey?: {
    id: pulumi.Input<string>;
    secret: pulumi.Input<string>;
  };

  configureAwsAccessKey(
    id: pulumi.Input<string>,
    secret: pulumi.Input<string>
  ): void {
    this.awsAccessKey = { id, secret };
  }

  s3CopyDir(key: pulumi.Input<string>, dir: pulumi.Input<string>): void {
    this.s3Copy = { key, dir };
  }

  configureDockerCompose(dir: pulumi.Input<string>): DockerCompose {
    this.dockerCompose = new DockerCompose(dir);
    return this.dockerCompose;
  }

  getDockerCompose(): DockerCompose {
    if (this.dockerCompose) {
      return this.dockerCompose;
    }
    throw new Error("Docker compose is not configured!");
  }

  toShellScript(): pulumi.Output<string> {
    let result = pulumi.output("");
    if (this.awsAccessKey || this.s3Copy) {
      result = pulumi.interpolate`${result}
mkdir ~/downloads && cd ~/downloads
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install
cd ~ && rm -rf ~/downloads`;
      if (this.awsAccessKey) {
        result = pulumi.interpolate`${result}
aws configure set aws_access_key_id ${this.awsAccessKey.id}
aws configure set aws_secret_access_key ${this.awsAccessKey.secret}`;
      }
      if (this.s3Copy) {
        result = pulumi.interpolate`${result}
mkdir -p ${this.s3Copy.dir}
aws s3 cp s3://${this.s3Copy.key} ${this.s3Copy.dir} --recursive`;
      }
    }
    if (this.dockerCompose) {
      result = pulumi.concat(result, this.dockerCompose.toShellScript());
    }
    return result;
  }
}
class DockerCompose {
  readonly files: pulumi.Input<string>[] = [];
  readonly services: pulumi.Input<string>[] = [];
  constructor(readonly dir: pulumi.Input<string>) {}
  addFile(file: pulumi.Input<string>) {
    this.files.push(file);
  }
  addService(service: pulumi.Input<string>) {
    this.services.push(service);
  }
  insertService(service: pulumi.Input<string>, index: number) {
    this.services.splice(index, 0, service);
  }

  toShellScript(): pulumi.Output<string> {
    return pulumi.interpolate`
yum install -y yum-utils
yum-config-manager \
    --add-repo \
    https://download.docker.com/linux/centos/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl start docker
sleep 5
${this.startServices()}`;
  }
  private startServices() {
    let result = pulumi.concat(
      this.concatCommonOptions(this.dir, this.files),
      " up --no-start\n"
    );
    this.services.forEach(
      (s) =>
        (result = pulumi.concat(
          result,
          this.concatCommonOptions(this.dir, this.files),
          ` start ${s}\n`
        ))
    );
    return result;
  }
  private concatCommonOptions(
    dir?: pulumi.Input<string>,
    files?: pulumi.Input<string>[]
  ): pulumi.Output<string> {
    let result = pulumi.output("docker compose");
    if (files?.length) {
      for (let i = 0; i < files.length; ++i) {
        if (dir) {
          result = pulumi.concat(result, " --file ", dir, "/", files[i]);
        } else {
          result = pulumi.concat(result, " --file ", files[i]);
        }
      }
    } else if (dir) {
      result = pulumi.concat(result, " --project-directory ", dir);
    }
    return result;
  }
}
