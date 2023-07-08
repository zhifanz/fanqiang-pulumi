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
