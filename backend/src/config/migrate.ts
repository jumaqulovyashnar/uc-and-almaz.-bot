import { pool } from './database.js';

async function migrate(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── Users table ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255),
        username VARCHAR(255),
        is_premium BOOLEAN DEFAULT FALSE,
        total_spent DECIMAL(12,2) DEFAULT 0,
        order_count INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('[Migrate] ✓ users table created');

    // ── Game packages table ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_packages (
        id SERIAL PRIMARY KEY,
        game VARCHAR(20) NOT NULL,
        category VARCHAR(20) NOT NULL,
        name VARCHAR(100) NOT NULL,
        amount INT NOT NULL,
        base_price DECIMAL(12,2) NOT NULL,
        sell_price DECIMAL(12,2) NOT NULL,
        usd_price DECIMAL(12,2) DEFAULT 0,
        markup_percent DECIMAL(5,2) DEFAULT 10.00,
        currency VARCHAR(10) DEFAULT 'UZS',
        is_active BOOLEAN DEFAULT TRUE,
        discount INT DEFAULT 0,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('[Migrate] ✓ game_packages table created');

    // ── Orders table ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        game VARCHAR(20) NOT NULL,
        category VARCHAR(20) NOT NULL,
        package_id INT REFERENCES game_packages(id),
        package_name VARCHAR(100) NOT NULL,
        amount INT NOT NULL,
        price DECIMAL(12,2) NOT NULL,
        player_id VARCHAR(50) NOT NULL,
        player_nickname VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        payment_method VARCHAR(50),
        payment_id VARCHAR(100),
        screenshot_url TEXT,
        error_message TEXT,
        retry_count INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('[Migrate] ✓ orders table created');

    // ── Transactions table ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        payment_provider VARCHAR(50) NOT NULL,
        external_id VARCHAR(100),
        amount DECIMAL(12,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('[Migrate] ✓ transactions table created');

    // ── System config table ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_config (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('[Migrate] ✓ system_config table created');

    // ── Create indexes ──
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_game_packages_game ON game_packages(game, category);
      CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
    `);
    console.log('[Migrate] ✓ indexes created');

    await client.query('COMMIT');
    console.log('[Migrate] ✓ All tables created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migrate] ✗ Migration failed:', (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
}

async function seed(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if data already exists
    const existing = await client.query('SELECT COUNT(*) FROM game_packages');
    if (parseInt(existing.rows[0].count as string, 10) > 0) {
      console.log('[Seed] Game packages already seeded, skipping...');
      await client.query('COMMIT');
      return;
    }

    // ── PUBG Mobile - Almazar (UC) ──
    const pubgAlmazar = [
      { name: '30 UC', amount: 30, price: 5750, usd: 0.45 },
      { name: '60 UC', amount: 60, price: 11500, usd: 0.91 },
      { name: '300 + 25 UC', amount: 325, price: 57500, usd: 4.55 },
      { name: '600 + 60 UC', amount: 660, price: 115000, usd: 9.10 },
      { name: '1500 + 300 UC', amount: 1800, price: 287500, usd: 22.73 },
      { name: '3000 + 850 UC', amount: 3850, price: 575000, usd: 45.45 },
      { name: '6000 + 2100 UC', amount: 8100, price: 1150000, usd: 90.91 },
    ];

    for (let i = 0; i < pubgAlmazar.length; i++) {
      const pkg = pubgAlmazar[i];
      await client.query(
        `INSERT INTO game_packages (game, category, name, amount, base_price, sell_price, usd_price, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['pubg', 'almazar', pkg.name, pkg.amount, pkg.price, pkg.price, pkg.usd, i + 1]
      );
    }
    console.log('[Seed] ✓ PUBG Almazar packages');

    // ── PUBG Mobile - Propuski (Passes) ──
    const pubgPropuski = [
      { name: 'Elite Pass', amount: 1, price: 12000, usd: 5.99 },
      { name: 'Elite Pass Plus', amount: 1, price: 28000, usd: 14.99 },
    ];

    for (let i = 0; i < pubgPropuski.length; i++) {
      const pkg = pubgPropuski[i];
      await client.query(
        `INSERT INTO game_packages (game, category, name, amount, base_price, sell_price, usd_price, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['pubg', 'propuski', pkg.name, pkg.amount, pkg.price, pkg.price, pkg.usd, i + 1]
      );
    }
    console.log('[Seed] ✓ PUBG Propuski packages');

    // ── PUBG Mobile - Level Up ──
    const pubgLevelUp = [
      { name: '1 Level', amount: 1, price: 5000, usd: 0.40 },
      { name: '5 Level', amount: 5, price: 20000, usd: 1.60 },
      { name: '10 Level', amount: 10, price: 35000, usd: 3.00 },
    ];

    for (let i = 0; i < pubgLevelUp.length; i++) {
      const pkg = pubgLevelUp[i];
      await client.query(
        `INSERT INTO game_packages (game, category, name, amount, base_price, sell_price, usd_price, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['pubg', 'levelup', pkg.name, pkg.amount, pkg.price, pkg.price, pkg.usd, i + 1]
      );
    }
    console.log('[Seed] ✓ PUBG Level Up packages');

    // ── Free Fire - Almazar (Diamonds) ──
    const ffAlmazar = [
      { name: '100 Olmos', amount: 100, price: 11000, usd: 0.99 },
      { name: '310 Olmos', amount: 310, price: 33000, usd: 2.99 },
      { name: '520 Olmos', amount: 520, price: 55000, usd: 4.99 },
      { name: '1060 Olmos', amount: 1060, price: 110000, usd: 9.99 },
      { name: '2180 Olmos', amount: 2180, price: 220000, usd: 19.99 },
      { name: '5600 Olmos', amount: 5600, price: 550000, usd: 49.99 },
    ];

    for (let i = 0; i < ffAlmazar.length; i++) {
      const pkg = ffAlmazar[i];
      await client.query(
        `INSERT INTO game_packages (game, category, name, amount, base_price, sell_price, usd_price, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['freefire', 'almazar', pkg.name, pkg.amount, pkg.price, pkg.price, pkg.usd, i + 1]
      );
    }
    console.log('[Seed] ✓ Free Fire Almazar packages');

    // ── Free Fire - Propuski (Passes) ──
    const ffPropuski = [
      { name: 'Elite Pass', amount: 1, price: 4900, usd: 1.99 },
      { name: 'Propuski Bundle', amount: 1, price: 76000, usd: 6.99 },
    ];

    for (let i = 0; i < ffPropuski.length; i++) {
      const pkg = ffPropuski[i];
      await client.query(
        `INSERT INTO game_packages (game, category, name, amount, base_price, sell_price, usd_price, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['freefire', 'propuski', pkg.name, pkg.amount, pkg.price, pkg.price, pkg.usd, i + 1]
      );
    }
    console.log('[Seed] ✓ Free Fire Propuski packages');

    // ── Free Fire - Level Up ──
    const ffLevelUp = [
      { name: '5 Level', amount: 5, price: 5000, usd: 0.40 },
      { name: '10 Level', amount: 10, price: 9000, usd: 0.80 },
      { name: '15 Level', amount: 15, price: 9000, usd: 0.80 },
      { name: '20 Level', amount: 20, price: 9000, usd: 0.80 },
    ];

    for (let i = 0; i < ffLevelUp.length; i++) {
      const pkg = ffLevelUp[i];
      await client.query(
        `INSERT INTO game_packages (game, category, name, amount, base_price, sell_price, usd_price, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        ['freefire', 'levelup', pkg.name, pkg.amount, pkg.price, pkg.price, pkg.usd, i + 1]
      );
    }
    console.log('[Seed] ✓ Free Fire Level Up packages');

    // ── System config ──
    await client.query(
      `INSERT INTO system_config (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      ['maintenance_pubg', JSON.stringify(false)]
    );
    await client.query(
      `INSERT INTO system_config (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      ['maintenance_freefire', JSON.stringify(false)]
    );
    console.log('[Seed] ✓ System config seeded');

    await client.query('COMMIT');
    console.log('[Seed] ✓ All data seeded successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Seed] ✗ Seeding failed:', (error as Error).message);
    throw error;
  } finally {
    client.release();
  }
}

async function run(): Promise<void> {
  try {
    console.log('[Migrate] Starting database migration...');
    await migrate();
    await seed();
    console.log('[Migrate] ✓ Migration complete!');
  } catch (error) {
    console.error('[Migrate] ✗ Migration failed:', (error as Error).message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
