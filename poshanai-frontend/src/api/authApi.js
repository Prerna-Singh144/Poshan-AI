import client, { payloadFrom, setAccessToken } from './client.js';

function readSession(response) {
  const payload = payloadFrom(response);
  const token = payload?.accessToken ?? payload?.access_token ?? payload?.token ?? null;
  return { accessToken: token, user: payload?.user ?? null };
}

export async function login(credentials) {
  const payload = payloadFrom(await client.post('/auth/login', credentials));
  if (payload?.requiresTwoFactor) {
    return {
      requiresTwoFactor: true,
      tempToken: payload.tempToken,
      expiresIn: payload.expiresIn ?? 300,
    };
  }
  return readSession({ data: payload });
}

export async function requestOTP(email, purpose) {
  return payloadFrom(await client.post('/auth/otp/request', { email, purpose }));
}

export async function verifyOTP(email, otp, purpose) {
  return payloadFrom(await client.post('/auth/otp/verify', { email, otp, purpose }));
}

export async function resetPassword(resetToken, password) {
  return payloadFrom(await client.post('/auth/otp/reset-password', { resetToken, password }));
}

export async function verifyTwoFactor(tempToken, code) {
  return readSession(await client.post('/auth/2fa/verify-login', { tempToken, code }));
}

export async function setupTwoFactor() {
  return payloadFrom(await client.post('/auth/2fa/setup', {}));
}

export async function verifyTwoFactorSetup(secret, code) {
  return payloadFrom(await client.post('/auth/2fa/verify-setup', { secret, code }));
}

export async function disableTwoFactor(password, code) {
  return payloadFrom(await client.post('/auth/2fa/disable', { password, code }));
}

export async function register(details) {
  return readSession(await client.post('/auth/register', details));
}

export async function logout() {
  try {
    await client.post('/auth/logout');
  } finally {
    setAccessToken(null);
  }
}

const authApi = {
  login,
  register,
  logout,
  requestOTP,
  verifyOTP,
  resetPassword,
  verifyTwoFactor,
  setupTwoFactor,
  verifyTwoFactorSetup,
  disableTwoFactor,
};
export default authApi;
