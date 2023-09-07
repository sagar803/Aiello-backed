import express from "express";
import * as dotenv from 'dotenv'
import cors from 'cors'
import { Configuration, OpenAIApi } from "openai";
import codeRoutes from './routes/code.js';
import musicRoutes from './routes/music.js';

const app = express();
app.use(express.json());
app.use(cors());
dotenv.config();

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

app.post('/code' , codeRoutes);
app.post('/music' , musicRoutes);

app.post('/query', async (req, res) => {
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
        })
        console.log(response);
        const answer = response.data.choices[0].text;
        const array = answer.split("\n")
        const result = array.filter((value)=>value).map((value)=>value.trim());
        res.json({result: result})
    } catch (error) {
        console.log('Error:', error.message);
        res.status(error.response.status).json({error: error.message})
    }
})

app.post('/generateImage', async (req, res) => {
    try {
      const prompt = req.body.prompt;
      const n = req.body.n;
      const response = await openai.createImage({
        prompt,
        n,
        size: '512x512',
      });
       
      const result = response.data.data;
      res.json({ result: result });
  
    } catch (error) {
      console.log('Error:', error.message);
      res.status(error.response.status).json({ error: 'An error occurred on the server.' });
    }
  });
  

const port = process.env.PORT || 6001;
app.listen(port, ()=>{
    console.log("server is up and running port "+ port);
})