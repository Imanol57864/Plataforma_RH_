const express = require('express');
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const BACKEND_URL = process.env.BACKEND_URL;
const ERROR_MESSAGE = process.env.ERROR_MESSAGE;

const { fetchPostgREST } = require('../utils/scripts/postgrestHelper');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads/permiso");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for permiso files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow images and common document types
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido'), false);
        }
    }
});

// ROUTE: Upload file (FilePond process endpoint)
router.post('/upload', upload.single("filepond"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        console.log("req.body: ", req.body);

        const entidad_nombre = req.body.entidad_nombre || null; // Get from form data if provided
        const entidad_id = req.body.permiso_id || null; // Get from form data if provided

        console.log("entidad_id: ", entidad_id);
        return ;


        // Prepare file metadata for database
        const fileMetadata = {
            entidad_nombre: entidad_nombre,
            entidad_id: entidad_id, // This might be null for new permissions
            nombre_original: req.file.originalname,
            nombre_almacenado: req.file.filename,
            mime_type: req.file.mimetype,
            tamano: req.file.size,
            ruta_archivo: `/uploads/permiso/${req.file.filename}`
        };

        console.log("metadata: ", fileMetadata);

        // Save file metadata to database
        const pgRestRequest = {
            fetchMethod: 'POST',
            fetchUrl: `${BACKEND_URL}/archivo`,
            fetchBody: fileMetadata
        };

        const response = await fetchPostgREST(pgRestRequest);

        console.log("response upload: ", response);

        if (!response.ok) {
            // If database save fails, delete the uploaded file
            const filePath = path.join(uploadsDir, req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            console.error('Database error:', response.data);
            return res.status(500).json({ error: ERROR_MESSAGE + '009' });
        }

        // Return file ID for FilePond (use the database ID or filename)
        const dbRecord = response.data[0]; // PostgreSQL returns array

        res.json({
            id: dbRecord?.id || req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            serverId: req.file.filename
        });

    } catch (error) {
        console.error('Upload error:', error);

        // Clean up file if exists
        if (req.file) {
            const filePath = path.join(uploadsDir, req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        res.status(500).json({ error: "Upload failed" });
    }
});

// ROUTE: List files for a specific permission (FilePond load endpoint)
router.get('/files/:permisoId', async (req, res) => {
    try {
        const permisoId = req.params.permisoId;

        // Build query URL
        let fetchUrl = `${BACKEND_URL}/archivo?entidad_nombre=eq.permiso`;
        if (permisoId) {
            fetchUrl += `&entidad_id=eq.${permisoId}`; // <- entindad id must not be null (send it from frontend)
        }
        fetchUrl += '&select=id,nombre_original,nombre_almacenado,tamano,mime_type';

        const pgRestRequest = {
            fetchMethod: 'GET',
            fetchUrl: fetchUrl
        };

        const response = await fetchPostgREST(pgRestRequest);

        if (!response.ok) {
            console.error('Database error:', response.data);
            return res.status(500).json({ error: ERROR_MESSAGE + '010' });
        }

        // Format for FilePond
        const fileList = (response.data || []).map(file => ({
            id: file.nombre_almacenado,
            originalName: file.nombre_original,
            size: file.tamano,
            serverId: file.nombre_almacenado
        }));

        res.json(fileList);

    } catch (error) {
        console.error('List files error:', error);
        res.status(500).json({ error: "Failed to load files" });
    }
});

// ROUTE: Delete file (FilePond revert/remove endpoint)
router.delete('/upload/:fileId', async (req, res) => {
    try {
        const fileId = req.params.fileId;

        // Get file info from database first
        const pgRestRequest = {
            fetchMethod: 'GET',
            fetchUrl: `${BACKEND_URL}/archivo?nombre_almacenado=eq.${fileId}&select=id,nombre_almacenado`,
            fetchBody: null
        };

        const response = await fetchPostgREST(pgRestRequest);

        if (!response.ok) {
            return res.status(404).json({ error: "File not found in database" });
        }

        const fileRecord = response.data[0];
        if (!fileRecord) {
            return res.status(404).json({ error: "File record not found" });
        }

        // Delete from database
        const deleteRequest = {
            fetchMethod: 'DELETE',
            fetchUrl: `${BACKEND_URL}/archivo?id=eq.${fileRecord.id}`,
            fetchBody: null
        };

        const deleteResponse = await fetchPostgREST(deleteRequest);

        if (!deleteResponse.ok) {
            console.error('Database delete error:', deleteResponse.data);
            return res.status(500).json({ error: ERROR_MESSAGE + '011' });
        }

        // Delete physical file
        const filePath = path.join(uploadsDir, fileRecord.nombre_almacenado);
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (err) {
                console.error('Error deleting physical file:', err);
                // Don't fail the request if physical file deletion fails
            }
        }

        res.json({ deleted: fileId });

    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: "Delete failed" });
    }
});

// ROUTE: Serve uploaded files (FilePond load endpoint)
router.get('/uploads/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(uploadsDir, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).send("File not found");
        }

        // Get file info from database for proper headers
        const pgRestRequest = {
            fetchMethod: 'GET',
            fetchUrl: `${BACKEND_URL}/archivo?nombre_almacenado=eq.${filename}&select=nombre_original,mime_type`,
            fetchBody: null
        };

        const response = await fetchPostgREST(pgRestRequest);

        if (response.ok && response.data[0]) {
            const fileInfo = response.data[0];
            res.set({
                'Content-Type': fileInfo.mime_type || 'application/octet-stream',
                'Content-Disposition': `inline; filename="${fileInfo.nombre_original}"`
            });
        }

        res.sendFile(filePath);

    } catch (error) {
        console.error('Serve file error:', error);
        res.status(500).send("Error serving file");
    }
});

// ROUTE: View/Preview file (for file viewing functionality)
router.get('/view/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(uploadsDir, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).send("File not found");
        }

        // Get file info for proper content type
        const pgRestRequest = {
            fetchMethod: 'GET',
            fetchUrl: `${BACKEND_URL}/archivo?nombre_almacenado=eq.${filename}&select=nombre_original,mime_type`,
            fetchBody: null
        };

        const response = await fetchPostgREST(pgRestRequest);

        if (response.ok && response.data[0]) {
            const fileInfo = response.data[0];
            res.set({
                'Content-Type': fileInfo.mime_type || 'application/octet-stream',
                'Content-Disposition': `inline; filename="${fileInfo.nombre_original}"`
            });
        }

        res.sendFile(filePath);

    } catch (error) {
        console.error('View file error:', error);
        res.status(500).send("Error viewing file");
    }
});

// ROUTE: Download file
router.get('/download/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(uploadsDir, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).send("File not found");
        }

        // Get original filename from database
        const pgRestRequest = {
            fetchMethod: 'GET',
            fetchUrl: `${BACKEND_URL}/archivo?nombre_almacenado=eq.${filename}&select=nombre_original`,
            fetchBody: null
        };

        const response = await fetchPostgREST(pgRestRequest);

        let originalName = filename; // fallback
        if (response.ok && response.data[0]) {
            originalName = response.data[0].nombre_original;
        }

        res.download(filePath, originalName);

    } catch (error) {
        console.error('Download file error:', error);
        res.status(500).send("Error downloading file");
    }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large' });
        }
    }

    if (error.message === 'Tipo de archivo no permitido') {
        return res.status(400).json({ error: 'File type not allowed' });
    }

    console.error('Multer error:', error);
    res.status(500).json({ error: 'Upload error' });
});

module.exports = router;