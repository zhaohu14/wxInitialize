// 使用全局事件总线（替代Node.js的events模块）
const eventBus = new Map();
let keyArr = []
const functionList = {
    /*
        onShow 再次触发需要执行的特定方法
        @callback： 需要在onshow再次执行时执行的方法
        @beforFunction： 在onshow再次执行前执行的方法 比如要跳转页面
    */
    _onShow: function (callback, beforFunction) {
        // 获取当前页面实例
        const pages = getCurrentPages();
        const currentPage = pages[pages.length - 1];

        // 保存页面实例（确保页面卸载时清理）
        const eventKey = Symbol('onShow');
        currentPage._eventKey = eventKey;

        // 注册全局事件
        eventBus.set(eventKey, {
            callback,
            page: currentPage
        });

        // 监听页面显示事件
        const originalOnShow = currentPage.onShow;
        currentPage.onShow = function () {
            originalOnShow && originalOnShow.call(this);
            const event = eventBus.get(eventKey);
            if (event) {
                event.callback();
                eventBus.delete(eventKey);
            }
        }
        if (beforFunction && typeof beforFunction === 'function') {
            beforFunction()
        }
    },
    /*
        跳转页面传Object参数
        @url: 需要跳转的路径
        @data: 需要传给跳转页面的数据 Object  如果只需要传单个参数建议直接使用wx.navigateTo的路径传参
        @获取数据用_getOnLoadData().then(ret) 方式获取
    */
    _navigateTo: function (url, data) {
        wx.navigateTo({
            url: url,
            success: res => {
                res.eventChannel.emit('getData', {
                    ...data
                })
            }
        })
    },
    /*
        onLoad 获取_navigateTo路由跳转的参数
        @that: 当前页面this指向
        @建议：只适用于_navigateTo方法传参接受参数
    */
    _getOnLoadData(that) {
        return new Promise((resovel, reject) => {
            try {
                that.getOpenerEventChannel().on('getData', (data) => {
                    resovel(data)
                })
            } catch (error) {
                resovel({})
            }
        })

    },
    /*
        方法执行结束之前不允许重复执行的方法
        @func: 需要执行的方法
        @func： (e, key) func 方法会接收2个参数，需要在需要解除限制的地方执行e(key) 并传入key
        @key: 方法的key 建议全局唯一性
    */
    _onceFunction(func, key) {
        if (keyArr.indexOf(key) !== -1) {
            return
        }
        keyArr.push(key)
        let functionCallBack = () => {
            return new Promise(resolve => {
                func(resolve, key)
            })
        }
        functionCallBack().then((e) => {
            keyArr = keyArr.filter(a => {
                return a !== e
            })
        })


    }
}

module.exports = {
    /*
        初始化方法库 挂载到全局 直接wx.方法名()使用
    */
    initialize() {
        const funcKey = Object.keys(functionList)
        funcKey.forEach(ret => {
            wx[ret] = functionList[ret]
        })
    },
    ...functionList
    // _onShow: functionList._onShow,
    // _navigateTo: functionList._navigateTo,
    // _getOnLoadData: functionList._getOnLoadData
};