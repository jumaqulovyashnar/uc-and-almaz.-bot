import logging
from typing import Dict, Any, Optional, List
from app.core.database import query, query_row, execute

async def create(order_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        await execute("""
            INSERT INTO orders (user_id, game, category, package_id, package_name, amount, price, player_id, player_nickname, payment_method)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        order_data["user_id"],
        order_data["game"],
        order_data["category"],
        order_data["package_id"],
        order_data["package_name"],
        order_data["amount"],
        order_data["price"],
        order_data["player_id"],
        order_data.get("player_nickname"),
        order_data.get("payment_method")
        )
        # Get the last inserted row
        return await query_row("SELECT * FROM orders WHERE id = last_insert_rowid()")
    except Exception as e:
        logging.error(f"[OrderService] create error: {e}")
        raise e

async def get_by_user_id(user_id: int, limit: int = 20, offset: int = 0) -> Dict[str, Any]:
    try:
        count_res = await query_row("SELECT COUNT(*) as cnt FROM orders WHERE user_id = ?", user_id)
        total = int(count_res["cnt"]) if count_res else 0
        
        orders = await query("""
            SELECT * FROM orders
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        """, user_id, limit, offset)
        
        return {"orders": orders, "total": total}
    except Exception as e:
        logging.error(f"[OrderService] get_by_user_id error: {e}")
        raise e

async def get_by_id(order_id: int) -> Optional[Dict[str, Any]]:
    try:
        return await query_row("""
            SELECT o.*, u.telegram_id 
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE o.id = ?
        """, order_id)
    except Exception as e:
        logging.error(f"[OrderService] get_by_id error: {e}")
        raise e

async def update_status(order_id: int, status: str, extras: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    try:
        set_clauses = ["status = ?", "updated_at = datetime('now')"]
        params = [status]
        
        if extras:
            if "error_message" in extras:
                set_clauses.append("error_message = ?")
                params.append(extras["error_message"])
            if "completed_at" in extras:
                set_clauses.append("completed_at = ?")
                params.append(str(extras["completed_at"]))
            if "payment_id" in extras:
                set_clauses.append("payment_id = ?")
                params.append(extras["payment_id"])
            if "screenshot_url" in extras:
                set_clauses.append("screenshot_url = ?")
                params.append(extras["screenshot_url"])
 
        if status == "failed":
            set_clauses.append("retry_count = retry_count + 1")

        query_str = f"UPDATE orders SET {', '.join(set_clauses)} WHERE id = ?"
        params.append(order_id)
        
        await execute(query_str, *params)
        return await query_row("SELECT * FROM orders WHERE id = ?", order_id)
    except Exception as e:
        logging.error(f"[OrderService] update_status error: {e}")
        raise e

async def get_admin_orders(filters: Dict[str, Any]) -> Dict[str, Any]:
    try:
        conditions = []
        params = []
        
        if filters.get("status"):
            conditions.append("o.status = ?")
            params.append(filters["status"])
            
        if filters.get("game"):
            conditions.append("o.game = ?")
            params.append(filters["game"])
            
        if filters.get("user_id"):
            conditions.append("o.user_id = ?")
            params.append(filters["user_id"])
            
        if filters.get("date_from"):
            conditions.append("o.created_at >= ?")
            params.append(filters["date_from"])
            
        if filters.get("date_to"):
            conditions.append("o.created_at <= ?")
            params.append(filters["date_to"])

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        limit = filters.get("limit", 50)
        offset = filters.get("offset", 0)

        count_res = await query_row(f"SELECT COUNT(*) as cnt FROM orders o {where_clause}", *params)
        total = int(count_res["cnt"]) if count_res else 0

        orders_query = f"""
            SELECT o.*, u.telegram_id, u.username as user_username
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            {where_clause}
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        """
        
        orders = await query(orders_query, *params, limit, offset)
        return {"orders": orders, "total": total}
    except Exception as e:
        logging.error(f"[OrderService] get_admin_orders error: {e}")
        raise e

async def get_stats() -> Dict[str, Any]:
    try:
        revenue_res = await query_row("""
            SELECT COALESCE(SUM(price), 0) as total FROM orders WHERE status = 'completed'
        """)
        
        total_res = await query_row("SELECT COUNT(*) as total FROM orders")
        pending_res = await query_row("SELECT COUNT(*) as cnt FROM orders WHERE status = 'pending'")
        completed_res = await query_row("SELECT COUNT(*) as cnt FROM orders WHERE status = 'completed'")
        failed_res = await query_row("SELECT COUNT(*) as cnt FROM orders WHERE status = 'failed'")
        
        users_res = await query_row("SELECT COUNT(*) as total FROM users")
        
        today_res = await query_row("""
            SELECT
                COALESCE(SUM(price), 0) as revenue,
                COUNT(*) as orders
            FROM orders
            WHERE date(created_at) = date('now') AND status = 'completed'
        """)
        
        return {
            "total_revenue": float(revenue_res["total"]) if revenue_res else 0.0,
            "total_orders": int(total_res["total"]) if total_res else 0,
            "pending_orders": int(pending_res["cnt"]) if pending_res else 0,
            "completed_orders": int(completed_res["cnt"]) if completed_res else 0,
            "failed_orders": int(failed_res["cnt"]) if failed_res else 0,
            "total_users": int(users_res["total"]) if users_res else 0,
            "today_revenue": float(today_res["revenue"]) if today_res else 0.0,
            "today_orders": int(today_res["orders"]) if today_res else 0,
        }
    except Exception as e:
        logging.error(f"[OrderService] get_stats error: {e}")
        raise e
