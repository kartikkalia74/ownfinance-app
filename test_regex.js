const re = /^(\d{2}\/\d{2}\/\d{4})(?:\s+(.*?))?\s+([\d.,]+)\s+(CR|DR)\s+([\d.,]+)(?:\s+(.+))?$/;
const lines = [
    "06/01/2026  0.89  DR  60142.63  SMS CHRG FOR:01-10-2025to31-12-2025",
    "27/12/2025  2.0  CR  60143.52  RCRADJ/108831520539/RRC/26122025",
    "25/12/2025  74.0  DR  60141.52  UPI/DR/224694448136/PAWANA",
    "P/PUNB/pawanapuri48@ok/",
    "UPI/DR/108831520539/DASHVERS/ICIC/dashvers",
    "25/12/2025  2.0  DR  60215.52",
    "eindia./",
    "03/12/2025  373.0  CR  60217.52  6670001500000894:Int.Pd:01-09-2025 to 30-11-",
    "2025",
    "28/11/2025  59844.52  CR  59844.52",
    "Ac xfr from Sol 667000 to 089000",
    "28/11/2025  59844.52  DR  0.0",
];

lines.forEach(l => {
    const match = l.match(re);
    console.log(l);
    if (match) {
        console.log("  MATCHES:", match.slice(1));
    } else {
        console.log("  NO MATCH");
    }
});
