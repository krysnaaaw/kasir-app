if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const midtransClient = require("midtrans-client");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ==========================
// ERROR HANDLER
// ==========================
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

// ==========================
// MYSQL POOL CONNECTION
// ==========================
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000
});

// TEST CONNECTION
db.getConnection((err, connection) => {

  if (err) {
    console.log("MySQL Error:", err);
    return;
  }

  console.log("MySQL Connected");

  connection.release();

  // ==========================
  // AUTO CREATE TABLE
  // ==========================
  db.query(`
  CREATE TABLE IF NOT EXISTS barang (
      id INT AUTO_INCREMENT PRIMARY KEY,
      barcode VARCHAR(100),
      nama VARCHAR(255),
      harga INT,
      stok INT
  )
  `, (err) => {

    if (err) {
      console.log("Table barang error:", err);
    } else {
      console.log("Table barang ready");
    }

  });

  db.query(`
  CREATE TABLE IF NOT EXISTS transaksi (
      id INT AUTO_INCREMENT PRIMARY KEY,
      barcode VARCHAR(100),
      nama VARCHAR(255),
      harga INT,
      jumlah INT,
      subtotal INT
  )
  `, (err) => {

    if (err) {
      console.log("Table transaksi error:", err);
    } else {
      console.log("Table transaksi ready");
    }

  });

});

// ==========================
// MIDTRANS
// ==========================
let snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY
});

// ==========================
// ROOT
// ==========================
app.get("/", (req, res) => {
  res.send("Backend aktif 🚀");
});

// ==========================
// PING
// ==========================
app.get("/ping", (req, res) => {
  res.send("pong");
});

// ==========================
// TAMBAH BARANG
// ==========================
app.post("/tambah-barang", (req, res) => {

  console.log(req.body);

  const { barcode, nama, harga, stok } = req.body;

  const sql = `
    INSERT INTO barang (barcode, nama, harga, stok)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [barcode, nama, harga, stok], (err) => {

    if (err) {
      console.log("Tambah barang error:", err);

      return res.status(500).json(err);
    }

    res.send("Barang ditambahkan");
  });
});

// ==========================
// GET BARANG
// ==========================
app.get("/barang", (req, res) => {

  console.log("Route /barang dipanggil");

  db.query(
    "SELECT * FROM barang ORDER BY id DESC",
    (err, result) => {

      if (err) {
        console.log("MYSQL:", err);

        return res.status(500).send("Error get barang");
      }

      res.json(result);
    }
  );
});

// ==========================
// HAPUS BARANG
// ==========================
app.delete("/hapus-barang/:id", (req, res) => {

  const id = req.params.id;

  db.query(
    "DELETE FROM barang WHERE id = ?",
    [id],
    (err) => {

      if (err) {
        console.log(err);

        return res.status(500).send("Error hapus barang");
      }

      res.send("Barang dihapus");
    }
  );
});

// ==========================
// CHECKOUT
// ==========================
app.post("/checkout", (req, res) => {

  const keranjang = req.body;

  keranjang.forEach((item) => {

    db.query(`
      INSERT INTO transaksi
      (barcode, nama, harga, jumlah, subtotal)
      VALUES (?, ?, ?, ?, ?)
    `, [
      item.barcode,
      item.nama,
      item.harga,
      item.jumlah,
      item.subtotal
    ]);

    db.query(`
      UPDATE barang
      SET stok = stok - ?
      WHERE id = ?
    `, [
      item.jumlah,
      item.id
    ]);

  });

  res.send("Checkout berhasil");
});

// ==========================
// PAYMENT MIDTRANS
// ==========================
app.post("/payment", async (req, res) => {

  try {

    const total = req.body.total;

    const parameter = {
      transaction_details: {
        order_id: "ORDER-" + Date.now(),
        gross_amount: Math.round(total)
      }
    };

    const transaction =
    await snap.createTransaction(parameter);

    res.json({
      token: transaction.token,
      redirect_url: transaction.redirect_url
    });

  } catch (error) {

    console.log("Payment Error:", error);

    res.status(500).json({
      error: "Payment gagal"
    });

  }

});

// ==========================
// START SERVER
// ==========================
const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server jalan di port ${PORT}`);
});