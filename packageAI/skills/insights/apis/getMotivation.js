const quotes = [
  '今天的努力是明天的基石。',
  '不要等待机会，而要创造机会。',
  '坚持就是胜利。',
  '行动是治愈恐惧的良药。',
  '千里之行，始于足下。',
  '每一个不曾起舞的日子，都是对生命的辜负。',
  '人生没有白走的路，每一步都算数。'
]
async function getMotivation() {
  const quote = quotes[Math.floor(Math.random() * quotes.length)]
  return {
    isError: false,
    content: [{ type: 'text', text: `💪 ${quote}` }],
    structuredContent: { quote }
  }
}
module.exports = getMotivation
