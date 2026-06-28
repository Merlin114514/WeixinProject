const db = wx.cloud.database();
const _ = db.command;
const app = getApp();

Page({
  data: {
    chatList: [],
    teacherOpenid: '',
    teacherInfo: {},
    isLoading: false
  },

  onLoad() {
    // 强化校验：确保 teacherInfo 及关键字段有效
    let teacherInfo = wx.getStorageSync('userInfo');
    teacherInfo = teacherInfo || {};
    const isTeacherValid = teacherInfo.role === 'teacher' && 
                          teacherInfo._openid && 
                          teacherInfo._id && 
                          typeof teacherInfo._id === 'string';
    if (!isTeacherValid) {
      wx.showToast({ title: '用户信息异常，请重新登录', icon: 'none' });
      setTimeout(() => wx.reLaunch({ url: '/pages/login/login' }), 1500);
      return;
    }
    this.setData({
      teacherInfo,
      teacherOpenid: teacherInfo._openid // 老师的用户标识是_openid
    });
  },

  onShow() {
    this.getChatList();
  },

  async getChatList() {
    if (this.data.isLoading) return;
    this.setData({ isLoading: true });
    wx.showLoading({ title: '加载聊天列表...' });

    const { teacherOpenid, teacherInfo } = this.data;
    try {
      // 处理老师的docId（确保有效）
      let teacherDocId = '';
      if (typeof teacherInfo._id === 'string') {
        teacherDocId = teacherInfo._id.trim();
      }
      if (!teacherDocId) {
        wx.showToast({ title: '老师用户ID无效', icon: 'none' });
        this.setData({ chatList: [], isLoading: false });
        wx.hideLoading();
        return;
      }

      // 获取老师的好友列表（匹配数据库中老师的friends数组）
      const userRes = await db.collection('user').doc(teacherDocId).get();
      const teacherUserData = userRes.data || {};
      let friendOpenids = teacherUserData.friends || [];
      // 强制转为数组（兼容数据库格式）
      if (!Array.isArray(friendOpenids)) {
        friendOpenids = friendOpenids && typeof friendOpenids === 'string' ? [friendOpenids.trim()] : [];
      }
      console.log('老师的学生好友_openid列表：', friendOpenids);

      if (friendOpenids.length === 0) {
        this.setData({ chatList: [], isLoading: false });
        wx.hideLoading();
        return;
      }

      // 批量查询学生信息（匹配学生文档的_openid字段）
      const friendPromises = friendOpenids.map(async (studentOpenid) => {
        if (!studentOpenid || typeof studentOpenid !== 'string') return null;
        const studentOpenidTrim = studentOpenid.trim();
        if (!studentOpenidTrim) return null;

        // 关键：查询学生的_openid字段（与数据库匹配）
        const friendRes = await db.collection('user').where({
          _openid: studentOpenidTrim
        }).get();
        console.log(`查询学生_openid【${studentOpenidTrim}】的结果：`, friendRes.data);
        
        if (friendRes.data.length === 0) {
          console.error(`未找到该_openid的学生文档：${studentOpenidTrim}`);
          return null;
        }

        const friendData = friendRes.data[0];
        const friendInfo = {
          friendOpenid: studentOpenidTrim,
          friendName: friendData.username || '未知学生',
          friendAvatar: friendData.avatarUrl || '/images/default-avatar.png'
        };

        // 获取最新消息
        const msgRes = await db.collection('message').where({
          fromOpenid: _.in([teacherOpenid, studentOpenidTrim]),
          toOpenid: _.in([teacherOpenid, studentOpenidTrim])
        }).orderBy('createTime', 'desc').limit(1).get();

        // 获取未读消息数
        const unreadRes = await db.collection('message').where({
          fromOpenid: studentOpenidTrim,
          toOpenid: teacherOpenid,
          isRead: false
        }).count();

        let lastMsgContent = '暂无消息';
        let lastMsgTime = '暂无时间';
        if (msgRes.data.length > 0) {
          const lastMsg = msgRes.data[0];
          lastMsgTime = this.formatMsgTime(lastMsg.createTime);
          lastMsgContent = lastMsg.msgType === 'image' ? '[图片消息]' : (lastMsg.content || '[无内容]');
        }

        return {
          ...friendInfo,
          lastMsgContent,
          lastMsgTime,
          unreadCount: unreadRes.total
        };
      });

      const friendResults = await Promise.all(friendPromises);
      const validChatList = friendResults.filter(item => item !== null);
      this.setData({ chatList: validChatList });

    } catch (err) {
      wx.showToast({ title: '加载聊天列表失败', icon: 'none' });
      console.error('加载失败详情：', err);
    } finally {
      wx.hideLoading();
      this.setData({ isLoading: false });
    }
  },

  formatMsgTime(timeData) {
    if (!timeData) return '未知时间';
    let date = null;
    if (timeData.toDate) date = timeData.toDate();
    else if (typeof timeData === 'number') date = new Date(timeData);
    else if (typeof timeData === 'string') date = new Date(timeData);
    else return '未知时间';

    if (isNaN(date.getTime())) return '未知时间';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return msgDay.getTime() === today.getTime() 
      ? `今天 ${hours}:${minutes}` 
      : `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${hours}:${minutes}`;
  },

  gotoChat(e) {
    const { friendopenid, friendavatar, friendname } = e.currentTarget.dataset || {};
    const friendOpenid = (friendopenid || '').trim();
    const encodeAvatar = encodeURIComponent(friendavatar || '/images/default-avatar.png');
    const encodeName = encodeURIComponent(friendname || '未知学生');

    if (!friendOpenid) {
      wx.showToast({ title: '好友信息无效', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: `/pages/chat/chat?friendOpenid=${friendOpenid}&friendAvatar=${encodeAvatar}&friendName=${encodeName}`
    });
  }
});