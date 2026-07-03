export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  token: string;
  tipo: string;
  expiraEnMs: number;
}
