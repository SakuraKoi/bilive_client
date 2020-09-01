# bilive_client

[![Node.js](https://img.shields.io/badge/Node.js-v10.0%2B-green.svg)](https://nodejs.org)
[![Commitizen friendly](https://img.shields.io/badge/Commitizen-Friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/SakuraKoi/bilive_client/blob/master/LICENSE)

**Archived - 白嫖已死**

* **这是一个基于[Vector000的bilive_client分支](https://github.com/Vector000/bilive_client)的分支, 进行了部分修改以符合我自己的使用需求**

**目前的主要修改如下**
* 为每个用户分配不同的抽奖暂停时间
* 将用户的挂机报告推送至各自的server酱
* 通过b站抽奖id连续性的规则进行舰队抽奖的漏抽统计
* 分别设置普通抽奖(辣条)和舰队抽奖(亲密度)的丢弃概率
* 自动向佩戴牌子的直播间赠送小心心以点亮牌子


* 这是一个次分支，感谢所有对[主分支](https://github.com/lzghzr/bilive_client)做出贡献的人及其他同类开源软件的开发者
* 有兴趣支持原作者的，请朝这里打钱=>[给lzghzr打钱](https://github.com/lzghzr/bilive_client/wiki)
* 有兴趣向Vector000大佬投喂的，请朝这里打钱=>[请给我钱](https://github.com/Vector000/Something_Serious/blob/master/pics/mm_reward_qrcode.png)

## 使用方法

1. 安装[Node.js](https://nodejs.org/)，建议使用LTS版本
2. 安装[Git](https://git-scm.com/downloads)
3. 在命令行中定位到想要安装的目录
4. `git clone https://github.com/SakuraKoi/bilive_client.git`
5. `cd bilive_client` 进入程序主目录
6. `npm i` 或 `npm install` 安装依赖包
7. `npm i -g pm2`(自动更新所需，可忽略)
8. `npm run build` 第一次启动需进行手动编译
9. `npm start`(直接启动) 或 `pm2 start`(通过PM2后台启动)

## 更新

1. 定位到`bilive_client`目录下
2. `git pull` 拉取更新
3. `npm i` 或 `npm install` 检查更新依赖包
4. `npm run build` 手动进行编译
5. `npm start` 或 `pm2 start`

更新之后可能会出现不兼容的情况(或者bug)，可删去`options/options.json`后重新进行账号设置
