import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import fs from "fs";
import Stripe from "stripe";

const db = new Database("vagamt.db");
const JWT_SECRET = process.env.JWT_SECRET || "vaga-mt-pro-secret-key-2024";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req: any, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `resume-${req.user.id}-${uniqueSuffix}.pdf`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  }
});
const stripe = new Stripe(STRIPE_SECRET_KEY);

// Initialize database with new schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    city TEXT,
    neighborhood TEXT,
    interest TEXT,
    resume_url TEXT,
    role TEXT DEFAULT 'CANDIDATE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    cnpj TEXT NOT NULL,
    city TEXT NOT NULL,
    logo_url TEXT,
    plan TEXT DEFAULT 'FREE',
    subscription_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies (id)
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    salary TEXT,
    contract_type TEXT NOT NULL,
    city TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'OPEN',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies (id)
  );

  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    job_id TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (job_id) REFERENCES jobs (id),
    UNIQUE(user_id, job_id)
  );

  CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'PAID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies (id)
  );

  INSERT OR IGNORE INTO admin_settings (key, value) VALUES ('pix_key', 'financeiro@vagamt.pro');
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use("/uploads", express.static(uploadDir));

  // Middleware for Auth
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // --- Auth Routes ---

  app.post("/api/auth/register/user", async (req, res) => {
    const { name, email, password, city, phone } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const id = uuidv4();
      db.prepare("INSERT INTO users (id, name, email, password, city, phone) VALUES (?, ?, ?, ?, ?, ?)")
        .run(id, name, email, hashedPassword, city, phone);
      
      const token = jwt.sign({ id, role: 'CANDIDATE' }, JWT_SECRET);
      res.status(201).json({ token, user: { id, name, email, city, phone, role: 'CANDIDATE' }, role: 'CANDIDATE' });
    } catch (error: any) {
      res.status(400).json({ error: error.message.includes("UNIQUE") ? "Email already exists" : "Registration failed" });
    }
  });

  app.post("/api/auth/register/company", async (req, res) => {
    const { name, email, password, cnpj, city } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const id = uuidv4();
      db.prepare("INSERT INTO companies (id, name, email, password, cnpj, city) VALUES (?, ?, ?, ?, ?, ?)")
        .run(id, name, email, hashedPassword, cnpj, city);
      
      const token = jwt.sign({ id, role: 'COMPANY' }, JWT_SECRET);
      res.status(201).json({ token, company: { id, name, email, cnpj, city, role: 'COMPANY', plan: 'FREE' }, role: 'COMPANY' });
    } catch (error: any) {
      res.status(400).json({ error: error.message.includes("UNIQUE") ? "Email already exists" : "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      // Check users first
      let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
        delete user.password;
        return res.json({ token, user, role: user.role });
      }

      // Check companies
      let company = db.prepare("SELECT * FROM companies WHERE email = ?").get(email) as any;
      if (company && await bcrypt.compare(password, company.password)) {
        const token = jwt.sign({ id: company.id, role: 'COMPANY' }, JWT_SECRET);
        delete company.password;
        return res.json({ token, company, role: 'COMPANY' });
      }

      res.status(401).json({ error: "Invalid credentials" });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/user/profile", authenticate, (req: any, res) => {
    try {
      const user = db.prepare("SELECT id, name, email, city, phone, role, resume_url FROM users WHERE id = ?").get(req.user.id);
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.post("/api/user/resume", authenticate, upload.single("resume"), (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    const resumeUrl = `/uploads/${req.file.filename}`;
    try {
      db.prepare("UPDATE users SET resume_url = ? WHERE id = ?").run(resumeUrl, req.user.id);
      res.json({ resume_url: resumeUrl });
    } catch (error) {
      res.status(500).json({ error: "Failed to update resume" });
    }
  });

  app.patch("/api/user/profile", authenticate, (req: any, res) => {
    const { name, email, city, phone, neighborhood, interest } = req.body;
    try {
      db.prepare(`
        UPDATE users 
        SET name = ?, email = ?, city = ?, phone = ?, neighborhood = ?, interest = ? 
        WHERE id = ?
      `).run(name, email, city, phone, neighborhood, interest, req.user.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // --- Admin Routes ---

  app.get("/api/admin/stats", authenticate, (req: any, res) => {
    // In a real app, we'd check if the user is actually an admin
    // For this demo, we'll allow it if they have a special role or just for the demo
    try {
      const pixKey = db.prepare("SELECT value FROM admin_settings WHERE key = 'pix_key'").get() as any;
      const subscriptions = db.prepare(`
        SELECT s.*, c.name as company_name 
        FROM subscriptions s 
        JOIN companies c ON s.company_id = c.id 
        ORDER BY s.created_at DESC
      `).all();
      res.json({ pix_key: pixKey?.value, subscriptions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  app.post("/api/admin/settings", authenticate, (req: any, res) => {
    const { pix_key } = req.body;
    try {
      db.prepare("INSERT OR REPLACE INTO admin_settings (key, value) VALUES ('pix_key', ?)").run(pix_key);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // --- Payment Routes ---

  app.post("/api/company/pay", authenticate, (req: any, res) => {
    if (req.user.role !== 'COMPANY') return res.status(403).json({ error: "Unauthorized" });
    const id = uuidv4();
    try {
      db.prepare("INSERT INTO subscriptions (id, company_id, amount) VALUES (?, ?, ?)")
        .run(id, req.user.id, 50.00);
      res.json({ success: true, message: "Pagamento de R$ 50 gerado com sucesso!" });
    } catch (error) {
      res.status(500).json({ error: "Failed to process payment" });
    }
  });

  // --- Job Routes ---

  app.get("/api/jobs", (req, res) => {
    const { city, category, search } = req.query;
    let query = `
      SELECT j.*, c.name as company_name, c.plan as company_plan
      FROM jobs j 
      JOIN companies c ON j.company_id = c.id 
      WHERE j.status = 'OPEN'
    `;
    const params: any[] = [];

    if (city) {
      query += " AND j.city = ?";
      params.push(city);
    }
    if (category) {
      query += " AND j.category = ?";
      params.push(category);
    }
    if (search) {
      query += " AND (j.title LIKE ? OR j.description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY c.plan DESC, j.created_at DESC";
    
    try {
      const jobs = db.prepare(query).all(...params);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.post("/api/jobs", authenticate, (req: any, res) => {
    if (req.user.role !== 'COMPANY') return res.status(403).json({ error: "Only companies can post jobs" });
    
    const company = db.prepare("SELECT plan FROM companies WHERE id = ?").get(req.user.id) as any;
    const activeJobsCount = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE company_id = ? AND status = 'OPEN'").get(req.user.id) as any;

    if (company.plan === 'FREE' && activeJobsCount.count >= 30) {
      return res.status(403).json({ 
        error: "Limite de 30 vagas atingido no plano FREE. Faça upgrade para o PREMIUM para postar vagas ilimitadas." 
      });
    }

    const { title, description, salary, contract_type, city, category } = req.body;
    const id = uuidv4();
    try {
      db.prepare(`
        INSERT INTO jobs (id, company_id, title, description, salary, contract_type, city, category)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, req.user.id, title, description, salary, contract_type, city, category);
      res.status(201).json({ id });
    } catch (error) {
      res.status(500).json({ error: "Failed to create job" });
    }
  });

  // --- Application Routes ---

  app.post("/api/applications", authenticate, (req: any, res) => {
    if (req.user.role !== 'CANDIDATE') return res.status(403).json({ error: "Only candidates can apply" });
    
    const { job_id, message } = req.body;
    const id = uuidv4();
    try {
      db.prepare("INSERT INTO applications (id, user_id, job_id, message) VALUES (?, ?, ?, ?)")
        .run(id, req.user.id, job_id, message);
      res.status(201).json({ id });
    } catch (error: any) {
      res.status(400).json({ error: error.message.includes("UNIQUE") ? "Already applied" : "Application failed" });
    }
  });

  app.patch("/api/applications/:id/status", authenticate, (req: any, res) => {
    if (req.user.role !== 'COMPANY') return res.status(403).json({ error: "Unauthorized" });
    const { status } = req.body;
    const { id } = req.params;
    try {
      db.prepare("UPDATE applications SET status = ? WHERE id = ?").run(status, id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  app.get("/api/my-applications", authenticate, (req: any, res) => {
    try {
      const apps = db.prepare(`
        SELECT a.*, j.title as job_title, c.name as company_name
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        JOIN companies c ON j.company_id = c.id
        WHERE a.user_id = ?
        ORDER BY a.created_at DESC
      `).all(req.user.id);
      res.json(apps);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  app.get("/api/company/applications", authenticate, (req: any, res) => {
    if (req.user.role !== 'COMPANY') return res.status(403).json({ error: "Unauthorized" });
    try {
      const apps = db.prepare(`
        SELECT a.*, u.name as user_name, u.email as user_email, u.phone as user_phone, j.title as job_title
        FROM applications a
        JOIN users u ON a.user_id = u.id
        JOIN jobs j ON a.job_id = j.id
        WHERE j.company_id = ?
        ORDER BY a.created_at DESC
      `).all(req.user.id);
      res.json(apps);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  app.get("/api/recommendations", authenticate, async (req: any, res) => {
    if (req.user.role !== 'CANDIDATE') return res.status(403).json({ error: "Unauthorized" });
    
    try {
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id) as any;
      const jobs = db.prepare("SELECT id, title, description, category FROM jobs WHERE status = 'OPEN' LIMIT 20").all() as any[];
      
      if (jobs.length === 0) return res.json([]);

      const prompt = `
        Com base no perfil do candidato:
        Nome: ${user.name}
        Cidade: ${user.city}
        
        E na lista de vagas disponíveis em Mato Grosso:
        ${jobs.map(j => `- ID: ${j.id}, Título: ${j.title}, Categoria: ${j.category}, Descrição: ${j.description}`).join('\n')}
        
        Selecione as 3 vagas mais adequadas para este candidato. 
        Retorne APENAS um array JSON com os IDs das vagas, por exemplo: ["id1", "id2", "id3"].
        Não inclua explicações ou formatação markdown além do JSON.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const text = response.text || "[]";
      const recommendedIds = JSON.parse(text.replace(/```json|```/g, "").trim());
      
      const recommendedJobs = jobs.filter(j => recommendedIds.includes(j.id));
      res.json(recommendedJobs);
    } catch (error) {
      console.error("AI Recommendation error:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  app.get("/api/company/candidate-recommendations", authenticate, async (req: any, res) => {
    if (req.user.role !== 'COMPANY') return res.status(403).json({ error: "Unauthorized" });
    
    try {
      const { job_id } = req.query;
      if (!job_id) return res.status(400).json({ error: "Job ID required" });

      const job = db.prepare("SELECT * FROM jobs WHERE id = ? AND company_id = ?").get(job_id, req.user.id) as any;
      if (!job) return res.status(404).json({ error: "Job not found" });

      const candidates = db.prepare("SELECT id, name, city, phone, email FROM users WHERE role = 'CANDIDATE' LIMIT 50").all() as any[];
      
      if (candidates.length === 0) return res.json([]);

      const prompt = `
        Com base na vaga de emprego:
        Título: ${job.title}
        Descrição: ${job.description}
        Cidade: ${job.city}
        
        E na lista de candidatos disponíveis:
        ${candidates.map(c => `- ID: ${c.id}, Nome: ${c.name}, Cidade: ${c.city}`).join('\n')}
        
        Selecione os 3 candidatos mais adequados para esta vaga. 
        Retorne APENAS um array JSON com os IDs dos candidatos, por exemplo: ["id1", "id2", "id3"].
        Não inclua explicações ou formatação markdown além do JSON.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const text = response.text || "[]";
      const recommendedIds = JSON.parse(text.replace(/```json|```/g, "").trim());
      
      const recommendedCandidates = candidates.filter(c => recommendedIds.includes(c.id));
      res.json(recommendedCandidates);
    } catch (error) {
      console.error("AI Candidate Recommendation error:", error);
      res.status(500).json({ error: "Failed to generate candidate recommendations" });
    }
  });

  // --- Payment Routes ---

  app.post("/api/payments/create-session", authenticate, async (req: any, res) => {
    if (req.user.role !== 'COMPANY') return res.status(403).json({ error: "Unauthorized" });

    try {
      const company = db.prepare("SELECT email FROM companies WHERE id = ?").get(req.user.id) as any;
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        customer_email: company.email,
        line_items: [
          {
            price_data: {
              currency: "brl",
              product_data: {
                name: "VagaMT Pro - Plano Premium",
                description: "Vagas ilimitadas, selo de verificação e prioridade no ranking."
              },
              unit_amount: 5000, // 50 reais
              recurring: {
                interval: "month"
              }
            },
            quantity: 1
          }
        ],
        success_url: `${process.env.APP_URL}/dashboard?status=success`,
        cancel_url: `${process.env.APP_URL}/dashboard?status=cancel`,
        metadata: {
          company_id: req.user.id
        }
      });

      res.json({ url: session.url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/payments/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const companyId = session.metadata.company_id;
      const subscriptionId = session.subscription;

      db.prepare("UPDATE companies SET plan = 'PREMIUM', subscription_id = ? WHERE id = ?")
        .run(subscriptionId, companyId);
      
      db.prepare("INSERT INTO payments (id, company_id, amount, status) VALUES (?, ?, ?, ?)")
        .run(uuidv4(), companyId, 50.00, 'COMPLETED');
    }

    res.json({ received: true });
  });

  app.get("/api/admin/payments", authenticate, (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Unauthorized" });
    
    try {
      const payments = db.prepare(`
        SELECT p.*, c.name as company_name 
        FROM payments p 
        JOIN companies c ON p.company_id = c.id 
        ORDER BY p.created_at DESC
      `).all();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
