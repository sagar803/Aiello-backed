import express from "express";
import * as dotenv from 'dotenv'
import cors from 'cors'
import { Configuration, OpenAIApi } from "openai";

const app = express();
app.use(express.json());
app.use(cors());
dotenv.config();
const openApiKey = process.env.OPENAI_API_KEY;

const configuration = new Configuration({
  apiKey: openApiKey
});

const openai = new OpenAIApi(configuration);

app.post('/query', (req, res) => {
    const prompt = req.body.prompt; 
    console.log(req.body);
    openai.createCompletion({
        model: "text-davinci-003",
        prompt,
        max_tokens: 4000,
        temperature: .7,
    })
    .then((response)=>{
        return response.data.choices[0].text;
    })
    .then((result)=>{
        res.json({result:result});
    })
    .catch((error)=> {
        console.log(error);
    })
})

app.post('/generateImage', (req, res) => {
    const prompt = req.body.prompt;
    const n = req.body.n;
    console.log(req.body);
    openai.createImage({
        prompt,
        n,
        size: '512x512',
    })
    .then((response)=>{
        return response.data.data;
    })
    .then((result)=>{
        res.json({result: result});
    })
    .catch((error)=> {
        console.log(error);
    })
})

const port = process.env.PORT || 6001;
app.listen(port, ()=>{
    console.log("server is up and running port "+ port);
})