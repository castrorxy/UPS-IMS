import sqlite3, os
DB = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'inventory.db')
if not os.path.exists(DB):
    print('DB not found:', DB); raise SystemExit(1)
conn = sqlite3.connect(DB)
cur = conn.cursor()
cur.execute("UPDATE inventory SET category='UPS' WHERE CAST(stock_no AS INTEGER) BETWEEN 1 AND 238")
conn.commit()
print('rows_changed:', conn.total_changes)
conn.close()
