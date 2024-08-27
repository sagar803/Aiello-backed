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

const allowedOrigins = [
  "https://aiello-client.onrender.com",
  "http://localhost:5173",
  "https://aiello.netlify.app",
];
const isProduction = process.env.NODE_ENV === "production";

/*******CONFIGURATIONS*************************************** */

const app = express();
app.set("trust proxy", 1);
app.use(express.json());

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

dotenv.config();
app.use(
  session({
    secret: process.env.SESSION_SECRET || "SomeSuperStrongSecret",
    resave: false,
    saveUninitialized: false,
    // cookie: {
    //   secure: isProduction,
    //   sameSite: isProduction ? "none" : "lax",
    //   maxAge: 24 * 60 * 60 * 1000, // 24 hours
    //   httpOnly: true,
    // },
  })
);
app.use(passport.initialize());
app.use(passport.session());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

const users = [];
/********************************************** */

app.get("/", async (req, res) => res.json({ message: "Backend is working!" }));
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

/********************************************** */

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
  console.log("Serializing user:", user);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  console.log("Deserializing user ID:", id);
  const user = users.find((u) => u.id === id);
  console.log("Deserialized user:", user);
  done(null, user);
});

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.send({ message: "Logged out" });
  });
});

app.get("/user", (req, res) => {
  console.log("Session:", req.session);
  console.log("User:", req.user);
  console.log(req.isAuthenticated());

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
app.get("/debug/session", (req, res) => {
  res.json({
    session: req.session,
    sessionID: req.sessionID,
    cookies: req.cookies,
    user: req.user,
    isAuthenticated: req.isAuthenticated(),
  });
});

app.get("/debug/headers", (req, res) => {
  res.json({
    headers: req.headers,
  });
});
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
