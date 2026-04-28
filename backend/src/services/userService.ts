import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { env } from '../config/env';
import { User } from '../entities/User';
import { UserRole, CreateUserRequest, LoginRequest, JwtPayload } from '../types';

export class UserService {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  async register(createUserRequest: CreateUserRequest): Promise<{ user: User; token: string }> {
    const { email, password, name, role } = createUserRequest;

    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
      role: role || UserRole.USER
    });

    await this.userRepository.save(user);

    const token = this.generateToken(user.id, user.role);

    return { user, token };
  }

  async login(loginRequest: LoginRequest): Promise<{ user: User; token: string }> {
    const { email, password } = loginRequest;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    const token = this.generateToken(user.id, user.role);

    return { user, token };
  }

  async getById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  private generateToken(userId: string, role: UserRole): string {
    const payload: JwtPayload = { userId, role };
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as string
    });
  }
}
