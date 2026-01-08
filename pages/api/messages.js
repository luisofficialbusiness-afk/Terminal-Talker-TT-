let messages = [];
const MAX_MSG = 100;
let rooms = {}; // {password: {owner, messages: []}}

// Permanent Users + Roles + IDs
const USERS = {
  "ownerUser": { role: "owner", password: "O#0363168", id: "1001" },
  "adminUser": { role: "admin", password: "admin01", id: "1002" },
  "betaUser1": { role: "beta", password: "BETA123", id: "1003" }
};

export default function handler(req, res) {
  if(req.method === "POST") {
    const { message, username, room } = req.body;
    let role = "user";
    let userId = Math.floor(Math.random()*1000000).toString();

    if(USERS[username]){
      role = USERS[username].role;
      userId = USERS[username].id;
    }

    if(!room || room === "main") {
      messages.push({username,message,role,userId});
      if(messages.length > MAX_MSG) messages.shift();
    } else {
      if(!rooms[room]) rooms[room] = { owner: null, messages: [] };
      rooms[room].messages.push({username,message,role,userId});
    }

    return res.status(200).json({success:true,role,userId});
  }

  if(req.method === "GET") {
    return res.status(200).json(messages);
  }

  res.status(405).json({error:"Method not allowed"});
}
