const db = wx.cloud.database();
const _ = db.command;
const app = getApp();

Page({
  data: {
    chatList: [], // 聊天列表数据
    studentOpenid: '', // 当前学生OpenID
    studentInfo: {} // 当前学生信息
  },

  onLoad() {
    // 1. 校验学生身份
    const studentInfo = wx.getStorageSync('userInfo');
    if (!studentInfo || studentInfo.role !== 'student' || !studentInfo._openid) {
      wx.showToast({ title: '请以学生身份登录', icon: 'none' });
      setTimeout(() => wx.reLaunch({ url: '/pages/login/login' }), 1500);
      return;
    }
    this.setData({
      studentInfo,
      studentOpenid: studentInfo._openid
    });
  },

  // 页面显示/刷新时获取聊天列表
  onShow() {
    this.getChatList();
  },

  /**
   * 核心：获取学生的聊天列表（修复：异步计数容错，确保数据完整渲染）
   */
  getChatList() {
    const { studentOpenid, studentInfo } = this.data;
    wx.showLoading({ title: '加载聊天列表...' });

    // 1. 获取学生的好友OpenID列表
    db.collection('user').doc(studentInfo._id).get({
      success: (userRes) => {
        const friendOpenids = userRes.data.friends || [];
        if (friendOpenids.length === 0) {
          wx.hideLoading();
          this.setData({ chatList: [] });
          return;
        }

        // 2. 遍历好友，获取信息+最新消息+未读数量
        const chatList = [];
        let count = 0;
        const totalFriend = friendOpenids.length; // 总好友数，避免计数异常

        friendOpenids.forEach((friendOpenid) => {
          // 过滤无效OpenID（去空格+空值判断）
          friendOpenid = (friendOpenid || '').trim();
          if (!friendOpenid) {
            count++;
            if (count === totalFriend) {
              wx.hideLoading();
              this.setData({ chatList });
            }
            return;
          }

          // 2.1 获取好友（老师）信息
          db.collection('user').where({ _openid: friendOpenid }).get({
            success: (friendRes) => {
              count++;
              if (friendRes.data.length === 0) {
                if (count === totalFriend) {
                  wx.hideLoading();
                  this.setData({ chatList });
                }
                return;
              }

              const friendData = friendRes.data[0];
              const friendInfo = {
                friendOpenid: friendOpenid,
                friendName: friendData.username || '未知老师',
                friendAvatar: friendData.avatarUrl || '/images/my.png'
              };

              // 2.2 获取最新消息
              db.collection('message').where({
                fromOpenid: _.in([studentOpenid, friendOpenid]),
                toOpenid: _.in([studentOpenid, friendOpenid])
              }).orderBy('createTime', 'desc').limit(1).get({
                success: (msgRes) => {
                  // 2.3 获取未读数量
                  db.collection('message').where({
                    fromOpenid: friendOpenid,
                    toOpenid: studentOpenid,
                    isRead: false
                  }).count({
                    success: (unreadRes) => {
                      const unreadCount = unreadRes.total;
                      let lastMsgContent = '暂无消息';
                      let lastMsgTime = '暂无时间';

                      if (msgRes.data.length > 0) {
                        const lastMsg = msgRes.data[0];
                        lastMsgTime = this.formatMsgTime(lastMsg.createTime);
                        lastMsgContent = lastMsg.msgType === 'image' ? '[图片消息]' : lastMsg.content || '[无内容]';
                      }

                      chatList.push({
                        ...friendInfo,
                        lastMsgContent,
                        lastMsgTime,
                        unreadCount
                      });

                      if (count === totalFriend) {
                        wx.hideLoading();
                        this.setData({ chatList });
                      }
                    },
                    // 补充：未读数量查询失败的容错
                    fail: () => {
                      if (count === totalFriend) {
                        wx.hideLoading();
                        this.setData({ chatList });
                      }
                    }
                  });
                },
                // 补充：最新消息查询失败的容错
                fail: () => {
                  if (count === totalFriend) {
                    wx.hideLoading();
                    this.setData({ chatList });
                  }
                }
              });
            },
            // 补充：好友信息查询失败的容错
            fail: () => {
              count++;
              if (count === totalFriend) {
                wx.hideLoading();
                this.setData({ chatList });
              }
            }
          });
        });
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: '加载聊天列表失败', icon: 'none' });
        console.error('获取学生好友失败：', err);
      }
    });
  },

  /**
   * 格式化消息时间（与老师端一致，保留原有逻辑）
   */
  formatMsgTime(timeData) {
    if (!timeData) return '未知时间';
    let date = null;
    if (timeData.toDate) date = timeData.toDate();
    else if (typeof timeData === 'number') date = new Date(timeData);
    else date = new Date(timeData);

    if (isNaN(date.getTime())) return '未知时间';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    if (msgDay.getTime() === today.getTime()) {
      return `今天 ${hours}:${minutes}`;
    } else {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
  },

  /**
   * 跳转到聊天详情页（完整修复：参数校验+URL编码+失败排查）
   */
  gotoChat(e) {
    try {
      // 1. 获取页面传递的参数
      const { friendopenid, friendavatar, friendname } = e.currentTarget.dataset;
      console.log("获取跳转参数：", { friendopenid, friendavatar, friendname });

      // 2. 非空校验：确保聊天对象有效
      if (!friendopenid || (friendopenid || '').trim() === '') {
        wx.showToast({ title: '聊天对象异常', icon: 'none' });
        return;
      }
      const targetOpenid = friendopenid.trim();

      // 3. URL编码：解决特殊字符（中文/斜杠等）导致的跳转失败
      const encodeAvatar = encodeURIComponent(friendavatar || '');
      const encodeName = encodeURIComponent(friendname || '未知老师');

      // 4. 构造跳转URL（请确认chat页面实际路径，此处为/pages/chat/chat）
      const targetUrl = `/pages/chat/chat?friendOpenid=${targetOpenid}&friendAvatar=${encodeAvatar}&friendName=${encodeName}`;
      console.log("跳转目标URL：", targetUrl);

      // 5. 跳转页面并添加失败回调，方便排查问题
      wx.navigateTo({
        url: targetUrl,
        fail: (err) => {
          console.error("跳转chat页面失败：", err);
          wx.showToast({ title: '页面跳转失败', icon: 'none' });
        }
      });
    } catch (e) {
      console.error("跳转异常：", e);
      wx.showToast({ title: '系统异常，无法跳转', icon: 'none' });
    }
  }
});