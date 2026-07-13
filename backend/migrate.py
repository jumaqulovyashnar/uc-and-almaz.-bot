import asyncio
import json
import logging
import os
import sys

# Add backend to path so app.config can be found
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config.database import init_db, close_db, get_db, DB_PATH

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

async def migrate() -> None:
    logging.info(f"[Migrate] Initializing SQLite database at {DB_PATH}...")
    await init_db()
    db = get_db()
    
    try:
        # 1. Users table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER UNIQUE NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT,
                username TEXT,
                is_premium INTEGER DEFAULT 0,
                total_spent REAL DEFAULT 0,
                order_count INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        """)
        logging.info("[Migrate] ✓ users table created")

        # 2. Game packages table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS game_packages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game TEXT NOT NULL,
                category TEXT NOT NULL,
                name TEXT NOT NULL,
                amount INTEGER NOT NULL,
                base_price REAL NOT NULL,
                sell_price REAL NOT NULL,
                usd_price REAL DEFAULT 0,
                markup_percent REAL DEFAULT 10.00,
                currency TEXT DEFAULT 'UZS',
                is_active INTEGER DEFAULT 1,
                discount INTEGER DEFAULT 0,
                sort_order INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        """)
        logging.info("[Migrate] ✓ game_packages table created")

        # 3. Orders table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                game TEXT NOT NULL,
                category TEXT NOT NULL,
                package_id INTEGER REFERENCES game_packages(id),
                package_name TEXT NOT NULL,
                amount INTEGER NOT NULL,
                price REAL NOT NULL,
                player_id TEXT NOT NULL,
                player_nickname TEXT,
                status TEXT DEFAULT 'pending',
                payment_method TEXT,
                payment_id TEXT,
                screenshot_url TEXT,
                error_message TEXT,
                retry_count INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                completed_at TEXT,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        """)
        logging.info("[Migrate] ✓ orders table created")

        # 4. Transactions table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                payment_provider TEXT NOT NULL,
                external_id TEXT,
                amount REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                metadata TEXT DEFAULT '{}',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        """)
        logging.info("[Migrate] ✓ transactions table created")

        # 5. System config table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS system_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        """)
        logging.info("[Migrate] ✓ system_config table created")

        # Indexes
        await db.execute("CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_game_packages_game ON game_packages(game, category);")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);")
        await db.commit()
        logging.info("[Migrate] ✓ indexes created")
        logging.info("[Migrate] ✓ All tables created successfully")
    except Exception as e:
        logging.error(f"[Migrate] Migration failed: {e}")
        raise e

