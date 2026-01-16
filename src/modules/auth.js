export function generateBasicAuth(username, password) {
    const credentials = `${username}:${password}`;
    return `Basic ${btoa(credentials)}`;
}
