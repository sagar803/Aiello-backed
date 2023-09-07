import Replicate from 'replicate';
import * as dotenv from 'dotenv'
dotenv.config();

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });


export const music = async (req, res) => {
    const prompt = req.body.prompt; 
    console.log({'music' : prompt});
  try {
    const output = await replicate.run(
      "meta/musicgen:7a76a8258b23fae65c5a22debb8841d1d7e816b75c2f24218cd2bd8573787906",
      {
        input: {
          model_version: "melody",
          prompt
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
