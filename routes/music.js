import express from "express";
import { music } from '../controllers/music.js'

const router = express.Router();
router.post('/music', music);

export default router;

