import * as pulumi from "@pulumi/pulumi";
import Eci20180808, {
  CreateContainerGroupRequest,
  CreateContainerGroupRequestContainer,
  CreateContainerGroupRequestContainerPort,
  DeleteContainerGroupRequest,
  DescribeContainerGroupsRequest,
  UpdateContainerGroupRequest,
  UpdateContainerGroupRequestContainer,
  UpdateContainerGroupRequestContainerPort,
} from "@alicloud/eci20180808";
import Vpc20160428, {
  DescribeEipAddressesRequest,
} from "@alicloud/vpc20160428";
import { Config } from "@alicloud/openapi-client";
import { isEqual } from "lodash";

type AlicloudEciContainerGroupProviderInput = {
  securityGroupId: string;
  vSwitchId: string;
  containerGroupName: string;
  eipInstanceId: string;
  cpu: number;
  memory: number;
  container: { name: string; image: string; command: string[]; port: number };
};

export class AlicloudEciContainerGroupProvider
  implements pulumi.dynamic.ResourceProvider
{
  readonly eciClient: Eci20180808;
  readonly vpcClient: Vpc20160428;
  constructor(readonly regionId: string) {
    this.eciClient = new Eci20180808(
      new Config({
        accessKeyId: process.env.ALICLOUD_ACCESS_KEY,
        accessKeySecret: process.env.ALICLOUD_SECRET_KEY,
        regionId: regionId,
        endpoint: `eci.${regionId}.aliyuncs.com`,
      })
    );
    this.vpcClient = new Vpc20160428(
      new Config({
        accessKeyId: process.env.ALICLOUD_ACCESS_KEY,
        accessKeySecret: process.env.ALICLOUD_SECRET_KEY,
        regionId: regionId,
        endpoint: `vpc.${regionId}.aliyuncs.com`,
      })
    );
  }
  check(
    olds: AlicloudEciContainerGroupProviderInput,
    news: AlicloudEciContainerGroupProviderInput
  ): Promise<pulumi.dynamic.CheckResult> {
    return Promise.resolve({ inputs: news });
  }
  async diff(
    id: string,
    olds: AlicloudEciContainerGroupProviderInput,
    news: AlicloudEciContainerGroupProviderInput
  ): Promise<pulumi.dynamic.DiffResult> {
    let changes = false,
      deleteBeforeUpdate = false;
    const replaces: string[] = [];
    if (olds.securityGroupId != news.securityGroupId) {
      changes = true;
      deleteBeforeUpdate = true;
      replaces.push("securityGroupId");
    }
    if (olds.vSwitchId != news.vSwitchId) {
      changes = true;
      deleteBeforeUpdate = true;
      replaces.push("vSwitchId");
    }
    if (olds.containerGroupName != news.containerGroupName) {
      changes = true;
      deleteBeforeUpdate = true;
      replaces.push("containerGroupName");
    }
    if (olds.eipInstanceId != news.eipInstanceId) {
      changes = true;
      deleteBeforeUpdate = true;
      replaces.push("eipInstanceId");
    }
    if (olds.cpu != news.cpu) {
      changes = true;
    }
    if (olds.memory != news.memory) {
      changes = true;
    }
    if (!isEqual(olds.container, news.container)) {
      changes = true;
    }
    if (!changes) {
      return { changes: false };
    }
    return deleteBeforeUpdate
      ? { changes: true, deleteBeforeReplace: true, replaces }
      : { changes: true, deleteBeforeReplace: false };
  }
  async create(
    inputs: AlicloudEciContainerGroupProviderInput
  ): Promise<pulumi.dynamic.CreateResult> {
    const request = new CreateContainerGroupRequest();
    request.regionId = this.regionId;
    request.securityGroupId = inputs.securityGroupId;
    request.vSwitchId = inputs.vSwitchId;
    request.containerGroupName = inputs.containerGroupName;
    request.eipInstanceId = inputs.eipInstanceId;
    request.cpu = inputs.cpu;
    request.memory = inputs.memory;

    request.ipv6AddressCount = 1;
    request.ipv6GatewayBandwidthEnable = true;
    request.container = [
      new CreateContainerGroupRequestContainer({
        name: inputs.container.name,
        image: inputs.container.image,
        arg: inputs.container.command,
        port: [
          new CreateContainerGroupRequestContainerPort({
            protocol: "TCP",
            port: inputs.container.port,
          }),
        ],
        cpu: inputs.cpu,
        memory: inputs.memory,
      }),
    ];

    const response = await this.eciClient.createContainerGroup(request);

    return { id: <string>response.body.containerGroupId, outs: {} };
  }
  async read(
    id: string,
    props?: AlicloudEciContainerGroupProviderInput
  ): Promise<pulumi.dynamic.ReadResult> {
    const info = await this.readContainerGroup(id);
    const container = readSingleton(info.containers);

    return {
      id: info.containerGroupId,
      props: {
        regionId: info.regionId,
        securityGroupId: info.securityGroupId,
        vSwitchId: info.vSwitchId,
        containerGroupName: info.containerGroupName,
        eipInstanceId: (await this.readEipInstance(info.eniInstanceId))
          ?.allocationId,
        cpu: info.cpu,
        memory: info.memory,
        container: {
          name: container.name,
          image: container.image,
          command: container.args,
          port: readSingleton(container.ports).port,
        },
      },
    };
  }

  private async readEipInstance(eni?: string) {
    if (!eni) {
      return undefined;
    }
    const request = new DescribeEipAddressesRequest();
    request.regionId = this.regionId;
    request.associatedInstanceType = "NetworkInterface";
    request.associatedInstanceId = eni;
    const response = await this.vpcClient.describeEipAddresses(request);
    if (!response.body?.totalCount) {
      return undefined;
    }
    return readSingleton(response.body?.eipAddresses?.eipAddress);
  }

  async update(
    id: string,
    olds: AlicloudEciContainerGroupProviderInput,
    news: AlicloudEciContainerGroupProviderInput
  ): Promise<pulumi.dynamic.UpdateResult> {
    const request = new UpdateContainerGroupRequest();
    request.containerGroupId = id;
    if (olds.cpu != news.cpu) {
      request.cpu = news.cpu;
    }
    if (olds.memory != news.memory) {
      request.memory = news.memory;
    }
    if (!isEqual(olds.container, news.container)) {
      request.container = [
        new UpdateContainerGroupRequestContainer({
          name: news.container.name,
          image: news.container.image,
          arg: news.container.command,
          port: [
            new UpdateContainerGroupRequestContainerPort({
              protocol: "TCP",
              port: news.container.port,
            }),
          ],
        }),
      ];
    }
    await this.eciClient.updateContainerGroup(request);
    return {};
  }
  async delete(id: string): Promise<void> {
    const request = new DeleteContainerGroupRequest();
    request.regionId = this.regionId;
    request.containerGroupId = id;
    await this.eciClient.deleteContainerGroup(request);
  }

  private async readContainerGroup(id: string) {
    const request = new DescribeContainerGroupsRequest();
    request.regionId = this.regionId;
    request.containerGroupIds = JSON.stringify([id]);
    const response = await this.eciClient.describeContainerGroups(request);
    if (response.body.containerGroups?.length != 1) {
      throw new Error(`Multiple container group result for id: ${id}`);
    }
    return response.body.containerGroups[0];
  }
}

function readSingleton<T>(value?: T[]): T {
  if (value?.length) {
    return value[0];
  }
  throw new Error("Provided value is not a singleton!");
}

export type AlicloudEciContainerGroupInput = {
  securityGroupId: pulumi.Input<string>;
  vSwitchId: pulumi.Input<string>;
  containerGroupName: pulumi.Input<string>;
  eipInstanceId: pulumi.Input<string>;
  cpu: pulumi.Input<number>;
  memory: pulumi.Input<number>;
  container: {
    name: pulumi.Input<string>;
    image: pulumi.Input<string>;
    command: pulumi.Input<string>[];
    port: pulumi.Input<number>;
  };
};

export class AlicloudEciContainerGroup extends pulumi.dynamic.Resource {
  constructor(
    regionId: string,
    name: string,
    props: AlicloudEciContainerGroupInput,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(new AlicloudEciContainerGroupProvider(regionId), name, props, opts);
  }
}
