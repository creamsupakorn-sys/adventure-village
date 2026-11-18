const express = require("express");
const bcrypt = require("bcryptjs");
const { MongoClient, ObjectId } = require("mongodb");
const path = require("path");

const MONGO_URL = "mongodb://127.0.0.1:27017";
const DATABASE_NAME = "dormitory-db";
const PORT = 3000;

const app = express();
app.use(express.json({ limit: "15mb" }));
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, "resident"))); // เพิ่มบรรทัดนี้
app.use(express.static(path.join(__dirname, "admin"))); // เพิ่มบรรทัดนี้
app.use(express.static(path.join(__dirname, "technician")));

let db = null;
let users = null;
let issues = null;
let news = null;
const HIDE_PASSWORD = { projection: { passwordHash: 0 } };

// ==================== USERS & AUTH APIS ====================

app.post("/api/register", async (req, res) => {
  const {
    username,
    fullname,
    fullName,
    email,
    password,
    role,
    houseNo,
    roomNumber,
    phone,
  } = req.body;
  const resolvedName = (fullname || fullName || "").trim();
  const resolvedHouse = (houseNo || roomNumber || "").trim();

  if (!username || !resolvedName || !password) {
    return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res
      .status(400)
      .json({
        error: "username ต้องเป็นตัวอักษรภาษาอังกฤษ ตัวเลข หรือ _ ยาว 3–20 ตัว",
      });
  }
  if (password.length < 4) {
    return res
      .status(400)
      .json({ error: "รหัสผ่านต้องยาวอย่างน้อย 4 ตัวอักษร" });
  }

  const userRole = ["admin", "technician", "resident"].includes(role)
    ? role
    : "resident";
  const newUser = {
    username: username.trim(),
    fullname: resolvedName,
    email: email
      ? email.trim().toLowerCase()
      : `${username.trim()}@village.local`,
    role: userRole,
    houseNo: resolvedHouse || "ยังไม่ระบุ",
    phone: (phone || "").trim(),
    createdAt: new Date(),
  };

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await users.insertOne({ ...newUser, passwordHash });
    res
      .status(201)
      .json({
        _id: result.insertedId,
        id: result.insertedId.toString(),
        ...newUser,
      });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ error: "ชื่อผู้ใช้ อีเมล หรือข้อมูลนี้ถูกใช้งานในระบบแล้ว" });
    }
    res.status(500).json({ error: err.message });
  }
});

// เข้าสู่ระบบ (รองรับโครงสร้างข้อมูลเก่าใน MongoDB ด้วย)
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await users.findOne({
    username: new RegExp(`^${username}$`, "i"),
  });

  // รองรับทั้ง passwordHash (เข้ารหัส) และ password (ข้อความธรรมดาเผื่อแก้ใน Compass)
  // รองรับทั้ง passwordHash และ password
  let ok = false;
  if (user) {
    // เช็กว่าถ้า passwordHash หน้าตาเหมือนถูกแฮชมา (ขึ้นต้นด้วย $) ค่อยใช้ bcrypt
    if (user.passwordHash && user.passwordHash.startsWith("$")) {
      ok = await bcrypt.compare(password ?? "", user.passwordHash);
    } else {
      // ถ้าเก็บเป็นข้อความธรรมดา หรือฟิลด์ password ให้เทียบตรงๆ
      ok = password === (user.passwordHash || user.password);
    }
  }

  if (!ok) {
    return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
  }

  // แปลง role "member" จากฐานข้อมูลเก่าให้เป็น "resident"
  const normalizedRole =
    user.role === "member" ? "resident" : user.role || "resident";

  await users.updateOne(
    { _id: user._id },
    { $inc: { loginCount: 1 }, $set: { lastLoginAt: new Date() } },
  );

  res.json({
    message: "เข้าสู่ระบบสำเร็จ",
    user: {
      id: user._id.toString(),
      _id: user._id,
      username: user.username,
      fullname: user.fullname || user.fullName || user.name || user.username,
      role: normalizedRole,
      houseNo: user.houseNo || user.roomNumber || "ยังไม่ระบุ",
      phone: user.phone || "",
      email: user.email || "",
    },
  });
});

