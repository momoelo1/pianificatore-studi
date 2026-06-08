const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const router = express.Router();
const StudySession = require('../models/StudySession');
const authMiddleware = require('../middleware/authMiddleware');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'study-sessions',
        resource_type: 'auto',
    },
});

const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
];

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo di file non consentito. Usa PDF, Word, immagini o testo.'));
        }
    },
});

const handleUpload = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `Errore caricamento: ${err.message}` });
        }
        if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
};

// Deletes a file from Cloudinary using its secure URL.
// Parses resource_type (image/raw/video) from the URL so destroy() targets the right asset type.
const deleteCloudinaryFile = async (fileUrl) => {
    if (!fileUrl || !fileUrl.startsWith('http')) return;
    try {
        const matches = fileUrl.match(/\/(image|raw|video)\/upload\/(?:v\d+\/)?(.+)$/);
        if (!matches) return;
        const [, resourceType, rawPublicId] = matches;
        // Images have no extension in their public_id; raw/video files do
        const publicId = resourceType === 'image'
            ? rawPublicId.replace(/\.[^/.]+$/, '')
            : rawPublicId;
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err) {
        console.error('Errore eliminazione Cloudinary:', err);
    }
};

router.get('/', authMiddleware, async (req, res) => {
    try {
        const sessions = await StudySession.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(sessions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Errore nel recupero sessioni.' });
    }
});

router.post('/', authMiddleware, handleUpload, async (req, res) => {
    try {
        const newSession = new StudySession({
            subject: req.body.subject,
            topic: req.body.topic,
            studyData: req.body.studyData,
            priority: req.body.priority,
            user: req.user.id,
            fileName: req.file ? req.file.originalname : '',
            fileUrl: req.file ? req.file.path : '',
        });

        const savedSession = await newSession.save();
        res.status(201).json(savedSession);
    } catch (error) {
        if (req.file) await deleteCloudinaryFile(req.file.path);
        console.error(error);
        res.status(400).json({ message: 'Errore nella creazione della sessione.' });
    }
});

router.put('/:id/complete', authMiddleware, async (req, res) => {
    try {
        const updatedSession = await StudySession.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { completed: true },
            { returnDocument: 'after' }
        );

        if (!updatedSession) {
            return res.status(404).json({ message: 'Sessione non trovata.' });
        }

        res.json(updatedSession);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: "Errore nell'aggiornamento della sessione." });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const deletedSession = await StudySession.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id,
        });

        if (!deletedSession) {
            return res.status(404).json({ message: 'Sessione non trovata.' });
        }

        await deleteCloudinaryFile(deletedSession.fileUrl);

        res.json({ message: 'Sessione eliminata con successo.' });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Errore eliminazione sessione.' });
    }
});

module.exports = router;
