// --- 1. STATE & DATABASE ---
const db = {
    currentUser: null,
    orders: [],
    
    // Init with some data
    init: function() {
        if(this.orders.length === 0) {
            this.orders = [
                { id: 101, queue: 'Q-099', customer: 'User Demo', pkg: 'แพ็คเกจออนไลน์', price: 9900, status: 'Done', date: '2023-10-01' }
            ];
        }
    }
};
db.init();

// --- 2. MODAL & HELPER ---
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// --- 3. AUTH & PAYWALL LOGIC ---
function login() {
    const userInput = document.getElementById('login-user').value.toLowerCase().trim();
    if(!userInput) return alert("กรุณากรอกชื่อผู้ใช้");

    // กำหนด Role และสถานะการจ่ายเงิน
    let role = 'user';
    let hasPaid = false; 

    if(userInput === 'partner') { role = 'partner'; hasPaid = true; } // พาร์ทเนอร์เข้าได้เลย
    if(userInput === 'admin') { role = 'admin'; hasPaid = true; }     // แอดมินเข้าได้เลย

    db.currentUser = { 
        name: userInput, 
        role: role, 
        hasPaid: hasPaid, 
        id: Date.now() 
    };
    
    closeModal('auth-modal');

    if (role === 'user') {
        if (hasPaid) {
            enterSystemMode();
        } else {
            // ยังไม่จ่าย -> อยู่หน้าเดิม แต่เปลี่ยน Navbar
            updateHomepageNav();
            alert(`ยินดีต้อนรับคุณ ${userInput}!\nกรุณาเลือก "แพ็คเกจ" และชำระเงินเพื่อเปิดใช้งานระบบ`);
            document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' });
        }
    } else {
        alert(`เข้าสู่ระบบสำเร็จ (${role.toUpperCase()})`);
        enterSystemMode();
    }
}

function logout() {
    db.currentUser = null;
    location.reload();
}

function updateHomepageNav() {
    const navDiv = document.getElementById('nav-auth-section');
    if(db.currentUser) {
        navDiv.innerHTML = `
            <span style="margin-right:10px; font-size:14px; color:#ddd;">คุณ ${db.currentUser.name}</span>
            <button class="btn-login" onclick="logout()" style="border-color:#ff6b6b; color:#ff6b6b;">ออกจากระบบ</button>
        `;
    }
}

function enterSystemMode() {
    document.getElementById('main-nav').classList.add('hidden');
    document.getElementById('homepage-content').classList.add('hidden');
    document.getElementById('system-dashboard').classList.remove('hidden');
    document.body.classList.add('system-mode');

    document.getElementById('u-name').innerText = db.currentUser.name;
    document.getElementById('role-badge').innerText = db.currentUser.role.toUpperCase();

    renderMenu();
    
    if(db.currentUser.role === 'partner') switchView('partner');
    else if(db.currentUser.role === 'admin') switchView('admin');
    else switchView('customer');
}

// --- 4. PAYMENT SYSTEM ---
let tempPkg = null;

function handlePurchase(pkgName, price) {
    if(!db.currentUser) {
        alert("กรุณาเข้าสู่ระบบก่อนเลือกแพ็คเกจ");
        openModal('auth-modal');
        return;
    }
    
    tempPkg = { name: pkgName, price: price };
    document.getElementById('pay-item').innerText = pkgName;
    document.getElementById('pay-price').innerText = '฿' + price.toLocaleString();
    openModal('payment-modal');
}

function processPayment() {
    if(!tempPkg) return;
    
    db.currentUser.hasPaid = true;
    const newOrder = {
        id: Date.now(),
        queue: 'Q-' + Math.floor(Math.random()*1000),
        customer: db.currentUser.name,
        pkg: tempPkg.name,
        price: tempPkg.price,
        status: 'Paid/Waiting',
        date: new Date().toLocaleDateString()
    };
    db.orders.push(newOrder);
    
    alert(`ชำระเงินสำเร็จ!\nคุณได้รับคิว ${newOrder.queue}\n\nระบบกำลังนำคุณเข้าสู่ Dashboard...`);
    closeModal('payment-modal');
    
    enterSystemMode();
}

