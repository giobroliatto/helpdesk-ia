const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'prisma', 'helpdesk.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

prisma.mensagemChat.deleteMany({})
  .then(r => { console.log('Mensagens deletadas:', r.count); })
  .catch(console.error)
  .finally(() => prisma.$disconnect());
