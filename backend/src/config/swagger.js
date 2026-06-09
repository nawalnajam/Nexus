const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'Nexus Platform API',
      version:     '1.0.0',
      description: 'Investor & Entrepreneur Collaboration Platform — Full API Documentation',
      contact: {
        name:  'Nexus Team',
        email: 'support@businessnexus.com',
      },
    },
    servers: [
      { url: 'http://localhost:5000/api', description: 'Development' },
      { url: 'https://your-render-app.onrender.com/api', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type:         'http',
          scheme:       'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id:      { type: 'string', example: '507f1f77bcf86cd799439011' },
            name:     { type: 'string', example: 'John Doe' },
            email:    { type: 'string', example: 'john@example.com' },
            role:     { type: 'string', enum: ['entrepreneur', 'investor'] },
            bio:      { type: 'string', example: 'Building the future' },
            avatar:   { type: 'string', example: 'https://ui-avatars.com/api/?name=John' },
            location: { type: 'string', example: 'Lahore, PK' },
          },
        },
        Meeting: {
          type: 'object',
          properties: {
            _id:         { type: 'string' },
            title:       { type: 'string', example: 'Investment Discussion' },
            startTime:   { type: 'string', format: 'date-time' },
            endTime:     { type: 'string', format: 'date-time' },
            status:      { type: 'string', enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'] },
            type:        { type: 'string', enum: ['video', 'audio', 'in-person'] },
            roomId:      { type: 'string' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            _id:      { type: 'string' },
            type:     { type: 'string', enum: ['deposit', 'withdrawal', 'transfer'] },
            amount:   { type: 'number', example: 100 },
            currency: { type: 'string', example: 'usd' },
            status:   { type: 'string', enum: ['pending', 'completed', 'failed'] },
          },
        },
        Document: {
          type: 'object',
          properties: {
            _id:      { type: 'string' },
            title:    { type: 'string' },
            fileUrl:  { type: 'string' },
            fileType: { type: 'string' },
            fileSize: { type: 'number' },
            category: { type: 'string', enum: ['pitch_deck', 'contract', 'financial', 'legal', 'other'] },
            status:   { type: 'string', enum: ['draft', 'pending_review', 'approved', 'rejected'] },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);