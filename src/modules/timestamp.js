export function toDate(timestamp) {
    if (!timestamp) return "";
    let ts = Number(timestamp);
    // Detect seconds vs milliseconds
    if (timestamp.toString().length === 10) {
        ts *= 1000;
    }
    const date = new Date(ts);
    if (isNaN(date.getTime())) return "Invalid Timestamp";
    return date.toLocaleString();
}

export function toTimestamp(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Invalid Date String";
    return Math.floor(date.getTime() / 1000).toString();
}

export function toTimestampMs(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Invalid Date String";
    return date.getTime().toString();
}
