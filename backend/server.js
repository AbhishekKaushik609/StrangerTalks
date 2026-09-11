import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

/*
|--------------------------------------------------------------------------
| ENVIRONMENT VARIABLES
|--------------------------------------------------------------------------
|
| Local:
| FRONTEND_URL=http://localhost:5173
|
| Render:
| FRONTEND_URL=https://your-vercel-app.vercel.app
|
|--------------------------------------------------------------------------
*/

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

/*
|--------------------------------------------------------------------------
| SOCKET.IO
|--------------------------------------------------------------------------
*/

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"]
  }
});

/*
|--------------------------------------------------------------------------
| EXPRESS MIDDLEWARE
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: FRONTEND_URL
  })
);

app.use(express.json());

/*
|--------------------------------------------------------------------------
| RAM STORAGE
|--------------------------------------------------------------------------
|
| Abhi MongoDB use nahi ho raha.
|
| Ye data server ki RAM mein rahega.
|
| Server restart hone par:
| - users clear
| - waiting users clear
| - groups clear
|
|--------------------------------------------------------------------------
*/

const users = new Map();
const waitingUsers = [];
const groups = new Map();

/*
|--------------------------------------------------------------------------
| BASIC API
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.json({
    message: "StragerMentor Backend Running",
    database: "Not connected",
    storage: "RAM"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    users: users.size,
    groups: groups.size,
    waitingUsers: waitingUsers.length,
    storage: "RAM only",
    frontend: FRONTEND_URL
  });
});

/*
|--------------------------------------------------------------------------
| HELPER FUNCTIONS
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Remove user from matchmaking queue
|--------------------------------------------------------------------------
*/

function removeFromWaiting(socketId) {
  for (let i = waitingUsers.length - 1; i >= 0; i--) {
    if (waitingUsers[i].socketId === socketId) {
      waitingUsers.splice(i, 1);
    }
  }
}

/*
|--------------------------------------------------------------------------
| Get safe/public user information
|--------------------------------------------------------------------------
*/

function getPublicUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.socketId,
    name: user.name,
    role: user.role,
    education: user.education,
    skills: user.skills,
    interest: user.interest
  };
}

/*
|--------------------------------------------------------------------------
| Interest matching
|--------------------------------------------------------------------------
*/

function interestsMatch(user1, user2) {
  if (!user1 || !user2) {
    return false;
  }

  if (!user1.interest || !user2.interest) {
    return true;
  }

  const interest1 = user1.interest
    .toLowerCase()
    .trim();

  const interest2 = user2.interest
    .toLowerCase()
    .trim();

  if (!interest1 || !interest2) {
    return true;
  }

  return (
    interest1 === interest2 ||
    interest1.includes(interest2) ||
    interest2.includes(interest1)
  );
}

