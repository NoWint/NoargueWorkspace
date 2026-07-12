const formatDate = (date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime = (timeValue) => {
  if (!timeValue) return '12:00';
  if (typeof timeValue === 'string' && timeValue.length <= 5) {
    const parts = timeValue.split(':');
    if (parts.length === 2) {
      const hours = parts[0].padStart(2, '0');
      const minutes = parts[1].padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  }
  const timeMatch = String(timeValue).match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const hours = timeMatch[1].padStart(2, '0');
    const minutes = timeMatch[2].padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  return '12:00';
};

const formatFriendlyDate = (dateStr) => {
  if (!dateStr) return '';
  const today = new Date();
  const target = new Date(dateStr);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  
  if (dateStr === todayStr) return '今天';
  if (dateStr === yesterdayStr) return '昨天';
  if (dateStr === tomorrowStr) return '明天';
  
  const month = target.getMonth() + 1;
  const day = target.getDate();
  return `${month}月${day}日`;
};

const formatDateTime = (dateValue) => {
  if (!dateValue) return '';
  
  let date;
  if (typeof dateValue === 'string') {
    date = new Date(dateValue);
  } else if (typeof dateValue === 'number') {
    date = new Date(dateValue);
  } else {
    return '';
  }
  
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

module.exports = {
  formatDate,
  formatTime,
  formatFriendlyDate,
  formatDateTime
};
