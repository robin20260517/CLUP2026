export const DISPLAY_TIME_ZONE = 'Asia/Yerevan';

const TEAM_LABELS = {
  Algeria: '阿尔及利亚',
  Argentina: '阿根廷',
  Australia: '澳大利亚',
  Austria: '奥地利',
  Belgium: '比利时',
  'Bosnia-Herzegovina': '波斯尼亚和黑塞哥维那',
  Brazil: '巴西',
  Canada: '加拿大',
  'Cape Verde': '佛得角',
  Colombia: '哥伦比亚',
  'Congo DR': '刚果民主共和国',
  Croatia: '克罗地亚',
  Curaçao: '库拉索',
  Czechia: '捷克',
  Ecuador: '厄瓜多尔',
  Egypt: '埃及',
  England: '英格兰',
  France: '法国',
  Germany: '德国',
  Ghana: '加纳',
  Haiti: '海地',
  Iran: '伊朗',
  Iraq: '伊拉克',
  'Ivory Coast': '科特迪瓦',
  Japan: '日本',
  Jordan: '约旦',
  Mexico: '墨西哥',
  Morocco: '摩洛哥',
  Netherlands: '荷兰',
  'New Zealand': '新西兰',
  Norway: '挪威',
  Panama: '巴拿马',
  Paraguay: '巴拉圭',
  Portugal: '葡萄牙',
  Qatar: '卡塔尔',
  'Saudi Arabia': '沙特阿拉伯',
  Scotland: '苏格兰',
  Senegal: '塞内加尔',
  'South Africa': '南非',
  'South Korea': '韩国',
  Spain: '西班牙',
  Sweden: '瑞典',
  Switzerland: '瑞士',
  Tunisia: '突尼斯',
  Türkiye: '土耳其',
  'United States': '美国',
  USA: '美国',
  Uruguay: '乌拉圭',
  Uzbekistan: '乌兹别克斯坦',
};

const ROUND_LABELS = {
  'Group Stage - 1': '小组赛第1轮',
  'Group Stage - 2': '小组赛第2轮',
  'Group Stage - 3': '小组赛第3轮',
  'Round of 32': '32强赛',
  'Round of 16': '16强赛',
  'Quarter-finals': '四分之一决赛',
  'Semi-finals': '半决赛',
  '3rd Place Final': '季军赛',
  Final: '决赛',
};

const MODEL_LABELS = {
  'Freeze Model': '冻结模型',
  'Tug-of-War Model': '拉锯模型',
  'Broken Game Model': '破局模型',
  'Expectation Trap Model': '期望陷阱模型',
};

const STATUS_LABELS = {
  NS: '未开赛',
  '1H': '上半场',
  HT: '中场',
  '2H': '下半场',
  ET: '加时赛',
  BT: '加时休息',
  P: '点球大战',
  LIVE: '进行中',
  FT: '完赛',
  AET: '加时完赛',
  PEN: '点球完赛',
  PST: '延期',
  SUSP: '中断',
};

const RISK_LABELS = { LOW: '低风险', MEDIUM: '中风险', HIGH: '高风险' };
const TREND_LABELS = { STABLE: '稳定', WATCH: '关注', ALERT: '警报' };

function formatParts(dateValue, options) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return Object.fromEntries(
    new Intl.DateTimeFormat('zh-CN', {
      timeZone: DISPLAY_TIME_ZONE,
      hour12: false,
      ...options,
    })
      .formatToParts(date)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value]),
  );
}

export function formatMatchDateTime(dateValue) {
  const parts = formatParts(dateValue, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return parts ? `${parts.month}月${parts.day}日 ${parts.hour}:${parts.minute}` : '--';
}

export function formatMatchDate(dateValue) {
  const parts = formatParts(dateValue, { month: 'numeric', day: 'numeric' });
  return parts ? `${parts.month}月${parts.day}日` : '--';
}

export function formatMatchTime(dateValue) {
  const parts = formatParts(dateValue, { hour: '2-digit', minute: '2-digit' });
  return parts ? `${parts.hour}:${parts.minute}` : '--:--';
}

export function yerevanDateKey(dateValue = Date.now()) {
  const parts = formatParts(dateValue, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : '';
}

export function isTodayInYerevan(dateValue) {
  return yerevanDateKey(dateValue) === yerevanDateKey();
}

export function translateTeam(name) {
  if (!name) return '待定';
  if (TEAM_LABELS[name]) return TEAM_LABELS[name];

  let match = name.match(/^Group ([A-L]) Winner$/);
  if (match) return `${match[1]}组第一名`;
  match = name.match(/^Group ([A-L]) 2nd Place$/);
  if (match) return `${match[1]}组第二名`;
  match = name.match(/^Third Place Group (.+)$/);
  if (match) return `${match[1]}组第三名`;
  match = name.match(/^Round of 32 (\d+) Winner$/);
  if (match) return `32强赛第${match[1]}场胜者`;
  match = name.match(/^Round of 16 (\d+) Winner$/);
  if (match) return `16强赛第${match[1]}场胜者`;
  match = name.match(/^Quarterfinal (\d+) Winner$/);
  if (match) return `四分之一决赛第${match[1]}场胜者`;
  match = name.match(/^Semifinal (\d+) (Winner|Loser)$/);
  if (match) return `半决赛第${match[1]}场${match[2] === 'Winner' ? '胜者' : '负者'}`;

  return name;
}

export function translateRound(round) {
  const groupMatch = round?.match(/^Group ([A-L])$/);
  if (groupMatch) return `${groupMatch[1]}组`;
  return ROUND_LABELS[round] || round || '未知阶段';
}

export function translateModel(model) {
  return MODEL_LABELS[model] || model || '--';
}

export function translateStatus(status) {
  return STATUS_LABELS[status] || status || '--';
}

export function translateRisk(risk) {
  return RISK_LABELS[risk] || risk || '--';
}

export function translateTrend(trend) {
  return TREND_LABELS[trend] || trend || '--';
}

export function translateCompetition(name) {
  if (!name) return '';
  const labels = {
    'FIFA World Cup': 'FIFA 世界杯',
    'International Friendly': '国际友谊赛',
    'CONCACAF Gold Cup': '中北美及加勒比海金杯赛',
    'Copa América': '美洲杯',
    'UEFA European Championship': '欧洲杯',
    'UEFA Nations League': '欧洲国家联赛',
  };
  if (labels[name]) return labels[name];
  if (name.startsWith('FIFA World Cup Qualifying')) {
    return name
      .replace('FIFA World Cup Qualifying', '世界杯预选赛')
      .replace('CONMEBOL', '南美区')
      .replace('CONCACAF', '中北美及加勒比海区')
      .replace('UEFA', '欧洲区')
      .replace('AFC', '亚洲区')
      .replace('CAF', '非洲区')
      .replace('OFC', '大洋洲区');
  }
  return name;
}
