const dateTimeFormatter = new Intl.DateTimeFormat("en-BD", {
  month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Dhaka"
});

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

export function formatTime(value: string): string {
  const date = new Date(value);
  return date.toLocaleTimeString("en-BD", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
}

export function titleCase(value: string): string {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
