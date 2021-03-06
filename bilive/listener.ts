import {EventEmitter} from 'events'
import {Options as requestOptions} from 'request'
import tools from './lib/tools'
import AppClient from './lib/app_client'
import Client from './client_re'
import DMclient from './dm_client_re'
import Options, {apiLiveOrigin} from './options'

/**
 * 监听服务器消息
 *
 * @class Listener
 * @extends {EventEmitter}
 */
class Listener extends EventEmitter {
    constructor() {
        super()
    }

    /**
     * 用于接收弹幕消息
     *
     * @private
     * @type {Map<number, DMclient>}
     * @memberof Listener
     */
    private _DMclient: Map<number, DMclient> = new Map()
    /**
     * 主WS服务器
     *
     * @private
     * @type {Client}
     * @memberof Listener
     */
    private _MainWSServer: Client = new Client('', '')
    /**
     * 备用WS服务器
     *
     * @private
     * @type {Client}
     * @memberof Listener
     */
    private _BackupWSServer: Client = new Client('', '')
    /**
     * 抽奖ID
     *
     * @private
     * @type {Set<number>}
     * @memberof Listener
     */
    private _raffleID: Set<number> = new Set()
    private _lotteryID: Set<number> = new Set()
    private _pklotteryID: Set<number> = new Set()
    private _beatStormID: Set<number> = new Set()
    private _MSGCache: Set<string> = new Set()
    /**
     * 抽奖更新时间
     *
     * @private
     * @type {number}
     * @memberof Listener
     */
    private _lastUpdate: number = Date.now()
    // @ts-ignore
    private _loop: NodeJS.Timer

    /**
     * 开始监听
     *
     * @memberof Listener
     */
    public Start() {
        if (Options._.config.localListener) this.updateAreaRoom()
        this.connectWSServer()
        // 3s清空一次消息缓存
        this._loop = setInterval(() => this._MSGCache.clear(), 3 * 1000)
    }

    /**
     * 更新分区房间
     *
     * @memberof Listener
     */
    private connectWSServer() {
        this._RoomListener()
        this._BAKRoomListener()
    }

    /**
     * 更新分区房间
     *
     * @memberof Listener
     */
    public async updateAreaRoom() {
        const userID = Options._.advConfig.defaultUserID
        // 获取直播列表
        const getAllList = await tools.XHR<getAllList>({
            uri: `${apiLiveOrigin}/room/v2/AppIndex/getAllList?${AppClient.baseQuery}`,
            json: true
        }, 'Android')
        if (getAllList !== undefined && getAllList.response.statusCode === 200 && getAllList.body.code === 0) {
            const roomIDs: Set<number> = new Set()
            // 获取房间列表
            getAllList.body.data.module_list.forEach(modules => {
                if (modules.module_info.type === 9 && modules.list.length > 2) {
                    for (let i = 0; i < 3; i++) roomIDs.add((<getAllListDataRoomList>modules.list[i]).roomid)
                }
            })
            // 添加房间
            roomIDs.forEach(roomID => {
                if (this._DMclient.has(roomID)) return
                const newDMclient = new DMclient({roomID, userID})
                newDMclient
                    .on('SYS_MSG', dataJson => this._RaffleCheck(dataJson))
                    .on('SYS_GIFT', dataJson => this._RaffleCheck(dataJson))
                    .Connect()
                this._DMclient.set(roomID, newDMclient)
            })
            // 移除房间
            this._DMclient.forEach((roomDM, roomID) => {
                if (roomIDs.has(roomID)) return
                roomDM.removeAllListeners().Close()
                this._DMclient.delete(roomID)
            })
        }
    }

    /**
     * 清空所有ID缓存
     *
     * @memberof Listener
     */
    public clearAllID() {
        if (Date.now() - this._lastUpdate < 3 * 60 * 1000) return
        this._raffleID.clear()
        this._lotteryID.clear()
        this._pklotteryID.clear()
        this._beatStormID.clear()
    }

