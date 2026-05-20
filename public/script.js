const API_URL = "https://kasir-app-production-777.up.railway.app";

let currentRole = "";
let keranjang = [];

const users = [
    {
        username: "admin",
        password: "admin123",
        role: "admin"
    },
    {
        username: "user",
        password: "user123",
        role: "user"
    }
];


// ==========================
// LOGIN
// ==========================
function login() {

    const username = document.getElementById("username").value;

    const password = document.getElementById("password").value;

    const user = users.find(u =>
        u.username === username &&
        u.password === password
    );

    if (!user) {
        alert("Login gagal");
        return;
    }

    currentRole = user.role;

    localStorage.setItem("role", user.role);

    masukAplikasi();
}

function masukAplikasi() {

    document.getElementById("login-box").style.display = "none";

    document.getElementById("app").style.display = "block";

    document.getElementById("role-info").innerText =
    `Login sebagai ${currentRole}`;

    // USER
    if (currentRole === "user") {

        document.getElementById("admin-panel").style.display = "none";

        document.getElementById("add-item").style.display = "none";
    }

    // ADMIN
    else if (currentRole === "admin") {

        document.getElementById("cart-box").style.display = "none";

        document.querySelector(".summary-box").style.display = "none";

        document.getElementById("receipt-box").style.display = "none";
    }

    tampilkanData();
}

function logout() {

    localStorage.removeItem("role");

    location.reload();
}


// ==========================
// GENERATE BARCODE
// ==========================
function generateBarcode() {
    return "BRG-" + Date.now();
}


// ==========================
// TAMBAH BARANG
// ==========================
document
.getElementById("add-item")
.addEventListener("click", tambahBarang);

async function tambahBarang() {

    const barcodeInput = document.getElementById("item-barcode");

    const nameInput = document.getElementById("item-name");

    const priceInput = document.getElementById("item-price");

    const stockInput = document.getElementById("item-stock");

    let barcode = barcodeInput.value || generateBarcode();

    let nama = nameInput.value;

    let harga = parseInt(priceInput.value);

    let stok = parseInt(stockInput.value);

    if (nama === "" || isNaN(harga) || isNaN(stok)) {

        alert("Isi data dengan benar");

        return;
    }

    const data = {
        barcode,
        nama,
        harga,
        stok
    };

    try {

        const response = await fetch(`${API_URL}/tambah-barang`, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(data)
        });

        if (!response.ok) {
            alert("Gagal tambah barang");
            return;
        }

        tampilkanData();

        barcodeInput.value = "";
        nameInput.value = "";
        priceInput.value = "";
        stockInput.value = "";

    } catch (error) {
        console.log(error);
        alert("Server error");
    }
}


// ==========================
// TAMPILKAN BARANG
// ==========================
async function tampilkanData() {

    try {

        const response = await fetch(`${API_URL}/barang`);

        if (!response.ok) {
            console.log("API Error");
            return;
        }

        const barang = await response.json();

        const tbody = document.getElementById("cart-items");

        let data = "";

        barang.forEach((item) => {

            data += `
            <tr onclick="previewBarcode('${item.barcode}')">

                <td>${item.barcode}</td>

                <td>${item.nama}</td>

                <td>
                    Rp ${item.harga.toLocaleString('id-ID')}
                </td>

                <td>${item.stok}</td>

                <td>

                ${
                    currentRole === "admin"

                    ?

                    `
                    <button
                    onclick="
                    event.stopPropagation();
                    hapusBarang(${item.id})
                    ">
                        Hapus
                    </button>
                    `

                    :

                    `
                    <div class="qty-buttons">

                        <button
                        onclick="
                        event.stopPropagation();
                        kurangKeranjang(${item.id})
                        ">
                            -
                        </button>

                        <button
                        onclick="
                        event.stopPropagation();
                        tambahKeranjang(
                            ${item.id},
                            '${item.barcode}',
                            '${item.nama}',
                            ${item.harga}
                        )
                        ">
                            +
                        </button>

                    </div>
                    `
                }

                </td>

            </tr>
            `;
        });

        tbody.innerHTML = data;

    } catch (error) {
        console.log(error);
    }
}


// ==========================
// PREVIEW BARCODE
// ==========================
function previewBarcode(barcode) {

    JsBarcode("#barcode-preview", barcode, {
        format: "CODE128",
        width: 1.5,
        height: 60,
        displayValue: true
    });

    document.getElementById("barcode-text").innerText = barcode;
}


// ==========================
// HAPUS BARANG
// ==========================
async function hapusBarang(id) {

    await fetch(`${API_URL}/hapus-barang/${id}`, {
        method: "DELETE"
    });

    tampilkanData();
}