async def seed() -> None:
    logging.info("[Seed] Seeding database...")
    db = get_db()
    
    try:
        # Check if game packages already exist
        async with db.execute("SELECT COUNT(*) FROM game_packages") as cursor:
            row = await cursor.fetchone()
            count = row[0] if row else 0
        
        if count > 0:
            logging.info("[Seed] Game packages already seeded, skipping...")
            return

        # PUBG Mobile - Almazar (UC)
        pubg_almazar = [
            ("30 UC", 30, 5750, 0.45),
            ("60 UC", 60, 11500, 0.91),
            ("300 + 25 UC", 325, 57500, 4.55),
            ("600 + 60 UC", 660, 115000, 9.10),
            ("1500 + 300 UC", 1800, 287500, 22.73),
            ("3000 + 850 UC", 3850, 575000, 45.45),
            ("6000 + 2100 UC", 8100, 1150000, 90.91),
            ("12000 + 4200 UC", 16200, 2300000, 181.82),
            ("18000 + 6300 UC", 24300, 3450000, 272.73),
            ("24000 + 8400 UC", 32400, 4600000, 363.64),
            ("30000 + 10500 UC", 40500, 5750000, 454.55),
            ("36000 + 12600 UC", 48600, 6900000, 545.45),
            ("60000 + 21000 UC", 81000, 11500000, 909.09),
        ]
        for idx, (name, amount, price, usd) in enumerate(pubg_almazar):
            await db.execute(
                "INSERT INTO game_packages (game, category, name, amount, base_price, sell_price, usd_price, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                ('pubg', 'almazar', name, amount, price, price, usd, idx + 1)
            )
        logging.info("[Seed] ✓ PUBG Almazar packages seeded")

        # PUBG Mobile - Propuski
        pubg_propuski = [
            ("Elite Pass", 1, 12000, 5.99),
            ("Elite Pass Plus", 1, 28000, 14.99),
        ]
        for idx, (name, amount, price, usd) in enumerate(pubg_propuski):
            await db.execute(
                "INSERT INTO game_packages (game, category, name, amount, base_price, sell_price, usd_price, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                ('pubg', 'propuski', name, amount, price, price, usd, idx + 1)
            )
        logging.info("[Seed] ✓ PUBG Propuski packages seeded")

        # PUBG Mobile - Level Up
        pubg_levelup = [
            ("1 Level", 1, 5000, 0.40),
            ("5 Level", 5, 20000, 1.60),
            ("10 Level", 10, 35000, 3.00),
        ]
        for idx, (name, amount, price, usd) in enumerate(pubg_levelup):
            await db.execute(
                "INSERT INTO game_packages (game, category, name, amount, base_price, sell_price, usd_price, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                ('pubg', 'levelup', name, amount, price, price, usd, idx + 1)
            )
        logging.info("[Seed] ✓ PUBG Level Up packages seeded")

        # Free Fire - Almazar
        ff_almazar = [
            ("100 Olmos", 100, 11000, 0.99),
            ("310 Olmos", 310, 33000, 2.99),
            ("520 Olmos", 520, 55000, 4.99),
            ("1060 Olmos", 1060, 110000, 9.99),
            ("2180 Olmos", 2180, 220000, 19.99),
            ("5600 Olmos", 5600, 550000, 49.99),
        ]
        for idx, (name, amount, price, usd) in enumerate(ff_almazar):
            await db.execute(
                "INSERT INTO game_packages (game, category, name, amount, base_price, sell_price, usd_price, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                ('freefire', 'almazar', name, amount, price, price, usd, idx + 1)
            )
        logging.info("[Seed] ✓ Free Fire Almazar packages seeded")

        # Free Fire - Propuski
        ff_propuski = [
            ("Elite Pass", 1, 4900, 1.99),
            ("Propuski Bundle", 1, 76000, 6.99),
        ]
        for idx, (name, amount, price, usd) in enumerate(ff_propuski):
            await db.execute(
                "INSERT INTO game_packages (game, category, name, amount, base_price, sell_price, usd_price, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                ('freefire', 'propuski', name, amount, price, price, usd, idx + 1)
            )
        logging.info("[Seed] ✓ Free Fire Propuski packages seeded")

        # Free Fire - Level Up
        ff_levelup = [
            ("5 Level", 5, 5000, 0.40),
            ("10 Level", 10, 9000, 0.80),
            ("15 Level", 15, 9000, 0.80),
            ("20 Level", 20, 9000, 0.80),
        ]
        for idx, (name, amount, price, usd) in enumerate(ff_levelup):
            await db.execute(
                "INSERT INTO game_packages (game, category, name, amount, base_price, sell_price, usd_price, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                ('freefire', 'levelup', name, amount, price, price, usd, idx + 1)
            )
        logging.info("[Seed] ✓ Free Fire Level Up packages seeded")

        # System configs
        await db.execute(
            "INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)",
            ('maintenance_pubg', json.dumps(False))
        )
        await db.execute(
            "INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)",
            ('maintenance_freefire', json.dumps(False))
        )
        await db.commit()
        
        logging.info("[Seed] ✓ System config seeded")
        logging.info("[Seed] ✓ All data seeded successfully")
    except Exception as e:
        logging.error(f"[Seed] Seeding transaction failed: {e}")
        raise e

async def main() -> None:
    try:
        logging.info("[Migrate] Starting database migration & seed...")
        await migrate()
        await seed()
        logging.info("[Migrate] ✓ Database migration complete!")
    except Exception as e:
        logging.error(f"[Migrate] ✗ Database migration failed: {e}")
    finally:
        await close_db()

if __name__ == "__main__":
    asyncio.run(main())
