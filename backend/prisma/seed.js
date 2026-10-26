import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const whiskies = [
  {
    name: 'Johnnie Walker Black Label',
    brand: 'Johnnie Walker',
    ageYears: 12,
    description: 'Blended Scotch com notas de frutas secas, baunilha e um defumado suave.',
    price: '219.90',
    stock: 25,
  },
  {
    name: 'Glenfiddich 12 Anos',
    brand: 'Glenfiddich',
    ageYears: 12,
    description: 'Single Malt de Speyside, fresco e frutado, com pera e carvalho.',
    price: '289.90',
    stock: 18,
  },
  {
    name: 'Lagavulin 16 Anos',
    brand: 'Lagavulin',
    ageYears: 16,
    description: 'Single Malt de Islay, intensamente turfado, com notas marítimas e de iodo.',
    price: '649.90',
    stock: 8,
  },
  {
    name: 'Jameson',
    brand: 'Jameson',
    ageYears: null,
    description: 'Irish Whiskey tripla destilação, suave e levemente adocicado.',
    price: '129.90',
    stock: 40,
  },
  {
    name: "Maker's Mark",
    brand: "Maker's Mark",
    ageYears: null,
    description: 'Bourbon com trigo vermelho de inverno: caramelo, baunilha e final macio.',
    price: '199.90',
    stock: 20,
  },
];

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Defina ADMIN_EMAIL e ADMIN_PASSWORD no .env antes de rodar o seed.');
  }

  await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN' },
    create: {
      name: process.env.ADMIN_NAME || 'Administrador',
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'ADMIN',
    },
  });
  console.log(`✔ Admin pronto: ${email}`);

  if ((await prisma.product.count()) === 0) {
    await prisma.product.createMany({ data: whiskies });
    console.log(`✔ ${whiskies.length} whiskys de exemplo cadastrados`);
  } else {
    console.log('• Catálogo já possui produtos, nada a inserir');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
