// src/common/types/user-payload.type.ts

/**
 * Representa o payload contido no token JWT.
 * Contém apenas o mínimo necessário para identificar o usuário
 * e verificar permissões — sem dados sensíveis, pois o payload
 * é codificado em Base64 e pode ser lido por qualquer pessoa
 * que tenha o token.
 */
export interface UserPayload {
  sub: number;    // ID do usuário (padrão JWT para "subject")
  email: string;  // Necessário para identificação em logs e respostas
  type: string;   // Perfil: 'ADMIN' | 'DOCTOR' | 'PATIENT'
}