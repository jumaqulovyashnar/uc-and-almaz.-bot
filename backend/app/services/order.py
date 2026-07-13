import logging
from typing import Dict, Any, Optional, List
from app.config.database import query, query_row

async def create(order_data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        return await query_row("""
            INSERT INTO orders (user_id, game, category, package_id, package_name, amount, price, player_id, player_nickname, payment_method)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
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
    except Exception as e:
        logging.error(f"[OrderService] create error: {e}")
        raise e

async def get_by_user_id(user_id: int, limit: int = 20, offset: int = 0) -> Dict[str, Any]:
    try:
        count_res = await query_row("SELECT COUNT(*) FROM orders WHERE user_id = $1", user_id)
        total = int(count_res["count"]) if count_res else 0
        
        orders = await query("""
            SELECT * FROM orders
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
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
            WHERE o.id = $1
        """, order_id)
    except Exception as e:
        logging.error(f"[OrderService] get_by_id error: {e}")
        raise e

async def update_status(order_id: int, status: str, extras: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    try:
        set_clauses = ["status = $2", "updated_at = NOW()"]
        params = [order_id, status]
        param_index = 3
        
        if extras:
            if "error_message" in extras:
                set_clauses.append(f"error_message = ${param_index}")
                params.append(extras["error_message"])
                param_index += 1
            if "completed_at" in extras:
                set_clauses.append(f"completed_at = ${param_index}")
                params.append(extras["completed_at"])
                param_index += 1
            if "payment_id" in extras:
                set_clauses.append(f"payment_id = ${param_index}")
                params.append(extras["payment_id"])
                param_index += 1
            if "screenshot_url" in extras:
                set_clauses.append(f"screenshot_url = ${param_index}")
                params.append(extras["screenshot_url"])
                param_index += 1

        if status == "failed":
            set_clauses.append("retry_count = retry_count + 1")

        query_str = f"UPDATE orders SET {', '.join(set_clauses)} WHERE id = $1 RETURNING *"
        return await query_row(query_str, *params)
    except Exception as e:
        logging.error(f"[OrderService] update_status error: {e}")
        raise e

async def get_admin_orders(filters: Dict[str, Any]) -> Dict[str, Any]:
    try:
        conditions = []
        params = []
        param_index = 1
        
        if filters.get("status"):
            conditions.append(f"status = ${param_index}")
            params.append(filters["status"])
            param_index += 1
            
        if filters.get("game"):
            conditions.append(f"game = ${param_index}")
            params.append(filters["game"])
            param_index += 1
            
        if filters.get("user_id"):
            conditions.append(f"user_id = ${param_index}")
            params.append(filters["user_id"])
            param_index += 1
            
        if filters.get("date_from"):
            conditions.append(f"created_at >= ${param_index}")
            params.append(filters["date_from"])
            param_index += 1
            
        if filters.get("date_to"):
            conditions.append(f"created_at <= ${param_index}")
            params.append(filters["date_to"])
            param_index += 1

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        limit = filters.get("limit", 50)
        offset = filters.get("offset", 0)

        count_res = await query_row(f"SELECT COUNT(*) FROM orders {where_clause}", *params)
        total = int(count_res["count"]) if count_res else 0

        # Build order retrieval query
        orders_query = f"""
            SELECT o.*, u.telegram_id, u.username as user_username
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            {where_clause}
            ORDER BY o.created_at DESC
            LIMIT ${param_index} OFFSET ${param_index + 1}
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
        
        orders_res = await query_row("""
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE status = 'failed') as failed
            FROM orders
        """)
        
        users_res = await query_row("SELECT COUNT(*) as total FROM users")
        
        today_res = await query_row("""
            SELECT
                COALESCE(SUM(price), 0) as revenue,
                COUNT(*) as orders
            FROM orders
            WHERE created_at >= CURRENT_DATE AND status = 'completed'
        """)
        
        return {
            "total_revenue": float(revenue_res["total"]) if revenue_res else 0.0,
            "total_orders": int(orders_res["total"]) if orders_res else 0,
            "pending_orders": int(orders_res["pending"]) if orders_res else 0,
            "completed_orders": int(orders_res["completed"]) if orders_res else 0,
            "failed_orders": int(orders_res["failed"]) if orders_res else 0,
            "total_users": int(users_res["total"]) if users_res else 0,
            "today_revenue": float(today_res["revenue"]) if today_res else 0.0,
            "today_orders": int(today_res["orders"]) if today_res else 0,
        }
    except Exception as e:
        logging.error(f"[OrderService] get_stats error: {e}")
        raise e
