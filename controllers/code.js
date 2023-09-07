import Replicate from 'replicate';
import * as dotenv from 'dotenv'
dotenv.config();

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export const code = async (req, res) => {
    const prompt = req.body.prompt; 
    console.log({'Code' : prompt});
  try {
    const output = await replicate.run(
      'meta/codellama-13b:784959be802aa8541543e020ea619c52e89f370627fc3f2ad10162edbc77f60c', { 
        input: { prompt }
    });
    const str = output.join('')
    const array = str.split("\n")
    console.log(array);

    res.json({ result: array });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'An error occurred on the server.' });
  }
};
