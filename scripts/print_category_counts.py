import sqlite3, os
DB = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'inventory.db')
conn = sqlite3.connect(DB)
c = conn.cursor()
c.execute("SELECT COUNT(*) FROM inventory WHERE TRIM(UPPER(category))='UPS'")
print('UPS_count:', c.fetchone()[0])
c.execute("SELECT COUNT(*) FROM inventory WHERE TRIM(UPPER(category))='AVR'")
print('AVR_count:', c.fetchone()[0])
conn.close()