/*
|--------------------------------------------------------------------------
| SOCKET CONNECTION
|--------------------------------------------------------------------------
*/

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  /*
  |--------------------------------------------------------------------------
  | USER PROFILE
  |--------------------------------------------------------------------------
  */

  socket.on("profile:join", (profile = {}) => {
    const user = {
      socketId: socket.id,

      name:
        typeof profile.name === "string"
          ? profile.name.trim().substring(0, 80)
          : "Anonymous",

      role:
        typeof profile.role === "string"
          ? profile.role.trim().substring(0, 40)
          : "Student",

      education:
        typeof profile.education === "string"
          ? profile.education.trim().substring(0, 150)
          : "",

      skills:
        typeof profile.skills === "string"
          ? profile.skills.trim().substring(0, 300)
          : "",

      interest:
        typeof profile.interest === "string"
          ? profile.interest.trim().substring(0, 150)
          : ""
    };

    users.set(socket.id, user);

    socket.emit("profile:ready", {
      user: getPublicUser(user)
    });

    io.emit("presence:update", {
      online: users.size
    });

    console.log(
      "Profile joined:",
      user.name,
      socket.id
    );
  });

  /*
  |--------------------------------------------------------------------------
  | FIND STRANGER
  |--------------------------------------------------------------------------
  */

  socket.on(
    "match:find",
    ({ mode, interest } = {}) => {
      removeFromWaiting(socket.id);

      const currentUser = users.get(socket.id);

      if (!currentUser) {
        socket.emit(
          "error:app",
          "Please create your profile first."
        );

        return;
      }

      const searchInterest =
        typeof interest === "string"
          ? interest.trim()
          : currentUser.interest || "";

      let matchIndex = -1;

      /*
      |--------------------------------------------------------------------------
      | Search waiting users
      |--------------------------------------------------------------------------
      */

      for (
        let i = 0;
        i < waitingUsers.length;
        i++
      ) {
        const waitingUser = waitingUsers[i];

        /*
        |--------------------------------------------------------------------------
        | Don't match user with themselves
        |--------------------------------------------------------------------------
        */

        if (waitingUser.socketId === socket.id) {
          continue;
        }

        /*
        |--------------------------------------------------------------------------
        | TEAM MODE
        |--------------------------------------------------------------------------
        |
        | Team mode can match users regardless of interest.
        |
        */

        if (mode === "team") {
          matchIndex = i;
          break;
        }

        /*
        |--------------------------------------------------------------------------
        | NORMAL STRANGER MODE
        |--------------------------------------------------------------------------
        */

        const waitingProfile = users.get(
          waitingUser.socketId
        );

        if (!waitingProfile) {
          continue;
        }

        const temporaryProfile = {
          ...currentUser,
          interest: searchInterest
        };

        /*
        |--------------------------------------------------------------------------
        | Check interest
        |--------------------------------------------------------------------------
        */

        if (
          interestsMatch(
            temporaryProfile,
            waitingProfile
          )
        ) {
          matchIndex = i;
          break;
        }
      }

      /*
      |--------------------------------------------------------------------------
      | NO MATCH
      |--------------------------------------------------------------------------
      */

      if (matchIndex === -1) {
        waitingUsers.push({
          socketId: socket.id,
          mode: mode || "stranger",
          interest: searchInterest
        });

        socket.emit("match:waiting");

        console.log(
          "User waiting:",
          socket.id
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | MATCH FOUND
      |--------------------------------------------------------------------------
      */

      const matchedUser =
        waitingUsers.splice(matchIndex, 1)[0];

      const otherSocket =
        io.sockets.sockets.get(
          matchedUser.socketId
        );

      /*
      |--------------------------------------------------------------------------
      | Matched socket no longer exists
      |--------------------------------------------------------------------------
      */

      if (!otherSocket) {
        socket.emit("match:waiting");
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Create private room
      |--------------------------------------------------------------------------
      */

      const roomId =
        `chat-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)}`;

      /*
      |--------------------------------------------------------------------------
      | Join both users
      |--------------------------------------------------------------------------
      */

      socket.join(roomId);
      otherSocket.join(roomId);

      socket.data.roomId = roomId;
      otherSocket.data.roomId = roomId;

      /*
      |--------------------------------------------------------------------------
      | MATCH RESULT - INITIATOR
      |--------------------------------------------------------------------------
      */

      socket.emit("match:found", {
        room: roomId,

        peer: getPublicUser(
          users.get(otherSocket.id)
        ),

        mode: mode || "stranger",

        initiator: true
      });

      /*
      |--------------------------------------------------------------------------
      | MATCH RESULT - OTHER USER
      |--------------------------------------------------------------------------
      */

      otherSocket.emit("match:found", {
        room: roomId,

        peer: getPublicUser(
          users.get(socket.id)
        ),

        mode: mode || "stranger",

        initiator: false
      });

      console.log(
        "Matched:",
        socket.id,
        "<->",
        otherSocket.id,
        "Room:",
        roomId
      );
    }
  );

  /*
  |--------------------------------------------------------------------------
  | LEAVE / NEXT STRANGER
  |--------------------------------------------------------------------------
  */

  socket.on("match:leave", () => {
    removeFromWaiting(socket.id);

    const roomId = socket.data.roomId;

    if (!roomId) {
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Notify peer
    |--------------------------------------------------------------------------
    */

    socket.to(roomId).emit("match:left");

    /*
    |--------------------------------------------------------------------------
    | Leave room
    |--------------------------------------------------------------------------
    */

    socket.leave(roomId);

    socket.data.roomId = null;

    console.log(
      "User left match:",
      socket.id
    );
  });

  /*
  |--------------------------------------------------------------------------
  | PRIVATE CHAT
  |--------------------------------------------------------------------------
  */

  socket.on(
    "chat:message",
    ({ room, text } = {}) => {
      if (!room) {
        return;
      }

      if (
        typeof text !== "string" ||
        !text.trim()
      ) {
        return;
      }

      const cleanText = text
        .trim()
        .substring(0, 2000);

      const message = {
        id:
          Date.now() +
          "-" +
          Math.random()
            .toString(36)
            .substring(2),

        senderId: socket.id,

        senderName:
          users.get(socket.id)?.name ||
          "Stranger",

        text: cleanText,

        time: Date.now()
      };

      /*
      |--------------------------------------------------------------------------
      | Send message to everyone in room
      |--------------------------------------------------------------------------
      */

      io.to(room).emit(
        "chat:message",
        message
      );
    }
  );

  /*
  |--------------------------------------------------------------------------
  | TYPING
  |--------------------------------------------------------------------------
  */

  socket.on(
    "chat:typing",
    ({ room, typing } = {}) => {
      if (!room) {
        return;
      }

      socket.to(room).emit(
        "chat:typing",
        {
          name:
            users.get(socket.id)?.name ||
            "Stranger",

          typing: Boolean(typing)
        }
      );
    }
  );

  /*
  |--------------------------------------------------------------------------
  | WEBRTC OFFER
  |--------------------------------------------------------------------------
  */

  socket.on(
    "webrtc:offer",
    ({ room, offer } = {}) => {
      if (!room || !offer) {
        return;
      }

      socket
        .to(room)
        .emit("webrtc:offer", {
          offer
        });
    }
  );

  /*
  |--------------------------------------------------------------------------
  | WEBRTC ANSWER
  |--------------------------------------------------------------------------
  */

  socket.on(
    "webrtc:answer",
    ({ room, answer } = {}) => {
      if (!room || !answer) {
        return;
      }

      socket
        .to(room)
        .emit("webrtc:answer", {
          answer
        });
    }
  );

  /*
  |--------------------------------------------------------------------------
  | WEBRTC ICE CANDIDATE
  |--------------------------------------------------------------------------
  */

  socket.on(
    "webrtc:ice",
    ({ room, candidate } = {}) => {
      if (!room || !candidate) {
        return;
      }

      socket
        .to(room)
        .emit("webrtc:ice", {
          candidate
        });
    }
  );

  /*
  |--------------------------------------------------------------------------
  | CREATE GROUP
  |--------------------------------------------------------------------------
  */

  socket.on(
    "group:create",
    ({ name } = {}) => {
      const groupName =
        typeof name === "string"
          ? name
              .trim()
              .substring(0, 60)
          : "Study Squad";

      /*
      |--------------------------------------------------------------------------
      | Generate group code
      |--------------------------------------------------------------------------
      */

      let code;

      do {
        code = Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase();
      } while (groups.has(code));

      /*
      |--------------------------------------------------------------------------
      | Create group
      |--------------------------------------------------------------------------
      */

      const group = {
        code,

        name:
          groupName || "Study Squad",

        owner: socket.id,

        members: [socket.id]
      };

      groups.set(code, group);

      /*
      |--------------------------------------------------------------------------
      | Join Socket.IO group room
      |--------------------------------------------------------------------------
      */

      socket.join(
        `group-${code}`
      );

      /*
      |--------------------------------------------------------------------------
      | Send created response
      |--------------------------------------------------------------------------
      */

      socket.emit(
        "group:created",
        {
          code,

          name: group.name,

          members: 1
        }
      );

      console.log(
        "Group created:",
        code,
        "by:",
        socket.id
      );
    }
  );

  /*
  |--------------------------------------------------------------------------
  | JOIN GROUP
  |--------------------------------------------------------------------------
  */

  socket.on(
    "group:join",
    ({ code } = {}) => {
      const groupCode =
        typeof code === "string"
          ? code.trim().toUpperCase()
          : "";

      if (!groupCode) {
        socket.emit(
          "group:error",
          "Please enter a group code."
        );

        return;
      }

      const group =
        groups.get(groupCode);

      /*
      |--------------------------------------------------------------------------
      | Group doesn't exist
      |--------------------------------------------------------------------------
      */

      if (!group) {
        socket.emit(
          "group:error",
          "Group not found."
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Add member
      |--------------------------------------------------------------------------
      */

      if (
        !group.members.includes(
          socket.id
        )
      ) {
        group.members.push(
          socket.id
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Join Socket.IO room
      |--------------------------------------------------------------------------
      */

      socket.join(
        `group-${groupCode}`
      );

      /*
      |--------------------------------------------------------------------------
      | Notify group
      |--------------------------------------------------------------------------
      */

      io.to(
        `group-${groupCode}`
      ).emit(
        "group:update",
        {
          code: group.code,

          name: group.name,

          members:
            group.members.length
        }
      );

      /*
      |--------------------------------------------------------------------------
      | Send current group information to joining user
      |--------------------------------------------------------------------------
      */

      socket.emit(
        "group:joined",
        {
          code: group.code,

          name: group.name,

          members:
            group.members.length
        }
      );

      console.log(
        "User joined group:",
        socket.id,
        groupCode
      );
    }
  );

  /*
  |--------------------------------------------------------------------------
  | GROUP MESSAGE
  |--------------------------------------------------------------------------
  */

  socket.on(
    "group:message",
    ({ code, text } = {}) => {
      if (
        typeof text !== "string" ||
        !text.trim()
      ) {
        return;
      }

      const groupCode =
        typeof code === "string"
          ? code.trim().toUpperCase()
          : "";

      if (!groupCode) {
        return;
      }

      const group =
        groups.get(groupCode);

      if (!group) {
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Check member
      |--------------------------------------------------------------------------
      */

      if (
        !group.members.includes(
          socket.id
        )
      ) {
        return;
      }

      const message = {
        senderId: socket.id,

        senderName:
          users.get(socket.id)?.name ||
          "Member",

        text: text
          .trim()
          .substring(0, 2000),

        time: Date.now()
      };

      /*
      |--------------------------------------------------------------------------
      | Broadcast group message
      |--------------------------------------------------------------------------
      */

      io.to(
        `group-${groupCode}`
      ).emit(
        "group:message",
        message
      );
    }
  );

  /*
  |--------------------------------------------------------------------------
  | REPORT
  |--------------------------------------------------------------------------
  */

  socket.on(
    "report",
    ({ reason } = {}) => {
      const reportReason =
        typeof reason === "string"
          ? reason
              .trim()
              .substring(0, 500)
          : "No reason provided";

      console.log(
        "[RAM REPORT]",
        {
          userId: socket.id,
          reason: reportReason,
          time: new Date().toISOString()
        }
      );

      socket.emit(
        "report:received"
      );
    }
  );

  /*
  |--------------------------------------------------------------------------
  | BLOCK
  |--------------------------------------------------------------------------
  */

  socket.on(
    "block",
    ({ peerId } = {}) => {
      if (!peerId) {
        return;
      }

      console.log(
        "[RAM BLOCK]",
        socket.id,
        "blocked:",
        peerId
      );

      socket.emit(
        "block:done",
        {
          peerId
        }
      );
    }
  );

  /*
  |--------------------------------------------------------------------------
  | DISCONNECT
  |--------------------------------------------------------------------------
  */

  socket.on("disconnect", () => {
    console.log(
      "User disconnected:",
      socket.id
    );

    /*
    |--------------------------------------------------------------------------
    | Remove from waiting queue
    |--------------------------------------------------------------------------
    */

    removeFromWaiting(
      socket.id
    );

    /*
    |--------------------------------------------------------------------------
    | Notify current private chat peer
    |--------------------------------------------------------------------------
    */

    const roomId =
      socket.data.roomId;

    if (roomId) {
      socket
        .to(roomId)
        .emit("match:left");
    }

    /*
    |--------------------------------------------------------------------------
    | Remove user from groups
    |--------------------------------------------------------------------------
    */

    for (
      const [code, group]
      of groups
    ) {
      group.members =
        group.members.filter(
          (id) =>
            id !== socket.id
        );

      /*
      |--------------------------------------------------------------------------
      | Notify remaining group members
      |--------------------------------------------------------------------------
      */

      if (group.members.length > 0) {
        io.to(
          `group-${code}`
        ).emit(
          "group:update",
          {
            code: group.code,

            name: group.name,

            members:
              group.members.length
          }
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Delete empty group
      |--------------------------------------------------------------------------
      */

      if (
        group.members.length === 0
      ) {
        groups.delete(code);

        console.log(
          "Empty group deleted:",
          code
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Remove user from users
    |--------------------------------------------------------------------------
    */

    users.delete(
      socket.id
    );

    /*
    |--------------------------------------------------------------------------
    | Update online count
    |--------------------------------------------------------------------------
    */

    io.emit(
      "presence:update",
      {
        online: users.size
      }
    );

    console.log(
      "Online users:",
      users.size
    );
  });
});

/*
|--------------------------------------------------------------------------
| ERROR HANDLING
|--------------------------------------------------------------------------
*/

app.use(
  (err, req, res, next) => {
    console.error(
      "Server error:",
      err
    );

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
);

/*
|--------------------------------------------------------------------------
| SERVER
|--------------------------------------------------------------------------
|
| Render PORT environment variable provide karega.
|
| Local development mein PORT = 5000.
|
|--------------------------------------------------------------------------
*/

const PORT =
  process.env.PORT || 5000;

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      "=================================================="
    );

    console.log(
      `🚀 StragerMentor backend running on port ${PORT}`
    );

    console.log(
      `🌐 Frontend allowed: ${FRONTEND_URL}`
    );

    console.log(
      "💾 Storage: RAM only"
    );

    console.log(
      "🔌 Socket.IO: Enabled"
    );

    console.log(
      "🎥 WebRTC signaling: Enabled"
    );

    console.log(
      "👥 Group system: Enabled"
    );

    console.log(
      "=================================================="
    );
  }
);