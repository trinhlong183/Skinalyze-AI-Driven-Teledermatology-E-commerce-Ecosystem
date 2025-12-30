import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    this.logger.debug(`🔐 Required roles: ${JSON.stringify(requiredRoles)}`);
    this.logger.debug(`🔐 User object: ${JSON.stringify(user)}`);
    this.logger.debug(`🔐 User role: ${user?.role} (type: ${typeof user?.role})`);
    
    if (!user || !user.role) {
      this.logger.warn(`❌ Access denied: User or role is missing`);
      return false;
    }
    
    const hasRole = requiredRoles.some((role) => user.role === role);
    this.logger.debug(`🔐 Has required role: ${hasRole}`);
    
    return hasRole;
  }
}
