export function encode(str) {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    return "Error: " + e.message;
  }
}

export function decode(str) {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch (e) {
    return "Error: " + e.message;
  }
}
