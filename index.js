require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require('bcryptjs'); // Cambiado de bcrypt a bcryptjs

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
        // Encriptar la contraseña antes de guardarla
        const saltRounds = 10; // Cuanto mayor sea, más seguro
        const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

        const result = await pool.query(
            "INSERT INTO usuarios (nombre, correo, contrasena) VALUES ($1, $2, $3) RETURNING *",
            [nombre, correo, hashedPassword]
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
        // Encriptar la nueva contraseña antes de actualizarla
        const saltRounds = 10; // Cuanto mayor sea, más seguro
        const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

        const result = await pool.query(
            "UPDATE usuarios SET nombre = $1, correo = $2, contrasena = $3 WHERE id = $4 RETURNING *",
            [nombre, correo, hashedPassword, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ruta para iniciar sesión (verificar la contraseña cifrada)
app.post("/usuarios/login", async (req, res) => {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
        return res.status(400).json({ error: "Se requiere correo y contraseña." });
    }

    try {
        // Buscar el usuario por correo
        const result = await pool.query("SELECT * FROM usuarios WHERE correo = $1", [correo]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        const user = result.rows[0];

        // Comparar la contraseña proporcionada con la contraseña cifrada en la base de datos
        const isMatch = await bcrypt.compare(contrasena, user.contrasena);

        if (isMatch) {
            // Si las contraseñas coinciden, iniciar sesión
            res.json({ message: "Inicio de sesión exitoso", usuario: user });
        } else {
            // Si las contraseñas no coinciden, devolver un error
            res.status(400).json({ error: "Contraseña incorrecta" });
        }

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nuevas rutas para manejar registros (ingresos y gastos)

// Ruta para obtener todos los registros de ingresos y gastos
app.get("/registros", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM registros");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ruta para insertar un nuevo registro (ingreso o gasto)
const jwt = require("jsonwebtoken");  // Asegúrate de importar jwt

// Ruta para insertar un nuevo registro (ingreso o gasto)
app.post("/registros", async (req, res) => {
    const { tipo, monto, descripcion, fecha } = req.body;

    if (!tipo || !monto || !fecha) {
        return res.status(400).json({ error: "Faltan campos obligatorios: tipo, monto, fecha." });
    }

    const token = req.headers.authorization?.split(' ')[1];  // Obtener el token del encabezado

    if (!token) {
        return res.status(401).json({ error: "Se requiere autenticación" });
    }

    try {
        // Verificar el token y obtener el id_usuario
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const id_usuario = decoded.id_usuario;  // Obtener el id_usuario del token

        const result = await pool.query(
            "INSERT INTO registros (tipo, monto, descripcion, fecha, id_usuario) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [tipo, monto, descripcion, fecha, id_usuario]
        );
        res.status(201).json(result.rows[0]);  // Enviar la respuesta con el registro creado
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Ruta para eliminar un registro por su ID
app.delete("/registros/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query("DELETE FROM registros WHERE id = $1 RETURNING *", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Registro no encontrado" });
        }
        res.json({ message: "Registro eliminado correctamente", registro: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Configurar el puerto y arrancar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
