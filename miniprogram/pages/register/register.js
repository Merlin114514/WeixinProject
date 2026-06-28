var app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    activeRole: 'student', // 默认学生身份（接收登录页传递的身份）
    username: '', // 用户名（姓名）
    account: '', // 学号/工号
    password: '', // 密码
    confirmPwd: '', // 确认密码
    registerLoading: false, // 注册加载状态
    avatarUrl: '', // 新增：头像预览路径（临时/云存储）
    tempAvatarPath: '' // 新增：头像临时文件路径（用于上传）
  },

  onLoad(options) {
    // 接收登录页传递的身份
    if (options.role) {
      this.setData({
        activeRole: options.role
      })
    }
  },

  // 切换身份
  changeRole(e) {
    const role = e.currentTarget.dataset.role
    this.setData({
      activeRole: role,
      account: '', // 清空账号
      password: '', // 清空密码
      confirmPwd: '' // 清空确认密码
    })
  },

  // 输入用户名
  inputUsername(e) {
    this.setData({
      username: e.detail.value.trim()
    })
  },

  // 输入学号/工号
  inputAccount(e) {
    this.setData({
      account: e.detail.value.trim()
    })
  },

  // 输入密码
  inputPassword(e) {
    this.setData({
      password: e.detail.value
    })
  },

  // 输入确认密码
  inputConfirmPwd(e) {
    this.setData({
      confirmPwd: e.detail.value
    })
  },

  // 新增：选择并预览头像
  chooseAvatar() {
    const that = this
    // 选择图片（相册/相机，仅选1张，压缩处理）
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'], // 压缩图片，节省存储空间
      sourceType: ['album', 'camera'], // 支持相册选择和相机拍摄
      success(res) {
        // 获取临时文件路径
        const tempFilePath = res.tempFilePaths[0]
        that.setData({
          tempAvatarPath: tempFilePath, // 存储临时路径用于上传
          avatarUrl: tempFilePath // 预览头像
        })
      },
      fail() {
        wx.showToast({ title: '选择头像失败', icon: 'none' })
      }
    })
  },

  // 提交注册（核心逻辑，仅新增头像上传相关代码）
  submitRegister() {
    const { activeRole, username, account, password, confirmPwd, tempAvatarPath } = this.data
    const that = this

    // 1. 表单校验（原有逻辑不变）
    if (!username) {
      wx.showToast({ title: '请输入用户名', icon: 'none' })
      return
    }
    if (!account) {
      wx.showToast({ title: `请输入${activeRole === 'student' ? '学号' : '工号'}`, icon: 'none' })
      return
    }
    if (!password || password.length < 6 || password.length > 16) {
      wx.showToast({ title: '请设置6-16位密码', icon: 'none' })
      return
    }
    if (password !== confirmPwd) {
      wx.showToast({ title: '两次输入密码不一致', icon: 'none' })
      return
    }

    // 2. 校验学号/工号是否已存在（避免重复注册，原有逻辑不变）
    this.setData({ registerLoading: true })
    let uniqueCondition = {}
    if (activeRole === 'student') {
      uniqueCondition = { studentId: account }
    } else {
      uniqueCondition = { teaId: account }
    }

    // 3. 查询账号唯一性（原有逻辑不变，内部新增头像上传处理）
    db.collection('user')
      .where(uniqueCondition)
      .get({
        success: (res) => {
          if (res.data.length > 0) {
            // 账号已存在
            that.setData({ registerLoading: false })
            wx.showToast({ title: `${activeRole === 'student' ? '学号' : '工号'}已注册`, icon: 'none' })
            return
          }

          // 新增：头像上传处理（封装为异步函数，不阻塞原有逻辑）
          const uploadAvatar = () => {
            return new Promise((resolve, reject) => {
              // 若无选择头像，直接返回默认头像路径
              if (!tempAvatarPath) {
                resolve('/images/my.png')
                return
              }
              // 有选择头像，上传到云存储
              const cloudPath = `avatar/${Date.now()}-${Math.random().toString(36).substr(2, 8)}.png` // 自定义云存储路径
              wx.cloud.uploadFile({
                cloudPath: cloudPath, // 云存储文件路径
                filePath: tempAvatarPath, // 本地临时文件路径
                success: (uploadRes) => {
                  // 上传成功，返回云存储文件ID
                  resolve(uploadRes.fileID)
                },
                fail: (err) => {
                  // 上传失败，返回默认头像
                  reject(err)
                  resolve('/images/my.png')
                }
              })
            })
          }

          // 执行头像上传，再插入数据库
          uploadAvatar().then((avatarUrl) => {
            // 4. 构造注册数据（仅修改avatarUrl字段，原有逻辑不变）
            const userData = {
              username: username,
              role: activeRole,
              password: password, // 注：生产环境建议用MD5加密后存储
              avatarUrl: avatarUrl, // 使用上传后的头像路径（云存储/默认）
              createTime: db.serverDate() // 注册时间
            }
            // 学生添加学号字段
            if (activeRole === 'student') {
              userData.studentId = account
            }
            // 老师添加工号字段
            if (activeRole === 'teacher') {
              userData.teaId = account
            }

            // 5. 插入数据库（原有逻辑不变）
            db.collection('user')
              .add({
                data: userData,
                success: () => {
                  that.setData({ registerLoading: false })
                  wx.showToast({ title: '注册成功', icon: 'success', duration: 2000 })
                  // 注册成功后返回登录页
                  setTimeout(() => {
                    wx.navigateBack()
                  }, 1500)
                },
                fail: (err) => {
                  that.setData({ registerLoading: false })
                  wx.showToast({ title: '注册失败，请重试', icon: 'none' })
                  console.error('注册插入数据库失败：', err)
                }
              })
          })
        },
        fail: (err) => {
          that.setData({ registerLoading: false })
          wx.showToast({ title: '校验账号失败，请重试', icon: 'none' })
          console.error('注册校验账号唯一性失败：', err)
        }
      })
  },

  // 返回登录页
  gotoLogin() {
    wx.navigateBack()
  }
})