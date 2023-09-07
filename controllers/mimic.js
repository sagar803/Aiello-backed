import Replicate from 'replicate';
import * as dotenv from 'dotenv'
dotenv.config();

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });


export const mimic = async (req, res) => {
    const prompt = req.body.prompt; 
    console.log({'clone' : prompt});
  try {
    const output = await replicate.run(
        "afiaka87/tortoise-tts:e9658de4b325863c4fcdc12d94bb7c9b54cbfe351b7ca1b36860008172b91c71",
        {
            input: {
              text: "The expressiveness of autoregressive transformers is literally nuts! I absolutely adore them."
            }
        }
    );
    
    console.log(typeof(output));

    res.json({ result: output });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'An error occurred on the server.' });
  }
};
