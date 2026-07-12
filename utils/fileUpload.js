const STORAGE_TO_BASE = 'https://storage.to/api';

/**
 * Initialize a file upload to storage.to
 * Returns upload URL and metadata
 */
function initUpload({ filename, contentType, size, visitorToken }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${STORAGE_TO_BASE}/upload/init`,
      method: 'POST',
      header: { 'Content-Type': 'application/json', 'X-Visitor-Token': visitorToken },
      data: { filename, content_type: contentType, size },
      success(res) {
        if (res.data && res.data.success) {
          resolve(res.data);
        } else {
          reject(new Error(res.data.error || '初始化上传失败'));
        }
      },
      fail: reject
    });
  });
}

/**
 * Upload file bytes via backend proxy to R2 pre-signed URL
 */
function uploadToR2(uploadUrl, filePath) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('authToken');
    wx.uploadFile({
      url: `https://api.yzjtiantian.cn/upload/proxy`,
      filePath,
      name: 'file',
      header: { 'Authorization': `Bearer ${token}` },
      formData: { uploadUrl },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res);
        } else {
          reject(new Error(`上传失败 (${res.statusCode})`));
        }
      },
      fail: reject
    });
  });
}

/**
 * Confirm upload completion, get shareable URL
 */
function confirmUpload({ filename, size, contentType, r2Key, visitorToken }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${STORAGE_TO_BASE}/upload/confirm`,
      method: 'POST',
      header: { 'Content-Type': 'application/json', 'X-Visitor-Token': visitorToken },
      data: { filename, size, content_type: contentType, r2_key: r2Key },
      success(res) {
        if (res.data && res.data.success) {
          resolve(res.data);
        } else {
          reject(new Error(res.data.error || '确认上传失败'));
        }
      },
      fail: reject
    });
  });
}

/**
 * Delete a file from storage.to (cancel/orphan cleanup)
 */
function deleteFile({ fileId, ownerToken }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${STORAGE_TO_BASE}/file/${fileId}`,
      method: 'DELETE',
      header: { 'Authorization': `Owner ${ownerToken}` },
      success(res) {
        if (res.statusCode === 200) resolve(res.data);
        else reject(new Error(res.data.error || '删除文件失败'));
      },
      fail: reject
    });
  });
}

module.exports = { initUpload, uploadToR2, confirmUpload, deleteFile };