app.get("/api/users", async (req, res) => {
  const list = await users
    .find({}, HIDE_PASSWORD)
    .sort({ createdAt: -1 })
    .toArray();
  const formatted = list.map((u) => ({
    ...u,
    id: u._id.toString(),
    fullname: u.fullname || u.fullName || u.name || u.username,
    role: u.role === "member" ? "resident" : u.role,
    houseNo: u.houseNo || u.roomNumber || "-",
  }));
  res.json(formatted);
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const result = await users.deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0)
      return res.status(404).json({ error: "ไม่พบผู้ใช้นี้" });
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: "Invalid ID format" });
  }
});

// ==================== ISSUES / REPAIR APIS ====================

app.get("/api/issues", async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status && status !== "all") query.status = status;

    const list = await issues.find(query).sort({ createdAt: -1 }).toArray();
    const formatted = list.map((item) => ({
      ...item,
      id: item._id.toString(),
      createdAt:
        item.createdAtDisplay ||
        new Date(item.createdAt).toLocaleString("th-TH"),
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/issues", async (req, res) => {
  try {
    const {
      category,
      description,
      location,
      reporterName,
      beforeImg,
      createdAt,
    } = req.body;
    if (!category || !description) {
      return res
        .status(400)
        .json({ error: "กรุณากรอกข้อมูลการแจ้งซ่อมให้ครบ" });
    }

    const timeStr = createdAt || new Date().toLocaleString("th-TH");
    const reporter = reporterName || "ลูกบ้าน";

    const newIssue = {
      category,
      description,
      location: location || "ไม่ระบุพิกัด",
      reporterName: reporter,
      beforeImg: beforeImg || "",
      afterImg: "",
      status: "pending",
      stepLevel: 1,
      assignedTech: "",
      timeline: [
        { title: "ลูกบ้านส่งเรื่องแจ้งปัญหา", time: timeStr, done: true },
        {
          title: "นิติบุคคลตรวจสอบและรับเรื่อง",
          time: "รอตรวจสอบ",
          done: false,
        },
        {
          title: "มอบหมายงานให้ช่างประจำหมู่บ้าน",
          time: "รอดำเนินการ",
          done: false,
        },
        { title: "ดำเนินการซ่อมเสร็จสิ้น", time: "รอดำเนินการ", done: false },
      ],
      historyLogs: [
        { actor: reporter, action: "ส่งเรื่องแจ้งปัญหา", note: "" },
      ],
      messages: [],
      rating: 0,
      ratingComment: "",
      createdAtDisplay: timeStr,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await issues.insertOne(newIssue);
    res
      .status(201)
      .json({
        id: result.insertedId.toString(),
        _id: result.insertedId,
        ...newIssue,
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// อัปเดตสถานะ มอบหมายช่าง และตอบกลับ (แอดมิน/ช่าง)
app.patch("/api/issues/:id/status", async (req, res) => {
  try {
    const { status, assignedTech, stepLevel, afterImg, newLog, newMessage } =
      req.body;
    const updateSet = { updatedAt: new Date() };
    if (status) updateSet.status = status;
    if (assignedTech !== undefined) updateSet.assignedTech = assignedTech;
    if (stepLevel) updateSet.stepLevel = stepLevel;
    if (afterImg) updateSet.afterImg = afterImg;

    const updateOps = { $set: updateSet };
    const pushOps = {};
    if (newLog) pushOps.historyLogs = newLog;
    if (newMessage) pushOps.messages = newMessage;
    if (Object.keys(pushOps).length > 0) updateOps.$push = pushOps;

    const result = await issues.updateOne(
      { _id: new ObjectId(req.params.id) },
      updateOps,
    );
    if (result.matchedCount === 0)
      return res.status(404).json({ error: "ไม่พบรายการแจ้งซ่อมนี้" });

    res.json({ message: "อัปเดตสถานะสำเร็จ" });
  } catch (error) {
    res.status(400).json({ error: "Invalid ID format or data" });
  }
});

// ส่งข้อความพูดคุยในเคสแจ้งซ่อม
app.post("/api/issues/:id/messages", async (req, res) => {
  try {
    const { sender, name, text, time } = req.body;
    if (!text) return res.status(400).json({ error: "กรุณาระบุข้อความ" });

    const msgObj = { sender, name, text, time };
    const result = await issues.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $push: { messages: msgObj }, $set: { updatedAt: new Date() } },
    );
    if (result.matchedCount === 0)
      return res.status(404).json({ error: "ไม่พบรายการแจ้งซ่อม" });
    res.status(201).json(msgObj);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// บันทึกคะแนนประเมินความพึงพอใจ
app.post("/api/issues/:id/rating", async (req, res) => {
  try {
    const { rating, ratingComment } = req.body;
    const result = await issues.updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          rating: Number(rating),
          ratingComment: ratingComment || "",
          updatedAt: new Date(),
        },
      },
    );
    if (result.matchedCount === 0)
      return res.status(404).json({ error: "ไม่พบรายการแจ้งซ่อม" });
    res.json({ message: "บันทึกผลประเมินสำเร็จ" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== NEWS APIS ====================

app.get("/api/news", async (req, res) => {
  const list = await news.find({}).sort({ createdAt: -1 }).toArray();
  const formatted = list.map((n) => ({
    ...n,
    id: n._id.toString(),
    date: n.date || new Date(n.createdAt).toLocaleDateString("th-TH"),
  }));
  res.json(formatted);
});

app.post("/api/news", async (req, res) => {
  try {
    const { content, image, date } = req.body;
    if (!content)
      return res.status(400).json({ error: "กรุณากรอกเนื้อหาประกาศ" });

    const newAnnouncement = {
      content,
      image: image || "",
      date: date || new Date().toLocaleDateString("th-TH"),
      createdAt: new Date(),
    };
    const result = await news.insertOne(newAnnouncement);
    res
      .status(201)
      .json({
        id: result.insertedId.toString(),
        _id: result.insertedId,
        ...newAnnouncement,
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/news/:id", async (req, res) => {
  try {
    const { content, image } = req.body;
    const result = await news.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { content, image, updatedAt: new Date() } },
    );
    if (result.matchedCount === 0)
      return res.status(404).json({ error: "ไม่พบประกาศนี้" });
    res.json({ message: "แก้ไขประกาศสำเร็จ" });
  } catch (error) {
    res.status(400).json({ error: "Invalid ID format" });
  }
});

app.delete("/api/news/:id", async (req, res) => {
  try {
    const result = await news.deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0)
      return res.status(404).json({ error: "ไม่พบประกาศนี้" });
    res.status(204).end();
  } catch (error) {
    res.status(400).json({ error: "Invalid ID format" });
  }
});

// ==================== SERVER START ====================

async function seedDefaultAdmin() {
  const adminExists = await users.findOne({ username: "admin" });
  if (!adminExists) {
    const passwordHash = await bcrypt.hash("1234", 10);
    await users.insertOne({
      username: "admin",
      passwordHash,
      fullname: "ปรียา มงคล",
      role: "admin",
      houseNo: "สำนักงานส่วนกลาง",
      phone: "02-999-8888",
      email: "admin@village.local",
      createdAt: new Date(),
    });
    console.log(
      "สร้างบัญชี admin เริ่มต้น (admin / 1234) ใน MongoDB เรียบร้อย",
    );
  }
}

async function main() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  db = client.db(DATABASE_NAME);
  users = db.collection("users");
  issues = db.collection("issues");
  news = db.collection("news");

  await users.createIndex({ username: 1 }, { unique: true });
  await seedDefaultAdmin();

  console.log("เชื่อมต่อ MongoDB สำเร็จ (ฐานข้อมูลกลาง)");
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("เชื่อมต่อฐานข้อมูลไม่สำเร็จ:", err.message);
  process.exit(1);
});
