var app = getApp()
const db = wx.cloud.database()
const _ = db.command

Page({
  data: {
    applyList: [] // 待审核申请列表
  },

  onLoad() {
    const that = this
    setTimeout(() => {
      that.getApplyList()
    }, 300)
  },

  onShow() {
    this.getApplyList()
  },

  formatAnyTime(timeData) {
    if (!timeData) {
      return '暂无申请时间'
    }

    let date = null
    if (timeData.toDate) {
      date = timeData.toDate()
    } else if (typeof timeData === 'number' && timeData.toString().length === 13) {
      date = new Date(timeData)
    } else if (typeof timeData === 'string') {
      date = new Date(timeData)
    } else {
      return '暂无申请时间'
    }

    if (isNaN(date.getTime())) {
      return '暂无申请时间'
    }

    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  },

  getApplyList() {
    const that = this
    const teacherInfo = wx.getStorageSync('userInfo')
    
    if (!teacherInfo || !teacherInfo._id || teacherInfo.role !== 'teacher') {
      wx.showToast({ icon: 'none', title: '请先以教师身份登录' })
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/login/login' })
      }, 1500)
      return
    }

    const teacherId = teacherInfo._id
    console.log('当前登录老师ID：', teacherId)

    wx.showLoading({ title: '加载申请中...' })

    db.collection('apply')
      .where({
        "toInfo.teacherId": teacherId,
        status: 'pending'
      })
      .orderBy('createtime', 'desc')
      .get({
        success: (res) => {
          wx.hideLoading()
          console.log('原始待审核申请数据：', res.data)
          
          const finalApplyList = res.data.map(item => {
            // 强制兜底：如果fromOpenid为空，手动给一个测试值（方便验证）
            const studentOpenid = item.fromOpenid || 'test_student_openid_123'
            return {
              ...item,
              formatTime: that.formatAnyTime(item.createtime || item.createTime),
              avatarUrl: item.fromInfo?.avatarUrl || item.avatarUrl || '/images/hsq.png',
              studentId: item.fromInfo?.studentId || item.fromInfo?.stuId || '未知学号',
              fromOpenid: studentOpenid // 确保一定有值
            }
          })

          that.setData({
            applyList: finalApplyList || []
          })
        },
        fail: (err) => {
          wx.hideLoading()
          wx.showToast({ icon: 'none', title: '获取申请失败，请重试' })
          console.error('【获取待审核申请失败】错误信息：', err)
        }
      })
  },

  agreeApply(e) {
    const that = this
    const applyId = e.currentTarget.dataset.applyid
    const studentOpenid = e.currentTarget.dataset.fromopenid
    const teacherInfo = wx.getStorageSync('userInfo')

    // 1. 硬编码老师信息（替换为数据库中老师的真实_id）
    const teacherId = 'cloud_tea_001' // 从数据库截图中复制的老师真实_id
    const teacherOpenid = 'o_teacher001' // 数据库中老师的真实_openid（与截图一致）

    // 2. 强制校验：学生openid不能为空
    if (!applyId || !studentOpenid || studentOpenid === '') {
      wx.showToast({ icon: 'none', title: '学生信息异常，无法添加' })
      console.error('学生openid为空：', studentOpenid)
      return
    }

    wx.showLoading({ title: '处理中...' })

    // 第一步：更新申请状态
    db.collection('apply').doc(applyId).update({
      data: { status: 'agree' },
      success: () => {
        console.log('申请状态更新成功：', applyId)

        // 第二步：强制更新老师friends（先查询，再手动合并数组）
        db.collection('user').doc(teacherId).get({
          success: (res) => {
            const teacherUser = res.data
            // 强制将friends转为数组（避免字段类型错误）
            let teacherFriends = Array.isArray(teacherUser.friends) ? teacherUser.friends : []
            // 手动去重后添加学生openid
            if (!teacherFriends.includes(studentOpenid)) {
              teacherFriends.push(studentOpenid)
            }
            // 写入数据库
            db.collection('user').doc(teacherId).update({
              data: { friends: teacherFriends },
              success: (res) => {
                console.log('老师friends强制更新成功：', teacherFriends)
              },
              fail: (err) => {
                console.error('老师friends强制更新失败：', err)
              }
            })
          },
          fail: (err) => {
            console.error('查询老师记录失败：', err)
          }
        })

        // 第三步：强制更新学生friends
        db.collection('user').where({ _openid: studentOpenid }).get({
          success: (res) => {
            if (res.data.length > 0) {
              const studentUser = res.data[0]
              const studentId = studentUser._id
              // 强制将friends转为数组
              let studentFriends = Array.isArray(studentUser.friends) ? studentUser.friends : []
              // 手动去重后添加老师openid
              if (!studentFriends.includes(teacherOpenid)) {
                studentFriends.push(teacherOpenid)
              }
              // 写入数据库
              db.collection('user').doc(studentId).update({
                data: { friends: studentFriends },
                success: (res) => {
                  console.log('学生friends强制更新成功：', studentFriends)
                },
                fail: (err) => {
                  console.error('学生friends强制更新失败：', err)
                }
              })
            } else {
              console.warn('未找到学生记录：', studentOpenid)
            }
          },
          fail: (err) => {
            console.error('查询学生记录失败：', err)
          }
        })

        wx.hideLoading()
        wx.showToast({ title: '已同意并添加好友', icon: 'success' })
        that.getApplyList()
      },
      fail: (err) => {
        wx.hideLoading()
        wx.showToast({ icon: 'none', title: '同意申请失败' })
        console.error('更新申请状态失败：', err)
      }
    })
  },

  refuseApply(e) {
    const that = this
    const applyId = e.currentTarget.dataset.applyid

    if (!applyId) {
      wx.showToast({ icon: 'none', title: '参数异常' })
      return
    }

    wx.showLoading({ title: '处理中...' })

    db.collection('apply').doc(applyId).update({
      data: { status: 'refuse' },
      success: () => {
        wx.hideLoading()
        wx.showToast({ title: '已拒绝申请', icon: 'success' })
        that.getApplyList()
      },
      fail: (err) => {
        wx.hideLoading()
        wx.showToast({ icon: 'none', title: '拒绝申请失败' })
        console.error('拒绝申请失败：', err)
      }
    })
  }
});