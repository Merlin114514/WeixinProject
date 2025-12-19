// app.js
App({
    onLaunch() {
      // 初始化云开发环境（替换为你的环境ID）
      if (!wx.cloud) {
        console.error('请使用 2.2.3 或以上版本的基础库以使用云能力');
      } else {
        wx.cloud.init({
          env: 'cloud1-9g5j215id54c25fb', // 你的云环境ID
          traceUser: true, // 跟踪用户行为（可选）
        });
      }
      this.globalData = {};
    }
  });