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
  console.log('Buscando setores com o nome "Cozinha"...');
  
  const setores = await prisma.setor.findMany({
    where: {
      nome: {
        contains: 'Cozinha',
        mode: 'insensitive'
      }
    }
  });

  if (setores.length === 0) {
    console.log('Nenhum setor "Cozinha" encontrado.');
    return;
  }

  console.log(`Encontrados ${setores.length} setores:`);
  setores.forEach(s => console.log(`- ${s.nome} (ID: ${s.id})`));

  for (const setor of setores) {
    console.log(`Deletando setor: ${setor.nome}...`);
    await prisma.setor.delete({
      where: { id: setor.id }
    });
  }

  console.log('Operação concluída com sucesso.');
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
