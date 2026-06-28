// pages/poi-search/poi-search.js
const db = wx.cloud.database();
const categoryCollection = db.collection('poi_categories'); // 分类集合
const poiCollection = db.collection('poi_locations'); // POI位置集合

Page({
  data: {
    searchValue: '', // 搜索输入值
    activeCategory: '', // 选中的分类ID
    categoryList: [], // 分类列表（带临时图片链接）
    poiList: [], // POI结果列表（带临时图片链接）
    loading: false // 加载状态
  },

  onLoad(options) {
    if (!wx.cloud) {
      wx.showToast({ title: '请升级微信版本', icon: 'none' });
      return;
    }
    this.getCategoryList();
  },

  /**
   * 获取分类列表 + 云存储图片临时链接
   */
  getCategoryList() {
    this.setData({ loading: true });
    categoryCollection.get({
      success: (res) => {
        const categoryList = res.data;
        // 1. 收集分类的云存储图片ID（过滤空值）
        const fileIDs = categoryList
          .filter(item => item.image)
          .map(item => item.image);

        // 2. 调用云API获取临时图片链接
        if (fileIDs.length > 0) {
          wx.cloud.getTempFileURL({
            fileList: fileIDs,
            success: (urlRes) => {
              // 映射：云存储ID → 临时链接
              const urlMap = {};
              urlRes.fileList.forEach(item => {
                urlMap[item.fileID] = item.tempFileURL;
              });
              // 3. 更新分类列表的图片为临时链接（无图则用默认图）
              const updatedCategoryList = categoryList.map(item => ({
                ...item,
                image: item.image ? urlMap[item.image] || '/images/default-category.png' : '/images/default-category.png'
              }));
              this.setData({
                categoryList: updatedCategoryList,
                loading: false
              });
            },
            fail: (err) => {
              console.error('分类图片链接获取失败：', err);
              // 失败时全部用默认图
              const updatedCategoryList = categoryList.map(item => ({
                ...item,
                image: '/images/default-category.png'
              }));
              this.setData({
                categoryList: updatedCategoryList,
                loading: false
              });
            }
          });
        } else {
          // 无图片时全部用默认图
          const updatedCategoryList = categoryList.map(item => ({
            ...item,
            image: '/images/default-category.png'
          }));
          this.setData({
            categoryList: updatedCategoryList,
            loading: false
          });
        }
      },
      fail: (err) => {
        console.error('获取分类列表失败：', err);
        wx.showToast({ title: '获取分类失败', icon: 'none' });
        this.setData({ loading: false });
      }
    });
  },

  onSearchInput(e) {
    this.setData({ searchValue: e.detail.value.trim() });
  },

  clearSearch() {
    this.setData({ searchValue: '' });
  },

  selectCategory(e) {
    const categoryId = e.currentTarget.dataset.id;
    this.setData({ activeCategory: categoryId }, () => {
      this.onSearch();
    });
  },

  onSearchConfirm() {
    this.onSearch();
  },

  /**
   * 搜索POI + 云存储图片临时链接
   */
  onSearch() {
    const { searchValue, activeCategory } = this.data;
    this.setData({ loading: true });

    // 构建查询条件
    let query = poiCollection;
    if (activeCategory) query = query.where({ category: activeCategory });
    if (searchValue) {
      const regex = db.RegExp({ regexp: searchValue, options: 'i' });
      const whereCondition = activeCategory
        ? { category: activeCategory, $or: [{ name: regex }, { address: regex }] }
        : { $or: [{ name: regex }, { address: regex }] };
      query = query.where(whereCondition);
    }

    query.get({
      success: (res) => {
        const poiList = res.data;
        // 1. 收集POI的云存储图片ID
        const fileIDs = poiList
          .filter(item => item.image)
          .map(item => item.image);

        // 2. 获取POI图片临时链接
        if (fileIDs.length > 0) {
          wx.cloud.getTempFileURL({
            fileList: fileIDs,
            success: (urlRes) => {
              const urlMap = {};
              urlRes.fileList.forEach(item => {
                urlMap[item.fileID] = item.tempFileURL;
              });
              // 3. 更新POI列表的图片链接
              const updatedPoiList = poiList.map(item => ({
                ...item,
                image: item.image ? urlMap[item.image] || '/images/default-poi.png' : '/images/default-poi.png'
              }));
              this.setData({
                poiList: updatedPoiList,
                loading: false
              });
            },
            fail: (err) => {
              console.error('POI图片链接获取失败：', err);
              const updatedPoiList = poiList.map(item => ({
                ...item,
                image: '/images/default-poi.png'
              }));
              this.setData({
                poiList: updatedPoiList,
                loading: false
              });
            }
          });
        } else {
          const updatedPoiList = poiList.map(item => ({
            ...item,
            image: '/images/default-poi.png'
          }));
          this.setData({
            poiList: updatedPoiList,
            loading: false
          });
        }
      },
      fail: (err) => {
        console.error('搜索POI失败：', err);
        wx.showToast({ title: '搜索失败，请重试', icon: 'none' });
        this.setData({ poiList: [], loading: false });
      }
    });
  },

  selectPoi(e) {
    const poi = e.currentTarget.dataset.poi;
    wx.showToast({ title: `已选择：${poi.name}`, icon: 'success' });
  },

  clearAll() {
    this.setData({ searchValue: '', activeCategory: '', poiList: [] });
  },

  /**
   * 图片加载失败时替换为默认图
   */
  onImageError(e) {
    const { index, type } = e.currentTarget.dataset;
    if (type === 'category') {
      const newCategoryList = [...this.data.categoryList];
      newCategoryList[index].image = '/images/default-category.png';
      this.setData({ categoryList: newCategoryList });
    } else if (type === 'poi') {
      const newPoiList = [...this.data.poiList];
      newPoiList[index].image = '/images/default-poi.png';
      this.setData({ poiList: newPoiList });
    }
  },

  onPullDownRefresh() {
    this.setData({ searchValue: '', activeCategory: '', poiList: [] });
    this.getCategoryList();
    wx.stopPullDownRefresh();
  }
});