const tbody = document.getElementById("invoiceBody");
const total = document.getElementById("grandTotal");

function calculate(){

    let grand = 0;

    document.querySelectorAll("#invoiceBody tr").forEach(row=>{

        const qty = Number(row.querySelector(".qty").value);
        const price = Number(row.querySelector(".price").value);

        const subtotal = qty*price;

        row.querySelector(".lineTotal").innerText =
            "R"+subtotal.toFixed(2);

        grand += subtotal;

    });

    total.innerText = "R"+grand.toFixed(2);

}

document.addEventListener("input",calculate);

document.getElementById("addRow").onclick=()=>{

    tbody.insertAdjacentHTML("beforeend",`

<tr>

<td><input type="text" placeholder="Service"></td>

<td><input type="number" class="qty" value="1"></td>

<td><input type="number" class="price" value="0"></td>

<td class="lineTotal">R0.00</td>

</tr>

`);

};

document.getElementById("generateInvoice").onclick=()=>{

    alert("PDF Generator Coming Next!");

};

calculate();