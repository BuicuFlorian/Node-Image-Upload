'use strict';

const express = require('express');
const app = express();
const multer = require('multer');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const path = require('path');
const crypto = require('crypto');

const port = process.env.PORT || 8000;
const storagePath = path.join(__dirname, '/storage/');

// Get all data of the body (POST) parameters
// Parse application/json 
app.use(bodyParser.json());

// Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// Set the static files location
app.use(express.static(__dirname + '/client'));
app.use(express.static(storagePath));

// Use morgan middleware to log HTTP requests
app.use(morgan('dev'));

// Set the storage with multer
const storage = multer.diskStorage({
    // Indicates where you want to save your files
    destination: (req, file, callback) => {
        callback(null, storagePath);
    },
    // Indicates how you want your files named
    filename: (req, file, callback) => {
        // Using crypto, generate a random 21 character 
        // string and attach the extension using mime
        crypto.pseudoRandomBytes(21, (err, raw) => {
            if (err) return callback(err);
            callback(null, raw.toString('hex') + Date.now() + path.extname(file.originalname));
        });
    }
});

// Set multer options object
const upload = multer({
    // Where to store the files
    storage: storage,
    // Function to control which files are accepted
    fileFilter: (req, file, callback) => {
        const ext = path.extname(file.originalname);
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return callback(new Error('Only images are allowed!'))
        }
        callback(null, true);
    },
    // Limits of the uploaded data
    limits: {
        files: 1,
        fileSize: 1024 * 1024 * 5 // 5MB max file size
    }
}).single('imageToUpload');

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/client/index.html'));
});

app.post('/api/image', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(422).json({ 'errorMsg': 'The file size can not exceed 5MB!' });
            } else if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(422).json({ 'errorMsg': 'Too many files!' });
            } else if (err instanceof Error) {
                return res.status(422).json({ 'errorMsg': 'Only images are allowed!' });
            }
        }

        const filePath = `${req.protocol}://${req.host}:${port}/api/storage/${req.file.filename}`;
        res.send({
            'successMsg': 'File uploaded successfully',
            'image': filePath
        });
    });
});

app.get('/api/storage/:image', (req, res) => {
    res.sendFile(storagePath + req.params.image);
});

// Start app at http://localhost:8000
app.listen(port, () => {
    console.log(`Magic happens at: http://localhost:${port}`);
});