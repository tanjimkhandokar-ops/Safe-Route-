document.addEventListener("DOMContentLoaded", () => {
    // States
    let isAdminLoggedIn = false;
    let currentUser = null;
    let map = null;

    let currentRouteLine = null, startMarker = null, destMarker = null, liveMarker = null;
    let animationInterval = null;
    let activePathCoordinates = [];

    // Load registered users from LocalStorage or initialize with empty array
    let students = JSON.parse(localStorage.getItem("routeguard_users")) || [];

    // Save to LocalStorage Helper
    function saveStudentsToStorage() {
        localStorage.setItem("routeguard_users", JSON.stringify(students));
    }

    // UI Elements
    const authLanding = document.getElementById("auth-landing");
    const mainDashboard = document.getElementById("main-dashboard");
    const tabLoginBtn = document.getElementById("tab-login-btn");
    const tabRegisterBtn = document.getElementById("tab-register-btn");
    const userLoginForm = document.getElementById("user-login-form");
    const userRegisterForm = document.getElementById("user-register-form");

    const loginModal = document.getElementById("login-modal");
    const profileModal = document.getElementById("profile-modal");
    const sosContactsModal = document.getElementById("sos-contacts-modal");

    const adminLoginBtn = document.getElementById("admin-login-btn");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const closeProfileBtn = document.getElementById("close-profile-btn");
    const closeSosModalBtn = document.getElementById("close-sos-modal");

    const adminLoginForm = document.getElementById("admin-login-form");
    const profileUpdateForm = document.getElementById("profile-update-form");
    const viewMyProfileBtn = document.getElementById("view-my-profile-btn");
    const userLogoutBtn = document.getElementById("user-logout-btn");
    const sosBtn = document.getElementById("sos-btn");

    const tableBody = document.getElementById("student-table-body");
    const searchInput = document.getElementById("search-input");
    const alertText = document.getElementById("alert-text");
    const modeIndicator = document.getElementById("mode-indicator");
    const directoryTitle = document.getElementById("directory-title");

    // Initialize Map
    function initMap() {
        if (!map) {
            map = L.map('map').setView([23.8103, 90.4125], 12);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap &copy; CARTO',
                maxZoom: 19
            }).addTo(map);
        } else {
            setTimeout(() => map.invalidateSize(), 200);
        }
    }

    // Auth Tab Switch
    tabLoginBtn.addEventListener("click", () => {
        tabLoginBtn.classList.add("active");
        tabRegisterBtn.classList.remove("active");
        userLoginForm.classList.remove("hidden");
        userRegisterForm.classList.add("hidden");
    });

    tabRegisterBtn.addEventListener("click", () => {
        tabRegisterBtn.classList.add("active");
        tabLoginBtn.classList.remove("active");
        userRegisterForm.classList.remove("hidden");
        userLoginForm.classList.add("hidden");
    });

    // Enter Dashboard
    function enterDashboard(user) {
        currentUser = user;
        authLanding.classList.add("hidden");
        mainDashboard.classList.remove("hidden");
        sosBtn.style.display = "inline-block";
        userLogoutBtn.style.display = "inline-block";

        updateActiveUserDisplay();
        initMap();
        renderStudents(students);
    }

    function updateActiveUserDisplay() {
        if (currentUser) {
            document.getElementById("dash-user-name").innerText = currentUser.name || "N/A";
            document.getElementById("dash-user-phone").innerText = currentUser.phone || "N/A";
            document.getElementById("dash-user-email").innerText = currentUser.email || "N/A";
            document.getElementById("dash-user-occupation").innerText = currentUser.occupation || "N/A";
            document.getElementById("dash-user-blood").innerText = currentUser.blood || "N/A";
        }
    }

    // User Login (Checks by Mobile Number OR Email)
    userLoginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const inputCred = document.getElementById("login-credential").value.trim().toLowerCase();
        
        const foundUser = students.find(s => 
            (s.phone && s.phone.toLowerCase() === inputCred) || 
            (s.email && s.email.toLowerCase() === inputCred)
        );

        if (foundUser) {
            enterDashboard(foundUser);
        } else {
            alert("No account found with this Mobile Number or Email! Please register first.");
        }
    });

    // User Register
    userRegisterForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const phoneVal = document.getElementById("reg-phone").value.trim();
        const emailVal = document.getElementById("reg-email").value.trim().toLowerCase();

        // Check if user already exists
        const exists = students.some(s => s.phone === phoneVal || s.email === emailVal);
        if (exists) {
            alert("An account with this Mobile Number or Email already exists!");
            return;
        }

        const newUser = {
            name: document.getElementById("reg-name").value.trim(),
            phone: phoneVal,
            email: emailVal,
            occupation: document.getElementById("reg-occupation").value,
            blood: document.getElementById("reg-blood").value,
            emergency: document.getElementById("reg-emergency").value.trim(),
            nid: document.getElementById("reg-nid").value.trim(),
            address: document.getElementById("reg-address").value.trim(),
            start: 'Not Set',
            dest: 'Not Set',
            status: "Registered"
        };

        students.push(newUser);
        saveStudentsToStorage(); // Permanent LocalStorage Save
        
        userRegisterForm.reset();
        alert("Registration Successful!");
        enterDashboard(newUser);
    });

    // View/Edit Profile
    viewMyProfileBtn.addEventListener("click", () => {
        if (!currentUser) return;
        populateProfileForm(currentUser, !isAdminLoggedIn && currentUser.email !== 'ADMIN');
        profileModal.style.display = "flex";
    });

    function populateProfileForm(user, canEdit = true) {
        document.getElementById("prof-name").value = user.name || "";
        document.getElementById("prof-phone").value = user.phone || "";
        document.getElementById("prof-email").value = user.email || "";
        document.getElementById("prof-occupation").value = user.occupation || "Student";
        document.getElementById("prof-blood").value = user.blood || "A+";
        document.getElementById("prof-emergency").value = user.emergency || "";
        document.getElementById("prof-nid").value = user.nid || "";
        document.getElementById("prof-address").value = user.address || "";

        const saveBtn = document.getElementById("save-prof-btn");
        saveBtn.style.display = canEdit ? "block" : "none";
    }

    closeProfileBtn.addEventListener("click", () => profileModal.style.display = "none");

    profileUpdateForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!currentUser) return;

        currentUser.name = document.getElementById("prof-name").value.trim();
        currentUser.phone = document.getElementById("prof-phone").value.trim();
        currentUser.email = document.getElementById("prof-email").value.trim();
        currentUser.occupation = document.getElementById("prof-occupation").value;
        currentUser.blood = document.getElementById("prof-blood").value;
        currentUser.emergency = document.getElementById("prof-emergency").value.trim();
        currentUser.nid = document.getElementById("prof-nid").value.trim();
        currentUser.address = document.getElementById("prof-address").value.trim();

        saveStudentsToStorage(); // Update LocalStorage
        updateActiveUserDisplay();
        renderStudents(students);
        profileModal.style.display = "none";
        alert("Profile Updated Successfully!");
    });

    // Logout
    userLogoutBtn.addEventListener("click", () => {
        currentUser = null;
        isAdminLoggedIn = false;
        mainDashboard.classList.add("hidden");
        authLanding.classList.remove("hidden");
        sosBtn.style.display = "none";
        userLogoutBtn.style.display = "none";
        adminLoginBtn.innerHTML = `<i class="fa-solid fa-user-shield"></i> Admin Login`;
    });

    // Admin Panel Actions
    adminLoginBtn.addEventListener("click", () => {
        if(isAdminLoggedIn) {
            isAdminLoggedIn = false;
            adminLoginBtn.innerHTML = `<i class="fa-solid fa-user-shield"></i> Admin Login`;
            modeIndicator.innerText = "Mode: Member View";
            directoryTitle.innerHTML = `<i class="fa-solid fa-users"></i> Registered Members Directory`;
            renderStudents(students);
            alert("Admin Logged Out.");
        } else {
            loginModal.style.display = "flex";
        }
    });

    closeModalBtn.addEventListener("click", () => loginModal.style.display = "none");

    adminLoginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const u = document.getElementById("admin-user").value;
        const p = document.getElementById("admin-pass").value;

        if(u === "admin" && p === "1234") {
            isAdminLoggedIn = true;
            loginModal.style.display = "none";
            
            if (!currentUser) {
                enterDashboard({ name: "System Admin", phone: "ADMIN", email: "admin@system.local", occupation: "System Admin", blood: "ALL" });
            }

            adminLoginBtn.innerHTML = `<i class="fa-solid fa-right-from-bracket"></i> Logout Admin`;
            modeIndicator.innerText = "Mode: Admin Full Control";
            directoryTitle.innerHTML = `<i class="fa-solid fa-users-gear"></i> Admin Directory (All Access)`;
            renderStudents(students);
            alert("Admin Login Successful!");
        } else {
            alert("Invalid Credentials! Use admin / 1234");
        }
    });

    // SOS Trigger Action
    sosBtn.addEventListener("click", () => {
        if (currentUser && currentUser.emergency) {
            document.getElementById("sos-guardian-num").innerText = currentUser.emergency;
            document.getElementById("sos-guardian-link").href = `tel:${currentUser.emergency}`;
            document.getElementById("sos-guardian-name").innerText = `Emergency Contact (${currentUser.name})`;
        }

        sosContactsModal.style.display = "flex";

        const alertBox = document.getElementById("alert-box");
        alertBox.className = "alert-box alert-danger";
        alertText.innerText = `EMERGENCY SOS ACTIVE! Broadcasting location...`;
    });

    closeSosModalBtn.addEventListener("click", () => sosContactsModal.style.display = "none");

    // Geocoding & Route Functions
    async function geocodeLocation(query) {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await res.json();
            return data.length > 0 ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null;
        } catch (e) { return null; }
    }

    function generatePathPoints(s, d, steps = 15) {
        let pts = [];
        for (let i = 0; i <= steps; i++) {
            pts.push([s[0] + (d[0] - s[0]) * (i / steps), s[1] + (d[1] - s[1]) * (i / steps)]);
        }
        return pts;
    }

    // Render Members Directory Table
    function renderStudents(data) {
        tableBody.innerHTML = "";
        if (!data || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: #94a3b8;">No registered members found. Register to get started!</td></tr>`;
            return;
        }

        data.forEach((student, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><strong>${student.name}</strong></td>
                <td><a href="tel:${student.phone}" style="color: #60a5fa; text-decoration: none;">${student.phone}</a></td>
                <td>${student.email}</td>
                <td><span style="background: rgba(255,255,255,0.08); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">${student.occupation || 'N/A'}</span></td>
                <td><span class="status-badge badge-active">${student.blood || '--'}</span></td>
                <td><a href="tel:${student.emergency}" style="color: #f87171; text-decoration: none;"><i class="fa-solid fa-phone text-xs"></i> ${student.emergency || '--'}</a></td>
                <td><span class="status-badge ${student.status === 'Moving' ? 'badge-moving' : 'badge-active'}">${student.status}</span></td>
                <td>
                    <div class="btn-action-group">
                        <button class="btn-tbl-view" onclick="viewStudentFullProfile(${index})"><i class="fa-solid fa-address-card"></i> Profile</button>
                        ${isAdminLoggedIn ? `
                            <button class="btn-tbl-track" onclick="adminTrackStudent('${student.start}', '${student.dest}', '${student.name}', ${index})"><i class="fa-solid fa-play"></i> Track</button>
                            <button class="btn-delete" onclick="deleteStudent(${index})"><i class="fa-solid fa-trash"></i></button>
                        ` : ''}
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    window.viewStudentFullProfile = (index) => {
        const student = students[index];
        if (student) {
            populateProfileForm(student, isAdminLoggedIn || (currentUser && currentUser.email === student.email));
            profileModal.style.display = "flex";
        }
    };

    async function plotRoute(startLoc, destLoc, studentName = "User") {
        if (!startLoc || !destLoc) { alert("Please enter Start and Destination!"); return false; }

        const sCoords = await geocodeLocation(startLoc);
        const dCoords = await geocodeLocation(destLoc);

        if (!sCoords || !dCoords) { alert("Location not found on map!"); return false; }

        if (currentRouteLine) map.removeLayer(currentRouteLine);
        if (startMarker) map.removeLayer(startMarker);
        if (destMarker) map.removeLayer(destMarker);
        if (liveMarker) map.removeLayer(liveMarker);

        activePathCoordinates = generatePathPoints(sCoords, dCoords, 15);
        currentRouteLine = L.polyline(activePathCoordinates, { color: '#2563eb', weight: 5, dashArray: '6, 10' }).addTo(map);
        startMarker = L.marker(sCoords).addTo(map).bindPopup(`<b>Start:</b> ${startLoc}`).openPopup();
        destMarker = L.marker(dCoords).addTo(map).bindPopup(`<b>Dest:</b> ${destLoc}`);

        map.fitBounds(currentRouteLine.getBounds(), { padding: [50, 50] });
        
        const alertBox = document.getElementById("alert-box");
        alertBox.className = "alert-box alert-normal";
        alertText.innerText = `Route active: ${startLoc} to ${destLoc}`;
        return true;
    }

    function startMovement(studentIndex = -1) {
        if (activePathCoordinates.length === 0) { alert("Plot a route first!"); return; }
        if (animationInterval) clearInterval(animationInterval);
        if (liveMarker) map.removeLayer(liveMarker);

        const icon = L.divIcon({ html: '<i class="fa-solid fa-person-walking" style="color: #22c55e; font-size: 26px;"></i>', iconAnchor: [13, 26] });
        let step = 0;
        liveMarker = L.marker(activePathCoordinates[0], { icon }).addTo(map);

        if (studentIndex >= 0 && students[studentIndex]) {
            students[studentIndex].status = "Moving";
            renderStudents(students);
        }

        animationInterval = setInterval(() => {
            step++;
            if (step < activePathCoordinates.length) {
                liveMarker.setLatLng(activePathCoordinates[step]);
                map.panTo(activePathCoordinates[step]);
            } else {
                clearInterval(animationInterval);
                if (studentIndex >= 0 && students[studentIndex]) {
                    students[studentIndex].status = "Arrived";
                    renderStudents(students);
                }
                alertText.innerText = "Destination reached safely.";
            }
        }, 1200);
    }

    document.getElementById("show-route-btn").addEventListener("click", () => {
        const s = document.getElementById("start-input").value;
        const d = document.getElementById("dest-input").value;
        if(currentUser) {
            currentUser.start = s;
            currentUser.dest = d;
            saveStudentsToStorage();
            renderStudents(students);
        }
        plotRoute(s, d, currentUser ? currentUser.name : "User");
    });

    document.getElementById("start-movement-btn").addEventListener("click", () => startMovement());

    window.adminTrackStudent = async (s, d, name, idx) => {
        document.getElementById("start-input").value = s;
        document.getElementById("dest-input").value = d;
        if (await plotRoute(s, d, name)) startMovement(idx);
    };

    window.deleteStudent = (idx) => {
        if (confirm("Are you sure you want to delete this user?")) {
            students.splice(idx, 1);
            saveStudentsToStorage();
            renderStudents(students);
        }
    };

    searchInput.addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase();
        renderStudents(students.filter(s => 
            s.name.toLowerCase().includes(q) || 
            (s.phone && s.phone.toLowerCase().includes(q)) ||
            (s.email && s.email.toLowerCase().includes(q)) ||
            (s.occupation && s.occupation.toLowerCase().includes(q)) ||
            (s.blood && s.blood.toLowerCase().includes(q))
        ));
    });
});