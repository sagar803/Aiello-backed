import express from "express";
import { mimic } from "../controllers/mimic.js";

const router = express.Router();
router.post("/mimic", mimic);

export default router;
