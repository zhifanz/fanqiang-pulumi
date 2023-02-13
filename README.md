# Tunnel Proxy Auto Deployment by Pulumi

This project contains pulumi program to create tunnel proxy infrastructures on Aliyun and AWS

## Architecture

```
    --------------    --------------    --------------
   | proxy-eu-aws |  | proxy-us-aws |  | proxy-ap-aws |
    --------------    --------------    --------------
           |                 |                 |
            -----------------|-----------------
                             | <--- rule based routing
                     ------------------
                    | router-cn-aliyun |
                     ------------------
                             |
                             | <--- rule based conditional proxy
                             |
         -------------------------------------------
        | Clients:                                  |
        |  ---------   -----   ---------   -------  |
        | | Android | | iOS | | Windows | | MacOS | |
        |  ---------   -----   ---------   -------  |
         -------------------------------------------
```

## Prerequisites

- Has [**Nodejs**][1] installed on local machine.
- Has [**Pulumi**][2] installed on local machine.
- Has [**Ansible**][3] installed on local machine.
- Has [**psql**][4] installed on local machine. (This is only required when your infra scale is _moderate_ or _ultimate_)

[1]: https://nodejs.org/en/
[2]: https://www.pulumi.com/
[3]: https://docs.ansible.com/ansible/latest/getting_started/index.html
[4]: https://www.postgresql.org/

## Provider Configuration

- AWS - https://www.pulumi.com/registry/packages/aws/installation-configuration/
- Alicloud - https://www.pulumi.com/registry/packages/alicloud/installation-configuration/

## Pulumi App Inputs

| Name       | Description                                                              |
| ---------- | ------------------------------------------------------------------------ |
| port       | proxy service port                                                       |
| password   | used to protect proxy from anonymous user, as complex as possible        |
| encryption | shadowsocks encryption algorithm                                         |
| bucket     | AWS bucket name, must be unique                                          |
| scale      | determine features of proxy system: minimal, moderate, premium, ultimate |
| publicKeys | just for vm login and debugging                                          |
