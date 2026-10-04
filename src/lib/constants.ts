export const CATEGORIES = {
  ANIME: "アニメ",
  DOMESTIC_DRAMA: "国内ドラマ",
  FOREIGN_DRAMA: "海外ドラマ",
} as const;
export const STATUSES = {
  PLANNED: "放送予定",
  AIRING: "放送中",
  FINISHED: "終了",
  DELAYED: "延期",
  UNKNOWN: "未定",
} as const;
export const WATCH_STATUSES = {
  INTERESTED: "気になる",
  PLANNED: "視聴予定",
  WATCHING: "視聴中",
  COMPLETED: "視聴済み",
  DROPPED: "視聴中断",
} as const;
export const OFFER_TYPES = {
  SUBSCRIPTION: "見放題",
  RENT: "レンタル",
  BUY: "購入",
  FREE: "無料",
  ADS: "広告付き無料",
  UNKNOWN: "区分未確認",
} as const;
export const SEASONS = {
  WINTER: "冬（1〜3月）",
  SPRING: "春（4〜6月）",
  SUMMER: "夏（7〜9月）",
  FALL: "秋（10〜12月）",
} as const;
export const GENRES = [
  ["action", "アクション"],
  ["battle", "バトル"],
  ["fantasy", "ファンタジー"],
  ["isekai", "異世界"],
  ["sf", "SF"],
  ["adventure", "冒険"],
  ["romance", "恋愛"],
  ["romcom", "ラブコメ"],
  ["comedy", "コメディ"],
  ["mystery", "ミステリー"],
  ["suspense", "サスペンス"],
  ["horror", "ホラー"],
  ["slice-of-life", "日常"],
  ["school", "学園"],
  ["youth", "青春"],
  ["sports", "スポーツ"],
  ["music", "音楽"],
  ["idol", "アイドル"],
  ["history", "歴史"],
  ["medical", "医療"],
  ["police", "刑事"],
  ["social", "社会派"],
  ["human", "ヒューマンドラマ"],
  ["other", "その他"],
] as const;
export const PLATFORMS = [
  ["netflix", "Netflix"],
  ["prime", "Amazon Prime Video"],
  ["disney", "Disney+"],
  ["unext", "U-NEXT"],
  ["hulu", "Hulu"],
  ["danime", "dアニメストア"],
  ["dmm", "DMM TV"],
  ["abema", "ABEMA"],
  ["tver", "TVer"],
  ["fod", "FOD"],
  ["lemino", "Lemino"],
  ["apple", "Apple TV"],
  ["other", "その他"],
] as const;
export const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
