import * as bcrypt from 'bcryptjs';

describe('AuthService Password & Hash Verification (Phase 1 Security)', () => {
  it('should securely hash password with salt and verify match', async () => {
    const rawPassword = 'SecurePassword123!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);

    expect(hash).not.toEqual(rawPassword);
    expect(hash.startsWith('$2')).toBe(true); // bcrypt prefix

    const isMatch = await bcrypt.compare(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await bcrypt.compare('WrongPassword', hash);
    expect(isWrongMatch).toBe(false);
  });
});
