
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';

// A JwtStrategy será adicionada na branch feature/jwt-strategy
// e registrada aqui via providers depois do merge

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN'),
        },
      }),
    }),
    UsersModule, // dependência unidirecional: Auth → Users (nunca o contrário)
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule], // exporta JwtModule para uso em outros módulos se necessário
})
export class AuthModule {}