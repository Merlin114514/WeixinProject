// miniprogram/utils/util.js
/**
 * 计算当前周（根据开学日期）
 * @param {string} startDate - 开学日期（格式：YYYY/MM/DD）
 * @param {number} totalWeek - 总周数
 * @returns {number} 当前周数
 */
export function getNowWeek(startDate, totalWeek) {
    try {
      const start = new Date(startDate);
      const now = new Date();
      // 计算时间差（毫秒）
      const timeDiff = now - start;
      // 转换为天数
      const dayDiff = Math.floor(timeDiff / (24 * 60 * 60 * 1000));
      // 计算当前周（向上取整）
      let currentWeek = Math.ceil(dayDiff / 7) + 1;
      // 边界处理
      if (currentWeek < 1) currentWeek = 1;
      if (currentWeek > totalWeek) currentWeek = totalWeek;
      return currentWeek;
    } catch (err) {
      console.error('计算当前周失败', err);
      return 1;
    }
  }
  
  // 可选：导出其他工具函数
  export function formatDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}/${month}/${day}`;
  }