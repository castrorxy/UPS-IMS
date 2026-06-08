import sqlite3
import os
DB = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'inventory.db')
if not os.path.exists(DB):
    print('DB not found:', DB)
    raise SystemExit(1)
conn = sqlite3.connect(DB)
cur = conn.cursor()
cur.execute("UPDATE inventory SET status='ON STOCK' WHERE UPPER(status)='IN STOCK'")
# Also set category to 'UPS' for stock_no 1..238
cur.execute("UPDATE inventory SET category='UPS' WHERE CAST(stock_no AS INTEGER) BETWEEN 1 AND 238")
# For inventory_options, avoid UNIQUE constraint conflict by checking existing 'ON STOCK'
exists = cur.execute("SELECT 1 FROM inventory_options WHERE category='status' AND UPPER(value)='ON STOCK'").fetchone()
if exists:
    # if ON STOCK already present, remove legacy IN STOCK rows
    cur.execute("DELETE FROM inventory_options WHERE category='status' AND UPPER(value)='IN STOCK'")
else:
    cur.execute("UPDATE inventory_options SET value='ON STOCK' WHERE category='status' AND UPPER(value)='IN STOCK'")
conn.commit()
print('rows_changed:', conn.total_changes)
conn.close()
