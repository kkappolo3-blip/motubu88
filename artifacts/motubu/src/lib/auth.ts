const ADMIN_CODE = "88040773";
const AUTH_KEY = "motubu_auth";

export function login(code: string): boolean {
  if (code === ADMIN_CODE) {
    localStorage.setItem(AUTH_KEY, "admin");
    return true;
  }
  return false;
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
}

export function isAuthenticated(): boolean {
  return localStorage.getItem(AUTH_KEY) === "admin";
}

export function getUser(): string | null {
  return localStorage.getItem(AUTH_KEY);
}
