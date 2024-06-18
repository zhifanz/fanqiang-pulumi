# [2.7.0](https://github.com/zhifanz/fanqiang-pulumi/compare/v2.6.1...v2.7.0) (2024-06-10)


### Features

* vpn server use lightsail instead of ec2 ([5abfb28](https://github.com/zhifanz/fanqiang-pulumi/commit/5abfb285df6dacb3033f849d40c855631348cc2e))

## [2.6.1](https://github.com/zhifanz/fanqiang-pulumi/compare/v2.6.0...v2.6.1) (2024-03-13)


### Bug Fixes

* cloudinit will fail if ipv6util script does not reboot the ecs instance ([2a41e06](https://github.com/zhifanz/fanqiang-pulumi/commit/2a41e06e3568bb673fbe229434404b2546db292e))

# [2.6.0](https://github.com/zhifanz/fanqiang-pulumi/compare/v2.5.1...v2.6.0) (2024-03-05)


### Features

* aliyun tunnel type support eci ([7355267](https://github.com/zhifanz/fanqiang-pulumi/commit/73552675532ad817e4e1f64f58612eb871c21a03))

## [2.5.1](https://github.com/zhifanz/fanqiang-pulumi/compare/v2.5.0...v2.5.1) (2024-01-14)


### Bug Fixes

* make proxy stable by using aws fargate instead of fargate_spot ([f97f5b3](https://github.com/zhifanz/fanqiang-pulumi/commit/f97f5b38238e100720c9a1f2ef31993fcdba08c3))

# [2.5.0](https://github.com/zhifanz/fanqiang-pulumi/compare/v2.4.0...v2.5.0) (2023-09-12)


### Features

* add support for libreswan vpn server ([17e4d46](https://github.com/zhifanz/fanqiang-pulumi/commit/17e4d46d93322c926f306492a2b9f84431dc985a))

# [2.4.0](https://github.com/zhifanz/fanqiang-pulumi/compare/v2.3.0...v2.4.0) (2023-08-24)


### Features

* enable ipv6 on alicloud tunnel ([fc4bfff](https://github.com/zhifanz/fanqiang-pulumi/commit/fc4bfff980be14c348746bfad22626a14437f091))

# [2.3.0](https://github.com/zhifanz/fanqiang-pulumi/compare/v2.2.0...v2.3.0) (2023-08-17)


### Features

* add ipv6 address to proxy service ([f38d26e](https://github.com/zhifanz/fanqiang-pulumi/commit/f38d26e1eb3997a19cbd1ce106fc72eb4da20cf2))

# [2.2.0](https://github.com/zhifanz/fanqiang-pulumi/compare/v2.1.0...v2.2.0) (2023-07-22)


### Features

* add environment variable support for input parameter ([b7a5ebe](https://github.com/zhifanz/fanqiang-pulumi/commit/b7a5ebe542a4c9277fc48e237de1cf3eaca11044))

# [2.1.0](https://github.com/zhifanz/fanqiang-pulumi/compare/v2.0.0...v2.1.0) (2023-07-16)


### Features

* auto generate password if not provided ([a9cd8d1](https://github.com/zhifanz/fanqiang-pulumi/commit/a9cd8d1f4495a97d7a4f7f66b5c0c16ae01603a1))

# [2.0.0](https://github.com/zhifanz/fanqiang-pulumi/compare/v1.0.1...v2.0.0) (2023-07-08)


### Features

* remove premium and ultimate scale ([c568368](https://github.com/zhifanz/fanqiang-pulumi/commit/c5683687a572b72538005343962bc9aeff8854a4))


### BREAKING CHANGES

* no longer support ip location analysis

## [1.0.1](https://github.com/zhifanz/fanqiang-pulumi/compare/v1.0.0...v1.0.1) (2023-05-10)


### Bug Fixes

* use resource policy for public access of s3 objects ([b981b74](https://github.com/zhifanz/fanqiang-pulumi/commit/b981b740682170995ef6f26b967f773562e06dc8))

# 1.0.0 (2023-02-17)


### Bug Fixes

* ansible always use an existing key pair on host machine ([8979dcb](https://github.com/zhifanz/fanqiang-pulumi/commit/8979dcbe37086f777355648b1bec824c7a494d73))
* log parser correctly parse log format of clash docker ([fb13a73](https://github.com/zhifanz/fanqiang-pulumi/commit/fb13a73c85bcef75d299b4b632a5a3e2aafe63e9))
* make jinja2 output file more compact ([243a06b](https://github.com/zhifanz/fanqiang-pulumi/commit/243a06bea920e4e3247827555f85753c022eefa7))
* remove unused const PULUMI_PROJECT_NAME ([85c04b3](https://github.com/zhifanz/fanqiang-pulumi/commit/85c04b3b9e34366c2a04ac44eadf22ba901b1d74))
* use camelcase for class file name ([fca638a](https://github.com/zhifanz/fanqiang-pulumi/commit/fca638abadf86d1b1fda28e4fff2fd01dbb87f10))
* use ssh command to generate key pair instead of node api ([6cc8575](https://github.com/zhifanz/fanqiang-pulumi/commit/6cc85753ec70d044ef0e86ee56ee1fe5e2aecca1))
* username is only required in premium mode ([41ece9d](https://github.com/zhifanz/fanqiang-pulumi/commit/41ece9d9049ca3d41f6aecf3a4c6efae702cf065))
* wait connect success before create index ([e20382c](https://github.com/zhifanz/fanqiang-pulumi/commit/e20382cd8ab5a5edad6855a2f2e37fee89278461))


### Features

* add clash tunnel ([bce2263](https://github.com/zhifanz/fanqiang-pulumi/commit/bce226387bd8f659ecfccb2f41bd4a019a4c226b))
* add project level default configuration ([d42c281](https://github.com/zhifanz/fanqiang-pulumi/commit/d42c28109524f839961fc05f6ed7ba02b146466d))
* add tunnel between client and proxy ([2c615c9](https://github.com/zhifanz/fanqiang-pulumi/commit/2c615c9acf6aec40b2908255b0039b51402c7f49))
* expose database endpoint to pulumi output ([aba4ca5](https://github.com/zhifanz/fanqiang-pulumi/commit/aba4ca5d168be5e2f17945f30ab1b5dca6347e87))
* init project ([05ee198](https://github.com/zhifanz/fanqiang-pulumi/commit/05ee198cdb465fe62f8ad283629ba4269a1c63a9))
* lightsail shadowsocks server ([62c8acb](https://github.com/zhifanz/fanqiang-pulumi/commit/62c8acbe9d542231f7c577f34672c106987314f2))
* output clash client config url ([d9608f6](https://github.com/zhifanz/fanqiang-pulumi/commit/d9608f6c62a8b5354e26546711e0612de340f5a0))
* rule analysis use aurora store event logs ([6eaa330](https://github.com/zhifanz/fanqiang-pulumi/commit/6eaa330d383074613778e35b4d70ca68ec762e97))
* save clash log as structual data in postgresql ([c2bbde5](https://github.com/zhifanz/fanqiang-pulumi/commit/c2bbde57bc1c3a8013852771bf018704f68e5870))
* send clash log to opensearch for analysis ([30b95a9](https://github.com/zhifanz/fanqiang-pulumi/commit/30b95a92501fec1d04857c216d6a094f3d91eff9))
* send clash log to redshift for analysis ([fa332b0](https://github.com/zhifanz/fanqiang-pulumi/commit/fa332b04729babf86ff1b671935985959366fe63))
* stream log to aws cloudwatch ([cc8425c](https://github.com/zhifanz/fanqiang-pulumi/commit/cc8425c259f05cf8bd2fa75555abcc2ebe3ed3ad))
* support ssh to remote cloud instance ([9076e0a](https://github.com/zhifanz/fanqiang-pulumi/commit/9076e0a8d31a5698c6c03911fe492b4798fe2e90))
