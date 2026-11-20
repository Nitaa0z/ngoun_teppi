from flask import Flask, render_template, request, jsonify, session, send_from_directory
import mysql.connector
import os
from werkzeug.utils import secure_filename
import time

app = Flask(__name__)
app.secret_key = 'Alexmey099_Super_Secret_Key_2026!'  # <--- Add this line here!

def get_db_connection():
    return mysql.connector.connect(
        host=os.environ.get("DB_HOST"),
        port=int(os.environ.get("DB_PORT", 4000)),
        user=os.environ.get("DB_USER"),
        password=os.environ.get("DB_PASS"),
        database=os.environ.get("DB_NAME"),
        ssl_disabled=False
    )

# 1. Route to serve the main frontend website
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json()
    password = data.get('password') if data else None
    
    if password == 'Alexmey099':
        session['is_admin'] = True  # Save login state in Flask session
        return jsonify({"success": True, "message": "Logged in successfully!"}), 200
    else:
        return jsonify({"success": False, "message": "Incorrect password"}), 401

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('is_admin', None)
    return jsonify({"success": True, "message": "Logged out."}), 200

@app.route('/api/admin/check', methods=['GET'])
def check_admin():
    return jsonify({"isAdmin": session.get('is_admin', False)})

# 2. API Route to get all products
@app.route('/api/products', methods=['GET'])
def get_products():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM products")
    products = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(products)

# Set a folder where uploaded images will be stored
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/products', methods=['POST'])
def add_product():
    # 1. Security Check: Block anyone not logged in as Admin
    if not session.get('is_admin'):
        return jsonify({"error": "Unauthorized. Admin login required."}), 401

    # 2. Handle Image Upload (File Picker or Clipboard Paste)
    image_url = '/static/uploads/default.jpg'
    
    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename != '' and allowed_file(file.filename):
            # Add timestamp so pasted images ('image.png') don't overwrite each other
            safe_name = secure_filename(file.filename)
            unique_filename = f"{int(time.time())}_{safe_name}"
            
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            file.save(os.path.join(UPLOAD_FOLDER, unique_filename))
            image_url = f'/static/uploads/{unique_filename}'

    # 3. Extract Form Data
    brand = request.form.get('brand')
    model = request.form.get('model')
    ram = request.form.get('ram')
    storage = request.form.get('storage')
    price = request.form.get('price')
    condition_notes = request.form.get('condition_notes')

    # Basic validation
    if not all([brand, model, ram, storage, price]):
        return jsonify({"error": "Missing required phone fields."}), 400

    # 4. Save to MySQL Database
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = """
            INSERT INTO products (brand, model, ram, storage, price, condition_notes, image_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (brand, model, ram, storage, price, condition_notes, image_url))
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            "message": "Product added successfully!",
            "image_url": image_url
        }), 201

    except Exception as e:
        print("Database error while adding product:", e)
        return jsonify({"error": "Database error occurred."}), 500

# 1. Fetch all orders (GET)
@app.route('/api/orders', methods=['GET'])
def get_orders():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT o.*, p.brand, p.model, p.price
        FROM orders o
        LEFT JOIN products p ON o.product_id = p.id
        ORDER BY o.created_at DESC
    """
    cursor.execute(query)
    orders = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(orders), 200

@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.json
    product_id = data.get('product_id')
    customer_name = data.get('customer_name')
    customer_phone = data.get('customer_phone')
    order_type = data.get('order_type', 'Store Pickup')
    delivery_address = data.get('delivery_address', 'Store Pickup')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Automatically ensure all required columns exist with safe defaults
    columns_to_check = [
        "ALTER TABLE orders ADD COLUMN order_type VARCHAR(50)",
        "ALTER TABLE orders ADD COLUMN delivery_address TEXT",
        "ALTER TABLE orders ADD COLUMN total_price DECIMAL(10,2) DEFAULT 15.00",
        "ALTER TABLE orders ADD COLUMN deposit_amount DECIMAL(10,2) DEFAULT 15.00"
    ]
    
    for sql in columns_to_check:
        try:
            cursor.execute(sql)
        except Exception:
            pass # Column already exists

    # Insert the order with explicit values for total and deposit
    query = """
        INSERT INTO orders (product_id, customer_name, customer_phone, order_type, delivery_address, total_price, deposit_amount)
        VALUES (%s, %s, %s, %s, %s, 15.00, 15.00)
    """
    cursor.execute(query, (product_id, customer_name, customer_phone, order_type, delivery_address))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Order placed successfully!"}), 201

# 2. Mark an order as completed and remove the sold phone from stock
@app.route('/api/orders/<int:order_id>/complete', methods=['POST'])
def complete_order(order_id):
    data = request.json
    product_id = data.get('product_id')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Remove the phone from active storefront products
    if product_id:
        cursor.execute("DELETE FROM products WHERE id = %s", (product_id,))
        
    # Remove or archive the completed order
    cursor.execute("DELETE FROM orders WHERE id = %s", (order_id,))
    
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Phone marked as sold and inventory updated!"}), 200

@app.route('/api/orders/<int:order_id>', methods=['DELETE'])
def delete_order(order_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)  # Use dictionary=True (or DictCursor) so we can access column names easily
        
        # 1. Find out which phone (product_id) was ordered before deleting the order
        cursor.execute("SELECT product_id FROM orders WHERE id = %s", (order_id,))
        order = cursor.fetchone()
        
        if order and order.get('product_id'):
            product_id = order['product_id']
            # 2. Delete the phone from available products (or set status = 'Sold' if you prefer)
            cursor.execute("DELETE FROM products WHERE id = %s", (product_id,))
            
        # 3. Delete the completed order from the orders table
        cursor.execute("DELETE FROM orders WHERE id = %s", (order_id,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({"success": True, "message": "Order completed and phone marked as sold!"}), 200
        
    except Exception as e:
        print("Error completing order:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    # Security check: ensure only an authenticated admin can delete products
    if not session.get('is_admin'):
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM products WHERE id = %s", (product_id,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({"success": True, "message": "Product deleted!"}), 200
        
    except Exception as e:
        print("Error deleting product:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(
        os.path.join(app.root_path, 'static'),
        'favicon.png'
    )

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)