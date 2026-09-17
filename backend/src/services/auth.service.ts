import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { signToken } from '../utils/jwt';

export const authService = {
  async register(data: { email: string; password: string; name: string; role: string; grade?: string }) {
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw Object.assign(new Error('Email already registered'), { status: 409 });

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { ...data, passwordHash, role: data.role as any },
    });
    const token = signToken({ id: user.id, role: user.role });
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, token };
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

    const token = signToken({ id: user.id, role: user.role });
    return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, token };
  },
};