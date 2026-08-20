import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const existingAdmin = await prisma.user.findFirst({
    where: { email: 'admin@tbs.com' },
  });

  if (existingAdmin) {
    console.log('Database already has seeded data. Skipping seed execution...');
    return;
  }

  console.log('Clearing existing data...');
  await prisma.emailLog.deleteMany({});
  await prisma.waitlistOffer.deleteMany({});
  await prisma.waitlist.deleteMany({});
  await prisma.bookingSeat.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.seatHold.deleteMany({});
  await prisma.eventSeat.deleteMany({});
  await prisma.ticketCategory.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.venueSeat.deleteMany({});
  await prisma.venue.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding users...');
  const passwordHash = bcrypt.hashSync('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@tbs.com',
      name: 'System Admin',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const organiser = await prisma.user.create({
    data: {
      email: 'organiser@tbs.com',
      name: 'Event Organiser',
      passwordHash,
      role: 'ORGANISER',
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      email: 'customer@tbs.com',
      name: 'John Doe',
      passwordHash,
      role: 'CUSTOMER',
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'customer2@tbs.com',
      name: 'Jane Smith',
      passwordHash,
      role: 'CUSTOMER',
    },
  });

  const customer3 = await prisma.user.create({
    data: {
      email: 'customer3@tbs.com',
      name: 'Bob Johnson',
      passwordHash,
      role: 'CUSTOMER',
    },
  });

  console.log('Seeding venues and venue seats...');
  // Venue 1: Grand Symphony Hall in New York
  const venue1 = await prisma.venue.create({
    data: {
      name: 'Grand Symphony Hall',
      location: 'New York',
      address: '123 Broadway, New York, NY',
      rowsCount: 5,
      seatsPerRow: 6,
    },
  });

  // Venue 2: Roxy Cinema Arena in Los Angeles
  const venue2 = await prisma.venue.create({
    data: {
      name: 'Roxy Cinema Arena',
      location: 'Los Angeles',
      address: '456 Sunset Blvd, Los Angeles, CA',
      rowsCount: 4,
      seatsPerRow: 5,
    },
  });

  // Venue 3: Starlight Stadium in Chicago
  const venue3 = await prisma.venue.create({
    data: {
      name: 'Starlight Stadium',
      location: 'Chicago',
      address: '789 Lake Shore Dr, Chicago, IL',
      rowsCount: 6,
      seatsPerRow: 8,
    },
  });

  // Helper to generate venue seats
  const createVenueSeats = async (venueId: string, rowsCount: number, seatsPerRow: number, categoryMapping: (row: string) => string) => {
    const seats = [];
    for (let r = 0; r < rowsCount; r++) {
      const rowName = String.fromCharCode(65 + r); // A, B, C...
      const category = categoryMapping(rowName);
      for (let s = 1; s <= seatsPerRow; s++) {
        seats.push({
          venueId,
          rowName,
          seatNumber: s,
          category,
        });
      }
    }
    await prisma.venueSeat.createMany({ data: seats });
    return await prisma.venueSeat.findMany({ where: { venueId } });
  };

  const seats1 = await createVenueSeats(venue1.id, 5, 6, (row) => {
    if (row === 'A') return 'Premium';
    if (row === 'B' || row === 'C') return 'Standard';
    return 'Economy';
  });

  const seats2 = await createVenueSeats(venue2.id, 4, 5, (row) => {
    if (row === 'A') return 'Premium';
    if (row === 'B' || row === 'C') return 'Standard';
    return 'Economy';
  });

  const seats3 = await createVenueSeats(venue3.id, 6, 8, (row) => {
    if (row === 'A' || row === 'B') return 'Premium';
    if (row === 'C' || row === 'D') return 'Standard';
    return 'Economy';
  });

  console.log('Seeding events...');
  const event1 = await prisma.event.create({
    data: {
      title: 'Taylor Swift Tribute: The Eras Concert',
      description: 'Experience the ultimate tribute to Taylor Swift live in concert! Singing all her greatest hits from Debut to Midnights.',
      imageUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=600&auto=format&fit=crop',
      date: '2026-09-10',
      time: '19:00',
      venueId: venue1.id,
      organiserId: organiser.id,
    },
  });

  const event2 = await prisma.event.create({
    data: {
      title: 'Inception: 15th Anniversary IMAX Screening',
      description: 'Your mind is the scene of the crime. Experience Christopher Nolans mind-bending masterpiece back on the big screen in IMAX.',
      imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600&auto=format&fit=crop',
      date: '2026-09-12',
      time: '20:00',
      venueId: venue2.id,
      organiserId: organiser.id,
    },
  });

  const event3 = await prisma.event.create({
    data: {
      title: 'Rock On the Beach: Summer Fest',
      description: 'The ultimate rock music festival of the summer! Feat. local rock legends, food trucks, and seaside vibes.',
      imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=600&auto=format&fit=crop',
      date: '2026-09-15',
      time: '18:30',
      venueId: venue3.id,
      organiserId: organiser.id,
    },
  });

  const event4 = await prisma.event.create({
    data: {
      title: 'Comedy Night: Laugh Out Loud Live',
      description: 'Get ready to laugh till it hurts! Stand-up comedy show featuring top touring headliners and rising stars.',
      imageUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eed262?q=80&w=600&auto=format&fit=crop',
      date: '2026-10-05',
      time: '21:00',
      venueId: venue2.id,
      organiserId: organiser.id,
    },
  });

  const event5 = await prisma.event.create({
    data: {
      title: 'Formula 1 Grand Prix: VIP Screening',
      description: 'Watch the Grand Prix live in high-fidelity sound and visual quality. Includes food and beverage ticket vouchers.',
      imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=600&auto=format&fit=crop',
      date: '2026-10-12',
      time: '14:00',
      venueId: venue3.id,
      organiserId: organiser.id,
    },
  });

  const event6 = await prisma.event.create({
    data: {
      title: 'Broadway Musical: The Lion King',
      description: 'The award-winning Broadway musical masterpiece. Stunning costumes, unforgettable music, and a classic story for the whole family.',
      imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=600&auto=format&fit=crop',
      date: '2026-10-20',
      time: '19:30',
      venueId: venue1.id,
      organiserId: organiser.id,
    },
  });

  console.log('Seeding ticket categories and event seats...');
  const seedCategoriesAndSeats = async (
    eventId: string,
    venueSeats: any[],
    prices: { Premium: number; Standard: number; Economy: number }
  ) => {
    // 1. Create categories
    const categoriesData = [
      { eventId, name: 'Premium', price: prices.Premium, totalSeats: venueSeats.filter(s => s.category === 'Premium').length },
      { eventId, name: 'Standard', price: prices.Standard, totalSeats: venueSeats.filter(s => s.category === 'Standard').length },
      { eventId, name: 'Economy', price: prices.Economy, totalSeats: venueSeats.filter(s => s.category === 'Economy').length },
    ];
    
    await prisma.ticketCategory.createMany({ data: categoriesData });
    const categories = await prisma.ticketCategory.findMany({ where: { eventId } });

    // Create mapping of category name to ID and price
    const catMap = categories.reduce((acc, cat) => {
      acc[cat.name] = cat;
      return acc;
    }, {} as Record<string, any>);

    // 2. Create event seats
    const eventSeats = venueSeats.map((vs) => {
      const cat = catMap[vs.category];
      return {
        eventId,
        venueSeatId: vs.id,
        categoryId: cat.id,
        price: cat.price,
        status: 'AVAILABLE' as const,
        rowName: vs.rowName,
        seatNumber: vs.seatNumber,
      };
    });

    await prisma.eventSeat.createMany({ data: eventSeats });
  };

  await seedCategoriesAndSeats(event1.id, seats1, { Premium: 150.0, Standard: 80.0, Economy: 50.0 });
  await seedCategoriesAndSeats(event2.id, seats2, { Premium: 25.0, Standard: 18.0, Economy: 12.0 });
  await seedCategoriesAndSeats(event3.id, seats3, { Premium: 200.0, Standard: 120.0, Economy: 70.0 });
  await seedCategoriesAndSeats(event4.id, seats2, { Premium: 45.0, Standard: 30.0, Economy: 20.0 });
  await seedCategoriesAndSeats(event5.id, seats3, { Premium: 95.0, Standard: 60.0, Economy: 40.0 });
  await seedCategoriesAndSeats(event6.id, seats1, { Premium: 180.0, Standard: 110.0, Economy: 75.0 });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
