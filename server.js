const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
const fs = require("fs");
const multer = require("multer");


const { Mutex } = require("async-mutex");

const app = express();
const server = http.createServer(app); // Use HTTP server to support both Express and Socket.io
const io = socketIo(server);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Track the number of connected clients
let clientCount = 0;
const MAX_CLIENTS = 2; // Set the maximum number of clients allowed

let textBox = "defaultText";
const mutex = new Mutex(); // Create a mutex for locking
const mutexUploadFile = new Mutex(); // Create a mutex for locking

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // Store uploaded files in 'uploads' directory
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Retain original file name
    }
});
const upload = multer({ storage: storage });

// Serve index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/getTextFromServer", (req, res) => {
    res.json({ message: textBox });
});

app.get("/getFilesFromServer", (req, res) => {
    try {
        const files = fs.readdirSync(uploadDir);
        res.json({ files: files });
    } catch (err) {
        console.error("Error reading upload directory:", err);
    }
});

app.get("/downloadAllFilesFromServer", (req, res) => {
    try {
        const files = fs.readdirSync(uploadDir);
        res.json({ files: files });
    } catch (err) {
        console.error("Error reading upload directory:", err);
        res.status(500).json({ error: "Error reading upload directory" });
    }
});

app.get("/download/:fileName", (req, res) => {
    const fileName = req.params.fileName;
    const filePath = path.join(uploadDir, fileName);
    res.download(filePath, fileName, (err) => {
        if (err) {
            console.error("Error downloading file:", err);
            res.status(500).json({ error: "Error downloading file" });
        }
    });
});

app.post("/updateTextFromServer", async (req, res) => {
    const text = req.body.text;
    if (text === undefined) {
        return res.status(400).json({ error: "Text is required" });
    }

    // Acquire lock using mutex
    const release = await mutex.acquire();

    try {
        // Update text
        textBox = text;

        res.json({ message: "Text updated successfully" });

        // Emit textUpdated event to all connected clients
        io.emit('textUpdated', { text: textBox });
    } finally {
        // Release lock
        release();
    }
});

app.post("/uploadFilesOnServer", upload.array("files"), (req, res) => {
    console.log("Received upload request:");
    console.log("Form Data:", req.body);
    console.log("Uploaded Files:", req.files);

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded!" });
    }

    const fileNames = req.files.map(file => file.originalname);
    res.json({ message: "File(s) uploaded successfully!", files: fileNames });


    // Emit filesUpdated event to all connected clients with the list of all files in the upload directory
    try {
        const files = fs.readdirSync(uploadDir);
        io.emit('filesUpdated', { files: files });
        // res.json({ message: "File(s) uploaded successfully!", files: fileNames });
    } catch (err) {
        console.error("Error reading upload directory:", err);
        // res.status(500).json({ message: "Error reading upload directory" });
    }
});

app.post('/deleteAllFilesFromServer', async (req, res) => {
    const release = await mutexUploadFile.acquire();

    try {
        const files = fs.readdirSync(uploadDir);

        if (files.length === 0) {
            res.json({ message: "No files to delete!" });
        } else {
            for (const file of files) {
                fs.unlinkSync(path.join(uploadDir, file));
            }
            res.json({ message: "All files deleted successfully!" });

            // Emit filesUpdated event to all connected clients with an empty list
            io.emit('filesDeleteAll', { files: [] });
        }
    } catch (err) {
        console.error("Error deleting files:", err);
        res.status(500).json({ message: "Error deleting files" });
    } finally {
        release();
    }
});

// Socket.io connection and disconnection for client count tracking
io.on("connection", (socket) => {
    if (clientCount >= MAX_CLIENTS) {
        // Reject the connection if the limit is reached
        socket.emit("connection_rejected", {
            message: `Server has reached the maximum number of clients (${MAX_CLIENTS}). Please try again later.`
        });
        socket.disconnect();
        return;
    }

    clientCount++; // Increment client count on new connection
    console.log(`A new client connected! Total clients: ${clientCount}`); // Log to server console

    // Handle disconnection
    socket.on("disconnect", () => {
        clientCount--; // Decrement client count on disconnection
        console.log(`A client disconnected! Total clients: ${clientCount}`); // Log to server console
    });
});

// Start server
const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
