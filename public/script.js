// ===========================
// Terminal Talker V1 - Protocol 1
// ===========================

const input = document.getElementById("terminal-input");
const messagesContainer = document.getElementById("messages");
const typingIndicator = document.getElementById("typing-indicator");

// User setup
let username = localStorage.getItem("ttUsername");
if(!username){
  let name = prompt("Welcome! Enter your permanent username:");
  if(!name || name.trim()==="") name="User";
  localStorage.setItem("ttUsername", name);
  username = name;
}

let userId = localStorage.getItem("ttUserId");
if(!userId){ 
  userId = crypto.randomUUID(); 
  localStorage.setItem("ttUserId", userId); 
}

let role = "user";
const OWNER_IDS = ["123456789012345678"];
const ADMIN_IDS = ["987654321098765432"];

let betaTesters = [];
let rooms = {};
let currentRoom = "main";
let mutedUsers = [];
let kickedUsers = [];

// Themes
const themes = {
  green: { bg: "black", text: "#0f0", system: "yellow", typing: "#0ff" },
  neon: { bg: "black", text: "#0ff", system: "#ff0", typing: "#0f0" },
  purple: { bg: "#0a0a1a", text: "#d9a6ff", system: "#ffcc00", typing: "#00ffff" },
  red: { bg: "black", text: "#ff4c4c", system: "#ffff00", typing: "#0ff" },
  orange: { bg: "#1a0a00", text: "#ffa500", system: "#ffff00", typing: "#00ffcc" },
  white: { bg: "black", text: "#fff", system: "#ffff00", typing: "#0ff" },
};
let currentTheme = "green";
applyTheme(currentTheme);

function applyTheme(name){
  const t = themes[name];
  if(!t) return;
  document.body.style.background = t.bg;
  document.body.style.color = t.text;
  typingIndicator.style.color = t.typing;
  document.querySelectorAll(".badge").forEach(b=>{
    if(b.textContent.includes("SYSTEM")) b.style.color=t.system;
  });
}

// ===========================
// Messaging functions
// ===========================
function addSystemMessage(msg){
  const msgEl = document.createElement("div");
  msgEl.className="terminal-msg";
  msgEl.innerHTML=`<span class="badge">[SYSTEM]</span>${msg}`;
  messagesContainer.appendChild(msgEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addMessageToTerminal(m){
  const msgEl = document.createElement("div");
  msgEl.className="terminal-msg";
  let badge=`[${m.role.toUpperCase()}]`;
  if(betaTesters.includes(m.username)) badge+=`[BETA]`;
  msgEl.innerHTML=`<span class="badge">${badge}</span>${m.username}: ${m.message}`;
  messagesContainer.appendChild(msgEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function fetchMessages(){
  try{
    let msgs=[];
    if(currentRoom==="main"){
      const res=await fetch("/api/messages");
      msgs=await res.json();
    } else if(rooms[currentRoom]){
      msgs=rooms[currentRoom].messages;
    }
    messagesContainer.innerHTML="";
    msgs.forEach(addMessageToTerminal);
  }catch(e){ addSystemMessage("Failed to load messages."); }
}
setInterval(fetchMessages,2000);

// ===========================
// Typing indicator
// ===========================
let typingTimeout;
input.addEventListener("input",async ()=>{
  await fetch("/api/typing",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({username})
  });
  typingIndicator.classList.remove("hidden");
  clearTimeout(typingTimeout);
  typingTimeout=setTimeout(()=>{typingIndicator.classList.add("hidden");},1000);
});
setInterval(async ()=>{
  const res=await fetch("/api/typing");
  const data=await res.json();
  typingIndicator.classList.toggle("hidden",data.typing.length===0);
},500);

// ===========================
// Commands
// ===========================
async function processOwnerCommand(msg){
  const parts=msg.split(" ");
  if(parts[0]==="!beta" && OWNER_IDS.includes(userId)){
    const target=parts[1];
    if(!betaTesters.includes(target)){ betaTesters.push(target); addSystemMessage(`${target} is now a Beta Tester!`); }
    else addSystemMessage(`${target} already has Beta perks.`);
    return true;
  }
  return false;
}

function processModCommands(msg){
  const parts=msg.split(" ");
  if(role!=="admin" && role!=="owner") return false;
  if(parts[0]==="!mute"){ mutedUsers.push(parts[1]); addSystemMessage(`${parts[1]} muted.`); return true; }
  if(parts[0]==="!kick"){ kickedUsers.push(parts[1]); addSystemMessage(`${parts[1]} kicked.`); return true; }
  if(parts[0]==="!ban"){ addSystemMessage(`${parts[1]} banned (not implemented).`); return true; }
  return false;
}

function processRoomCommand(msg){
  const parts=msg.split(" ");
  if(parts[0]==="!makeroom"){
    const pw=parts[1]; if(!pw) return addSystemMessage("Provide password."); if(rooms[pw]) return addSystemMessage("Room exists.");
    rooms[pw]={owner:username,messages:[]}; addSystemMessage(`Room ${pw} created.`); return true;
  }
  if(parts[0]==="!pjoin"){
    const pw=parts[1]; if(!rooms[pw]) return addSystemMessage("Room doesn't exist.");
    currentRoom=pw; addSystemMessage(`Joined room ${pw}`); fetchMessages(); return true;
  }
  return false;
}

function processThemeCommand(msg){
  const parts=msg.split(" ");
  if(parts[0]==="!theme"){
    const t=parts[1];
    if(themes[t]){ currentTheme=t; applyTheme(t); addSystemMessage(`Theme set to ${t}`); }
    else addSystemMessage(`Theme ${t} not found. Available: ${Object.keys(themes).join(", ")}`);
    return true;
  }
  return false;
}

// ===========================
// Send messages
// ===========================
input.addEventListener("keydown",async e=>{
  if(e.key==="Enter" && input.value.trim()!==""){
    if(mutedUsers.includes(username) || kickedUsers.includes(username)){ addSystemMessage("Cannot send messages."); input.value=""; return; }
    const msg=input.value.trim();
    const isCommand = await processOwnerCommand(msg) || processModCommands(msg) || processRoomCommand(msg) || processThemeCommand(msg);
    if(!isCommand){
      try{
        const res=await fetch("/api/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:msg,username,userId,room:currentRoom})});
        const data=await res.json(); role=data.role; fetchMessages();
      }catch(err){ addSystemMessage("Failed to send message."); console.error(err); }
    }
    input.value="";
  }
});

fetchMessages();
