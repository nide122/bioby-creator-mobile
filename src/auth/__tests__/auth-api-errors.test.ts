import { ApiError } from '@/src/api/api-client';
import { resolveAuthApiErrorMessage } from '@/src/auth/auth-api-errors';
import i18n from '@/src/i18n';

describe('resolveAuthApiErrorMessage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('maps known auth error codes to zh translations', () => {
    const message = resolveAuthApiErrorMessage(
      new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'),
      'auth.login.errors.submit',
    );
    expect(message).toBe('邮箱或密码不正确。');
  });

  it('falls back to provided key for unknown errors', () => {
    const message = resolveAuthApiErrorMessage(new Error('network'), 'auth.login.errors.submit');
    expect(message).toBe('登录失败');
  });
});
