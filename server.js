require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const midtransClient =
require("midtrans-client");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));


// MYSQL
const db = mysql.createConnection({

    host: "localhost",
    user: "root",
    password: "",
    database: "kasir_sekolah"
});

db.connect((err) => {

    if (err) {

        console.log(err);
        return;
    }

    console.log("MySQL Connected");
});


// MIDTRANS
let snap =
new midtransClient.Snap({

    isProduction: false,

    serverKey:
    "process.env.MIDTRANS_SERVER_KEY",
});


// ==========================
// TAMBAH BARANG
// ==========================
app.post("/tambah-barang", (req, res) => {

    const {
        barcode,
        nama,
        harga,
        stok
    } = req.body;

    const sql = `
        INSERT INTO barang
        (barcode, nama, harga, stok)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [barcode, nama, harga, stok],
        (err, result) => {

            if (err) {

                console.log(err);
                return;
            }

            res.send(
                "Barang ditambahkan"
            );
        }
    );
});


// ==========================
// GET BARANG
// ==========================
app.get("/barang", (req, res) => {

    db.query(
        "SELECT * FROM barang ORDER BY id DESC",

        (err, result) => {

            if (err) {

                console.log(err);
                return;
            }

            res.json(result);
        }
    );
});


// ==========================
// HAPUS BARANG
// ==========================
app.delete(
"/hapus-barang/:id",

(req, res) => {

    const id =
    req.params.id;

    db.query(
        "DELETE FROM barang WHERE id = ?",
        [id],

        (err, result) => {

            if (err) {

                console.log(err);
                return;
            }

            res.send(
                "Barang dihapus"
            );
        }
    );
});


// ==========================
// CHECKOUT
// ==========================
app.post("/checkout", (req, res) => {

    const keranjang =
    req.body;

    keranjang.forEach((item) => {

        // TRANSAKSI
        db.query(
            `
            INSERT INTO transaksi
            (barcode,nama,harga,jumlah,subtotal)

            VALUES (?, ?, ?, ?, ?)
            `,

            [
                item.barcode,
                item.nama,
                item.harga,
                item.jumlah,
                item.subtotal
            ]
        );

        // UPDATE STOK
        db.query(
            `
            UPDATE barang
            SET stok = stok - ?
            WHERE id = ?
            `,

            [
                item.jumlah,
                item.id
            ]
        );
    });

    res.send(
        "Checkout berhasil"
    );
});


// ==========================
// PAYMENT
// ==========================
app.post("/payment", async (req, res) => {

    try {

        const total =
        req.body.total;

        console.log(total);

        const parameter = {

            transaction_details: {

                order_id:
                "ORDER-" + Date.now(),

                gross_amount:
                Math.round(total)
            }
        };

        const transaction =
        await snap.createTransaction(
            parameter
        );

        res.json({

            token:
            transaction.token,

            redirect_url:
            transaction.redirect_url
        });

    } catch(error) {

        console.log(error);

        res.status(500).json({
            error:
            "Payment gagal"
        });
    }
});


// ==========================
// SERVER
// ==========================
app.listen(3000, () => {

    console.log(
        "Server jalan di http://localhost:3000"
    );
});