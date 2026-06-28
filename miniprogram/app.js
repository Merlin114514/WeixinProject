App({
    globalData: {
      userInfo: null,
      openid: null,
      // 这里改成你云开发控制台里真实的环境ID
      envId: 'cloud1-d5g28cuac626d2ff4' 
    },
  
    onLaunch() {
      if (!wx.cloud) {
        wx.showToast({ icon: 'none', title: '当前基础库不支持云开发，请升级微信小程序基础库' })
        return
      }
      wx.cloud.init({
        env: this.globalData.envId,
        traceUser: true,
      })
  
      const localOpenid = wx.getStorageSync('openid')
      if (localOpenid) {
        this.globalData.openid = localOpenid
        this.checkUserIdentity(localOpenid)
      } else {
        this.getWxOpenid()
      }
    },
  
    getWxOpenid() {
      const that = this
      wx.cloud.callFunction({
        name: 'getOpenid',
        success: (res) => {
          const openid = res.result.openid
          that.globalData.openid = openid
          wx.setStorageSync('openid', openid)
          console.log('OpenID获取成功并缓存：', openid)
          that.checkUserIdentity(openid)
        },
        fail: (err) => {
          wx.showToast({ icon: 'none', title: '获取用户标识失败，请检查云函数' })
          console.error('getOpenid 云函数调用失败：', err)
        }
      })
    },
  
    checkUserIdentity(openid) {
      const that = this
      wx.cloud.callFunction({
        name: 'checkIdentity',
        data: { openid },
        success: (res) => {
          if (res.result.code === 0) {
            that.globalData.userInfo = res.result.data
            console.log('用户身份校验成功：', res.result.data)
            const role = res.result.data.role
            if (role === 'student') {
              wx.redirectTo({ url: '/pages/student-index/student-index' })
            } else if (role === 'teacher') {
              wx.redirectTo({ url: '/pages/teacher-index/teacher-index' })
            }
          } else if (res.result.code === -1) {
            wx.redirectTo({ url: '/pages/register/register' })
          }
        },
        fail: (err) => {
          wx.showToast({ icon: 'none', title: '身份校验失败，请检查云函数' })
          console.error('checkIdentity 云函数调用失败：', err)
        }
      })
    }
  })