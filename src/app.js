import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import cors from "cors";
import joi from "joi";
import bcrypt from "bcryptjs";
import { v4 as uuidV4 } from 'uuid';
import dayjs from "dayjs";

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

try {
await mongoClient.connect();
} catch (err) {
console.log("Erro no mongo.conect", err.message);
}

db = mongoClient.db();
const defaultColection = db.collection("test");
const participantsColection = db.collection("participants");
const messagesColection = db.collection("messages");
const statusColection = db.collection("status");

app.post('/participants', async (req,res)=>{
    const {name} = req.body;
    try {
        await participantsColection.insertOne({name, lastStatus : Date.now()});
        res.sendStatus(201);
    } catch (error) {
        
    }
})

app.get('/participants', async (req,res)=>{
    try {
        const process = await participantsColection.find().toArray();
        res.send(process);
    } catch (error) {
        
    }
})

app.post('/messages/:user', async (req, res)=>{
    const { to, text, type} = req.body;
    const user = req.params.user
    try {   
        await messagesColection.insertOne({ from: user, to, text, type, time: dayjs().format('HH:mm:ss')});
        //const temp = await messagesColection.find({}).toArray();

        res.sendStatus(201);
    } catch (error) {
        
    }
})

app.get('/messages?limit', async (req, res)=>{
    const { to, text, type} = req.body;
    const user = req.params.user
    try {   
        await messagesColection.insertOne({ from: user, to, text, type, time: dayjs().format('HH:mm:ss')});
        //const temp = await messagesColection.find({}).toArray();

        res.sendStatus(201);
    } catch (error) {
        
    }
})


app.get("/", async (req, res)=>{
    try {
        const result = await defaultColection.find().toArray();
        res.send(result);
    } catch (error) {
        console.error(error);
    res.sendStatus(500);
    }
})


const port = 5000;
app.listen(port, () => console.log(`Server running in port: ${port}`));