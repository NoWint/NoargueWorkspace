const API_BASE = 'https://api.yzjtiantian.cn'

function getToken() {
  return wx.getStorageSync('token') || ''
}

async function request(method, path, data) {
  const token = getToken()
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE}${path}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => resolve(res.data),
      fail: (err) => reject(err)
    })
  })
}

module.exports = { request, getToken, API_BASE }