// --- 5. SYSTEM VIEWS & DATA ---
function renderMenu() {
    const menu = document.getElementById('sidebar-menu');
    let html = '';
    const role = db.currentUser.role;

    if(role === 'user') {
        html += `<a href="#" onclick="switchView('customer')"><i class="fas fa-home"></i> แดชบอร์ด</a>`;
        html += `<a href="#" onclick="switchView('chat')"><i class="fas fa-comments"></i> แชท & บอท</a>`;
    } else if (role === 'partner') {
        html += `<a href="#" onclick="switchView('partner')"><i class="fas fa-briefcase"></i> งานที่รับผิดชอบ</a>`;
    } else if (role === 'admin') {
        html += `<a href="#" onclick="switchView('admin')"><i class="fas fa-chart-line"></i> รายงาน (Admin)</a>`;
    }
    menu.innerHTML = html;
}

function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.getElementById('view-' + viewId).classList.remove('hidden');
    updateData(); 
}

function updateData() {
    const orders = db.orders;
    
    // Customer
    if(db.currentUser.role === 'user') {
        const myOrders = orders.filter(o => o.customer.toLowerCase() === db.currentUser.name);
        const active = myOrders[myOrders.length-1]; 
        
        if(active) {
            document.getElementById('user-queue').innerText = active.queue;
            document.getElementById('active-package').innerText = active.pkg;
            document.getElementById('queue-status').innerText = "สถานะ: " + active.status;
            
            let trackHtml = '';
            myOrders.reverse().forEach(o => {
                trackHtml += `<div class="job-item">
                    <div><strong>${o.pkg}</strong> <small>(${o.date})</small></div>
                    <span style="color:var(--pkg-green)">${o.status}</span>
                </div>`;
            });
            document.getElementById('tracking-list').innerHTML = trackHtml;
        }
    }

    // Partner
    if(db.currentUser.role === 'partner') {
        const jobs = orders.filter(o => o.status !== 'Done');
        let html = '';
        jobs.forEach(o => {
            html += `<div class="job-item">
                <div><strong>${o.queue}</strong>: ${o.pkg} (${o.customer}) <br><small>สถานะ: ${o.status}</small></div>
                <button class="btn-sm" onclick="updateStatus(${o.id}, 'Done')">จบงาน</button>
            </div>`;
        });
        document.getElementById('partner-jobs').innerHTML = html || '<p>ไม่มีงานค้าง</p>';
    }

    // Admin
    if(db.currentUser.role === 'admin') {
        let totalRev = orders.reduce((sum, o) => sum + o.price, 0);
        document.getElementById('report-rev').innerText = '฿' + totalRev.toLocaleString();
        document.getElementById('report-orders').innerText = orders.length;

        let html = '';
        orders.forEach(o => {
            html += `<tr>
                <td>${o.queue}</td><td>${o.customer}</td>
                <td><span class="badge">${o.status}</span></td>
                <td><button onclick="updateStatus(${o.id}, 'Done')">ปิดงาน</button></td>
            </tr>`;
        });
        document.getElementById('admin-table').innerHTML = html;
    }
}

function updateStatus(id, status) {
    const order = db.orders.find(o => o.id === id);
    if(order) {
        order.status = status;
        alert("อัปเดตสถานะสำเร็จ");
        updateData();
    }
}

// --- 6. CHAT BOT ---
let botMode = true;
function toggleBot() {
    botMode = !botMode;
    document.getElementById('btn-bot-mode').innerText = botMode ? "AI Bot Mode" : "Human Mode";
    addMsg("bot", botMode ? "สวัสดีครับ บอทพร้อมให้บริการ" : "กำลังติดต่อเจ้าหน้าที่...");
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    const txt = input.value.trim();
    if(!txt) return;
    
    addMsg("user", txt);
    input.value = "";
    
    if(botMode) {
        setTimeout(() => {
            let reply = "ขออภัย ผมไม่เข้าใจ";
            if(txt.includes("ราคา")) reply = "แพ็คเกจเริ่มต้น 9,900 บาทครับ";
            if(txt.includes("คิว")) reply = "ดูคิวได้ที่หน้า Dashboard ครับ";
            addMsg("bot", reply);
        }, 800);
    }
}

function addMsg(sender, txt) {
    const box = document.getElementById('chat-body');
    box.innerHTML += `<div class="msg ${sender}">${txt}</div>`;
    box.scrollTop = box.scrollHeight;
}