// ==========================================
// 1. ฟังก์ชันนำทางระหว่างหน้า (Navigation)
// ==========================================

const API_BASE = "/api";
const PLACEHOLDER_SVG =
  "data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27400%27%20height=%27250%27%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20fill=%27%23e2e8f0%27/%3E%3Ctext%20x=%2750%25%27%20y=%2750%25%27%20dominant-baseline=%27middle%27%20text-anchor=%27middle%27%20fill=%27%2364748b%27%20font-family=%27sans-serif%27%20font-size=%2720%27%20font-weight=%27bold%27%3EADVENTURE%20VILLAGE%3C/text%3E%3C/svg%3E";

function goToRegister() {
  window.location.href = "register.html";
}

function goToSelectRole() {
  window.location.href = "select-role.html";
}

function selectRole(role) {
  localStorage.setItem("registerRole", role);
  window.location.href = "/register.html";
}

// ==========================================
// 2. ฟังก์ชันจัดการบัญชีผู้ใช้ และตรวจสอบการเข้าสู่ระบบ (MongoDB)
// ==========================================

function setRegisterFieldError(inputId, errorId, message) {
  const inputEl = document.getElementById(inputId);
  const errEl = document.getElementById(errorId);
  if (inputEl) inputEl.classList.add("input-error");
  if (errEl) {
    errEl.textContent = message;
    errEl.classList.add("show");
  }
  return inputEl;
}

async function handleRegister(event) {
  event.preventDefault();

  const role = localStorage.getItem("registerRole") || "resident";
  const fullname = document
    .getElementById("fullname")
    .value.trim()
    .replace(/\s+/g, " ");
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email")?.value.trim() || "";
  const houseNo =
    role === "resident"
      ? document.getElementById("houseNo").value.trim() || "ยังไม่ระบุ"
      : "-";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        fullname,
        role,
        houseNo,
        phone,
        email,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const el = setRegisterFieldError(
        "username",
        "registerUsernameError",
        `⚠️ ${data.error || "ลงทะเบียนไม่สำเร็จ"}`,
      );
      if (el) el.focus();
      return;
    }

    localStorage.removeItem("registerRole");
    window.location.href = "login.html";
  } catch (err) {
    console.error(err);
    alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ฐานข้อมูลได้");
  }
}

function selectRegisterRole(roleValue, cardElement) {
  document.querySelectorAll(".reg-role-card").forEach((card) => {
    card.classList.remove("active");
  });

  cardElement.classList.add("active");

  const roleInput = document.getElementById("role");
  if (roleInput) {
    roleInput.value = roleValue;
  }

  const houseNoGroup = document
    .getElementById("houseNo")
    ?.closest(".form-group");
  if (houseNoGroup) {
    houseNoGroup.style.display = roleValue === "resident" ? "block" : "none";
  }
}

function showLoginError(message) {
  const errEl = document.getElementById("loginError");
  const userInput = document.getElementById("username");
  const passInput = document.getElementById("password");

  if (userInput) userInput.classList.add("input-error");
  if (passInput) passInput.classList.add("input-error");
  if (errEl) {
    errEl.textContent = "⚠️ " + message;
    errEl.classList.add("show");
  }
}

function clearLoginError() {
  clearFieldError("username", "loginError");
  clearFieldError("password", "loginError");
}

async function handleLogin(event) {
  if (event) event.preventDefault();

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  
  if (!usernameInput || !passwordInput) return;

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    console.log("ผลลัพธ์จาก Server:", data);

    if (!res.ok) {
      showLoginError(data.error || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      return;
    }

    const matchedUser = data.user;
    
    // บันทึกข้อมูลผู้ใช้เป็นก้อน Object ลงในคีย์ "user" ให้สอดคล้องกับฝั่ง Dashboard ช่างและแอดมิน
    localStorage.setItem("user", JSON.stringify(matchedUser));

    // เผื่อไว้สำหรับโค้ดเก่าบางหน้าที่ยังอ่านค่าแยกคีย์
    localStorage.setItem("username", matchedUser.username);
    localStorage.setItem("fullname", matchedUser.fullname);
    localStorage.setItem("role", matchedUser.role);
    localStorage.setItem("houseNo", matchedUser.houseNo);
    localStorage.setItem("phone", matchedUser.phone);

    // พาเปลี่ยนหน้าตามบทบาท
    if (matchedUser.role === "admin") {
      window.location.href = "/admin/admin-dashboard.html";
    } else if (matchedUser.role === "technician") {
      window.location.href = "/technician/tech-dashboard.html";
    } else {
      window.location.href = "/resident/dashboard.html";
    }
  } catch (err) {
    console.error("Login Error:", err);
    alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ฐานข้อมูลได้");
  }
}

