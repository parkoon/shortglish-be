import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Shortglish Backend API',
      version: '1.0.0',
      description: 'Shortglish Backend API Documentation',
    },
    servers: [
      {
        url: 'https://shortglish-be-production.up.railway.app',
        description: 'Production server',
      },
      {
        url: 'http://localhost:4000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '토스 AccessToken을 입력하세요',
        },
        basicAuth: {
          type: 'http',
          scheme: 'basic',
          description: 'Basic Authentication (콜백 엔드포인트용)',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: '사용자 UUID',
            },
            authProvider: {
              type: 'string',
              example: 'TOSS',
            },
            externalUserId: {
              type: 'string',
              description: '토스 userKey (문자열)',
              example: '518165018',
            },
            name: {
              type: 'string',
              nullable: true,
            },
            phone: {
              type: 'string',
              nullable: true,
            },
            birthday: {
              type: 'string',
              nullable: true,
              description: 'yyyyMMdd 형식',
            },
            ci: {
              type: 'string',
              nullable: true,
            },
            gender: {
              type: 'string',
              enum: ['MALE', 'FEMALE'],
              nullable: true,
            },
            nationality: {
              type: 'string',
              enum: ['LOCAL', 'FOREIGNER'],
              nullable: true,
            },
            email: {
              type: 'string',
              nullable: true,
            },
            nickname: {
              type: 'string',
              nullable: true,
            },
            agreedTerms: {
              type: 'array',
              items: {
                type: 'string',
              },
              nullable: true,
            },
            marketingConsent: {
              type: 'boolean',
              default: false,
            },
            notificationEnabled: {
              type: 'boolean',
              default: true,
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            deletedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        ApiSuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
            },
            message: {
              type: 'string',
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                },
              },
            },
          },
        },
        ApiErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
            },
            message: {
              type: 'string',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Auth',
        description: '토스 인증 관련 API',
      },
      {
        name: 'User',
        description: '사용자 관리 API (Supabase)',
      },
      {
        name: 'Toss User',
        description: '토스 사용자 정보 API',
      },
      {
        name: 'Toss Push',
        description: '토스 푸시 메시지 API',
      },
    ],
  },
  apis: [
    './src/routes/**/*.ts',
    './src/controllers/**/*.ts',
    './src/index.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

