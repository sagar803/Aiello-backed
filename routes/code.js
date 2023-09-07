import express from "express";
import { code } from '../controllers/code.js'

const router = express.Router();
router.post('/code', code);

export default router;