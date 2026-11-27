const TIME_ZONE = "Asia/Manila";

export const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const mediumDate = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: TIME_ZONE });
const fullDate = new Intl.DateTimeFormat("en-PH", { dateStyle: "full", timeZone: TIME_ZONE });
const shortDate = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: TIME_ZONE });
const timeOfDay = new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit", timeZone: TIME_ZONE });
const mediumDateTime = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: TIME_ZONE,
});
const longDateTime = new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeStyle: "short", timeZone: TIME_ZONE });

const dateAtNoon = (value: string) => new Date(`${value}T12:00:00+08:00`);

export const formatDate = (value: string) => mediumDate.format(dateAtNoon(value));
export const formatFullDate = (value: string) => fullDate.format(dateAtNoon(value));
export const formatShortDate = (value: string) => shortDate.format(dateAtNoon(value));
export const formatTime = (value: string) => timeOfDay.format(new Date(value));
export const formatDateTime = (value: string) => mediumDateTime.format(new Date(value));
export const formatLongDateTime = (value: string) => longDateTime.format(new Date(value));
export const formatTodayFull = () => fullDate.format(new Date());
