import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import cors from "cors";
import joi from "joi";
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
const participantsColection = db.collection("participants");
const messagesColection = db.collection("messages");
const statusColection = db.collection("status");

setInterval(afkRemover, 15000);

app.post('/participants', async (req,res)=>{
    const {name} = req.body;

    const schema = joi.object({name: joi.string().required()})

    try {
        const validation = schema.validate({name}, { abortEarly: false })
        console.log(validation);
        if(validation.error){
            return res.sendStatus(422);
        }
        const usedName = await participantsColection.findOne({name});
        if(usedName != null){
            return res.status(422).send("babalu")}
        await participantsColection.insertOne({name, lastStatus : Date.now()});
        messagesColection.insertOne({from:name, to:'Todos', text: 'entra na sala...', type: 'status', time: dayjs().format('HH:mm:ss') })
        res.sendStatus(201);
    } catch (error) {
        res.sendStatus(error)
    }
})

app.get('/participants', async (req,res)=>{
    try {
        const process = await participantsColection.find().toArray();
        res.send(process);
    } catch (error) {
        
    }
})

app.post('/messages', async (req, res)=>{
    const { to, text, type} = req.body;
    const user = req.headers.user
    const schema = joi.object({
        to : joi.string().required(),
        text: joi.string().required(),
        type: joi.string().valid('message','private_message'),
    })
    try {   
        const validation = schema.validate({to, text, type});
        const userExist = await participantsColection.findOne({name:user},{name:1, _id:0});
        if(!userExist || validation.error){
            return res.sendStatus(422)
        }
        await messagesColection.insertOne({ from: user, to, text, type, time: dayjs().format('HH:mm:ss')});

        res.sendStatus(201);
    } catch (error) {
        
    }
})

app.get('/messages/:limit?', async (req, res)=>{
    const { to, text, type} = req.body;
    const user = req.headers.user;
    const limit = req.params.limit  
    
    try {   
        //let temp = await messagesColection.insertOne({ from: user, to, text, type, time: dayjs().format('HH:mm:ss')});
        let messagesList = await messagesColection.find({}).toArray();

        messagesList = messagesList.filter((msg)=> (msg.from === user || msg.to === user || msg.type === "message" || msg.type === "status"))
        if(limit && limit >= 0){
            return res.send(messagesList.slice(-(limit)));
        }
        res.send(messagesList);
    } catch (error) {
        
    }
})

app.post('/status', async (req, res)=>{
    const user = req.headers.user;

    try {
        const userUpdate = (await participantsColection.updateOne({name:user}, {$set: {lastStatus: Date.now()}})).matchedCount;
        if(userUpdate === 0){
            return res.sendStatus(404);
        }
        res.sendStatus(200);
    } catch (error) {
        
    }
})

async function afkRemover() {
    const afkUsers = await participantsColection.find({lastStatus : {$lt: Date.now()-10000}}, {_id: 0, name: 1}).toArray();
    afkUsers.map(({name})=>{
        participantsColection.deleteOne({name});
        messagesColection.insertOne({from:name, to:'Todos', text: 'sai da sala...', type: 'status', time: dayjs().format('HH:mm:ss') })
    })
}
 
const port = 5000;
app.listen(port, () => console.log(`Server running in port: ${port}`));