function handleNewReport() {
  window.location.href = "/resident/report-issue.html";
}

function handleCheckStatus() {
  window.location.href = "/resident/check-status.html";
}

function cancelReport() {
  window.location.href = "/resident/dashboard.html";
}

function clearAuthSessionAndLogout() {
  [
    "currentUser",
    "user",
    "role",
    "userRole",
    "username",
    "fullname",
    "houseNo",
    "phone",
    "adminName",
  ].forEach((k) => {
    localStorage.removeItem(k);
  });
  window.location.href = "/index.html";
}

window.addEventListener("click", function (event) {
  const menuWrapper = document.querySelector(".user-menu-wrapper");
  const dropdown = document.getElementById("profileDropdown");
  if (menuWrapper && dropdown && !menuWrapper.contains(event.target)) {
    dropdown.classList.remove("show");
  }
});

// ==========================================
// 3.1 ข่าวประชาสัมพันธ์ฝั่งลูกบ้าน
// ==========================================

let cachedResidentNews = [];

async function renderResidentNews() {
  const container = document.getElementById("residentNewsCard");
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/news`);
    if (res.ok) cachedResidentNews = await res.json();
  } catch (e) {
    console.error("โหลดข่าวไม่สำเร็จ:", e);
  }

  if (cachedResidentNews.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:#475569; font-weight:600;">ยังไม่มีประกาศข่าวประชาสัมพันธ์ในขณะนี้</p>`;
    return;
  }

  container.innerHTML = cachedResidentNews
    .map(
      (news) => `
        <article class="news-item news-item-clickable" onclick="openResidentNewsModal('${news.id}')" title="คลิกเพื่ออ่านประกาศฉบับเต็ม">
            <div class="news-thumb">
                <img src="${news.image || PLACEHOLDER_SVG}" alt="รูปประกอบข่าวประชาสัมพันธ์">
            </div>
            <div class="news-body">
                <p class="news-text">${news.content}</p>
                <div class="news-date">ลง ณ วันที่ ${news.date}</div>
            </div>
        </article>
    `,
    )
    .join("");
}

function openResidentNewsModal(newsId) {
  const news = cachedResidentNews.find((item) => item.id === newsId);
  const modal = document.getElementById("residentNewsModal");
  if (!news || !modal) return;

  document.getElementById("residentModalImg").src =
    news.image || PLACEHOLDER_SVG;
  document.getElementById("residentModalDate").textContent =
    `ลง ณ วันที่ ${news.date}`;
  document.getElementById("residentModalContent").textContent = news.content;
  modal.classList.add("open");
}

function closeResidentNewsModal() {
  document.getElementById("residentNewsModal")?.classList.remove("open");
}

// ==========================================
// 4. ฟังก์ชันหน้าแจ้งปัญหาใหม่
// ==========================================

let map;
let marker = null;
let isLocationPinned = false;

function selectCategory(buttonElement, categoryName) {
  const buttons = document.querySelectorAll(".category-btn");
  buttons.forEach((btn) => btn.classList.remove("active"));

  buttonElement.classList.add("active");

  const hiddenInput = document.getElementById("selectedCategory");
  if (hiddenInput) {
    hiddenInput.value = categoryName;
  }

  const errorMsg = document.getElementById("categoryError");
  if (errorMsg) {
    errorMsg.classList.remove("show");
  }
  const categoryGrid = document.getElementById("categoryGrid");
  if (categoryGrid) {
    categoryGrid.classList.remove("input-error");
  }
}

function clearFieldError(elementId, errorId) {
  const el = document.getElementById(elementId);
  const err = document.getElementById(errorId);
  if (el) {
    el.classList.remove("input-error");
    el.classList.remove("map-error-border");
  }
  if (err) {
    err.textContent = "";
    err.classList.remove("show");
  }
}

function previewUploadedImage(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const preview = document.getElementById("imagePreview");
      const defaultContent = document.getElementById("uploadDefaultContent");

      preview.src = e.target.result;
      preview.style.display = "block";
      if (defaultContent) defaultContent.style.display = "none";

      clearFieldError("uploadBox", "imageError");
    };
    reader.readAsDataURL(file);
  }
}

