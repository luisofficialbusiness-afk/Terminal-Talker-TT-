let messages = [];
const MAX_MSG = 100;
let rooms = {}; // {password: {owner, messages: []}}
const OWNER_IDS = ["123456789012345678"];
const ADMIN_IDS = ["987654321098765432"];

export default function handler(req, res) {
  if(req.method==="POST"){
    const { message, username, userId, room } = req.body;
    let role = "user";
    if(OWNER_IDS.includes(userId)) role="owner";
    else if(ADMIN_IDS.includes(userId)) role="admin";

    if(!room || room==="main"){
      messages.push({username,message,role,userId});
      if(messages.length>MAX_MSG) messages.shift();
    } else {
      if(!rooms[room]) rooms[room]={owner:null,messages:[]};
      rooms[room].messages.push({username,message,role,userId});
    }

    return res.status(200).json({success:true,role});
  }

  if(req.method==="GET") return res.status(200).json(messages);
  res.status(405).json({error:"Method not allowed"});
}
