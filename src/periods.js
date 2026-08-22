export const PERIODS = [
  { id: 'qinhan', zh: '秦汉', en: 'Qin & Han', center: [108.94, 34.34], zoom: 3.8 },
  { id: 'sanguo', zh: '三国两晋南北朝', en: 'Three Kingdoms–North & South', center: [111.0, 32.5], zoom: 4.0 },
  { id: 'suitang', zh: '隋唐', en: 'Sui & Tang', center: [108.94, 34.34], zoom: 3.8 },
  { id: 'songliaojin', zh: '宋辽金', en: 'Song·Liao·Jin', center: [114.0, 37.0], zoom: 4.0 },
  { id: 'yuanmingqing', zh: '元明清', en: 'Yuan·Ming·Qing', center: [116.41, 39.9], zoom: 3.6 }
];

const BORDER_IDS_BY_PERIOD = {
  qinhan: ['han'],
  sanguo: ['wei', 'shu', 'wu'],
  suitang: ['tang'],
  songliaojin: ['north-song', 'liao', 'xixia', 'dali'],
  yuanmingqing: ['qing']
};

export const ALL_BORDER_IDS = ['han', 'wei', 'shu', 'wu', 'tang', 'north-song', 'liao', 'xixia', 'dali', 'qing'];

export function borderIdsByPeriod(periodId) {
  return BORDER_IDS_BY_PERIOD[periodId] || [];
}

export function periodById(id) {
  return PERIODS.find((p) => p.id === id);
}
