from flask import Flask, render_template, request, jsonify, session, send_from_directory
import mysql.connector
import os
import time
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "Alexmey099_Super_Secret_Key_2026!")

UPLOAD_FOLDER = os.path.join(app.root_path, "static", "uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
STORE_LAT = 11.586605
STORE_LNG = 104.909967

def get_db_connection():
    return mysql.connector.connect(
        host=os.environ.get("DB_HOST"),
        port=int(os.environ.get("DB_PORT", 4000)),
        user=os.environ.get("DB_USER"),
        password=os.environ.get("DB_PASS"),
        database=os.environ.get("DB_NAME", "test"),
        ssl_disabled=False,
    )


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json(silent=True) or {}
    password = data.get("password")

    if password == "Alexmey099":
        session["is_admin"] = True
        return jsonify({"success": True, "message": "Logged in successfully!"}), 200
    return jsonify({"success": False, "message": "Incorrect password"}), 401


@app.route("/api/admin/logout", methods=["POST"])
def admin_logout():
    session.pop("is_admin", None)
    return jsonify({"success": True, "message": "Logged out."}), 200


@app.route("/api/admin/check", methods=["GET"])
def check_admin():
    is_admin = bool(session.get("is_admin", False))
    return jsonify({"logged_in": is_admin, "is_admin": is_admin, "isAdmin": is_admin}), 200


@app.route("/api/products", methods=["GET"])
def get_products():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM products ORDER BY id DESC")
    products = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(products), 200


@app.route("/api/products", methods=["POST"])
def add_product():
    if not session.get("is_admin"):
        return jsonify({"error": "Unauthorized. Admin login required."}), 401

    image_url = ""
    if "image" in request.files:
        file = request.files["image"]
        if file and file.filename and allowed_file(file.filename):
            safe_name = secure_filename(file.filename)
            unique_filename = f"{int(time.time())}_{safe_name}"
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            file.save(os.path.join(UPLOAD_FOLDER, unique_filename))
            image_url = f"/static/uploads/{unique_filename}"

    brand = (request.form.get("brand") or "").strip()
    model = (request.form.get("model") or "").strip()
    ram = (request.form.get("ram") or "").strip()
    storage = (request.form.get("storage") or "").strip()
    price = (request.form.get("price") or "").strip()
    condition_notes = (
        request.form.get("condition_notes")
        or request.form.get("condition")
        or ""
    ).strip()

    if not all([brand, model, ram, storage, price]):
        return jsonify({"error": "Missing required phone fields."}), 400

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
        return jsonify({"message": "Product added successfully!", "image_url": image_url}), 201
    except Exception as e:
        print("Database error while adding product:", e)
        return jsonify({"error": "Database error occurred."}), 500


@app.route("/api/products/<int:product_id>", methods=["DELETE"])
def delete_product(product_id):
    if not session.get("is_admin"):
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
        print("Error deleting product:", e)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/orders", methods=["GET"])
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


@app.route("/api/orders", methods=["POST"])
def create_order():
    data = request.get_json(silent=True) or {}
    product_id = data.get("product_id")
    customer_name = data.get("customer_name")
    customer_phone = data.get("customer_phone")
    order_type = data.get("order_type", "Store Pickup")
    delivery_address = data.get("delivery_address", "Store Pickup")
    customer_lat = data.get("customer_lat")
    customer_lng = data.get("customer_lng")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        columns_to_check = [
            "ALTER TABLE orders ADD COLUMN order_type VARCHAR(50)",
            "ALTER TABLE orders ADD COLUMN delivery_address TEXT",
            "ALTER TABLE orders ADD COLUMN customer_lat DOUBLE NULL",
            "ALTER TABLE orders ADD COLUMN customer_lng DOUBLE NULL",
            "ALTER TABLE orders ADD COLUMN total_price DECIMAL(10,2) DEFAULT 15.00",
            "ALTER TABLE orders ADD COLUMN deposit_amount DECIMAL(10,2) DEFAULT 15.00",
        ]
        for sql in columns_to_check:
            try:
                cursor.execute(sql)
            except Exception:
                pass

        query = """
            INSERT INTO orders (
                product_id, customer_name, customer_phone, order_type,
                delivery_address, customer_lat, customer_lng, total_price, deposit_amount
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, 15.00, 15.00)
        """
        cursor.execute(
            query,
            (
                product_id,
                customer_name,
                customer_phone,
                order_type,
                delivery_address,
                customer_lat,
                customer_lng,
            ),
        )
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify(
            {
                "message": "Order placed successfully!",
                "store_lat": STORE_LAT,
                "store_lng": STORE_LNG,
            }
        ), 201
    except Exception as e:
        print("Error creating order:", e)
        return jsonify({"error": "Failed to place order."}), 500


@app.route("/api/orders/<int:order_id>", methods=["DELETE"])
def delete_order(order_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT product_id FROM orders WHERE id = %s", (order_id,))
        order = cursor.fetchone()

        if order and order.get("product_id"):
            cursor.execute("DELETE FROM products WHERE id = %s", (order["product_id"],))

        cursor.execute("DELETE FROM orders WHERE id = %s", (order_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"success": True, "message": "Order completed and phone marked as sold!"}), 200
    except Exception as e:
        print("Error completing order:", e)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/favicon.ico")
def favicon():
    favicon_path = os.path.join(app.root_path, "static", "favicon.png")
    if os.path.exists(favicon_path):
        return send_from_directory(os.path.join(app.root_path, "static"), "favicon.png")
    return "", 204


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)