import asyncio
import json
import logging
import os
import sys

# Add backend to path so app.core can be found
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import init_db, close_db, get_db, DB_PATH

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
                referred_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                referral_balance REAL NOT NULL DEFAULT 0.0,
                referrals_count INTEGER NOT NULL DEFAULT 0,
                balance REAL NOT NULL DEFAULT 0.0,
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
                provider_service_id TEXT,
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
                payment_status TEXT DEFAULT 'pending_payment',
                payment_method TEXT,
                payment_id TEXT,
                screenshot_url TEXT,
                error_message TEXT,
                retry_count INTEGER DEFAULT 0,
                provider_order_id TEXT,
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

        # 6. Referral earnings table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS referral_earnings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                order_id INTEGER UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                amount REAL NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        """)
        logging.info("[Migrate] ✓ referral_earnings table created")

        # Column Altering fallback (in case DB already exists without these columns)
        try:
            await db.execute("ALTER TABLE game_packages ADD COLUMN provider_service_id TEXT;")
        except Exception:
            pass
        try:
            await db.execute("ALTER TABLE orders ADD COLUMN provider_order_id TEXT;")
        except Exception:
            pass
        try:
            await db.execute("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending_payment';")
        except Exception:
            pass
        try:
            await db.execute("ALTER TABLE orders ADD COLUMN payment_method TEXT;")
        except Exception:
            pass
        try:
            await db.execute("ALTER TABLE orders ADD COLUMN payment_id TEXT;")
        except Exception:
            pass
        try:
            await db.execute("ALTER TABLE orders ADD COLUMN screenshot_url TEXT;")
        except Exception:
            pass
        try:
            await db.execute("ALTER TABLE orders ADD COLUMN error_message TEXT;")
        except Exception:
            pass
        try:
            await db.execute("ALTER TABLE orders ADD COLUMN retry_count INTEGER DEFAULT 0;")
        except Exception:
            pass
        try:
            await db.execute("ALTER TABLE orders ADD COLUMN completed_at TEXT;")
        except Exception:
            pass
        try:
            await db.execute("ALTER TABLE users ADD COLUMN referred_by INTEGER REFERENCES users(id) ON DELETE SET NULL;")
        except Exception:
            pass
        try:
            await db.execute("ALTER TABLE users ADD COLUMN referral_balance REAL DEFAULT 0.0;")
        except Exception:
            pass
        try:
            await db.execute("ALTER TABLE users ADD COLUMN referrals_count INTEGER DEFAULT 0;")
        except Exception:
            pass
        try:
            await db.execute("ALTER TABLE users ADD COLUMN balance REAL DEFAULT 0.0;")
        except Exception:
            pass

        # Indexes
        await db.execute("CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_game_packages_game ON game_packages(game, category);")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);")
        # Ensure external transaction id + provider is unique to enforce idempotency at DB level
        await db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_external_provider ON transactions(external_id, payment_provider);")
        await db.execute("CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer_id ON referral_earnings(referrer_id);")
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
        # Turn off foreign key checking temporarily
        await db.execute("PRAGMA foreign_keys = OFF;")
        # Clear existing packages to refresh
        await db.execute("DELETE FROM game_packages")
        await db.commit()

        # PUBG Mobile - Almazar (UC)
        # (name, amount, price, provider_service_id)
        pubg_almazar = [
            ("60 UC", 60, 14000, "pubg_60"),
            ("120 UC", 120, 28000, "pubg_120"),
            ("180 UC", 180, 42000, "pubg_180"),
            ("325 UC", 325, 65000, "pubg_325"),
            ("385 UC", 385, 79000, "pubg_385"),
            ("445 UC", 445, 93000, "pubg_445"),
            ("505 UC", 505, 107000, "pubg_505"),
            ("660 UC", 660, 125000, "pubg_660"),
            ("720 UC", 720, 139000, "pubg_720"),
            ("780 UC", 780, 153000, "pubg_780"),
            ("985 UC", 985, 190000, "pubg_985"),
            ("1320 UC", 1320, 250000, "pubg_1320"),
            ("1800 UC", 1800, 320000, "pubg_1800"),
            ("2125 UC", 2125, 385000, "pubg_2125"),
            ("2460 UC", 2460, 445000, "pubg_2460"),
            ("3850 UC", 3850, 590000, "pubg_3850"),
            ("4510 UC", 4510, 715000, "pubg_4510"),
            ("5650 UC", 5650, 910000, "pubg_5650"),
            ("8100 UC", 8100, 1250000, "pubg_8100"),
            ("11950 UC", 11950, 1840000, "pubg_11950"),
            ("24300 UC", 24300, 3750000, "pubg_24300"),
            ("81000 UC", 81000, 12500000, "pubg_81000"),
        ]
        for idx, (name, amount, price, s_id) in enumerate(pubg_almazar):
            await db.execute(
                "INSERT INTO game_packages (game, category, name, amount, base_price, sell_price, usd_price, provider_service_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                ('pubg', 'almazar', name, amount, price, price, 0.0, s_id, idx + 1)
            )
        logging.info("[Seed] ✓ PUBG Almazar packages seeded")

        # PUBG Mobile - Propuski
        pubg_propuski = [
            ("Elite Pass", 1, 12000, "pubg_elite"),
            ("Elite Pass Plus", 1, 28000, "pubg_elite_plus"),
        ]
        for idx, (name, amount, price, s_id) in enumerate(pubg_propuski):
            await db.execute(
                "INSERT INTO game_packages (game, category, name, amount, base_price, sell_price, usd_price, provider_service_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                ('pubg', 'propuski', name, amount, price, price, 0.0, s_id, idx + 1)
            )
        logging.info("[Seed] ✓ PUBG Propuski packages seeded")

        # PUBG Mobile - Level Up
        pubg_levelup = [
            ("1 Level", 1, 5000, "pubg_lvl_1"),
            ("5 Level", 5, 20000, "pubg_lvl_5"),
            ("10 Level", 10, 35000, "pubg_lvl_10"),
        ]
        for idx, (name, amount, price, s_id) in enumerate(pubg_levelup):
            await db.execute(
                "INSERT INTO game_packages (game, category, name, amount, base_price, sell_price, usd_price, provider_service_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                ('pubg', 'levelup', name, amount, price, price, 0.0, s_id, idx + 1)
            )
        logging.info("[Seed] ✓ PUBG Level Up packages seeded")

        # Mobile Legends / Free Fire - Almazar
        # Format: (name, amount, price, provider_service_id)
        ff_almazar = [
            ("105 [🎁180] Olmos", 180, 11000, "ml_180"),
            ("210 [🎁285] Olmos", 285, 22000, "ml_285"),
            ("326 [🎁559] Olmos", 559, 32000, "ml_559"),
            ("431 [🎁664] Olmos", 664, 43000, "ml_664"),
            ("546 [🎁936] Olmos", 936, 52000, "ml_936"),
            ("651 [🎁1041] Olmos", 1041, 63000, "ml_1041"),
            ("872 [🎁1262] Olmos", 1262, 84000, "ml_1262"),
            ("1113 [🎁1908] Olmos", 1908, 105000, "ml_1908"),
            ("1659 [🎁2528] Olmos", 2528, 157000, "ml_2528"),
            ("1985 [🎁2854] Olmos", 2854, 189000, "ml_2854"),
            ("2398 [🎁4033] Olmos", 4033, 210000, "ml_4033"),
            ("2944 [🎁4579] Olmos", 4579, 263000, "ml_4579"),
            ("6160 [🎁10360] Olmos", 10360, 520000, "ml_10360"),
            ("12320 [🎁16520] Olmos", 16520, 1040000, "ml_16520"),
        ]
        for idx, (name, amount, price, s_id) in enumerate(ff_almazar):
            await db.execute(
                "INSERT INTO game_packages (game, category, name, amount, base_price, sell_price, usd_price, provider_service_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                ('freefire', 'almazar', name, amount, price, price, 0.0, s_id, idx + 1)
            )
        logging.info("[Seed] ✓ Free Fire Almazar packages seeded")

        # Free Fire - Propuski
        ff_propuski = [
            ("Elite Pass", 1, 4900, "ff_elite"),
            ("Propuski Bundle", 1, 76000, "ff_bundle"),
        ]
        for idx, (name, amount, price, s_id) in enumerate(ff_propuski):
            await db.execute(
                "INSERT INTO game_packages (game, category, name, amount, base_price, sell_price, usd_price, provider_service_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                ('freefire', 'propuski', name, amount, price, price, 0.0, s_id, idx + 1)
            )
        logging.info("[Seed] ✓ Free Fire Propuski packages seeded")

        # Free Fire - Level Up
        ff_levelup = [
            ("5 Level", 5, 5000, "ff_lvl_5"),
            ("10 Level", 10, 9000, "ff_lvl_10"),
            ("15 Level", 15, 9000, "ff_lvl_15"),
            ("20 Level", 20, 9000, "ff_lvl_20"),
        ]
        for idx, (name, amount, price, s_id) in enumerate(ff_levelup):
            await db.execute(
                "INSERT INTO game_packages (game, category, name, amount, base_price, sell_price, usd_price, provider_service_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                ('freefire', 'levelup', name, amount, price, price, 0.0, s_id, idx + 1)
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
        await db.execute("PRAGMA foreign_keys = ON;")
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
