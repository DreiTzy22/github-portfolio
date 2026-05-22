// Polyfill Object.hasOwn for older Node.js versions (Node 14)
if (!Object.hasOwn) {
    Object.hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
}

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
    
// Ensure database file for messages exists
const messagesFile = path.join(__dirname, 'messages.json');
if (!fs.existsSync(messagesFile)) {
    fs.writeFileSync(messagesFile, JSON.stringify([], null, 2));
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only images are allowed!'));
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // Serve root static files
app.use('/uploads', express.static(uploadDir)); // Serve uploaded files

// Upload Endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// Contact Endpoint
app.post('/api/contact', (req, res) => {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    const newMessage = {
        id: Date.now(),
        name,
        email,
        subject: subject || 'No Subject',
        message,
        date: new Date().toISOString()
    };

    fs.readFile(messagesFile, 'utf8', (err, data) => {
        let messages = [];
        if (!err) {
            try {
                messages = JSON.parse(data);
            } catch (e) {
                messages = [];
            }
        }
        messages.push(newMessage);
        fs.writeFile(messagesFile, JSON.stringify(messages, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to save message' });
            }
            res.json({ success: true, message: 'Message sent successfully!' });
        });
    });
});

// Retrieve Messages (Optional: simple dashboard view)
app.get('/api/messages', (req, res) => {
    fs.readFile(messagesFile, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read messages' });
        }
        try {
            const messages = JSON.parse(data);
            res.json(messages);
        } catch (e) {
            res.status(500).json({ error: 'Invalid messages data' });
        }
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