// ==========================
// TAMBAH KERANJANG
// ==========================
function tambahKeranjang(id, barcode, nama, harga) {

    let item = keranjang.find(x => x.id === id);

    if (item) {

        item.jumlah++;

        item.subtotal = item.jumlah * item.harga;
    }

    else {

        keranjang.push({
            id,
            barcode,
            nama,
            harga,
            jumlah: 1,
            subtotal: harga
        });
    }

    tampilkanKeranjang();
}


// ==========================
// KURANG KERANJANG
// ==========================
function kurangKeranjang(id) {

    let item = keranjang.find(x => x.id === id);

    if (!item) return;

    item.jumlah--;

    item.subtotal = item.jumlah * item.harga;

    if (item.jumlah <= 0) {

        keranjang = keranjang.filter(x => x.id !== id);
    }

    tampilkanKeranjang();
}


// ==========================
// TAMPILKAN KERANJANG
// ==========================
function tampilkanKeranjang() {

    const list = document.getElementById("keranjang");

    let data = "";
    let total = 0;

    keranjang.forEach((item) => {

        total += item.subtotal;

        data += `
        <li>
            ${item.nama}
            (${item.jumlah}x)
            -
            Rp ${item.subtotal.toLocaleString('id-ID')}
        </li>
        `;
    });

    let diskon = 0;

    if (total > 100000) {
        diskon = total * 0.10;
    }

    let setelahDiskon = total - diskon;

    let ppn = setelahDiskon * 0.11;

    let totalAkhir = setelahDiskon + ppn;

    list.innerHTML = data;

    document.getElementById("subtotal-price").innerText =
    `Rp ${total.toLocaleString('id-ID')}`;

    document.getElementById("discount-price").innerText =
    `Rp ${diskon.toLocaleString('id-ID')}`;

    document.getElementById("tax-price").innerText =
    `Rp ${ppn.toLocaleString('id-ID')}`;

    document.getElementById("total-payment").innerText =
    `Rp ${totalAkhir.toLocaleString('id-ID')}`;
}


// ==========================
// CHECKOUT
// ==========================
async function checkout() {

    if (keranjang.length === 0) {
        alert("Keranjang kosong");
        return;
    }

    let total = 0;

    keranjang.forEach((item) => {
        total += item.subtotal;
    });

    let diskon = 0;

    if (total > 100000) {
        diskon = total * 0.10;
    }

    let setelahDiskon = total - diskon;

    let ppn = setelahDiskon * 0.11;

    let totalAkhir = setelahDiskon + ppn;

    try {

        await fetch(`${API_URL}/checkout`, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(keranjang)
        });

        const response = await fetch(`${API_URL}/payment`, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                total: Math.round(totalAkhir)
            })
        });

        const result = await response.json();

        buatStruk();

        if (result.redirect_url) {

            window.location.href = result.redirect_url;

        } else {

            console.log(result);
            alert("Payment gagal");
        }

        keranjang = [];

        tampilkanKeranjang();

        tampilkanData();

    } catch (error) {
        console.log(error);
        alert("Checkout gagal");
    }
}


// ==========================
// BUAT STRUK
// ==========================
function buatStruk() {

    const receipt = document.getElementById("receipt-content");

    let html = "";
    let total = 0;

    keranjang.forEach((item) => {

        total += item.subtotal;

        html += `
        <div class="receipt-item">

            <span>
                ${item.nama}
                (${item.jumlah}x)
            </span>

            <span>
                Rp ${item.subtotal.toLocaleString('id-ID')}
            </span>

        </div>
        `;
    });

    let diskon = 0;

    if (total > 100000) {
        diskon = total * 0.10;
    }

    let setelahDiskon = total - diskon;

    let ppn = setelahDiskon * 0.11;

    let totalAkhir = setelahDiskon + ppn;

    html += `

    <div class="receipt-item">
        <span>Subtotal</span>
        <span>Rp ${total.toLocaleString('id-ID')}</span>
    </div>

    <div class="receipt-item">
        <span>Diskon</span>
        <span>Rp ${diskon.toLocaleString('id-ID')}</span>
    </div>

    <div class="receipt-item">
        <span>PPN 11%</span>
        <span>Rp ${ppn.toLocaleString('id-ID')}</span>
    </div>

    <div class="receipt-total">
        TOTAL :
        Rp ${totalAkhir.toLocaleString('id-ID')}
    </div>
    `;

    receipt.innerHTML = html;
}


// ==========================
// PRINT STRUK
// ==========================
function printStruk() {

    const isi = document.getElementById("receipt-box").innerHTML;

    const win = window.open("", "", "width=400,height=700");

    win.document.write(`
        <html>

        <head>
            <title>Print Struk</title>
        </head>

        <body>
            ${isi}
        </body>

        </html>
    `);

    win.document.close();

    win.print();
}


// ==========================
// AUTO LOGIN
// ==========================
window.onload = () => {

    const savedRole = localStorage.getItem("role");

    if (savedRole) {

        currentRole = savedRole;

        masukAplikasi();
    }
};