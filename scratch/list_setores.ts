import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Listando TODOS os setores no banco...');
  
  const setores = await prisma.setor.findMany({
    orderBy: { nome: 'asc' }
  });

  if (setores.length === 0) {
    console.log('Nenhum setor encontrado no banco.');
    return;
  }

  console.log(`Encontrados ${setores.length} setores:`);
  setores.forEach(s => console.log(`- "${s.nome}" (ID: ${s.id})`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
