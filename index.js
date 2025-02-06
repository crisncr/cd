require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

// Inicializar la aplicación Express
const app = express();

// Configurar middleware
app.use(cors());
app.use(express.json());

// Configurar conexión a la base de datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// Ruta de prueba para verificar que el servidor esté funcionando
app.get("/", (req, res) => {
    res.send("API funcionando correctamente");
});

// Ruta para obtener todos los usuarios
app.get("/usuarios", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM usuarios");
        res.json(result.rows);  // Devolver todos los usuarios
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ruta para insertar un usuario
app.post("/usuarios", async (req, res) => {
    const { nombre, correo, contrasena } = req.body;
    if (!nombre || !correo || !contrasena) {
        return res.status(400).json({ error: "Todos los campos son obligatorios: nombre, correo, contrasena." });
    }
    try {
        const result = await pool.query(
            "INSERT INTO usuarios (nombre, correo, contrasena) VALUES ($1, $2, $3) RETURNING *",
            [nombre, correo, contrasena]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ruta para obtener un usuario por su ID
app.get("/usuarios/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("SELECT * FROM usuarios WHERE id = $1", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ruta para eliminar un usuario por su ID
app.delete("/usuarios/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM usuarios WHERE id = $1 RETURNING *", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        res.json({ message: "Usuario eliminado correctamente", usuario: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ruta para actualizar un usuario por su ID
app.put("/usuarios/:id", async (req, res) => {
    const { id } = req.params;
    const { nombre, correo, contrasena } = req.body;
    if (!nombre || !correo || !contrasena) {
        return res.status(400).json({ error: "Todos los campos son obligatorios: nombre, correo, contrasena." });
    }
    try {
        const result = await pool.query(
            "UPDATE usuarios SET nombre = $1, correo = $2, contrasena = $3 WHERE id = $4 RETURNING *",
            [nombre, correo, contrasena, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Configurar el puerto y arrancar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
