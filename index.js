import express from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import { Configuration, OpenAIApi } from "openai";
import codeRoutes from "./routes/code.js";
import musicRoutes from "./routes/music.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcryptjs";

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173", // Update with your frontend URL
    credentials: true,
  })
);
dotenv.config();
app.use(
  session({
    secret: "SomeSuperStrongSecret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

const users = [];

app.post("/code", codeRoutes);
app.post("/music", musicRoutes);

app.post("/query/geministream", async (req, res) => {
  try {
    const prompt = req.body.prompt;
    console.log(prompt);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContentStream(prompt);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    for await (const chunk of result.stream) {
      if (
        chunk &&
        chunk.candidates &&
        chunk.candidates[0] &&
        chunk.candidates[0].content
      ) {
        let text = chunk.candidates[0].content.parts[0].text;
        res.write(text); // Send the chunk to the client
      }
    }

    // End the response once all chunks have been processed
    res.end();
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/query/gemini", async (req, res) => {
  try {
    const prompt = req.body.prompt;
    console.log(prompt);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const data = result?.response?.candidates[0]?.content.parts[0]?.text;
    res.json({ result: data });
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({ error: error.message });
  }
});
//dev
// app.post("/query/gemini", async (req, res) => {
//   try {
//     const { message, history } = req.body;

//     const formattedHistory = history.map((item) => ({
//       role: item.role,
//       parts: Array.isArray(item.parts) ? item.parts : [item.parts],
//     }));

//     console.log(formattedHistory);

//     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
//     const chat = model.startChat({ formattedHistory });
//     const result = await chat.sendMessage(message);
//     const response = result.response;
//     const text = response.text();
//     res.send(text);
//   } catch (error) {
//     console.log("Error:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

app.post("/query/openai", async (req, res) => {
  try {
    const prompt = req.body.prompt;
    console.log(prompt);
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt,
      temperature: 0.9,
      max_tokens: 150,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0.6,
      stop: [" Human:", " AI:"],
    });
    console.log(response);
    const answer = response.data.choices[0].text;
    // const array = answer.split("\n");
    // const result = array.filter((value) => value).map((value) => value.trim());
    res.json({ result: answer });
  } catch (error) {
    console.log("Error:", error.message);
    res.status(error.response.status).json({ error: error.message });
  }
});

app.post("/generateImage", async (req, res) => {
  try {
    const prompt = req.body.prompt;
    const n = req.body.n;
    const response = await openai.createImage({
      prompt,
      n,
      size: "512x512",
    });

    const result = response.data.data;
    res.json({ result: result });
  } catch (error) {
    console.log("Error:", error.message);
    res
      .status(error.response.status)
      .json({ error: "An error occurred on the server." });
  }
});

// // Configure Passport Local Strategy
// passport.use(
//   new LocalStrategy((username, password, done) => {
//     const user = users.find((u) => u.username === username);
//     if (!user) {
//       return done(null, false, { message: "Incorrect username." });
//     }
//     bcrypt.compare(password, user.password, (err, res) => {
//       if (res) {
//         return done(null, user);
//       } else {
//         return done(null, false, { message: "Incorrect password." });
//       }
//     });
//   })
// );

// Configure Passport Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`,
    },
    function (accessToken, refreshToken, profile, done) {
      let user = users.find((u) => u.googleId === profile.id);
      if (!user) {
        user = {
          id: users.length + 1,
          googleId: profile.id,
          username: profile.displayName,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          picture: profile.photos[0].value,
          email: profile.emails[0].value,
        };
        users.push(user);
      }
      return done(null, user);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = users.find((u) => u.id === id);
  done(null, user);
});

// Routes
// app.post("/login", passport.authenticate("local"), (req, res) => {
//   res.send({ user: req.user });
// });

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.send({ message: "Logged out" });
  });
});

app.get("/user", (req, res) => {
  if (req.isAuthenticated()) {
    res.send(req.user);
  } else {
    res.send(null);
  }
});

// Google Auth Routes
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect(`${process.env.CLIENT_URL}`);
  }
);

const port = process.env.PORT || 6001;
app.listen(port, () => {
  console.log("server is up and running port " + port);
});
