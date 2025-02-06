const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
const fs = require("fs");

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

// Serve index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/getTextFromServer", (req, res) => {
    res.json({ message: textBox });
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