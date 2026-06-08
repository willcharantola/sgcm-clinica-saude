import { SetMetadata } from '@nestjs/common';

// Marca um endpoint como público — o JwtAuthGuard vai ignorá-lo
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);