function handleIssueSubmit(event) {
  event.preventDefault();

  const category =
    document.getElementById("selectedCategory")?.value.trim() || "";
  const detail = document.getElementById("issueDetail")?.value.trim() || "";
  const previewImg = document.getElementById("imagePreview");

  let location =
    document.getElementById("selectedLocation")?.value.trim() || "";
  if (!location && marker) {
    const pos = marker.getLatLng();
    location = `${pos.lat.toFixed(6)},${pos.lng.toFixed(6)}`;
  }

  let hasError = false;
  let firstErrorElement = null;

  if (!category) {
    const catGrid = document.getElementById("categoryGrid");
    const catErr = document.getElementById("categoryError");
    if (catGrid) catGrid.classList.add("input-error");
    if (catErr) {
      catErr.textContent = "⚠️ กรุณาเลือกประเภทของปัญหา";
      catErr.classList.add("show");
    }
    hasError = true;
    if (!firstErrorElement) firstErrorElement = catGrid;
  }

  if (!isLocationPinned || !location) {
    const mapWrapper =
      document.getElementById("mapBoxWrapper") ||
      document.getElementById("map");
    const mapErr = document.getElementById("mapLocationError");
    if (mapWrapper) mapWrapper.classList.add("map-error-border");
    if (mapErr) {
      mapErr.textContent =
        "⚠️ กรุณาคลิกปักหมุดสถานที่เกิดเหตุบนแผนที่ก่อนส่งแจ้งปัญหา";
      mapErr.classList.add("show");
    }
    hasError = true;
    if (!firstErrorElement) firstErrorElement = mapWrapper;
  }

  if (!detail) {
    const detailInput = document.getElementById("issueDetail");
    const detailErr = document.getElementById("detailError");
    if (detailInput) detailInput.classList.add("input-error");
    if (detailErr) {
      detailErr.textContent = "⚠️ กรุณาระบุรายละเอียดปัญหาที่พบ";
      detailErr.classList.add("show");
    }
    hasError = true;
    if (!firstErrorElement) firstErrorElement = detailInput;
  }

  const imageInput = document.getElementById("imageUpload");
  if (!imageInput || !imageInput.files || imageInput.files.length === 0) {
    const uploadBox = document.getElementById("uploadBox");
    const imageErr = document.getElementById("imageError");
    if (uploadBox) uploadBox.classList.add("input-error");
    if (imageErr) {
      imageErr.textContent = "⚠️ กรุณาแนบรูปถ่ายประกอบการแจ้งปัญหา";
      imageErr.classList.add("show");
    }
    hasError = true;
    if (!firstErrorElement) firstErrorElement = uploadBox;
  }

  if (hasError) {
    if (firstErrorElement) {
      firstErrorElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return;
  }

  const saveToMongoAndRedirect = async (imgDataUrl) => {
    const now = new Date();
    const timeStr = `${now.toLocaleDateString("th-TH")} ${now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`;
    const fullname = localStorage.getItem("fullname");
    const reporterName = fullname ? `คุณ ${fullname}` : "คุณ สมศรี ซิกเซเว่น";

    try {
      const res = await fetch(`${API_BASE}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          description: detail,
          location,
          createdAt: timeStr,
          reporterName,
          beforeImg: imgDataUrl || PLACEHOLDER_SVG,
        }),
      });

      if (res.ok) {
        window.location.href = "check-status.html";
      } else {
        alert("ส่งเรื่องแจ้งปัญหาไม่สำเร็จ กรุณาลองใหม่");
      }
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };

  if (previewImg && previewImg.src && previewImg.src.startsWith("data:")) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement("canvas");
      const maxWidth = 600;
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      saveToMongoAndRedirect(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => saveToMongoAndRedirect(PLACEHOLDER_SVG);
    img.src = previewImg.src;
  } else {
    saveToMongoAndRedirect(PLACEHOLDER_SVG);
  }
}

function initLeafletMap() {
  const mapElem = document.getElementById("map");
  if (!mapElem) return;

  const defaultLat = 13.7563;
  const defaultLng = 100.5018;

  isLocationPinned = false;
  marker = null;
  const locationInput = document.getElementById("selectedLocation");
  if (locationInput) locationInput.value = "";

  map = L.map("map").setView([defaultLat, defaultLng], 15);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  }).addTo(map);

  map.on("click", function (e) {
    const { lat, lng } = e.latlng;
    placeOrMovePin(lat, lng);
  });
}

function placeOrMovePin(lat, lng) {
  if (!map) return;

  if (!marker) {
    marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    marker.on("dragend", function () {
      const position = marker.getLatLng();
      updateLocationValue(position.lat, position.lng);
    });
  } else {
    marker.setLatLng([lat, lng]);
  }

  updateLocationValue(lat, lng);
}

function updateLocationValue(lat, lng) {
  const latText = Number(lat).toFixed(6);
  const lngText = Number(lng).toFixed(6);

  isLocationPinned = true;

  const locationInput = document.getElementById("selectedLocation");
  if (locationInput) locationInput.value = `${latText},${lngText}`;

  const statusEl = document.getElementById("mapPinStatus");
  if (statusEl) {
    statusEl.className = "map-pin-status pinned";
    statusEl.textContent = `✅ ปักหมุดสถานที่เรียบร้อยแล้ว (พิกัด: ${latText}, ${lngText})`;
  }

  clearFieldError("mapBoxWrapper", "mapLocationError");
  clearFieldError("map", "mapLocationError");
}

function useCurrentGpsLocation() {
  const statusEl = document.getElementById("mapPinStatus");
  if (!navigator.geolocation) {
    if (statusEl)
      statusEl.textContent =
        "⚠️ เบราว์เซอร์ไม่รองรับ GPS กรุณาคลิกปักหมุดบนแผนที่เอง";
    return;
  }

  if (statusEl) statusEl.textContent = "⏳ กำลังค้นหาตำแหน่งปัจจุบันของคุณ...";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      if (map) {
        map.setView([latitude, longitude], 17);
        placeOrMovePin(latitude, longitude);
      }
    },
    () => {
      if (statusEl) {
        statusEl.className = "map-pin-status unpinned";
        statusEl.textContent =
          "⚠️ ไม่สามารถเข้าถึง GPS ได้ กรุณาคลิกเลือกจุดบนแผนที่โดยตรง";
      }
    },
  );
}

// ==========================================
// 5. ทำงานอัตโนมัติเมื่อหน้าเว็บโหลดเสร็จ
// ==========================================

document.addEventListener("DOMContentLoaded", function () {
  // จัดการข้อมูลโปรไฟล์ผู้ใช้
  const profileNameElem = document.getElementById("userFullname");
  if (profileNameElem) {
    const fullname =
      localStorage.getItem("fullname") ||
      localStorage.getItem("username") ||
      "ลูกบ้าน";
    const houseNo = localStorage.getItem("houseNo") || "ยังไม่ระบุ";
    const phone = localStorage.getItem("phone") || "ยังไม่ระบุ";

    const subTitleElem = document.querySelector(".sub-title");
    if (subTitleElem)
      subTitleElem.textContent = `ยินดีต้อนรับ คุณ ${fullname} สู่หมู่บ้านผจญภัย`;

    profileNameElem.textContent = `สวัสดี, คุณ ${fullname}`;

    const houseNoElem = document.getElementById("userHouseNo");
    if (houseNoElem) houseNoElem.textContent = `🏠 บ้านเลขที่ ${houseNo}`;

    const phoneElem = document.getElementById("userPhone");
    if (phoneElem) phoneElem.textContent = `📞 ${phone}`;

    const dropdownName = document.getElementById("dropdownName");
    const dropdownHouse = document.getElementById("dropdownHouse");
    const dropdownPhone = document.getElementById("dropdownPhone");

    if (dropdownName) dropdownName.textContent = `คุณ ${fullname}`;
    if (dropdownHouse) dropdownHouse.textContent = `🏠 บ้านเลขที่ ${houseNo}`;
    if (dropdownPhone) dropdownPhone.textContent = `📞 ${phone}`;
  }

  const selectedRole = localStorage.getItem("registerRole") || "resident";
  const houseNoGroup = document.getElementById("houseNo")?.closest(".form-group");

  if (houseNoGroup && selectedRole !== "resident") {
    houseNoGroup.style.display = "none";
  }

  renderResidentNews();
  initLeafletMap();

  // จัดการการส่งฟอร์มเข้าสู่ระบบอย่างถูกต้องภายใน DOMContentLoaded เดียวกัน
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
      handleLogin(event);
    });
  }
});