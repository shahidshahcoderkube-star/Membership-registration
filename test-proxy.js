fetch("https://relatively-always-operational-hostel.trycloudflare.com/api/membership/initiate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ firstName: "Test" })
})
.then(res => Promise.all([res.status, res.text()]))
.then(([status, text]) => {
  console.log("STATUS:", status);
  console.log("BODY START ===\n" + text.substring(0, 500) + "\n=== BODY END");
})
.catch(err => console.error("Error:", err));
