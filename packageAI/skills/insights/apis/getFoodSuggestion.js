const foods = {
  breakfast: ['豆浆油条', '小米粥', '煎饼果子', '三明治', '包子馒头', '燕麦牛奶', '鸡蛋灌饼'],
  lunch: ['宫保鸡丁', '红烧肉', '鱼香肉丝', '番茄炒蛋', '麻婆豆腐', '清蒸鲈鱼', '糖醋排骨'],
  dinner: ['火锅', '烧烤', '日料', '面条', '饺子', '粤菜', '川菜'],
  snack: ['烤串', '小龙虾', '麻辣烫', '关东煮', '甜品', '奶茶', '炸鸡']
}
async function getFoodSuggestion({ mealType }) {
  if (mealType && foods[mealType]) {
    const list = foods[mealType]
    const item = list[Math.floor(Math.random() * list.length)]
    return {
      isError: false,
      content: [{ type: 'text', text: `推荐${mealType === 'breakfast' ? '早餐' : mealType === 'lunch' ? '午餐' : mealType === 'dinner' ? '晚餐' : '宵夜'}：${item}` }],
      structuredContent: { mealType, suggestion: item }
    }
  }
  const all = Object.values(foods).flat()
  const item = all[Math.floor(Math.random() * all.length)]
  return {
    isError: false,
    content: [{ type: 'text', text: `推荐：${item}` }],
    structuredContent: { suggestion: item }
  }
}
module.exports = getFoodSuggestion
