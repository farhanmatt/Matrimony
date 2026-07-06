const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function main() { 
  const stories = await prisma.successStory.findMany(); 
  console.log(JSON.stringify(stories, null, 2)); 
} 

main().finally(() => prisma.$disconnect());
