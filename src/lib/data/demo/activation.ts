export const DEMO_ACTIVATION_EMAIL = 'pic.demo@deb.test';

export interface DemoActivation {
  email: string;
  password: string | null;
}

export function activateDemoAccount(email: string, password: string): DemoActivation {
  if (email.trim().toLowerCase() !== DEMO_ACTIVATION_EMAIL)
    throw Error('Gunakan email PIC demo yang tercantum pada layar aktivasi.');
  if (password.length < 8) throw Error('Password minimal 8 karakter.');
  return { email: DEMO_ACTIVATION_EMAIL, password };
}

export function canUseDemoPassword(activation: DemoActivation, email: string, password: string) {
  return activation.email === email.trim().toLowerCase() && activation.password === password;
}
