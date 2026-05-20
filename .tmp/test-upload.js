const fs = require("fs");
const http = require("http");

const file = fs.readFileSync("public/test-upload.png");
const boundary = "----TestBoundary" + Date.now();

const header = [
  `--${boundary}`,
  `Content-Disposition: form-data; name="file"; filename="test.png"`,
  `Content-Type: image/png`,
  ``,
  ``
].join("\r\n");

const footer = `\r\n--${boundary}--\r\n`;

const body = Buffer.concat([
  Buffer.from(header),
  file,
  Buffer.from(footer),
]);

const opts = {
  hostname: "localhost",
  port: 3000,
  path: "/api/admin/upload-image",
  method: "POST",
  headers: {
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
    "Content-Length": body.length,
  },
};

const req = http.request(opts, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", data);

    if (res.statusCode === 200) {
      const parsed = JSON.parse(data);
      // Check the file was actually saved
      const filePath = "public" + parsed.secureUrl;
      if (fs.existsSync(filePath)) {
        console.log("SUCCESS: File saved at", filePath);
        console.log("File size:", fs.statSync(filePath).size, "bytes");
      } else {
        console.log("WARNING: File path returned but file not found at", filePath);
      }
    } else if (res.statusCode === 403) {
      console.log("NOTE: 403 Forbidden is expected - the API requires admin auth.");
      console.log("The upload route is working correctly (rejecting unauthenticated requests).");
    }
  });
});

req.on("error", (e) => console.log("Connection Error:", e.message));
req.write(body);
req.end();
