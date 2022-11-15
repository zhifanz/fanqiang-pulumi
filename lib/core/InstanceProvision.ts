import * as pulumi from "@pulumi/pulumi";
import path from "path";

export type ProvisionInstanceFunction = (
  instanceProvision: InstanceProvision
) => void;

export class InstanceProvision {
  private localCommands: pulumi.Input<string>[] = [];
  private commands: pulumi.Input<string>[] = [];
  private publicKeys: pulumi.Input<string>[] = [];
  private dirs: string[] = [];
  private requireInternet: boolean = false;
  private dockerCompose?: { files: string[] };
  private aws?: {
    accessKey?: {
      id: pulumi.Input<string>;
      secret: pulumi.Input<string>;
    };
    s3Copies?: { src: pulumi.Input<string>; dest: string }[];
  };
  constructor(private shebang: boolean = false) {}

  addCommand(command: pulumi.Input<string>, local: boolean = false): void {
    (local ? this.localCommands : this.commands).push(command);
  }

  ensureInternetAccess() {
    this.requireInternet = true;
  }

  addPublicKey(publicKey: pulumi.Input<string>): void {
    if (!this.publicKeys.includes(publicKey)) {
      this.publicKeys.push(publicKey);
    }
  }
  mkdir(dir: string): void {
    if (this.dirs.includes(dir)) {
      return;
    }
    for (const d of this.dirs) {
      if (d.startsWith(dir)) {
        return;
      }
    }
    this.dirs.push(dir);
  }

  configureAccessKey(
    id: pulumi.Input<string>,
    secret: pulumi.Input<string>
  ): void {
    if (this.aws) {
      this.aws.accessKey = { id, secret };
    } else {
      this.aws = { accessKey: { id, secret } };
    }
  }

  copyS3Dir(src: pulumi.Input<string>, dest: string): void {
    this.mkdir(path.dirname(dest));
    if (this.aws) {
      if (this.aws.s3Copies) {
        this.aws.s3Copies.push({ src, dest });
      } else {
        this.aws.s3Copies = [{ src, dest }];
      }
    } else {
      this.aws = { s3Copies: [{ src, dest }] };
    }
  }

  addDockerComposeFile(file: string, index?: number): void {
    if (this.dockerCompose) {
      if (index == undefined) {
        this.dockerCompose.files.push(file);
      } else {
        this.dockerCompose.files.splice(index, 0, file);
      }
    } else {
      this.dockerCompose = { files: [file] };
    }
  }

  toShellScript(): pulumi.Output<string> | string {
    let result: pulumi.Output<string> | string = this.shebang
      ? "#!/bin/bash\n\n"
      : "";
    if (this.dirs.length) {
      result = result + "mkdir -p";
      this.dirs.forEach((dir) => (result = result + ` ${dir}`));
      result = result + "\n";
    }
    if (this.publicKeys.length) {
      result =
        result +
        `if [ ! -d ~/.ssh ]; then mkdir ~/.ssh; fi
if [ ! -f ~/.ssh/authorized_keys ];
then
touch ~/.ssh/authorized_keys
chmod 700 ~/.ssh/authorized_keys
fi
`;
      this.publicKeys.forEach(
        (pk) =>
          (result = pulumi.interpolate`${result}echo "${pk}" >> ~/.ssh/authorized_keys\n`)
      );
    }
    this.localCommands.forEach(
      (c) => (result = pulumi.concat(result, c, "\n"))
    );
    if (this.requireInternet) {
      result = pulumi.interpolate`${result}until ping -c1 baidu.com &>/dev/null ; do sleep 1 ; done\n`;
    }
    if (this.aws) {
      result = pulumi.interpolate`${result}
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o ~/awscliv2.zip
unzip ~/awscliv2.zip -d ~
~/aws/install
rm -rf ~/aws
rm -f ~/awscliv2.zip
`;
      if (this.aws.accessKey) {
        result = pulumi.interpolate`${result}
aws configure set aws_access_key_id "${this.aws.accessKey.id}"
aws configure set aws_secret_access_key "${this.aws.accessKey.secret}"
`;
      }
      if (this.aws.s3Copies) {
        this.aws.s3Copies.forEach(
          (cp) =>
            (result = pulumi.interpolate`${result}aws s3 cp ${cp.src} ${cp.dest} --recursive\n`)
        );
      }
    }
    if (this.dockerCompose) {
      result = pulumi.interpolate`${result}
yum install -y yum-utils
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl start docker
until [ "$(systemctl is-active docker)" == "active" ] ; do sleep 1 ; done
docker compose`;
      this.dockerCompose.files.forEach(
        (f) => (result = pulumi.interpolate`${result} --file ${f}`)
      );
      result = pulumi.concat(result, " up --detach\n");
    }
    this.commands.forEach((c) => (result = pulumi.concat(result, c, "\n")));
    return result;
  }
}