    /**
     * 房间监听
     *
     * @private
     * @memberof Listener
     */
    private _RoomListener() {
        const {0: server, 1: protocol} = Options._.advConfig.serverURL.split('#')
        if (server !== undefined && protocol !== undefined) {
            this._MainWSServer = new Client(server, protocol)
            this._MainWSServer
                .on('raffle', (raffleMessage: raffleMessage) => this._RaffleHandler(raffleMessage))
                .on('lottery', (lotteryMessage: lotteryMessage) => this._RaffleHandler(lotteryMessage))
                .on('pklottery', (lotteryMessage: lotteryMessage) => this._RaffleHandler(lotteryMessage))
                .on('beatStorm', (beatStormMessage: beatStormMessage) => this._RaffleHandler(beatStormMessage))
                .on('sysmsg', (systemMessage: systemMessage) => tools.Log('主服务器消息:', systemMessage.msg))
                .Connect()
            tools.Log(`已连接到 ${Options._.advConfig.serverURL}`)
        }
        Options.on('clientUpdate', () => this._MainWSServer.Update(Options._.advConfig.serverURL))
    }

    /**
     * 房间监听(备用线路)
     *
     * @private
     * @memberof Listener
     */
    private _BAKRoomListener() {
        const {0: server, 1: protocol} = Options._.advConfig.bakServerURL.split('#')
        if (server !== undefined && protocol !== undefined) {
            this._BackupWSServer = new Client(server, protocol)
            this._BackupWSServer
                .on('raffle', (raffleMessage: raffleMessage) => this._RaffleHandler(raffleMessage))
                .on('lottery', (lotteryMessage: lotteryMessage) => this._RaffleHandler(lotteryMessage))
                .on('pklottery', (lotteryMessage: lotteryMessage) => this._RaffleHandler(lotteryMessage))
                .on('beatStorm', (beatStormMessage: beatStormMessage) => this._RaffleHandler(beatStormMessage))
                .on('sysmsg', (systemMessage: systemMessage) => tools.Log('备用服务器消息:', systemMessage.msg))
                .Connect()
            tools.Log(`已连接到备用服务器 ${Options._.advConfig.bakServerURL}`)
        }
        Options.on('bakClientUpdate', () => this._BackupWSServer.Update(Options._.advConfig.bakServerURL))
    }

    /**
     * 本地监听房间消息
     *
     * @private
     * @param {(SYS_MSG | SYS_GIFT)} dataJson
     * @memberof Listener
     */
    private async _RaffleCheck(dataJson: SYS_MSG | SYS_GIFT) {
        if (dataJson.real_roomid === undefined || this._MSGCache.has(dataJson.msg_text)) return
        this._MSGCache.add(dataJson.msg_text)
        const roomID = dataJson.real_roomid
        await tools.Sleep(3 * 1000) // 等待3s, 防止土豪刷屏
        const _lotteryInfo: requestOptions = {
            uri: `${apiLiveOrigin}/xlive/lottery-interface/v1/lottery/getLotteryInfo?${AppClient.signQueryBase(`roomid=${roomID}`)}`,
            json: true
        }
        const lotteryInfo = await tools.XHR<lotteryInfo>(_lotteryInfo, 'Android')
        if (lotteryInfo !== undefined && lotteryInfo.response.statusCode === 200
            && lotteryInfo.body.code === 0 && lotteryInfo.body.data.gift_list.length > 0) {
            lotteryInfo.body.data.gift_list.forEach(data => {
                const message: message = {
                    cmd: 'raffle',
                    roomID,
                    id: +data.raffleId,
                    type: data.type,
                    title: data.title,
                    time: +data.time_wait,
                    max_time: +data.max_time,
                    time_wait: +data.time_wait
                }
                this._RaffleHandler(message)
            })
        }
    }

    /**
     * 监听抽奖消息
     *
     * @private
     * @param {raffleMessage | lotteryMessage | beatStormMessage} raffleMessage
     * @memberof Listener
     */
    private _RaffleHandler(raffleMessage: raffleMessage | lotteryMessage | beatStormMessage) {
        const {cmd, id, roomID, title} = raffleMessage
        switch (cmd) {
            case 'raffle':
                if (this._raffleID.has(id)) return
                this._raffleID.add(id)
                break
            case 'lottery':
                if (this._lotteryID.has(id)) return
                this._lotteryID.add(id)
                break
            case 'beatStorm':
                if (this._beatStormID.has(id)) return
                this._beatStormID.add(id)
                break
            case 'pklottery':
                if (this._pklotteryID.has(id)) return
                this._pklotteryID.add(id)
                break
            default:
                return
        }
        // 更新时间
        this._lastUpdate = Date.now()
        this.emit(cmd, raffleMessage)
        tools.Log(`房间 ${Options.getShortRoomID(roomID)} 开启了第 ${id} 轮${title}`)
    }
}

export default Listener
